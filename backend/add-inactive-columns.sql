-- ============================================================================
-- Add Inactive Employee Tracking Columns
-- Run this in Supabase SQL Editor to add inactive reason/notes fields
-- ============================================================================

-- Add inactive_reason column with allowed values
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS inactive_reason TEXT 
CHECK (inactive_reason IS NULL OR inactive_reason IN ('Termination', 'Resignation', 'Leave-of-Absence', 'Deceased', 'Other'));

-- Add inactive_notes column for additional details
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS inactive_notes TEXT;

-- Add inactive_date to track when employee became inactive
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS inactive_date DATE;

-- Create index for filtering inactive employees
CREATE INDEX IF NOT EXISTS idx_employees_inactive_reason ON employees(inactive_reason);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' 
AND column_name IN ('inactive_reason', 'inactive_notes', 'inactive_date');
