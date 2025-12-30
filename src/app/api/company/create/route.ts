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
    const { name, abn } = await request.json()
    
    // Get user from auth header (in production, use Supabase auth)
    // For now, we'll get user from the request or session
    const authHeader = request.headers.get('authorization')
    
    // In production, validate the JWT and get user ID
    // For demo, we'll use a placeholder
    const userId = request.headers.get('x-user-id') || 'demo-user-id'
    
    if (!name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      )
    }

    // Generate slug from company name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + 
      '-' + 
      Math.random().toString(36).substring(2, 10)

    // Create company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name,
        slug,
        abn: abn || null,
      })
      .select()
      .single()

    if (companyError) {
      console.error('Company creation error:', companyError)
      return NextResponse.json(
        { error: 'Failed to create company' },
        { status: 500 }
      )
    }

    // Create default company settings
    const { error: settingsError } = await supabaseAdmin
      .from('company_settings')
      .insert({
        company_id: company.id,
        min_gm_green: 25,
        min_gm_amber: 18,
        derisk_factors: [
          { key: 'da_approved', label: 'DA Approved', points: 15, enabled: true },
          { key: 'vendor_finance', label: 'Vendor Finance Available', points: 10, enabled: true },
          { key: 'fixed_price_construction', label: 'Fixed-Price Construction', points: 10, enabled: true },
          { key: 'pre_sales_secured', label: 'Pre-Sales 50%+ Secured', points: 10, enabled: true },
          { key: 'experienced_pm', label: 'Experienced PM Available', points: 5, enabled: true },
          { key: 'clear_title', label: 'Clear Title', points: 5, enabled: true },
          { key: 'growth_corridor', label: 'Growth Corridor Location', points: 5, enabled: true },
        ],
        risk_factors: [
          { key: 'previous_disputes', label: 'Previous Legal Disputes', points: -5, enabled: true },
          { key: 'needs_rezoning', label: 'Requires Rezoning', points: -10, enabled: true },
          { key: 'no_pre_sales', label: 'No Pre-Sales Strategy', points: -5, enabled: true },
          { key: 'environmental_issues', label: 'Environmental Concerns', points: -10, enabled: true },
          { key: 'heritage_overlay', label: 'Heritage Overlay', points: -5, enabled: true },
        ],
      })

    if (settingsError) {
      console.error('Settings creation error:', settingsError)
      // Don't fail - company was created
    }

    // Update user profile with company
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        company_id: company.id,
        role: 'admin',
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Profile update error:', profileError)
    }

    // Create company membership
    const { error: membershipError } = await supabaseAdmin
      .from('company_memberships')
      .insert({
        user_id: userId,
        company_id: company.id,
        role: 'owner',
        is_primary: true,
        can_invite_users: true,
        can_manage_settings: true,
        can_delete_opportunities: true,
      })

    if (membershipError) {
      console.error('Membership creation error:', membershipError)
    }

    // Log activity
    await supabaseAdmin
      .from('activity_log')
      .insert({
        company_id: company.id,
        user_id: userId,
        action: 'created',
        entity_type: 'company',
        entity_id: company.id,
        details: { company_name: name },
      })

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
      },
    })
  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to create a company',
    required: ['name'],
    optional: ['abn'],
  })
}