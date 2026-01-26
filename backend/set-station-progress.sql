-- Set stage_progress to 100% for modules up to specified serial numbers per station
-- Run this in Supabase SQL Editor
-- Project: Alvarado Creek (modules starting with 26-)

-- Station mapping:
-- DRY-TTP = drywall-ttp → up to 26-0027
-- ROOF = roofing → up to 26-0031
-- PRE-FIN = pre-finish → up to 26-0021
-- MECH-T = mech-trim → up to 26-0020
-- PLUM-T = plumb-trim → up to 26-0020
-- ELEC-T = elec-trim → up to 26-0020
-- FINAL = final-finish → up to 26-0018
-- SIGN-OFF = sign-off → up to 26-0016
-- CLOSE = close-up → up to 26-0011

-- Create a temporary function to update module progress
CREATE OR REPLACE FUNCTION update_module_progress(module_data jsonb)
RETURNS jsonb AS $$
DECLARE
    serial_num TEXT;
    current_progress jsonb;
    updated_progress jsonb;
BEGIN
    serial_num := module_data->>'serialNumber';
    current_progress := COALESCE(module_data->'stageProgress', '{}'::jsonb);
    updated_progress := current_progress;
    
    -- Only process modules starting with 26-
    IF serial_num NOT LIKE '26-%' THEN
        RETURN module_data;
    END IF;
    
    -- DRY-TTP (drywall-ttp) → up to 26-0027
    IF serial_num <= '26-0027' THEN
        updated_progress := jsonb_set(updated_progress, '{drywall-ttp}', '100'::jsonb);
    END IF;
    
    -- ROOF (roofing) → up to 26-0031
    IF serial_num <= '26-0031' THEN
        updated_progress := jsonb_set(updated_progress, '{roofing}', '100'::jsonb);
    END IF;
    
    -- PRE-FIN (pre-finish) → up to 26-0021
    IF serial_num <= '26-0021' THEN
        updated_progress := jsonb_set(updated_progress, '{pre-finish}', '100'::jsonb);
    END IF;
    
    -- MECH-T (mech-trim) → up to 26-0020
    IF serial_num <= '26-0020' THEN
        updated_progress := jsonb_set(updated_progress, '{mech-trim}', '100'::jsonb);
    END IF;
    
    -- PLUM-T (plumb-trim) → up to 26-0020
    IF serial_num <= '26-0020' THEN
        updated_progress := jsonb_set(updated_progress, '{plumb-trim}', '100'::jsonb);
    END IF;
    
    -- ELEC-T (elec-trim) → up to 26-0020
    IF serial_num <= '26-0020' THEN
        updated_progress := jsonb_set(updated_progress, '{elec-trim}', '100'::jsonb);
    END IF;
    
    -- FINAL (final-finish) → up to 26-0018
    IF serial_num <= '26-0018' THEN
        updated_progress := jsonb_set(updated_progress, '{final-finish}', '100'::jsonb);
    END IF;
    
    -- SIGN-OFF (sign-off) → up to 26-0016
    IF serial_num <= '26-0016' THEN
        updated_progress := jsonb_set(updated_progress, '{sign-off}', '100'::jsonb);
    END IF;
    
    -- CLOSE (close-up) → up to 26-0011
    IF serial_num <= '26-0011' THEN
        updated_progress := jsonb_set(updated_progress, '{close-up}', '100'::jsonb);
    END IF;
    
    RETURN jsonb_set(module_data, '{stageProgress}', updated_progress);
END;
$$ LANGUAGE plpgsql;

-- Apply the function to all modules in Locke Lofts project
UPDATE projects
SET modules = (
    SELECT jsonb_agg(update_module_progress(elem))
    FROM jsonb_array_elements(modules) AS elem
),
updated_at = NOW()
WHERE name = 'Locke Lofts';

-- Verify the update (check a few modules)
SELECT 
    elem->>'serialNumber' as serial,
    elem->'stageProgress' as progress
FROM projects, jsonb_array_elements(modules) AS elem
WHERE name = 'Locke Lofts'
AND (elem->>'serialNumber') IN ('26-0011', '26-0016', '26-0020', '26-0027', '26-0031')
ORDER BY elem->>'serialNumber';

-- Clean up the temporary function
DROP FUNCTION IF EXISTS update_module_progress(jsonb);
