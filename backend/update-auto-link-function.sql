-- ============================================================================
-- UPDATE AUTO-LINK FUNCTION
-- Improved module linking based on sheet number pattern extraction
-- ============================================================================

-- Drop old version
DROP FUNCTION IF EXISTS auto_link_sheet_to_module(UUID, UUID, TEXT, TEXT);

-- Create improved auto-link function
CREATE OR REPLACE FUNCTION auto_link_sheet_to_module(
    p_sheet_id UUID, 
    p_project_id UUID, 
    p_sheet_number TEXT
)
RETURNS UUID 
LANGUAGE plpgsql
AS $function$
DECLARE
    v_module_id UUID;
    v_blm_pattern TEXT;
BEGIN
    -- Extract BLM ID from sheet number
    -- Pattern: XS-B1L2M15-01 -> B1L2M15
    -- Also handles: B1L2M15-01 -> B1L2M15
    v_blm_pattern := (SELECT substring(p_sheet_number FROM '([Bb]\d+[Ll]\d+[Mm]\d+)'));
    
    IF v_blm_pattern IS NOT NULL THEN
        v_blm_pattern := upper(v_blm_pattern);
        
        -- Try to find module by matching BLM ID in hitch_blm or rear_blm
        -- Note: Modules table structure from Project Directory has blm_id field
        SELECT id INTO v_module_id 
        FROM modules 
        WHERE project_id = p_project_id 
          AND (
            upper(blm_id) = v_blm_pattern OR
            blm_id ILIKE '%' || v_blm_pattern || '%'
          )
        LIMIT 1;
        
        -- If found, update the sheet with linked module
        IF v_module_id IS NOT NULL THEN
            UPDATE drawing_sheets 
            SET linked_module_id = v_module_id, 
                updated_at = NOW() 
            WHERE id = p_sheet_id;
            
            RAISE NOTICE 'Linked sheet % to module % (BLM: %)', p_sheet_id, v_module_id, v_blm_pattern;
        ELSE
            RAISE NOTICE 'No module found for BLM pattern: %', v_blm_pattern;
        END IF;
    ELSE
        RAISE NOTICE 'Could not extract BLM pattern from sheet number: %', p_sheet_number;
    END IF;
    
    RETURN v_module_id;
END;
$function$;

COMMENT ON FUNCTION auto_link_sheet_to_module IS 'Automatically link a sheet to a module by extracting BLM ID from sheet number (e.g., XS-B1L2M15-01 -> B1L2M15)';
