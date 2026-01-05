-- ============================================================================
-- MODA Custom Tab Permissions Migration
-- Adds per-user tab permission overrides to profiles table
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add custom_tab_permissions column to profiles
-- NULL = use role defaults, JSONB = override specific tabs
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS custom_tab_permissions JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.custom_tab_permissions IS 
'Per-user tab permission overrides. NULL = use role defaults. Structure: {"tabId": {"canView": bool, "canEdit": bool, "canCreate": bool, "canDelete": bool}}';

-- ============================================================================
-- Example values:
-- NULL (default) - User gets permissions from their dashboard_role
-- {"production": {"canView": true, "canEdit": true, "canCreate": true, "canDelete": false}}
--   - Overrides production tab permissions, other tabs use role defaults
-- {"qa": {"canView": true, "canEdit": false}, "projects": {"canView": true, "canEdit": true}}
--   - Overrides qa and projects tabs, others use role defaults
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to set custom permissions for a user
-- Usage: SELECT set_user_custom_permissions('user-uuid', '{"production": {"canEdit": true}}');
CREATE OR REPLACE FUNCTION set_user_custom_permissions(
    target_user_id UUID,
    permissions JSONB
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Validate that caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND dashboard_role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can set custom permissions';
    END IF;
    
    -- Prevent modifying protected users' permissions (they always have full access)
    IF EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = target_user_id 
        AND is_protected = true
    ) THEN
        RAISE EXCEPTION 'Cannot modify permissions for protected users';
    END IF;
    
    -- Update the user's custom permissions
    UPDATE profiles 
    SET custom_tab_permissions = permissions,
        updated_at = NOW()
    WHERE id = target_user_id
    RETURNING custom_tab_permissions INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear custom permissions for a user (revert to role defaults)
-- Usage: SELECT clear_user_custom_permissions('user-uuid');
CREATE OR REPLACE FUNCTION clear_user_custom_permissions(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validate that caller is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND dashboard_role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can clear custom permissions';
    END IF;
    
    -- Clear the user's custom permissions
    UPDATE profiles 
    SET custom_tab_permissions = NULL,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get effective permissions for a user (merges role + custom)
-- This is mainly for debugging/admin visibility
-- Usage: SELECT get_user_effective_permissions('user-uuid', 'production');
CREATE OR REPLACE FUNCTION get_user_effective_permissions(
    target_user_id UUID,
    tab_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    user_profile RECORD;
    custom_perms JSONB;
    result JSONB;
BEGIN
    -- Get user profile
    SELECT dashboard_role, custom_tab_permissions, is_protected
    INTO user_profile
    FROM profiles
    WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Protected users always have full access
    IF user_profile.is_protected THEN
        RETURN '{"canView": true, "canEdit": true, "canCreate": true, "canDelete": true, "source": "protected"}'::JSONB;
    END IF;
    
    -- Check for custom permissions on this tab
    IF user_profile.custom_tab_permissions IS NOT NULL 
       AND user_profile.custom_tab_permissions ? tab_id THEN
        custom_perms := user_profile.custom_tab_permissions -> tab_id;
        RETURN jsonb_set(custom_perms, '{source}', '"custom"'::JSONB);
    END IF;
    
    -- Otherwise return indicator to use role defaults (handled in frontend)
    RETURN jsonb_build_object(
        'source', 'role',
        'role', user_profile.dashboard_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES FOR CUSTOM PERMISSIONS
-- ============================================================================

-- Users can view their own custom_tab_permissions (already covered by existing SELECT policy)
-- Admins can update any user's custom_tab_permissions (already covered by existing UPDATE policy)

-- ============================================================================
-- INDEX FOR PERFORMANCE
-- ============================================================================

-- Index for users with custom permissions (for admin queries)
CREATE INDEX IF NOT EXISTS idx_profiles_has_custom_permissions 
ON profiles ((custom_tab_permissions IS NOT NULL))
WHERE custom_tab_permissions IS NOT NULL;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the column was added:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'custom_tab_permissions';
