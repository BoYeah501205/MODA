-- ============================================================================
-- MARK MODULES COMPLETE PER STATION (Based on Stagger)
-- Run this ENTIRE script in the Supabase SQL Editor
-- ============================================================================
-- Each station has different modules based on stagger offset.
-- This marks each station complete only for modules that were assigned to it.
-- Based on Weekly Board screenshot showing last Tuesday (Dec 23) modules:
--   AUTO-FC/AUTO-W: through 25-0950
--   MEZZ: through 25-0949  
--   ELEC-C: through 25-0946
--   WALL: through 25-0945
--   CEIL: through 25-0944
--   SOFF: through 25-0943
--   etc. (each station offset by stagger)
-- ============================================================================

-- Station end modules based on stagger (last module on Tuesday for each station)
WITH station_ends AS (
    SELECT * FROM (VALUES
        ('auto-fc', '25-0950'),
        ('auto-walls', '25-0950'),
        ('mezzanine', '25-0949'),
        ('elec-ceiling', '25-0946'),
        ('wall-set', '25-0945'),
        ('ceiling-set', '25-0944'),
        ('soffits', '25-0943'),
        ('mech-rough', '25-0942'),
        ('elec-rough', '25-0942'),
        ('plumb-rough', '25-0942'),
        ('exteriors', '25-0941'),
        ('drywall-bp', '25-0940'),
        ('drywall-ttp', '25-0932'),
        ('roofing', '25-0935'),
        ('pre-finish', '25-0926'),
        ('mech-trim', '25-0925'),
        ('elec-trim', '25-0925'),
        ('plumb-trim', '25-0925'),
        ('final-finish', '25-0923'),
        ('sign-off', '25-0921'),
        ('close-up', '25-0914')
    ) AS t(station_id, last_module)
),
-- Current timestamp as integer (for completion timestamps)
current_ts AS (
    SELECT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint as ts
),
updated_projects AS (
    SELECT 
        p.id,
        p.name,
        (
            SELECT jsonb_agg(
                -- Build new stageProgress by checking each station's end module
                m || jsonb_build_object(
                    'stageProgress', (
                        SELECT jsonb_object_agg(
                            se.station_id,
                            CASE 
                                WHEN (m->>'serialNumber') <= se.last_module THEN 100
                                ELSE COALESCE((m->'stageProgress'->>se.station_id)::int, 0)
                            END
                        )
                        FROM station_ends se
                    )
                )
                ORDER BY (m->>'buildSequence')::int
            )
            FROM jsonb_array_elements(p.modules) m
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
-- Verify the update - shows station progress for key modules
-- ============================================================================

SELECT 
    m->>'serialNumber' as serial,
    (m->'stageProgress'->>'auto-fc')::int as "AUTO-FC",
    (m->'stageProgress'->>'mezzanine')::int as "MEZZ",
    (m->'stageProgress'->>'wall-set')::int as "WALL",
    (m->'stageProgress'->>'ceiling-set')::int as "CEIL",
    (m->'stageProgress'->>'drywall-ttp')::int as "DRY-TTP",
    (m->'stageProgress'->>'close-up')::int as "CLOSE"
FROM projects p,
     jsonb_array_elements(p.modules) m
WHERE p.status = 'Active'
  AND (m->>'serialNumber') >= '25-0914'
  AND (m->>'serialNumber') <= '25-0955'
ORDER BY m->>'serialNumber';
