-- Fix RLS policy for issue_categories table
-- Run this ENTIRE script in Supabase SQL Editor

-- First, drop ALL existing policies on the table
DROP POLICY IF EXISTS "Admins can manage issue categories" ON issue_categories;
DROP POLICY IF EXISTS "Anyone can view active issue categories" ON issue_categories;
DROP POLICY IF EXISTS "Authenticated users can manage issue categories" ON issue_categories;

-- Disable RLS temporarily to allow operations
ALTER TABLE issue_categories DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE issue_categories ENABLE ROW LEVEL SECURITY;

-- Create simple policies that work
-- SELECT: Anyone authenticated can read all categories
CREATE POLICY "select_issue_categories"
    ON issue_categories FOR SELECT
    TO authenticated
    USING (true);

-- INSERT: Any authenticated user can insert
CREATE POLICY "insert_issue_categories"
    ON issue_categories FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- UPDATE: Any authenticated user can update
CREATE POLICY "update_issue_categories"
    ON issue_categories FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- DELETE: Any authenticated user can delete
CREATE POLICY "delete_issue_categories"
    ON issue_categories FOR DELETE
    TO authenticated
    USING (true);

-- Alternative: If you want to restrict to specific roles, use this instead:
-- First check what roles exist in your profiles table:
-- SELECT DISTINCT dashboard_role FROM profiles;

-- Then create policy matching those roles:
-- DROP POLICY IF EXISTS "Authenticated users can manage issue categories" ON issue_categories;
-- CREATE POLICY "Admins can manage issue categories"
--     ON issue_categories FOR ALL
--     USING (
--         EXISTS (
--             SELECT 1 FROM profiles 
--             WHERE profiles.id = auth.uid() 
--             AND profiles.dashboard_role IN ('admin', 'super_admin', 'Admin', 'Super Admin')
--         )
--     );
