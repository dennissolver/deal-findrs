// ElevenLabs Text-to-Speech Client

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export interface VoiceSettings {
  stability: number;      // 0-1, higher = more consistent
  similarity_boost: number; // 0-1, higher = more similar to original voice
  style?: number;         // 0-1, style exaggeration
  use_speaker_boost?: boolean;
}

export interface ElevenLabsConfig {
  apiKey: string;
  voiceId: string;
  modelId?: string;
  settings?: VoiceSettings;
}

// Default voice settings optimized for assistant
export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.3,
  use_speaker_boost: true,
};

// Recommended voices for assistant
export const RECOMMENDED_VOICES = {
  rachel: '21m00Tcm4TlvDq8ikWAM',    // Warm, professional female
  drew: '29vD33N1CtxCmqQRPOHJ',      // Confident male
  clyde: '2EiwWnXFnvU5JabPnv8n',     // Deep, authoritative male
  domi: 'AZnzlk1XvdvUeBnXmlld',      // Friendly female
  bella: 'EXAVITQu4vr4xnSDxMaL',     // Soft, conversational female
  adam: 'pNInz6obpgDQGcFmaJgB',      // Deep, narrative male
  charlie: 'IKne3meq5aSn9XLyUdCD',   // Natural Australian male
};

// Generate speech from text using ElevenLabs API
export async function textToSpeech(
  text: string,
  config: ElevenLabsConfig
): Promise<ArrayBuffer> {
  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${config.voiceId}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': config.apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: config.modelId || 'eleven_monolingual_v1',
        voice_settings: config.settings || DEFAULT_VOICE_SETTINGS,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  return response.arrayBuffer();
}

// Stream speech for longer texts (reduces latency)
export async function textToSpeechStream(
  text: string,
  config: ElevenLabsConfig,
  onChunk: (chunk: Uint8Array) => void
): Promise<void> {
  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${config.voiceId}/stream`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': config.apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: config.modelId || 'eleven_monolingual_v1',
        voice_settings: config.settings || DEFAULT_VOICE_SETTINGS,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs stream error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) onChunk(value);
  }
}

// Get available voices
export async function getVoices(apiKey: string) {
  const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
    headers: { 'xi-api-key': apiKey },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch voices: ${response.status}`);
  }

  return response.json();
}

// Check API key validity and quota
export async function checkSubscription(apiKey: string) {
  const response = await fetch(`${ELEVENLABS_API_URL}/user/subscription`, {
    headers: { 'xi-api-key': apiKey },
  });

  if (!response.ok) {
    throw new Error(`Invalid API key or subscription error`);
  }

  return response.json();
}
