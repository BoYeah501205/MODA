-- ============================================================================
-- MODA Complete Database Setup
-- Run this ONCE in Supabase SQL Editor to ensure all tables exist
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES TABLE (extends Supabase auth.users)
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

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;

CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

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
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. PROJECTS TABLE
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

ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
GRANT ALL ON projects TO authenticated;
GRANT SELECT ON projects TO anon;

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- ============================================================================
-- 3. MODULES TABLE
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

ALTER TABLE modules DISABLE ROW LEVEL SECURITY;
GRANT ALL ON modules TO authenticated;
GRANT SELECT ON modules TO anon;

CREATE INDEX IF NOT EXISTS idx_modules_project_id ON modules(project_id);
CREATE INDEX IF NOT EXISTS idx_modules_serial_number ON modules(serial_number);
CREATE INDEX IF NOT EXISTS idx_modules_build_sequence ON modules(build_sequence);

-- ============================================================================
-- 4. EMPLOYEES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prefix TEXT,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    suffix TEXT,
    job_title TEXT,
    department TEXT,
    shift TEXT DEFAULT 'Shift-A',
    hire_date DATE,
    email TEXT,
    phone TEXT,
    permissions TEXT DEFAULT 'No Access' CHECK (permissions IN ('No Access', 'User', 'Admin')),
    access_status TEXT DEFAULT 'none' CHECK (access_status IN ('none', 'invited', 'active')),
    supabase_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
GRANT ALL ON employees TO authenticated;
GRANT SELECT ON employees TO anon;

CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_last_name ON employees(last_name);

-- ============================================================================
-- 5. TRANSPORT TABLE
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

ALTER TABLE transport DISABLE ROW LEVEL SECURITY;
GRANT ALL ON transport TO authenticated;
GRANT SELECT ON transport TO anon;

-- ============================================================================
-- 6. WEEKLY_SCHEDULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS weekly_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_type TEXT DEFAULT 'current' CHECK (schedule_type IN ('current', 'completed')),
    week_id TEXT,
    shift1 JSONB DEFAULT '{"monday": 5, "tuesday": 5, "wednesday": 5, "thursday": 5}'::jsonb,
    shift2 JSONB DEFAULT '{"friday": 0, "saturday": 0, "sunday": 0}'::jsonb,
    line_balance INTEGER,
    completed_at TIMESTAMPTZ,
    schedule_snapshot JSONB,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE weekly_schedules DISABLE ROW LEVEL SECURITY;
GRANT ALL ON weekly_schedules TO authenticated;
GRANT SELECT ON weekly_schedules TO anon;

CREATE INDEX IF NOT EXISTS idx_weekly_schedules_type ON weekly_schedules(schedule_type);
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_week_id ON weekly_schedules(week_id);

-- ============================================================================
-- 7. UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_modules_updated_at ON modules;
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
DROP TRIGGER IF EXISTS update_transport_updated_at ON transport;
DROP TRIGGER IF EXISTS update_weekly_schedules_updated_at ON weekly_schedules;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transport_updated_at BEFORE UPDATE ON transport FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_weekly_schedules_updated_at BEFORE UPDATE ON weekly_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. HELPER FUNCTIONS
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

-- ============================================================================
-- 9. ENABLE REALTIME (optional - may error if already enabled)
-- ============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE projects;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE modules;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE employees;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE transport;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE weekly_schedules;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- DONE! All tables are ready for use.
-- ============================================================================
SELECT 'SUCCESS: All MODA tables created/verified!' as status;
