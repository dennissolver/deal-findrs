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

    console.log('Opportunity basics webhook received:', payload.conversation_id)

    const extractedData = payload.extracted_data
    
    if (!extractedData || extractedData.type !== 'opportunity_basics') {
      await logTranscript(supabase, payload, 'opportunity_basics')
      return NextResponse.json({ status: 'transcript_logged' })
    }

    const { data } = extractedData
    const userId = payload.metadata?.user_id
    const companyId = payload.metadata?.company_id

    if (!companyId || !userId) {
      return NextResponse.json({ error: 'company_id and user_id required' }, { status: 400 })
    }

    // Create new opportunity with basic info
    const { data: opportunity, error: createError } = await supabase
      .from('opportunities')
      .insert({
        company_id: companyId,
        user_id: userId,
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        postcode: data.postcode,
        property_type: data.property_type,
        num_lots: data.num_lots,
        num_dwellings: data.num_lots, // Default same as lots
        landowner_name: data.landowner_name,
        landowner_contact: data.landowner_contact,
        status: 'draft',
        voice_conversation_id: payload.conversation_id,
      })
      .select()
      .single()

    if (createError) {
      console.error('Create opportunity error:', createError)
      return NextResponse.json({ error: 'Failed to create opportunity' }, { status: 500 })
    }

    // Log transcript with opportunity ID
    await logTranscript(supabase, payload, 'opportunity_basics', companyId, userId, opportunity.id)

    // Log activity
    await supabase.from('activity_log').insert({
      company_id: companyId,
      user_id: userId,
      action: 'created',
      entity_type: 'opportunity',
      entity_id: opportunity.id,
      details: {
        source: 'voice_assistant',
        conversation_id: payload.conversation_id,
        name: data.name,
        address: data.address,
      },
    })

    return NextResponse.json({
      status: 'success',
      message: 'Opportunity created successfully',
      opportunity: {
        id: opportunity.id,
        name: opportunity.name,
      },
      // Return opportunity_id so the next agent can use it
      next_step: {
        agent: 'opportunity_property',
        metadata: {
          opportunity_id: opportunity.id,
          company_id: companyId,
          user_id: userId,
        },
      },
    })
  } catch (error) {
    console.error('Opportunity basics webhook error:', error)
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
