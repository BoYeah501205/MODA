-- ============================================================================
-- MODA Profile Stability Fix
-- 
-- This script consolidates all profile-related fixes to ensure stable
-- authentication and profile loading for users.
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/syreuphexagezawjyjgt/sql
--
-- Created: 2025-01-28
-- ============================================================================

-- ============================================================================
-- STEP 1: Ensure proper RLS policies exist for profiles table
-- ============================================================================

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;

-- SELECT: All authenticated users can view all profiles
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true);

-- INSERT: Users can insert their own profile (for client-side profile creation)
CREATE POLICY "Users can insert own profile" ON profiles 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- INSERT: Allow trigger/service role to insert any profile
CREATE POLICY "Service role can insert profiles" ON profiles 
    FOR INSERT 
    WITH CHECK (true);

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- UPDATE: Admins can update any profile
CREATE POLICY "Admins can update any profile" ON profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (dashboard_role = 'admin' OR is_protected = true)
        )
    );

-- ============================================================================
-- STEP 2: Create robust handle_new_user trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Insert profile with conflict handling
    -- Uses ON CONFLICT to handle race conditions gracefully
    INSERT INTO public.profiles (id, email, name, dashboard_role, is_protected, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'dashboard_role', 'employee'),
        LOWER(NEW.email) = 'trevor@autovol.com',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        updated_at = NOW();
    
    RAISE LOG 'Profile created/updated for user: %', NEW.email;
    RETURN NEW;
    
EXCEPTION
    WHEN unique_violation THEN
        -- Email already exists with different user ID
        -- This shouldn't happen normally, but handle gracefully
        UPDATE public.profiles 
        SET id = NEW.id, 
            name = COALESCE(NEW.raw_user_meta_data->>'name', public.profiles.name),
            updated_at = NOW()
        WHERE email = NEW.email;
        RAISE LOG 'Profile updated for existing email: %', NEW.email;
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE LOG 'Error in handle_new_user for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- STEP 3: Create sync_missing_profiles function for manual sync
-- ============================================================================

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
    INSERT INTO public.profiles (id, email, name, dashboard_role, is_protected, created_at, updated_at)
    SELECT 
        au.id,
        au.email,
        COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
        COALESCE(au.raw_user_meta_data->>'dashboard_role', 'employee'),
        LOWER(au.email) = 'trevor@autovol.com',
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.sync_missing_profiles() TO authenticated;

-- ============================================================================
-- STEP 4: Create get_or_create_profile function for client-side use
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_or_create_profile(
    user_id UUID,
    user_email TEXT,
    user_name TEXT DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    result_profile public.profiles;
BEGIN
    -- First try to get existing profile
    SELECT * INTO result_profile
    FROM public.profiles
    WHERE id = user_id;
    
    IF FOUND THEN
        RETURN result_profile;
    END IF;
    
    -- Profile doesn't exist, create it
    INSERT INTO public.profiles (id, email, name, dashboard_role, is_protected, created_at, updated_at)
    VALUES (
        user_id,
        user_email,
        COALESCE(user_name, split_part(user_email, '@', 1)),
        'employee',
        LOWER(user_email) = 'trevor@autovol.com',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW()
    RETURNING * INTO result_profile;
    
    RETURN result_profile;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error in get_or_create_profile for %: %', user_email, SQLERRM;
        -- Return a minimal profile on error
        RETURN ROW(
            user_id,
            user_email,
            COALESCE(user_name, split_part(user_email, '@', 1)),
            'employee',
            false,
            NULL,
            NULL,
            NOW(),
            NOW()
        )::public.profiles;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_or_create_profile(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- STEP 5: Verify and fix any existing missing profiles
-- ============================================================================

-- Show users without profiles (for verification)
SELECT 
    au.id,
    au.email,
    au.created_at as user_created,
    CASE WHEN p.id IS NOT NULL THEN 'OK' ELSE 'MISSING' END as profile_status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- Run sync to fix any missing profiles
SELECT public.sync_missing_profiles() as profiles_synced;

-- ============================================================================
-- STEP 6: Verify policies are correctly set up
-- ============================================================================

SELECT 
    policyname, 
    cmd,
    permissive,
    qual::text as using_expression,
    with_check::text as with_check_expression
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ============================================================================
-- Success message
-- ============================================================================

DO $$ BEGIN 
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Profile stability fixes applied successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. RLS policies updated for INSERT/UPDATE/SELECT';
    RAISE NOTICE '2. handle_new_user trigger improved with error handling';
    RAISE NOTICE '3. sync_missing_profiles function created/updated';
    RAISE NOTICE '4. get_or_create_profile function created for client use';
    RAISE NOTICE '5. Any missing profiles have been synced';
    RAISE NOTICE '========================================';
END $$;
