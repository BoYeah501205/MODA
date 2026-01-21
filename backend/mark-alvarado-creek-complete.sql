-- Mark all Alvarado Creek modules as 100% complete across all stations
-- Run this in Supabase SQL Editor

-- First, let's see what we're working with
-- SELECT id, name, modules FROM projects WHERE name ILIKE '%Alvarado%';

-- Update all modules in Alvarado Creek project to have 100% progress on all stations
UPDATE projects
SET modules = (
    SELECT jsonb_agg(
        module || jsonb_build_object(
            'stageProgress', jsonb_build_object(
                'auto-c', 100,
                'auto-f', 100,
                'auto-walls', 100,
                'mezzanine', 100,
                'elec-ceiling', 100,
                'wall-set', 100,
                'ceiling-set', 100,
                'soffits', 100,
                'mech-rough', 100,
                'elec-rough', 100,
                'plumb-rough', 100,
                'exteriors', 100,
                'drywall-bp', 100,
                'drywall-ttp', 100,
                'roofing', 100,
                'pre-finish', 100,
                'mech-trim', 100,
                'elec-trim', 100,
                'plumb-trim', 100,
                'final-finish', 100,
                'sign-off', 100,
                'close-up', 100
            )
        )
    )
    FROM jsonb_array_elements(modules) AS module
)
WHERE name ILIKE '%Alvarado Creek%';

-- Verify the update
SELECT id, name, jsonb_array_length(modules) as module_count 
FROM projects 
WHERE name ILIKE '%Alvarado%';
