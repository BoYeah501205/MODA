-- Add shift1 and shift2 JSONB columns to production_weeks table
-- Run this in Supabase SQL Editor

ALTER TABLE production_weeks 
ADD COLUMN IF NOT EXISTS shift1 JSONB DEFAULT '{"monday": 5, "tuesday": 5, "wednesday": 5, "thursday": 5}'::jsonb;

ALTER TABLE production_weeks 
ADD COLUMN IF NOT EXISTS shift2 JSONB DEFAULT '{"friday": 0, "saturday": 0, "sunday": 0}'::jsonb;

-- Update existing rows to have default values if null
UPDATE production_weeks 
SET shift1 = '{"monday": 5, "tuesday": 5, "wednesday": 5, "thursday": 5}'::jsonb 
WHERE shift1 IS NULL;

UPDATE production_weeks 
SET shift2 = '{"friday": 0, "saturday": 0, "sunday": 0}'::jsonb 
WHERE shift2 IS NULL;
