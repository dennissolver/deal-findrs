-- DealFindrs Schema Migration v2
-- Upgrades existing schema to support:
-- 1. Voice agent data capture (all fields from voice extraction)
-- 2. Document upload with RAG knowledge base
-- 3. De-risk and Risk factors tracking
-- 4. Enhanced assessment history
--
-- Run this AFTER your initial schema.sql in Supabase SQL Editor

-- ============================================
-- ENABLE VECTOR EXTENSION FOR RAG
-- ============================================
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- ENHANCE COMPANIES TABLE
-- ============================================
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS abn TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS postcode TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;

-- ============================================
-- ENHANCE PROFILES TABLE
-- ============================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb;

-- ============================================
-- ENHANCE COMPANY_SETTINGS TABLE
-- ============================================
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS min_score_green INTEGER DEFAULT 80,
ADD COLUMN IF NOT EXISTS min_score_amber INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS critical_criteria JSONB DEFAULT '[
  {"key": "proof_of_ownership", "label": "Proof of Ownership Required", "enabled": true},
  {"key": "no_legal_disputes", "label": "No Active Legal Disputes", "enabled": true},
  {"key": "no_contamination", "label": "No Environmental Contamination", "enabled": true},
  {"key": "zoning_compatible", "label": "Zoning Compatible with Use", "enabled": true}
]'::jsonb,
ADD COLUMN IF NOT EXISTS required_documents JSONB DEFAULT '[
  {"key": "title_deed", "label": "Certificate of Title", "required": true},
  {"key": "da_submission", "label": "DA Submission", "required": false},
  {"key": "da_approval", "label": "DA Approval Notice", "required": false},
  {"key": "site_survey", "label": "Site Survey / Plan", "required": true},
  {"key": "drawings", "label": "Architectural Drawings", "required": false}
]'::jsonb;

-- Update default derisk_factors if empty
UPDATE company_settings 
SET derisk_factors = '[
  {"key": "da_approved", "label": "DA Approved", "points": 15, "enabled": true},
  {"key": "vendor_finance", "label": "Vendor Finance Available", "points": 10, "enabled": true},
  {"key": "fixed_price_construction", "label": "Fixed-Price Construction", "points": 10, "enabled": true},
  {"key": "pre_sales_secured", "label": "Pre-Sales 50%+ Secured", "points": 10, "enabled": true},
  {"key": "experienced_pm", "label": "Experienced PM Available", "points": 5, "enabled": true},
  {"key": "clear_title", "label": "Clear Title", "points": 5, "enabled": true},
  {"key": "growth_corridor", "label": "Growth Corridor Location", "points": 5, "enabled": true}
]'::jsonb
WHERE derisk_factors = '[]'::jsonb OR derisk_factors IS NULL;

-- Update default risk_factors if empty
UPDATE company_settings 
SET risk_factors = '[
  {"key": "previous_disputes", "label": "Previous Legal Disputes", "points": -5, "enabled": true},
  {"key": "needs_rezoning", "label": "Requires Rezoning", "points": -10, "enabled": true},
  {"key": "no_pre_sales", "label": "No Pre-Sales Strategy", "points": -5, "enabled": true},
  {"key": "environmental_issues", "label": "Environmental Concerns", "points": -10, "enabled": true},
  {"key": "heritage_overlay", "label": "Heritage Overlay", "points": -5, "enabled": true}
]'::jsonb
WHERE risk_factors = '[]'::jsonb OR risk_factors IS NULL;

-- ============================================
-- ENHANCE OPPORTUNITIES TABLE
-- Add all voice-captured fields
-- ============================================

-- Location fields
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS postcode TEXT;

-- Landowner details (enhanced from voice capture)
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS landowner_phone TEXT,
ADD COLUMN IF NOT EXISTS landowner_email TEXT,
ADD COLUMN IF NOT EXISTS landowner_company TEXT,
ADD COLUMN IF NOT EXISTS landowner_notes TEXT,
ADD COLUMN IF NOT EXISTS source_contact TEXT,
ADD COLUMN IF NOT EXISTS source_notes TEXT;

-- Property details (enhanced)
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS property_size NUMERIC,
ADD COLUMN IF NOT EXISTS property_size_unit TEXT DEFAULT 'sqm',
ADD COLUMN IF NOT EXISTS proposed_zoning TEXT,
ADD COLUMN IF NOT EXISTS dwelling_types JSONB,
ADD COLUMN IF NOT EXISTS site_features TEXT,
ADD COLUMN IF NOT EXISTS site_constraints TEXT;

-- Update land_stage constraint to include new values
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_land_stage_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_land_stage_check 
  CHECK (land_stage IN ('raw_land', 'da_lodged', 'da_approved', 'needs_rezoning', 'construction_ready', 'partial_development', 'redevelopment', 'other'));

