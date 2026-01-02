-- ============================================================================
-- MODA Historical Projects Import - FIXED VERSION
-- Run this in the Supabase SQL Editor to import 7 historical projects
-- ============================================================================

-- STEP 1: Add abbreviation column if it doesn't exist
ALTER TABLE projects ADD COLUMN IF NOT EXISTS abbreviation TEXT;

-- STEP 2: Update existing projects with customer and abbreviation data
-- (Run this if projects already exist but are missing data)
UPDATE projects SET 
    client = 'The Pacific Companies (TPC)',
    abbreviation = 'VSS'
WHERE name = 'Virginia Street Studios';

UPDATE projects SET 
    client = 'The Pacific Companies (TPC)',
    abbreviation = 'SM'
WHERE name = 'Santa Maria Studios';

UPDATE projects SET 
    client = 'The Pacific Companies (TPC)',
    abbreviation = 'MC'
WHERE name = 'MacArthur';

UPDATE projects SET 
    client = 'The Pacific Companies (TPC)',
    abbreviation = 'LP'
WHERE name = 'Lemos Pointe';

UPDATE projects SET 
    client = 'The Pacific Companies (TPC)',
    abbreviation = 'EP'
WHERE name = 'Enlightenment Plaza';

UPDATE projects SET 
    client = 'The Pacific Companies (TPC)',
    abbreviation = 'OSF'
WHERE name = 'Osgood Fremont';

UPDATE projects SET 
    client = 'Nibbi Brothers',
    abbreviation = 'SCM'
WHERE name = '355 Sango Court';

-- Verify the updates
SELECT id, name, abbreviation, client, status, city, state 
FROM projects 
WHERE status = 'Complete'
ORDER BY name;
