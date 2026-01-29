-- ============================================================================
-- CREATE PRODUCTION FLOOR USER
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/syreuphexagezawjyjgt/sql
-- ============================================================================

-- IMPORTANT: Supabase Auth users must be created through the Dashboard UI or Auth API
-- This script creates the profile record AFTER you create the auth user

-- STEP 1: Create the user in Supabase Dashboard
-- Go to: Authentication > Users > Add User
-- Email: production@autovol.com
-- Password: autovol
-- Check "Auto Confirm User" to skip email verification

-- STEP 2: After creating the auth user, run this SQL to set up the profile
-- Replace 'USER_UUID_HERE' with the actual UUID from the auth.users table

-- First, find the user's UUID (run this after creating the user):
SELECT id, email, created_at FROM auth.users WHERE email = 'production@autovol.com';

-- Then insert/update the profile with the correct role:
INSERT INTO profiles (id, email, name, dashboard_role, is_protected, created_at)
SELECT 
    id,
    'production@autovol.com',
    'Production Floor',
    'production_floor',
    false,
    NOW()
FROM auth.users 
WHERE email = 'production@autovol.com'
ON CONFLICT (id) DO UPDATE SET
    dashboard_role = 'production_floor',
    name = 'Production Floor';

-- Verify the profile was created/updated:
SELECT * FROM profiles WHERE email = 'production@autovol.com';

-- ============================================================================
-- ALTERNATIVE: If you need to create the user programmatically via Supabase Admin API
-- ============================================================================
-- You would need to use the Supabase Admin API with service_role key:
-- 
-- const { data, error } = await supabase.auth.admin.createUser({
--   email: 'production@autovol.com',
--   password: 'autovol',
--   email_confirm: true,
--   user_metadata: { name: 'Production Floor' }
-- });
--
-- Then update the profile with dashboard_role = 'production_floor'
