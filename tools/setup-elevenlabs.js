#!/usr/bin/env node

/**
 * ElevenLabs Conversational AI Agent Setup Script
 * 
 * Creates all 6 DealFindrs voice agents in your ElevenLabs account.
 * 
 * Usage:
 *   ELEVENLABS_API_KEY=your_key APP_URL=https://your-app.vercel.app node tools/setup-elevenlabs.js
 * 
 * Or set env vars first:
 *   export ELEVENLABS_API_KEY=your_key
 *   export APP_URL=https://your-app.vercel.app
 *   node tools/setup-elevenlabs.js
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'

if (!ELEVENLABS_API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not set')
  console.log('\nUsage:')
  console.log('  ELEVENLABS_API_KEY=your_key APP_URL=https://your-app.vercel.app node tools/setup-elevenlabs.js')
  process.exit(1)
}

const DEFAULT_VOICE = 'pFZP5JQG7iQjIQuC4Bku' // Lily

const AGENTS = [
  {
    name: 'DealFindrs Setup Assistant',
    slug: 'setup',
    webhook: '/api/webhooks/elevenlabs/setup',
    firstMessage: "G'day! I'm here to help you set up your assessment criteria for DealFindrs. Let's start - what minimum gross margin percentage would you consider a GREEN light deal?",
    systemPrompt: `You are a setup assistant for DealFindrs. Collect: 1) GM thresholds (green/amber), 2) De-risk factors with points (presales, DA approved, fixed price contract, site owned, builder appointed, finance approved), 3) Risk factors (contamination, flood, heritage, complex titles). When complete, output JSON: {"type":"setup_complete","data":{"min_gm_green":25,"min_gm_amber":18,"derisk_factors":[...],"risk_factors":[...]}}`
  },
  {
    name: 'DealFindrs Opportunity Assistant', 
    slug: 'opportunity-basics',
    webhook: '/api/webhooks/elevenlabs/opportunity-basics',
    firstMessage: "G'day! Let's log a new opportunity. What would you like to call this project?",
    systemPrompt: `Collect opportunity basics: name, address, suburb/city, state, postcode, property type, num lots, landowner name/contact (optional). When complete, output JSON: {"type":"opportunity_basics","data":{"name":"...","address":"...","city":"...","state":"...","postcode":"...","property_type":"...","num_lots":12}}`
  },
  {
    name: 'DealFindrs Property Details',
    slug: 'opportunity-property', 
    webhook: '/api/webhooks/elevenlabs/opportunity-property',
    firstMessage: "What stage is the land at - raw land, DA lodged, DA approved, or titled lots?",
    systemPrompt: `Collect: land stage, land size sqm, avg lot size, dwelling mix, storeys, zoning, council, key dates. When complete, output JSON: {"type":"opportunity_property","data":{"land_stage":"...","land_size_sqm":5000,...}}`
  },
  {
    name: 'DealFindrs Financial Assistant',
    slug: 'opportunity-financial',
    webhook: '/api/webhooks/elevenlabs/opportunity-financial', 
    firstMessage: "Time for the numbers! What's the land purchase price?",
    systemPrompt: `Collect financials: land price, stamp duty, legal fees, DA costs, civil works, construction, professional fees, marketing, finance costs, contingency, sale prices, presales. Calculate totals and GM%. When complete, output JSON: {"type":"opportunity_financial","data":{"land_price":2000000,"total_costs":6900000,"total_revenue":7800000,"gross_margin_percent":11.5,...}}`
  },
  {
    name: 'DealFindrs Risk Assessment',
    slug: 'opportunity-derisk',
    webhook: '/api/webhooks/elevenlabs/opportunity-derisk',
    firstMessage: "Let's go through the de-risk checklist. Do you have any pre-sales secured?",
    systemPrompt: `Go through de-risk factors (presales, DA, fixed contract, site owned, builder, finance) and risks (contamination, flood, heritage, titles, market, council). When complete, output JSON: {"type":"opportunity_derisk","data":{"applied_derisk":[...],"applied_risks":[...]}}`
  },
  {
    name: 'DealFindrs Assessment Advisor',
    slug: 'assessment',
    webhook: '/api/webhooks/elevenlabs/assessment',
    firstMessage: "I've reviewed the assessment. Want me to walk you through the results?",
    systemPrompt: `Explain assessment results: RAG status, score breakdown, path to green, next steps. When user decides, output JSON: {"type":"assessment_discussion","data":{"decision":"proceed|pend|archive|undecided"}}`
  }
]

async function createAgent(agent) {
  const res = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY
    },
    body: JSON.stringify({
      name: agent.name,
      conversation_config: {
        agent: {
          prompt: { prompt: agent.systemPrompt },
          first_message: agent.firstMessage,
          language: 'en'
        },
        tts: { voice_id: DEFAULT_VOICE }
      },
      platform_settings: {
        webhook: {
          url: `${APP_URL}${agent.webhook}`,
          events: ['conversation.completed', 'conversation.failed']
        }
      }
    })
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Failed: ${err}`)
  }

  const data = await res.json()
  return data.agent_id
}

async function main() {
  console.log('🎤 ElevenLabs Agent Setup for DealFindrs\n')
  console.log(`App URL: ${APP_URL}`)
  console.log('─'.repeat(50))

  const results = {}

  for (const agent of AGENTS) {
    process.stdout.write(`Creating ${agent.name}... `)
    try {
      const id = await createAgent(agent)
      results[agent.slug] = id
      console.log(`✅ ${id}`)
    } catch (err) {
      console.log(`❌ ${err.message}`)
    }
  }

  console.log('\n' + '─'.repeat(50))
  console.log('📝 Add to .env.local and Vercel:\n')
  console.log(`NEXT_PUBLIC_ELEVENLABS_AGENT_SETUP=${results['setup'] || ''}`)
  console.log(`NEXT_PUBLIC_ELEVENLABS_AGENT_BASICS=${results['opportunity-basics'] || ''}`)
  console.log(`NEXT_PUBLIC_ELEVENLABS_AGENT_PROPERTY=${results['opportunity-property'] || ''}`)
  console.log(`NEXT_PUBLIC_ELEVENLABS_AGENT_FINANCIAL=${results['opportunity-financial'] || ''}`)
  console.log(`NEXT_PUBLIC_ELEVENLABS_AGENT_DERISK=${results['opportunity-derisk'] || ''}`)
  console.log(`NEXT_PUBLIC_ELEVENLABS_AGENT_ASSESSMENT=${results['assessment'] || ''}`)
  console.log('\n✅ Done!')
}

main().catch(console.error)
