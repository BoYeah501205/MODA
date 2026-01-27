-- ============================================================================
-- Sync Missing Profiles
-- 
-- This script creates profiles for any auth.users that don't have a 
-- corresponding row in the profiles table.
--
-- Run this in Supabase SQL Editor when users are missing from the dashboard.
-- ============================================================================

-- STEP 1: Create the RPC function that can be called from the frontend
CREATE OR REPLACE FUNCTION public.sync_missing_profiles()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    synced_count INTEGER := 0;
BEGIN
    -- Insert profiles for auth users that don't have one
    INSERT INTO public.profiles (id, email, name, dashboard_role, created_at, updated_at)
    SELECT 
        au.id,
        au.email,
        COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
        COALESCE(au.raw_user_meta_data->>'dashboard_role', 'employee'),
        au.created_at,
        NOW()
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS synced_count = ROW_COUNT;
    
    RAISE LOG 'sync_missing_profiles: Created % new profile(s)', synced_count;
    
    RETURN synced_count;
END;
$$;

-- Grant execute permission to authenticated users (RLS will handle admin check)
GRANT EXECUTE ON FUNCTION public.sync_missing_profiles() TO authenticated;

-- STEP 2: Manual query to find users in auth.users without profiles
SELECT 
    au.id,
    au.email,
    au.created_at,
    'MISSING PROFILE' as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- STEP 3: Manual insert (alternative to using the function)
-- INSERT INTO public.profiles (id, email, name, dashboard_role, created_at, updated_at)
-- SELECT 
--     au.id,
--     au.email,
--     COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
--     COALESCE(au.raw_user_meta_data->>'dashboard_role', 'employee'),
--     au.created_at,
--     NOW()
-- FROM auth.users au
-- LEFT JOIN public.profiles p ON au.id = p.id
-- WHERE p.id IS NULL
-- ON CONFLICT (id) DO NOTHING;

-- STEP 4: Verify all users now have profiles
SELECT 
    au.email,
    p.name,
    p.dashboard_role,
    CASE WHEN p.id IS NOT NULL THEN 'OK' ELSE 'STILL MISSING' END as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;
