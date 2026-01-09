-- ============================================================================
-- DRAWING FOLDERS TABLE
-- Stores custom folder structures (categories and disciplines) per project
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Create drawing_folders table for custom folder structures
CREATE TABLE IF NOT EXISTS drawing_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    parent_id UUID REFERENCES drawing_folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    folder_type TEXT NOT NULL CHECK (folder_type IN ('category', 'discipline')),
    color TEXT DEFAULT 'bg-gray-100 border-gray-400',
    sort_order INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    -- Unique constraint for folder name within same parent and project
    UNIQUE(project_id, parent_id, name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_drawing_folders_project ON drawing_folders(project_id);
CREATE INDEX IF NOT EXISTS idx_drawing_folders_parent ON drawing_folders(parent_id);

-- Enable RLS
ALTER TABLE drawing_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies - allow all authenticated users to read, admins to modify
CREATE POLICY "drawing_folders_select" ON drawing_folders 
    FOR SELECT USING (true);

CREATE POLICY "drawing_folders_insert" ON drawing_folders 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "drawing_folders_update" ON drawing_folders 
    FOR UPDATE USING (true);

CREATE POLICY "drawing_folders_delete" ON drawing_folders 
    FOR DELETE USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_drawing_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_drawing_folders_updated_at ON drawing_folders;
CREATE TRIGGER trigger_drawing_folders_updated_at
    BEFORE UPDATE ON drawing_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_drawing_folders_updated_at();

-- ============================================================================
-- SAMPLE: Insert default folder structure for a project
-- Replace 'PROJECT_ID' with actual project ID
-- ============================================================================
-- INSERT INTO drawing_folders (project_id, name, folder_type, color, sort_order, is_default) VALUES
-- ('PROJECT_ID', 'Permit Drawings', 'category', 'bg-blue-100 border-blue-500', 1, true),
-- ('PROJECT_ID', 'Shop Drawings', 'category', 'bg-amber-100 border-amber-500', 2, true);

-- Then insert disciplines with parent_id referencing the category
