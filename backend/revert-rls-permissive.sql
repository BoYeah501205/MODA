-- ============================================================================
-- REVERT RLS POLICIES - PERMISSIVE (ALL AUTHENTICATED)
-- This script reverts to simple permissive policies where all authenticated
-- users can read and write everything. Run this to undo the admin-only script.
-- Date: 2026-01-25
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- ============================================================================

-- Projects
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;

-- Modules
DROP POLICY IF EXISTS "modules_select" ON modules;
DROP POLICY IF EXISTS "modules_insert" ON modules;
DROP POLICY IF EXISTS "modules_update" ON modules;
DROP POLICY IF EXISTS "modules_delete" ON modules;

-- Employees
DROP POLICY IF EXISTS "employees_select" ON employees;
DROP POLICY IF EXISTS "employees_insert" ON employees;
DROP POLICY IF EXISTS "employees_update" ON employees;
DROP POLICY IF EXISTS "employees_delete" ON employees;

-- Profiles
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

-- Weekly Schedules
DROP POLICY IF EXISTS "weekly_schedules_select" ON weekly_schedules;
DROP POLICY IF EXISTS "weekly_schedules_insert" ON weekly_schedules;
DROP POLICY IF EXISTS "weekly_schedules_update" ON weekly_schedules;
DROP POLICY IF EXISTS "weekly_schedules_delete" ON weekly_schedules;

-- Station Staggers
DROP POLICY IF EXISTS "station_staggers_select" ON station_staggers;
DROP POLICY IF EXISTS "station_staggers_insert" ON station_staggers;
DROP POLICY IF EXISTS "station_staggers_update" ON station_staggers;
DROP POLICY IF EXISTS "station_staggers_delete" ON station_staggers;

-- Production Weeks
DROP POLICY IF EXISTS "production_weeks_select" ON production_weeks;
DROP POLICY IF EXISTS "production_weeks_insert" ON production_weeks;
DROP POLICY IF EXISTS "production_weeks_update" ON production_weeks;
DROP POLICY IF EXISTS "production_weeks_delete" ON production_weeks;

-- Engineering Issues
DROP POLICY IF EXISTS "engineering_issues_select" ON engineering_issues;
DROP POLICY IF EXISTS "engineering_issues_insert" ON engineering_issues;
DROP POLICY IF EXISTS "engineering_issues_update" ON engineering_issues;
DROP POLICY IF EXISTS "engineering_issues_delete" ON engineering_issues;

-- Departments
DROP POLICY IF EXISTS "departments_select" ON departments;
DROP POLICY IF EXISTS "departments_insert" ON departments;
DROP POLICY IF EXISTS "departments_update" ON departments;
DROP POLICY IF EXISTS "departments_delete" ON departments;

-- Stagger Change Log
DROP POLICY IF EXISTS "stagger_change_log_select" ON stagger_change_log;
DROP POLICY IF EXISTS "stagger_change_log_insert" ON stagger_change_log;
DROP POLICY IF EXISTS "stagger_change_log_update" ON stagger_change_log;
DROP POLICY IF EXISTS "stagger_change_log_delete" ON stagger_change_log;

-- Trashed Projects
DROP POLICY IF EXISTS "trashed_projects_select" ON trashed_projects;
DROP POLICY IF EXISTS "trashed_projects_insert" ON trashed_projects;
DROP POLICY IF EXISTS "trashed_projects_update" ON trashed_projects;
DROP POLICY IF EXISTS "trashed_projects_delete" ON trashed_projects;

-- Trashed Employees
DROP POLICY IF EXISTS "trashed_employees_select" ON trashed_employees;
DROP POLICY IF EXISTS "trashed_employees_insert" ON trashed_employees;
DROP POLICY IF EXISTS "trashed_employees_update" ON trashed_employees;
DROP POLICY IF EXISTS "trashed_employees_delete" ON trashed_employees;

-- Unified Modules
DROP POLICY IF EXISTS "unified_modules_select" ON unified_modules;
DROP POLICY IF EXISTS "unified_modules_insert" ON unified_modules;
DROP POLICY IF EXISTS "unified_modules_update" ON unified_modules;
DROP POLICY IF EXISTS "unified_modules_delete" ON unified_modules;

-- Transport
DROP POLICY IF EXISTS "transport_select" ON transport;
DROP POLICY IF EXISTS "transport_insert" ON transport;
DROP POLICY IF EXISTS "transport_update" ON transport;
DROP POLICY IF EXISTS "transport_delete" ON transport;

-- Project Heat Maps
DROP POLICY IF EXISTS "project_heat_maps_select" ON project_heat_maps;
DROP POLICY IF EXISTS "project_heat_maps_insert" ON project_heat_maps;
DROP POLICY IF EXISTS "project_heat_maps_update" ON project_heat_maps;
DROP POLICY IF EXISTS "project_heat_maps_delete" ON project_heat_maps;

