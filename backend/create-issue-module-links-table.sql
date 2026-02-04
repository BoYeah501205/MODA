-- ============================================================================
-- Issue-Module Links Table
-- ============================================================================
-- Junction table for linking engineering issues to multiple modules.
-- Enables traceability from issues → modules → shop drawings.
--
-- Run this migration in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/syreuphexagezawjyjgt/sql
-- ============================================================================

-- Add module_id column to engineering_issues for single-module quick reference
-- (The first linked module, for backward compatibility with blm_id lookups)
ALTER TABLE engineering_issues 
ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id) ON DELETE SET NULL;

-- Create index for module_id lookups
CREATE INDEX IF NOT EXISTS idx_engineering_issues_module_id 
ON engineering_issues(module_id);

-- ============================================================================
-- Junction table for multi-module issue linking
-- ============================================================================
CREATE TABLE IF NOT EXISTS issue_module_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    issue_id UUID NOT NULL REFERENCES engineering_issues(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Prevent duplicate links
    UNIQUE(issue_id, module_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_issue_module_links_issue 
ON issue_module_links(issue_id);

CREATE INDEX IF NOT EXISTS idx_issue_module_links_module 
ON issue_module_links(module_id);

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE issue_module_links ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all issue-module links
CREATE POLICY "Allow authenticated read access to issue_module_links"
ON issue_module_links FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to create links
CREATE POLICY "Allow authenticated insert to issue_module_links"
ON issue_module_links FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to delete links
CREATE POLICY "Allow authenticated delete from issue_module_links"
ON issue_module_links FOR DELETE
TO authenticated
USING (true);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Drop existing functions if they exist (to allow return type changes)
DROP FUNCTION IF EXISTS get_issue_modules(UUID);
DROP FUNCTION IF EXISTS get_module_issues(UUID);
DROP FUNCTION IF EXISTS link_modules_to_issue(UUID, UUID[], UUID);

-- Get all modules linked to an issue
CREATE OR REPLACE FUNCTION get_issue_modules(p_issue_id UUID)
RETURNS TABLE (
    module_id UUID,
    serial_number TEXT,
    hitch_blm TEXT,
    rear_blm TEXT,
    unit_type TEXT,
    build_sequence INTEGER,
    project_id UUID,
    project_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id AS module_id,
        m.serial_number,
        m.hitch_blm,
        m.rear_blm,
        m.unit_type,
        m.build_sequence,
        m.project_id,
        p.name AS project_name
    FROM issue_module_links iml
    INNER JOIN modules m ON iml.module_id = m.id
    LEFT JOIN projects p ON m.project_id = p.id
    WHERE iml.issue_id = p_issue_id
    ORDER BY m.build_sequence;
END;
$$ LANGUAGE plpgsql;

-- Get all issues linked to a module
CREATE OR REPLACE FUNCTION get_module_issues(p_module_id UUID)
RETURNS TABLE (
    issue_id UUID,
    issue_number INTEGER,
    issue_display_id TEXT,
    issue_type TEXT,
    priority TEXT,
    title TEXT,
    description TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    submitted_by TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ei.id AS issue_id,
        ei.issue_number,
        ei.issue_display_id,
        ei.issue_type,
        ei.priority,
        ei.title,
        ei.description,
        ei.status,
        ei.created_at,
        ei.submitted_by
    FROM issue_module_links iml
    INNER JOIN engineering_issues ei ON iml.issue_id = ei.id
    WHERE iml.module_id = p_module_id
    ORDER BY ei.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Link multiple modules to an issue (batch operation)
CREATE OR REPLACE FUNCTION link_modules_to_issue(
    p_issue_id UUID,
    p_module_ids UUID[],
    p_created_by UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_module_id UUID;
BEGIN
    -- Insert each module link (ignore duplicates)
    FOREACH v_module_id IN ARRAY p_module_ids
    LOOP
        INSERT INTO issue_module_links (issue_id, module_id, created_by)
        VALUES (p_issue_id, v_module_id, p_created_by)
        ON CONFLICT (issue_id, module_id) DO NOTHING;
        
        IF FOUND THEN
            v_count := v_count + 1;
        END IF;
    END LOOP;
    
    -- Update the primary module_id on the issue (first in array)
    IF array_length(p_module_ids, 1) > 0 THEN
        UPDATE engineering_issues 
        SET module_id = p_module_ids[1]
        WHERE id = p_issue_id AND module_id IS NULL;
    END IF;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE issue_module_links IS 'Junction table linking engineering issues to modules for traceability';
COMMENT ON COLUMN issue_module_links.issue_id IS 'Reference to the engineering issue';
COMMENT ON COLUMN issue_module_links.module_id IS 'Reference to the linked module';
COMMENT ON FUNCTION get_issue_modules IS 'Returns all modules linked to a specific issue';
COMMENT ON FUNCTION get_module_issues IS 'Returns all issues linked to a specific module';
COMMENT ON FUNCTION link_modules_to_issue IS 'Batch links multiple modules to an issue, returns count of new links created';
