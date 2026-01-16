-- ============================================================================
-- Issue Types Table Setup for MODA
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Create issue_types table
CREATE TABLE IF NOT EXISTS issue_types (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    dashboard TEXT DEFAULT 'engineering',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE issue_types ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "select_issue_types" ON issue_types;
DROP POLICY IF EXISTS "insert_issue_types" ON issue_types;
DROP POLICY IF EXISTS "update_issue_types" ON issue_types;
DROP POLICY IF EXISTS "delete_issue_types" ON issue_types;

-- RLS Policies - allow all authenticated users
CREATE POLICY "select_issue_types" ON issue_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_issue_types" ON issue_types FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_issue_types" ON issue_types FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_issue_types" ON issue_types FOR DELETE TO authenticated USING (true);

-- Insert default issue types
INSERT INTO issue_types (id, label, color, dashboard, is_active, sort_order) VALUES
    ('shop-drawing', 'Shop Drawing', '#0057B8', 'engineering', true, 1),
    ('design-conflict', 'Design Conflict', '#7C3AED', 'engineering', true, 2),
    ('material-supply', 'Material/Supply', '#EA580C', 'supply-chain', true, 3),
    ('quality', 'Quality Issue', '#DC2626', 'qa', true, 4),
    ('engineering-question', 'Engineering Question', '#0891B2', 'engineering', true, 5),
    ('rfi', 'RFI Required', '#4F46E5', 'rfi', true, 6),
    ('other', 'Other', '#6B7280', 'engineering', true, 7)
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    color = EXCLUDED.color,
    dashboard = EXCLUDED.dashboard,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order;

-- Verify
SELECT 'issue_types table ready' as status, COUNT(*) as type_count FROM issue_types;
