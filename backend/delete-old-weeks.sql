-- ============================================================================
-- DELETE OLD PRODUCTION WEEKS
-- Run this in Supabase SQL Editor to delete weeks prior to 2020-06-08
-- ============================================================================

-- Delete weeks where start_date is before June 8, 2020
DELETE FROM production_weeks 
WHERE start_date < '2020-06-08';

-- Verify remaining weeks
SELECT COUNT(*) as remaining_weeks, MIN(start_date) as earliest_week, MAX(start_date) as latest_week
FROM production_weeks;
