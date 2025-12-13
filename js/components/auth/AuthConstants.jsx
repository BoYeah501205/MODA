// ============================================================================
// MODA AUTH CONSTANTS
// Shared constants for authentication and role management
// Must load before AuthModule.jsx
// ============================================================================

// All available tabs in MODA system
window.ALL_AVAILABLE_TABS = [
    { id: 'executive', label: 'Executive', icon: 'icon-executive', description: 'High-level operational overview' },
    { id: 'production', label: 'Production', icon: 'icon-production', description: 'Production floor management' },
    { id: 'projects', label: 'Projects', icon: 'icon-projects', description: 'Project directory and tracking' },
    { id: 'people', label: 'People', icon: 'icon-people', description: 'Workforce management' },
    { id: 'qa', label: 'QA', icon: 'icon-qa', description: 'Quality assurance tracking' },
    { id: 'transport', label: 'Transport', icon: 'icon-transport', description: 'Transportation & logistics' },
    { id: 'equipment', label: 'Equipment', icon: 'icon-equipment', description: 'Tools & equipment tracking' },
    { id: 'precon', label: 'Precon', icon: 'icon-precon', description: 'Preconstruction planning & estimates' },
    { id: 'rfi', label: 'RFI', icon: 'icon-rfi', description: 'Request for Information management' },
    { id: 'onsite', label: 'On-Site', icon: 'icon-onsite', description: 'Field operations & reporting' },
    { id: 'engineering', label: 'Engineering', icon: 'icon-engineering', description: 'Engineering documentation' },
    { id: 'automation', label: 'Automation', icon: 'icon-automation', description: 'Automation systems' },
    { id: 'tracker', label: 'Tracker', icon: 'icon-tracker', description: 'Module tracking system' },
    { id: 'admin', label: 'Admin', icon: 'icon-admin', description: 'System administration' }
];

// Default role configurations
// tabPermissions: per-tab edit permissions. If not specified, falls back to global canEdit capability.
window.DEFAULT_DASHBOARD_ROLES = [
    {
        id: 'admin',
        name: 'Admin',
        description: 'Full system access for operations management',
        tabs: ['executive', 'production', 'projects', 'people', 'qa', 'transport', 'equipment', 'precon', 'rfi', 'onsite', 'engineering', 'automation', 'tracker', 'admin'],
        capabilities: {
            canEdit: true,
            canDelete: true,
            canCreate: true,
            canManageUsers: true,
            canAccessAdmin: true,
            canExportData: true
        },
        tabPermissions: {
            executive: { canEdit: false },
            production: { canEdit: true },
            projects: { canEdit: true },
            people: { canEdit: true },
            qa: { canEdit: true },
            transport: { canEdit: true },
            equipment: { canEdit: true },
            precon: { canEdit: true },
            rfi: { canEdit: true },
            onsite: { canEdit: true },
            engineering: { canEdit: true },
            automation: { canEdit: true },
            tracker: { canEdit: true },
            admin: { canEdit: true }
        },
        isDefault: false,
        isProtected: true
    },
    {
        id: 'executive',
        name: 'Executive',
        description: 'CEO/CTO high-level operational view (view-only)',
        tabs: ['executive', 'production', 'projects', 'people'],
        capabilities: {
            canEdit: false,
            canDelete: false,
            canCreate: false,
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        tabPermissions: {
            executive: { canEdit: false },
            production: { canEdit: false },
            projects: { canEdit: false },
            people: { canEdit: false }
        },
        isDefault: false,
        isProtected: false
    },
    {
        id: 'department-supervisor',
        name: 'Department Supervisor',
        description: 'Department-level management view',
        tabs: ['production', 'projects', 'people'],
        capabilities: {
            canEdit: true,
            canDelete: false,
            canCreate: true,
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        tabPermissions: {
            production: { canEdit: true },
            projects: { canEdit: true },
            people: { canEdit: false }
        },
        isDefault: false,
        isProtected: false
    },
    {
        id: 'coordinator',
        name: 'Coordinator',
        description: 'Cross-department coordination role',
        tabs: ['production', 'projects'],
        capabilities: {
            canEdit: true,
            canDelete: false,
            canCreate: true,
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: false
        },
        tabPermissions: {
            production: { canEdit: true },
            projects: { canEdit: false }
        },
        isDefault: false,
        isProtected: false
    },
    {
        id: 'employee',
        name: 'Employee',
        description: 'Basic production floor view (view-only)',
        tabs: ['production'],
        capabilities: {
            canEdit: false,
            canDelete: false,
            canCreate: false,
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: false
        },
        tabPermissions: {
            production: { canEdit: false }
        },
        isDefault: true,
        isProtected: false
    },
    {
        id: 'no-access',
        name: 'No Access',
        description: 'Cannot log in to system',
        tabs: [],
        capabilities: {
            canEdit: false,
            canDelete: false,
            canCreate: false,
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: false
        },
        tabPermissions: {},
        isDefault: false,
        isProtected: true
    }
];

console.log('Auth constants loaded');
