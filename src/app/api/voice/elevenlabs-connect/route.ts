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
    const response = await fetch(
      'https://api.elevenlabs.io/v1/convai/conversation/get_signed_url',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          agent_id: agentId,
          // Pass metadata to be included in webhook calls
          conversation_config_override: {
            agent: {
              custom_llm_extra_body: {
                metadata,
              },
            },
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('ElevenLabs API error:', error)
      return NextResponse.json(
        { error: true, message: 'Failed to get conversation URL' },
        { status: 500 }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      signedUrl: data.signed_url,
    })
  } catch (error) {
    console.error('Voice connect error:', error)
    return NextResponse.json(
      { error: true, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
