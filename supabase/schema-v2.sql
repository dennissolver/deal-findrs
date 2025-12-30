-- DealFindrs Database Schema v2
-- Updated to capture all voice agent data and documents for RAG assessment
-- Run this in Supabase SQL Editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";  -- For RAG embeddings

-- ============================================
-- COMPANIES & USERS
-- ============================================

-- Companies (Promoter organizations)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  abn TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'Australia',
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  role TEXT CHECK (role IN ('admin', 'promoter', 'deal_finder', 'viewer')) DEFAULT 'deal_finder',
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  mobile TEXT,
  avatar_url TEXT,
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMPANY SETTINGS & CRITERIA
-- ============================================

-- Company Assessment Settings (Voice: Setup phase)
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Financial Thresholds (from voice setup)
  min_gm_green NUMERIC(5,2) DEFAULT 25.0,
  min_gm_amber NUMERIC(5,2) DEFAULT 18.0,
  min_score_green INTEGER DEFAULT 80,
  min_score_amber INTEGER DEFAULT 60,
  
  -- De-risk Factors with Points (from voice setup)
  derisk_factors JSONB DEFAULT '[
    {"key": "da_approved", "label": "DA Approved", "points": 15, "enabled": true},
    {"key": "vendor_finance", "label": "Vendor Finance Available", "points": 10, "enabled": true},
    {"key": "fixed_price_construction", "label": "Fixed-Price Construction", "points": 10, "enabled": true},
    {"key": "pre_sales_secured", "label": "Pre-Sales 50%+ Secured", "points": 10, "enabled": true},
    {"key": "experienced_pm", "label": "Experienced PM Available", "points": 5, "enabled": true},
    {"key": "clear_title", "label": "Clear Title", "points": 5, "enabled": true},
    {"key": "growth_corridor", "label": "Growth Corridor Location", "points": 5, "enabled": true}
  ]'::jsonb,
  
  -- Risk Factors with Penalties (from voice setup)
  risk_factors JSONB DEFAULT '[
    {"key": "previous_disputes", "label": "Previous Legal Disputes", "points": -5, "enabled": true},
    {"key": "needs_rezoning", "label": "Requires Rezoning", "points": -10, "enabled": true},
    {"key": "no_pre_sales", "label": "No Pre-Sales Strategy", "points": -5, "enabled": true},
    {"key": "environmental_issues", "label": "Environmental Concerns", "points": -10, "enabled": true},
    {"key": "heritage_overlay", "label": "Heritage Overlay", "points": -5, "enabled": true}
  ]'::jsonb,
  
  -- Critical Criteria (must pass or auto-RED)
  critical_criteria JSONB DEFAULT '[
    {"key": "proof_of_ownership", "label": "Proof of Ownership Required", "enabled": true},
    {"key": "no_legal_disputes", "label": "No Active Legal Disputes", "enabled": true},
    {"key": "no_contamination", "label": "No Environmental Contamination", "enabled": true},
    {"key": "zoning_compatible", "label": "Zoning Compatible with Use", "enabled": true},
    {"key": "financing_path", "label": "Clear Financing Path", "enabled": false}
  ]'::jsonb,
  
  -- Required Documents for Assessment
  required_documents JSONB DEFAULT '[
    {"key": "title_deed", "label": "Certificate of Title", "required": true},
    {"key": "da_submission", "label": "DA Submission", "required": false},
    {"key": "da_approval", "label": "DA Approval Notice", "required": false},
    {"key": "site_survey", "label": "Site Survey / Plan", "required": true},
    {"key": "drawings", "label": "Architectural Drawings", "required": false},
    {"key": "engineering", "label": "Engineering Reports", "required": false},
    {"key": "environmental", "label": "Environmental Assessment", "required": false},
    {"key": "construction_quote", "label": "Construction Quotes", "required": false},
    {"key": "financial_model", "label": "Financial Model/Projections", "required": false}
  ]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- OPPORTUNITIES
-- ============================================

