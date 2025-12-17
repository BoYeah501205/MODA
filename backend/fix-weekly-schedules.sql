-- ============================================================================
-- FIX: weekly_schedules table schema
-- Run this in Supabase SQL Editor to fix the table structure
-- ============================================================================

-- Drop the old table completely
DROP TABLE IF EXISTS weekly_schedules CASCADE;

-- Create table with correct schema
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

-- DISABLE Row Level Security (allows all access)
ALTER TABLE weekly_schedules DISABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_type ON weekly_schedules(schedule_type);
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_week_id ON weekly_schedules(week_id);

-- Grant access to authenticated users
GRANT ALL ON weekly_schedules TO authenticated;
GRANT ALL ON weekly_schedules TO anon;

-- Success message
DO $$ BEGIN RAISE NOTICE 'weekly_schedules table created successfully with RLS DISABLED!'; END $$;