-- DE-RISK FACTORS (individual boolean fields for easy querying)
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS derisk_da_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS derisk_vendor_finance BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS derisk_vendor_finance_terms TEXT,
ADD COLUMN IF NOT EXISTS derisk_fixed_price_construction BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS derisk_construction_partner TEXT,
ADD COLUMN IF NOT EXISTS derisk_pre_sales_percent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS derisk_pre_sales_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS derisk_experienced_pm BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS derisk_pm_name TEXT,
ADD COLUMN IF NOT EXISTS derisk_clear_title BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS derisk_growth_corridor BOOLEAN DEFAULT FALSE;

-- RISK FACTORS (individual boolean fields)
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS risk_previous_disputes BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS risk_dispute_details TEXT,
ADD COLUMN IF NOT EXISTS risk_environmental_issues BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS risk_environmental_details TEXT,
ADD COLUMN IF NOT EXISTS risk_heritage_overlay BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS risk_heritage_details TEXT,
ADD COLUMN IF NOT EXISTS risk_other TEXT;

-- Financial fields (enhanced)
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS land_purchase_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS infrastructure_costs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS construction_per_unit NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_construction_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS contingency_percent NUMERIC DEFAULT 5,
ADD COLUMN IF NOT EXISTS contingency_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_sale_price NUMERIC DEFAULT 0;

-- Score breakdown
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS gm_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS derisk_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS risk_deductions NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS path_to_green JSONB,
ADD COLUMN IF NOT EXISTS assessed_by UUID REFERENCES profiles(id);

-- Metadata
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Update status constraint
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_status_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_status_check 
  CHECK (status IN ('draft', 'submitted', 'assessing', 'assessed', 'approved', 'rejected', 'archived'));

-- ============================================
-- ENHANCE OPPORTUNITY_FINANCIALS TABLE
-- ============================================
ALTER TABLE opportunity_financials
ADD COLUMN IF NOT EXISTS land_deposit_percent NUMERIC DEFAULT 10,
ADD COLUMN IF NOT EXISTS land_agents_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS feasibility_study NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS geotechnical NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS environmental_assessment NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS town_planning NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS da_application_fees NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS architectural_design NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS engineering_design NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS demolition NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS site_clearing NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS earthworks NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS road_construction NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS stormwater NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sewer_connection NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS water_connection NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS electrical_connection NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS gas_connection NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS telecommunications NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS landscaping_civil NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS construction_units INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS construction_contingency_percent NUMERIC DEFAULT 5,
ADD COLUMN IF NOT EXISTS finance_establishment NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS finance_interest_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS finance_interest_total NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS land_tax NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS council_rates NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS insurance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS utilities_holding NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS project_management NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS marketing_budget NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_commission_percent NUMERIC DEFAULT 2.5,
ADD COLUMN IF NOT EXISTS sales_commission_total NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS legal_settlement NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS gst_margin_scheme BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS min_sale_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_sale_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_units INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS gross_revenue NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_costs NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS gross_profit NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS gross_margin_percent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS roi_percent NUMERIC DEFAULT 0;

-- ============================================
-- DOCUMENT CATEGORIES (using TEXT with CHECK, not ENUM for flexibility)
-- ============================================
-- Note: If you get an enum error, run fix-enum.sql FIRST

-- ============================================
-- ENHANCE DOCUMENTS TABLE FOR RAG
-- ============================================

-- Add new columns for RAG processing
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS file_extension TEXT,
ADD COLUMN IF NOT EXISTS public_url TEXT,
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS extracted_text TEXT,
ADD COLUMN IF NOT EXISTS text_chunks JSONB,
ADD COLUMN IF NOT EXISTS embedding_ids TEXT[],
ADD COLUMN IF NOT EXISTS page_count INTEGER,
ADD COLUMN IF NOT EXISTS document_date DATE,
ADD COLUMN IF NOT EXISTS issuing_authority TEXT,
ADD COLUMN IF NOT EXISTS reference_number TEXT,
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_notes TEXT,
ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT NOW();

-- Update constraint (drop first to make idempotent)
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check;
ALTER TABLE documents ADD CONSTRAINT documents_category_check 
  CHECK (category IN (
    'title_deed', 'contract_of_sale', 'vendor_statement', 'legal_advice',
    'da_submission', 'da_approval', 'da', 'planning_permit', 'rezoning_application', 'council_correspondence',
    'site_survey', 'survey', 'boundary_plan', 'contour_survey', 'feature_survey',
    'concept_drawings', 'architectural_drawings', 'landscape_drawings', 'engineering_drawings', 'civil_drawings',
    'geotechnical_report', 'environmental_report', 'environmental', 'heritage_assessment', 
    'traffic_study', 'acoustic_report', 'bushfire_assessment', 'flood_study',
    'construction_quote', 'financial_model', 'financial', 'bank_valuation', 'sales_evidence', 'pre_sale_contracts',
    'photos', 'marketing_material', 'correspondence', 'other'
  ));

-- ============================================
-- CREATE DOCUMENT EMBEDDINGS TABLE FOR RAG
-- ============================================
CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  
  chunk_index INTEGER,
  chunk_text TEXT NOT NULL,
  embedding vector(1536),  -- OpenAI embedding dimension
  
  category TEXT,
  page_number INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for similarity search (if not exists)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON document_embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- ENHANCE ASSESSMENTS TABLE
