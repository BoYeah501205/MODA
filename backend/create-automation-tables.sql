-- ============================================================================
-- AUTOMATION MODULE TABLES
-- Run this in Supabase SQL Editor to create the automation tracking tables
-- ============================================================================

-- Main daily reports table
CREATE TABLE IF NOT EXISTS automation_daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    UNIQUE(report_date)
);

-- Line data (Wall Line or Floor Line)
CREATE TABLE IF NOT EXISTS automation_line_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES automation_daily_reports(id) ON DELETE CASCADE,
    line_type VARCHAR(20) NOT NULL CHECK (line_type IN ('Wall', 'Floor')),
    modules_finished DECIMAL(6,2),
    schedule_variance DECIMAL(6,2),
    schedule_status VARCHAR(10) CHECK (schedule_status IN ('AHEAD', 'BEHIND', 'ON')),
    total_downtime_minutes DECIMAL(8,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Downtime issues breakdown
CREATE TABLE IF NOT EXISTS automation_downtime_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    line_data_id UUID REFERENCES automation_line_data(id) ON DELETE CASCADE,
    category VARCHAR(200),
    duration_minutes DECIMAL(8,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_automation_reports_date ON automation_daily_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_automation_line_data_report ON automation_line_data(report_id);
CREATE INDEX IF NOT EXISTS idx_automation_issues_line ON automation_downtime_issues(line_data_id);

-- Enable Row Level Security (RLS)
ALTER TABLE automation_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_line_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_downtime_issues ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users to read all data
CREATE POLICY "Allow authenticated read access on automation_daily_reports"
    ON automation_daily_reports FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated read access on automation_line_data"
    ON automation_line_data FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated read access on automation_downtime_issues"
    ON automation_downtime_issues FOR SELECT
    TO authenticated
    USING (true);

-- RLS Policies: Allow authenticated users to insert/update/delete
-- (Application-level role checking handles Admin/Production Management restriction)
CREATE POLICY "Allow authenticated insert on automation_daily_reports"
    ON automation_daily_reports FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on automation_daily_reports"
    ON automation_daily_reports FOR DELETE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert on automation_line_data"
    ON automation_line_data FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on automation_line_data"
    ON automation_line_data FOR DELETE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert on automation_downtime_issues"
    ON automation_downtime_issues FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on automation_downtime_issues"
    ON automation_downtime_issues FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================
/*
INSERT INTO automation_daily_reports (report_date, created_by) VALUES
    ('2025-12-24', 'Dominic Manzano'),
    ('2025-12-23', 'Dominic Manzano');

-- Get the report IDs for inserting line data
-- (In production, you'd use RETURNING or separate queries)
*/

-- ============================================================================
-- USEFUL QUERIES
-- ============================================================================

-- Get all reports with line data:
/*
SELECT 
    r.*,
    w.modules_finished as wall_modules,
    w.schedule_status as wall_status,
    w.total_downtime_minutes as wall_downtime,
    f.modules_finished as floor_modules,
    f.schedule_status as floor_status,
    f.total_downtime_minutes as floor_downtime
FROM automation_daily_reports r
LEFT JOIN automation_line_data w ON r.id = w.report_id AND w.line_type = 'Wall'
LEFT JOIN automation_line_data f ON r.id = f.report_id AND f.line_type = 'Floor'
ORDER BY r.report_date DESC;
*/

-- Get downtime by category (last 30 days):
/*
SELECT 
    i.category,
    SUM(i.duration_minutes) as total_minutes,
    COUNT(*) as occurrences
FROM automation_downtime_issues i
JOIN automation_line_data l ON i.line_data_id = l.id
JOIN automation_daily_reports r ON l.report_id = r.id
WHERE r.report_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY i.category
ORDER BY total_minutes DESC;
*/
