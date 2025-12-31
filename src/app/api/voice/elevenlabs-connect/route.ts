import { NextRequest, NextResponse } from 'next/server'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

export async function POST(request: NextRequest) {
  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json(
      { error: true, message: 'ElevenLabs API key not configured' },
      { status: 500 }
    )
  }

  try {
    const { agentId, metadata } = await request.json()

    if (!agentId) {
      return NextResponse.json(
        { error: true, message: 'Agent ID required' },
        { status: 400 }
      )
    }

    // Get signed URL for WebSocket connection from ElevenLabs
    // Using the correct endpoint for Conversational AI
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('ElevenLabs API error:', error)
      
      // If agent doesn't exist, return helpful message
      if (response.status === 404) {
        return NextResponse.json(
          { error: true, message: 'Agent not found. Create agents at /admin/elevenlabs' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: true, message: 'Failed to get conversation URL. Check ElevenLabs API key and agent ID.' },
        { status: 500 }
      )
    }

    const data = await response.json()

    // Return the WebSocket URL for direct connection
    return NextResponse.json({
      signedUrl: data.signed_url || `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`,
      conversationId: data.conversation_id,
    })
  } catch (error) {
    console.error('Voice connect error:', error)
    return NextResponse.json(
      { error: true, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
