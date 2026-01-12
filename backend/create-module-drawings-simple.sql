-- ============================================================================
-- SIMPLIFIED MODULE DRAWINGS QUERY FUNCTIONS
-- Works without requiring a modules table - matches by BLM in file names
-- ============================================================================

-- Function to get module shop drawings by serial number or BLM
CREATE OR REPLACE FUNCTION get_module_shop_drawings(
    p_serial_number TEXT
)
RETURNS TABLE (
    drawing_id UUID,
    drawing_name TEXT,
    drawing_description TEXT,
    version_id UUID,
    version_number TEXT,
    file_name TEXT,
    file_size BIGINT,
    file_url TEXT,
    storage_path TEXT,
    storage_type TEXT,
    sharepoint_file_id TEXT,
    uploaded_at TIMESTAMPTZ,
    uploaded_by TEXT,
    notes TEXT,
    project_id UUID,
    project_name TEXT
) AS $$
BEGIN
    -- Match drawings in Module Packages by file name containing serial number or BLM
    RETURN QUERY
    SELECT 
        df.id AS drawing_id,
        df.name AS drawing_name,
        df.description AS drawing_description,
        dv.id AS version_id,
        dv.version AS version_number,
        dv.file_name,
        dv.file_size,
        dv.file_url,
        dv.storage_path,
        dv.storage_type,
        dv.sharepoint_file_id,
        dv.uploaded_at,
        dv.uploaded_by,
        dv.notes,
        p.id AS project_id,
        p.name AS project_name
    FROM drawing_files df
    INNER JOIN drawing_versions dv ON df.id = dv.drawing_file_id
    INNER JOIN projects p ON df.project_id = p.id
    WHERE 
        df.category = 'shop-drawings'
        AND df.discipline ILIKE '%module%package%'
        AND (
            -- Match by file name containing serial number
            df.name ILIKE '%' || p_serial_number || '%'
            OR
            -- Match by file name containing BLM pattern (extract from serial if needed)
            -- This will match "B1L3M23 - Shops.pdf" when searching for module with BLM B1L3M23
            df.name ~* '[Bb][0-9]+[Ll][0-9]+[Mm][0-9]+'
        )
    ORDER BY df.name, dv.uploaded_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if module has shop drawings (by serial or BLM)
CREATE OR REPLACE FUNCTION module_has_shop_drawings(
    p_serial_number TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM drawing_files df
    WHERE 
        df.category = 'shop-drawings'
        AND df.discipline ILIKE '%module%package%'
        AND df.name ILIKE '%' || p_serial_number || '%';
    
    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_module_shop_drawings(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION module_has_shop_drawings(TEXT) TO authenticated;

-- Comments
COMMENT ON FUNCTION get_module_shop_drawings IS 'Get all shop drawing packages for a module by serial number or BLM (simplified version)';
COMMENT ON FUNCTION module_has_shop_drawings IS 'Check if a module has any shop drawing packages (simplified version)';
