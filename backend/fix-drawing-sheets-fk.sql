-- ============================================================================
-- FIX DRAWING SHEETS FOREIGN KEY REFERENCES
-- ============================================================================
-- The main drawings table is 'drawings', not 'drawing_files'.
-- This script fixes the FK references in drawing_sheets and sheet_extraction_jobs.
-- Run this in Supabase SQL Editor.
-- ============================================================================

-- Drop existing tables if they exist (they have wrong FK references)
DROP TABLE IF EXISTS drawing_sheets CASCADE;
DROP TABLE IF EXISTS sheet_extraction_jobs CASCADE;

-- ============================================================================
-- TABLE: drawing_sheets
-- Individual sheets extracted from multi-page PDF packages
-- ============================================================================
CREATE TABLE IF NOT EXISTS drawing_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationship to parent drawing (references 'drawings' table, not 'drawing_files')
    drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Sheet identification
    sheet_number INTEGER NOT NULL, -- Page number in original PDF (1-based)
    sheet_name TEXT, -- e.g., "Cover Sheet", "S-1", "M-2"
    sheet_title TEXT, -- e.g., "HITCH / PULL-POINT LOCATIONS"
    
    -- Storage
    storage_path TEXT NOT NULL, -- Path in Supabase Storage for individual sheet PDF
    file_size BIGINT,
    
    -- OCR metadata from title block
    ocr_metadata JSONB DEFAULT '{}', -- Full OCR extraction result
    ocr_confidence DECIMAL(5,2), -- 0-100 confidence score
    ocr_processed_at TIMESTAMPTZ,
    
    -- Parsed fields from title block
    blm_type TEXT, -- Module type from title block (e.g., "C1", "B2", "SW")
    discipline TEXT, -- e.g., "Mechanical", "Electrical", "Plumbing", "Structural"
    scale TEXT, -- e.g., "1/4\" = 1'-0\"", "N/A"
    drawing_date DATE,
    revision TEXT,
    drawn_by TEXT,
    checked_by TEXT,
    
    -- Module linking (auto-linked based on filename and BLM matching)
    linked_module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_sheet_per_drawing UNIQUE(drawing_id, sheet_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_drawing ON drawing_sheets(drawing_id);
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_project ON drawing_sheets(project_id);
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_module ON drawing_sheets(linked_module_id);
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_blm_type ON drawing_sheets(blm_type);
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_discipline ON drawing_sheets(discipline);
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_sheet_name ON drawing_sheets(sheet_name);

-- Full-text search on sheet titles
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_title_search ON drawing_sheets USING gin(to_tsvector('english', sheet_title));

-- ============================================================================
-- TABLE: sheet_extraction_jobs
-- Track PDF splitting and OCR processing jobs
-- ============================================================================
CREATE TABLE IF NOT EXISTS sheet_extraction_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
    
    -- Job status
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    total_sheets INTEGER,
    processed_sheets INTEGER DEFAULT 0,
    
    -- Error tracking
    error_message TEXT,
    error_details JSONB,
    
    -- Processing metadata
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    processing_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extraction_jobs_drawing ON sheet_extraction_jobs(drawing_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_status ON sheet_extraction_jobs(status);

-- ============================================================================
-- FUNCTION: auto_link_sheet_to_module
-- Automatically link a sheet to a module based on sheet number and BLM matching
-- ============================================================================
DROP FUNCTION IF EXISTS auto_link_sheet_to_module(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION auto_link_sheet_to_module(
    p_sheet_id UUID,
    p_project_id UUID,
    p_sheet_number TEXT,
    p_blm_type TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_module_id UUID;
    v_parsed_module TEXT;
BEGIN
    -- Try to parse module identifier from sheet number (e.g., XS-B1L2M15-01 -> B1L2M15)
    v_parsed_module := (
        SELECT substring(p_sheet_number FROM '([Bb]\d+[Ll]\d+[Mm]\d+)')
    );
    
    IF v_parsed_module IS NOT NULL THEN
        -- Normalize to uppercase
        v_parsed_module := upper(v_parsed_module);
        
        -- Find matching module
        SELECT id INTO v_module_id
        FROM modules
        WHERE project_id = p_project_id
          AND upper(module_id) = v_parsed_module
        LIMIT 1;
    END IF;
    
    -- If no match by sheet number, try BLM type matching
    IF v_module_id IS NULL AND p_blm_type IS NOT NULL THEN
        SELECT id INTO v_module_id
        FROM modules
        WHERE project_id = p_project_id
          AND unit_type = p_blm_type
        LIMIT 1;
    END IF;
    
    -- Update sheet with linked module
    IF v_module_id IS NOT NULL THEN
        UPDATE drawing_sheets
        SET linked_module_id = v_module_id,
            updated_at = NOW()
        WHERE id = p_sheet_id;
    END IF;
    
    RETURN v_module_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE drawing_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_extraction_jobs ENABLE ROW LEVEL SECURITY;

-- Drawing sheets policies
CREATE POLICY "Allow authenticated read on drawing_sheets"
    ON drawing_sheets FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert on drawing_sheets"
    ON drawing_sheets FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update on drawing_sheets"
    ON drawing_sheets FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated delete on drawing_sheets"
    ON drawing_sheets FOR DELETE
    TO authenticated
    USING (true);

-- Extraction jobs policies
CREATE POLICY "Allow authenticated read on extraction_jobs"
    ON sheet_extraction_jobs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert on extraction_jobs"
    ON sheet_extraction_jobs FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update on extraction_jobs"
    ON sheet_extraction_jobs FOR UPDATE
    TO authenticated
    USING (true);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT ALL ON drawing_sheets TO authenticated;
GRANT ALL ON sheet_extraction_jobs TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE drawing_sheets IS 'Individual sheets extracted from multi-page shop drawing packages';
COMMENT ON TABLE sheet_extraction_jobs IS 'Track PDF splitting and OCR processing jobs';
COMMENT ON FUNCTION auto_link_sheet_to_module IS 'Automatically link a sheet to a module based on sheet number and BLM matching';
