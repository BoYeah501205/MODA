-- ============================================================================
-- DAILY SET REPORTS TABLES
-- ============================================================================
-- Tables for on-site daily reporting of module sets, issues, and photos.
-- Supports mobile-first workflow with offline capability.
-- Run this in Supabase SQL Editor.
-- ============================================================================

-- ============================================================================
-- TABLE: daily_reports
-- Main report record for each day's set activities
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Project reference
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Report date (the day being reported on, typically yesterday)
    report_date DATE NOT NULL,
    
    -- Creator info
    created_by UUID REFERENCES auth.users(id),
    created_by_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Report status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved')),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    
    -- Weather conditions (pulled from API or manual entry)
    weather_source TEXT DEFAULT 'manual' CHECK (weather_source IN ('api', 'manual')),
    weather_conditions JSONB DEFAULT '{}',
    -- Expected structure:
    -- {
    --   "temperature_high": 75,
    --   "temperature_low": 55,
    --   "conditions": "Partly Cloudy",
    --   "wind_speed": 10,
    --   "wind_direction": "NW",
    --   "precipitation": 0,
    --   "humidity": 45,
    --   "notes": "Morning fog cleared by 9am"
    -- }
    
    -- General notes for the day
    general_notes TEXT,
    
    -- SharePoint folder path for this report's photos
    sharepoint_folder_path TEXT,
    
    -- Timestamps
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate reports for same project/date
    UNIQUE(project_id, report_date)
);

-- ============================================================================
-- TABLE: report_modules
-- Links daily reports to modules with set status and details
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parent report
    report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    
    -- Module reference
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    
    -- Set status
    set_status TEXT DEFAULT 'not_set' CHECK (set_status IN ('set', 'not_set', 'partial')),
    
    -- Set details (when set_status = 'set' or 'partial')
    set_time TIMESTAMPTZ,
    set_sequence INTEGER, -- Order in which module was set (1, 2, 3...)
    set_by TEXT, -- Name of crew member who set it
    
    -- Module-specific notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate module entries per report
    UNIQUE(report_id, module_id)
);

-- ============================================================================
-- TABLE: report_issues
-- Issues found during set, linked to report and optionally to specific module
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parent report
    report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    
    -- Module reference (NULL for general/site issues)
    module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
    
    -- Issue categorization
    category TEXT NOT NULL,
    -- Categories: 'quality_defect', 'transit_damage', 'site_condition', 
    --             'missing_wrong', 'drawing_design', 'mep', 'other'
    
    subcategory TEXT,
    -- Subcategories vary by category:
    -- quality_defect: 'drywall', 'paint_finish', 'flooring', 'cabinets', 'trim', 'structural'
    -- transit_damage: 'exterior', 'interior', 'roof', 'window_door'
    -- site_condition: 'foundation', 'access', 'weather_delay', 'crane'
    -- missing_wrong: 'missing_material', 'wrong_material', 'missing_hardware'
    -- drawing_design: 'dimension_error', 'conflict', 'missing_info', 'rfi_needed'
    -- mep: 'electrical', 'plumbing', 'hvac', 'fire_protection'
    
    -- Severity
    severity TEXT DEFAULT 'minor' CHECK (severity IN ('critical', 'major', 'minor')),
    
    -- Issue details
    description TEXT NOT NULL,
    
    -- Action taken by on-site technician
    action_taken TEXT,
    
    -- Status tracking
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'deferred')),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    
    -- Reporter info
    reported_by UUID REFERENCES auth.users(id),
    reported_by_name TEXT,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: report_issue_comments
-- Comments/responses on issues for tracking discussion
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_issue_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parent issue
    issue_id UUID NOT NULL REFERENCES report_issues(id) ON DELETE CASCADE,
    
    -- Comment content
    comment TEXT NOT NULL,
    
    -- Author info
    author_id UUID REFERENCES auth.users(id),
    author_name TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: report_photos
