-- ============================================================================
-- MARK ALVARADO CREEK MODULES COMPLETE (BEFORE 25-0914)
-- Run this in Supabase SQL Editor to mark all modules before serial 25-0914
-- as 100% complete for all production stations
-- ============================================================================

-- This script updates the stage_progress JSONB field for all Alvarado Creek
-- modules with serial numbers less than 25-0914, setting all production
-- stations to 100% complete.

-- Production station IDs (from productionStages in the app):
-- auto-fc, auto-w, mezz, rough-in, drywall, tape, paint, trim, close-up

-- First, let's see what modules will be affected (preview query)
-- SELECT m.serial_number, m.build_sequence, p.name as project_name
-- FROM modules m
-- JOIN projects p ON m.project_id = p.id
-- WHERE p.name = 'Alvarado Creek'
--   AND m.serial_number < '25-0914'
-- ORDER BY m.serial_number;

-- Update all Alvarado Creek modules before 25-0914 to 100% complete
UPDATE modules
SET 
    stage_progress = jsonb_build_object(
        'auto-fc', 100,
        'auto-w', 100,
        'mezz', 100,
        'rough-in', 100,
        'drywall', 100,
        'tape', 100,
        'paint', 100,
        'trim', 100,
        'close-up', 100
    ),
    updated_at = NOW()
WHERE project_id IN (
    SELECT id FROM projects WHERE name = 'Alvarado Creek'
)
AND serial_number < '25-0914';

-- Verify the update
SELECT 
    m.serial_number, 
    m.build_sequence,
    m.stage_progress,
    p.name as project_name
FROM modules m
JOIN projects p ON m.project_id = p.id
WHERE p.name = 'Alvarado Creek'
  AND m.serial_number < '25-0914'
ORDER BY m.serial_number
LIMIT 20;

-- Summary: This will mark all Alvarado Creek modules with serial numbers
-- alphabetically before '25-0914' as 100% complete across all stations.
-- 
-- Note: String comparison is used, so '25-0913' < '25-0914' is true.
-- Modules like '25-0626' through '25-0913' will be marked complete.
