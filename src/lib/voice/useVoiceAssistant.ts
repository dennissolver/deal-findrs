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
  const [hasUserInteracted, setHasUserInteracted] = useState(false); // NEW: Track user interaction
  
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
      // Provide user-friendly error messages
      let errorMessage = 'Speech recognition error';
      
      switch (err) {
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
          break;
        case 'no-speech':
          errorMessage = 'No speech detected. Please try speaking again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please connect a microphone.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
        case 'aborted':
          // Don't show error for user-initiated abort
          return;
        default:
          errorMessage = `Speech recognition error: ${err}`;
      }
      
      setError(errorMessage);
    },
  });

  // Text-to-speech using ElevenLabs via API route
  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setIsSpeaking(true);
    setIsProcessing(true);
    setError(null);
    setHasUserInteracted(true); // Mark that user has interacted
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'TTS request failed');
      }

      // Get audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      audioRef.current = new Audio(audioUrl);
      setIsProcessing(false);

      audioRef.current.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        onAssistantEnd?.();
        
        // Only auto-start listening if:
        // 1. autoListen is enabled
        // 2. Browser supports speech recognition
        // 3. User has already interacted (crucial for mobile)
        if (autoListen && isSupported && hasUserInteracted) {
          // Use a slightly longer delay for mobile browsers
          setTimeout(() => {
            try {
              startRecognition();
            } catch (err) {
              console.warn('Could not auto-start listening:', err);
              // Don't set error - user can manually tap to listen
            }
          }, 500);
        }
      };

      audioRef.current.onerror = (e) => {
        setIsSpeaking(false);
        setIsProcessing(false);
        setError('Audio playback failed. Please try again.');
        URL.revokeObjectURL(audioUrl);
        console.error('Audio playback error:', e);
      };

      // Try to play - may fail on mobile without user gesture
      try {
        await audioRef.current.play();
      } catch (playError) {
        // If autoplay fails, we need user interaction
        setIsSpeaking(false);
        setIsProcessing(false);
        
        if ((playError as Error).name === 'NotAllowedError') {
          setError('Tap the mic button to hear the response');
        } else {
          setError('Audio playback failed');
        }
        
        URL.revokeObjectURL(audioUrl);
        console.warn('Audio play failed:', playError);
      }
    } catch (err) {
      setIsSpeaking(false);
      setIsProcessing(false);
      
      const errorMessage = err instanceof Error ? err.message : 'TTS failed';
      setError(errorMessage);
      console.error('TTS error:', err);
    }
  }, [isListening, stopRecognition, onAssistantStart, onAssistantEnd, autoListen, isSupported, hasUserInteracted, startRecognition]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, []);

  const startListening = useCallback(() => {
    setHasUserInteracted(true); // Mark user interaction
    setError(null); // Clear any previous errors
    
    // Stop speaking if currently speaking
    if (isSpeaking) {
      stopSpeaking();
    }
    
    try {
      startRecognition();
    } catch (err) {
      setError('Could not start listening. Please check microphone permissions.');
      console.error('Start listening error:', err);
    }
  }, [isSpeaking, stopSpeaking, startRecognition]);

  const stopListening = useCallback(() => {
    stopRecognition();
  }, [stopRecognition]);

  const reset = useCallback(() => {
    stopSpeaking();
    stopRecognition();
    resetTranscript();
    setError(null);
    setHasUserInteracted(false);
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
