-- ============================================================================
-- DRAWING LINKS PRE-EXTRACTION COLUMNS
-- Adds support for pre-extracted PDF pages stored in SharePoint
-- Run this migration after create-drawing-links-table.sql
-- ============================================================================

-- Add columns for pre-extracted file storage
DO $$ 
BEGIN
    -- Extracted file ID in SharePoint (the pre-extracted single-page PDF)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drawing_links' AND column_name = 'extracted_file_id') THEN
        ALTER TABLE drawing_links ADD COLUMN extracted_file_id TEXT DEFAULT NULL;
        COMMENT ON COLUMN drawing_links.extracted_file_id IS 'SharePoint file ID of the pre-extracted page(s) PDF';
    END IF;
    
    -- Timestamp when extraction was performed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drawing_links' AND column_name = 'extracted_at') THEN
        ALTER TABLE drawing_links ADD COLUMN extracted_at TIMESTAMPTZ DEFAULT NULL;
        COMMENT ON COLUMN drawing_links.extracted_at IS 'When the page extraction was performed';
    END IF;
    
    -- Source version tracking (to detect when source PDF changes)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drawing_links' AND column_name = 'source_version_id') THEN
        ALTER TABLE drawing_links ADD COLUMN source_version_id TEXT DEFAULT NULL;
        COMMENT ON COLUMN drawing_links.source_version_id IS 'Version ID of source PDF used for extraction (to detect staleness)';
    END IF;
    
    -- Extraction status for UI feedback
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drawing_links' AND column_name = 'extraction_status') THEN
        ALTER TABLE drawing_links ADD COLUMN extraction_status TEXT DEFAULT NULL;
        COMMENT ON COLUMN drawing_links.extraction_status IS 'Status: pending, extracting, ready, failed, stale';
    END IF;
END $$;

-- Update the get_drawing_links function to include new columns
CREATE OR REPLACE FUNCTION get_drawing_links(p_project_id UUID)
RETURNS TABLE (
    id UUID,
    project_id UUID,
    package_path TEXT,
    sharepoint_file_id TEXT,
    page_number TEXT,
    label TEXT,
    description TEXT,
    is_preset BOOLEAN,
    region JSONB,
    extracted_file_id TEXT,
    extracted_at TIMESTAMPTZ,
    source_version_id TEXT,
    extraction_status TEXT,
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
        dl.page_number::TEXT,
        dl.label,
        dl.description,
        dl.is_preset,
        dl.region,
        dl.extracted_file_id,
        dl.extracted_at,
        dl.source_version_id,
        dl.extraction_status,
        dl.created_by,
        dl.created_at,
        dl.updated_at
    FROM drawing_links dl
    WHERE dl.project_id = p_project_id
    ORDER BY dl.is_preset DESC, dl.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DRAWING LINKS ARCHIVE TABLE
-- Stores old extracted files when links are updated or deleted
-- ============================================================================

CREATE TABLE IF NOT EXISTS drawing_links_archive (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_link_id UUID NOT NULL,           -- Reference to the original link (may be deleted)
    project_id UUID NOT NULL,
    
    -- Original link data
    label TEXT NOT NULL,
    page_number TEXT,
    extracted_file_id TEXT,                   -- The archived extracted file
    sharepoint_archive_path TEXT,             -- Path in SharePoint _Archive folder
    
    -- Archive metadata
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    archived_by TEXT DEFAULT 'System',
    archive_reason TEXT,                      -- 'updated', 'deleted', 'source_changed'
    
    -- Original timestamps
    original_created_at TIMESTAMPTZ,
    original_extracted_at TIMESTAMPTZ
);

-- Index for querying archives by project
CREATE INDEX IF NOT EXISTS idx_drawing_links_archive_project ON drawing_links_archive(project_id);
CREATE INDEX IF NOT EXISTS idx_drawing_links_archive_link ON drawing_links_archive(original_link_id);

-- Enable RLS
ALTER TABLE drawing_links_archive ENABLE ROW LEVEL SECURITY;

-- RLS Policies for archive table
DROP POLICY IF EXISTS "drawing_links_archive_select_policy" ON drawing_links_archive;
CREATE POLICY "drawing_links_archive_select_policy" ON drawing_links_archive
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "drawing_links_archive_insert_policy" ON drawing_links_archive;
CREATE POLICY "drawing_links_archive_insert_policy" ON drawing_links_archive
    FOR INSERT WITH CHECK (true);

COMMENT ON TABLE drawing_links_archive IS 'Archive of old extracted drawing link files when links are updated or deleted';
