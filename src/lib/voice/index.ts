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

// Hooks
export { useSpeechRecognition } from './useSpeechRecognition';
export { useVoiceAssistant } from './useVoiceAssistant';
