-- ============================================================================
-- DELETE OLD PRODUCTION WEEKS (BEFORE FIRST PRODUCTION WEEK)
-- First production week was Monday June 8, 2020 (2020-W24)
-- Run this AFTER populating weeks to remove weeks before production started
-- ============================================================================

-- IMPORTANT: Run the populate scripts FIRST before running this delete!
-- 1. Run populate-all-production-weeks.sql (2025-2026)
-- 2. Run populate-historical-weeks-2020-2024.sql (2020-2024)
-- 3. Then run this script to clean up weeks before June 8, 2020

-- Delete weeks where start_date is before June 8, 2020 (first production week)
DELETE FROM production_weeks 
WHERE start_date < '2020-06-08';

-- Verify remaining weeks (should start from 2020-06-08)
SELECT COUNT(*) as remaining_weeks, MIN(start_date) as earliest_week, MAX(start_date) as latest_week
FROM production_weeks;

-- Show count by year
SELECT year, COUNT(*) as weeks FROM production_weeks GROUP BY year ORDER BY year;