-- Main Opportunities Table
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  
  -- ========== BASICS (Voice: opportunity_basics) ==========
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT CHECK (state IN ('NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT')),
  postcode TEXT,
  country TEXT DEFAULT 'Australia',
  
  -- Landowner Details
  landowner_name TEXT,
  landowner_phone TEXT,
  landowner_email TEXT,
  landowner_company TEXT,
  landowner_notes TEXT,
  
  -- Source
  source TEXT,  -- How deal was found: realestate.com.au, referral, direct, etc.
  source_contact TEXT,  -- Agent/referrer name
  source_notes TEXT,
  
  -- ========== PROPERTY (Voice: opportunity_property) ==========
  property_size NUMERIC,
  property_size_unit TEXT CHECK (property_size_unit IN ('sqm', 'acres', 'hectares', 'sqft')) DEFAULT 'sqm',
  
  land_stage TEXT CHECK (land_stage IN (
    'raw_land',           -- Undeveloped
    'da_lodged',          -- DA submitted, awaiting approval
    'da_approved',        -- DA approved
    'needs_rezoning',     -- Requires rezoning first
    'construction_ready', -- Ready to build
    'partial_development',-- Some development exists
    'redevelopment'       -- Existing structures to demolish
  )),
  
  current_zoning TEXT,        -- R1, R2, B4, etc.
  proposed_zoning TEXT,       -- If rezoning required
  
  num_lots INTEGER,           -- Planned lot count
  num_dwellings INTEGER,      -- Planned dwelling count
  dwelling_types JSONB,       -- {"houses": 20, "townhouses": 10, "apartments": 7}
  
  existing_structures TEXT,   -- Description of what's on site
  site_features TEXT,         -- Slope, trees, creek, etc.
  site_constraints TEXT,      -- Easements, setbacks, etc.
  
  -- ========== DE-RISK FACTORS (Voice: captured during property/financial) ==========
  derisk_da_approved BOOLEAN DEFAULT FALSE,
  derisk_vendor_finance BOOLEAN DEFAULT FALSE,
  derisk_vendor_finance_terms TEXT,
  derisk_fixed_price_construction BOOLEAN DEFAULT FALSE,
  derisk_construction_partner TEXT,  -- e.g., "Factory2Key"
  derisk_pre_sales_percent NUMERIC DEFAULT 0,
  derisk_pre_sales_count INTEGER DEFAULT 0,
  derisk_experienced_pm BOOLEAN DEFAULT FALSE,
  derisk_pm_name TEXT,
  derisk_clear_title BOOLEAN DEFAULT FALSE,
  derisk_growth_corridor BOOLEAN DEFAULT FALSE,
  
  -- ========== RISK FACTORS ==========
  risk_previous_disputes BOOLEAN DEFAULT FALSE,
  risk_dispute_details TEXT,
  risk_environmental_issues BOOLEAN DEFAULT FALSE,
  risk_environmental_details TEXT,
  risk_heritage_overlay BOOLEAN DEFAULT FALSE,
  risk_heritage_details TEXT,
  risk_other TEXT,
  
  -- ========== FINANCIAL SUMMARY (Voice: opportunity_financial) ==========
  -- Costs
  land_purchase_price NUMERIC DEFAULT 0,
  infrastructure_costs NUMERIC DEFAULT 0,
  construction_per_unit NUMERIC DEFAULT 0,
  total_construction_cost NUMERIC DEFAULT 0,
  contingency_percent NUMERIC DEFAULT 5,
  contingency_amount NUMERIC DEFAULT 0,
  total_project_cost NUMERIC DEFAULT 0,
  
  -- Revenue
  avg_sale_price NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  
  -- Profit
  gross_margin_dollars NUMERIC DEFAULT 0,
  gross_margin_percent NUMERIC DEFAULT 0,
  
  -- Timeline
  timeframe_months INTEGER,
  target_start_date DATE,
  target_completion_date DATE,
  time_sensitive_factors TEXT,
  
  -- ========== DEVELOPMENT VISION ==========
  development_type TEXT,      -- Residential, Mixed-use, Commercial
  development_goals TEXT,     -- What promoter wants to achieve
  design_preferences TEXT,    -- Style, quality level, etc.
  brief_description TEXT,     -- Elevator pitch
  
  -- ========== ASSESSMENT RESULTS ==========
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',        -- Still being entered
    'submitted',    -- Submitted for assessment
    'assessing',    -- AI assessment in progress
    'assessed',     -- Assessment complete
    'approved',     -- Promoter approved to proceed
    'rejected',     -- Promoter rejected
    'archived'      -- No longer active
  )),
  
  rag_status TEXT CHECK (rag_status IN ('green', 'amber', 'red')),
  score NUMERIC(5,2),
  
  -- Score breakdown
  gm_score NUMERIC(5,2),       -- GM% × 3 (max 75)
  derisk_score NUMERIC(5,2),   -- Sum of applicable de-risk points
  risk_deductions NUMERIC(5,2),-- Sum of risk penalties
  
  assessment_summary TEXT,
  path_to_green JSONB,         -- Array of suggestions
  assessment_details JSONB,    -- Full breakdown
  assessed_at TIMESTAMPTZ,
  assessed_by UUID REFERENCES profiles(id),
  
  -- ========== METADATA ==========
  notes TEXT,
  tags TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DETAILED FINANCIALS
