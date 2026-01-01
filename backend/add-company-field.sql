-- ============================================================================
-- Add 'company' field to employees table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/syreuphexagezawjyjgt/sql/new
-- ============================================================================

-- Add company column with default value for internal employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS company TEXT DEFAULT 'Autovol';

-- Add comment for documentation
COMMENT ON COLUMN employees.company IS 'Company affiliation - defaults to Autovol for internal employees, can be set for external users';

-- Update all existing employees to have Autovol as their company
UPDATE employees SET company = 'Autovol' WHERE company IS NULL OR company = '';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'employees' AND column_name = 'company';
