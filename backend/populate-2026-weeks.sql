-- ============================================================================
-- POPULATE 2026 PRODUCTION WEEKS
-- Run this in Supabase SQL Editor to create week records for all of 2026
-- ============================================================================

-- Configuration:
-- Jan 6 - Feb 8 (weeks 1-5): Shift 1 only (Mon-Thu), 21 modules/week
-- Feb 9+ (week 6 onwards): Shift 1 + Shift 2 (Fri/Sat/Sun), 24 modules/week
-- Daily targets: Mon:5, Tue:6, Wed:5, Thu:5, Fri:1, Sat:1, Sun:1

-- First, let's see what table structure we have for weekly_schedules
-- This script assumes the weekly_schedules table exists with appropriate columns

-- Insert all 2026 weeks
INSERT INTO weekly_schedules (
    week_start,
    week_end,
    shift1,
    shift2,
    line_balance,
    is_current,
    notes,
    created_at,
    updated_at
)
VALUES
    -- Week 1: Jan 5-11 (Note: Jan 5, 2026 is a Monday)
    ('2026-01-05', '2026-01-11', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 0, "saturday": 0, "sunday": 0}', 21, false, 'Week 1 - Shift 1 only', NOW(), NOW()),
    -- Week 2: Jan 12-18
    ('2026-01-12', '2026-01-18', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 0, "saturday": 0, "sunday": 0}', 21, false, 'Week 2 - Shift 1 only', NOW(), NOW()),
    -- Week 3: Jan 19-25
    ('2026-01-19', '2026-01-25', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 0, "saturday": 0, "sunday": 0}', 21, false, 'Week 3 - Shift 1 only', NOW(), NOW()),
    -- Week 4: Jan 26 - Feb 1
    ('2026-01-26', '2026-02-01', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 0, "saturday": 0, "sunday": 0}', 21, false, 'Week 4 - Shift 1 only', NOW(), NOW()),
    -- Week 5: Feb 2-8
    ('2026-02-02', '2026-02-08', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 0, "saturday": 0, "sunday": 0}', 21, false, 'Week 5 - Shift 1 only (last week before Shift 2)', NOW(), NOW()),
    
    -- Week 6+: Shift 2 starts (Fri/Sat/Sun active)
    ('2026-02-09', '2026-02-15', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 6 - Shift 2 starts', NOW(), NOW()),
    ('2026-02-16', '2026-02-22', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 7', NOW(), NOW()),
    ('2026-02-23', '2026-03-01', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 8', NOW(), NOW()),
    
    -- March
    ('2026-03-02', '2026-03-08', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 9', NOW(), NOW()),
    ('2026-03-09', '2026-03-15', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 10', NOW(), NOW()),
    ('2026-03-16', '2026-03-22', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 11', NOW(), NOW()),
    ('2026-03-23', '2026-03-29', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 12', NOW(), NOW()),
    ('2026-03-30', '2026-04-05', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 13', NOW(), NOW()),
    
    -- April
    ('2026-04-06', '2026-04-12', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 14', NOW(), NOW()),
    ('2026-04-13', '2026-04-19', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 15', NOW(), NOW()),
    ('2026-04-20', '2026-04-26', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 16', NOW(), NOW()),
    ('2026-04-27', '2026-05-03', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 17', NOW(), NOW()),
    
    -- May
    ('2026-05-04', '2026-05-10', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 18', NOW(), NOW()),
    ('2026-05-11', '2026-05-17', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 19', NOW(), NOW()),
    ('2026-05-18', '2026-05-24', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 20', NOW(), NOW()),
    ('2026-05-25', '2026-05-31', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 21', NOW(), NOW()),
    
    -- June
    ('2026-06-01', '2026-06-07', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 22', NOW(), NOW()),
    ('2026-06-08', '2026-06-14', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 23', NOW(), NOW()),
    ('2026-06-15', '2026-06-21', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 24', NOW(), NOW()),
    ('2026-06-22', '2026-06-28', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 25', NOW(), NOW()),
    ('2026-06-29', '2026-07-05', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 26', NOW(), NOW()),
    
    -- July
    ('2026-07-06', '2026-07-12', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 27', NOW(), NOW()),
    ('2026-07-13', '2026-07-19', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 28', NOW(), NOW()),
    ('2026-07-20', '2026-07-26', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 29', NOW(), NOW()),
    ('2026-07-27', '2026-08-02', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 30', NOW(), NOW()),
    
    -- August
    ('2026-08-03', '2026-08-09', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 31', NOW(), NOW()),
    ('2026-08-10', '2026-08-16', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 32', NOW(), NOW()),
    ('2026-08-17', '2026-08-23', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 33', NOW(), NOW()),
    ('2026-08-24', '2026-08-30', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 34', NOW(), NOW()),
    ('2026-08-31', '2026-09-06', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 35', NOW(), NOW()),
    
    -- September
    ('2026-09-07', '2026-09-13', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 36', NOW(), NOW()),
    ('2026-09-14', '2026-09-20', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 37', NOW(), NOW()),
    ('2026-09-21', '2026-09-27', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 38', NOW(), NOW()),
    ('2026-09-28', '2026-10-04', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 39', NOW(), NOW()),
    
    -- October
    ('2026-10-05', '2026-10-11', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 40', NOW(), NOW()),
    ('2026-10-12', '2026-10-18', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 41', NOW(), NOW()),
    ('2026-10-19', '2026-10-25', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 42', NOW(), NOW()),
    ('2026-10-26', '2026-11-01', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 43', NOW(), NOW()),
    
    -- November
    ('2026-11-02', '2026-11-08', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 44', NOW(), NOW()),
    ('2026-11-09', '2026-11-15', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 45', NOW(), NOW()),
    ('2026-11-16', '2026-11-22', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 46', NOW(), NOW()),
    ('2026-11-23', '2026-11-29', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 47 - Thanksgiving week', NOW(), NOW()),
    ('2026-11-30', '2026-12-06', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 48', NOW(), NOW()),
    
    -- December
    ('2026-12-07', '2026-12-13', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 49', NOW(), NOW()),
    ('2026-12-14', '2026-12-20', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 50', NOW(), NOW()),
    ('2026-12-21', '2026-12-27', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 51 - Christmas week', NOW(), NOW()),
    ('2026-12-28', '2027-01-03', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, false, 'Week 52 - New Year week', NOW(), NOW())

ON CONFLICT (week_start) DO UPDATE SET
    shift1 = EXCLUDED.shift1,
    shift2 = EXCLUDED.shift2,
    line_balance = EXCLUDED.line_balance,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- Summary: 52 weeks created
-- Weeks 1-5 (Jan 5 - Feb 8): 21 modules/week (Shift 1 only)
-- Weeks 6-52 (Feb 9 - Dec 31): 24 modules/week (Shift 1 + Shift 2)
-- Total capacity: (5 * 21) + (47 * 24) = 105 + 1128 = 1233 modules for 2026
