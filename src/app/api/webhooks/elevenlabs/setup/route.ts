import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('Supabase credentials not configured')
    _supabaseAdmin = createClient(url, key)
  }
  return _supabaseAdmin
}

// ElevenLabs webhook payload structure
interface ElevenLabsWebhookPayload {
  conversation_id: string
  agent_id: string
  status: 'completed' | 'failed' | 'in_progress'
  transcript: Array<{
    role: 'agent' | 'user'
    message: string
    timestamp: string
  }>
  metadata?: {
    user_id?: string
    company_id?: string
    [key: string]: any
  }
  extracted_data?: {
    type: string
    data: any
  }
  duration_seconds?: number
}

export async function POST(request: NextRequest) {
  try {
    const payload: ElevenLabsWebhookPayload = await request.json()
    const supabase = getSupabaseAdmin()

    console.log('Setup webhook received:', payload.conversation_id)

    // Extract the structured data from the conversation
    const extractedData = payload.extracted_data || extractDataFromTranscript(payload.transcript)
    
    if (!extractedData || extractedData.type !== 'setup_complete') {
      // Conversation not complete yet, just log transcript
      await logTranscript(supabase, payload, 'setup')
      return NextResponse.json({ status: 'transcript_logged' })
    }

    const { data } = extractedData
    const userId = payload.metadata?.user_id
    const companyId = payload.metadata?.company_id

    if (!companyId) {
      return NextResponse.json({ error: 'company_id required in metadata' }, { status: 400 })
    }

    // Update company_settings with the extracted configuration
    const { error: settingsError } = await supabase
      .from('company_settings')
      .update({
        min_gm_green: data.min_gm_green,
        min_gm_amber: data.min_gm_amber,
        derisk_factors: data.derisk_factors,
        risk_factors: data.risk_factors,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)

    if (settingsError) {
      console.error('Settings update error:', settingsError)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    // Log the voice transcript
    await logTranscript(supabase, payload, 'setup', companyId, userId)

    // Log activity
    await supabase.from('activity_log').insert({
      company_id: companyId,
      user_id: userId,
      action: 'settings_configured',
      entity_type: 'company_settings',
      entity_id: companyId,
      details: {
        source: 'voice_assistant',
        conversation_id: payload.conversation_id,
        min_gm_green: data.min_gm_green,
        min_gm_amber: data.min_gm_amber,
        derisk_count: data.derisk_factors?.length || 0,
        risk_count: data.risk_factors?.length || 0,
      },
    })

    return NextResponse.json({
      status: 'success',
      message: 'Company settings updated successfully',
      settings: {
        min_gm_green: data.min_gm_green,
        min_gm_amber: data.min_gm_amber,
      },
    })
  } catch (error) {
    console.error('Setup webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper to log voice transcripts
async function logTranscript(
  supabase: SupabaseClient,
  payload: ElevenLabsWebhookPayload,
  context: string,
  companyId?: string,
  userId?: string
) {
  await supabase.from('voice_transcripts').insert({
    company_id: companyId,
    user_id: userId,
    conversation_id: payload.conversation_id,
    agent_id: payload.agent_id,
    context,
    transcript: payload.transcript,
    extracted_data: payload.extracted_data,
    duration_seconds: payload.duration_seconds,
    status: payload.status,
  })
}

// Fallback extraction from transcript (if ElevenLabs doesn't provide structured data)
function extractDataFromTranscript(transcript: ElevenLabsWebhookPayload['transcript']): any {
  // Look for JSON in the last few agent messages
  const agentMessages = transcript
    .filter(t => t.role === 'agent')
    .slice(-5)
    .map(t => t.message)
    .join(' ')

  // Try to find JSON block
  const jsonMatch = agentMessages.match(/\{[\s\S]*"type"[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch {
      return null
    }
  }
  return null
}
