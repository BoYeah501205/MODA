-- ============================================================================
-- FIX PRODUCTION_WEEKS TABLE
-- Run this in Supabase SQL Editor to add missing columns and update dates
-- ============================================================================

-- Step 1: Add missing columns to production_weeks table
ALTER TABLE production_weeks 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS planned_modules INTEGER DEFAULT 21,
ADD COLUMN IF NOT EXISTS actual_modules INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Planned',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Update existing rows with calculated start/end dates
-- Week starts on Monday, ends on Sunday
-- 2026-W01 starts on Monday Jan 5, 2026 (first full week)
UPDATE production_weeks
SET 
    start_date = DATE '2026-01-05' + ((week_number - 1) * 7),
    end_date = DATE '2026-01-05' + ((week_number - 1) * 7) + 6,
    planned_modules = CASE 
        WHEN week_number <= 5 THEN 21  -- Shift 1 only (Mon-Thu = 4 days * ~5 modules)
        ELSE 24  -- Shift 1 + Shift 2 (Mon-Sun = 7 days)
    END,
    updated_at = NOW()
WHERE year = 2026 AND start_date IS NULL;

-- Step 3: Verify the data
-- SELECT id, week_number, year, week_id, start_date, end_date, planned_modules, status 
-- FROM production_weeks 
-- WHERE year = 2026 
-- ORDER BY week_number 
-- LIMIT 10;

-- ============================================================================
-- SHIFT STRUCTURE REMINDER:
-- Shift 1: Monday, Tuesday, Wednesday, Thursday (4 days)
-- Shift 2: Friday, Saturday, Sunday (3 days)
-- 
-- Default daily targets:
-- Shift 1: 5 modules/day x 4 days = 20 modules
-- Shift 2: Varies (0-4 modules/day x 3 days)
-- ============================================================================
