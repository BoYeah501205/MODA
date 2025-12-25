-- ============================================================================
-- MODA On-Site Module & Production Weeks Tables
-- Run this in the Supabase SQL Editor
-- ============================================================================

-- Drop existing tables if they exist (for clean re-run)
DROP TABLE IF EXISTS set_issues CASCADE;
DROP TABLE IF EXISTS daily_site_reports CASCADE;
DROP TABLE IF EXISTS set_schedules CASCADE;
DROP TABLE IF EXISTS production_weeks CASCADE;

-- ============================================================================
-- SET_SCHEDULES TABLE
-- Stores set day schedules for field operations
-- ============================================================================
CREATE TABLE set_schedules (
    id TEXT PRIMARY KEY,
    -- Schedule info
    project_id TEXT,
    project_name TEXT,
    site_name TEXT,
    scheduled_date DATE NOT NULL,
    scheduled_start_time TEXT,
    scheduled_end_time TEXT,
    -- Status tracking
    status TEXT DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'In Progress', 'Complete', 'Cancelled')),
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    -- Modules to be set (array of module objects with status)
    modules JSONB DEFAULT '[]'::jsonb,
    -- Weather conditions
    weather JSONB DEFAULT '{}'::jsonb,
    -- Crew info
    crane_company TEXT,
    crane_operator TEXT,
    crew_lead TEXT,
    crew_members JSONB DEFAULT '[]'::jsonb,
    -- Notes
    notes TEXT,
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE set_schedules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view set_schedules" ON set_schedules
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authorized users can insert set_schedules" ON set_schedules
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role IN ('admin', 'department-supervisor', 'coordinator', 'onsite')
        )
    );

CREATE POLICY "Authorized users can update set_schedules" ON set_schedules
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role IN ('admin', 'department-supervisor', 'coordinator', 'onsite')
        )
    );

CREATE POLICY "Admins can delete set_schedules" ON set_schedules
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role = 'admin'
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_set_schedules_date ON set_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_set_schedules_status ON set_schedules(status);
CREATE INDEX IF NOT EXISTS idx_set_schedules_project ON set_schedules(project_id);

-- ============================================================================
-- SET_ISSUES TABLE
-- Stores issues reported during set operations
-- ============================================================================
CREATE TABLE set_issues (
    id TEXT PRIMARY KEY,
    -- References
    set_id TEXT REFERENCES set_schedules(id) ON DELETE SET NULL,
    module_id TEXT,
    project_id TEXT,
    -- Issue details
    title TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN ('Safety', 'Quality', 'Logistics', 'Weather', 'Equipment', 'Other')),
    severity TEXT DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    -- Status
    status TEXT DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
    -- Resolution
    resolution TEXT,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    -- Photos/attachments
    photos JSONB DEFAULT '[]'::jsonb,
    -- Reporter
    reported_by TEXT,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE set_issues ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view set_issues" ON set_issues
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authorized users can insert set_issues" ON set_issues
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role IN ('admin', 'department-supervisor', 'coordinator', 'onsite', 'qa_inspector')
        )
    );

CREATE POLICY "Authorized users can update set_issues" ON set_issues
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role IN ('admin', 'department-supervisor', 'coordinator', 'onsite', 'qa_inspector')
        )
    );

CREATE POLICY "Admins can delete set_issues" ON set_issues
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role = 'admin'
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_set_issues_set ON set_issues(set_id);
CREATE INDEX IF NOT EXISTS idx_set_issues_status ON set_issues(status);
CREATE INDEX IF NOT EXISTS idx_set_issues_module ON set_issues(module_id);

-- ============================================================================
-- DAILY_SITE_REPORTS TABLE
-- Stores daily site reports for field operations
-- ============================================================================
CREATE TABLE daily_site_reports (
    id TEXT PRIMARY KEY,
    -- Report identification
    date DATE NOT NULL,
    project_id TEXT,
    report_type TEXT DEFAULT 'set-day' CHECK (report_type IN ('set-day', 'weather-day', 'non-work')),
    -- Header info
    autovol_rep TEXT,
    general_contractor TEXT,
    -- Weather
    weather JSONB DEFAULT '{}'::jsonb,
    -- Progress tracking
    progress JSONB DEFAULT '{"unitsSetToday": 0, "unitsSetTotal": 0, "unitsRemaining": 0}'::jsonb,
    -- Timeline
    timeline JSONB DEFAULT '{}'::jsonb,
    -- Content
    global_items JSONB DEFAULT '[]'::jsonb,
    modules_set_today JSONB DEFAULT '[]'::jsonb,
    issues JSONB DEFAULT '[]'::jsonb,
    general_notes TEXT,
    -- Crew
    crew JSONB DEFAULT '[]'::jsonb,
    -- Photos
    photos JSONB DEFAULT '[]'::jsonb,
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'sent')),
    generated_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    sent_to JSONB DEFAULT '[]'::jsonb,
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE daily_site_reports ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view daily_site_reports" ON daily_site_reports
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authorized users can insert daily_site_reports" ON daily_site_reports
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role IN ('admin', 'department-supervisor', 'coordinator', 'onsite')
        )
    );

CREATE POLICY "Authorized users can update daily_site_reports" ON daily_site_reports
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role IN ('admin', 'department-supervisor', 'coordinator', 'onsite')
        )
    );

CREATE POLICY "Admins can delete daily_site_reports" ON daily_site_reports
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role = 'admin'
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_site_reports_date ON daily_site_reports(date);
CREATE INDEX IF NOT EXISTS idx_daily_site_reports_project ON daily_site_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_site_reports_status ON daily_site_reports(status);

-- ============================================================================
-- PRODUCTION_WEEKS TABLE
-- Stores production week tracking data
-- ============================================================================
CREATE TABLE production_weeks (
    id TEXT PRIMARY KEY,
    -- Week identification
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    week_id TEXT, -- e.g., '2025-W01'
    start_date DATE,
    end_date DATE,
    -- Production data
    planned_modules INTEGER DEFAULT 0,
    actual_modules INTEGER DEFAULT 0,
    -- Status
    status TEXT DEFAULT 'Planned' CHECK (status IN ('Planned', 'Active', 'Complete')),
    -- Notes
    notes TEXT,
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Unique constraint on week/year
    UNIQUE(week_number, year)
);

-- Enable Row Level Security
ALTER TABLE production_weeks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view production_weeks" ON production_weeks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authorized users can insert production_weeks" ON production_weeks
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role IN ('admin', 'department-supervisor', 'production_management')
        )
    );

CREATE POLICY "Authorized users can update production_weeks" ON production_weeks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role IN ('admin', 'department-supervisor', 'production_management')
        )
    );

CREATE POLICY "Admins can delete production_weeks" ON production_weeks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role = 'admin'
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_production_weeks_year ON production_weeks(year);
CREATE INDEX IF NOT EXISTS idx_production_weeks_status ON production_weeks(status);
CREATE INDEX IF NOT EXISTS idx_production_weeks_week_id ON production_weeks(week_id);

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================
CREATE TRIGGER update_set_schedules_updated_at
    BEFORE UPDATE ON set_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_set_issues_updated_at
    BEFORE UPDATE ON set_issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_site_reports_updated_at
    BEFORE UPDATE ON daily_site_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_weeks_updated_at
    BEFORE UPDATE ON production_weeks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE set_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE set_issues;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_site_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE production_weeks;
