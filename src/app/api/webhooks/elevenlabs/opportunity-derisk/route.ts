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

    console.log('Opportunity de-risk webhook received:', payload.conversation_id)

    const extractedData = payload.extracted_data
    
    if (!extractedData || extractedData.type !== 'opportunity_derisk') {
      await logTranscript(supabase, payload, 'opportunity_derisk')
      return NextResponse.json({ status: 'transcript_logged' })
    }

    const { data } = extractedData
    const opportunityId = payload.metadata?.opportunity_id
    const companyId = payload.metadata?.company_id
    const userId = payload.metadata?.user_id

    if (!opportunityId) {
      return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 })
    }

    // Get company settings to look up point values
    let companySettings = null
    if (companyId) {
      const { data: settings } = await supabase
        .from('company_settings')
        .select('derisk_factors, risk_factors')
        .eq('company_id', companyId)
        .single()
      companySettings = settings
    }

    // Map applied de-risk factors to boolean fields and calculate points
    const deRiskUpdates: Record<string, boolean> = {}
    const appliedDeRiskDetails: any[] = data.applied_derisk || []
    let totalDeRiskPoints = 0

    // Standard de-risk factor mappings
    const deRiskFieldMap: Record<string, string> = {
      'presales': 'has_presales',
      'pre-sales': 'has_presales',
      'da_approved': 'has_da_approval',
      'da approved': 'has_da_approval',
      'fixed_price_contract': 'has_fixed_price_contract',
      'fixed price': 'has_fixed_price_contract',
      'site_owned': 'site_owned',
      'site ownership': 'site_owned',
      'experienced_builder': 'has_builder_appointed',
      'builder': 'has_builder_appointed',
      'finance_approved': 'has_finance_preapproval',
      'finance': 'has_finance_preapproval',
      'infrastructure': 'infrastructure_available',
      'market_demand': 'strong_market_demand',
    }

    for (const factor of appliedDeRiskDetails) {
      const factorKey = factor.factor?.toLowerCase() || ''
      for (const [pattern, field] of Object.entries(deRiskFieldMap)) {
        if (factorKey.includes(pattern)) {
          deRiskUpdates[field] = true
          
          // Look up points from company settings
          const settingsFactor = companySettings?.derisk_factors?.find(
            (f: any) => f.name.toLowerCase().includes(pattern)
          )
          totalDeRiskPoints += settingsFactor?.points || 5 // Default 5 points
          break
        }
      }
    }

    // Map applied risk factors
    const riskUpdates: Record<string, boolean> = {}
    const appliedRiskDetails: any[] = data.applied_risks || []
    let totalRiskPoints = 0

    const riskFieldMap: Record<string, string> = {
      'contamination': 'has_contamination_risk',
      'flood': 'has_flood_risk',
      'heritage': 'has_heritage_overlay',
      'complex_title': 'has_complex_titles',
      'market': 'has_market_concerns',
      'council': 'has_council_issues',
      'access': 'has_access_issues',
      'environmental': 'has_environmental_constraints',
    }

    for (const risk of appliedRiskDetails) {
      const riskKey = risk.factor?.toLowerCase() || ''
      for (const [pattern, field] of Object.entries(riskFieldMap)) {
        if (riskKey.includes(pattern)) {
          riskUpdates[field] = true
          
          // Look up points from company settings
          const settingsRisk = companySettings?.risk_factors?.find(
            (f: any) => f.name.toLowerCase().includes(pattern)
          )
          totalRiskPoints += Math.abs(settingsRisk?.points || -10) // Default -10 points
          break
        }
      }
    }

    // Update opportunity with de-risk flags
    const { error: updateError } = await supabase
      .from('opportunities')
      .update({
        ...deRiskUpdates,
        ...riskUpdates,
        applied_derisk_factors: appliedDeRiskDetails,
        applied_risk_factors: appliedRiskDetails,
        derisk_score: totalDeRiskPoints,
        risk_score: -totalRiskPoints,
        status: 'submitted', // Ready for assessment
        updated_at: new Date().toISOString(),
      })
      .eq('id', opportunityId)

    if (updateError) {
      console.error('Update opportunity error:', updateError)
      return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 })
    }

    // Log transcript
    await logTranscript(supabase, payload, 'opportunity_derisk', companyId, userId, opportunityId)

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
          section: 'derisk_factors',
          conversation_id: payload.conversation_id,
          derisk_count: appliedDeRiskDetails.length,
          risk_count: appliedRiskDetails.length,
          derisk_points: totalDeRiskPoints,
          risk_points: -totalRiskPoints,
        },
      })
    }

    return NextResponse.json({
      status: 'success',
      message: 'De-risk factors updated',
      summary: {
        derisk_factors_applied: appliedDeRiskDetails.length,
        risk_factors_identified: appliedRiskDetails.length,
        derisk_points: totalDeRiskPoints,
        risk_penalty: -totalRiskPoints,
      },
      next_step: {
        action: 'run_assessment',
        opportunity_id: opportunityId,
      },
    })
  } catch (error) {
    console.error('Opportunity de-risk webhook error:', error)
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
