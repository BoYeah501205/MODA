-- Add dashboard_role column to employees table
-- Run this in Supabase SQL Editor

-- Add the column if it doesn't exist
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS dashboard_role TEXT DEFAULT 'employee';

-- Add a comment for documentation
COMMENT ON COLUMN employees.dashboard_role IS 'Dashboard role for the employee (admin, executive, department-supervisor, coordinator, employee)';

-- Success message
DO $$ BEGIN RAISE NOTICE 'dashboard_role column added to employees table successfully!'; END $$;
