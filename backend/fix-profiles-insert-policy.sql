-- ============================================================================
-- FIX: Add INSERT policy for profiles table
-- Run this in Supabase SQL Editor to allow users to create their own profile
-- ============================================================================

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create INSERT policy - users can only insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Verify the policy was created
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Success message
DO $$ BEGIN RAISE NOTICE 'INSERT policy added to profiles table!'; END $$;
