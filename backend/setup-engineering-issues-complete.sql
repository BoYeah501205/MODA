-- ============================================================================
-- COMPLETE Engineering Issues Setup for MODA
-- Run this ENTIRE script in Supabase SQL Editor
-- This creates the table, indexes, triggers, and RLS policies
-- ============================================================================

-- Drop existing policies first (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view all issues" ON engineering_issues;
DROP POLICY IF EXISTS "Users can create issues" ON engineering_issues;
DROP POLICY IF EXISTS "Users can update relevant issues" ON engineering_issues;
DROP POLICY IF EXISTS "Admins can delete issues" ON engineering_issues;

-- Create engineering_issues table (if not exists)
CREATE TABLE IF NOT EXISTS engineering_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Issue identification
    issue_number INTEGER NOT NULL,
    issue_display_id TEXT NOT NULL,
    
    -- Routing info
    routed_to TEXT DEFAULT 'engineering',
    
    -- Context (from module/project)
    project_id UUID,
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
    issue_category TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    title TEXT,
    description TEXT NOT NULL,
    photo_urls JSONB DEFAULT '[]'::jsonb,
    
    -- Assignment & tracking
    submitted_by TEXT NOT NULL,
    submitted_by_id UUID,
    assigned_to TEXT,
    assigned_to_id UUID,
    status TEXT NOT NULL DEFAULT 'open',
    
    -- Activity log (stored as JSONB arrays)
    comments JSONB DEFAULT '[]'::jsonb,
    status_history JSONB DEFAULT '[]'::jsonb,
    
    -- Resolution
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolved_by_id UUID,
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
CREATE INDEX IF NOT EXISTS idx_engineering_issues_routed_to ON engineering_issues(routed_to);

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

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Disable RLS temporarily
ALTER TABLE engineering_issues DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE engineering_issues ENABLE ROW LEVEL SECURITY;

-- Simple, permissive policies for authenticated users
-- SELECT: Any authenticated user can view all issues
CREATE POLICY "select_engineering_issues"
    ON engineering_issues FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: Any authenticated user can create issues
CREATE POLICY "insert_engineering_issues"
    ON engineering_issues FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- UPDATE: Any authenticated user can update issues
CREATE POLICY "update_engineering_issues"
    ON engineering_issues FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- DELETE: Any authenticated user can delete issues
CREATE POLICY "delete_engineering_issues"
    ON engineering_issues FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================================
-- REALTIME (optional - enable if you want live updates)
-- ============================================================================

-- Try to add to realtime publication (may fail if already added)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE engineering_issues;
EXCEPTION
    WHEN duplicate_object THEN
        NULL; -- Already added, ignore
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show table info
SELECT 'Table created successfully' as status, 
       (SELECT COUNT(*) FROM engineering_issues) as current_issue_count;
