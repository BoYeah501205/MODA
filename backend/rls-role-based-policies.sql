-- ============================================================================
-- MODA ROLE-BASED RLS POLICIES
-- Run this in Supabase SQL Editor to implement proper security
-- Date: January 2025
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Get current user's dashboard role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        (SELECT dashboard_role FROM profiles WHERE id = auth.uid()),
        'employee'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is admin or protected
CREATE OR REPLACE FUNCTION is_admin_or_protected()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (dashboard_role = 'admin' OR is_protected = true)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user can edit a specific tab
CREATE OR REPLACE FUNCTION can_edit_tab(tab_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    editable_tabs TEXT[];
BEGIN
    -- Admin and protected users can edit everything
    IF is_admin_or_protected() THEN
        RETURN true;
    END IF;
    
    user_role := get_user_role();
    
    -- Define editable tabs per role
    CASE user_role
        WHEN 'production_management' THEN
            editable_tabs := ARRAY['production', 'projects', 'schedule_setup', 'weekly_board', 'station_stagger'];
        WHEN 'production_supervisor' THEN
            editable_tabs := ARRAY['production', 'weekly_board'];
        WHEN 'qa_inspector' THEN
            editable_tabs := ARRAY['qa'];
        WHEN 'transportation' THEN
            editable_tabs := ARRAY['transport'];
        WHEN 'supply_chain' THEN
            editable_tabs := ARRAY['equipment'];
        WHEN 'preconstruction' THEN
            editable_tabs := ARRAY['projects'];
        WHEN 'onsite' THEN
            editable_tabs := ARRAY['onsite'];
        WHEN 'engineering' THEN
            editable_tabs := ARRAY['engineering', 'station_stagger'];
        WHEN 'maintenance' THEN
            editable_tabs := ARRAY['equipment'];
        ELSE
            editable_tabs := ARRAY[]::TEXT[];
    END CASE;
    
    RETURN tab_id = ANY(editable_tabs);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 2: DROP EXISTING PERMISSIVE POLICIES
-- ============================================================================

-- Projects
DROP POLICY IF EXISTS "Allow authenticated read" ON projects;
DROP POLICY IF EXISTS "Allow authenticated write" ON projects;
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;

-- Modules
DROP POLICY IF EXISTS "Allow authenticated read" ON modules;
DROP POLICY IF EXISTS "Allow authenticated write" ON modules;
DROP POLICY IF EXISTS "modules_select" ON modules;
DROP POLICY IF EXISTS "modules_insert" ON modules;
DROP POLICY IF EXISTS "modules_update" ON modules;
DROP POLICY IF EXISTS "modules_delete" ON modules;

-- Employees
DROP POLICY IF EXISTS "Allow authenticated read" ON employees;
DROP POLICY IF EXISTS "Allow authenticated write" ON employees;
DROP POLICY IF EXISTS "employees_select" ON employees;
DROP POLICY IF EXISTS "employees_modify" ON employees;

-- Profiles
DROP POLICY IF EXISTS "Allow authenticated read" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated write" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;

-- Weekly Schedules
DROP POLICY IF EXISTS "Allow authenticated read" ON weekly_schedules;
DROP POLICY IF EXISTS "Allow authenticated write" ON weekly_schedules;
DROP POLICY IF EXISTS "weekly_schedules_select" ON weekly_schedules;
DROP POLICY IF EXISTS "weekly_schedules_modify" ON weekly_schedules;

-- Station Staggers
DROP POLICY IF EXISTS "Allow authenticated read" ON station_staggers;
DROP POLICY IF EXISTS "Allow authenticated write" ON station_staggers;

-- Production Weeks
DROP POLICY IF EXISTS "Allow authenticated read" ON production_weeks;
DROP POLICY IF EXISTS "Allow authenticated write" ON production_weeks;

-- Engineering Issues
DROP POLICY IF EXISTS "Allow authenticated read" ON engineering_issues;
DROP POLICY IF EXISTS "Allow authenticated write" ON engineering_issues;

-- Activity Log (table may not exist yet - will be created in Step 4)
-- Policies will be created after table creation in Step 4

-- ============================================================================
-- STEP 3: CREATE ROLE-BASED POLICIES
-- ============================================================================

-- PROJECTS: All can read, specific roles can write
CREATE POLICY "projects_select" ON projects
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "projects_insert" ON projects
    FOR INSERT TO authenticated
    WITH CHECK (
        is_admin_or_protected() OR
        get_user_role() IN ('production_management', 'preconstruction')
    );

CREATE POLICY "projects_update" ON projects
    FOR UPDATE TO authenticated
    USING (
        is_admin_or_protected() OR
        get_user_role() IN ('production_management', 'preconstruction', 'production_supervisor')
    );

CREATE POLICY "projects_delete" ON projects
    FOR DELETE TO authenticated
    USING (is_admin_or_protected());

-- MODULES: All can read, production roles can write
CREATE POLICY "modules_select" ON modules
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "modules_insert" ON modules
    FOR INSERT TO authenticated
    WITH CHECK (
        is_admin_or_protected() OR
        get_user_role() IN ('production_management', 'preconstruction', 'production_supervisor')
    );

CREATE POLICY "modules_update" ON modules
    FOR UPDATE TO authenticated
    USING (
        is_admin_or_protected() OR
        get_user_role() IN ('production_management', 'production_supervisor', 'qa_inspector')
    );

CREATE POLICY "modules_delete" ON modules
    FOR DELETE TO authenticated
    USING (is_admin_or_protected());

-- EMPLOYEES: All can read, admin/management can write
CREATE POLICY "employees_select" ON employees
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "employees_modify" ON employees
    FOR ALL TO authenticated
    USING (
        is_admin_or_protected() OR
        get_user_role() = 'production_management'
    )
    WITH CHECK (
        is_admin_or_protected() OR
        get_user_role() = 'production_management'
    );

-- PROFILES: All can read, users can update own, admins can update any
CREATE POLICY "profiles_select" ON profiles
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "profiles_insert" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_admin" ON profiles
    FOR UPDATE TO authenticated
    USING (is_admin_or_protected())
    WITH CHECK (is_admin_or_protected());

-- WEEKLY_SCHEDULES: All can read, specific users can write
CREATE POLICY "weekly_schedules_select" ON weekly_schedules
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "weekly_schedules_modify" ON weekly_schedules
    FOR ALL TO authenticated
    USING (
        is_admin_or_protected() OR
        get_user_role() IN ('production_management', 'production_supervisor') OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND email IN ('trevor@autovol.com', 'stephanie@autovol.com')
        )
    )
    WITH CHECK (
        is_admin_or_protected() OR
        get_user_role() IN ('production_management', 'production_supervisor') OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND email IN ('trevor@autovol.com', 'stephanie@autovol.com')
        )
    );

