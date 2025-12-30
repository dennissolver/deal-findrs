-- DealFindrs Multi-Tenant Schema
-- Adds company management, invites, and admin functionality
-- Run AFTER schema-v2.sql or migration-v2.sql

-- ============================================
-- DROP IF EXISTS (safe re-run)
-- ============================================
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS company_memberships CASCADE;
DROP TABLE IF EXISTS company_invites CASCADE;

-- Drop functions if exist
DROP FUNCTION IF EXISTS create_company_with_owner CASCADE;
DROP FUNCTION IF EXISTS accept_company_invite CASCADE;
DROP FUNCTION IF EXISTS invite_user_to_company CASCADE;
DROP FUNCTION IF EXISTS get_user_company_context CASCADE;

-- ============================================
-- COMPANY INVITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS company_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Invite details
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'promoter', 'deal_finder', 'viewer')) DEFAULT 'deal_finder',
  invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')) DEFAULT 'pending',
  
  -- Tracking
  invited_by UUID REFERENCES profiles(id),
  accepted_by UUID REFERENCES profiles(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate pending invites
  UNIQUE(company_id, email, status)
);

-- ============================================
-- ENHANCE PROFILES TABLE
-- ============================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ============================================
-- COMPANY MEMBERSHIP TABLE (for multi-company support)
-- ============================================
CREATE TABLE IF NOT EXISTS company_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  role TEXT CHECK (role IN ('owner', 'admin', 'promoter', 'deal_finder', 'viewer')) DEFAULT 'deal_finder',
  is_primary BOOLEAN DEFAULT FALSE,  -- User's primary/default company
  
  -- Permissions (can override role defaults)
  can_create_opportunities BOOLEAN DEFAULT TRUE,
  can_edit_opportunities BOOLEAN DEFAULT TRUE,
  can_delete_opportunities BOOLEAN DEFAULT FALSE,
  can_run_assessments BOOLEAN DEFAULT TRUE,
  can_view_financials BOOLEAN DEFAULT TRUE,
  can_invite_users BOOLEAN DEFAULT FALSE,
  can_manage_settings BOOLEAN DEFAULT FALSE,
  
  invited_by UUID REFERENCES profiles(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, company_id)
);

-- ============================================
-- ACTIVITY LOG (for audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  action TEXT NOT NULL,  -- 'created', 'updated', 'deleted', 'assessed', 'invited', etc.
  entity_type TEXT NOT NULL,  -- 'opportunity', 'user', 'document', 'assessment', etc.
  entity_id UUID,
  
  details JSONB,  -- Additional context
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE company_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Company Invites: Admins can manage, users can view their own
CREATE POLICY "Admins can manage company invites" ON company_invites
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view invites sent to their email" ON company_invites
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Company Memberships
CREATE POLICY "Users can view own memberships" ON company_memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view company members" ON company_memberships
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage memberships" ON company_memberships
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM company_memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Activity Log
CREATE POLICY "Users can view company activity" ON activity_log
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid())
  );

CREATE POLICY "System can insert activity" ON activity_log
  FOR INSERT WITH CHECK (true);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create a new company with owner
