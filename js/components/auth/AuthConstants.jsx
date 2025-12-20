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
// editableTabs: array of tab IDs this role can edit (used by canUserEditTab function)
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
        editableTabs: ['production', 'projects', 'people', 'qa', 'transport', 'equipment', 'precon', 'rfi', 'onsite', 'engineering', 'automation', 'tracker', 'admin', 'schedule_setup', 'weekly_board', 'station_stagger'],
        isDefault: false,
        isProtected: true
    },
    {
        id: 'production_management',
        name: 'Production Management',
        description: 'Manages production schedules, weekly board, and station configuration',
        tabs: ['executive', 'production', 'projects', 'people', 'qa'],
        capabilities: {
            canEdit: true,
            canDelete: true,
            canCreate: true,
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        editableTabs: ['production', 'projects', 'schedule_setup', 'weekly_board', 'station_stagger'],
        isDefault: false,
        isProtected: false
    },
    {
        id: 'production_supervisor',
        name: 'Production Supervisor',
        description: 'Floor supervisor - can edit Weekly Board but not schedule setup',
        tabs: ['production', 'projects', 'people', 'qa'],
        capabilities: {
            canEdit: true,
            canDelete: false,
            canCreate: true,
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        editableTabs: ['production', 'weekly_board'],
        isDefault: false,
        isProtected: false
    },
    {
        id: 'qa_inspector',
        name: 'QA Inspector',
        description: 'Quality assurance - can edit QA records and inspections',
        tabs: ['production', 'qa', 'projects'],
        capabilities: {
            canEdit: true,
            canDelete: false,
            canCreate: true,
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        editableTabs: ['qa'],
        isDefault: false,
        isProtected: false
    },
    {
        id: 'transportation',
        name: 'Transportation',
        description: 'Manages yard, shipping, and logistics',
        tabs: ['production', 'transport', 'projects'],
        capabilities: {
            canEdit: true,
            canDelete: false,
            canCreate: true,
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        editableTabs: ['transport'],
        isDefault: false,
        isProtected: false
    },
    {
        id: 'supply_chain',
        name: 'Supply Chain',
        description: 'Manages inventory, materials, and procurement',
        tabs: ['production', 'projects', 'equipment'],
        capabilities: {
            canEdit: true,
            canDelete: false,
            canCreate: true,
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        editableTabs: ['equipment'],
        isDefault: false,
        isProtected: false
    },
    {
        id: 'preconstruction',
        name: 'Preconstruction',
        description: 'Project setup, module specs, and planning',
        tabs: ['projects', 'production', 'engineering', 'precon'],
        capabilities: {
            canEdit: true,
            canDelete: false,
            canCreate: true,
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        editableTabs: ['projects', 'precon'],
        isDefault: false,
        isProtected: false
    },
    {
        id: 'onsite',
        name: 'On-Site',
        description: 'Field operations, delivery tracking, and site reporting',
        tabs: ['production', 'onsite', 'transport', 'projects'],
        capabilities: {
            canEdit: true,
            canDelete: false,
            canCreate: true,
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: false
        },
        editableTabs: ['onsite'],
        isDefault: false,
        isProtected: false
    },
    {
        id: 'engineering',
        name: 'Engineering',
        description: 'Engineering documentation, issues, and drawings',
        tabs: ['production', 'engineering', 'projects', 'qa'],
        capabilities: {
            canEdit: true,
            canDelete: false,
            canCreate: true,
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        editableTabs: ['engineering', 'station_stagger'],
        isDefault: false,
        isProtected: false
    },
    {
        id: 'maintenance',
        name: 'Maintenance',
        description: 'Equipment maintenance and repair tracking',
        tabs: ['production', 'equipment'],
        capabilities: {
            canEdit: true,
            canDelete: false,
            canCreate: true,
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: false
        },
        editableTabs: ['equipment'],
        isDefault: false,
        isProtected: false
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
        editableTabs: [],
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
        editableTabs: ['production'],
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
        editableTabs: ['production'],
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
        editableTabs: [],
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
        editableTabs: [],
        isDefault: false,
        isProtected: true
    }
];

console.log('Auth constants loaded');
