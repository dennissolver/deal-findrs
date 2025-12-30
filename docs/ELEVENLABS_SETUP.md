# ElevenLabs Conversational AI Setup Guide for DealFindrs

## Overview

DealFindrs uses 6 separate ElevenLabs Conversational AI agents, each handling a specific phase of the workflow:

| Agent | Purpose | Webhook Endpoint |
|-------|---------|------------------|
| Setup | Configure company assessment criteria | `/api/webhooks/elevenlabs/setup` |
| Opportunity Basics | Collect property name, address, lots | `/api/webhooks/elevenlabs/opportunity-basics` |
| Property Details | Land stage, lot sizes, zoning | `/api/webhooks/elevenlabs/opportunity-property` |
| Financial | Costs, revenue, GM% calculation | `/api/webhooks/elevenlabs/opportunity-financial` |
| De-Risk | Checklist of de-risk and risk factors | `/api/webhooks/elevenlabs/opportunity-derisk` |
| Assessment Discussion | Explain results, answer questions | `/api/webhooks/elevenlabs/assessment` |

## Step 1: Create ElevenLabs Account

1. Go to https://elevenlabs.io
2. Sign up or log in
3. Navigate to **Conversational AI** section
4. Make sure you have a paid plan that includes Conversational AI

## Step 2: Create Each Agent

For each agent, click **Create Agent** and configure:

### Agent 1: Setup Assistant

**Name:** `DealFindrs Setup Assistant`

**Voice:** Select "Lily" (pFZP5JQG7iQjIQuC4Bku) or another Australian-sounding voice

**First Message:**
```
G'day! I'm here to help you set up your assessment criteria for DealFindrs. We'll configure your gross margin thresholds and the de-risk factors that matter to your business. Let's start with the basics - what minimum gross margin percentage would you consider a GREEN light deal?
```

**System Prompt:** Copy from `src/lib/elevenlabs/agent-configs.ts` → `ELEVENLABS_AGENTS.setup.systemPrompt`

**Webhook URL:** `https://your-domain.vercel.app/api/webhooks/elevenlabs/setup`

**Data Extraction:** Enable JSON extraction with schema:
```json
{
  "type": "object",
  "properties": {
    "type": { "type": "string", "const": "setup_complete" },
    "data": {
      "type": "object",
      "properties": {
        "min_gm_green": { "type": "number" },
        "min_gm_amber": { "type": "number" },
        "derisk_factors": { "type": "array" },
        "risk_factors": { "type": "array" }
      }
    }
  }
}
```

### Agent 2: Opportunity Basics

**Name:** `DealFindrs Opportunity Assistant`

**First Message:**
```
G'day! Let's log a new opportunity. What would you like to call this project? Something like 'Smith Street Townhouses' or the suburb name works well.
```

**System Prompt:** Copy from `agent-configs.ts` → `ELEVENLABS_AGENTS.opportunityBasics.systemPrompt`

**Webhook URL:** `https://your-domain.vercel.app/api/webhooks/elevenlabs/opportunity-basics`

### Agent 3: Property Details

**Name:** `DealFindrs Property Details`

**First Message:**
```
Now let's get into the property details. First up - what stage is the land at? Is it raw land, has the DA been lodged, approved, or are the lots already titled?
```

**System Prompt:** Copy from `agent-configs.ts` → `ELEVENLABS_AGENTS.opportunityProperty.systemPrompt`

**Webhook URL:** `https://your-domain.vercel.app/api/webhooks/elevenlabs/opportunity-property`

### Agent 4: Financial Assistant

**Name:** `DealFindrs Financial Assistant`

**First Message:**
```
Time for the numbers! Let's work through the financials. Starting with acquisition - what's the land purchase price you're looking at?
```

**System Prompt:** Copy from `agent-configs.ts` → `ELEVENLABS_AGENTS.opportunityFinancial.systemPrompt`

**Webhook URL:** `https://your-domain.vercel.app/api/webhooks/elevenlabs/opportunity-financial`

### Agent 5: Risk Assessment

**Name:** `DealFindrs Risk Assessment`

**First Message:**
```
Let's go through the de-risk checklist to see what's working in your favour and what risks we need to flag. First up - do you have any pre-sales already secured for this project?
```

**System Prompt:** Copy from `agent-configs.ts` → `ELEVENLABS_AGENTS.opportunityDeRisk.systemPrompt`

**Webhook URL:** `https://your-domain.vercel.app/api/webhooks/elevenlabs/opportunity-derisk`

### Agent 6: Assessment Advisor

**Name:** `DealFindrs Assessment Advisor`

**First Message:**
```
I've reviewed the assessment. Would you like me to walk you through the results and explain what's driving the score?
```

**System Prompt:** Copy from `agent-configs.ts` → `ELEVENLABS_AGENTS.assessmentDiscussion.systemPrompt`

**Webhook URL:** `https://your-domain.vercel.app/api/webhooks/elevenlabs/assessment`

## Step 3: Configure Webhooks

