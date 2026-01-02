-- ============================================================================
-- ADD STARTING_MODULE COLUMN TO PRODUCTION_WEEKS
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add starting_module column if it doesn't exist
ALTER TABLE production_weeks ADD COLUMN IF NOT EXISTS starting_module TEXT;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'production_weeks' AND column_name = 'starting_module';
