-- ============================================================================
-- WEEKLY SCHEDULES TABLES MIGRATION
-- Run this in Supabase SQL Editor to create/update the weekly schedule tables
-- ============================================================================

-- ============================================================================
-- 1. WEEKLY_SCHEDULES TABLE
-- Stores the current week's shift schedule configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS weekly_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_current BOOLEAN DEFAULT false,
    shift1 JSONB DEFAULT '{"monday": 5, "tuesday": 5, "wednesday": 5, "thursday": 5}'::jsonb,
    shift2 JSONB DEFAULT '{"friday": 0, "saturday": 0, "sunday": 0}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add is_current column if table exists but column doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'weekly_schedules' AND column_name = 'is_current'
    ) THEN
        ALTER TABLE weekly_schedules ADD COLUMN is_current BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create unique partial index to ensure only one row can have is_current = true
DROP INDEX IF EXISTS idx_weekly_schedules_current;
CREATE UNIQUE INDEX idx_weekly_schedules_current ON weekly_schedules (is_current) WHERE is_current = true;

-- Insert default current schedule if none exists
INSERT INTO weekly_schedules (is_current, shift1, shift2)
SELECT true, 
       '{"monday": 5, "tuesday": 5, "wednesday": 5, "thursday": 5}'::jsonb,
       '{"friday": 0, "saturday": 0, "sunday": 0}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM weekly_schedules WHERE is_current = true);

-- ============================================================================
-- 2. COMPLETED_WEEKS TABLE
-- Stores history of completed production weeks
-- ============================================================================

CREATE TABLE IF NOT EXISTS completed_weeks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_id TEXT NOT NULL UNIQUE,  -- Format: "2026-W01" (ISO week)
    shift1 JSONB DEFAULT '{}'::jsonb,
    shift2 JSONB DEFAULT '{}'::jsonb,
    line_balance INTEGER DEFAULT 0,
    modules_completed INTEGER DEFAULT 0,
    notes TEXT,
    schedule_snapshot JSONB,  -- Snapshot of schedule at time of completion
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    completed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster week lookups
CREATE INDEX IF NOT EXISTS idx_completed_weeks_week_id ON completed_weeks (week_id);
CREATE INDEX IF NOT EXISTS idx_completed_weeks_completed_at ON completed_weeks (completed_at DESC);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_weeks ENABLE ROW LEVEL SECURITY;

-- Weekly Schedules Policies
DROP POLICY IF EXISTS "Anyone can view weekly schedules" ON weekly_schedules;
CREATE POLICY "Anyone can view weekly schedules" ON weekly_schedules
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage weekly schedules" ON weekly_schedules;
CREATE POLICY "Admins can manage weekly schedules" ON weekly_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role = 'admin'
        )
        OR auth.jwt() ->> 'email' IN ('trevor@autovol.com', 'stephanie@autovol.com')
    );

-- Completed Weeks Policies
DROP POLICY IF EXISTS "Anyone can view completed weeks" ON completed_weeks;
CREATE POLICY "Anyone can view completed weeks" ON completed_weeks
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage completed weeks" ON completed_weeks;
CREATE POLICY "Admins can manage completed weeks" ON completed_weeks
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

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to weekly_schedules
DROP TRIGGER IF EXISTS update_weekly_schedules_updated_at ON weekly_schedules;
CREATE TRIGGER update_weekly_schedules_updated_at
    BEFORE UPDATE ON weekly_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. VERIFICATION QUERIES
-- Run these after the migration to verify everything is set up correctly
-- ============================================================================

-- Check weekly_schedules table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'weekly_schedules';

-- Check completed_weeks table structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'completed_weeks';

-- Check current schedule exists
-- SELECT * FROM weekly_schedules WHERE is_current = true;

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename IN ('weekly_schedules', 'completed_weeks');

