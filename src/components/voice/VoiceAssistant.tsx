'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, X } from 'lucide-react';
import { useVoiceAssistant } from '@/lib/voice/useVoiceAssistant';

type VoiceContext = 'setup' | 'opportunity' | 'assessment' | 'general';

interface VoiceAssistantProps {
  context: VoiceContext;
  contextData?: Record<string, any>;
  initialMessage?: string;
  onExtractedData?: (data: Record<string, any>) => void;
  onClose?: () => void;
  className?: string;
  variant?: 'banner' | 'modal' | 'fab';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function VoiceAssistant({
  context,
  contextData,
  initialMessage,
  onExtractedData,
  onClose,
  className = '',
  variant = 'banner',
}: VoiceAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [hasSpokenInitial, setHasSpokenInitial] = useState(false);
  
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

  // Handle user speech
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
      // Call AI chat endpoint
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
        throw new Error('AI chat failed');
      }

      const data = await response.json();
      
      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Speak the response
      await speak(data.response);

      // Check for extracted data (for opportunity context)
      if (data.extractedData && onExtractedData) {
        onExtractedData(data.extractedData);
      }
    } catch (err) {
      console.error('Voice chat error:', err);
      const errorMessage = "Sorry, I had trouble processing that. Could you try again?";
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

  // Speak initial message on mount
  useEffect(() => {
    if (initialMessage && !hasSpokenInitial && isSupported) {
      setHasSpokenInitial(true);
      setMessages([{
        role: 'assistant',
        content: initialMessage,
        timestamp: new Date(),
      }]);
      speak(initialMessage);
    }
  }, [initialMessage, hasSpokenInitial, isSupported, speak]);

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
          Voice features require a modern browser with microphone access.
        </p>
      </div>
    );
  }

  // Banner variant (inline)
  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl overflow-hidden ${className}`}>
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleListening}
              disabled={isProcessing || isProcessingAI}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isListening 
                  ? 'bg-white text-violet-600 animate-pulse' 
                  : isSpeaking
                    ? 'bg-green-400 text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {isProcessing || isProcessingAI ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : isListening ? (
                <Mic className="w-6 h-6" />
              ) : isSpeaking ? (
                <Volume2 className="w-6 h-6" />
              ) : (
                <MicOff className="w-6 h-6" />
              )}
            </button>
            
            <div className="text-white max-w-xl">
              {isListening && interimTranscript ? (
                <p className="text-white/90 italic">"{interimTranscript}"</p>
              ) : messages.length > 0 ? (
                <p className="text-white/90">{messages[messages.length - 1].content}</p>
              ) : (
                <p className="text-white/80">Click the mic to start talking...</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="px-6 py-2 bg-red-500/20 text-white text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Modal variant (expandable dialog)
  if (variant === 'modal') {
    return (
      <div className={`bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden ${className}`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            {isSpeaking ? (
              <Volume2 className="w-5 h-5 animate-pulse" />
            ) : isListening ? (
              <Mic className="w-5 h-5 animate-pulse" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
            <span className="font-medium">Voice Assistant</span>
          </div>
          {onClose && (
            <button onClick={handleClose} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="max-h-64 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-violet-100 text-violet-900'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
            </div>
          ))}
          
          {/* Interim transcript */}
          {isListening && interimTranscript && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-xl px-4 py-2 bg-violet-50 text-violet-700 italic">
                <p className="text-sm">"{interimTranscript}"</p>
              </div>
            </div>
          )}

          {/* Processing indicator */}
          {isProcessingAI && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-xl px-4 py-2">
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-center gap-4">
          <button
            onClick={toggleListening}
            disabled={isProcessing || isProcessingAI}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-violet-600 text-white hover:bg-violet-700'
            }`}
          >
            {isProcessing || isProcessingAI ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isListening ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </button>
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  // FAB variant (floating action button with popup)
  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      <button
        onClick={toggleListening}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all ${
          isListening
            ? 'bg-red-500 scale-110'
            : isSpeaking
              ? 'bg-green-500 scale-105'
              : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:scale-105'
        }`}
      >
        {isProcessing || isProcessingAI ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : isListening ? (
          <MicOff className="w-6 h-6 text-white" />
        ) : isSpeaking ? (
          <Volume2 className="w-6 h-6 text-white animate-pulse" />
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </button>
    </div>
  );
}

export default VoiceAssistant;
