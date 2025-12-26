-- ============================================================================
-- FIX SCHEDULE SETUP PERMISSIONS
-- Run this in Supabase SQL Editor to grant schedule_setup edit access
-- ============================================================================

-- Option 1: Update your profile to 'coordinator' role (has schedule_setup permission)
-- Replace 'your-email@example.com' with your actual email

UPDATE profiles 
SET dashboard_role = 'coordinator'
WHERE LOWER(email) = 'your-email@example.com';

-- Option 2: If you want to keep your current role but just see who has access:
SELECT email, dashboard_role 
FROM profiles 
ORDER BY dashboard_role, email;

-- Option 3: Update trevor@autovol.com to admin if needed
UPDATE profiles 
SET dashboard_role = 'admin'
WHERE LOWER(email) = 'trevor@autovol.com';
