-- Extended Drawing Analysis Tables
-- Supports: Wall IDs, MEP Fixtures, Version Changes, Trend Analytics
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. WALL EXTRACTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sheet_walls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id UUID NOT NULL REFERENCES drawing_sheets(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    
    -- Wall identification
    wall_id TEXT,                    -- e.g., "W1", "MW14.5", "EW-01"
    wall_type TEXT,                  -- Interior, Exterior, Shear, Partition
    wall_height TEXT,                -- e.g., "9'-0"", "10'-6""
    wall_thickness TEXT,             -- e.g., "6"", "4""
    stud_spacing TEXT,               -- e.g., "16" O.C.", "24" O.C."
    stud_gauge TEXT,                 -- e.g., "20 GA", "18 GA"
    
    -- Location
    grid_location TEXT,              -- e.g., "A-B/1-2"
    orientation TEXT,                -- N-S, E-W, etc.
    
    -- Metadata
    confidence DECIMAL(5,2),
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sheet_walls_sheet ON sheet_walls(sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_walls_project ON sheet_walls(project_id);
CREATE INDEX IF NOT EXISTS idx_sheet_walls_wall_id ON sheet_walls(wall_id);

-- ============================================
-- 2. MEP FIXTURE EXTRACTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sheet_mep_fixtures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id UUID NOT NULL REFERENCES drawing_sheets(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    
    -- Fixture identification
    fixture_tag TEXT,                -- e.g., "P-1", "E-101", "M-01"
    fixture_type TEXT,               -- Outlet, Switch, Sink, HVAC, etc.
    fixture_category TEXT,           -- Electrical, Plumbing, Mechanical, Fire
    
    -- Details
    description TEXT,                -- Full description from legend
    quantity INTEGER DEFAULT 1,
    specification TEXT,              -- Model/spec if visible
    
    -- Location
    grid_location TEXT,
    room_name TEXT,
    
    -- Metadata
    confidence DECIMAL(5,2),
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sheet_mep_sheet ON sheet_mep_fixtures(sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_mep_project ON sheet_mep_fixtures(project_id);
CREATE INDEX IF NOT EXISTS idx_sheet_mep_category ON sheet_mep_fixtures(fixture_category);

-- ============================================
-- 3. VERSION CHANGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS drawing_version_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    
    -- Version comparison
    old_version_id UUID REFERENCES drawing_versions(id),
    new_version_id UUID REFERENCES drawing_versions(id),
    old_version TEXT,                -- e.g., "1.0"
    new_version TEXT,                -- e.g., "1.1"
    
    -- Change summary
    change_type TEXT,                -- Added, Removed, Modified, Relocated
    change_category TEXT,            -- Structural, MEP, Dimensional, Annotation
    change_severity TEXT,            -- Minor, Moderate, Major, Critical
    
    -- Details
    sheet_number INTEGER,
    sheet_name TEXT,
    description TEXT,                -- AI-generated description of change
    affected_elements JSONB,         -- List of affected walls, fixtures, etc.
    
    -- Location
    grid_location TEXT,
    cloud_revision TEXT,             -- Revision cloud identifier if present
    
    -- Metadata
    confidence DECIMAL(5,2),
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    detected_by TEXT DEFAULT 'ai',   -- 'ai' or 'manual'
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_version_changes_drawing ON drawing_version_changes(drawing_id);
CREATE INDEX IF NOT EXISTS idx_version_changes_project ON drawing_version_changes(project_id);
CREATE INDEX IF NOT EXISTS idx_version_changes_type ON drawing_version_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_version_changes_severity ON drawing_version_changes(change_severity);

-- ============================================
-- 4. TREND ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS drawing_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL,
    
    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type TEXT NOT NULL,       -- daily, weekly, monthly
    
    -- Counts
    total_drawings INTEGER DEFAULT 0,
    total_sheets INTEGER DEFAULT 0,
    total_versions INTEGER DEFAULT 0,
    total_changes INTEGER DEFAULT 0,
    
    -- Change breakdown
    changes_by_type JSONB,           -- {"Added": 5, "Modified": 12, ...}
    changes_by_category JSONB,       -- {"Structural": 8, "MEP": 9, ...}
    changes_by_severity JSONB,       -- {"Minor": 10, "Major": 3, ...}
    
    -- Wall metrics
    total_walls INTEGER DEFAULT 0,
    walls_by_type JSONB,             -- {"Interior": 20, "Exterior": 8, ...}
    
    -- MEP metrics
    total_fixtures INTEGER DEFAULT 0,
    fixtures_by_category JSONB,      -- {"Electrical": 50, "Plumbing": 30, ...}
    
    -- Quality metrics
    avg_ocr_confidence DECIMAL(5,2),
    sheets_with_issues INTEGER DEFAULT 0,
    
    -- Computed at
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(project_id, period_start, period_end, period_type)
);

CREATE INDEX IF NOT EXISTS idx_analytics_project ON drawing_analytics(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_period ON drawing_analytics(period_start, period_end);

-- ============================================
-- 5. EXTRACTION JOBS TABLE (Extended)
-- ============================================
ALTER TABLE sheet_extraction_jobs 
ADD COLUMN IF NOT EXISTS extraction_type TEXT DEFAULT 'title_block',
ADD COLUMN IF NOT EXISTS walls_extracted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fixtures_extracted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS changes_detected INTEGER DEFAULT 0;

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to compute analytics for a project
CREATE OR REPLACE FUNCTION compute_project_analytics(
    p_project_id UUID,
    p_period_start DATE,
    p_period_end DATE,
    p_period_type TEXT DEFAULT 'weekly'
)
RETURNS UUID AS $$
DECLARE
    v_analytics_id UUID;
    v_total_drawings INTEGER;
    v_total_sheets INTEGER;
    v_total_versions INTEGER;
    v_total_changes INTEGER;
    v_total_walls INTEGER;
    v_total_fixtures INTEGER;
    v_avg_confidence DECIMAL(5,2);
BEGIN
    -- Count drawings
    SELECT COUNT(*) INTO v_total_drawings
    FROM drawings WHERE project_id = p_project_id;
    
    -- Count sheets in period
    SELECT COUNT(*) INTO v_total_sheets
    FROM drawing_sheets 
    WHERE project_id = p_project_id
    AND created_at >= p_period_start AND created_at < p_period_end + 1;
    
    -- Count versions
    SELECT COUNT(*) INTO v_total_versions
    FROM drawing_versions dv
    JOIN drawings d ON dv.drawing_id = d.id
    WHERE d.project_id = p_project_id
    AND dv.created_at >= p_period_start AND dv.created_at < p_period_end + 1;
    
    -- Count changes
    SELECT COUNT(*) INTO v_total_changes
    FROM drawing_version_changes
    WHERE project_id = p_project_id
    AND detected_at >= p_period_start AND detected_at < p_period_end + 1;
    
    -- Count walls
    SELECT COUNT(*) INTO v_total_walls
    FROM sheet_walls
    WHERE project_id = p_project_id
    AND created_at >= p_period_start AND created_at < p_period_end + 1;
    
    -- Count fixtures
    SELECT COUNT(*) INTO v_total_fixtures
    FROM sheet_mep_fixtures
    WHERE project_id = p_project_id
    AND created_at >= p_period_start AND created_at < p_period_end + 1;
    
    -- Average confidence
    SELECT AVG(ocr_confidence) INTO v_avg_confidence
    FROM drawing_sheets
    WHERE project_id = p_project_id
    AND ocr_confidence IS NOT NULL;
    
    -- Insert or update analytics
    INSERT INTO drawing_analytics (
        project_id, period_start, period_end, period_type,
        total_drawings, total_sheets, total_versions, total_changes,
        total_walls, total_fixtures, avg_ocr_confidence,
        changes_by_type, changes_by_category, changes_by_severity,
        walls_by_type, fixtures_by_category,
        computed_at
    )
    VALUES (
        p_project_id, p_period_start, p_period_end, p_period_type,
        v_total_drawings, v_total_sheets, v_total_versions, v_total_changes,
        v_total_walls, v_total_fixtures, v_avg_confidence,
        (SELECT jsonb_object_agg(change_type, cnt) FROM (
            SELECT change_type, COUNT(*) as cnt FROM drawing_version_changes
            WHERE project_id = p_project_id AND detected_at >= p_period_start AND detected_at < p_period_end + 1
            GROUP BY change_type
        ) t),
        (SELECT jsonb_object_agg(change_category, cnt) FROM (
            SELECT change_category, COUNT(*) as cnt FROM drawing_version_changes
            WHERE project_id = p_project_id AND detected_at >= p_period_start AND detected_at < p_period_end + 1
            GROUP BY change_category
        ) t),
        (SELECT jsonb_object_agg(change_severity, cnt) FROM (
            SELECT change_severity, COUNT(*) as cnt FROM drawing_version_changes
            WHERE project_id = p_project_id AND detected_at >= p_period_start AND detected_at < p_period_end + 1
            GROUP BY change_severity
        ) t),
        (SELECT jsonb_object_agg(wall_type, cnt) FROM (
            SELECT wall_type, COUNT(*) as cnt FROM sheet_walls
            WHERE project_id = p_project_id AND created_at >= p_period_start AND created_at < p_period_end + 1
            GROUP BY wall_type
        ) t),
        (SELECT jsonb_object_agg(fixture_category, cnt) FROM (
            SELECT fixture_category, COUNT(*) as cnt FROM sheet_mep_fixtures
            WHERE project_id = p_project_id AND created_at >= p_period_start AND created_at < p_period_end + 1
            GROUP BY fixture_category
        ) t),
        NOW()
    )
    ON CONFLICT (project_id, period_start, period_end, period_type)
    DO UPDATE SET
        total_drawings = EXCLUDED.total_drawings,
        total_sheets = EXCLUDED.total_sheets,
        total_versions = EXCLUDED.total_versions,
        total_changes = EXCLUDED.total_changes,
        total_walls = EXCLUDED.total_walls,
        total_fixtures = EXCLUDED.total_fixtures,
        avg_ocr_confidence = EXCLUDED.avg_ocr_confidence,
        changes_by_type = EXCLUDED.changes_by_type,
        changes_by_category = EXCLUDED.changes_by_category,
        changes_by_severity = EXCLUDED.changes_by_severity,
        walls_by_type = EXCLUDED.walls_by_type,
        fixtures_by_category = EXCLUDED.fixtures_by_category,
        computed_at = NOW()
    RETURNING id INTO v_analytics_id;
    
    RETURN v_analytics_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. RLS POLICIES
-- ============================================
ALTER TABLE sheet_walls ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_mep_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_version_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_analytics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (for re-run safety)
DROP POLICY IF EXISTS "Allow authenticated read sheet_walls" ON sheet_walls;
DROP POLICY IF EXISTS "Allow authenticated read sheet_mep_fixtures" ON sheet_mep_fixtures;
DROP POLICY IF EXISTS "Allow authenticated read drawing_version_changes" ON drawing_version_changes;
DROP POLICY IF EXISTS "Allow authenticated read drawing_analytics" ON drawing_analytics;
DROP POLICY IF EXISTS "Allow service role all sheet_walls" ON sheet_walls;
DROP POLICY IF EXISTS "Allow service role all sheet_mep_fixtures" ON sheet_mep_fixtures;
DROP POLICY IF EXISTS "Allow service role all drawing_version_changes" ON drawing_version_changes;
DROP POLICY IF EXISTS "Allow service role all drawing_analytics" ON drawing_analytics;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read sheet_walls" ON sheet_walls
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read sheet_mep_fixtures" ON sheet_mep_fixtures
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read drawing_version_changes" ON drawing_version_changes
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read drawing_analytics" ON drawing_analytics
    FOR SELECT TO authenticated USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role all sheet_walls" ON sheet_walls
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all sheet_mep_fixtures" ON sheet_mep_fixtures
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all drawing_version_changes" ON drawing_version_changes
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role all drawing_analytics" ON drawing_analytics
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- SUMMARY
-- ============================================
-- Tables created:
-- 1. sheet_walls - Wall IDs and properties per sheet
-- 2. sheet_mep_fixtures - MEP fixtures per sheet
-- 3. drawing_version_changes - Changes between versions
-- 4. drawing_analytics - Aggregated trend data
--
-- Functions:
-- - compute_project_analytics() - Generate trend reports
