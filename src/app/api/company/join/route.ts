import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy initialize Supabase client
let _supabaseAdmin: SupabaseClient | null = null

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!url || !key) {
      throw new Error('Supabase credentials not configured')
    }
    
    _supabaseAdmin = createClient(url, key)
  }
  return _supabaseAdmin
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { inviteCode } = await request.json()
    
    // Get user ID (in production, from auth)
    const userId = request.headers.get('x-user-id') || 'demo-user-id'
    const userEmail = request.headers.get('x-user-email') || ''
    
    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    // Find the invite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('company_invites')
      .select(`
        *,
        company:companies(id, name, slug)
      `)
      .eq('invite_code', inviteCode.trim())
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite code' },
        { status: 400 }
      )
    }

    // Verify email matches (optional security check)
    if (invite.email && invite.email !== userEmail) {
      return NextResponse.json(
        { error: 'This invite was sent to a different email address' },
        { status: 403 }
      )
    }

    // Update invite status
    const { error: updateInviteError } = await supabaseAdmin
      .from('company_invites')
      .update({
        status: 'accepted',
        accepted_by: userId,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id)

    if (updateInviteError) {
      console.error('Error updating invite:', updateInviteError)
    }

    // Update user profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        company_id: invite.company_id,
        role: invite.role,
        invited_by: invite.invited_by,
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Create membership
    const { error: membershipError } = await supabaseAdmin
      .from('company_memberships')
      .upsert({
        user_id: userId,
        company_id: invite.company_id,
        role: invite.role,
        is_primary: true,
        invited_by: invite.invited_by,
        can_invite_users: invite.role === 'admin',
        can_manage_settings: invite.role === 'admin',
        can_delete_opportunities: invite.role === 'admin',
      })

    if (membershipError) {
      console.error('Error creating membership:', membershipError)
    }

    // Log activity
    await supabaseAdmin
      .from('activity_log')
      .insert({
        company_id: invite.company_id,
        user_id: userId,
        action: 'joined',
        entity_type: 'user',
        entity_id: userId,
        details: { 
          role: invite.role,
          invited_by: invite.invited_by,
        },
      })

    return NextResponse.json({
      success: true,
      company: invite.company,
      role: invite.role,
    })
  } catch (error) {
    console.error('Error joining company:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}