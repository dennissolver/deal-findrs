import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/ai/client';
import { VOICE_SYSTEM_PROMPTS, VoiceContext, VoiceResponse, INITIAL_PROMPTS } from '@/lib/voice/prompts';

interface VoiceChatRequest {
  userMessage: string;
  context: VoiceContext;
  contextData?: Record<string, any>;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: VoiceChatRequest = await request.json();
    const { userMessage, context, contextData, conversationHistory = [] } = body;

    if (!userMessage) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const systemPrompt = VOICE_SYSTEM_PROMPTS[context] || VOICE_SYSTEM_PROMPTS.general;

    // Build messages array
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add context data (current form values, assessment data, etc.)
    if (contextData) {
      messages.push({
        role: 'system',
        content: `CURRENT DATA:\n${JSON.stringify(contextData, null, 2)}\n\nUse this to avoid asking for information already provided.`,
      });
    }

    // Add conversation history (last 6 exchanges)
    for (const msg of conversationHistory.slice(-12)) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current user message
    messages.push({ role: 'user', content: userMessage });

    // Get AI response
    const response = await chat(messages, {
      temperature: 0.4,
      maxTokens: 500,
      metadata: { task: 'voice-extraction', context },
    });

    // Parse JSON response from AI
    let parsedResponse: VoiceResponse;
    try {
      // Clean up response - remove markdown code blocks if present
      const cleanedResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      parsedResponse = JSON.parse(cleanedResponse);
    } catch {
      // If parsing fails, treat as plain message
      parsedResponse = {
        message: response,
        extractedFields: [],
      };
    }

    return NextResponse.json({
      success: true,
      ...parsedResponse,
      context,
    });
  } catch (error) {
    console.error('Voice chat error:', error);
    return NextResponse.json(
      { 
        success: false,
        message: "Sorry, I had trouble with that. Could you say it again?",
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET initial prompt for a context
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const context = searchParams.get('context') as VoiceContext || 'general';
  
  return NextResponse.json({
    context,
    initialPrompt: INITIAL_PROMPTS[context] || INITIAL_PROMPTS.general,
  });
}
