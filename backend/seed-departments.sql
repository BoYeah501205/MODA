-- ============================================================================
-- MODA Departments Seed Data
-- Run this in Supabase SQL Editor to populate departments table
-- ============================================================================

-- First, ensure the departments table exists
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    supervisor TEXT,
    employee_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
GRANT ALL ON departments TO authenticated;
GRANT SELECT ON departments TO anon;

-- Clear existing data (optional - comment out if you want to keep existing)
DELETE FROM departments;

-- Insert all production station departments
INSERT INTO departments (id, name, supervisor, employee_count, sort_order) VALUES
    ('auto-fc', 'Automation (Floor/Ceiling)', NULL, 0, 1),
    ('auto-walls', 'Automation (Walls)', NULL, 0, 2),
    ('mezzanine', 'Mezzanine (FC Prep, Plumbing - Floors)', NULL, 0, 3),
    ('elec-ceiling', 'Electrical - Ceilings', NULL, 0, 4),
    ('wall-set', 'Wall Set', NULL, 0, 5),
    ('ceiling-set', 'Ceiling Set', NULL, 0, 6),
    ('soffits', 'Soffits', NULL, 0, 7),
    ('mech-rough', 'Mechanical Rough-In', NULL, 0, 8),
    ('elec-rough', 'Electrical Rough-In', NULL, 0, 9),
    ('plumb-rough', 'Plumbing Rough-In', NULL, 0, 10),
    ('exteriors', 'Exteriors', NULL, 0, 11),
    ('drywall-bp', 'Drywall - BackPanel', NULL, 0, 12),
    ('drywall-ttp', 'Drywall - Tape/Texture/Paint', NULL, 0, 13),
    ('roofing', 'Roofing', NULL, 0, 14),
    ('pre-finish', 'Pre-Finish', NULL, 0, 15),
    ('mech-trim', 'Mechanical Trim', NULL, 0, 16),
    ('elec-trim', 'Electrical Trim', NULL, 0, 17),
    ('plumb-trim', 'Plumbing Trim', NULL, 0, 18),
    ('final-finish', 'Final Finish', NULL, 0, 19),
    ('sign-off', 'Module Sign-Off', NULL, 0, 20),
    ('close-up', 'Close-Up', NULL, 0, 21)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Verify the data
SELECT id, name, sort_order FROM departments ORDER BY sort_order;