-- ============================================

CREATE TABLE opportunity_financials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID UNIQUE REFERENCES opportunities(id) ON DELETE CASCADE,
  
  -- LAND ACQUISITION
  land_purchase_price NUMERIC DEFAULT 0,
  land_deposit NUMERIC DEFAULT 0,
  land_deposit_percent NUMERIC DEFAULT 10,
  stamp_duty NUMERIC DEFAULT 0,
  legal_acquisition NUMERIC DEFAULT 0,
  land_agents_fee NUMERIC DEFAULT 0,
  
  -- PRE-DEVELOPMENT
  feasibility_study NUMERIC DEFAULT 0,
  site_survey NUMERIC DEFAULT 0,
  geotechnical NUMERIC DEFAULT 0,
  environmental_assessment NUMERIC DEFAULT 0,
  town_planning NUMERIC DEFAULT 0,
  da_application_fees NUMERIC DEFAULT 0,
  architectural_design NUMERIC DEFAULT 0,
  engineering_design NUMERIC DEFAULT 0,
  
  -- INFRASTRUCTURE / CIVIL
  demolition NUMERIC DEFAULT 0,
  site_clearing NUMERIC DEFAULT 0,
  earthworks NUMERIC DEFAULT 0,
  road_construction NUMERIC DEFAULT 0,
  stormwater NUMERIC DEFAULT 0,
  sewer_connection NUMERIC DEFAULT 0,
  water_connection NUMERIC DEFAULT 0,
  electrical_connection NUMERIC DEFAULT 0,
  gas_connection NUMERIC DEFAULT 0,
  telecommunications NUMERIC DEFAULT 0,
  landscaping_civil NUMERIC DEFAULT 0,
  
  -- CONSTRUCTION
  construction_per_unit NUMERIC DEFAULT 0,
  construction_units INTEGER DEFAULT 0,
  total_construction NUMERIC DEFAULT 0,
  construction_contingency_percent NUMERIC DEFAULT 5,
  
  -- HOLDING COSTS
  finance_establishment NUMERIC DEFAULT 0,
  finance_interest_rate NUMERIC DEFAULT 0,
  finance_interest_total NUMERIC DEFAULT 0,
  land_tax NUMERIC DEFAULT 0,
  council_rates NUMERIC DEFAULT 0,
  insurance NUMERIC DEFAULT 0,
  utilities_holding NUMERIC DEFAULT 0,
  project_management NUMERIC DEFAULT 0,
  
  -- SALES & EXIT
  marketing_budget NUMERIC DEFAULT 0,
  sales_commission_percent NUMERIC DEFAULT 2.5,
  sales_commission_total NUMERIC DEFAULT 0,
  legal_settlement NUMERIC DEFAULT 0,
  gst_margin_scheme BOOLEAN DEFAULT TRUE,
  
  -- CONTINGENCY
  contingency_percent NUMERIC DEFAULT 5,
  contingency_amount NUMERIC DEFAULT 0,
  
  -- REVENUE
  avg_sale_price NUMERIC DEFAULT 0,
  min_sale_price NUMERIC DEFAULT 0,
  max_sale_price NUMERIC DEFAULT 0,
  total_units INTEGER DEFAULT 0,
  gross_revenue NUMERIC DEFAULT 0,
  
  -- CALCULATED TOTALS
  total_costs NUMERIC DEFAULT 0,
  gross_profit NUMERIC DEFAULT 0,
  gross_margin_percent NUMERIC DEFAULT 0,
  roi_percent NUMERIC DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DOCUMENTS (For RAG Knowledge Base)
