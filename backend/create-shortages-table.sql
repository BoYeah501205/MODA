-- ============================================================================
-- PROCUREMENT SHORTAGES TABLE
-- Tracks material/supply shortages reported by production teams
-- ============================================================================

-- Main shortages table
CREATE TABLE IF NOT EXISTS shortages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Shortage identification
    shortage_number SERIAL,
    shortage_display_id TEXT GENERATED ALWAYS AS ('SHT-' || LPAD(shortage_number::TEXT, 4, '0')) STORED,
    
    -- Item details
    item TEXT NOT NULL,
    uom TEXT NOT NULL,  -- Unit of Measure (ea, ft, lbs, etc.)
    qty NUMERIC(10, 2) NOT NULL,
    
    -- Supplier & delivery
    supplier TEXT,
    delivery_eta DATE,
    
    -- Impact tracking (stored as JSONB arrays for multi-select)
    stations_impacted JSONB DEFAULT '[]'::JSONB,  -- Array of station IDs
    modules_impacted JSONB DEFAULT '[]'::JSONB,   -- Array of module IDs/serials
    projects_impacted JSONB DEFAULT '[]'::JSONB,  -- Array of project IDs
    
    -- Status tracking
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'ordered', 'partial', 'resolved', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Notes and resolution
    notes TEXT,
    resolution_notes TEXT,
    
    -- Audit fields
    reported_by TEXT,
    reported_by_id UUID,
    resolved_by TEXT,
    resolved_by_id UUID,
    resolved_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_shortages_status ON shortages(status);
CREATE INDEX IF NOT EXISTS idx_shortages_priority ON shortages(priority);
CREATE INDEX IF NOT EXISTS idx_shortages_created_at ON shortages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shortages_delivery_eta ON shortages(delivery_eta);

-- GIN indexes for JSONB array searches
CREATE INDEX IF NOT EXISTS idx_shortages_stations ON shortages USING GIN (stations_impacted);
CREATE INDEX IF NOT EXISTS idx_shortages_modules ON shortages USING GIN (modules_impacted);
CREATE INDEX IF NOT EXISTS idx_shortages_projects ON shortages USING GIN (projects_impacted);

-- Enable Row Level Security
ALTER TABLE shortages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read shortages
CREATE POLICY "Allow authenticated read" ON shortages
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert shortages
CREATE POLICY "Allow authenticated insert" ON shortages
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Allow authenticated users to update shortages
CREATE POLICY "Allow authenticated update" ON shortages
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Allow authenticated users to delete shortages
CREATE POLICY "Allow authenticated delete" ON shortages
    FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to search shortages by project
CREATE OR REPLACE FUNCTION search_shortages_by_project(project_id UUID)
RETURNS SETOF shortages AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM shortages
    WHERE projects_impacted @> jsonb_build_array(project_id::TEXT)
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to search shortages by station
CREATE OR REPLACE FUNCTION search_shortages_by_station(station_id TEXT)
RETURNS SETOF shortages AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM shortages
    WHERE stations_impacted @> jsonb_build_array(station_id)
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get open shortages count by priority
CREATE OR REPLACE FUNCTION get_shortage_stats()
RETURNS TABLE (
    total_open BIGINT,
    critical_count BIGINT,
    high_count BIGINT,
    medium_count BIGINT,
    low_count BIGINT,
    overdue_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE status = 'open' OR status = 'ordered' OR status = 'partial') AS total_open,
        COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('resolved', 'cancelled')) AS critical_count,
        COUNT(*) FILTER (WHERE priority = 'high' AND status NOT IN ('resolved', 'cancelled')) AS high_count,
        COUNT(*) FILTER (WHERE priority = 'medium' AND status NOT IN ('resolved', 'cancelled')) AS medium_count,
        COUNT(*) FILTER (WHERE priority = 'low' AND status NOT IN ('resolved', 'cancelled')) AS low_count,
        COUNT(*) FILTER (WHERE delivery_eta < CURRENT_DATE AND status NOT IN ('resolved', 'cancelled')) AS overdue_count
    FROM shortages;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE shortages IS 'Tracks material and supply shortages reported by production teams';
COMMENT ON COLUMN shortages.shortage_display_id IS 'Human-readable shortage ID (e.g., SHT-0001)';
COMMENT ON COLUMN shortages.uom IS 'Unit of Measure (ea, ft, lbs, sqft, etc.)';
COMMENT ON COLUMN shortages.stations_impacted IS 'JSON array of station IDs affected by this shortage';
COMMENT ON COLUMN shortages.modules_impacted IS 'JSON array of module serial numbers affected';
COMMENT ON COLUMN shortages.projects_impacted IS 'JSON array of project IDs affected';
