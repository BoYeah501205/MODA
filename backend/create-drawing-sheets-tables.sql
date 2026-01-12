-- ============================================================================
-- DRAWING SHEETS SCHEMA
-- ============================================================================
-- Extends the drawings system to support multi-page PDF packages with
-- individual sheet extraction, OCR metadata, and advanced filtering.
--
-- Usage:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Upload multi-page shop drawing packages
-- 3. System will split PDFs and extract title block metadata via OCR
-- 4. Filter sheets by module, unit type, discipline, BLM type, etc.
-- ============================================================================

-- ============================================================================
-- TABLE: drawing_sheets
-- Individual sheets extracted from multi-page PDF packages
-- ============================================================================
CREATE TABLE IF NOT EXISTS drawing_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationship to parent drawing file
    drawing_file_id UUID NOT NULL REFERENCES drawing_files(id) ON DELETE CASCADE,
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
    
    -- Indexes
    CONSTRAINT unique_sheet_per_drawing UNIQUE(drawing_file_id, sheet_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_drawing_file ON drawing_sheets(drawing_file_id);
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
    drawing_file_id UUID NOT NULL REFERENCES drawing_files(id) ON DELETE CASCADE,
    
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

CREATE INDEX IF NOT EXISTS idx_extraction_jobs_drawing ON sheet_extraction_jobs(drawing_file_id);
CREATE INDEX IF NOT EXISTS idx_extraction_jobs_status ON sheet_extraction_jobs(status);

-- ============================================================================
-- TABLE: module_unit_types
-- Reference table for module unit types (C1, B2, SW, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS module_unit_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- e.g., "C1", "B2", "SW", "ST"
    name TEXT NOT NULL, -- e.g., "Corner Unit Type 1", "Bathroom Type 2"
    description TEXT,
    category TEXT, -- e.g., "Living", "Bathroom", "Stair", "Sidewall"
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common unit types
INSERT INTO module_unit_types (code, name, category) VALUES
    ('C1', 'Corner Unit Type 1', 'Living'),
    ('C2', 'Corner Unit Type 2', 'Living'),
    ('B1', 'Bathroom Type 1', 'Bathroom'),
    ('B2', 'Bathroom Type 2', 'Bathroom'),
    ('SW', 'Sidewall', 'Structural'),
    ('ST', 'Stair Module', 'Stair'),
    ('3HR', '3-Hour Wall', 'Structural'),
    ('DBL', 'Double Studio', 'Living'),
    ('SB', 'Sawbox', 'Structural')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- FUNCTION: search_drawing_sheets
-- Advanced search and filtering for individual sheets
-- ============================================================================
CREATE OR REPLACE FUNCTION search_drawing_sheets(
    p_project_id UUID,
    p_module_id UUID DEFAULT NULL,
    p_unit_type TEXT DEFAULT NULL,
    p_discipline TEXT DEFAULT NULL,
    p_blm_type TEXT DEFAULT NULL,
    p_search_text TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    sheet_id UUID,
    drawing_file_id UUID,
    drawing_file_name TEXT,
    sheet_number INTEGER,
    sheet_name TEXT,
    sheet_title TEXT,
    blm_type TEXT,
    discipline TEXT,
    scale TEXT,
    storage_path TEXT,
    file_size BIGINT,
    linked_module_id UUID,
    module_identifier TEXT,
    ocr_confidence DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ds.id,
        ds.drawing_file_id,
        df.name AS drawing_file_name,
        ds.sheet_number,
        ds.sheet_name,
        ds.sheet_title,
        ds.blm_type,
        ds.discipline,
        ds.scale,
        ds.storage_path,
        ds.file_size,
        ds.linked_module_id,
        m.module_id AS module_identifier,
        ds.ocr_confidence
    FROM drawing_sheets ds
    INNER JOIN drawing_files df ON ds.drawing_file_id = df.id
    LEFT JOIN modules m ON ds.linked_module_id = m.id
    WHERE 
        ds.project_id = p_project_id
        AND (p_module_id IS NULL OR ds.linked_module_id = p_module_id)
        AND (p_unit_type IS NULL OR m.unit_type = p_unit_type)
        AND (p_discipline IS NULL OR ds.discipline ILIKE '%' || p_discipline || '%')
        AND (p_blm_type IS NULL OR ds.blm_type = p_blm_type)
        AND (p_search_text IS NULL OR 
             ds.sheet_title ILIKE '%' || p_search_text || '%' OR
             ds.sheet_name ILIKE '%' || p_search_text || '%')
    ORDER BY df.name, ds.sheet_number
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_sheets_by_unit_type_and_discipline
-- Get all sheets for a specific unit type and discipline combination
-- Example: All C1 Mechanical sheets across all modules
-- ============================================================================
CREATE OR REPLACE FUNCTION get_sheets_by_unit_type_and_discipline(
    p_project_id UUID,
    p_unit_type TEXT,
    p_discipline TEXT
)
RETURNS TABLE (
    sheet_id UUID,
    module_identifier TEXT,
    sheet_name TEXT,
    sheet_title TEXT,
    storage_path TEXT,
    file_size BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ds.id,
        m.module_id,
        ds.sheet_name,
        ds.sheet_title,
        ds.storage_path,
        ds.file_size
    FROM drawing_sheets ds
    INNER JOIN modules m ON ds.linked_module_id = m.id
    WHERE 
        ds.project_id = p_project_id
        AND m.unit_type = p_unit_type
        AND ds.discipline ILIKE '%' || p_discipline || '%'
    ORDER BY m.module_id, ds.sheet_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: auto_link_sheet_to_module
-- Automatically link a sheet to a module based on filename and BLM matching
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_link_sheet_to_module(
    p_sheet_id UUID,
    p_project_id UUID,
    p_drawing_file_name TEXT,
    p_blm_type TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_module_id UUID;
    v_parsed_module TEXT;
BEGIN
    -- Try to parse module identifier from filename (e.g., B1L2M15)
    v_parsed_module := (
        SELECT substring(p_drawing_file_name FROM '([Bb]\d+[Ll]\d+[Mm]\d+)')
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
    
    -- If no match by filename, try BLM type matching
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
-- TRIGGER: Update timestamp on sheet changes
-- ============================================================================
CREATE OR REPLACE FUNCTION update_drawing_sheet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_drawing_sheet_timestamp
    BEFORE UPDATE ON drawing_sheets
    FOR EACH ROW
    EXECUTE FUNCTION update_drawing_sheet_timestamp();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE drawing_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_extraction_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_unit_types ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all sheets
CREATE POLICY "Allow authenticated read on drawing_sheets"
    ON drawing_sheets FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert sheets
CREATE POLICY "Allow authenticated insert on drawing_sheets"
    ON drawing_sheets FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update sheets
CREATE POLICY "Allow authenticated update on drawing_sheets"
    ON drawing_sheets FOR UPDATE
    TO authenticated
    USING (true);

-- Allow authenticated users to delete sheets
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

-- Unit types - read only for all
CREATE POLICY "Allow authenticated read on unit_types"
    ON module_unit_types FOR SELECT
    TO authenticated
    USING (true);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT ALL ON drawing_sheets TO authenticated;
GRANT ALL ON sheet_extraction_jobs TO authenticated;
GRANT SELECT ON module_unit_types TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE drawing_sheets IS 'Individual sheets extracted from multi-page shop drawing packages';
COMMENT ON TABLE sheet_extraction_jobs IS 'Track PDF splitting and OCR processing jobs';
COMMENT ON TABLE module_unit_types IS 'Reference table for module unit types (C1, B2, SW, etc.)';
COMMENT ON FUNCTION search_drawing_sheets IS 'Advanced search and filtering for individual sheets';
COMMENT ON FUNCTION get_sheets_by_unit_type_and_discipline IS 'Get all sheets for a specific unit type and discipline combination';
COMMENT ON FUNCTION auto_link_sheet_to_module IS 'Automatically link a sheet to a module based on filename and BLM matching';
