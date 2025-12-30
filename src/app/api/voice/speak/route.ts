import { NextRequest, NextResponse } from 'next/server';
import { textToSpeech, RECOMMENDED_VOICES, DEFAULT_VOICE_SETTINGS } from '@/lib/voice/elevenlabs';

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured' },
        { status: 500 }
      );
    }

    // Use provided voiceId or default to Charlie (Australian male)
    const selectedVoiceId = voiceId || process.env.ELEVENLABS_VOICE_ID || RECOMMENDED_VOICES.charlie;

    // Generate speech
    const audioBuffer = await textToSpeech(text, {
      apiKey,
      voiceId: selectedVoiceId,
      modelId: 'eleven_monolingual_v1',
      settings: DEFAULT_VOICE_SETTINGS,
    });

    // Return audio as response
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json(
      { 
        error: 'Text-to-speech failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  const hasApiKey = !!process.env.ELEVENLABS_API_KEY;
  
  return NextResponse.json({
    service: 'ElevenLabs Text-to-Speech',
    configured: hasApiKey,
    voiceId: process.env.ELEVENLABS_VOICE_ID || RECOMMENDED_VOICES.charlie,
    availableVoices: RECOMMENDED_VOICES,
  });
}
