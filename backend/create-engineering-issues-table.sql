-- ============================================================================
-- Engineering Issues Table for MODA
-- Run this in Supabase SQL Editor to create the engineering_issues table
-- ============================================================================

-- Create engineering_issues table
CREATE TABLE IF NOT EXISTS engineering_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Issue identification
    issue_number INTEGER NOT NULL,
    issue_display_id TEXT NOT NULL,
    
    -- Context (from module/project)
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    project_name TEXT,
    project_abbreviation TEXT,
    blm_id TEXT,
    build_seq INTEGER,
    unit_type TEXT,
    hitch_front TEXT,
    hitch_rear TEXT,
    department TEXT,
    stage TEXT,
    
    -- Issue details
    issue_type TEXT NOT NULL DEFAULT 'other',
    priority TEXT NOT NULL DEFAULT 'medium',
    title TEXT,
    description TEXT NOT NULL,
    photo_urls JSONB DEFAULT '[]'::jsonb,
    
    -- Assignment & tracking
    submitted_by TEXT NOT NULL,
    submitted_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    assigned_to TEXT,
    assigned_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'open',
    
    -- Activity log (stored as JSONB arrays)
    comments JSONB DEFAULT '[]'::jsonb,
    status_history JSONB DEFAULT '[]'::jsonb,
    
    -- Resolution
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolved_by_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_engineering_issues_status ON engineering_issues(status);
CREATE INDEX IF NOT EXISTS idx_engineering_issues_priority ON engineering_issues(priority);
CREATE INDEX IF NOT EXISTS idx_engineering_issues_issue_type ON engineering_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_engineering_issues_project_id ON engineering_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_engineering_issues_blm_id ON engineering_issues(blm_id);
CREATE INDEX IF NOT EXISTS idx_engineering_issues_assigned_to_id ON engineering_issues(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_engineering_issues_submitted_by_id ON engineering_issues(submitted_by_id);
CREATE INDEX IF NOT EXISTS idx_engineering_issues_created_at ON engineering_issues(created_at DESC);

-- Create sequence for issue numbers (if not using auto-increment)
CREATE SEQUENCE IF NOT EXISTS engineering_issue_number_seq START 1;

-- Function to auto-generate issue_display_id
CREATE OR REPLACE FUNCTION generate_issue_display_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.issue_number IS NULL THEN
        NEW.issue_number := nextval('engineering_issue_number_seq');
    END IF;
    IF NEW.issue_display_id IS NULL THEN
        NEW.issue_display_id := 'ENG-' || LPAD(NEW.issue_number::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate issue numbers
DROP TRIGGER IF EXISTS trg_generate_issue_display_id ON engineering_issues;
CREATE TRIGGER trg_generate_issue_display_id
    BEFORE INSERT ON engineering_issues
    FOR EACH ROW
    EXECUTE FUNCTION generate_issue_display_id();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_engineering_issues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trg_update_engineering_issues_updated_at ON engineering_issues;
CREATE TRIGGER trg_update_engineering_issues_updated_at
    BEFORE UPDATE ON engineering_issues
    FOR EACH ROW
    EXECUTE FUNCTION update_engineering_issues_updated_at();

-- Enable Row Level Security
ALTER TABLE engineering_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Allow all authenticated users to view issues
CREATE POLICY "Users can view all issues"
    ON engineering_issues
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to create issues
CREATE POLICY "Users can create issues"
    ON engineering_issues
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow users to update issues they submitted or are assigned to
-- Also allow admins and engineering role to update any issue
CREATE POLICY "Users can update relevant issues"
    ON engineering_issues
    FOR UPDATE
    TO authenticated
    USING (
        submitted_by_id = auth.uid() 
        OR assigned_to_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (dashboard_role = 'admin' OR dashboard_role = 'engineering' OR is_protected = true)
        )
    );

-- Only admins can delete issues
CREATE POLICY "Admins can delete issues"
    ON engineering_issues
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (dashboard_role = 'admin' OR is_protected = true)
        )
    );

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE engineering_issues;

-- ============================================================================
-- Sample data (optional - comment out if not needed)
-- ============================================================================

-- INSERT INTO engineering_issues (
--     issue_type, priority, title, description, 
--     submitted_by, status, blm_id, project_name
-- ) VALUES 
-- (
--     'shop-drawing', 'high', 
--     'Wall framing height discrepancy',
--     'Drawing A-102 shows wall height at 9''-2" but specification calls for 9''-0". Which dimension should we follow?',
--     'Production Team', 'open', '21-0393', 'Enlightenment Plaza'
-- ),
-- (
--     'design-conflict', 'critical',
--     'MEP Coordination - HVAC/Plumbing Conflict',
--     'HVAC ductwork conflicts with plumbing drain in unit stack. Need coordination drawings for resolution.',
--     'Production Team', 'in-progress', '21-0394', 'Enlightenment Plaza'
-- );

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'engineering_issues'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'engineering_issues';

-- Check RLS policies
-- SELECT policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'engineering_issues';