-- Photos associated with reports, modules, or issues
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parent report
    report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
    
    -- Optional associations (NULL = general report photo)
    module_id UUID REFERENCES modules(id) ON DELETE SET NULL,
    issue_id UUID REFERENCES report_issues(id) ON DELETE SET NULL,
    
    -- Photo type for organization
    photo_type TEXT DEFAULT 'general' CHECK (photo_type IN ('set', 'issue', 'general', 'before', 'after')),
    
    -- Storage info
    sharepoint_url TEXT, -- Full SharePoint URL
    sharepoint_path TEXT, -- Relative path within project folder
    thumbnail_url TEXT, -- Optional thumbnail for quick loading
    
    -- Local storage fallback (base64 for offline mode)
    local_data TEXT, -- Base64 encoded image for offline
    
    -- Metadata
    caption TEXT,
    file_name TEXT,
    file_size INTEGER,
    
    -- Upload tracking
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'uploading', 'synced', 'failed')),
    sync_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: report_distribution_lists
-- Email distribution lists for report notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_distribution_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Project reference (NULL = global list)
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- List details
    name TEXT NOT NULL,
    description TEXT,
    
    -- Active status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: report_distribution_recipients
-- Recipients in distribution lists
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_distribution_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parent list
    list_id UUID NOT NULL REFERENCES report_distribution_lists(id) ON DELETE CASCADE,
    
    -- Recipient info (can be MODA user or external email)
    user_id UUID REFERENCES auth.users(id),
    email TEXT NOT NULL,
    name TEXT,
    
    -- Role in distribution
    role TEXT, -- e.g., 'PM', 'Superintendent', 'Office'
    
    -- Active status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate emails per list
    UNIQUE(list_id, email)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Daily reports indexes
CREATE INDEX IF NOT EXISTS idx_daily_reports_project ON daily_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_status ON daily_reports(status);
CREATE INDEX IF NOT EXISTS idx_daily_reports_project_date ON daily_reports(project_id, report_date);

-- Report modules indexes
CREATE INDEX IF NOT EXISTS idx_report_modules_report ON report_modules(report_id);
CREATE INDEX IF NOT EXISTS idx_report_modules_module ON report_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_report_modules_set_status ON report_modules(set_status);

-- Report issues indexes
CREATE INDEX IF NOT EXISTS idx_report_issues_report ON report_issues(report_id);
CREATE INDEX IF NOT EXISTS idx_report_issues_module ON report_issues(module_id);
CREATE INDEX IF NOT EXISTS idx_report_issues_category ON report_issues(category);
CREATE INDEX IF NOT EXISTS idx_report_issues_severity ON report_issues(severity);
CREATE INDEX IF NOT EXISTS idx_report_issues_status ON report_issues(status);

-- Issue comments indexes
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue ON report_issue_comments(issue_id);

-- Report photos indexes
CREATE INDEX IF NOT EXISTS idx_report_photos_report ON report_photos(report_id);
CREATE INDEX IF NOT EXISTS idx_report_photos_module ON report_photos(module_id);
CREATE INDEX IF NOT EXISTS idx_report_photos_issue ON report_photos(issue_id);
CREATE INDEX IF NOT EXISTS idx_report_photos_sync ON report_photos(sync_status);

