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

    console.log('Opportunity financial webhook received:', payload.conversation_id)

    const extractedData = payload.extracted_data
    
    if (!extractedData || extractedData.type !== 'opportunity_financial') {
      await logTranscript(supabase, payload, 'opportunity_financial')
      return NextResponse.json({ status: 'transcript_logged' })
    }

    const { data } = extractedData
    const opportunityId = payload.metadata?.opportunity_id
    const companyId = payload.metadata?.company_id
    const userId = payload.metadata?.user_id

    if (!opportunityId) {
      return NextResponse.json({ error: 'opportunity_id required' }, { status: 400 })
    }

    // Calculate totals if not provided
    const totalCosts = data.total_costs || calculateTotalCosts(data)
    const totalRevenue = data.total_revenue
    const grossMargin = totalRevenue - totalCosts
    const grossMarginPercent = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0

    // Update opportunity with financial data
    const { error: updateError } = await supabase
      .from('opportunities')
      .update({
        // Acquisition costs
        land_price: data.land_price,
        stamp_duty: data.stamp_duty,
        legal_fees: data.legal_fees,
        due_diligence_costs: data.due_diligence_costs,
        
        // Development costs
        da_costs: data.da_costs,
        civil_works: data.civil_works,
        construction_cost: data.construction_total,
        professional_fees: data.professional_fees,
        marketing_costs: data.marketing,
        finance_costs: data.finance_costs,
        contingency: data.contingency,
        
        // Revenue
        total_sale_price: data.total_revenue,
        expected_revenue: data.total_revenue,
        presales_count: data.presales_count,
        presales_value: data.presales_value,
        
        // Calculated fields
        total_costs: totalCosts,
        gross_margin: grossMargin,
        gross_margin_percent: grossMarginPercent,
        
        // Timeline
        project_duration_months: data.project_months,
        
        updated_at: new Date().toISOString(),
      })
      .eq('id', opportunityId)

    if (updateError) {
      console.error('Update opportunity error:', updateError)
      return NextResponse.json({ error: 'Failed to update opportunity' }, { status: 500 })
    }

    // Also create/update opportunity_financials record for detailed breakdown
    await supabase
      .from('opportunity_financials')
      .upsert({
        opportunity_id: opportunityId,
        land_purchase_price: data.land_price,
        stamp_duty: data.stamp_duty,
        legal_fees: data.legal_fees,
        da_approval_costs: data.da_costs,
        civil_works: data.civil_works,
        construction_cost_total: data.construction_total,
        professional_fees: data.professional_fees,
        marketing_budget: data.marketing,
        interest_costs: data.finance_costs,
        contingency_percent: data.contingency ? (data.contingency / totalCosts) * 100 : 5,
        contingency_amount: data.contingency,
        total_project_cost: totalCosts,
        total_revenue: totalRevenue,
        gross_margin: grossMargin,
        gross_margin_percent: grossMarginPercent,
        presales_count: data.presales_count,
        presales_value: data.presales_value,
        presales_percentage: data.presales_count && data.total_units 
          ? (data.presales_count / data.total_units) * 100 
          : undefined,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'opportunity_id' })

    // Log transcript
    await logTranscript(supabase, payload, 'opportunity_financial', companyId, userId, opportunityId)

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
          section: 'financials',
          conversation_id: payload.conversation_id,
          total_costs: totalCosts,
          total_revenue: totalRevenue,
          gross_margin_percent: grossMarginPercent.toFixed(1),
        },
      })
    }

    return NextResponse.json({
      status: 'success',
      message: 'Financial details updated',
      financials: {
        total_costs: totalCosts,
        total_revenue: totalRevenue,
        gross_margin: grossMargin,
        gross_margin_percent: grossMarginPercent.toFixed(1),
      },
      next_step: {
        agent: 'opportunity_derisk',
        metadata: {
          opportunity_id: opportunityId,
          company_id: companyId,
          user_id: userId,
        },
      },
    })
  } catch (error) {
    console.error('Opportunity financial webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateTotalCosts(data: any): number {
  return (
    (data.land_price || 0) +
    (data.stamp_duty || 0) +
    (data.legal_fees || 0) +
    (data.due_diligence_costs || 0) +
    (data.da_costs || 0) +
    (data.civil_works || 0) +
    (data.construction_total || 0) +
    (data.professional_fees || 0) +
    (data.marketing || 0) +
    (data.finance_costs || 0) +
    (data.contingency || 0)
  )
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
