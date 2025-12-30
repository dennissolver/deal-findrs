import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/client'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { companyId, returnUrl } = await request.json()

    if (!companyId) {
      return NextResponse.json({ error: 'companyId required' }, { status: 400 })
    }

    const stripe = getStripe()
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get company's Stripe customer ID
    const { data: company, error } = await supabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', companyId)
      .single()

    if (error || !company?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found. Please subscribe first.' },
        { status: 400 }
      )
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
