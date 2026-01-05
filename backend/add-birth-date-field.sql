-- Add birth_date column to employees table
-- Run this in Supabase SQL Editor

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN employees.birth_date IS 'Employee birth date for HR records';
