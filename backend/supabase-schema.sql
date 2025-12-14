-- ============================================================================
-- MODA Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up your database
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    dashboard_role TEXT DEFAULT 'employee',
    is_protected BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role = 'admin'
        )
    );

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, dashboard_role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        'employee'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'Planning' CHECK (status IN ('Planning', 'Active', 'On Hold', 'Complete', 'Archived')),
    location TEXT,
    client TEXT,
    start_date DATE,
    end_date DATE,
    modules JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Projects policies (all authenticated users can read, admins can write)
CREATE POLICY "Authenticated users can view projects" ON projects
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert projects" ON projects
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role IN ('admin', 'department-supervisor', 'coordinator')
        )
    );

CREATE POLICY "Admins can update projects" ON projects
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role IN ('admin', 'department-supervisor', 'coordinator')
        )
    );

CREATE POLICY "Admins can delete projects" ON projects
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role = 'admin'
        )
    );

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- ============================================================================
-- MODULES TABLE (normalized, optional - can also use JSONB in projects)
-- ============================================================================
CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    serial_number TEXT NOT NULL,
    blm_id TEXT,
    unit_type TEXT,
    build_sequence INTEGER DEFAULT 0,
    stage_progress JSONB DEFAULT '{}'::jsonb,
    difficulties JSONB DEFAULT '{}'::jsonb,
    station_completed_at JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- Modules policies
CREATE POLICY "Authenticated users can view modules" ON modules
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authorized users can insert modules" ON modules
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role IN ('admin', 'department-supervisor', 'coordinator')
        )
    );

CREATE POLICY "Authorized users can update modules" ON modules
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role IN ('admin', 'department-supervisor', 'coordinator')
        )
    );

CREATE POLICY "Admins can delete modules" ON modules
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role = 'admin'
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_modules_project_id ON modules(project_id);
CREATE INDEX IF NOT EXISTS idx_modules_serial_number ON modules(serial_number);
CREATE INDEX IF NOT EXISTS idx_modules_build_sequence ON modules(build_sequence);

-- ============================================================================
-- EMPLOYEES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Name fields (structured)
    prefix TEXT,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    suffix TEXT,
    -- Job info
    job_title TEXT,
    department TEXT,
    shift TEXT DEFAULT 'Shift-A',
    hire_date DATE,
    -- Contact
    email TEXT,
    phone TEXT,
    -- MODA Access
    permissions TEXT DEFAULT 'No Access' CHECK (permissions IN ('No Access', 'User', 'Admin')),
    access_status TEXT DEFAULT 'none' CHECK (access_status IN ('none', 'invited', 'active')),
    -- Link to Supabase Auth user (null if no MODA access)
    supabase_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Employees policies
CREATE POLICY "Authenticated users can view employees" ON employees
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authorized users can insert employees" ON employees
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role IN ('admin', 'department-supervisor')
        )
    );

CREATE POLICY "Authorized users can update employees" ON employees
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role IN ('admin', 'department-supervisor')
        )
    );

CREATE POLICY "Admins can delete employees" ON employees
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role = 'admin'
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_supabase_user_id ON employees(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_last_name ON employees(last_name);

-- ============================================================================
-- TRANSPORT TABLE (for yard/shipping tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transport (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_transit', 'delivered', 'cancelled')),
    pickup_date DATE,
    delivery_date DATE,
    carrier TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE transport ENABLE ROW LEVEL SECURITY;

-- Transport policies
CREATE POLICY "Authenticated users can view transport" ON transport
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authorized users can manage transport" ON transport
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role IN ('admin', 'department-supervisor', 'coordinator')
        )
    );

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at
    BEFORE UPDATE ON modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transport_updated_at
    BEFORE UPDATE ON transport
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ENABLE REALTIME FOR TABLES
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE modules;
ALTER PUBLICATION supabase_realtime ADD TABLE employees;
ALTER PUBLICATION supabase_realtime ADD TABLE transport;

-- ============================================================================
-- SEED ADMIN USER (run after creating first user via signup)
-- Replace 'YOUR_ADMIN_USER_ID' with actual UUID after first signup
-- ============================================================================
-- UPDATE profiles 
-- SET dashboard_role = 'admin', is_protected = true 
-- WHERE email = 'trevor@autovol.com';

-- ============================================================================
-- MIGRATION: Update existing employees table (run if table already exists)
-- ============================================================================
-- If you already have an employees table with the old schema, run this:
/*
-- Add new columns
ALTER TABLE employees ADD COLUMN IF NOT EXISTS prefix TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS suffix TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift TEXT DEFAULT 'Shift-A';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS permissions TEXT DEFAULT 'No Access';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS access_status TEXT DEFAULT 'none';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS supabase_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add constraints
ALTER TABLE employees ADD CONSTRAINT chk_permissions CHECK (permissions IN ('No Access', 'User', 'Admin'));
ALTER TABLE employees ADD CONSTRAINT chk_access_status CHECK (access_status IN ('none', 'invited', 'active'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_supabase_user_id ON employees(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_last_name ON employees(last_name);

-- Migrate existing name data (if you had a single 'name' column)
-- UPDATE employees SET first_name = split_part(name, ' ', 1), last_name = split_part(name, ' ', 2) WHERE first_name IS NULL;
*/

-- ============================================================================
-- FUNCTION: Link employee to Supabase user by email
-- ============================================================================
CREATE OR REPLACE FUNCTION link_employee_to_user(employee_email TEXT)
RETURNS UUID AS $$
DECLARE
    user_id UUID;
BEGIN
    -- Find user by email in auth.users
    SELECT id INTO user_id FROM auth.users WHERE email = employee_email;
    
    IF user_id IS NOT NULL THEN
        -- Update employee record with user ID and set status to active
        UPDATE employees 
        SET supabase_user_id = user_id, access_status = 'active'
        WHERE email = employee_email AND supabase_user_id IS NULL;
    END IF;
    
    RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Check if email exists in auth.users (for invite flow)
-- ============================================================================
CREATE OR REPLACE FUNCTION check_user_exists(check_email TEXT)
RETURNS TABLE(user_id UUID, user_email TEXT, created_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.email, u.created_at
    FROM auth.users u
    WHERE u.email = check_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