-- STATION_STAGGERS: All can read, engineering/production can write
CREATE POLICY "station_staggers_select" ON station_staggers
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "station_staggers_modify" ON station_staggers
    FOR ALL TO authenticated
    USING (
        is_admin_or_protected() OR
        get_user_role() IN ('production_management', 'engineering')
    )
    WITH CHECK (
        is_admin_or_protected() OR
        get_user_role() IN ('production_management', 'engineering')
    );

-- PRODUCTION_WEEKS: All can read, production roles can write
CREATE POLICY "production_weeks_select" ON production_weeks
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "production_weeks_modify" ON production_weeks
    FOR ALL TO authenticated
    USING (
        is_admin_or_protected() OR
        get_user_role() IN ('production_management', 'production_supervisor')
    )
    WITH CHECK (
        is_admin_or_protected() OR
        get_user_role() IN ('production_management', 'production_supervisor')
    );

-- ENGINEERING_ISSUES: All can read, engineering roles can write
CREATE POLICY "engineering_issues_select" ON engineering_issues
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "engineering_issues_modify" ON engineering_issues
    FOR ALL TO authenticated
    USING (
        is_admin_or_protected() OR
        get_user_role() IN ('engineering', 'production_management', 'qa_inspector')
    )
    WITH CHECK (
        is_admin_or_protected() OR
        get_user_role() IN ('engineering', 'production_management', 'qa_inspector')
    );

-- ============================================================================
-- STEP 4: CREATE ACTIVITY_LOG AND AUDIT_LOG TABLES WITH POLICIES
-- ============================================================================

-- Create activity_log table if not exists (for user activity tracking)
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    user_name TEXT,
    action_type TEXT NOT NULL,
    action_category TEXT,
    entity_type TEXT,
    entity_id TEXT,
    entity_name TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on activity_log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "activity_log_select" ON activity_log;
DROP POLICY IF EXISTS "activity_log_insert" ON activity_log;

-- ACTIVITY_LOG: All can read, all authenticated can write (for logging)
CREATE POLICY "activity_log_select" ON activity_log
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "activity_log_insert" ON activity_log
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Create audit_log table if not exists (for data change auditing)
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    user_email TEXT,
    user_role TEXT
);

-- Enable RLS on audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log policies - all authenticated can read, system can write
CREATE POLICY "audit_log_select" ON audit_log
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "audit_log_insert" ON audit_log
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    user_email_val TEXT;
    user_role_val TEXT;
BEGIN
    -- Get user info
    SELECT email, dashboard_role INTO user_email_val, user_role_val
    FROM profiles WHERE id = auth.uid();
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, new_data, changed_by, user_email, user_role)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), auth.uid(), user_email_val, user_role_val);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data, new_data, changed_by, user_email, user_role)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid(), user_email_val, user_role_val);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data, changed_by, user_email, user_role)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid(), user_email_val, user_role_val);
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to critical tables
DROP TRIGGER IF EXISTS projects_audit ON projects;
CREATE TRIGGER projects_audit 
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS modules_audit ON modules;
CREATE TRIGGER modules_audit 
    AFTER INSERT OR UPDATE OR DELETE ON modules
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS employees_audit ON employees;
CREATE TRIGGER employees_audit 
    AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS profiles_audit ON profiles;
CREATE TRIGGER profiles_audit 
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================================================
-- STEP 5: VERIFY POLICIES
-- ============================================================================

-- List all policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
