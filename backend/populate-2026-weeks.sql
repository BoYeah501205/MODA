-- ============================================================================
-- POPULATE 2026 PRODUCTION WEEKS
-- Run this in Supabase SQL Editor to create week records for all of 2026
-- ============================================================================

-- Configuration:
-- Jan 5 - Feb 8 (weeks 1-5): Shift 1 only (Mon-Thu), 21 modules/week
-- Feb 9+ (week 6 onwards): Shift 1 + Shift 2 (Fri/Sat/Sun), 24 modules/week
-- Daily targets: Mon:5, Tue:6, Wed:5, Thu:5, Fri:1, Sat:1, Sun:1

-- Table schema uses: week_id (TEXT), shift1 (JSONB), shift2 (JSONB), line_balance (INTEGER)
-- week_id format: "2026-01-05_2026-01-11" (weekStart_weekEnd)

-- Ensure unique constraint exists on week_id for upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_schedules_week_id_unique ON weekly_schedules(week_id);

-- Insert all 2026 weeks
INSERT INTO weekly_schedules (week_id, shift1, shift2, line_balance, schedule_type)
VALUES
    -- Week 1: Jan 5-11 (Jan 5, 2026 is a Monday)
    ('2026-01-05_2026-01-11', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 0, "saturday": 0, "sunday": 0}', 21, 'current'),
    -- Week 2: Jan 12-18
    ('2026-01-12_2026-01-18', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 0, "saturday": 0, "sunday": 0}', 21, 'current'),
    -- Week 3: Jan 19-25
    ('2026-01-19_2026-01-25', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 0, "saturday": 0, "sunday": 0}', 21, 'current'),
    -- Week 4: Jan 26 - Feb 1
    ('2026-01-26_2026-02-01', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 0, "saturday": 0, "sunday": 0}', 21, 'current'),
    -- Week 5: Feb 2-8
    ('2026-02-02_2026-02-08', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 0, "saturday": 0, "sunday": 0}', 21, 'current'),
    
    -- Week 6+: Shift 2 starts (Fri/Sat/Sun active)
    ('2026-02-09_2026-02-15', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-02-16_2026-02-22', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-02-23_2026-03-01', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    
    -- March
    ('2026-03-02_2026-03-08', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-03-09_2026-03-15', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-03-16_2026-03-22', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-03-23_2026-03-29', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-03-30_2026-04-05', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    
    -- April
    ('2026-04-06_2026-04-12', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-04-13_2026-04-19', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-04-20_2026-04-26', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-04-27_2026-05-03', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    
    -- May
    ('2026-05-04_2026-05-10', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-05-11_2026-05-17', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-05-18_2026-05-24', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-05-25_2026-05-31', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    
    -- June
    ('2026-06-01_2026-06-07', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-06-08_2026-06-14', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-06-15_2026-06-21', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-06-22_2026-06-28', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-06-29_2026-07-05', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    
    -- July
    ('2026-07-06_2026-07-12', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-07-13_2026-07-19', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-07-20_2026-07-26', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-07-27_2026-08-02', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    
    -- August
    ('2026-08-03_2026-08-09', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-08-10_2026-08-16', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-08-17_2026-08-23', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-08-24_2026-08-30', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-08-31_2026-09-06', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    
    -- September
    ('2026-09-07_2026-09-13', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-09-14_2026-09-20', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-09-21_2026-09-27', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-09-28_2026-10-04', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    
    -- October
    ('2026-10-05_2026-10-11', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-10-12_2026-10-18', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-10-19_2026-10-25', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-10-26_2026-11-01', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    
    -- November
    ('2026-11-02_2026-11-08', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-11-09_2026-11-15', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-11-16_2026-11-22', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-11-23_2026-11-29', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-11-30_2026-12-06', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    
    -- December
    ('2026-12-07_2026-12-13', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-12-14_2026-12-20', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-12-21_2026-12-27', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current'),
    ('2026-12-28_2027-01-03', '{"monday": 5, "tuesday": 6, "wednesday": 5, "thursday": 5}', '{"friday": 1, "saturday": 1, "sunday": 1}', 24, 'current')

ON CONFLICT (week_id) DO UPDATE SET
    shift1 = EXCLUDED.shift1,
    shift2 = EXCLUDED.shift2,
    line_balance = EXCLUDED.line_balance,
    updated_at = NOW();

-- Summary: 52 weeks created
-- Weeks 1-5 (Jan 5 - Feb 8): 21 modules/week (Shift 1 only)
-- Weeks 6-52 (Feb 9 - Dec 31): 24 modules/week (Shift 1 + Shift 2)
-- Total capacity: (5 * 21) + (47 * 24) = 105 + 1128 = 1233 modules for 2026
