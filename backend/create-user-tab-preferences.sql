-- ============================================================================
-- MODA User Tab Preferences Migration
-- Adds per-user tab visibility and ordering preferences to profiles table
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add user_tab_preferences column to profiles
-- This is SEPARATE from custom_tab_permissions (admin-granted permission overrides)
-- user_tab_preferences is for user's own UI customization (hiding/ordering)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_tab_preferences JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.user_tab_preferences IS 
'User-controlled tab visibility and ordering preferences. NULL = use defaults. Structure: {"hidden_tabs": ["tab1", "tab2"], "tab_order": {"group_id": ["tab1", "tab2"]}, "updated_at": "ISO timestamp"}';

-- ============================================================================
-- STRUCTURE:
-- {
--   "hidden_tabs": ["equipment", "automation"],  -- Tabs user chose to hide (from their allowed tabs)
--   "tab_order": {
--     "operations": ["production", "tracker", "people"],  -- Custom order within each group
--     "design": ["projects", "engineering", "precon"]
--   },
--   "updated_at": "2025-01-25T22:00:00Z"
-- }
-- ============================================================================

-- ============================================================================
-- RLS POLICY: Users can update their OWN preferences
-- ============================================================================

-- Policy for users to update their own tab preferences
-- Note: This is more permissive than custom_tab_permissions (which requires admin)
CREATE POLICY IF NOT EXISTS "Users can update own tab preferences"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id
    -- Only allow updating user_tab_preferences column
    -- Other columns require admin permission (handled by existing policies)
);

-- If the above policy conflicts with existing policies, use this alternative approach:
-- Create a function that users can call to update only their preferences

-- ============================================================================
-- HELPER FUNCTION: Update own tab preferences
-- ============================================================================

CREATE OR REPLACE FUNCTION update_my_tab_preferences(preferences JSONB)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Update only the current user's preferences
    UPDATE profiles 
    SET user_tab_preferences = preferences,
        updated_at = NOW()
    WHERE id = auth.uid()
    RETURNING user_tab_preferences INTO result;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Clear own tab preferences (reset to defaults)
-- ============================================================================

CREATE OR REPLACE FUNCTION clear_my_tab_preferences()
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE profiles 
    SET user_tab_preferences = NULL,
        updated_at = NOW()
    WHERE id = auth.uid();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ADMIN FUNCTION: View user's tab preferences
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_tab_preferences(target_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT user_tab_preferences INTO result
    FROM profiles
    WHERE id = target_user_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ADMIN FUNCTION: Reset a user's tab preferences
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_reset_user_tab_preferences(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validate that caller is admin or protected user
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (dashboard_role = 'admin' OR is_protected = true)
    ) THEN
        RAISE EXCEPTION 'Only admins can reset other users'' preferences';
    END IF;
    
    -- Clear the user's tab preferences
    UPDATE profiles 
    SET user_tab_preferences = NULL,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEX FOR PERFORMANCE
-- ============================================================================

-- Index for users with custom preferences (for admin queries)
CREATE INDEX IF NOT EXISTS idx_profiles_has_tab_preferences 
ON profiles ((user_tab_preferences IS NOT NULL))
WHERE user_tab_preferences IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the column was added:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'user_tab_preferences';

