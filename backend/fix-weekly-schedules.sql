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

-- Allow all authenticated users to view
CREATE POLICY "Authenticated users can view weekly_schedules" ON weekly_schedules
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert
CREATE POLICY "Authenticated users can insert weekly_schedules" ON weekly_schedules
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to update
CREATE POLICY "Authenticated users can update weekly_schedules" ON weekly_schedules
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow all authenticated users to delete
CREATE POLICY "Authenticated users can delete weekly_schedules" ON weekly_schedules
    FOR DELETE USING (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_type ON weekly_schedules(schedule_type);
CREATE INDEX IF NOT EXISTS idx_weekly_schedules_week_id ON weekly_schedules(week_id);

-- Success message
DO $$ BEGIN RAISE NOTICE 'weekly_schedules table created successfully!'; END $$;
