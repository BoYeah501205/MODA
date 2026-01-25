-- Seed default Shop Drawing sub-categories
-- Run this in Supabase SQL Editor to add the default categories

-- First, ensure the issue_categories table exists
CREATE TABLE IF NOT EXISTS issue_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_issue_categories_type ON issue_categories(issue_type);

-- Insert default Shop Drawing categories (only if they don't exist)
INSERT INTO issue_categories (issue_type, name, description, sort_order, is_active)
SELECT 'shop-drawing', 'Dimension', 'Dimension-related issues (incorrect measurements, scaling errors)', 1, true
WHERE NOT EXISTS (
    SELECT 1 FROM issue_categories WHERE issue_type = 'shop-drawing' AND name = 'Dimension'
);

INSERT INTO issue_categories (issue_type, name, description, sort_order, is_active)
SELECT 'shop-drawing', 'Question', 'Questions about shop drawing details or specifications', 2, true
WHERE NOT EXISTS (
    SELECT 1 FROM issue_categories WHERE issue_type = 'shop-drawing' AND name = 'Question'
);

INSERT INTO issue_categories (issue_type, name, description, sort_order, is_active)
SELECT 'shop-drawing', 'Error', 'Errors found in shop drawings (missing details, incorrect info)', 3, true
WHERE NOT EXISTS (
    SELECT 1 FROM issue_categories WHERE issue_type = 'shop-drawing' AND name = 'Error'
);

INSERT INTO issue_categories (issue_type, name, description, sort_order, is_active)
SELECT 'shop-drawing', 'Other', 'Other shop drawing issues not covered by above categories', 4, true
WHERE NOT EXISTS (
    SELECT 1 FROM issue_categories WHERE issue_type = 'shop-drawing' AND name = 'Other'
);

-- Verify the categories were added
SELECT * FROM issue_categories WHERE issue_type = 'shop-drawing' ORDER BY sort_order;
