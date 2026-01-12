-- ============================================================================
-- UPDATE DRAWING SHEETS SCHEMA
-- Add support for room types and improve module integration
-- ============================================================================

-- Add room type columns to drawing_sheets
ALTER TABLE drawing_sheets 
ADD COLUMN IF NOT EXISTS hitch_blm TEXT,
ADD COLUMN IF NOT EXISTS rear_blm TEXT,
ADD COLUMN IF NOT EXISTS hitch_unit TEXT,
ADD COLUMN IF NOT EXISTS rear_unit TEXT,
ADD COLUMN IF NOT EXISTS hitch_room_type TEXT,
ADD COLUMN IF NOT EXISTS rear_room_type TEXT,
ADD COLUMN IF NOT EXISTS difficulty_notes TEXT[];

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_hitch_blm ON drawing_sheets(hitch_blm);
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_rear_blm ON drawing_sheets(rear_blm);
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_hitch_room_type ON drawing_sheets(hitch_room_type);
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_rear_room_type ON drawing_sheets(rear_room_type);

-- Update search function to include room types and better module integration
CREATE OR REPLACE FUNCTION search_drawing_sheets(
    p_project_id UUID,
    p_module_id UUID DEFAULT NULL,
    p_unit_type TEXT DEFAULT NULL,
    p_room_type TEXT DEFAULT NULL,
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
    hitch_blm TEXT,
    rear_blm TEXT,
    hitch_unit TEXT,
    rear_unit TEXT,
    hitch_room_type TEXT,
    rear_room_type TEXT,
    discipline TEXT,
    scale TEXT,
    storage_path TEXT,
    file_size BIGINT,
    linked_module_id UUID,
    module_serial TEXT,
    difficulty_notes TEXT[],
    ocr_confidence DECIMAL
) 
LANGUAGE plpgsql
AS $function$
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
        ds.hitch_blm,
        ds.rear_blm,
        ds.hitch_unit,
        ds.rear_unit,
        ds.hitch_room_type,
        ds.rear_room_type,
        ds.discipline,
        ds.scale,
        ds.storage_path,
        ds.file_size,
        ds.linked_module_id,
        m.serial_number AS module_serial,
        ds.difficulty_notes,
        ds.ocr_confidence
    FROM drawing_sheets ds
    INNER JOIN drawing_files df ON ds.drawing_file_id = df.id
    LEFT JOIN modules m ON ds.linked_module_id = m.id
    WHERE 
        ds.project_id = p_project_id
        AND (p_module_id IS NULL OR ds.linked_module_id = p_module_id)
        AND (p_unit_type IS NULL OR 
             ds.hitch_unit ILIKE '%' || p_unit_type || '%' OR 
             ds.rear_unit ILIKE '%' || p_unit_type || '%')
        AND (p_room_type IS NULL OR 
             ds.hitch_room_type ILIKE '%' || p_room_type || '%' OR 
             ds.rear_room_type ILIKE '%' || p_room_type || '%')
        AND (p_discipline IS NULL OR ds.discipline ILIKE '%' || p_discipline || '%')
        AND (p_blm_type IS NULL OR 
             ds.blm_type = p_blm_type OR
             ds.hitch_blm = p_blm_type OR
             ds.rear_blm = p_blm_type)
        AND (p_search_text IS NULL OR 
             ds.sheet_title ILIKE '%' || p_search_text || '%' OR
             ds.sheet_name ILIKE '%' || p_search_text || '%')
    ORDER BY df.name, ds.sheet_number
    LIMIT p_limit;
END;
$function$;

-- Function to get unique unit types from sheets
CREATE OR REPLACE FUNCTION get_sheet_unit_types(p_project_id UUID)
RETURNS TABLE (unit_type TEXT)
LANGUAGE sql
AS $$
    SELECT DISTINCT unnest(ARRAY[hitch_unit, rear_unit]) AS unit_type
    FROM drawing_sheets
    WHERE project_id = p_project_id
      AND (hitch_unit IS NOT NULL OR rear_unit IS NOT NULL)
    ORDER BY unit_type;
$$;

-- Function to get unique room types from sheets
CREATE OR REPLACE FUNCTION get_sheet_room_types(p_project_id UUID)
RETURNS TABLE (room_type TEXT)
LANGUAGE sql
AS $$
    SELECT DISTINCT unnest(ARRAY[hitch_room_type, rear_room_type]) AS room_type
    FROM drawing_sheets
    WHERE project_id = p_project_id
      AND (hitch_room_type IS NOT NULL OR rear_room_type IS NOT NULL)
    ORDER BY room_type;
$$;

-- Function to get unique BLM types from sheets
CREATE OR REPLACE FUNCTION get_sheet_blm_types(p_project_id UUID)
RETURNS TABLE (blm_type TEXT)
LANGUAGE sql
AS $$
    SELECT DISTINCT unnest(ARRAY[blm_type, hitch_blm, rear_blm]) AS blm_type
    FROM drawing_sheets
    WHERE project_id = p_project_id
      AND (blm_type IS NOT NULL OR hitch_blm IS NOT NULL OR rear_blm IS NOT NULL)
    ORDER BY blm_type;
$$;

COMMENT ON FUNCTION search_drawing_sheets IS 'Advanced search with room type and combined BLM filtering';
COMMENT ON FUNCTION get_sheet_unit_types IS 'Get all unique unit types from sheets in a project';
COMMENT ON FUNCTION get_sheet_room_types IS 'Get all unique room types from sheets in a project';
COMMENT ON FUNCTION get_sheet_blm_types IS 'Get all unique BLM types from sheets in a project';
