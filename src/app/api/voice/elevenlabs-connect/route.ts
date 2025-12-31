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
    // This is a GET request with agent_id as query parameter
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
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
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: true, message: 'Invalid ElevenLabs API key' },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { error: true, message: `ElevenLabs error: ${error}` },
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
