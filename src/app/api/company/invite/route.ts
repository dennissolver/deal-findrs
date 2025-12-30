import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

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

// Generate a secure invite code
function generateInviteCode(): string {
  return crypto.randomBytes(16).toString('hex')
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { email, role = 'deal_finder', companyId } = await request.json()
    
    // Get current user (in production, from auth)
    const userId = request.headers.get('x-user-id') || 'demo-user-id'
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['admin', 'promoter', 'deal_finder', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Get user's company if not provided
    let targetCompanyId = companyId
    if (!targetCompanyId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('id', userId)
        .single()
      
      targetCompanyId = profile?.company_id
    }

    if (!targetCompanyId) {
      return NextResponse.json(
        { error: 'No company found' },
        { status: 400 }
      )
    }

    // Check if user has permission to invite
    const { data: membership } = await supabaseAdmin
      .from('company_memberships')
      .select('can_invite_users, role')
      .eq('user_id', userId)
      .eq('company_id', targetCompanyId)
      .single()

    if (!membership?.can_invite_users && membership?.role !== 'owner' && membership?.role !== 'admin') {
      return NextResponse.json(
        { error: 'You do not have permission to invite users' },
        { status: 403 }
      )
    }

    // Check if email is already in the company
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('company_id', targetCompanyId)
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'This user is already a member of your organisation' },
        { status: 400 }
      )
    }

    // Revoke any existing pending invites for this email
    await supabaseAdmin
      .from('company_invites')
      .update({ status: 'revoked' })
      .eq('company_id', targetCompanyId)
      .eq('email', email)
      .eq('status', 'pending')

    // Create new invite
    const inviteCode = generateInviteCode()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('company_invites')
      .insert({
        company_id: targetCompanyId,
        email,
        role,
        invite_code: inviteCode,
        invited_by: userId,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invite:', inviteError)
      return NextResponse.json(
        { error: 'Failed to create invite' },
        { status: 500 }
      )
    }

    // Get company name for the invite link
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('name')
      .eq('id', targetCompanyId)
      .single()

    // Log activity
    await supabaseAdmin
      .from('activity_log')
      .insert({
        company_id: targetCompanyId,
        user_id: userId,
        action: 'invited',
        entity_type: 'invite',
        entity_id: invite.id,
        details: { email, role },
      })

    // In production, send email here with invite link
    // For now, return the invite code
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding?code=${inviteCode}`

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email,
        role,
        inviteCode,
        inviteUrl,
        expiresAt: expiresAt.toISOString(),
        companyName: company?.name,
      },
    })
  } catch (error) {
    console.error('Error creating invite:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: List pending invites
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const userId = request.headers.get('x-user-id') || 'demo-user-id'

    // Get user's company
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ invites: [] })
    }

    // Get pending invites
    const { data: invites, error } = await supabaseAdmin
      .from('company_invites')
      .select(`
        id,
        email,
        role,
        status,
        invite_code,
        created_at,
        expires_at,
        invited_by,
        inviter:profiles!invited_by(first_name, last_name)
      `)
      .eq('company_id', profile.company_id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invites:', error)
      return NextResponse.json({ invites: [] })
    }

    return NextResponse.json({ invites })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Revoke an invite
export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('id')
    const userId = request.headers.get('x-user-id') || 'demo-user-id'

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invite ID required' },
        { status: 400 }
      )
    }

    // Get user's company
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .single()

    // Revoke the invite
    const { error } = await supabaseAdmin
      .from('company_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId)
      .eq('company_id', profile?.company_id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to revoke invite' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}