-- ============================================================================
-- FIX DRAWING SHEETS SCHEMA
-- Run this in Supabase SQL Editor to fix missing columns
-- https://supabase.com/dashboard/project/syreuphexagezawjyjgt/sql/new
-- ============================================================================

-- 0. First, drop the problematic foreign key constraint if it exists
ALTER TABLE drawing_sheets DROP CONSTRAINT IF EXISTS drawing_sheets_drawing_file_id_fkey;

-- 1. Add all potentially missing columns to drawing_sheets (WITHOUT foreign key)
ALTER TABLE drawing_sheets 
ADD COLUMN IF NOT EXISTS drawing_file_id UUID,
ADD COLUMN IF NOT EXISTS hitch_blm TEXT,
ADD COLUMN IF NOT EXISTS rear_blm TEXT,
ADD COLUMN IF NOT EXISTS hitch_unit TEXT,
ADD COLUMN IF NOT EXISTS rear_unit TEXT,
ADD COLUMN IF NOT EXISTS hitch_room_type TEXT,
ADD COLUMN IF NOT EXISTS rear_room_type TEXT,
ADD COLUMN IF NOT EXISTS difficulty_notes TEXT[];

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_drawing_file_id ON drawing_sheets(drawing_file_id);
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_hitch_blm ON drawing_sheets(hitch_blm);
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_rear_blm ON drawing_sheets(rear_blm);
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_hitch_room_type ON drawing_sheets(hitch_room_type);
CREATE INDEX IF NOT EXISTS idx_drawing_sheets_rear_room_type ON drawing_sheets(rear_room_type);

-- 3. Populate drawing_file_id from drawing_id (they should match for existing records)
UPDATE drawing_sheets 
SET drawing_file_id = drawing_id 
WHERE drawing_file_id IS NULL AND drawing_id IS NOT NULL;

-- 4. Add foreign key to drawings table (not drawing_files)
ALTER TABLE drawing_sheets 
ADD CONSTRAINT drawing_sheets_drawing_file_id_fkey 
FOREIGN KEY (drawing_file_id) REFERENCES drawings(id) ON DELETE CASCADE;

-- 5. Drop and recreate the search function with correct column references
DROP FUNCTION IF EXISTS search_drawing_sheets(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER);

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
        COALESCE(ds.drawing_file_id, ds.drawing_id) AS drawing_file_id,
        d.name AS drawing_file_name,
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
    INNER JOIN drawings d ON COALESCE(ds.drawing_file_id, ds.drawing_id) = d.id
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
    ORDER BY d.name, ds.sheet_number
    LIMIT p_limit;
END;
$function$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION search_drawing_sheets TO authenticated;
GRANT EXECUTE ON FUNCTION search_drawing_sheets TO anon;

-- 7. Verify the fix
SELECT 'Schema fix complete. Columns added:' AS status;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'drawing_sheets' 
AND column_name IN ('drawing_file_id', 'hitch_blm', 'rear_blm', 'hitch_unit', 'rear_unit', 'hitch_room_type', 'rear_room_type', 'difficulty_notes')
ORDER BY column_name;
