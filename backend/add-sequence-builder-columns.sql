-- ============================================================================
-- ADD MISSING COLUMNS FOR SEQUENCE BUILDER
-- Run this in Supabase SQL Editor
-- After running, go to Settings → API → Reload schema cache
-- ============================================================================

-- Building number/name
ALTER TABLE modules ADD COLUMN IF NOT EXISTS building TEXT;

-- Level number
ALTER TABLE modules ADD COLUMN IF NOT EXISTS level INTEGER;

-- Hitch BLM (for sawbox modules, the front module BLM)
ALTER TABLE modules ADD COLUMN IF NOT EXISTS hitch_blm TEXT;

-- Rear BLM (for sawbox modules, the rear module BLM)
ALTER TABLE modules ADD COLUMN IF NOT EXISTS rear_blm TEXT;

-- Set sequence (order for setting on site)
ALTER TABLE modules ADD COLUMN IF NOT EXISTS set_sequence INTEGER;

-- Difficulty tags (array of tag IDs like 'ext-sidewall', 'stair', etc.)
ALTER TABLE modules ADD COLUMN IF NOT EXISTS difficulty_tags JSONB DEFAULT '[]'::jsonb;

-- Notes field
ALTER TABLE modules ADD COLUMN IF NOT EXISTS notes TEXT;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'modules'
ORDER BY ordinal_position;
