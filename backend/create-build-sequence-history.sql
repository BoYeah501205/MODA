-- ============================================================================
-- BUILD SEQUENCE HISTORY TABLE
-- Tracks all changes to module build sequences for audit and restoration
-- ============================================================================

-- Build Sequence History table
CREATE TABLE IF NOT EXISTS build_sequence_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Snapshot of all module sequences at this point in time
    sequence_snapshot JSONB NOT NULL, -- Array of { moduleId, serialNumber, buildSequence, hitchBLM }
    
    -- Change metadata
    change_type TEXT NOT NULL, -- 'manual_edit', 'import', 'reorder', 'prototype_insert', 'restore'
    change_description TEXT, -- Human-readable description
    changed_by UUID REFERENCES auth.users(id),
    changed_by_name TEXT, -- Denormalized for display
    
    -- For restore functionality
    is_current BOOLEAN DEFAULT false, -- Only one per project should be true
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast project lookups
CREATE INDEX IF NOT EXISTS idx_build_sequence_history_project 
ON build_sequence_history(project_id, created_at DESC);

-- Index for finding current sequence
CREATE INDEX IF NOT EXISTS idx_build_sequence_history_current 
ON build_sequence_history(project_id, is_current) WHERE is_current = true;

-- Enable RLS
ALTER TABLE build_sequence_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view build sequence history"
ON build_sequence_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert build sequence history"
ON build_sequence_history FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update build sequence history"
ON build_sequence_history FOR UPDATE
TO authenticated
USING (true);

-- Function to save a sequence snapshot
CREATE OR REPLACE FUNCTION save_sequence_snapshot(
    p_project_id UUID,
    p_modules JSONB,
    p_change_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_user_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_history_id UUID;
BEGIN
    -- Mark all previous entries as not current
    UPDATE build_sequence_history 
    SET is_current = false 
    WHERE project_id = p_project_id AND is_current = true;
    
    -- Insert new snapshot
    INSERT INTO build_sequence_history (
        project_id, 
        sequence_snapshot, 
        change_type, 
        change_description,
        changed_by,
        changed_by_name,
        is_current
    ) VALUES (
        p_project_id,
        p_modules,
        p_change_type,
        p_description,
        p_user_id,
        p_user_name,
        true
    ) RETURNING id INTO v_history_id;
    
    RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get sequence history for a project
CREATE OR REPLACE FUNCTION get_sequence_history(
    p_project_id UUID,
    p_limit INT DEFAULT 20
) RETURNS TABLE (
    id UUID,
    sequence_snapshot JSONB,
    change_type TEXT,
    change_description TEXT,
    changed_by_name TEXT,
    is_current BOOLEAN,
    created_at TIMESTAMPTZ,
    module_count INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.sequence_snapshot,
        h.change_type,
        h.change_description,
        h.changed_by_name,
        h.is_current,
        h.created_at,
        jsonb_array_length(h.sequence_snapshot) as module_count
    FROM build_sequence_history h
    WHERE h.project_id = p_project_id
    ORDER BY h.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION save_sequence_snapshot TO authenticated;
GRANT EXECUTE ON FUNCTION get_sequence_history TO authenticated;
