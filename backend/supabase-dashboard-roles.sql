-- ============================================================================
-- MODA Dashboard Roles Table
-- Run this in the Supabase SQL Editor to add role management
-- ============================================================================

-- ============================================================================
-- DASHBOARD_ROLES TABLE
-- Stores role definitions with capabilities and tab permissions
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard_roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    -- Array of tab IDs this role can access
    tabs TEXT[] DEFAULT '{}',
    -- Editable tabs (legacy, kept for compatibility)
    editable_tabs TEXT[] DEFAULT '{}',
    -- Role capabilities (canEdit, canDelete, canCreate, etc.)
    capabilities JSONB DEFAULT '{}'::jsonb,
    -- Per-tab permissions matrix: { tabId: { canView, canEdit, canCreate, canDelete } }
    tab_permissions JSONB DEFAULT '{}'::jsonb,
    -- Role flags
    is_default BOOLEAN DEFAULT false,
    is_protected BOOLEAN DEFAULT false,
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE dashboard_roles ENABLE ROW LEVEL SECURITY;

-- Everyone can view roles (needed for UI to show role options)
CREATE POLICY "Authenticated users can view dashboard_roles" ON dashboard_roles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can insert roles
CREATE POLICY "Admins can insert dashboard_roles" ON dashboard_roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role = 'admin'
        )
    );

-- Only admins can update roles
CREATE POLICY "Admins can update dashboard_roles" ON dashboard_roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role = 'admin'
        )
    );

-- Only admins can delete roles (and only non-protected ones)
CREATE POLICY "Admins can delete dashboard_roles" ON dashboard_roles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND dashboard_role = 'admin'
        )
        AND is_protected = false
    );

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_dashboard_roles_is_default ON dashboard_roles(is_default);

-- Trigger for updated_at
CREATE TRIGGER update_dashboard_roles_updated_at
    BEFORE UPDATE ON dashboard_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for dashboard_roles
ALTER PUBLICATION supabase_realtime ADD TABLE dashboard_roles;

