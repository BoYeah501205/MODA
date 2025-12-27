-- ============================================================================
-- MIGRATION: Add address, city, state fields to projects table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/syreuphexagezawjyjgt/sql
-- ============================================================================

-- Add new address columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS state TEXT;

-- Optional: Add description column if it doesn't exist
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;

-- Migrate existing location data to city/state (optional - for existing projects)
-- This attempts to parse "City, ST" format from location field
-- UPDATE projects 
-- SET 
--     city = TRIM(SPLIT_PART(location, ',', 1)),
--     state = TRIM(SPLIT_PART(location, ',', 2))
-- WHERE location IS NOT NULL AND location != '' AND city IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position;