For each agent, in the **Webhooks** section:

1. **Webhook URL:** Enter your production URL (e.g., `https://dealfindrs.vercel.app/api/webhooks/elevenlabs/setup`)

2. **Webhook Events:** Enable:
   - `conversation.completed`
   - `conversation.failed`
   - Optionally: `message.agent` and `message.user` for real-time updates

3. **Metadata:** Configure to pass through:
   - `user_id`
   - `company_id`
   - `opportunity_id` (for property/financial/derisk agents)

## Step 4: Get Agent IDs

After creating each agent, copy the **Agent ID** from the agent settings. You'll need these for your `.env`:

```env
# ElevenLabs Agent IDs
ELEVENLABS_AGENT_SETUP=agent_xxxxx
ELEVENLABS_AGENT_OPPORTUNITY_BASICS=agent_xxxxx
ELEVENLABS_AGENT_OPPORTUNITY_PROPERTY=agent_xxxxx
ELEVENLABS_AGENT_OPPORTUNITY_FINANCIAL=agent_xxxxx
ELEVENLABS_AGENT_OPPORTUNITY_DERISK=agent_xxxxx
ELEVENLABS_AGENT_ASSESSMENT=agent_xxxxx

# ElevenLabs API Key
ELEVENLABS_API_KEY=your_api_key
```

## Step 5: Embed Widget in App

Use the ElevenLabs Conversational AI widget or their React SDK:

```typescript
// Install: npm install @11labs/react

import { useConversation } from '@11labs/react'

function VoiceAssistant({ agentId, metadata }) {
  const conversation = useConversation({
    onMessage: (msg) => console.log('Message:', msg),
    onError: (err) => console.error('Error:', err),
  })

  const startConversation = async () => {
    await conversation.startSession({
      agentId,
      clientTools: {},
      overrides: {
        agent: {
          firstMessage: 'G\'day! Let\'s get started.',
        },
      },
      dynamicVariables: metadata, // Pass user_id, company_id, etc.
    })
  }

  return (
    <button onClick={startConversation}>
      {conversation.status === 'connected' ? '🔴 Listening...' : '🎤 Start Voice'}
    </button>
  )
}
```

## Step 6: Test Webhooks

1. Use ngrok for local testing:
   ```bash
   ngrok http 3000
   ```

2. Update ElevenLabs webhook URLs to use ngrok URL temporarily

3. Start a conversation and verify:
   - Transcript appears in `voice_transcripts` table
   - Data is extracted and saved to appropriate tables
   - Activity log entries are created

## Troubleshooting

### Webhook not receiving data
- Check ElevenLabs webhook logs in their dashboard
- Ensure your endpoint returns 200 status
- Verify CORS headers if needed

### Data extraction failing
- Check the system prompt is instructing the agent to output JSON
- Enable verbose logging in webhook handlers
- Test with simpler extraction schemas first

### Voice quality issues
- Try different voices in ElevenLabs
- Adjust voice settings (stability, similarity boost)
- Test with different microphones

## Conversation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    NEW USER SIGNUP                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Setup Agent    │
                    │  (Configure GM  │
                    │   thresholds)   │
                    └────────┬────────┘
                             │ webhook → company_settings
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   NEW OPPORTUNITY                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Basics Agent    │
                    │ (Name, address, │
                    │  lots)          │
                    └────────┬────────┘
                             │ webhook → opportunities (create)
                             ▼
                    ┌─────────────────┐
                    │ Property Agent  │
                    │ (Land stage,    │
                    │  zoning)        │
                    └────────┬────────┘
                             │ webhook → opportunities (update)
                             ▼
                    ┌─────────────────┐
                    │ Financial Agent │
                    │ (Costs, revenue,│
                    │  GM%)           │
                    └────────┬────────┘
                             │ webhook → opportunities + opportunity_financials
                             ▼
                    ┌─────────────────┐
                    │ De-Risk Agent   │
                    │ (Checklist)     │
                    └────────┬────────┘
                             │ webhook → opportunities (update flags)
                             ▼
                    ┌─────────────────┐
                    │ RUN ASSESSMENT  │
                    │ (API call)      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Assessment      │
                    │ Agent           │
                    │ (Discuss result)│
                    └────────┬────────┘
                             │ webhook → activity_log + assessments
                             ▼
                    ┌─────────────────┐
                    │ DECISION        │
                    │ Proceed/Pend/   │
                    │ Archive         │
                    └─────────────────┘
```

## Cost Considerations

ElevenLabs Conversational AI pricing:
- Check current pricing at https://elevenlabs.io/pricing
- Typically charged per minute of conversation
- Consider setting conversation time limits
- Monitor usage in ElevenLabs dashboard

## Security Notes

1. **Webhook Authentication:** Consider adding webhook signature verification
2. **Rate Limiting:** Implement rate limiting on webhook endpoints
3. **Input Validation:** Always validate extracted data before saving
4. **Metadata:** Never trust client-provided metadata without verification