CREATE OR REPLACE FUNCTION create_company_with_owner(
  p_company_name TEXT,
  p_user_id UUID,
  p_user_email TEXT DEFAULT NULL,
  p_user_first_name TEXT DEFAULT NULL,
  p_user_last_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_company_id UUID;
  v_slug TEXT;
BEGIN
  -- Generate slug from company name
  v_slug := lower(regexp_replace(p_company_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := v_slug || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
  
  -- Create company
  INSERT INTO companies (name, slug)
  VALUES (p_company_name, v_slug)
  RETURNING id INTO v_company_id;
  
  -- Create default company settings
  INSERT INTO company_settings (company_id)
  VALUES (v_company_id);
  
  -- Update user profile with company
  UPDATE profiles
  SET company_id = v_company_id,
      role = 'admin',
      email = COALESCE(p_user_email, email),
      first_name = COALESCE(p_user_first_name, first_name),
      last_name = COALESCE(p_user_last_name, last_name)
  WHERE id = p_user_id;
  
  -- Create membership record
  INSERT INTO company_memberships (user_id, company_id, role, is_primary, can_invite_users, can_manage_settings)
  VALUES (p_user_id, v_company_id, 'owner', true, true, true);
  
  -- Log activity
  INSERT INTO activity_log (company_id, user_id, action, entity_type, entity_id, details)
  VALUES (v_company_id, p_user_id, 'created', 'company', v_company_id, 
    jsonb_build_object('company_name', p_company_name));
  
  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept an invite
CREATE OR REPLACE FUNCTION accept_company_invite(
  p_invite_code TEXT,
  p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_invite RECORD;
  v_user_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
  
  -- Find valid invite
  SELECT * INTO v_invite FROM company_invites
  WHERE invite_code = p_invite_code
    AND status = 'pending'
    AND expires_at > NOW()
    AND email = v_user_email;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite');
  END IF;
  
  -- Update invite
  UPDATE company_invites
  SET status = 'accepted',
      accepted_by = p_user_id,
      accepted_at = NOW()
  WHERE id = v_invite.id;
  
  -- Update user profile
  UPDATE profiles
  SET company_id = v_invite.company_id,
      role = v_invite.role,
      invited_by = v_invite.invited_by
  WHERE id = p_user_id;
  
  -- Create membership
  INSERT INTO company_memberships (user_id, company_id, role, is_primary, invited_by)
  VALUES (p_user_id, v_invite.company_id, v_invite.role, true, v_invite.invited_by)
  ON CONFLICT (user_id, company_id) DO UPDATE
  SET role = v_invite.role;
  
  -- Log activity
  INSERT INTO activity_log (company_id, user_id, action, entity_type, entity_id, details)
  VALUES (v_invite.company_id, p_user_id, 'joined', 'user', p_user_id,
    jsonb_build_object('role', v_invite.role, 'invited_by', v_invite.invited_by));
  
  RETURN jsonb_build_object(
    'success', true,
    'company_id', v_invite.company_id,
    'role', v_invite.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invite a user
CREATE OR REPLACE FUNCTION invite_user_to_company(
  p_company_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_invited_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_invite_id UUID;
  v_invite_code TEXT;
  v_can_invite BOOLEAN;
BEGIN
  -- Check if inviter has permission
  SELECT can_invite_users INTO v_can_invite
  FROM company_memberships
  WHERE user_id = p_invited_by AND company_id = p_company_id;
  
  IF NOT v_can_invite THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to invite users');
  END IF;
  
  -- Check if user already in company
  IF EXISTS (
    SELECT 1 FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE u.email = p_email AND p.company_id = p_company_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is already a member of this company');
  END IF;
  
  -- Revoke any existing pending invites
  UPDATE company_invites
  SET status = 'revoked'
  WHERE company_id = p_company_id AND email = p_email AND status = 'pending';
  
  -- Create new invite
  INSERT INTO company_invites (company_id, email, role, invited_by)
  VALUES (p_company_id, p_email, p_role, p_invited_by)
  RETURNING id, invite_code INTO v_invite_id, v_invite_code;
  
  -- Log activity
  INSERT INTO activity_log (company_id, user_id, action, entity_type, entity_id, details)
  VALUES (p_company_id, p_invited_by, 'invited', 'invite', v_invite_id,
    jsonb_build_object('email', p_email, 'role', p_role));
  
  RETURN jsonb_build_object(
    'success', true,
    'invite_id', v_invite_id,
    'invite_code', v_invite_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current company context
CREATE OR REPLACE FUNCTION get_user_company_context(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'user', jsonb_build_object(
      'id', p.id,
      'email', p.email,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'role', p.role
    ),
    'company', jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'slug', c.slug
    ),
    'membership', jsonb_build_object(
      'role', cm.role,
      'can_invite_users', cm.can_invite_users,
      'can_manage_settings', cm.can_manage_settings,
      'can_delete_opportunities', cm.can_delete_opportunities
    ),
    'settings', jsonb_build_object(
      'min_gm_green', cs.min_gm_green,
      'min_gm_amber', cs.min_gm_amber,
      'derisk_factors', cs.derisk_factors,
      'risk_factors', cs.risk_factors
    )
  ) INTO v_result
  FROM profiles p
  JOIN companies c ON c.id = p.company_id
  LEFT JOIN company_memberships cm ON cm.user_id = p.id AND cm.company_id = c.id
  LEFT JOIN company_settings cs ON cs.company_id = c.id
  WHERE p.id = p_user_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_invites_code ON company_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_invites_email ON company_invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_company_status ON company_invites(company_id, status);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON company_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_company ON company_memberships(company_id);

CREATE INDEX IF NOT EXISTS idx_activity_company ON activity_log(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_log(created_at DESC);

-- ============================================
-- UPDATE EXISTING RLS POLICIES
-- Use company_memberships instead of just profiles.company_id
-- ============================================

-- Drop old policies and create new ones that use memberships
DROP POLICY IF EXISTS "Users can view company opportunities" ON opportunities;
CREATE POLICY "Users can view company opportunities" ON opportunities
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM company_memberships WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create opportunities" ON opportunities;
CREATE POLICY "Users can create opportunities" ON opportunities
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM company_memberships 
      WHERE user_id = auth.uid() AND can_create_opportunities = true
    )
  );

DROP POLICY IF EXISTS "Users can update company opportunities" ON opportunities;
CREATE POLICY "Users can update company opportunities" ON opportunities
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_memberships 
      WHERE user_id = auth.uid() AND can_edit_opportunities = true
    )
  );

DROP POLICY IF EXISTS "Admins can delete opportunities" ON opportunities;
CREATE POLICY "Admins can delete opportunities" ON opportunities
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM company_memberships 
      WHERE user_id = auth.uid() AND can_delete_opportunities = true
    )
  );

-- Company settings - only admins can update
DROP POLICY IF EXISTS "Admins can update company settings" ON company_settings;
CREATE POLICY "Admins can update company settings" ON company_settings
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM company_memberships 
      WHERE user_id = auth.uid() AND can_manage_settings = true
    )
  );
