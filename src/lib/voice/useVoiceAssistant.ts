'use client';

import { useState, useCallback, useRef } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';

interface UseVoiceAssistantOptions {
  onUserSpeech?: (transcript: string) => void;
  onAssistantStart?: () => void;
  onAssistantEnd?: () => void;
  autoListen?: boolean; // Auto-start listening after assistant speaks
}

interface VoiceAssistantHook {
  // State
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  userTranscript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  
  // Actions
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  reset: () => void;
}

export function useVoiceAssistant(
  options: UseVoiceAssistantOptions = {}
): VoiceAssistantHook {
  const { onUserSpeech, onAssistantStart, onAssistantEnd, autoListen = false } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Speech recognition
  const {
    isListening,
    transcript: userTranscript,
    interimTranscript,
    isSupported,
    startListening: startRecognition,
    stopListening: stopRecognition,
    resetTranscript,
  } = useSpeechRecognition({
    continuous: true,
    onResult: (text, isFinal) => {
      if (isFinal && text.trim()) {
        onUserSpeech?.(text.trim());
      }
    },
    onError: (err) => {
      setError(`Speech recognition error: ${err}`);
    },
  });

  // Text-to-speech using ElevenLabs via API route
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsSpeaking(true);
    setIsProcessing(true);
    setError(null);
    onAssistantStart?.();

    // Stop listening while speaking
    if (isListening) {
      stopRecognition();
    }

    try {
      // Call our API route for TTS
      const response = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'TTS request failed');
      }

      // Get audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play audio
      if (audioRef.current) {
        audioRef.current.pause();
      }

      audioRef.current = new Audio(audioUrl);
      setIsProcessing(false);

      audioRef.current.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        onAssistantEnd?.();
        
        // Auto-start listening after assistant finishes
        if (autoListen && isSupported) {
          setTimeout(() => startRecognition(), 300);
        }
      };

      audioRef.current.onerror = () => {
        setIsSpeaking(false);
        setError('Audio playback failed');
        URL.revokeObjectURL(audioUrl);
      };

      await audioRef.current.play();
    } catch (err) {
      setIsSpeaking(false);
      setIsProcessing(false);
      setError(err instanceof Error ? err.message : 'TTS failed');
      console.error('TTS error:', err);
    }
  }, [isListening, stopRecognition, onAssistantStart, onAssistantEnd, autoListen, isSupported, startRecognition]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback(() => {
    // Stop speaking if currently speaking
    if (isSpeaking) {
      stopSpeaking();
    }
    startRecognition();
  }, [isSpeaking, stopSpeaking, startRecognition]);

  const stopListening = useCallback(() => {
    stopRecognition();
  }, [stopRecognition]);

  const reset = useCallback(() => {
    stopSpeaking();
    stopRecognition();
    resetTranscript();
    setError(null);
  }, [stopSpeaking, stopRecognition, resetTranscript]);

  return {
    isListening,
    isSpeaking,
    isProcessing,
    userTranscript,
    interimTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    reset,
  };
}
