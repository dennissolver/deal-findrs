'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Loader2, ArrowLeft } from 'lucide-react'

const PLANS = [
  {
    name: 'Free Trial',
    price: 0,
    period: '14 days',
    priceKey: 'free_monthly',
    features: [
      '5 opportunities',
      '1 user',
      'Basic RAG assessment',
      'Email support',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Standard',
    price: 99,
    period: '/month',
    yearlyPrice: 990,
    priceKey: 'standard_monthly',
    yearlyPriceKey: 'standard_yearly',
    features: [
      '50 opportunities/month',
      '5 team members',
      'Voice assistant',
      'IM generation',
      'Priority support',
    ],
    cta: 'Get Started',
    highlighted: true,
  },
  {
    name: 'Premium',
    price: 299,
    period: '/month',
    yearlyPrice: 2990,
    priceKey: 'premium_monthly',
    yearlyPriceKey: 'premium_yearly',
    features: [
      'Unlimited opportunities',
      'Unlimited users',
      'Custom criteria',
      'API access',
      'White-label options',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [error, setError] = useState<string | null>(null)

  const handleSelectPlan = async (plan: typeof PLANS[0]) => {
    // For premium, redirect to contact
    if (plan.name === 'Premium') {
      router.push('/contact')
      return
    }

    setLoading(plan.name)
    setError(null)

    try {
      // Get user info from localStorage or redirect to login
      const userStr = localStorage.getItem('user')
      if (!userStr) {
        router.push('/login?redirect=/pricing')
        return
      }

      const user = JSON.parse(userStr)
      const priceKey = billingPeriod === 'yearly' && plan.yearlyPriceKey 
        ? plan.yearlyPriceKey 
        : plan.priceKey

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceKey,
          userId: user.id,
          companyId: user.company_id,
          email: user.email,
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/pricing?checkout=cancelled`,
        }),
      })

      const data = await response.json()

      if (data.error) {
        setError(data.error)
        setLoading(null)
        return
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError('Failed to start checkout. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-amber-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Start free, upgrade when you're ready
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-white rounded-full p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingPeriod === 'yearly'
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                2 months free
              </span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-center">
            {error}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => {
            const displayPrice = billingPeriod === 'yearly' && plan.yearlyPrice
              ? plan.yearlyPrice
              : plan.price
            const displayPeriod = billingPeriod === 'yearly' && plan.yearlyPrice
              ? '/year'
              : plan.period

            return (
              <div
                key={plan.name}
                className={`bg-white rounded-2xl p-8 ${
                  plan.highlighted
                    ? 'ring-2 ring-violet-600 shadow-xl scale-105'
                    : 'border border-gray-200 shadow-lg'
                }`}
              >
                {plan.highlighted && (
                  <div className="text-center mb-4">
                    <span className="bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    ${displayPrice}
                  </span>
                  <span className="text-gray-600">{displayPeriod}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={loading !== null}
                  className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                    plan.highlighted
                      ? 'bg-violet-600 text-white hover:bg-violet-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {loading === plan.name ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    plan.cta
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-gray-600">
            All plans include SSL encryption, daily backups, and Australian data hosting.
          </p>
          <p className="text-gray-500 mt-2">
            Questions? <Link href="/contact" className="text-violet-600 hover:underline">Contact us</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
