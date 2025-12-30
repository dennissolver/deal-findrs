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
    opportunity_id?: string
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

    console.log('Opportunity property webhook received:', payload.conversation_id)

    const extractedData = payload.extracted_data
    
    if (!extractedData || extractedData.type !== 'opportunity_property') {
      await logTranscript(supabase, payload, 'opportunity_property')
      return NextResponse.json({ status: 'transcript_logged' })
    }

    const { data } = extractedData
    const opportunityId = payload.metadata?.opportunity_id
    const companyId = payload.metadata?.company_id
    const userId = payload.metadata?.user_id

    if (!opportunityId) {
      return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 })
    }

    // Update opportunity with property details
    const { error: updateError } = await supabase
      .from('opportunities')
      .update({
        land_stage: data.land_stage,
        land_size_sqm: data.land_size_sqm,
        average_lot_size_sqm: data.avg_lot_size_sqm,
        dwelling_mix: data.dwelling_mix,
        num_storeys: data.storeys,
        zoning: data.zoning,
        council_lga: data.council,
        expected_da_date: data.da_approval_date,
        expected_construction_start: data.construction_start,
        expected_completion: data.completion_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', opportunityId)

    if (updateError) {
      console.error('Update opportunity error:', updateError)
      return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 })
    }

    // Log transcript
    await logTranscript(supabase, payload, 'opportunity_property', companyId, userId, opportunityId)

    // Log activity
    if (companyId && userId) {
      await supabase.from('activity_log').insert({
        company_id: companyId,
        user_id: userId,
        action: 'updated',
        entity_type: 'opportunity',
        entity_id: opportunityId,
        details: {
          source: 'voice_assistant',
          section: 'property_details',
          conversation_id: payload.conversation_id,
          land_stage: data.land_stage,
        },
      })
    }

    return NextResponse.json({
      status: 'success',
      message: 'Property details updated',
      next_step: {
        agent: 'opportunity_financial',
        metadata: {
          opportunity_id: opportunityId,
          company_id: companyId,
          user_id: userId,
        },
      },
    })
  } catch (error) {
    console.error('Opportunity property webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function logTranscript(
  supabase: SupabaseClient,
  payload: ElevenLabsWebhookPayload,
  context: string,
  companyId?: string,
  userId?: string,
  opportunityId?: string
) {
  await supabase.from('voice_transcripts').insert({
    company_id: companyId,
    user_id: userId,
    opportunity_id: opportunityId,
    conversation_id: payload.conversation_id,
    agent_id: payload.agent_id,
    context,
    transcript: payload.transcript,
    extracted_data: payload.extracted_data,
    duration_seconds: payload.duration_seconds,
    status: payload.status,
  })
}