-- Activity Log
DROP POLICY IF EXISTS "activity_log_select" ON activity_log;
DROP POLICY IF EXISTS "activity_log_insert" ON activity_log;

-- Audit Log
DROP POLICY IF EXISTS "audit_log_select" ON audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;

-- Drawing Files
DROP POLICY IF EXISTS "drawing_files_select" ON drawing_files;
DROP POLICY IF EXISTS "drawing_files_insert" ON drawing_files;
DROP POLICY IF EXISTS "drawing_files_update" ON drawing_files;
DROP POLICY IF EXISTS "drawing_files_delete" ON drawing_files;

-- Drawing Sheets
DROP POLICY IF EXISTS "drawing_sheets_select" ON drawing_sheets;
DROP POLICY IF EXISTS "drawing_sheets_insert" ON drawing_sheets;
DROP POLICY IF EXISTS "drawing_sheets_update" ON drawing_sheets;
DROP POLICY IF EXISTS "drawing_sheets_delete" ON drawing_sheets;

-- Drawing Folders
DROP POLICY IF EXISTS "drawing_folders_select" ON drawing_folders;
DROP POLICY IF EXISTS "drawing_folders_insert" ON drawing_folders;
DROP POLICY IF EXISTS "drawing_folders_update" ON drawing_folders;
DROP POLICY IF EXISTS "drawing_folders_delete" ON drawing_folders;

-- Daily Reports
DROP POLICY IF EXISTS "daily_reports_select" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_insert" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_update" ON daily_reports;
DROP POLICY IF EXISTS "daily_reports_delete" ON daily_reports;

-- Issue Categories
DROP POLICY IF EXISTS "issue_categories_select" ON issue_categories;
DROP POLICY IF EXISTS "issue_categories_insert" ON issue_categories;
DROP POLICY IF EXISTS "issue_categories_update" ON issue_categories;
DROP POLICY IF EXISTS "issue_categories_delete" ON issue_categories;

-- Shortages
DROP POLICY IF EXISTS "shortages_select" ON shortages;
DROP POLICY IF EXISTS "shortages_insert" ON shortages;
DROP POLICY IF EXISTS "shortages_update" ON shortages;
DROP POLICY IF EXISTS "shortages_delete" ON shortages;

-- ============================================================================
-- STEP 2: CREATE PERMISSIVE POLICIES (ALL AUTHENTICATED CAN READ/WRITE)
-- ============================================================================

-- PROJECTS
CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated USING (true);

-- MODULES
CREATE POLICY "modules_select" ON modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "modules_insert" ON modules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "modules_update" ON modules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "modules_delete" ON modules FOR DELETE TO authenticated USING (true);

-- EMPLOYEES
CREATE POLICY "employees_select" ON employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "employees_insert" ON employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "employees_update" ON employees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "employees_delete" ON employees FOR DELETE TO authenticated USING (true);

-- PROFILES
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (true);

-- WEEKLY SCHEDULES
CREATE POLICY "weekly_schedules_select" ON weekly_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "weekly_schedules_insert" ON weekly_schedules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "weekly_schedules_update" ON weekly_schedules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "weekly_schedules_delete" ON weekly_schedules FOR DELETE TO authenticated USING (true);

-- STATION STAGGERS
CREATE POLICY "station_staggers_select" ON station_staggers FOR SELECT TO authenticated USING (true);
CREATE POLICY "station_staggers_insert" ON station_staggers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "station_staggers_update" ON station_staggers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "station_staggers_delete" ON station_staggers FOR DELETE TO authenticated USING (true);

