import { NextRequest, NextResponse } from 'next/server'
import { getStripe, getTierFromPriceId } from '@/lib/stripe/client'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(supabase, session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(supabase, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCancelled(supabase, subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(supabase, invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(supabase, invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(supabase: any, session: Stripe.Checkout.Session) {
  const companyId = session.metadata?.company_id
  if (!companyId) return

  // Update company with subscription info
  await supabase
    .from('companies')
    .update({
      stripe_subscription_id: session.subscription,
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', companyId)

  // Log activity
  await supabase.from('activity_log').insert({
    company_id: companyId,
    user_id: session.metadata?.user_id,
    action: 'subscription_started',
    entity_type: 'subscription',
    entity_id: session.subscription as string,
    details: {
      session_id: session.id,
      amount_total: session.amount_total,
    },
  })
}

async function handleSubscriptionChange(supabase: any, subscription: Stripe.Subscription) {
  const companyId = subscription.metadata?.company_id
  if (!companyId) {
    // Try to find company by customer ID
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('stripe_customer_id', subscription.customer)
      .single()
    
    if (!company) return
  }

  const priceId = subscription.items.data[0]?.price.id
  const tier = getTierFromPriceId(priceId)

  await supabase
    .from('companies')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_tier: tier,
      subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq(companyId ? 'id' : 'stripe_customer_id', companyId || subscription.customer)
}

async function handleSubscriptionCancelled(supabase: any, subscription: Stripe.Subscription) {
  await supabase
    .from('companies')
    .update({
      subscription_status: 'cancelled',
      subscription_tier: 'free',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
}

async function handlePaymentSucceeded(supabase: any, invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  await supabase
    .from('companies')
    .update({
      subscription_status: 'active',
      last_payment_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', invoice.subscription)
}

async function handlePaymentFailed(supabase: any, invoice: Stripe.Invoice) {
  if (!invoice.subscription) return

  await supabase
    .from('companies')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', invoice.subscription)

  // Could also send notification email here
}
