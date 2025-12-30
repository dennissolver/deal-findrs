// Voice library exports

// ElevenLabs client
export {
  textToSpeech,
  textToSpeechStream,
  getVoices,
  checkSubscription,
  RECOMMENDED_VOICES,
  DEFAULT_VOICE_SETTINGS,
  type VoiceSettings,
  type ElevenLabsConfig,
} from './elevenlabs';

// Prompts and types
export {
  VOICE_SYSTEM_PROMPTS,
  INITIAL_PROMPTS,
  FIELD_LABELS,
  type VoiceContext,
  type ExtractedField,
  type VoiceResponse,
} from './prompts';

// Hooks
export { useSpeechRecognition } from './useSpeechRecognition';
export { useVoiceAssistant } from './useVoiceAssistant';