-- PRODUCTION WEEKS (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_weeks') THEN
        EXECUTE 'CREATE POLICY "production_weeks_select" ON production_weeks FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "production_weeks_insert" ON production_weeks FOR INSERT TO authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "production_weeks_update" ON production_weeks FOR UPDATE TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "production_weeks_delete" ON production_weeks FOR DELETE TO authenticated USING (true)';
    END IF;
END $$;

-- ENGINEERING ISSUES
CREATE POLICY "engineering_issues_select" ON engineering_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "engineering_issues_insert" ON engineering_issues FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "engineering_issues_update" ON engineering_issues FOR UPDATE TO authenticated USING (true);
CREATE POLICY "engineering_issues_delete" ON engineering_issues FOR DELETE TO authenticated USING (true);

-- DEPARTMENTS
CREATE POLICY "departments_select" ON departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_insert" ON departments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "departments_update" ON departments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "departments_delete" ON departments FOR DELETE TO authenticated USING (true);

-- STAGGER CHANGE LOG
CREATE POLICY "stagger_change_log_select" ON stagger_change_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "stagger_change_log_insert" ON stagger_change_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "stagger_change_log_update" ON stagger_change_log FOR UPDATE TO authenticated USING (true);
CREATE POLICY "stagger_change_log_delete" ON stagger_change_log FOR DELETE TO authenticated USING (true);

-- TRASHED PROJECTS
CREATE POLICY "trashed_projects_select" ON trashed_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "trashed_projects_insert" ON trashed_projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "trashed_projects_update" ON trashed_projects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "trashed_projects_delete" ON trashed_projects FOR DELETE TO authenticated USING (true);

-- TRASHED EMPLOYEES
CREATE POLICY "trashed_employees_select" ON trashed_employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "trashed_employees_insert" ON trashed_employees FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "trashed_employees_update" ON trashed_employees FOR UPDATE TO authenticated USING (true);
CREATE POLICY "trashed_employees_delete" ON trashed_employees FOR DELETE TO authenticated USING (true);

-- UNIFIED MODULES (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unified_modules') THEN
        EXECUTE 'CREATE POLICY "unified_modules_select" ON unified_modules FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "unified_modules_insert" ON unified_modules FOR INSERT TO authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "unified_modules_update" ON unified_modules FOR UPDATE TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "unified_modules_delete" ON unified_modules FOR DELETE TO authenticated USING (true)';
    END IF;
END $$;

-- TRANSPORT (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transport') THEN
        EXECUTE 'CREATE POLICY "transport_select" ON transport FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "transport_insert" ON transport FOR INSERT TO authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "transport_update" ON transport FOR UPDATE TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "transport_delete" ON transport FOR DELETE TO authenticated USING (true)';
    END IF;
END $$;

-- PROJECT HEAT MAPS (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_heat_maps') THEN
        EXECUTE 'CREATE POLICY "project_heat_maps_select" ON project_heat_maps FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "project_heat_maps_insert" ON project_heat_maps FOR INSERT TO authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "project_heat_maps_update" ON project_heat_maps FOR UPDATE TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "project_heat_maps_delete" ON project_heat_maps FOR DELETE TO authenticated USING (true)';
    END IF;
END $$;

-- ACTIVITY LOG
CREATE POLICY "activity_log_select" ON activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "activity_log_insert" ON activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- AUDIT LOG
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- DRAWING FILES (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'drawing_files') THEN
        EXECUTE 'CREATE POLICY "drawing_files_select" ON drawing_files FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "drawing_files_insert" ON drawing_files FOR INSERT TO authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "drawing_files_update" ON drawing_files FOR UPDATE TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "drawing_files_delete" ON drawing_files FOR DELETE TO authenticated USING (true)';
    END IF;
END $$;

-- DRAWING SHEETS (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'drawing_sheets') THEN
        EXECUTE 'CREATE POLICY "drawing_sheets_select" ON drawing_sheets FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "drawing_sheets_insert" ON drawing_sheets FOR INSERT TO authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "drawing_sheets_update" ON drawing_sheets FOR UPDATE TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "drawing_sheets_delete" ON drawing_sheets FOR DELETE TO authenticated USING (true)';
    END IF;
END $$;

-- DRAWING FOLDERS (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'drawing_folders') THEN
        EXECUTE 'CREATE POLICY "drawing_folders_select" ON drawing_folders FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "drawing_folders_insert" ON drawing_folders FOR INSERT TO authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "drawing_folders_update" ON drawing_folders FOR UPDATE TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "drawing_folders_delete" ON drawing_folders FOR DELETE TO authenticated USING (true)';
    END IF;
END $$;

-- DAILY REPORTS (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_reports') THEN
        EXECUTE 'CREATE POLICY "daily_reports_select" ON daily_reports FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "daily_reports_insert" ON daily_reports FOR INSERT TO authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "daily_reports_update" ON daily_reports FOR UPDATE TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "daily_reports_delete" ON daily_reports FOR DELETE TO authenticated USING (true)';
    END IF;
END $$;

-- ISSUE CATEGORIES (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'issue_categories') THEN
        EXECUTE 'CREATE POLICY "issue_categories_select" ON issue_categories FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "issue_categories_insert" ON issue_categories FOR INSERT TO authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "issue_categories_update" ON issue_categories FOR UPDATE TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "issue_categories_delete" ON issue_categories FOR DELETE TO authenticated USING (true)';
    END IF;
END $$;

-- SHORTAGES (if exists)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shortages') THEN
        EXECUTE 'CREATE POLICY "shortages_select" ON shortages FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "shortages_insert" ON shortages FOR INSERT TO authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "shortages_update" ON shortages FOR UPDATE TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "shortages_delete" ON shortages FOR DELETE TO authenticated USING (true)';
    END IF;
END $$;

-- ============================================================================
-- DONE - All authenticated users can now read/write all tables
-- ============================================================================
SELECT 'Reverted to permissive policies - all authenticated users can read/write' as status;
