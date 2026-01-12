-- ============================================================================
-- DRAWINGS BASE TABLES
-- ============================================================================
-- Core tables for drawing file management with version control.
-- Run this BEFORE create-drawing-sheets-tables.sql
-- ============================================================================

-- ============================================================================
-- TABLE: drawing_files
-- Main registry of drawing files (packages)
-- ============================================================================
CREATE TABLE IF NOT EXISTS drawing_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Project relationship
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Organization (folder structure)
    category TEXT NOT NULL, -- e.g., 'permit-drawings', 'shop-drawings'
    discipline TEXT NOT NULL, -- e.g., 'mechanical', 'electrical', 'shop-module-packages'
    
    -- File metadata
    name TEXT NOT NULL,
    description TEXT,
    
    -- SharePoint integration
    sharepoint_file_id TEXT, -- SharePoint unique file ID
    sharepoint_folder_path TEXT, -- Full folder path in SharePoint
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    
    -- Constraints
    CONSTRAINT unique_drawing_per_project_discipline UNIQUE(project_id, category, discipline, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drawing_files_project ON drawing_files(project_id);
CREATE INDEX IF NOT EXISTS idx_drawing_files_category ON drawing_files(category);
CREATE INDEX IF NOT EXISTS idx_drawing_files_discipline ON drawing_files(discipline);
CREATE INDEX IF NOT EXISTS idx_drawing_files_sharepoint ON drawing_files(sharepoint_file_id);

-- ============================================================================
-- TABLE: drawing_versions
-- Version history for drawing files
-- ============================================================================
CREATE TABLE IF NOT EXISTS drawing_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- File relationship
    drawing_file_id UUID NOT NULL REFERENCES drawing_files(id) ON DELETE CASCADE,
    
    -- Version info
    version TEXT NOT NULL DEFAULT '1.0',
    
    -- Storage
    storage_path TEXT NOT NULL, -- Path in Supabase Storage
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    
    -- SharePoint integration
    sharepoint_file_id TEXT, -- SharePoint version-specific ID
    sharepoint_url TEXT, -- Direct SharePoint URL
    
    -- Upload metadata
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by TEXT,
    
    -- Version notes
    notes TEXT,
    
    -- Constraints
    CONSTRAINT unique_version_per_file UNIQUE(drawing_file_id, version)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drawing_versions_file ON drawing_versions(drawing_file_id);
CREATE INDEX IF NOT EXISTS idx_drawing_versions_uploaded ON drawing_versions(uploaded_at DESC);

-- ============================================================================
-- TABLE: drawing_folders
-- Custom folder definitions (categories and disciplines)
-- ============================================================================
CREATE TABLE IF NOT EXISTS drawing_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Folder hierarchy
    folder_type TEXT NOT NULL, -- 'category' or 'discipline'
    parent_id UUID REFERENCES drawing_folders(id) ON DELETE CASCADE, -- NULL for categories
    
    -- Folder metadata
    folder_id TEXT NOT NULL, -- Unique identifier (e.g., 'shop-module-packages')
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'icon-folder',
    color TEXT DEFAULT 'bg-gray-100 border-gray-400',
    
    -- Flags
    is_custom BOOLEAN DEFAULT true, -- User-created vs system default
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_folder_id UNIQUE(folder_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drawing_folders_type ON drawing_folders(folder_type);
CREATE INDEX IF NOT EXISTS idx_drawing_folders_parent ON drawing_folders(parent_id);

-- ============================================================================
-- TRIGGER: Update timestamp on changes
-- ============================================================================
CREATE OR REPLACE FUNCTION update_drawing_file_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_drawing_file_timestamp
    BEFORE UPDATE ON drawing_files
    FOR EACH ROW
    EXECUTE FUNCTION update_drawing_file_timestamp();

CREATE TRIGGER trigger_update_drawing_folder_timestamp
    BEFORE UPDATE ON drawing_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_drawing_file_timestamp();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE drawing_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_folders ENABLE ROW LEVEL SECURITY;

-- Drawing files policies
CREATE POLICY "Allow authenticated read on drawing_files"
    ON drawing_files FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert on drawing_files"
    ON drawing_files FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update on drawing_files"
    ON drawing_files FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated delete on drawing_files"
    ON drawing_files FOR DELETE
    TO authenticated
    USING (true);

-- Drawing versions policies
CREATE POLICY "Allow authenticated read on drawing_versions"
    ON drawing_versions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert on drawing_versions"
    ON drawing_versions FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update on drawing_versions"
    ON drawing_versions FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated delete on drawing_versions"
    ON drawing_versions FOR DELETE
    TO authenticated
    USING (true);

-- Drawing folders policies
CREATE POLICY "Allow authenticated read on drawing_folders"
    ON drawing_folders FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert on drawing_folders"
    ON drawing_folders FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update on drawing_folders"
    ON drawing_folders FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated delete on drawing_folders"
    ON drawing_folders FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT ALL ON drawing_files TO authenticated;
GRANT ALL ON drawing_versions TO authenticated;
GRANT ALL ON drawing_folders TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE drawing_files IS 'Main registry of drawing files with project and folder organization';
COMMENT ON TABLE drawing_versions IS 'Version history for drawing files with storage paths';
COMMENT ON TABLE drawing_folders IS 'Custom folder definitions for organizing drawings';
