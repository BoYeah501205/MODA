-- ============================================================================
-- URGENT FIX: DISABLE RLS TO ALLOW DATA MIGRATION
-- Run this in Supabase SQL Editor IMMEDIATELY
-- Date: 2026-01-01
-- ============================================================================

-- STEP 1: DISABLE RLS ON ALL TABLES (allows all operations)
ALTER TABLE IF EXISTS projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weekly_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS station_staggers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS production_weeks DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stagger_change_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transport DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transport_yards DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transport_companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transport_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS engineering_issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trashed_projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trashed_employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS unified_modules DISABLE ROW LEVEL SECURITY;

-- STEP 2: Grant full access to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- STEP 3: Grant access to anon for read operations (needed for initial load)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- ============================================================================
-- DONE! Now refresh your browser and run the migration again:
-- await window.MODA_SUPABASE_DATA.migration.importFromLocalStorage()
-- ============================================================================