-- ============================================
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS input_snapshot JSONB,
ADD COLUMN IF NOT EXISTS gm_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS applied_derisk_factors JSONB,
ADD COLUMN IF NOT EXISTS applied_risk_factors JSONB,
ADD COLUMN IF NOT EXISTS critical_failures JSONB,
ADD COLUMN IF NOT EXISTS document_insights JSONB,
ADD COLUMN IF NOT EXISTS market_analysis TEXT,
ADD COLUMN IF NOT EXISTS risk_analysis TEXT,
ADD COLUMN IF NOT EXISTS recommendations JSONB,
ADD COLUMN IF NOT EXISTS model_version TEXT;

-- ============================================
-- CREATE VOICE TRANSCRIPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS voice_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  
  context TEXT NOT NULL,  -- setup, opportunity_basics, opportunity_property, etc.
  step TEXT,
  
  user_message TEXT,
  assistant_message TEXT,
  extracted_fields JSONB,
  
  audio_url TEXT,
  duration_seconds INTEGER,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CREATE NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  type TEXT CHECK (type IN (
    'opportunity_submitted',
    'assessment_complete',
    'document_required',
    'status_changed',
    'comment_added',
    'system'
  )),
  
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY FOR NEW TABLES
-- ============================================
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Document embeddings: same as documents
CREATE POLICY "Users can view company document embeddings" ON document_embeddings FOR SELECT 
  USING (opportunity_id IN (
    SELECT id FROM opportunities WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Voice transcripts
CREATE POLICY "Users can view company voice transcripts" ON voice_transcripts FOR SELECT 
  USING (opportunity_id IN (
    SELECT id FROM opportunities WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can create voice transcripts" ON voice_transcripts FOR INSERT 
  WITH CHECK (opportunity_id IN (
    SELECT id FROM opportunities WHERE company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE 
  USING (user_id = auth.uid());

-- ============================================
-- HELPER FUNCTION: Calculate Opportunity Financials
-- ============================================
CREATE OR REPLACE FUNCTION calculate_opportunity_financials()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total construction
  NEW.total_construction_cost := NEW.construction_per_unit * COALESCE(NEW.num_dwellings, NEW.num_lots, 0);
  
  -- Calculate contingency
  NEW.contingency_amount := (NEW.land_purchase_price + NEW.infrastructure_costs + NEW.total_construction_cost) 
    * (NEW.contingency_percent / 100);
  
  -- Calculate total cost
  NEW.total_project_cost := NEW.land_purchase_price + NEW.infrastructure_costs 
    + NEW.total_construction_cost + NEW.contingency_amount;
  
  -- Calculate total revenue
  NEW.total_revenue := NEW.avg_sale_price * COALESCE(NEW.num_dwellings, NEW.num_lots, 0);
  
  -- Calculate margins
  NEW.gross_margin_dollars := NEW.total_revenue - NEW.total_project_cost;
  NEW.gross_margin_percent := CASE 
    WHEN NEW.total_revenue > 0 THEN (NEW.gross_margin_dollars / NEW.total_revenue) * 100
    ELSE 0
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS calculate_financials_before_save ON opportunities;
CREATE TRIGGER calculate_financials_before_save
  BEFORE INSERT OR UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION calculate_opportunity_financials();

-- ============================================
-- HELPER FUNCTION: RAG Document Search
-- ============================================
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  filter_opportunity_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_text TEXT,
  category TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.document_id,
    de.chunk_text,
    de.category,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM document_embeddings de
  WHERE (filter_opportunity_id IS NULL OR de.opportunity_id = filter_opportunity_id)
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ADDITIONAL INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_opportunities_created ON opportunities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_derisk ON opportunities(derisk_da_approved, derisk_vendor_finance);

CREATE INDEX IF NOT EXISTS idx_documents_processed ON documents(is_processed);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

CREATE INDEX IF NOT EXISTS idx_embeddings_opportunity ON document_embeddings(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_document ON document_embeddings(document_id);

CREATE INDEX IF NOT EXISTS idx_voice_opportunity ON voice_transcripts(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_voice_context ON voice_transcripts(context);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- ============================================
-- STORAGE BUCKET FOR DOCUMENTS
-- Run this in Supabase Dashboard > Storage
-- ============================================
-- CREATE BUCKET: opportunity-documents
-- Public: No
-- File size limit: 50MB
-- Allowed MIME types: application/pdf, image/*, application/msword, 
--   application/vnd.openxmlformats-officedocument.*, application/vnd.ms-*, text/*

COMMENT ON TABLE documents IS 'Documents uploaded for RAG knowledge base. Files stored in Supabase Storage bucket: opportunity-documents';
COMMENT ON TABLE document_embeddings IS 'Vector embeddings for RAG search. Uses pgvector with OpenAI ada-002 (1536 dimensions)';
COMMENT ON TABLE voice_transcripts IS 'Voice conversation history for audit and training';
