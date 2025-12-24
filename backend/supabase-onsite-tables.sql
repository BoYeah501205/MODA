-- =====================================================
-- MODA ON-SITES MODULE - DATABASE SCHEMA
-- Migration: Create On-Sites tables and policies
-- Author: Trevor Fletcher
-- Date: December 2024
-- =====================================================

-- ============================================
-- 1. DAILY SITE REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS onsite_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    superintendent_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    
    -- Weather conditions
    temp_am INTEGER,
    temp_pm INTEGER,
    precipitation VARCHAR(50) DEFAULT 'none',
    wind VARCHAR(50) DEFAULT 'light',
    
    -- Progress tracking
    units_set_today INTEGER DEFAULT 0,
    units_set_total INTEGER DEFAULT 0,
    units_remaining INTEGER DEFAULT 0,
    
    -- Report type and notes
    report_type VARCHAR(50) DEFAULT 'set-day',
    general_notes TEXT,
    
    -- Metadata
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_daily_report UNIQUE (date, project_id)
);

-- ============================================
-- 2. MODULE-SPECIFIC ISSUES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS onsite_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES onsite_reports(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    
    -- Issue details
    issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN ('quality', 'material', 'question', 'site', 'transit', 'drawing', 'other')),
    severity VARCHAR(20) DEFAULT 'minor' CHECK (severity IN ('critical', 'major', 'minor')),
    trade VARCHAR(50),
    description TEXT NOT NULL,
    action_taken TEXT,
    
    -- Photos (stored as JSONB array of base64 strings or URLs)
    photos JSONB DEFAULT '[]'::jsonb,
    
    -- Two-way communication fields (factory response)
    factory_response TEXT,
    root_cause TEXT,
    remedial_action TEXT,
    responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    responded_at TIMESTAMPTZ,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    resolved_at TIMESTAMPTZ,
    
    -- Metadata
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. GLOBAL ISSUES TABLE (site-wide issues)
-- ============================================
CREATE TABLE IF NOT EXISTS onsite_global_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES onsite_reports(id) ON DELETE CASCADE,
    
    -- Issue details
    issue_type VARCHAR(50) NOT NULL CHECK (issue_type IN ('quality', 'material', 'question', 'site', 'transit', 'drawing', 'other')),
    priority VARCHAR(20) DEFAULT 'fyi' CHECK (priority IN ('attention', 'fyi', 'resolved')),
    description TEXT NOT NULL,
    
    -- Metadata
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. MODULES SET TODAY (tracking which modules were set)
-- ============================================
CREATE TABLE IF NOT EXISTS onsite_modules_set (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES onsite_reports(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    
    -- Set details
    set_time TIMESTAMPTZ DEFAULT NOW(),
    set_by TEXT,
    notes TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate entries
    CONSTRAINT unique_module_set_per_report UNIQUE (report_id, module_id)
);

-- ============================================
-- 5. PERFORMANCE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_onsite_reports_date ON onsite_reports(date DESC);
CREATE INDEX IF NOT EXISTS idx_onsite_reports_project ON onsite_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_onsite_reports_superintendent ON onsite_reports(superintendent_id);
CREATE INDEX IF NOT EXISTS idx_onsite_reports_created_by ON onsite_reports(created_by);

CREATE INDEX IF NOT EXISTS idx_onsite_issues_report ON onsite_issues(report_id);
CREATE INDEX IF NOT EXISTS idx_onsite_issues_module ON onsite_issues(module_id);
CREATE INDEX IF NOT EXISTS idx_onsite_issues_status ON onsite_issues(status);
CREATE INDEX IF NOT EXISTS idx_onsite_issues_created ON onsite_issues(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_onsite_global_issues_report ON onsite_global_issues(report_id);

CREATE INDEX IF NOT EXISTS idx_onsite_modules_set_report ON onsite_modules_set(report_id);
CREATE INDEX IF NOT EXISTS idx_onsite_modules_set_module ON onsite_modules_set(module_id);

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE onsite_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE onsite_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE onsite_global_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE onsite_modules_set ENABLE ROW LEVEL SECURITY;

-- REPORTS POLICIES
CREATE POLICY "Anyone authenticated can read reports" 
ON onsite_reports FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create reports" 
ON onsite_reports FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own reports or admins can update any" 
ON onsite_reports FOR UPDATE 
USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND dashboard_role = 'admin')
);

CREATE POLICY "Admins can delete reports" 
ON onsite_reports FOR DELETE 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND dashboard_role = 'admin')
);

-- ISSUES POLICIES
CREATE POLICY "Anyone authenticated can read issues" 
ON onsite_issues FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create issues" 
ON onsite_issues FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own issues or admins can update any" 
ON onsite_issues FOR UPDATE 
USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND dashboard_role = 'admin')
);

CREATE POLICY "Admins can delete issues" 
ON onsite_issues FOR DELETE 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND dashboard_role = 'admin')
);

-- GLOBAL ISSUES POLICIES
CREATE POLICY "Anyone authenticated can read global issues" 
ON onsite_global_issues FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create global issues" 
ON onsite_global_issues FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own global issues or admins" 
ON onsite_global_issues FOR UPDATE 
USING (
    created_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND dashboard_role = 'admin')
);

CREATE POLICY "Admins can delete global issues" 
ON onsite_global_issues FOR DELETE 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND dashboard_role = 'admin')
);

-- MODULES SET POLICIES
CREATE POLICY "Anyone authenticated can read modules set" 
ON onsite_modules_set FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create modules set" 
ON onsite_modules_set FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update modules set" 
ON onsite_modules_set FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete modules set" 
ON onsite_modules_set FOR DELETE 
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND dashboard_role = 'admin')
);

-- ============================================
-- 7. TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ============================================

CREATE TRIGGER update_onsite_reports_updated_at 
BEFORE UPDATE ON onsite_reports
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onsite_issues_updated_at 
BEFORE UPDATE ON onsite_issues
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. ENABLE REALTIME FOR TABLES
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE onsite_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE onsite_issues;
ALTER PUBLICATION supabase_realtime ADD TABLE onsite_global_issues;
ALTER PUBLICATION supabase_realtime ADD TABLE onsite_modules_set;

-- ============================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE onsite_reports IS 'Daily site reports from field superintendents';
COMMENT ON TABLE onsite_issues IS 'Module-specific issues logged during installation';
COMMENT ON TABLE onsite_global_issues IS 'Site-wide issues affecting multiple modules';
COMMENT ON TABLE onsite_modules_set IS 'Tracking which modules were set on each report day';

COMMENT ON COLUMN onsite_issues.photos IS 'JSON array of base64-encoded photos or URLs (max 5 per issue)';
COMMENT ON COLUMN onsite_issues.factory_response IS 'Factory response to field issue (two-way communication)';
COMMENT ON COLUMN onsite_issues.severity IS 'Issue severity: critical (stops work), major (needs fix), minor (cosmetic)';
