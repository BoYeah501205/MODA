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

// Special features/sub-tabs that need permission control (not main navigation tabs)
window.SPECIAL_FEATURES = [
    { id: 'schedule_setup', label: 'Schedule Setup', parentTab: 'production', description: 'Configure weekly production schedule' },
    { id: 'weekly_board', label: 'Weekly Board', parentTab: 'production', description: 'Manage weekly production board' },
    { id: 'station_stagger', label: 'Station Stagger', parentTab: 'production', description: 'Configure station timing and stagger' }
];

// All permission-controlled items (tabs + special features)
window.ALL_PERMISSION_ITEMS = [
    ...window.ALL_AVAILABLE_TABS,
    ...window.SPECIAL_FEATURES
];

// Default role configurations
// tabPermissions: per-tab permissions object { tabId: { canView, canEdit, canCreate, canDelete } }
// If a tab is in 'tabs' array but not in tabPermissions, it defaults to view-only
// If tabPermissions[tabId] exists, those permissions apply for that specific tab
window.DEFAULT_DASHBOARD_ROLES = [
    {
        id: 'admin',
        name: 'Admin',
        description: 'Full system access for operations management',
        tabs: ['executive', 'production', 'projects', 'people', 'qa', 'transport', 'equipment', 'precon', 'rfi', 'onsite', 'engineering', 'automation', 'tracker', 'admin'],
        capabilities: {
            canManageUsers: true,
            canAccessAdmin: true,
            canExportData: true
        },
        tabPermissions: {
            executive: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            production: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            projects: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            people: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            qa: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            transport: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            equipment: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            precon: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            rfi: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            onsite: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            engineering: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            automation: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            tracker: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            admin: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            schedule_setup: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            weekly_board: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            station_stagger: { canView: true, canEdit: true, canCreate: true, canDelete: true }
        },
        isDefault: false,
        isProtected: true
    },
    {
        id: 'production_management',
        name: 'Production Management',
        description: 'Manages production schedules, weekly board, and station configuration',
        tabs: ['executive', 'production', 'projects', 'people', 'qa'],
        capabilities: {
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        tabPermissions: {
            executive: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            production: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            projects: { canView: true, canEdit: true, canCreate: true, canDelete: false },
            people: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            qa: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            schedule_setup: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            weekly_board: { canView: true, canEdit: true, canCreate: true, canDelete: true },
            station_stagger: { canView: true, canEdit: true, canCreate: true, canDelete: false }
        },
        isDefault: false,
        isProtected: false
    },
    {
        id: 'production_supervisor',
        name: 'Production Supervisor',
        description: 'Floor supervisor - can edit Weekly Board but not schedule setup',
        tabs: ['production', 'projects', 'people', 'qa'],
        capabilities: {
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        tabPermissions: {
            production: { canView: true, canEdit: true, canCreate: true, canDelete: false },
            projects: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            people: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            qa: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            schedule_setup: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            weekly_board: { canView: true, canEdit: true, canCreate: true, canDelete: false },
            station_stagger: { canView: true, canEdit: false, canCreate: false, canDelete: false }
        },
        isDefault: false,
        isProtected: false
    },
    {
        id: 'qa_inspector',
        name: 'QA Inspector',
        description: 'Quality assurance - can edit QA records and inspections',
        tabs: ['production', 'qa', 'projects'],
        capabilities: {
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        tabPermissions: {
            production: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            qa: { canView: true, canEdit: true, canCreate: true, canDelete: false },
            projects: { canView: true, canEdit: false, canCreate: false, canDelete: false }
        },
        isDefault: false,
        isProtected: false
    },
    {
        id: 'transportation',
        name: 'Transportation',
        description: 'Manages yard, shipping, and logistics',
        tabs: ['production', 'transport', 'projects'],
        capabilities: {
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        tabPermissions: {
            production: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            transport: { canView: true, canEdit: true, canCreate: true, canDelete: false },
            projects: { canView: true, canEdit: false, canCreate: false, canDelete: false }
        },
        isDefault: false,
        isProtected: false
    },
    {
        id: 'supply_chain',
        name: 'Supply Chain',
        description: 'Manages inventory, materials, and procurement',
        tabs: ['production', 'projects', 'equipment'],
        capabilities: {
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        tabPermissions: {
            production: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            projects: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            equipment: { canView: true, canEdit: true, canCreate: true, canDelete: false }
        },
        isDefault: false,
        isProtected: false
    },
    {
        id: 'preconstruction',
        name: 'Preconstruction',
        description: 'Project setup, module specs, and planning',
        tabs: ['projects', 'production', 'engineering', 'precon'],
        capabilities: {
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        tabPermissions: {
            projects: { canView: true, canEdit: true, canCreate: true, canDelete: false },
            production: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            engineering: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            precon: { canView: true, canEdit: true, canCreate: true, canDelete: false }
        },
        isDefault: false,
        isProtected: false
    },
    {
        id: 'onsite',
        name: 'On-Site',
        description: 'Field operations, delivery tracking, and site reporting',
        tabs: ['production', 'onsite', 'transport', 'projects'],
        capabilities: {
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: false
        },
        tabPermissions: {
            production: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            onsite: { canView: true, canEdit: true, canCreate: true, canDelete: false },
            transport: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            projects: { canView: true, canEdit: false, canCreate: false, canDelete: false }
        },
        isDefault: false,
        isProtected: false
    },
    {
        id: 'engineering',
        name: 'Engineering',
        description: 'Engineering documentation, issues, and drawings',
        tabs: ['production', 'engineering', 'projects', 'qa'],
        capabilities: {
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        tabPermissions: {
            production: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            engineering: { canView: true, canEdit: true, canCreate: true, canDelete: false },
            projects: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            qa: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            station_stagger: { canView: true, canEdit: true, canCreate: false, canDelete: false }
        },
        isDefault: false,
        isProtected: false
    },
    {
        id: 'maintenance',
        name: 'Maintenance',
        description: 'Equipment maintenance and repair tracking',
        tabs: ['production', 'equipment'],
        capabilities: {
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: false
        },
        tabPermissions: {
            production: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            equipment: { canView: true, canEdit: true, canCreate: true, canDelete: false }
        },
        isDefault: false,
        isProtected: false
    },
    {
        id: 'executive',
        name: 'Executive',
        description: 'CEO/CTO high-level operational view (view-only)',
        tabs: ['executive', 'production', 'projects', 'people'],
        capabilities: {
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        tabPermissions: {
            executive: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            production: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            projects: { canView: true, canEdit: false, canCreate: false, canDelete: false },
            people: { canView: true, canEdit: false, canCreate: false, canDelete: false }
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
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        tabPermissions: {
            production: { canView: true, canEdit: true, canCreate: true, canDelete: false },
            projects: { canView: true, canEdit: true, canCreate: false, canDelete: false },
            people: { canView: true, canEdit: false, canCreate: false, canDelete: false }
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
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: false
        },
        tabPermissions: {
            production: { canView: true, canEdit: true, canCreate: true, canDelete: false },
            projects: { canView: true, canEdit: false, canCreate: false, canDelete: false }
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
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: false
        },
        tabPermissions: {
            production: { canView: true, canEdit: false, canCreate: false, canDelete: false }
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
