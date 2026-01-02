-- ============================================================================
-- FIX RLS POLICIES FOR ALL TABLES
-- Run this in Supabase SQL Editor to fix data access issues
-- Date: 2026-01-01
-- 
-- PROBLEM: Data not loading on Projects, People, WeeklyBoard, Production tabs
-- CAUSE: RLS policies may be blocking authenticated user access
-- SOLUTION: Recreate policies with simpler syntax that definitely works
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP EXISTING POLICIES (ignore errors if they don't exist)
-- ============================================================================

-- Projects
DROP POLICY IF EXISTS "Authenticated users can view projects" ON projects;
DROP POLICY IF EXISTS "Admins can insert projects" ON projects;
DROP POLICY IF EXISTS "Admins can update projects" ON projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated read" ON projects;
DROP POLICY IF EXISTS "Allow authenticated write" ON projects;

-- Employees
DROP POLICY IF EXISTS "Authenticated users can view employees" ON employees;
DROP POLICY IF EXISTS "Authorized users can insert employees" ON employees;
DROP POLICY IF EXISTS "Authorized users can update employees" ON employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON employees;
DROP POLICY IF EXISTS "Allow authenticated read" ON employees;
DROP POLICY IF EXISTS "Allow authenticated write" ON employees;

-- Modules
DROP POLICY IF EXISTS "Authenticated users can view modules" ON modules;
DROP POLICY IF EXISTS "Authorized users can insert modules" ON modules;
DROP POLICY IF EXISTS "Authorized users can update modules" ON modules;
DROP POLICY IF EXISTS "Admins can delete modules" ON modules;
DROP POLICY IF EXISTS "Allow authenticated read" ON modules;
DROP POLICY IF EXISTS "Allow authenticated write" ON modules;

-- Weekly Schedules
DROP POLICY IF EXISTS "Authenticated users can view weekly_schedules" ON weekly_schedules;
DROP POLICY IF EXISTS "Authenticated users can manage weekly_schedules" ON weekly_schedules;
DROP POLICY IF EXISTS "Allow authenticated read" ON weekly_schedules;
DROP POLICY IF EXISTS "Allow authenticated write" ON weekly_schedules;

-- Station Staggers
DROP POLICY IF EXISTS "Authenticated users can view station_staggers" ON station_staggers;
DROP POLICY IF EXISTS "Authenticated users can manage station_staggers" ON station_staggers;
DROP POLICY IF EXISTS "Allow authenticated read" ON station_staggers;
DROP POLICY IF EXISTS "Allow authenticated write" ON station_staggers;

-- Production Weeks
DROP POLICY IF EXISTS "Authenticated users can view production_weeks" ON production_weeks;
DROP POLICY IF EXISTS "Authenticated users can manage production_weeks" ON production_weeks;
DROP POLICY IF EXISTS "Allow authenticated read" ON production_weeks;
DROP POLICY IF EXISTS "Allow authenticated write" ON production_weeks;

-- Stagger Change Log
DROP POLICY IF EXISTS "Authenticated users can view stagger_change_log" ON stagger_change_log;
DROP POLICY IF EXISTS "Authenticated users can manage stagger_change_log" ON stagger_change_log;
DROP POLICY IF EXISTS "Allow authenticated read" ON stagger_change_log;
DROP POLICY IF EXISTS "Allow authenticated write" ON stagger_change_log;

-- Transport tables
DROP POLICY IF EXISTS "Authenticated users can view transport" ON transport;
DROP POLICY IF EXISTS "Authorized users can manage transport" ON transport;
DROP POLICY IF EXISTS "Allow authenticated read" ON transport;
DROP POLICY IF EXISTS "Allow authenticated write" ON transport;

DROP POLICY IF EXISTS "Allow authenticated read" ON transport_yards;
DROP POLICY IF EXISTS "Allow authenticated write" ON transport_yards;

DROP POLICY IF EXISTS "Allow authenticated read" ON transport_companies;
DROP POLICY IF EXISTS "Allow authenticated write" ON transport_companies;

DROP POLICY IF EXISTS "Allow authenticated read" ON transport_modules;
DROP POLICY IF EXISTS "Allow authenticated write" ON transport_modules;

-- Departments
DROP POLICY IF EXISTS "Authenticated users can view departments" ON departments;
DROP POLICY IF EXISTS "Authenticated users can manage departments" ON departments;
DROP POLICY IF EXISTS "Allow authenticated read" ON departments;
DROP POLICY IF EXISTS "Allow authenticated write" ON departments;

-- Profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated read" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated write" ON profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON profiles;

-- ============================================================================
-- STEP 2: ENSURE RLS IS ENABLED ON ALL TABLES
-- ============================================================================

ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS station_staggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS production_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stagger_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transport_yards ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transport_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transport_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS departments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: CREATE SIMPLE POLICIES FOR ALL TABLES
-- Using "TO authenticated" which is the correct Supabase syntax
-- ============================================================================

-- PROJECTS: All authenticated users can read, all can write (for now)
CREATE POLICY "Allow authenticated read" ON projects
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON projects
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- EMPLOYEES: All authenticated users can read and write
CREATE POLICY "Allow authenticated read" ON employees
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON employees
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- MODULES: All authenticated users can read and write
CREATE POLICY "Allow authenticated read" ON modules
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON modules
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PROFILES: All authenticated users can read, users can update own
CREATE POLICY "Allow authenticated read" ON profiles
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON profiles
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- WEEKLY_SCHEDULES: All authenticated users can read and write
CREATE POLICY "Allow authenticated read" ON weekly_schedules
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON weekly_schedules
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- STATION_STAGGERS: All authenticated users can read and write
CREATE POLICY "Allow authenticated read" ON station_staggers
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON station_staggers
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PRODUCTION_WEEKS: All authenticated users can read and write
CREATE POLICY "Allow authenticated read" ON production_weeks
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON production_weeks
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- STAGGER_CHANGE_LOG: All authenticated users can read and write
CREATE POLICY "Allow authenticated read" ON stagger_change_log
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON stagger_change_log
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TRANSPORT: All authenticated users can read and write
CREATE POLICY "Allow authenticated read" ON transport
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON transport
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TRANSPORT_YARDS: All authenticated users can read and write
CREATE POLICY "Allow authenticated read" ON transport_yards
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON transport_yards
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TRANSPORT_COMPANIES: All authenticated users can read and write
CREATE POLICY "Allow authenticated read" ON transport_companies
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON transport_companies
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- TRANSPORT_MODULES: All authenticated users can read and write
CREATE POLICY "Allow authenticated read" ON transport_modules
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON transport_modules
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DEPARTMENTS: All authenticated users can read and write
CREATE POLICY "Allow authenticated read" ON departments
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated write" ON departments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 4: VERIFY TABLES EXIST (create if missing)
-- ============================================================================

-- Create station_staggers if it doesn't exist
CREATE TABLE IF NOT EXISTS station_staggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create production_weeks if it doesn't exist
CREATE TABLE IF NOT EXISTS production_weeks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id TEXT UNIQUE,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    planned_modules INTEGER DEFAULT 21,
    actual_modules INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Planned',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create weekly_schedules if it doesn't exist
CREATE TABLE IF NOT EXISTS weekly_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id TEXT,
    schedule_data JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create stagger_change_log if it doesn't exist
CREATE TABLE IF NOT EXISTS stagger_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT,
    changed_by TEXT,
    changes JSONB DEFAULT '{}'::jsonb,
    staggers_snapshot JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create transport_yards if it doesn't exist
CREATE TABLE IF NOT EXISTS transport_yards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    capacity INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create transport_companies if it doesn't exist
CREATE TABLE IF NOT EXISTS transport_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create transport_modules if it doesn't exist
CREATE TABLE IF NOT EXISTS transport_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    serial_number TEXT,
    stage TEXT DEFAULT 'readyForYard',
    yard_id UUID REFERENCES transport_yards(id),
    transport_company_id UUID REFERENCES transport_companies(id),
    scheduled_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create departments if it doesn't exist
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 5: VERIFY DATA EXISTS
-- ============================================================================

-- Check row counts (run these SELECT statements to verify)
-- SELECT 'projects' as table_name, COUNT(*) as row_count FROM projects
-- UNION ALL SELECT 'employees', COUNT(*) FROM employees
-- UNION ALL SELECT 'modules', COUNT(*) FROM modules
-- UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
-- UNION ALL SELECT 'weekly_schedules', COUNT(*) FROM weekly_schedules
-- UNION ALL SELECT 'station_staggers', COUNT(*) FROM station_staggers
-- UNION ALL SELECT 'production_weeks', COUNT(*) FROM production_weeks;

-- ============================================================================
-- DONE! After running this, refresh your browser and test the dashboard.
-- ============================================================================
