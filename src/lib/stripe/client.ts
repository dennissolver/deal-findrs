import Stripe from 'stripe'

// Server-side Stripe instance
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }
    _stripe = new Stripe(key, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  }
  return _stripe
}

// Subscription tiers
export const TIERS = {
  free: {
    name: 'Free Trial',
    price: 0,
    limits: {
      opportunities: 5,
      users: 1,
      voiceMinutes: 10,
      imGeneration: false,
    },
  },
  standard: {
    name: 'Standard',
    price: 99,
    limits: {
      opportunities: 50,
      users: 5,
      voiceMinutes: 100,
      imGeneration: true,
    },
  },
  premium: {
    name: 'Premium',
    price: 299,
    limits: {
      opportunities: Infinity,
      users: Infinity,
      voiceMinutes: Infinity,
      imGeneration: true,
    },
  },
} as const

export type TierName = keyof typeof TIERS

// Price IDs from environment
export const PRICE_IDS = {
  free_monthly: process.env.STRIPE_PRICE_FREE_MONTHLY || '',
  standard_monthly: process.env.STRIPE_PRICE_STANDARD_MONTHLY || '',
  standard_yearly: process.env.STRIPE_PRICE_STANDARD_YEARLY || '',
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || '',
  premium_yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY || '',
}

// Helper to get tier from price ID
export function getTierFromPriceId(priceId: string): TierName {
  if (priceId === PRICE_IDS.premium_monthly || priceId === PRICE_IDS.premium_yearly) {
    return 'premium'
  }
  if (priceId === PRICE_IDS.standard_monthly || priceId === PRICE_IDS.standard_yearly) {
    return 'standard'
  }
  return 'free'
}
