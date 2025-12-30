'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Mic, MicOff, Loader2, Phone, PhoneOff, Volume2 } from 'lucide-react'

// Agent IDs - these should come from environment variables
const AGENT_IDS = {
  setup: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_SETUP || '',
  opportunityBasics: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_BASICS || '',
  opportunityProperty: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_PROPERTY || '',
  opportunityFinancial: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_FINANCIAL || '',
  opportunityDeRisk: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_DERISK || '',
  assessment: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ASSESSMENT || '',
}

export type AgentType = keyof typeof AGENT_IDS

interface ConversationMetadata {
  user_id: string
  company_id: string
  opportunity_id?: string
  assessment_id?: string
}

interface ElevenLabsConversationalProps {
  agentType: AgentType
  metadata: ConversationMetadata
  onConversationEnd?: (result: any) => void
  onError?: (error: Error) => void
  className?: string
}

// ElevenLabs Conversational AI Widget
// Uses their embedded widget approach for simplicity
// For more control, use @11labs/react package

export function ElevenLabsConversational({
  agentType,
  metadata,
  onConversationEnd,
  onError,
  className = '',
}: ElevenLabsConversationalProps) {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState<Array<{ role: string; text: string }>>([])
  const conversationRef = useRef<any>(null)

  const agentId = AGENT_IDS[agentType]

  const startConversation = useCallback(async () => {
    if (!agentId) {
      onError?.(new Error(`Agent ID not configured for ${agentType}`))
      return
    }

    setStatus('connecting')
    setTranscript([])

    try {
      // Check for microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())

      // Initialize ElevenLabs conversation
      // This uses the ElevenLabs Conversational AI API
      const response = await fetch('https://api.elevenlabs.io/v1/convai/conversation/get_signed_url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
        },
        body: JSON.stringify({
          agent_id: agentId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get conversation URL')
      }

      const { signed_url } = await response.json()

      // Connect via WebSocket
      const ws = new WebSocket(signed_url)
      conversationRef.current = ws

      ws.onopen = () => {
        setStatus('connected')
        // Send initial metadata
        ws.send(JSON.stringify({
          type: 'conversation_initiation_client_data',
          custom_llm_extra_body: {
            metadata,
          },
        }))
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'agent_response':
            setTranscript(prev => [...prev, { role: 'agent', text: data.text }])
            break
          case 'user_transcript':
            if (data.text) {
              setTranscript(prev => [...prev, { role: 'user', text: data.text }])
            }
            break
          case 'conversation_ended':
            setStatus('idle')
            onConversationEnd?.(data)
            break
          case 'error':
            setStatus('error')
            onError?.(new Error(data.message))
            break
        }
      }

      ws.onerror = (error) => {
        setStatus('error')
        onError?.(new Error('WebSocket error'))
      }

      ws.onclose = () => {
        setStatus('idle')
      }

    } catch (error) {
      setStatus('error')
      onError?.(error instanceof Error ? error : new Error('Unknown error'))
    }
  }, [agentId, agentType, metadata, onConversationEnd, onError])

  const endConversation = useCallback(() => {
    if (conversationRef.current) {
      conversationRef.current.close()
      conversationRef.current = null
    }
    setStatus('idle')
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev)
    // In a real implementation, you'd mute the audio stream
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationRef.current) {
        conversationRef.current.close()
      }
    }
  }, [])

  const statusColors = {
    idle: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    connecting: 'bg-amber-100 text-amber-700',
    connected: 'bg-emerald-500 text-white',
    error: 'bg-red-100 text-red-700',
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-3">
        {/* Main control button */}
        <button
          onClick={status === 'connected' ? endConversation : startConversation}
          disabled={status === 'connecting'}
          className={`
            flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
            ${statusColors[status]}
            ${status === 'connecting' ? 'cursor-wait' : 'cursor-pointer'}
          `}
        >
          {status === 'idle' && (
            <>
              <Mic className="w-5 h-5" />
              <span>Start Voice Assistant</span>
            </>
          )}
          {status === 'connecting' && (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Connecting...</span>
            </>
          )}
          {status === 'connected' && (
            <>
              <PhoneOff className="w-5 h-5" />
              <span>End Conversation</span>
            </>
          )}
          {status === 'error' && (
            <>
              <Mic className="w-5 h-5" />
              <span>Retry Connection</span>
            </>
          )}
        </button>

        {/* Mute button when connected */}
        {status === 'connected' && (
          <button
            onClick={toggleMute}
            className={`p-3 rounded-xl transition-all ${
              isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* Status indicator */}
      {status === 'connected' && (
        <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span>Listening... speak now</span>
        </div>
      )}

      {/* Live transcript */}
      {transcript.length > 0 && (
        <div className="mt-4 max-h-60 overflow-y-auto space-y-2 text-sm">
          {transcript.slice(-6).map((msg, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg ${
                msg.role === 'agent'
                  ? 'bg-violet-50 text-violet-900'
                  : 'bg-gray-50 text-gray-900'
              }`}
            >
              <span className="font-medium text-xs uppercase">
                {msg.role === 'agent' ? '🤖 Assistant' : '👤 You'}:
              </span>
              <p className="mt-1">{msg.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {status === 'error' && (
        <p className="mt-2 text-sm text-red-600">
          Connection error. Please check your microphone and try again.
        </p>
      )}
    </div>
  )
}

// Alternative: Use ElevenLabs embedded widget
// This is simpler but less customizable

export function ElevenLabsWidget({
  agentType,
  metadata,
}: {
  agentType: AgentType
  metadata: ConversationMetadata
}) {
  const agentId = AGENT_IDS[agentType]
  const widgetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!agentId || !widgetRef.current) return

    // Load ElevenLabs widget script
    const script = document.createElement('script')
    script.src = 'https://elevenlabs.io/convai-widget/index.js'
    script.async = true
    document.body.appendChild(script)

    script.onload = () => {
      // Initialize widget
      if (widgetRef.current && (window as any).ElevenLabsConvai) {
        (window as any).ElevenLabsConvai.init({
          element: widgetRef.current,
          agentId,
          metadata,
        })
      }
    }

    return () => {
      document.body.removeChild(script)
    }
  }, [agentId, metadata])

  if (!agentId) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
        Voice assistant not configured. Set NEXT_PUBLIC_ELEVENLABS_AGENT_{agentType.toUpperCase()} in environment.
      </div>
    )
  }

  return <div ref={widgetRef} className="elevenlabs-widget" />
}

// Simplified button component for quick integration
export function VoiceAssistantButton({
  agentType,
  metadata,
  label = 'Voice Assistant',
  onComplete,
}: {
  agentType: AgentType
  metadata: ConversationMetadata
  label?: string
  onComplete?: (data: any) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-200"
      >
        <Mic className="w-5 h-5" />
        {label}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Voice Assistant</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <ElevenLabsConversational
              agentType={agentType}
              metadata={metadata}
              onConversationEnd={(result) => {
                onComplete?.(result)
                setIsOpen(false)
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
