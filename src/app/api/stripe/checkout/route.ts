import { NextRequest, NextResponse } from 'next/server'
import { getStripe, PRICE_IDS } from '@/lib/stripe/client'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { priceKey, userId, companyId, email, successUrl, cancelUrl } = await request.json()

    if (!priceKey || !userId || !companyId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: priceKey, userId, companyId, email' },
        { status: 400 }
      )
    }

    const priceId = PRICE_IDS[priceKey as keyof typeof PRICE_IDS]
    if (!priceId) {
      return NextResponse.json(
        { error: `Invalid price key: ${priceKey}. Configure STRIPE_PRICE_* env vars.` },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if customer already exists
    const { data: company } = await supabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', companyId)
      .single()

    let customerId = company?.stripe_customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          company_id: companyId,
          user_id: userId,
        },
      })
      customerId = customer.id

      // Save customer ID to company
      await supabase
        .from('companies')
        .update({ stripe_customer_id: customerId })
        .eq('id', companyId)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
      metadata: {
        company_id: companyId,
        user_id: userId,
      },
      subscription_data: {
        metadata: {
          company_id: companyId,
        },
        trial_period_days: priceKey.includes('free') ? 14 : undefined,
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
