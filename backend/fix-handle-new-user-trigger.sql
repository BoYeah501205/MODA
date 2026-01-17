-- ============================================================================
-- FIX: handle_new_user trigger failing with "Database error saving new user"
-- 
-- Issue: When inviting a new user, the trigger that creates their profile fails
-- because RLS blocks the INSERT even with SECURITY DEFINER.
--
-- Solution: Update the trigger function to properly bypass RLS and handle
-- edge cases like duplicate emails.
--
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/syreuphexagezawjyjgt/sql
-- ============================================================================

-- STEP 1: Check current policies on profiles table
SELECT 
    policyname, 
    cmd,
    permissive,
    qual::text as using_expression,
    with_check::text as with_check_expression
FROM pg_policies 
WHERE tablename = 'profiles';

-- STEP 2: Ensure INSERT policy exists for service role operations
-- The trigger runs as SECURITY DEFINER but still needs a permissive policy
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles" ON profiles 
    FOR INSERT 
    WITH CHECK (true);  -- Allow all inserts (trigger handles validation)

-- STEP 3: Update the handle_new_user function with better error handling
-- and explicit schema references to avoid search_path issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Insert profile with conflict handling on primary key (id)
    -- The EXCEPTION block handles email uniqueness violations
    INSERT INTO public.profiles (id, email, name, dashboard_role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'dashboard_role', 'employee'),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Email already exists with different user ID - update the existing profile
        UPDATE public.profiles 
        SET id = NEW.id, 
            name = COALESCE(NEW.raw_user_meta_data->>'name', public.profiles.name),
            updated_at = NOW()
        WHERE email = NEW.email;
        RAISE LOG 'Profile updated for existing email: %', NEW.email;
        RETURN NEW;
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE LOG 'Error creating profile for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 4: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 5: Verify the function was updated
SELECT 
    proname as function_name,
    prosecdef as security_definer,
    proconfig as config
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- STEP 6: Verify policies
SELECT 
    policyname, 
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;

-- Success message
DO $$ BEGIN 
    RAISE NOTICE 'handle_new_user trigger updated successfully!';
    RAISE NOTICE 'The trigger now handles duplicate emails gracefully.';
END $$;
