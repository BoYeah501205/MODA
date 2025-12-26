-- ============================================================================
-- MARK MODULES COMPLETE FOR WEEKLY BOARD
-- Run this ENTIRE script in the Supabase SQL Editor
-- ============================================================================
-- Production was only on 12/22 and 12/23 for 11 modules total
-- Starting module: 25-0919, Line balance: 11
-- Previous week section: 25-0914 to 25-0918 (5 modules before start)
-- Current production: 25-0919 to 25-0929 (11 modules)
-- ============================================================================

WITH config AS (
    SELECT 
        '25-0914' as min_serial,  -- 5 before start (25-0919)
        '25-0929' as max_serial   -- 25-0919 + 11 - 1 = 25-0929
),
all_stages AS (
    SELECT '{
        "auto-fc": 100,
        "auto-walls": 100,
        "mezzanine": 100,
        "elec-ceiling": 100,
        "wall-set": 100,
        "ceiling-set": 100,
        "soffits": 100,
        "mech-rough": 100,
        "elec-rough": 100,
        "plumb-rough": 100,
        "exteriors": 100,
        "drywall-bp": 100,
        "drywall-ttp": 100,
        "roofing": 100,
        "pre-finish": 100,
        "mech-trim": 100,
        "elec-trim": 100,
        "plumb-trim": 100,
        "final-finish": 100,
        "sign-off": 100,
        "close-up": 100
    }'::jsonb as progress
),
updated_projects AS (
    SELECT 
        p.id,
        p.name,
        (
            SELECT jsonb_agg(
                CASE 
                    -- Match serial numbers 25-0914 through 25-0938
                    WHEN (m->>'serialNumber') >= (SELECT min_serial FROM config)
                         AND (m->>'serialNumber') <= (SELECT max_serial FROM config)
                    THEN m || jsonb_build_object(
                        'stageProgress', s.progress,
                        'stationCompletedAt', jsonb_build_object(
                            'auto-fc', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'auto-walls', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'mezzanine', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'elec-ceiling', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'wall-set', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'ceiling-set', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'soffits', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'mech-rough', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'elec-rough', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'plumb-rough', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'exteriors', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'drywall-bp', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'drywall-ttp', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'roofing', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'pre-finish', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'mech-trim', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'elec-trim', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'plumb-trim', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'final-finish', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'sign-off', EXTRACT(EPOCH FROM NOW()) * 1000,
                            'close-up', EXTRACT(EPOCH FROM NOW()) * 1000
                        )
                    )
                    ELSE m
                END
                ORDER BY (m->>'buildSequence')::int
            )
            FROM jsonb_array_elements(p.modules) m, all_stages s
        ) as new_modules
    FROM projects p
    WHERE p.status = 'Active'
)
UPDATE projects p
SET 
    modules = up.new_modules,
    updated_at = NOW()
FROM updated_projects up
WHERE p.id = up.id;

-- ============================================================================
-- Verify the update - shows which modules are now complete
-- ============================================================================

SELECT 
    m->>'serialNumber' as serial_number,
    (m->'stageProgress'->>'auto-fc')::int as auto_fc,
    (m->'stageProgress'->>'close-up')::int as close_up,
    CASE 
        WHEN (m->'stageProgress'->>'close-up')::int = 100 THEN 'COMPLETE'
        ELSE 'incomplete'
    END as status
FROM projects p,
     jsonb_array_elements(p.modules) m
WHERE p.status = 'Active'
  AND (m->>'serialNumber') >= '25-0914'
  AND (m->>'serialNumber') <= '25-0929'
ORDER BY m->>'serialNumber';
