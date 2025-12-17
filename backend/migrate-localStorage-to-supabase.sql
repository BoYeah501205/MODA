-- ============================================================================
-- MODA: Migrate Remaining localStorage Data to Supabase
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. STATION STAGGERS TABLE
-- Stores the stagger offset configuration for each production station
-- ============================================================================
CREATE TABLE IF NOT EXISTS station_staggers (
    id TEXT PRIMARY KEY DEFAULT 'current',
    staggers JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE station_staggers DISABLE ROW LEVEL SECURITY;
GRANT ALL ON station_staggers TO authenticated;
GRANT SELECT ON station_staggers TO anon;

-- ============================================================================
-- 2. STAGGER CHANGE LOG TABLE
-- Audit trail for stagger configuration changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS stagger_change_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    description TEXT NOT NULL,
    changes JSONB DEFAULT '{}'::jsonb,
    staggers_snapshot JSONB DEFAULT '{}'::jsonb,
    changed_by TEXT,
    changed_by_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stagger_change_log DISABLE ROW LEVEL SECURITY;
GRANT ALL ON stagger_change_log TO authenticated;
GRANT SELECT ON stagger_change_log TO anon;

CREATE INDEX IF NOT EXISTS idx_stagger_change_log_created ON stagger_change_log(created_at DESC);

-- ============================================================================
-- 3. ENGINEERING ISSUES TABLE
-- Tracks engineering/design issues for modules
-- ============================================================================
CREATE TABLE IF NOT EXISTS engineering_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id TEXT,
    project_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to TEXT,
    reported_by TEXT,
    reported_by_id UUID REFERENCES auth.users(id),
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE engineering_issues DISABLE ROW LEVEL SECURITY;
GRANT ALL ON engineering_issues TO authenticated;
GRANT SELECT ON engineering_issues TO anon;

CREATE INDEX IF NOT EXISTS idx_engineering_issues_status ON engineering_issues(status);
CREATE INDEX IF NOT EXISTS idx_engineering_issues_module ON engineering_issues(module_id);
CREATE INDEX IF NOT EXISTS idx_engineering_issues_project ON engineering_issues(project_id);

-- ============================================================================
-- 4. TRASHED PROJECTS TABLE
-- Soft-deleted projects (recoverable for 90 days)
-- ============================================================================
CREATE TABLE IF NOT EXISTS trashed_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_id TEXT,
    name TEXT NOT NULL,
    status TEXT,
    location TEXT,
    modules JSONB DEFAULT '[]'::jsonb,
    project_data JSONB DEFAULT '{}'::jsonb,
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_by UUID REFERENCES auth.users(id),
    deleted_by_name TEXT
);

ALTER TABLE trashed_projects DISABLE ROW LEVEL SECURITY;
GRANT ALL ON trashed_projects TO authenticated;
GRANT SELECT ON trashed_projects TO anon;

CREATE INDEX IF NOT EXISTS idx_trashed_projects_deleted_at ON trashed_projects(deleted_at DESC);

-- ============================================================================
-- 5. TRASHED EMPLOYEES TABLE
-- Soft-deleted employees (recoverable for 90 days)
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
    deleted_by UUID REFERENCES auth.users(id),
    deleted_by_name TEXT
);

ALTER TABLE trashed_employees DISABLE ROW LEVEL SECURITY;
GRANT ALL ON trashed_employees TO authenticated;
GRANT SELECT ON trashed_employees TO anon;

CREATE INDEX IF NOT EXISTS idx_trashed_employees_deleted_at ON trashed_employees(deleted_at DESC);

-- ============================================================================
-- 6. UNIFIED MODULES TABLE (if needed separately from projects)
-- For modules that have completed close-up and are tracked independently
-- ============================================================================
CREATE TABLE IF NOT EXISTS unified_modules (
    id TEXT PRIMARY KEY,
    serial_number TEXT,
    blm_id TEXT,
    unit_type TEXT,
    project_id TEXT,
    project_name TEXT,
    stage_progress JSONB DEFAULT '{}'::jsonb,
    completed_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE unified_modules DISABLE ROW LEVEL SECURITY;
GRANT ALL ON unified_modules TO authenticated;
GRANT SELECT ON unified_modules TO anon;

CREATE INDEX IF NOT EXISTS idx_unified_modules_project ON unified_modules(project_id);

-- ============================================================================
-- Enable Realtime for all new tables
-- ============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE station_staggers;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE stagger_change_log;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE engineering_issues;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE trashed_projects;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE trashed_employees;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE unified_modules;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- Success message
-- ============================================================================
SELECT 'SUCCESS: All localStorage migration tables created!' as status;
