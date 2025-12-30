'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, X, Check } from 'lucide-react';
import { useVoiceAssistant } from '@/lib/voice/useVoiceAssistant';
import { VoiceContext, ExtractedField, FIELD_LABELS, INITIAL_PROMPTS } from '@/lib/voice/prompts';

interface VoiceAssistantProps {
  context: VoiceContext;
  contextData?: Record<string, any>;
  customInitialPrompt?: string;  // Override default prompt for this context
  onFieldExtracted?: (field: string, value: any) => void;
  onClose?: () => void;
  className?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  extractedFields?: ExtractedField[];
  timestamp: Date;
}

export function VoiceAssistant({
  context,
  contextData,
  customInitialPrompt,
  onFieldExtracted,
  onClose,
  className = '',
}: VoiceAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [hasSpokenInitial, setHasSpokenInitial] = useState(false);
  const [lastExtracted, setLastExtracted] = useState<ExtractedField[]>([]);
  
  const {
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
  } = useVoiceAssistant({
    autoListen: true,
    onUserSpeech: handleUserSpeech,
  });

  // Handle user speech and extract data
  async function handleUserSpeech(transcript: string) {
    if (!transcript.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: transcript,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Stop listening while processing
    stopListening();
    setIsProcessingAI(true);

    try {
      // Call AI chat endpoint with extraction
      const response = await fetch('/api/voice/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: transcript,
          context,
          contextData,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error('Voice processing failed');
      }

      const data = await response.json();
      
      // Extract fields and update form
      if (data.extractedFields && data.extractedFields.length > 0) {
        setLastExtracted(data.extractedFields);
        
        // Call back with each extracted field
        for (const field of data.extractedFields) {
          if (onFieldExtracted && field.confidence !== 'low') {
            onFieldExtracted(field.field, field.value);
          }
        }
      }
      
      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        extractedFields: data.extractedFields,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Speak the response
      await speak(data.message);

    } catch (err) {
      console.error('Voice chat error:', err);
      const errorMessage = "Sorry, I didn't catch that. Could you say it again?";
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      }]);
      await speak(errorMessage);
    } finally {
      setIsProcessingAI(false);
    }
  }

  // Speak initial prompt on mount
  useEffect(() => {
    if (!hasSpokenInitial && isSupported) {
      // Use custom prompt if provided, otherwise use default for context
      const initialPrompt = customInitialPrompt || INITIAL_PROMPTS[context];
      if (initialPrompt) {
        setHasSpokenInitial(true);
        setMessages([{
          role: 'assistant',
          content: initialPrompt,
          timestamp: new Date(),
        }]);
        // Small delay before speaking
        setTimeout(() => speak(initialPrompt), 500);
      }
    }
  }, [hasSpokenInitial, isSupported, context, customInitialPrompt, speak]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
    }
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, isSpeaking, startListening, stopListening, stopSpeaking]);

  // Handle close
  const handleClose = useCallback(() => {
    reset();
    onClose?.();
  }, [reset, onClose]);

  if (!isSupported) {
    return (
      <div className={`bg-amber-50 border border-amber-200 rounded-xl p-4 ${className}`}>
        <p className="text-amber-800 text-sm">
          🎙️ Voice requires Chrome, Edge, or Safari with microphone access.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl overflow-hidden ${className}`}>
      {/* Main Voice Bar */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleListening}
            disabled={isProcessing || isProcessingAI}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse scale-110' 
                : isSpeaking
                  ? 'bg-green-400 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            {isProcessing || isProcessingAI ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isListening ? (
              <MicOff className="w-6 h-6" />
            ) : isSpeaking ? (
              <Volume2 className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>
          
          <div className="text-white max-w-lg">
            <p className="font-medium text-sm mb-1">
              {isListening ? '🔴 Listening...' : isSpeaking ? '🔊 Speaking...' : '🎙️ Voice Assistant'}
            </p>
            
            {/* Show interim transcript while listening */}
            {isListening && interimTranscript ? (
              <p className="text-white/90 italic text-sm">"{interimTranscript}"</p>
            ) : messages.length > 0 ? (
              <p className="text-white/90 text-sm line-clamp-2">
                {messages[messages.length - 1].content}
              </p>
            ) : (
              <p className="text-white/70 text-sm">Click the mic button to start talking</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Show extracted fields indicator */}
          {lastExtracted.length > 0 && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/30 rounded-lg">
              <Check className="w-4 h-4 text-emerald-300" />
              <span className="text-emerald-100 text-xs font-medium">
                {lastExtracted.length} field{lastExtracted.length > 1 ? 's' : ''} captured
              </span>
            </div>
          )}
          
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 text-white"
              title="Stop speaking"
            >
              <VolumeX className="w-5 h-5" />
            </button>
          )}
          
          {onClose && (
            <button
              onClick={handleClose}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 text-white"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Extracted Fields Display */}
      {lastExtracted.length > 0 && (
        <div className="px-6 py-3 bg-black/20 border-t border-white/10">
          <div className="flex flex-wrap gap-2">
            {lastExtracted.map((field, i) => (
              <div 
                key={i}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                  field.confidence === 'high' 
                    ? 'bg-emerald-500/30 text-emerald-100' 
                    : field.confidence === 'medium'
                      ? 'bg-amber-500/30 text-amber-100'
                      : 'bg-gray-500/30 text-gray-200'
                }`}
              >
                <Check className="w-3 h-3" />
                <span className="opacity-70">{FIELD_LABELS[field.field] || field.field}:</span>
                <span>{String(field.value)}</span>
              </div>
            ))}
          </div>
          <p className="text-white/60 text-xs mt-2">
            ✓ Fields auto-filled. Review and correct if needed, then click Next.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="px-6 py-2 bg-red-500/30 text-white text-sm">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}

export default VoiceAssistant;
