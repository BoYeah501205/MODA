-- Migration: Add abbreviation column to projects table
-- Run this in Supabase SQL Editor
-- This adds a 3-character max abbreviation field for projects
-- Used on Weekly Board and Transport boards for compact project identification

-- Add abbreviation column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS abbreviation VARCHAR(3);

-- Add a check constraint to ensure abbreviation is uppercase letters only (optional but recommended)
-- Note: The frontend already enforces this, but this adds database-level validation
ALTER TABLE projects 
ADD CONSTRAINT abbreviation_uppercase_letters 
CHECK (abbreviation IS NULL OR abbreviation ~ '^[A-Z]{1,3}$');

-- Create an index for faster lookups if needed
CREATE INDEX IF NOT EXISTS idx_projects_abbreviation ON projects(abbreviation);

-- Verify the column was added
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'abbreviation';
