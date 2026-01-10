-- Clear Supabase Storage uploads (run in Supabase SQL Editor)
-- This removes drawing versions stored in Supabase (not SharePoint)

-- Step 1: View what will be deleted
SELECT 
    dv.id,
    dv.file_name,
    dv.storage_path,
    dv.storage_type,
    dv.uploaded_at,
    d.name as drawing_name
FROM drawing_versions dv
LEFT JOIN drawings d ON d.id = dv.drawing_id
WHERE dv.storage_type = 'supabase' 
   OR dv.storage_type IS NULL
   OR NOT dv.storage_path LIKE 'sharepoint:%';

-- Step 2: Delete the version records (uncomment to run)
-- DELETE FROM drawing_versions
-- WHERE storage_type = 'supabase' 
--    OR storage_type IS NULL
--    OR NOT storage_path LIKE 'sharepoint:%';

-- Step 3: Delete orphaned drawings with no versions (uncomment to run)
-- DELETE FROM drawings
-- WHERE id NOT IN (SELECT DISTINCT drawing_id FROM drawing_versions WHERE drawing_id IS NOT NULL);

-- Note: After running the DELETE statements above, you also need to:
-- 1. Go to Supabase Dashboard -> Storage -> drawings bucket
-- 2. Select all files and delete them manually
-- OR use the Storage API to delete files programmatically
