-- ============================================================================
-- PERMIT SHEET VERSIONING SCHEMA
-- ============================================================================
-- Extends the drawings system to support sheet-level version tracking for
-- permit drawing packages. When update packages are uploaded, individual
-- sheets are matched by sheet number (OCR) and tracked across versions.
--
-- Key Concepts:
-- - Package = A PDF upload (full set or update set)
-- - Sheet = Individual page within a package, identified by sheet_number
-- - Sheet Version = A specific revision of a sheet (tracked by revision field)
-- - Compiled Package = Virtual assembly of latest sheet versions
-- ============================================================================

-- ============================================================================
-- TABLE: permit_packages
-- Tracks uploaded permit drawing packages (full sets and updates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS permit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    drawing_file_id UUID REFERENCES drawing_files(id) ON DELETE SET NULL,
    discipline TEXT NOT NULL, -- e.g., 'structural-plans', 'mechanical', etc.
    
    -- Package identification
    package_name TEXT NOT NULL, -- e.g., "Structural Plans Submittal"
    package_version TEXT NOT NULL, -- e.g., "v1.0", "v1.1", "v2.0"
    package_type TEXT NOT NULL DEFAULT 'full', -- 'full' = complete set, 'update' = partial update
    
    -- Package metadata from title block
    job_number TEXT, -- e.g., "A24-082"
    package_date DATE,
    
    -- Storage
    storage_path TEXT,
    file_size BIGINT,
    total_sheets INTEGER,
    
    -- Processing status
    ocr_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    ocr_processed_at TIMESTAMPTZ,
    ocr_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by TEXT,
    
    -- Soft delete
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_permit_packages_project ON permit_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_permit_packages_discipline ON permit_packages(discipline);
CREATE INDEX IF NOT EXISTS idx_permit_packages_version ON permit_packages(package_version);
CREATE INDEX IF NOT EXISTS idx_permit_packages_not_deleted ON permit_packages(project_id, discipline) WHERE NOT is_deleted;

-- ============================================================================
-- TABLE: permit_sheet_versions
-- Individual sheets extracted from packages with version tracking
-- Sheet number (e.g., "S0.01M") is the primary matching key
-- ============================================================================
CREATE TABLE IF NOT EXISTS permit_sheet_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    package_id UUID NOT NULL REFERENCES permit_packages(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Sheet identification (PRIMARY MATCHING KEY)
    sheet_number TEXT NOT NULL, -- e.g., "S0.01M", "S1.01", "XE-B1L2M01-01"
    sheet_number_normalized TEXT, -- Uppercase, no spaces for matching
    
    -- Sheet metadata from title block (OCR extracted)
    sheet_title TEXT, -- e.g., "STRUCTURAL COVER SHEET"
    revision TEXT, -- e.g., "A", "B", "1", "2"
    revision_date DATE,
    drawn_by TEXT,
    checked_by TEXT,
    designed_by TEXT,
    
    -- Discipline detection
    discipline_code TEXT, -- e.g., "S" for Structural
    discipline_name TEXT, -- e.g., "Structural"
    
    -- Page info
    page_number INTEGER NOT NULL, -- Page number within source package (1-based)
    
    -- Storage
    storage_path TEXT NOT NULL,
    file_size BIGINT,
    thumbnail_path TEXT,
    
    -- OCR metadata
    ocr_confidence DECIMAL(5,2),
    ocr_raw_text TEXT,
    ocr_metadata JSONB DEFAULT '{}',
    
    -- Version tracking
    is_current BOOLEAN DEFAULT true, -- Is this the latest version of this sheet?
    superseded_by UUID REFERENCES permit_sheet_versions(id),
    supersedes UUID REFERENCES permit_sheet_versions(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_sheet_per_package UNIQUE(package_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_permit_sheets_package ON permit_sheet_versions(package_id);
CREATE INDEX IF NOT EXISTS idx_permit_sheets_project ON permit_sheet_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_permit_sheets_number ON permit_sheet_versions(sheet_number);
CREATE INDEX IF NOT EXISTS idx_permit_sheets_normalized ON permit_sheet_versions(sheet_number_normalized);
CREATE INDEX IF NOT EXISTS idx_permit_sheets_current ON permit_sheet_versions(project_id, sheet_number_normalized, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_permit_sheets_discipline ON permit_sheet_versions(discipline_code);

-- ============================================================================
-- FUNCTION: normalize_sheet_number
-- ============================================================================
CREATE OR REPLACE FUNCTION normalize_sheet_number(raw_number TEXT)
RETURNS TEXT AS $$
BEGIN
    IF raw_number IS NULL THEN RETURN NULL; END IF;
    RETURN upper(trim(regexp_replace(raw_number, '\s+', '', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- FUNCTION: parse_discipline_from_sheet_number
-- ============================================================================
CREATE OR REPLACE FUNCTION parse_discipline_from_sheet_number(sheet_number TEXT)
RETURNS TABLE (code TEXT, name TEXT) AS $$
DECLARE
    prefix TEXT;
BEGIN
    IF sheet_number IS NULL THEN RETURN; END IF;
    prefix := upper(substring(sheet_number FROM '^([A-Za-z]+)'));
    
    RETURN QUERY
    SELECT 
        prefix,
        CASE prefix
            WHEN 'S' THEN 'Structural'
            WHEN 'A' THEN 'Architectural'
            WHEN 'M' THEN 'Mechanical'
            WHEN 'P' THEN 'Plumbing'
            WHEN 'E' THEN 'Electrical'
            WHEN 'F' THEN 'Fire Protection'
            WHEN 'XS' THEN 'Structural'
            WHEN 'XA' THEN 'Architectural'
            WHEN 'XM' THEN 'Mechanical'
            WHEN 'XP' THEN 'Plumbing'
            WHEN 'XE' THEN 'Electrical'
            WHEN 'XF' THEN 'Fire Protection'
            WHEN 'FA' THEN 'Fire Alarm'
            WHEN 'FS' THEN 'Fire Sprinkler'
            WHEN 'T' THEN 'Title 24'
            WHEN 'C' THEN 'Civil'
            ELSE 'General'
        END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- FUNCTION: get_current_sheets
-- Returns the current (latest) version of all sheets for a project/discipline
-- ============================================================================
CREATE OR REPLACE FUNCTION get_current_sheets(
    p_project_id UUID,
    p_discipline TEXT DEFAULT NULL
)
RETURNS TABLE (
    sheet_id UUID,
    package_id UUID,
    package_name TEXT,
    package_version TEXT,
    sheet_number TEXT,
    sheet_title TEXT,
    revision TEXT,
    revision_date DATE,
    discipline_code TEXT,
    discipline_name TEXT,
    storage_path TEXT,
    file_size BIGINT,
    ocr_confidence DECIMAL,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        psv.id,
        psv.package_id,
        pp.package_name,
        pp.package_version,
        psv.sheet_number,
        psv.sheet_title,
        psv.revision,
        psv.revision_date,
        psv.discipline_code,
        psv.discipline_name,
        psv.storage_path,
        psv.file_size,
        psv.ocr_confidence,
        psv.created_at
    FROM permit_sheet_versions psv
    INNER JOIN permit_packages pp ON psv.package_id = pp.id
    WHERE psv.project_id = p_project_id
      AND psv.is_current = true
      AND NOT pp.is_deleted
      AND (p_discipline IS NULL OR pp.discipline = p_discipline)
    ORDER BY psv.sheet_number_normalized;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_sheet_history
-- Returns all versions of a specific sheet
-- ============================================================================
CREATE OR REPLACE FUNCTION get_sheet_history(
    p_project_id UUID,
    p_sheet_number TEXT
)
RETURNS TABLE (
    sheet_id UUID,
    package_id UUID,
    package_name TEXT,
    package_version TEXT,
    sheet_number TEXT,
    sheet_title TEXT,
    revision TEXT,
    revision_date DATE,
    is_current BOOLEAN,
    storage_path TEXT,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    normalized TEXT;
BEGIN
    normalized := normalize_sheet_number(p_sheet_number);
    
    RETURN QUERY
    SELECT 
        psv.id,
        psv.package_id,
        pp.package_name,
        pp.package_version,
        psv.sheet_number,
        psv.sheet_title,
        psv.revision,
        psv.revision_date,
        psv.is_current,
        psv.storage_path,
        psv.created_at
    FROM permit_sheet_versions psv
    INNER JOIN permit_packages pp ON psv.package_id = pp.id
    WHERE psv.project_id = p_project_id
      AND psv.sheet_number_normalized = normalized
      AND NOT pp.is_deleted
    ORDER BY psv.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: process_sheet_update
-- When a new sheet is uploaded, mark previous versions as superseded
-- ============================================================================
CREATE OR REPLACE FUNCTION process_sheet_update(
    p_new_sheet_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_project_id UUID;
    v_normalized TEXT;
    v_old_sheet_id UUID;
BEGIN
    -- Get the new sheet's project and normalized number
    SELECT project_id, sheet_number_normalized 
    INTO v_project_id, v_normalized
    FROM permit_sheet_versions 
    WHERE id = p_new_sheet_id;
    
    -- Find the previous current version (if any)
    SELECT id INTO v_old_sheet_id
    FROM permit_sheet_versions
    WHERE project_id = v_project_id
      AND sheet_number_normalized = v_normalized
      AND is_current = true
      AND id != p_new_sheet_id
    LIMIT 1;
    
    -- If there was a previous version, update the chain
    IF v_old_sheet_id IS NOT NULL THEN
        -- Mark old as superseded
        UPDATE permit_sheet_versions
        SET is_current = false,
            superseded_by = p_new_sheet_id,
            updated_at = NOW()
        WHERE id = v_old_sheet_id;
        
        -- Link new to old
        UPDATE permit_sheet_versions
        SET supersedes = v_old_sheet_id
        WHERE id = p_new_sheet_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-normalize sheet number on insert/update
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_normalize_sheet_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sheet_number_normalized := normalize_sheet_number(NEW.sheet_number);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_permit_sheet_normalize
    BEFORE INSERT OR UPDATE ON permit_sheet_versions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_normalize_sheet_number();

-- ============================================================================
-- TRIGGER: Auto-update package timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_update_permit_package_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_permit_package_timestamp
    BEFORE UPDATE ON permit_packages
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_permit_package_timestamp();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE permit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE permit_sheet_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on permit_packages"
    ON permit_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on permit_packages"
    ON permit_packages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on permit_packages"
    ON permit_packages FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete on permit_packages"
    ON permit_packages FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on permit_sheet_versions"
    ON permit_sheet_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert on permit_sheet_versions"
    ON permit_sheet_versions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update on permit_sheet_versions"
    ON permit_sheet_versions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete on permit_sheet_versions"
    ON permit_sheet_versions FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT ALL ON permit_packages TO authenticated;
GRANT ALL ON permit_sheet_versions TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE permit_packages IS 'Uploaded permit drawing packages (full sets and updates)';
COMMENT ON TABLE permit_sheet_versions IS 'Individual sheets with version tracking by sheet number';
COMMENT ON FUNCTION get_current_sheets IS 'Returns latest version of all sheets for compiled package view';
COMMENT ON FUNCTION get_sheet_history IS 'Returns all versions of a specific sheet for history view';
COMMENT ON FUNCTION process_sheet_update IS 'Marks previous sheet versions as superseded when new version uploaded';
