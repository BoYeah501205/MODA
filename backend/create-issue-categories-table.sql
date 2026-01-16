-- Issue Categories Table for MODA
-- Run this in Supabase SQL Editor to create the issue_categories table

-- Create issue_categories table
CREATE TABLE IF NOT EXISTS issue_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_type TEXT NOT NULL,  -- References the issue type (shop-drawing, design-conflict, etc.)
    name TEXT NOT NULL,        -- Category name (e.g., "Missing Dimensions", "Incorrect Callout")
    description TEXT,          -- Optional description
    color TEXT DEFAULT '#6B7280',  -- Optional color for UI display
    sort_order INTEGER DEFAULT 0,  -- For ordering categories within an issue type
    is_active BOOLEAN DEFAULT true,  -- Soft delete / disable
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Ensure unique category names per issue type
    UNIQUE(issue_type, name)
);

-- Create index for faster lookups by issue_type
CREATE INDEX IF NOT EXISTS idx_issue_categories_issue_type ON issue_categories(issue_type);
CREATE INDEX IF NOT EXISTS idx_issue_categories_active ON issue_categories(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE issue_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can read active categories
CREATE POLICY "Anyone can view active issue categories"
    ON issue_categories FOR SELECT
    USING (is_active = true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage issue categories"
    ON issue_categories FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.dashboard_role IN ('admin', 'super_admin')
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_issue_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_issue_categories_updated_at ON issue_categories;
CREATE TRIGGER trigger_issue_categories_updated_at
    BEFORE UPDATE ON issue_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_issue_categories_updated_at();

-- Insert default categories for each issue type
INSERT INTO issue_categories (issue_type, name, description, sort_order) VALUES
    -- Shop Drawing categories
    ('shop-drawing', 'Missing Dimensions', 'Dimensions not shown or unclear', 1),
    ('shop-drawing', 'Incorrect Callout', 'Wrong material or specification callout', 2),
    ('shop-drawing', 'Drawing Revision Needed', 'Drawing needs to be updated', 3),
    ('shop-drawing', 'Detail Missing', 'Required detail not included', 4),
    
    -- Design Conflict categories
    ('design-conflict', 'MEP Clash', 'Mechanical/Electrical/Plumbing conflict', 1),
    ('design-conflict', 'Structural Conflict', 'Structural element interference', 2),
    ('design-conflict', 'Dimension Mismatch', 'Dimensions don''t match between drawings', 3),
    ('design-conflict', 'Specification Conflict', 'Conflicting specifications', 4),
    
    -- Material/Supply categories
    ('material-supply', 'Material Shortage', 'Not enough material on hand', 1),
    ('material-supply', 'Wrong Material Delivered', 'Incorrect material received', 2),
    ('material-supply', 'Material Damaged', 'Material arrived damaged', 3),
    ('material-supply', 'Material Not Ordered', 'Required material was not ordered', 4),
    ('material-supply', 'Substitution Needed', 'Need to substitute specified material', 5),
    
    -- Quality Issue categories
    ('quality', 'Workmanship', 'Quality of work does not meet standards', 1),
    ('quality', 'Damage', 'Component or module damaged', 2),
    ('quality', 'Out of Tolerance', 'Measurements outside acceptable range', 3),
    ('quality', 'Missing Component', 'Required component not installed', 4),
    ('quality', 'Incorrect Installation', 'Component installed incorrectly', 5),
    
    -- Engineering Question categories
    ('engineering-question', 'Clarification Needed', 'Need clarification on design intent', 1),
    ('engineering-question', 'Alternative Approach', 'Proposing alternative method', 2),
    ('engineering-question', 'Code Compliance', 'Question about code requirements', 3),
    ('engineering-question', 'Field Condition', 'Unexpected field condition encountered', 4),
    
    -- RFI Required categories
    ('rfi', 'Design Clarification', 'Need architect/engineer clarification', 1),
    ('rfi', 'Change Request', 'Requesting design change', 2),
    ('rfi', 'Substitution Request', 'Requesting material/product substitution', 3),
    ('rfi', 'Code Interpretation', 'Need code interpretation from AHJ', 4),
    
    -- Other categories
    ('other', 'General', 'General issue not fitting other categories', 1),
    ('other', 'Process Issue', 'Issue with production process', 2),
    ('other', 'Safety Concern', 'Safety-related issue', 3),
    ('other', 'Equipment', 'Equipment-related issue', 4)
ON CONFLICT (issue_type, name) DO NOTHING;

-- Grant permissions
GRANT SELECT ON issue_categories TO authenticated;
GRANT ALL ON issue_categories TO service_role;