-- ============================================================================
-- SEED DEFAULT ROLES
-- These are the initial roles that will be created
-- ============================================================================
INSERT INTO dashboard_roles (id, name, description, tabs, editable_tabs, capabilities, tab_permissions, is_default, is_protected)
VALUES 
    (
        'admin',
        'Admin',
        'Full system access for operations management',
        ARRAY['executive', 'production', 'projects', 'people', 'qa', 'transport', 'equipment', 'onsite', 'engineering', 'automation', 'tracker', 'admin'],
        ARRAY['production', 'projects', 'people', 'qa', 'transport', 'equipment', 'onsite', 'engineering', 'automation', 'tracker', 'admin', 'schedule_setup', 'weekly_board', 'station_stagger'],
        '{"canEdit": true, "canDelete": true, "canCreate": true, "canManageUsers": true, "canAccessAdmin": true, "canExportData": true}'::jsonb,
        '{}'::jsonb,
        false,
        true
    ),
    (
        'production_management',
        'Production Management',
        'Manages production schedules, weekly board, and station configuration',
        ARRAY['executive', 'production', 'projects', 'people', 'qa'],
        ARRAY['production', 'projects', 'schedule_setup', 'weekly_board', 'station_stagger'],
        '{"canEdit": true, "canDelete": true, "canCreate": true, "canManageUsers": false, "canAccessAdmin": false, "canExportData": true}'::jsonb,
        '{}'::jsonb,
        false,
        false
    ),
    (
        'production_supervisor',
        'Production Supervisor',
        'Floor supervisor - can edit Weekly Board but not schedule setup',
        ARRAY['production', 'projects', 'people', 'qa'],
        ARRAY['production', 'weekly_board'],
        '{"canEdit": true, "canDelete": false, "canCreate": true, "canManageUsers": false, "canAccessAdmin": false, "canExportData": true}'::jsonb,
        '{}'::jsonb,
        false,
        false
    ),
    (
        'qa_inspector',
        'QA Inspector',
        'Quality assurance - can edit QA records and inspections',
        ARRAY['production', 'qa', 'projects'],
        ARRAY['qa'],
        '{"canEdit": true, "canDelete": false, "canCreate": true, "canManageUsers": false, "canAccessAdmin": false, "canExportData": true}'::jsonb,
        '{}'::jsonb,
        false,
        false
    ),
    (
        'transportation',
        'Transportation',
        'Manages yard, shipping, and logistics',
        ARRAY['production', 'transport', 'projects'],
        ARRAY['transport'],
        '{"canEdit": true, "canDelete": false, "canCreate": true, "canManageUsers": false, "canAccessAdmin": false, "canExportData": true}'::jsonb,
        '{}'::jsonb,
        false,
        false
    ),
    (
        'supply_chain',
        'Supply Chain',
        'Manages inventory, materials, and procurement',
        ARRAY['production', 'projects', 'equipment'],
        ARRAY['equipment'],
        '{"canEdit": true, "canDelete": false, "canCreate": true, "canManageUsers": false, "canAccessAdmin": false, "canExportData": true}'::jsonb,
        '{}'::jsonb,
        false,
        false
    ),
    (
        'preconstruction',
        'Preconstruction',
        'Project setup, module specs, and planning',
        ARRAY['projects', 'production', 'engineering'],
        ARRAY['projects'],
        '{"canEdit": true, "canDelete": false, "canCreate": true, "canManageUsers": false, "canAccessAdmin": false, "canExportData": true}'::jsonb,
        '{}'::jsonb,
        false,
        false
    ),
    (
        'onsite',
        'On-Site',
        'Field operations, delivery tracking, and site reporting',
        ARRAY['production', 'onsite', 'transport', 'projects'],
        ARRAY['onsite'],
        '{"canEdit": true, "canDelete": false, "canCreate": true, "canManageUsers": false, "canAccessAdmin": false, "canExportData": false}'::jsonb,
        '{}'::jsonb,
        false,
        false
    ),
    (
        'engineering',
        'Engineering',
        'Engineering documentation, issues, and drawings',
        ARRAY['production', 'engineering', 'projects', 'qa'],
        ARRAY['engineering', 'station_stagger'],
        '{"canEdit": true, "canDelete": false, "canCreate": true, "canManageUsers": false, "canAccessAdmin": false, "canExportData": true}'::jsonb,
        '{}'::jsonb,
        false,
        false
    ),
    (
        'maintenance',
        'Maintenance',
        'Equipment maintenance and repair tracking',
        ARRAY['production', 'equipment'],
        ARRAY['equipment'],
        '{"canEdit": true, "canDelete": false, "canCreate": true, "canManageUsers": false, "canAccessAdmin": false, "canExportData": false}'::jsonb,
        '{}'::jsonb,
        false,
        false
    ),
    (
        'executive',
        'Executive',
        'CEO/CTO high-level operational view',
        ARRAY['executive', 'production', 'projects', 'people'],
        ARRAY[]::TEXT[],
        '{"canEdit": false, "canDelete": false, "canCreate": false, "canManageUsers": false, "canAccessAdmin": false, "canExportData": true}'::jsonb,
        '{}'::jsonb,
        false,
        false
    ),
    (
        'department-supervisor',
        'Department Supervisor',
        'Department-level management view',
        ARRAY['production', 'projects', 'people'],
        ARRAY['production'],
        '{"canEdit": true, "canDelete": false, "canCreate": true, "canManageUsers": false, "canAccessAdmin": false, "canExportData": true}'::jsonb,
        '{}'::jsonb,
        false,
        false
    ),
    (
        'coordinator',
        'Coordinator',
        'Cross-department coordination role',
        ARRAY['production', 'projects'],
        ARRAY['production'],
        '{"canEdit": true, "canDelete": false, "canCreate": true, "canManageUsers": false, "canAccessAdmin": false, "canExportData": false}'::jsonb,
        '{}'::jsonb,
        false,
        false
    ),
    (
        'employee',
        'Employee',
        'Basic production floor view',
        ARRAY['production'],
        ARRAY[]::TEXT[],
        '{"canEdit": false, "canDelete": false, "canCreate": false, "canManageUsers": false, "canAccessAdmin": false, "canExportData": false}'::jsonb,
        '{}'::jsonb,
        true,
        false
    ),
    (
        'no-access',
        'No Access',
        'Cannot log in to system',
        ARRAY[]::TEXT[],
        ARRAY[]::TEXT[],
        '{"canEdit": false, "canDelete": false, "canCreate": false, "canManageUsers": false, "canAccessAdmin": false, "canExportData": false}'::jsonb,
        '{}'::jsonb,
        false,
        true
    )
ON CONFLICT (id) DO NOTHING;
