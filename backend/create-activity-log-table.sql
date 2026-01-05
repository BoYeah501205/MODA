-- ============================================================================
-- MODA Activity Log Table
-- Tracks all user activity for audit and analytics
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop existing table if needed (comment out in production)
-- DROP TABLE IF EXISTS activity_logs;

-- ============================================================================
-- MAIN TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User information
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_name TEXT,
    
    -- Action details
    action_type TEXT NOT NULL,          -- 'login', 'logout', 'create', 'update', 'delete', 'view', 'export', 'import'
    action_category TEXT NOT NULL,      -- 'auth', 'project', 'module', 'employee', 'user', 'permission', 'system'
    
    -- Entity affected
    entity_type TEXT,                   -- 'project', 'module', 'employee', 'user', 'role', etc.
    entity_id TEXT,                     -- ID of affected record
    entity_name TEXT,                   -- Human-readable name for display
    
    -- Change details (for updates)
    details JSONB DEFAULT '{}',         -- Additional context: { previous: {...}, new: {...}, metadata: {...} }
    
    -- Request metadata
    ip_address TEXT,
    user_agent TEXT,
    
    -- Severity/importance for filtering
    severity TEXT DEFAULT 'info',       -- 'info', 'warning', 'critical'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for fast queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_email ON activity_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_category ON activity_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_id ON activity_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_severity ON activity_logs(severity);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_date ON activity_logs(entity_type, entity_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view all activity logs"
ON activity_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.dashboard_role = 'admin'
    )
);

-- Policy: Users can view their own activity
CREATE POLICY "Users can view own activity"
ON activity_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Only system can insert logs (via service role or authenticated users)
CREATE POLICY "Authenticated users can insert logs"
ON activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: No one can update logs (immutable audit trail)
-- (No UPDATE policy = no updates allowed)

-- Policy: Only admins can delete logs (for cleanup)
CREATE POLICY "Admins can delete old logs"
ON activity_logs
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.dashboard_role = 'admin'
    )
);

-- ============================================================================
-- ARCHIVE TABLE (for logs older than 90 days)
-- ============================================================================
CREATE TABLE IF NOT EXISTS activity_logs_archive (
    LIKE activity_logs INCLUDING ALL
);

-- ============================================================================
-- CLEANUP FUNCTION - Archive logs older than 90 days
-- ============================================================================
CREATE OR REPLACE FUNCTION archive_old_activity_logs()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move old logs to archive
    WITH moved AS (
        DELETE FROM activity_logs
        WHERE created_at < NOW() - INTERVAL '90 days'
        RETURNING *
    )
    INSERT INTO activity_logs_archive
    SELECT * FROM moved;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION - Log activity (can be called from triggers or directly)
-- ============================================================================
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_user_email TEXT,
    p_user_name TEXT,
    p_action_type TEXT,
    p_action_category TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id TEXT DEFAULT NULL,
    p_entity_name TEXT DEFAULT NULL,
    p_details JSONB DEFAULT '{}',
    p_severity TEXT DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO activity_logs (
        user_id, user_email, user_name,
        action_type, action_category,
        entity_type, entity_id, entity_name,
        details, severity
    ) VALUES (
        p_user_id, p_user_email, p_user_name,
        p_action_type, p_action_category,
        p_entity_type, p_entity_id, p_entity_name,
        p_details, p_severity
    )
    RETURNING id INTO new_id;
    
    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STATISTICS VIEW - For dashboard analytics
-- ============================================================================
CREATE OR REPLACE VIEW activity_stats AS
SELECT
    DATE_TRUNC('day', created_at) AS day,
    action_category,
    action_type,
    COUNT(*) AS count,
    COUNT(DISTINCT user_id) AS unique_users
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), action_category, action_type
ORDER BY day DESC, count DESC;

-- Grant access to the view
GRANT SELECT ON activity_stats TO authenticated;

-- ============================================================================
-- SAMPLE DATA (for testing - comment out in production)
-- ============================================================================
/*
INSERT INTO activity_logs (user_email, user_name, action_type, action_category, entity_type, entity_name, severity)
VALUES 
    ('admin@autovol.com', 'Admin User', 'login', 'auth', NULL, NULL, 'info'),
    ('admin@autovol.com', 'Admin User', 'create', 'project', 'project', 'Test Project', 'info'),
    ('admin@autovol.com', 'Admin User', 'update', 'module', 'module', 'Module 001', 'info');
*/

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Activity log table created successfully';
    RAISE NOTICE 'Indexes created for: user_id, user_email, action_type, action_category, entity_type, entity_id, created_at, severity';
    RAISE NOTICE 'RLS policies: Admins see all, users see own, insert allowed, no updates, admin delete only';
    RAISE NOTICE 'Archive table created for logs older than 90 days';
    RAISE NOTICE 'Run archive_old_activity_logs() periodically to move old logs to archive';
END $$;
