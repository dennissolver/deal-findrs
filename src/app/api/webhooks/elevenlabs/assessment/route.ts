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
    assessment_id?: string
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

    console.log('Assessment discussion webhook received:', payload.conversation_id)

    const extractedData = payload.extracted_data
    const opportunityId = payload.metadata?.opportunity_id
    const assessmentId = payload.metadata?.assessment_id
    const companyId = payload.metadata?.company_id
    const userId = payload.metadata?.user_id

    // Always log the transcript for assessment discussions
    await logTranscript(supabase, payload, 'assessment_discussion', companyId, userId, opportunityId)

    if (!extractedData || extractedData.type !== 'assessment_discussion') {
      return NextResponse.json({ status: 'transcript_logged' })
    }

    const { data } = extractedData

    // If user made a decision, update the opportunity status
    if (data.decision && data.decision !== 'undecided' && opportunityId) {
      const statusMap: Record<string, string> = {
        proceed: 'proceed',
        pend: 'pending',
        archive: 'archived',
      }
      
      const newStatus = statusMap[data.decision]
      if (newStatus) {
        await supabase
          .from('opportunities')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', opportunityId)
      }
    }

    // Log the discussion details to activity log
    if (companyId && userId) {
      await supabase.from('activity_log').insert({
        company_id: companyId,
        user_id: userId,
        action: 'discussed',
        entity_type: 'assessment',
        entity_id: assessmentId || opportunityId,
        details: {
          source: 'voice_assistant',
          conversation_id: payload.conversation_id,
          duration_seconds: payload.duration_seconds,
          questions_asked: data.questions_asked,
          recommendations_discussed: data.recommendations_discussed,
          decision: data.decision,
        },
      })
    }

    // If assessment exists, update with voice discussion flag
    if (assessmentId) {
      await supabase
        .from('assessments')
        .update({
          voice_discussed: true,
          voice_discussion_summary: summarizeTranscript(payload.transcript),
          updated_at: new Date().toISOString(),
        })
        .eq('id', assessmentId)
    }

    return NextResponse.json({
      status: 'success',
      message: 'Assessment discussion logged',
      decision: data.decision,
    })
  } catch (error) {
    console.error('Assessment discussion webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function summarizeTranscript(transcript: ElevenLabsWebhookPayload['transcript']): string {
  // Extract key user questions
  const userMessages = transcript
    .filter(t => t.role === 'user')
    .map(t => t.message)
    .slice(-10) // Last 10 user messages
  
  return userMessages.join(' | ')
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