-- ============================================

-- Document Categories for structured collection
CREATE TYPE document_category AS ENUM (
  -- Ownership & Legal
  'title_deed',
  'contract_of_sale',
  'vendor_statement',
  'legal_advice',
  
  -- Planning & Approvals
  'da_submission',
  'da_approval',
  'planning_permit',
  'rezoning_application',
  'council_correspondence',
  
  -- Site & Survey
  'site_survey',
  'boundary_plan',
  'contour_survey',
  'feature_survey',
  
  -- Design & Drawings
  'concept_drawings',
  'architectural_drawings',
  'landscape_drawings',
  'engineering_drawings',
  'civil_drawings',
  
  -- Technical Reports
  'geotechnical_report',
  'environmental_report',
  'heritage_assessment',
  'traffic_study',
  'acoustic_report',
  'bushfire_assessment',
  'flood_study',
  
  -- Financial
  'construction_quote',
  'financial_model',
  'bank_valuation',
  'sales_evidence',
  'pre_sale_contracts',
  
  -- Other
  'photos',
  'marketing_material',
  'correspondence',
  'other'
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  
  -- File Info
  file_name TEXT NOT NULL,
  file_type TEXT,               -- MIME type
  file_size INTEGER,            -- Bytes
  file_extension TEXT,          -- pdf, docx, jpg, etc.
  storage_path TEXT NOT NULL,   -- Supabase storage path
  public_url TEXT,
  
  -- Classification
  category document_category NOT NULL,
  subcategory TEXT,             -- Optional further classification
  description TEXT,             -- User-provided description
  
  -- RAG Processing
  is_processed BOOLEAN DEFAULT FALSE,
  extracted_text TEXT,          -- Full text extraction for RAG
  text_chunks JSONB,            -- Chunked text for embedding
  embedding_ids TEXT[],         -- References to vector store
  page_count INTEGER,
  
  -- Metadata for Assessment
  document_date DATE,           -- Date on document
  issuing_authority TEXT,       -- Council, surveyor, etc.
  reference_number TEXT,        -- DA number, survey ref, etc.
  expiry_date DATE,             -- If applicable
  
  -- Flags
  is_verified BOOLEAN DEFAULT FALSE,
  is_critical BOOLEAN DEFAULT FALSE,  -- Required for assessment
  verification_notes TEXT,
  
  -- Upload Info
  uploaded_by UUID REFERENCES profiles(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Embeddings for RAG (using pgvector)
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  
  chunk_index INTEGER,          -- Order of chunk in document
  chunk_text TEXT NOT NULL,     -- The text chunk
  embedding vector(1536),       -- OpenAI embedding dimension
  
  -- Metadata for filtering
  category document_category,
  page_number INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for similarity search
CREATE INDEX ON document_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- ASSESSMENTS (History)
-- ============================================

CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  
  -- Input Snapshot (at time of assessment)
  input_snapshot JSONB,
  
  -- Scores
  gm_score NUMERIC(5,2),
  derisk_score NUMERIC(5,2),
  risk_deductions NUMERIC(5,2),
  final_score NUMERIC(5,2),
  
  -- RAG Status
  rag_status TEXT CHECK (rag_status IN ('green', 'amber', 'red')),
  
  -- Factor Details
  applied_derisk_factors JSONB,
  applied_risk_factors JSONB,
  critical_failures JSONB,
  
  -- AI Analysis (from RAG over documents)
  document_insights JSONB,      -- Key findings from documents
  market_analysis TEXT,
  risk_analysis TEXT,
  
  -- Recommendations
  summary TEXT,
  amber_reasons TEXT[],
  red_reasons TEXT[],
  path_to_green JSONB,          -- Specific actions with calculations
  recommendations JSONB,
  
  -- Metadata
  model_version TEXT,           -- AI model used
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  assessed_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VOICE TRANSCRIPTS (For review/audit)
-- ============================================

CREATE TABLE voice_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  
  context TEXT NOT NULL,        -- setup, opportunity_basics, etc.
  step TEXT,                    -- Which step in the form
  
  user_message TEXT,
  assistant_message TEXT,
  extracted_fields JSONB,       -- What was extracted
  
  audio_url TEXT,               -- If we store audio
  duration_seconds INTEGER,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVESTMENT MEMORANDUMS
-- ============================================

CREATE TABLE investment_memorandums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  
  version INTEGER DEFAULT 1,
  status TEXT CHECK (status IN ('draft', 'review', 'approved', 'distributed')) DEFAULT 'draft',
  
  -- Content sections
  executive_summary TEXT,
  property_overview TEXT,
  financial_analysis TEXT,
  risk_assessment TEXT,
  recommendation TEXT,
  
  -- Generated documents
  content JSONB,
  docx_path TEXT,
  pdf_path TEXT,
  
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id)
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TABLE notifications (
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
  link TEXT,                    -- URL to navigate to
  
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_memorandums ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Companies
CREATE POLICY "Users can view own company" ON companies FOR SELECT 
  USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Company Settings
CREATE POLICY "Users can view company settings" ON company_settings FOR SELECT 
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can update company settings" ON company_settings FOR UPDATE 
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Opportunities
CREATE POLICY "Users can view company opportunities" ON opportunities FOR SELECT 
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can create opportunities" ON opportunities FOR INSERT 
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update company opportunities" ON opportunities FOR UPDATE 
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can delete opportunities" ON opportunities FOR DELETE 
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'promoter')));

