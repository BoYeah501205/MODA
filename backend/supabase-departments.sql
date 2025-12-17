-- ============================================================================
-- MODA Departments Table
-- Run this in Supabase SQL Editor to create the departments table
-- ============================================================================

-- Departments table (production stations/departments)
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    supervisor TEXT,
    employee_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
GRANT ALL ON departments TO authenticated;
GRANT SELECT ON departments TO anon;

CREATE INDEX IF NOT EXISTS idx_departments_sort_order ON departments(sort_order);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at 
    BEFORE UPDATE ON departments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE departments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Trashed Employees table (soft delete)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trashed_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_id UUID,
    prefix TEXT,
    first_name TEXT,
    middle_name TEXT,
    last_name TEXT,
    suffix TEXT,
    job_title TEXT,
    department TEXT,
    shift TEXT,
    hire_date DATE,
    email TEXT,
    phone TEXT,
    permissions TEXT,
    access_status TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_by UUID REFERENCES auth.users(id)
);

ALTER TABLE trashed_employees DISABLE ROW LEVEL SECURITY;
GRANT ALL ON trashed_employees TO authenticated;
GRANT SELECT ON trashed_employees TO anon;

CREATE INDEX IF NOT EXISTS idx_trashed_employees_deleted_at ON trashed_employees(deleted_at DESC);

SELECT 'SUCCESS: Departments and Trashed Employees tables created!' as status;
