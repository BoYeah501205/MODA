-- Delete all Module Packages (Shop Drawings) for Locke Lofts
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/syreuphexagezawjyjgt/sql

-- Step 1: Find the Locke Lofts project ID
SELECT id, name FROM projects WHERE name ILIKE '%locke%lofts%';

-- Step 2: Preview what will be deleted (run this first to verify)
SELECT d.id, d.name, d.discipline, d.created_at, 
       (SELECT COUNT(*) FROM drawing_versions WHERE drawing_id = d.id) as version_count
FROM drawings d
JOIN projects p ON d.project_id = p.id
WHERE p.name ILIKE '%locke%lofts%'
  AND d.discipline = 'module-packages'
ORDER BY d.name;

-- Step 3: Delete drawing versions first (foreign key constraint)
DELETE FROM drawing_versions
WHERE drawing_id IN (
    SELECT d.id FROM drawings d
    JOIN projects p ON d.project_id = p.id
    WHERE p.name ILIKE '%locke%lofts%'
      AND d.discipline = 'module-packages'
);

-- Step 4: Delete the drawings
DELETE FROM drawings
WHERE project_id IN (SELECT id FROM projects WHERE name ILIKE '%locke%lofts%')
  AND discipline = 'module-packages';

-- Step 5: Verify deletion
SELECT COUNT(*) as remaining FROM drawings d
JOIN projects p ON d.project_id = p.id
WHERE p.name ILIKE '%locke%lofts%'
  AND d.discipline = 'module-packages';
