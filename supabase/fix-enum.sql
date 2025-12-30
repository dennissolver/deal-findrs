-- RUN THIS FIRST to fix the document_category enum issue
-- This script converts the enum column to TEXT before running migration-v2.sql

-- Step 1: Drop any constraints on the category column
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check;

-- Step 2: Create a temporary column
ALTER TABLE documents ADD COLUMN IF NOT EXISTS category_temp TEXT;

-- Step 3: Copy data to temp column (converting enum to text)
UPDATE documents SET category_temp = category::TEXT WHERE category IS NOT NULL;

-- Step 4: Drop the original column (this removes the enum dependency)
ALTER TABLE documents DROP COLUMN IF EXISTS category;

-- Step 5: Rename temp column to category
ALTER TABLE documents RENAME COLUMN category_temp TO category;

-- Step 6: Now we can safely drop the enum type
DROP TYPE IF EXISTS document_category CASCADE;

-- Step 7: Add the TEXT constraint with all valid values
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

-- Done! Now you can run migration-v2.sql