-- Distribution indexes
CREATE INDEX IF NOT EXISTS idx_distribution_lists_project ON report_distribution_lists(project_id);
CREATE INDEX IF NOT EXISTS idx_distribution_recipients_list ON report_distribution_recipients(list_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_daily_reports_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_daily_reports_updated
    BEFORE UPDATE ON daily_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_reports_timestamp();

CREATE TRIGGER trigger_report_modules_updated
    BEFORE UPDATE ON report_modules
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_reports_timestamp();

CREATE TRIGGER trigger_report_issues_updated
    BEFORE UPDATE ON report_issues
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_reports_timestamp();

CREATE TRIGGER trigger_issue_comments_updated
    BEFORE UPDATE ON report_issue_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_reports_timestamp();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_issue_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_distribution_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_distribution_recipients ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (adjust based on your auth requirements)
CREATE POLICY "Users can view all daily reports" ON daily_reports
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create daily reports" ON daily_reports
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update daily reports" ON daily_reports
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can view all report modules" ON report_modules
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage report modules" ON report_modules
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view all report issues" ON report_issues
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage report issues" ON report_issues
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view all issue comments" ON report_issue_comments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage issue comments" ON report_issue_comments
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view all report photos" ON report_photos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage report photos" ON report_photos
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view distribution lists" ON report_distribution_lists
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage distribution lists" ON report_distribution_lists
    FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view distribution recipients" ON report_distribution_recipients
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage distribution recipients" ON report_distribution_recipients
    FOR ALL TO authenticated USING (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get all issues for a specific module across all reports
CREATE OR REPLACE FUNCTION get_module_issues(p_module_id UUID)
RETURNS TABLE (
    issue_id UUID,
    report_id UUID,
    report_date DATE,
    project_name TEXT,
    category TEXT,
    subcategory TEXT,
    severity TEXT,
    description TEXT,
    action_taken TEXT,
    status TEXT,
    reported_at TIMESTAMPTZ,
    photo_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ri.id AS issue_id,
        ri.report_id,
        dr.report_date,
        p.name AS project_name,
        ri.category,
        ri.subcategory,
        ri.severity,
        ri.description,
        ri.action_taken,
        ri.status,
        ri.reported_at,
        (SELECT COUNT(*) FROM report_photos rp WHERE rp.issue_id = ri.id) AS photo_count
    FROM report_issues ri
    JOIN daily_reports dr ON ri.report_id = dr.id
    JOIN projects p ON dr.project_id = p.id
    WHERE ri.module_id = p_module_id
    ORDER BY ri.reported_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Get report summary statistics
CREATE OR REPLACE FUNCTION get_report_summary(p_report_id UUID)
RETURNS TABLE (
    total_modules INTEGER,
    modules_set INTEGER,
    modules_partial INTEGER,
    modules_not_set INTEGER,
    total_issues INTEGER,
    critical_issues INTEGER,
    major_issues INTEGER,
    minor_issues INTEGER,
    open_issues INTEGER,
    total_photos INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM report_modules WHERE report_id = p_report_id) AS total_modules,
        (SELECT COUNT(*)::INTEGER FROM report_modules WHERE report_id = p_report_id AND set_status = 'set') AS modules_set,
        (SELECT COUNT(*)::INTEGER FROM report_modules WHERE report_id = p_report_id AND set_status = 'partial') AS modules_partial,
        (SELECT COUNT(*)::INTEGER FROM report_modules WHERE report_id = p_report_id AND set_status = 'not_set') AS modules_not_set,
        (SELECT COUNT(*)::INTEGER FROM report_issues WHERE report_id = p_report_id) AS total_issues,
        (SELECT COUNT(*)::INTEGER FROM report_issues WHERE report_id = p_report_id AND severity = 'critical') AS critical_issues,
        (SELECT COUNT(*)::INTEGER FROM report_issues WHERE report_id = p_report_id AND severity = 'major') AS major_issues,
        (SELECT COUNT(*)::INTEGER FROM report_issues WHERE report_id = p_report_id AND severity = 'minor') AS minor_issues,
        (SELECT COUNT(*)::INTEGER FROM report_issues WHERE report_id = p_report_id AND status = 'open') AS open_issues,
        (SELECT COUNT(*)::INTEGER FROM report_photos WHERE report_id = p_report_id) AS total_photos;
END;
$$ LANGUAGE plpgsql;

-- Get module set history (all reports where module appears)
CREATE OR REPLACE FUNCTION get_module_report_history(p_module_id UUID)
RETURNS TABLE (
    report_id UUID,
    report_date DATE,
    project_name TEXT,
    set_status TEXT,
    set_time TIMESTAMPTZ,
    set_sequence INTEGER,
    notes TEXT,
    issue_count BIGINT,
    photo_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rm.report_id,
        dr.report_date,
        p.name AS project_name,
        rm.set_status,
        rm.set_time,
        rm.set_sequence,
        rm.notes,
        (SELECT COUNT(*) FROM report_issues ri WHERE ri.report_id = rm.report_id AND ri.module_id = p_module_id) AS issue_count,
        (SELECT COUNT(*) FROM report_photos rp WHERE rp.report_id = rm.report_id AND rp.module_id = p_module_id) AS photo_count
    FROM report_modules rm
    JOIN daily_reports dr ON rm.report_id = dr.id
    JOIN projects p ON dr.project_id = p.id
    WHERE rm.module_id = p_module_id
    ORDER BY dr.report_date DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ISSUE CATEGORY REFERENCE (for UI dropdowns)
-- ============================================================================
COMMENT ON TABLE report_issues IS 'Issue categories and subcategories:
- quality_defect: drywall, paint_finish, flooring, cabinets, trim, structural
- transit_damage: exterior, interior, roof, window_door
- site_condition: foundation, access, weather_delay, crane
- missing_wrong: missing_material, wrong_material, missing_hardware
- drawing_design: dimension_error, conflict, missing_info, rfi_needed
- mep: electrical, plumbing, hvac, fire_protection
- other: (freeform subcategory)';
