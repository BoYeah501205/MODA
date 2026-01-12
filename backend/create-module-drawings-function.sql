-- ============================================================================
-- MODULE DRAWINGS QUERY FUNCTION
-- Get all shop drawings for a module by serial number
-- ============================================================================

-- Function to get module shop drawings by serial number
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
    project_name TEXT,
    module_id UUID,
    module_serial TEXT
) AS $$
BEGIN
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
        p.name AS project_name,
        m.id AS module_id,
        m.serial_number AS module_serial
    FROM drawing_files df
    INNER JOIN drawing_versions dv ON df.id = dv.drawing_file_id
    INNER JOIN projects p ON df.project_id = p.id
    INNER JOIN modules m ON p.id = m.project_id
    WHERE 
        df.category = 'shop-drawings'
        AND df.discipline ILIKE '%module%package%'
        AND m.serial_number = p_serial_number
        AND (
            -- Match by folder name pattern (serialNumber | BLM)
            df.name ILIKE '%' || m.serial_number || '%'
            OR
            -- Match by SharePoint folder path
            df.sharepoint_folder_path ILIKE '%' || m.serial_number || '%'
        )
    ORDER BY df.name, dv.uploaded_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if module has shop drawings
CREATE OR REPLACE FUNCTION module_has_shop_drawings(
    p_serial_number TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM drawing_files df
    INNER JOIN projects p ON df.project_id = p.id
    INNER JOIN modules m ON p.id = m.project_id
    WHERE 
        df.category = 'shop-drawings'
        AND df.discipline ILIKE '%module%package%'
        AND m.serial_number = p_serial_number
        AND (
            df.name ILIKE '%' || m.serial_number || '%'
            OR
            df.sharepoint_folder_path ILIKE '%' || m.serial_number || '%'
        );
    
    RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get module info by serial number
CREATE OR REPLACE FUNCTION get_module_by_serial(
    p_serial_number TEXT
)
RETURNS TABLE (
    module_id UUID,
    serial_number TEXT,
    blm_id TEXT,
    hitch_blm TEXT,
    rear_blm TEXT,
    unit_type TEXT,
    build_sequence INTEGER,
    project_id UUID,
    project_name TEXT,
    project_location TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id AS module_id,
        m.serial_number,
        m.blm_id,
        m.hitch_blm,
        m.rear_blm,
        m.unit_type,
        m.build_sequence,
        p.id AS project_id,
        p.name AS project_name,
        p.location AS project_location
    FROM modules m
    INNER JOIN projects p ON m.project_id = p.id
    WHERE m.serial_number = p_serial_number
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_module_shop_drawings(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION module_has_shop_drawings(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_module_by_serial(TEXT) TO authenticated;

-- Comments
COMMENT ON FUNCTION get_module_shop_drawings IS 'Get all shop drawing packages for a module by serial number';
COMMENT ON FUNCTION module_has_shop_drawings IS 'Check if a module has any shop drawing packages';
COMMENT ON FUNCTION get_module_by_serial IS 'Get module information by serial number';
