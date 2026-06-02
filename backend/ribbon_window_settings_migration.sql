-- ============================================================================
-- Migration: Create app_settings table + seed Daily Board ribbon window defaults
-- Run this in Supabase SQL Editor manually.
-- ============================================================================

-- Key/value global settings table
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Policy: all authenticated users can read
CREATE POLICY "Authenticated users can read settings"
    ON app_settings FOR SELECT
    TO authenticated
    USING (true);

-- Policy: only admins (dashboard_role = 'admin') can write
CREATE POLICY "Admins can update settings"
    ON app_settings FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.dashboard_role = 'admin'
        )
    );

CREATE POLICY "Admins can insert settings"
    ON app_settings FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.dashboard_role = 'admin'
        )
    );

-- Seed default values
INSERT INTO app_settings (key, value, description)
VALUES
    ('ribbon_trailing_count', '5', 'Number of previous modules shown before the scheduled window in Daily Board ribbon'),
    ('ribbon_upcoming_count', '5', 'Number of upcoming modules shown after the scheduled window in Daily Board ribbon')
ON CONFLICT (key) DO NOTHING;