-- Documents
CREATE POLICY "Users can view company documents" ON documents FOR SELECT 
  USING (opportunity_id IN (SELECT id FROM opportunities WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "Users can upload documents" ON documents FOR INSERT 
  WITH CHECK (opportunity_id IN (SELECT id FROM opportunities WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())));
CREATE POLICY "Users can delete own uploads" ON documents FOR DELETE 
  USING (uploaded_by = auth.uid());

-- Notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Calculate opportunity financials
CREATE OR REPLACE FUNCTION calculate_opportunity_financials()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate total construction
  NEW.total_construction_cost := NEW.construction_per_unit * COALESCE(NEW.num_dwellings, NEW.num_lots, 0);
  
  -- Calculate contingency
  NEW.contingency_amount := (NEW.land_purchase_price + NEW.infrastructure_costs + NEW.total_construction_cost) * (NEW.contingency_percent / 100);
  
  -- Calculate total cost
  NEW.total_project_cost := NEW.land_purchase_price + NEW.infrastructure_costs + NEW.total_construction_cost + NEW.contingency_amount;
  
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

CREATE TRIGGER calculate_financials_before_save
  BEFORE INSERT OR UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION calculate_opportunity_financials();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_opportunities_company ON opportunities(company_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_rag ON opportunities(rag_status);
CREATE INDEX idx_opportunities_created ON opportunities(created_at DESC);

CREATE INDEX idx_documents_opportunity ON documents(opportunity_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_processed ON documents(is_processed);

CREATE INDEX idx_assessments_opportunity ON assessments(opportunity_id);
CREATE INDEX idx_assessments_date ON assessments(assessed_at DESC);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

CREATE INDEX idx_embeddings_opportunity ON document_embeddings(opportunity_id);
CREATE INDEX idx_embeddings_category ON document_embeddings(category);

-- ============================================
-- SEED DATA (Default company settings template)
-- ============================================

-- This will be copied when a new company is created
COMMENT ON TABLE company_settings IS 'Default values represent Factory2Key recommended settings';
