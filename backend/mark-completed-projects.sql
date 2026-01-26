-- Mark all completed projects as 100% complete at all stations
-- Run this in Supabase SQL Editor
-- This ensures old projects don't interfere with auto-progression

-- All production stages
-- Projects to mark complete: Everything EXCEPT Locke Lofts and El Cerrito

-- First, let's see what projects exist and their module counts
SELECT name, status, jsonb_array_length(modules) as module_count
FROM projects
ORDER BY name;

-- Create function to mark all modules in a project as 100% complete
CREATE OR REPLACE FUNCTION mark_project_complete(project_modules jsonb)
RETURNS jsonb AS $$
DECLARE
    ALL_STAGES TEXT[] := ARRAY[
        'auto-c', 'auto-f', 'auto-walls', 'mezzanine', 'elec-ceiling',
        'wall-set', 'ceiling-set', 'soffits', 'mech-rough', 'elec-rough',
        'plumb-rough', 'exteriors', 'drywall-bp', 'drywall-ttp', 'roofing',
        'pre-finish', 'mech-trim', 'elec-trim', 'plumb-trim', 'final-finish',
        'sign-off', 'close-up'
    ];
    complete_progress jsonb;
    stage TEXT;
BEGIN
    -- Build complete progress object with all stages at 100%
    complete_progress := '{}'::jsonb;
    FOREACH stage IN ARRAY ALL_STAGES LOOP
        complete_progress := jsonb_set(complete_progress, ARRAY[stage], '100'::jsonb);
    END LOOP;
    
    -- Apply to all modules
    RETURN (
        SELECT jsonb_agg(
            jsonb_set(elem, '{stageProgress}', complete_progress)
        )
        FROM jsonb_array_elements(project_modules) AS elem
    );
END;
$$ LANGUAGE plpgsql;

-- Mark all projects EXCEPT Locke Lofts and El Cerrito as complete
-- Also set their status to 'Complete'
UPDATE projects
SET 
    modules = mark_project_complete(modules),
    status = 'Complete',
    updated_at = NOW()
WHERE name NOT IN ('Locke Lofts', 'El Cerrito')
  AND name IS NOT NULL;

-- Verify: Show projects and their completion status
SELECT 
    name, 
    status,
    jsonb_array_length(modules) as module_count,
    (SELECT COUNT(*) 
     FROM jsonb_array_elements(modules) AS m 
     WHERE (m->'stageProgress'->>'close-up')::int = 100
    ) as fully_complete_count
FROM projects
ORDER BY name;

-- Clean up
DROP FUNCTION IF EXISTS mark_project_complete(jsonb);
