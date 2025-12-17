-- ============================================================================
-- FIX: weekly_schedules table schema
-- Run this in Supabase SQL Editor to fix the table structure
-- ============================================================================

-- Drop the old table (if it exists with wrong schema)
DROP TABLE IF EXISTS weekly_schedules CASCADE;

-- Create table with correct schema matching supabase-data.js expectations
CREATE TABLE weekly_schedules (
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

-- Enable Row Level Security
ALTER TABLE weekly_schedules ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users full access (using auth.uid() IS NOT NULL)
CREATE POLICY "Allow authenticated select" ON weekly_schedules
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated insert" ON weekly_schedules
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated update" ON weekly_schedules
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated delete" ON weekly_schedules
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_type ON weekly_schedules(schedule_type);
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_week_id ON weekly_schedules(week_id);

-- Success message
DO $$ BEGIN RAISE NOTICE 'weekly_schedules table created successfully!'; END $$;
