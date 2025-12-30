import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/ai/client';

export type VoiceContext = 
  | 'setup'           // Setting up assessment criteria
  | 'opportunity'     // Entering opportunity details
  | 'assessment'      // Discussing assessment results
  | 'general';        // General questions

interface VoiceChatRequest {
  userMessage: string;
  context: VoiceContext;
  contextData?: Record<string, any>;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const SYSTEM_PROMPTS: Record<VoiceContext, string> = {
  setup: `You are a friendly voice assistant helping a property developer set up their assessment criteria in DealFindrs.

Your role is to:
- Guide them through setting gross margin thresholds (recommend 25% for GREEN, 18% for AMBER)
- Help configure de-risk factors and their point values
- Explain what each criterion means
- Keep responses concise (2-3 sentences max) since this will be spoken aloud

Be warm, professional, and use Australian English. Don't use markdown or special formatting.`,

  opportunity: `You are a voice assistant helping a deal finder enter property opportunity details in DealFindrs.

Your role is to:
- Ask questions one at a time to gather opportunity details
- Confirm what you heard before moving on
- Help with property details: address, size, lots, price, costs
- Keep responses very brief (1-2 sentences) since this is voice interaction

Extract these fields from conversation:
- Property name/address
- City, State
- Property size and unit (sqm/acres)
- Number of lots/dwellings
- Land purchase price
- Infrastructure costs
- Construction cost per unit
- Average sale price per unit

Be conversational and natural. Use Australian English.`,

  assessment: `You are a voice assistant explaining property assessment results in DealFindrs.

The assessment uses a RAG (Red/Amber/Green) traffic light system:
- GREEN: Score ≥80 AND Gross Margin ≥25%
- AMBER: Score 60-79 OR GM 18-24.9%
- RED: Score <60 OR GM <18%

Score = (GM% × 3) + de-risk points - risk penalties

Your role is to:
- Explain why the opportunity got its rating
- Highlight key factors (positive and negative)
- Suggest specific actions to improve the rating
- Answer questions about the assessment

Keep responses conversational but informative (3-4 sentences). Use Australian English. Be encouraging but realistic.`,

  general: `You are a helpful voice assistant for DealFindrs, a property development opportunity assessment platform.

Help users with:
- Understanding how the platform works
- Navigating features
- General property development questions

Keep responses brief and conversational. Use Australian English.`,
};

export async function POST(request: NextRequest) {
  try {
    const body: VoiceChatRequest = await request.json();
    const { userMessage, context, contextData, conversationHistory = [] } = body;

    if (!userMessage) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    // Build messages array
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPTS[context] || SYSTEM_PROMPTS.general },
    ];

    // Add context data if available
    if (contextData) {
      messages.push({
        role: 'system',
        content: `Current context data:\n${JSON.stringify(contextData, null, 2)}`,
      });
    }

    // Add conversation history
    for (const msg of conversationHistory.slice(-10)) { // Last 10 messages
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    // Get AI response
    const response = await chat(messages, {
      temperature: 0.7,
      maxTokens: 300, // Keep responses short for voice
      metadata: { task: 'voice-chat', context },
    });

    return NextResponse.json({
      success: true,
      response,
      context,
    });
  } catch (error) {
    console.error('Voice chat error:', error);
    return NextResponse.json(
      { error: 'Voice chat failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
