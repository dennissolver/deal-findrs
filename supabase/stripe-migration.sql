-- Add Stripe subscription fields to companies table
-- Run this after schema-v2.sql and multi-tenant.sql

-- Add Stripe fields to companies
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'cancelled', 'unpaid')),
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'standard', 'premium')),
ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days');

-- Create index for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer ON companies(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_subscription ON companies(stripe_subscription_id);

-- Create subscriptions history table for audit trail
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT,
  stripe_event_id TEXT,
  event_type TEXT NOT NULL,
  from_tier TEXT,
  to_tier TEXT,
  from_status TEXT,
  to_status TEXT,
  amount_paid INTEGER,
  currency TEXT DEFAULT 'aud',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_company ON subscription_history(company_id);

-- RLS for subscription_history
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company subscription history"
ON subscription_history FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM company_memberships WHERE user_id = auth.uid()
  )
);

-- Function to check if company has active subscription
CREATE OR REPLACE FUNCTION check_subscription_access(p_company_id UUID, p_feature TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_status TEXT;
  v_trial_ends TIMESTAMPTZ;
BEGIN
  SELECT subscription_tier, subscription_status, trial_ends_at
  INTO v_tier, v_status, v_trial_ends
  FROM companies WHERE id = p_company_id;

  -- Check if in trial period
  IF v_status = 'trialing' AND v_trial_ends > NOW() THEN
    RETURN TRUE;
  END IF;

  -- Check if active subscription
  IF v_status = 'active' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get company limits based on tier
CREATE OR REPLACE FUNCTION get_company_limits(p_company_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_tier TEXT;
BEGIN
  SELECT subscription_tier INTO v_tier FROM companies WHERE id = p_company_id;

  CASE v_tier
    WHEN 'premium' THEN
      RETURN '{"opportunities": -1, "users": -1, "voice_minutes": -1, "im_generation": true}'::JSONB;
    WHEN 'standard' THEN
      RETURN '{"opportunities": 50, "users": 5, "voice_minutes": 100, "im_generation": true}'::JSONB;
    ELSE
      RETURN '{"opportunities": 5, "users": 1, "voice_minutes": 10, "im_generation": false}'::JSONB;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check opportunity limit
CREATE OR REPLACE FUNCTION check_opportunity_limit(p_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_limits JSONB;
  v_count INTEGER;
  v_limit INTEGER;
BEGIN
  v_limits := get_company_limits(p_company_id);
  v_limit := (v_limits->>'opportunities')::INTEGER;

  -- -1 means unlimited
  IF v_limit = -1 THEN
    RETURN TRUE;
  END IF;

  -- Count opportunities created this month
  SELECT COUNT(*) INTO v_count
  FROM opportunities
  WHERE company_id = p_company_id
    AND created_at >= date_trunc('month', NOW());

  RETURN v_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to enforce opportunity limits
CREATE OR REPLACE FUNCTION enforce_opportunity_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT check_opportunity_limit(NEW.company_id) THEN
    RAISE EXCEPTION 'Opportunity limit reached. Please upgrade your plan.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_opportunity_limit_trigger ON opportunities;
CREATE TRIGGER check_opportunity_limit_trigger
  BEFORE INSERT ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION enforce_opportunity_limit();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_subscription_access TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_limits TO authenticated;
GRANT EXECUTE ON FUNCTION check_opportunity_limit TO authenticated;
