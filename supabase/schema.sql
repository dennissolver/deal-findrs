-- DealFindrs Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies (Promoter organizations)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  city TEXT,
  country TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  role TEXT CHECK (role IN ('admin', 'promoter', 'deal_finder')) DEFAULT 'deal_finder',
  first_name TEXT,
  last_name TEXT,
  mobile TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assessment Criteria (Promoter configurable)
CREATE TABLE criteria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  field_type TEXT CHECK (field_type IN ('checkbox', 'yes_no', 'dropdown', 'text', 'number', 'date', 'document')),
  options JSONB,
  is_critical BOOLEAN DEFAULT FALSE,
  weight NUMERIC(5,2) DEFAULT 1.0,
  display_order INTEGER,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Assessment Settings
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  min_gm_green NUMERIC(5,2) DEFAULT 25.0,
  min_gm_amber NUMERIC(5,2) DEFAULT 18.0,
  derisk_factors JSONB DEFAULT '[]'::jsonb,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opportunities
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  
  -- Basic Info
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  landowner_name TEXT,
  landowner_contact JSONB,
  source TEXT,
  
  -- Property Details
  property_size_value NUMERIC,
  property_size_unit TEXT CHECK (property_size_unit IN ('sqm', 'acres', 'sqft')) DEFAULT 'sqm',
  land_stage TEXT CHECK (land_stage IN ('da_approved', 'needs_rezoning', 'vacant', 'redevelopment', 'other')),
  existing_structures TEXT,
  current_zoning TEXT,
  num_lots INTEGER,
  num_dwellings INTEGER,
  
  -- Development Vision
  development_goals TEXT,
  development_type TEXT,
  design_preferences TEXT,
  brief_description TEXT,
  
  -- Financial (Summary)
  total_project_cost NUMERIC,
  total_revenue NUMERIC,
  gross_margin_dollars NUMERIC,
  gross_margin_percent NUMERIC,
  
  -- Timeline
  timeframe_months INTEGER,
  target_start_date DATE,
  target_completion_date DATE,
  time_sensitive_factors TEXT,
  
  -- Assessment
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'assessing', 'assessed', 'archived')),
  rag_status TEXT CHECK (rag_status IN ('green', 'amber', 'red')),
  score NUMERIC(5,2),
  assessment_summary TEXT,
  assessment_details JSONB,
  assessed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opportunity Financials (Detailed breakdown)
CREATE TABLE opportunity_financials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID UNIQUE REFERENCES opportunities(id) ON DELETE CASCADE,
  
  -- Land Costs
  land_purchase_price NUMERIC DEFAULT 0,
  land_deposit NUMERIC DEFAULT 0,
  stamp_duty NUMERIC DEFAULT 0,
  legal_costs NUMERIC DEFAULT 0,
  
  -- Pre-Development
  due_diligence_costs NUMERIC DEFAULT 0,
  survey_costs NUMERIC DEFAULT 0,
  da_costs NUMERIC DEFAULT 0,
  
  -- Infrastructure
  civil_works NUMERIC DEFAULT 0,
  utilities NUMERIC DEFAULT 0,
  landscaping NUMERIC DEFAULT 0,
  
  -- Construction
  construction_per_unit NUMERIC DEFAULT 0,
  total_construction NUMERIC DEFAULT 0,
  
  -- Holding
  finance_interest NUMERIC DEFAULT 0,
  rates_insurance NUMERIC DEFAULT 0,
  management_fees NUMERIC DEFAULT 0,
  
  -- Exit
  marketing NUMERIC DEFAULT 0,
  sales_commissions NUMERIC DEFAULT 0,
  settlement_costs NUMERIC DEFAULT 0,
  
  -- Contingency
  contingency_percent NUMERIC DEFAULT 5.0,
  contingency_amount NUMERIC DEFAULT 0,
  
  -- Revenue
  avg_sale_price NUMERIC DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Traffic Light Assessments (History)
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  
  -- Scores
  base_score NUMERIC,
  derisk_score NUMERIC,
  risk_deductions NUMERIC,
  final_score NUMERIC,
  
  -- RAG
  rag_status TEXT CHECK (rag_status IN ('green', 'amber', 'red')),
  
  -- Factors
  derisk_factors JSONB,
  risk_factors JSONB,
  
  -- Reasoning
  amber_reasons TEXT[],
  red_reasons TEXT[],
  path_to_green TEXT[],
  summary TEXT,
  
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  assessed_by UUID REFERENCES profiles(id)
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT,
  category TEXT CHECK (category IN ('title_deed', 'da', 'survey', 'photos', 'environmental', 'financial', 'other')),
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investment Memorandums
CREATE TABLE investment_memorandums (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  status TEXT CHECK (status IN ('draft', 'review', 'approved', 'distributed')) DEFAULT 'draft',
  content JSONB,
  docx_path TEXT,
  pdf_path TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id)
);

-- Row Level Security Policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_memorandums ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Companies: Users can view their own company
CREATE POLICY "Users can view own company" ON companies FOR SELECT 
  USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Opportunities: Users can CRUD opportunities in their company
CREATE POLICY "Users can view company opportunities" ON opportunities FOR SELECT 
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can create company opportunities" ON opportunities FOR INSERT 
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update company opportunities" ON opportunities FOR UPDATE 
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Similar policies for other tables...

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Indexes for performance
CREATE INDEX idx_opportunities_company ON opportunities(company_id);
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_rag ON opportunities(rag_status);
CREATE INDEX idx_assessments_opportunity ON assessments(opportunity_id);
CREATE INDEX idx_documents_opportunity ON documents(opportunity_id);
