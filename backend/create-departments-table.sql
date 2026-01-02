-- Create departments table for MODA
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    supervisor TEXT,
    linked_station_id TEXT,
    employee_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

-- Enable Row Level Security
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to read
CREATE POLICY "Allow authenticated read access" ON departments
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy to allow authenticated users to insert/update/delete
CREATE POLICY "Allow authenticated write access" ON departments
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE departments;
