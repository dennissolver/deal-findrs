#!/usr/bin/env node

/**
 * Stripe Products & Prices Setup Script
 * 
 * Creates all DealFindrs subscription tiers in your Stripe account.
 * 
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_xxx node tools/setup-stripe.js
 * 
 * This creates:
 *   - Free Trial (no charge, 14 days)
 *   - Standard ($99/month)
 *   - Premium ($299/month)
 */

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not set')
  console.log('\nUsage:')
  console.log('  STRIPE_SECRET_KEY=sk_test_xxx node tools/setup-stripe.js')
  process.exit(1)
}

// Initialize Stripe
const stripe = require('stripe')(STRIPE_SECRET_KEY)

const PRODUCTS = [
  {
    name: 'DealFindrs Free Trial',
    description: '14-day free trial with limited features',
    metadata: {
      tier: 'free',
      opportunities_limit: '5',
      users_limit: '1',
    },
    prices: [
      {
        nickname: 'Free Trial',
        unit_amount: 0,
        currency: 'aud',
        recurring: { interval: 'month' },
        metadata: { tier: 'free' },
      },
    ],
  },
  {
    name: 'DealFindrs Standard',
    description: 'For growing property developers',
    metadata: {
      tier: 'standard',
      opportunities_limit: '50',
      users_limit: '5',
    },
    prices: [
      {
        nickname: 'Standard Monthly',
        unit_amount: 9900, // $99.00
        currency: 'aud',
        recurring: { interval: 'month' },
        metadata: { tier: 'standard', billing: 'monthly' },
      },
      {
        nickname: 'Standard Yearly',
        unit_amount: 99000, // $990.00 (2 months free)
        currency: 'aud',
        recurring: { interval: 'year' },
        metadata: { tier: 'standard', billing: 'yearly' },
      },
    ],
  },
  {
    name: 'DealFindrs Premium',
    description: 'For established development companies',
    metadata: {
      tier: 'premium',
      opportunities_limit: 'unlimited',
      users_limit: 'unlimited',
    },
    prices: [
      {
        nickname: 'Premium Monthly',
        unit_amount: 29900, // $299.00
        currency: 'aud',
        recurring: { interval: 'month' },
        metadata: { tier: 'premium', billing: 'monthly' },
      },
      {
        nickname: 'Premium Yearly',
        unit_amount: 299000, // $2990.00 (2 months free)
        currency: 'aud',
        recurring: { interval: 'year' },
        metadata: { tier: 'premium', billing: 'yearly' },
      },
    ],
  },
]

async function createProducts() {
  console.log('🏦 Stripe Setup for DealFindrs\n')
  console.log('─'.repeat(50))

  const results = {
    products: {},
    prices: {},
  }

  for (const productConfig of PRODUCTS) {
    console.log(`\nCreating product: ${productConfig.name}...`)

    try {
      // Check if product already exists
      const existingProducts = await stripe.products.list({
        limit: 100,
      })
      
      let product = existingProducts.data.find(p => p.name === productConfig.name)

      if (product) {
        console.log(`  ⚠️  Product already exists: ${product.id}`)
      } else {
        // Create product
        product = await stripe.products.create({
          name: productConfig.name,
          description: productConfig.description,
          metadata: productConfig.metadata,
        })
        console.log(`  ✅ Created product: ${product.id}`)
      }

      results.products[productConfig.metadata.tier] = product.id

      // Create prices for this product
      for (const priceConfig of productConfig.prices) {
        console.log(`  Creating price: ${priceConfig.nickname}...`)

        try {
          const price = await stripe.prices.create({
            product: product.id,
            nickname: priceConfig.nickname,
            unit_amount: priceConfig.unit_amount,
            currency: priceConfig.currency,
            recurring: priceConfig.recurring,
            metadata: priceConfig.metadata,
          })

          const key = `${priceConfig.metadata.tier}_${priceConfig.metadata.billing || 'monthly'}`
          results.prices[key] = price.id
          console.log(`    ✅ Created price: ${price.id}`)
        } catch (err) {
          console.log(`    ❌ Error: ${err.message}`)
        }
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`)
    }
  }

  // Output env variables
  console.log('\n' + '─'.repeat(50))
  console.log('📝 Add to .env.local and Vercel:\n')

  console.log('# Stripe Products')
  Object.entries(results.products).forEach(([tier, id]) => {
    console.log(`STRIPE_PRODUCT_${tier.toUpperCase()}=${id}`)
  })

  console.log('\n# Stripe Prices')
  Object.entries(results.prices).forEach(([key, id]) => {
    console.log(`STRIPE_PRICE_${key.toUpperCase()}=${id}`)
  })

  console.log('\n✅ Done!')
  
  return results
}

// Also create Customer Portal configuration
async function setupCustomerPortal() {
  console.log('\n\n🔧 Setting up Customer Portal...')

  try {
    const config = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your DealFindrs subscription',
      },
      features: {
        subscription_cancel: {
          enabled: true,
          mode: 'at_period_end',
        },
        subscription_pause: {
          enabled: false,
        },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity'],
          proration_behavior: 'create_prorations',
          products: [], // Will be filled with product IDs
        },
        payment_method_update: {
          enabled: true,
        },
        invoice_history: {
          enabled: true,
        },
      },
    })

    console.log(`✅ Customer Portal configured: ${config.id}`)
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('⚠️  Customer Portal already configured')
    } else {
      console.log(`❌ Error: ${err.message}`)
    }
  }
}

async function main() {
  await createProducts()
  await setupCustomerPortal()
}

main().catch(console.error)
