-- ============================================================================
-- CREATE STATION STAGGERS AND CHANGE LOG TABLES
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. STATION_STAGGERS TABLE
-- Stores the current stagger configuration for all stations
-- ============================================================================

CREATE TABLE IF NOT EXISTS station_staggers (
    id TEXT PRIMARY KEY DEFAULT 'current',
    is_current BOOLEAN DEFAULT true,
    staggers JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add is_current column if it doesn't exist (for existing tables)
ALTER TABLE station_staggers ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true;

-- Insert default staggers if table is empty
INSERT INTO station_staggers (id, is_current, staggers)
SELECT 'current', true, '{
    "auto-fc": 0,
    "auto-walls": 0,
    "mezzanine": 1,
    "elec-ceiling": 4,
    "wall-set": 5,
    "ceiling-set": 6,
    "soffits": 7,
    "mech-rough": 8,
    "elec-rough": 8,
    "plumb-rough": 8,
    "exteriors": 9,
    "drywall-bp": 10,
    "drywall-ttp": 18,
    "roofing": 15,
    "pre-finish": 24,
    "mech-trim": 25,
    "elec-trim": 25,
    "plumb-trim": 25,
    "final-finish": 27,
    "sign-off": 29,
    "close-up": 36
}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM station_staggers WHERE id = 'current');

-- ============================================================================
-- 2. STAGGER_CHANGE_LOG TABLE
-- Tracks history of stagger configuration changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS stagger_change_log (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    description TEXT,
    changed_by TEXT,
    changes JSONB DEFAULT '{}'::jsonb,
    staggers_snapshot JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stagger_change_log_timestamp ON stagger_change_log (timestamp DESC);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE station_staggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stagger_change_log ENABLE ROW LEVEL SECURITY;

-- Station Staggers Policies
DROP POLICY IF EXISTS "Anyone can view station staggers" ON station_staggers;
CREATE POLICY "Anyone can view station staggers" ON station_staggers
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage station staggers" ON station_staggers;
CREATE POLICY "Admins can manage station staggers" ON station_staggers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role = 'admin'
        )
        OR auth.jwt() ->> 'email' IN ('trevor@autovol.com', 'stephanie@autovol.com')
    );

-- Stagger Change Log Policies
DROP POLICY IF EXISTS "Anyone can view stagger change log" ON stagger_change_log;
CREATE POLICY "Anyone can view stagger change log" ON stagger_change_log
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage stagger change log" ON stagger_change_log;
CREATE POLICY "Admins can manage stagger change log" ON stagger_change_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role = 'admin'
        )
        OR auth.jwt() ->> 'email' IN ('trevor@autovol.com', 'stephanie@autovol.com')
    );

-- ============================================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================================

-- Apply trigger to station_staggers
DROP TRIGGER IF EXISTS update_station_staggers_updated_at ON station_staggers;
CREATE TRIGGER update_station_staggers_updated_at
    BEFORE UPDATE ON station_staggers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

-- Check current staggers
SELECT * FROM station_staggers WHERE is_current = true;

-- Check stagger change log
SELECT COUNT(*) as log_entries FROM stagger_change_log;
