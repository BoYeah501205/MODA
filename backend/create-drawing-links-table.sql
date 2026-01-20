-- ============================================================================
-- DRAWING LINKS TABLE
-- Stores quick-access links to specific pages within permit drawing packages
-- ============================================================================

-- Drop existing table if needed (comment out if you want to preserve data)
-- DROP TABLE IF EXISTS drawing_links CASCADE;

-- Create drawing_links table
CREATE TABLE IF NOT EXISTS drawing_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Link target information
    package_path TEXT NOT NULL DEFAULT '',   -- SharePoint path or storage path to PDF
    sharepoint_file_id TEXT DEFAULT NULL,    -- SharePoint file ID for direct access
    page_number INTEGER NOT NULL DEFAULT 1,  -- 1-indexed page number
    
    -- Link metadata
    label TEXT NOT NULL,                     -- Display label (e.g., "Shear Schedule")
    description TEXT DEFAULT NULL,           -- Optional detailed description
    is_preset BOOLEAN DEFAULT false,         -- True for default preset links
    
    -- Region coordinates for future Phase 2 (nullable for now)
    region JSONB DEFAULT NULL,               -- {x, y, width, height} for zoom-to-region
    
    -- Audit fields
    created_by TEXT NOT NULL DEFAULT 'System',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if table already exists (safe to run multiple times)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drawing_links' AND column_name = 'sharepoint_file_id') THEN
        ALTER TABLE drawing_links ADD COLUMN sharepoint_file_id TEXT DEFAULT NULL;
    END IF;
END $$;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_drawing_links_project ON drawing_links(project_id);
CREATE INDEX IF NOT EXISTS idx_drawing_links_label ON drawing_links(label);

-- Enable RLS
ALTER TABLE drawing_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow authenticated users to read all drawing links
CREATE POLICY "drawing_links_select_policy" ON drawing_links
    FOR SELECT USING (true);

-- Allow authenticated users to insert drawing links
CREATE POLICY "drawing_links_insert_policy" ON drawing_links
    FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update drawing links
CREATE POLICY "drawing_links_update_policy" ON drawing_links
    FOR UPDATE USING (true);

-- Allow authenticated users to delete drawing links
CREATE POLICY "drawing_links_delete_policy" ON drawing_links
    FOR DELETE USING (true);

-- ============================================================================
-- DEFAULT PRESET LABELS
-- These are the standard quick-access links available for each project
-- ============================================================================

-- Function to initialize default preset links for a project
-- Note: These are just label placeholders - users will configure the actual page numbers
CREATE OR REPLACE FUNCTION initialize_drawing_link_presets(p_project_id UUID, p_created_by TEXT DEFAULT 'System')
RETURNS SETOF drawing_links AS $$
DECLARE
    preset_labels TEXT[] := ARRAY['Shear Schedule', 'Window Schedule', 'Door Schedule', 'Set Sequence'];
    label_item TEXT;
BEGIN
    -- Check if project already has preset links
    IF EXISTS (SELECT 1 FROM drawing_links WHERE project_id = p_project_id AND is_preset = true) THEN
        RETURN QUERY SELECT * FROM drawing_links WHERE project_id = p_project_id ORDER BY created_at;
        RETURN;
    END IF;
    
    -- Create preset link placeholders (without package_path - to be configured by user)
    FOREACH label_item IN ARRAY preset_labels
    LOOP
        INSERT INTO drawing_links (project_id, package_path, page_number, label, is_preset, created_by)
        VALUES (p_project_id, '', 1, label_item, true, p_created_by);
    END LOOP;
    
    RETURN QUERY SELECT * FROM drawing_links WHERE project_id = p_project_id ORDER BY created_at;
END;
$$ LANGUAGE plpgsql;

-- Function to get all drawing links for a project
CREATE OR REPLACE FUNCTION get_drawing_links(p_project_id UUID)
RETURNS TABLE (
    id UUID,
    project_id UUID,
    package_path TEXT,
    sharepoint_file_id TEXT,
    page_number INTEGER,
    label TEXT,
    description TEXT,
    is_preset BOOLEAN,
    region JSONB,
    created_by TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dl.id,
        dl.project_id,
        dl.package_path,
        dl.sharepoint_file_id,
        dl.page_number,
        dl.label,
        dl.description,
        dl.is_preset,
        dl.region,
        dl.created_by,
        dl.created_at,
        dl.updated_at
    FROM drawing_links dl
    WHERE dl.project_id = p_project_id
    ORDER BY dl.is_preset DESC, dl.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE drawing_links IS 'Quick-access links to specific pages within permit drawing packages';
COMMENT ON COLUMN drawing_links.package_path IS 'SharePoint path or storage path to the PDF file';
COMMENT ON COLUMN drawing_links.sharepoint_file_id IS 'SharePoint file ID for direct API access';
COMMENT ON COLUMN drawing_links.page_number IS '1-indexed page number within the PDF';
COMMENT ON COLUMN drawing_links.label IS 'Display label for the link (e.g., Shear Schedule)';
COMMENT ON COLUMN drawing_links.is_preset IS 'True for default preset links (Shear Schedule, Window Schedule, etc.)';
COMMENT ON COLUMN drawing_links.region IS 'Future: JSON coordinates for zoom-to-region functionality';
