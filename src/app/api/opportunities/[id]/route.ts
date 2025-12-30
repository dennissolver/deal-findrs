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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin()
    const { status, note, userId } = await request.json()
    const opportunityId = params.id

    // Validate status
    const validStatuses = ['draft', 'submitted', 'assessing', 'assessed', 'proceed', 'pending', 'approved', 'rejected', 'archived']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Update opportunity status
    const { data: opportunity, error: updateError } = await supabase
      .from('opportunities')
      .update({
        status,
        notes: note ? `${status.toUpperCase()}: ${note}` : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', opportunityId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_log').insert({
      company_id: opportunity.company_id,
      user_id: userId,
      action: 'status_changed',
      entity_type: 'opportunity',
      entity_id: opportunityId,
      details: { 
        new_status: status, 
        note,
        previous_status: opportunity.status 
      },
    })

    // Create notification for team (if proceeding or archived)
    if (status === 'proceed' || status === 'archived') {
      // In production, notify relevant team members
    }

    // If pending, schedule reminder
    if (status === 'pending') {
      // In production, create a scheduled reminder notification
    }

    return NextResponse.json({
      success: true,
      opportunity: {
        id: opportunity.id,
        status: opportunity.status,
        name: opportunity.name,
      },
    })
  } catch (error) {
    console.error('Error updating opportunity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin()
    const opportunityId = params.id

    const { data: opportunity, error } = await supabase
      .from('opportunities')
      .select(`
        *,
        assessments (
          id,
          status,
          score,
          summary,
          path_to_green,
          recommendations,
          created_at
        ),
        documents (
          id,
          file_name,
          category,
          is_verified,
          uploaded_at
        )
      `)
      .eq('id', opportunityId)
      .single()

    if (error || !opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    return NextResponse.json({ opportunity })
  } catch (error) {
    console.error('Error fetching opportunity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
