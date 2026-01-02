// ============================================================================
// DASHBOARD ROLES SYSTEM - Role-Based Access Control
// ============================================================================

// All available tabs in MODA system
const ALL_AVAILABLE_TABS = [
    { id: 'executive', label: '📊 Executive', icon: '📊', description: 'High-level operational overview' },
    { id: 'production', label: '🏭 Production', icon: '🏭', description: 'Production floor management' },
    { id: 'projects', label: '📋 Projects', icon: '📋', description: 'Project directory and tracking' },
    { id: 'people', label: '👥 People', icon: '👥', description: 'Workforce management' },
    { id: 'qa', label: '✅ QA', icon: '✅', description: 'Quality assurance tracking' },
    { id: 'transport', label: '🚛 Transport', icon: '🚛', description: 'Transportation & logistics' },
    { id: 'equipment', label: '🔧 Equipment', icon: '🔧', description: 'Tools & equipment tracking' },
    { id: 'onsite', label: '🏗️ On-Site', icon: '🏗️', description: 'Field operations & reporting' },
    { id: 'engineering', label: '📐 Engineering', icon: '📐', description: 'Engineering documentation' },
    { id: 'automation', label: '🤖 Automation', icon: '🤖', description: 'Automation systems' },
    { id: 'tracker', label: '📦 Tracker', icon: '📦', description: 'Module tracking system' },
    { id: 'admin', label: '⚙️ Admin', icon: '⚙️', description: 'System administration' }
];

// Default role configurations
// ROLES_VERSION: Increment this when adding/modifying default roles to force update
const DEFAULT_DASHBOARD_ROLES = [
    {
        id: 'admin',
        name: 'Admin',
        description: 'Full system access for operations management',
        tabs: ['executive', 'production', 'projects', 'people', 'qa', 'transport', 'equipment', 'onsite', 'engineering', 'automation', 'tracker', 'admin'],
        capabilities: {
            canEdit: true,
            canDelete: true,
            canCreate: true,
            canManageUsers: true,
            canAccessAdmin: true,
            canExportData: true
        },
        // Tab-specific edit permissions (which tabs this role can modify data in)
        editableTabs: ['production', 'projects', 'people', 'qa', 'transport', 'equipment', 'onsite', 'engineering', 'automation', 'tracker', 'admin', 'schedule_setup', 'weekly_board', 'station_stagger'],
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
        tabs: ['projects', 'production', 'engineering'],
        capabilities: {
            canEdit: true,
            canDelete: false,
            canCreate: true,
            canManageUsers: false,
            canAccessAdmin: false,
            canExportData: true
        },
        editableTabs: ['projects'],
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
        description: 'CEO/CTO high-level operational view',
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
        description: 'Basic production floor view',
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

// Initialize roles in localStorage
function initializeDashboardRoles() {
    const existing = localStorage.getItem('autovol_dashboard_roles');
    const ROLES_VERSION = 2; // Incremented: Added new roles and editableTabs property
    
    if (!existing) {
        localStorage.setItem('autovol_dashboard_roles', JSON.stringify(DEFAULT_DASHBOARD_ROLES));
        localStorage.setItem('autovol_dashboard_roles_version', ROLES_VERSION);
        console.log('✅ Dashboard roles initialized');
    } else {
        const currentVersion = parseInt(localStorage.getItem('autovol_dashboard_roles_version') || '0');
        if (currentVersion < ROLES_VERSION) {
            localStorage.setItem('autovol_dashboard_roles', JSON.stringify(DEFAULT_DASHBOARD_ROLES));
            localStorage.setItem('autovol_dashboard_roles_version', ROLES_VERSION);
            console.log('✅ Dashboard roles upgraded to version ' + ROLES_VERSION);
        }
    }
}

// Hook for managing dashboard roles
function useDashboardRoles() {
    const { useState, useEffect } = React;
    
    const [roles, setRoles] = useState(() => {
        initializeDashboardRoles();
        const saved = localStorage.getItem('autovol_dashboard_roles');
        if (saved && saved !== 'undefined' && saved !== 'null') {
            try { return JSON.parse(saved); } catch (e) { /* fall through */ }
        }
        return DEFAULT_DASHBOARD_ROLES;
    });

    useEffect(() => {
        localStorage.setItem('autovol_dashboard_roles', JSON.stringify(roles));
    }, [roles]);

    const addRole = (roleData) => {
        const newRole = {
            id: `role-${Date.now()}`,
            ...roleData,
            tabs: roleData.tabs || [],
            capabilities: roleData.capabilities || {},
            isProtected: false
        };
        setRoles([...roles, newRole]);
        return newRole;
    };

    const updateRole = (roleId, updates) => {
        setRoles(roles.map(role => 
            role.id === roleId ? { ...role, ...updates } : role
        ));
    };

    const deleteRole = (roleId) => {
        const role = roles.find(r => r.id === roleId);
        if (role?.isProtected) {
            return { success: false, error: 'Cannot delete protected role' };
        }
        setRoles(roles.filter(role => role.id !== roleId));
        return { success: true };
    };

    const setDefaultRole = (roleId) => {
        setRoles(roles.map(role => ({
            ...role,
            isDefault: role.id === roleId
        })));
    };

    const moveTab = (roleId, tabId, direction) => {
        const role = roles.find(r => r.id === roleId);
        if (!role) return;

        const tabs = [...role.tabs];
        const currentIndex = tabs.indexOf(tabId);
        
        if (direction === 'up' && currentIndex > 0) {
            [tabs[currentIndex], tabs[currentIndex - 1]] = [tabs[currentIndex - 1], tabs[currentIndex]];
        } else if (direction === 'down' && currentIndex < tabs.length - 1) {
            [tabs[currentIndex], tabs[currentIndex + 1]] = [tabs[currentIndex + 1], tabs[currentIndex]];
        }

        updateRole(roleId, { tabs });
    };

    const toggleTab = (roleId, tabId) => {
        const role = roles.find(r => r.id === roleId);
        if (!role) return;

        const tabs = role.tabs.includes(tabId)
            ? role.tabs.filter(t => t !== tabId)
            : [...role.tabs, tabId];

        updateRole(roleId, { tabs });
    };

    const toggleCapability = (roleId, capability) => {
        const role = roles.find(r => r.id === roleId);
        if (!role) return;

        const capabilities = {
            ...role.capabilities,
            [capability]: !role.capabilities[capability]
        };

        updateRole(roleId, { capabilities });
    };

    const getRoleById = (roleId) => {
        return roles.find(r => r.id === roleId);
    };

    const getVisibleTabs = (roleId) => {
        const role = getRoleById(roleId);
        return role ? role.tabs : [];
    };

    const hasCapability = (roleId, capability) => {
        const role = getRoleById(roleId);
        return role?.capabilities?.[capability] || false;
    };

    // Check if a role can edit a specific tab/feature
    const canEditTab = (roleId, tabId) => {
        const role = getRoleById(roleId);
        if (!role) return false;
        // Admin always has full edit access
        if (role.id === 'admin') return true;
        // Check editableTabs array
        return role.editableTabs?.includes(tabId) || false;
    };

    // Get all editable tabs for a role
    const getEditableTabs = (roleId) => {
        const role = getRoleById(roleId);
        return role?.editableTabs || [];
    };

    return { 
        roles, 
        addRole, 
        updateRole, 
        deleteRole, 
        setDefaultRole, 
        moveTab, 
        toggleTab, 
        toggleCapability,
        getRoleById,
        getVisibleTabs,
        hasCapability,
        canEditTab,
        getEditableTabs
    };
}

// Standalone helper function to check if current user can edit a tab
// This can be called without the hook for quick permission checks
// Uses Supabase as single source of truth
function canUserEditTab(tabId) {
    // Primary source: Supabase profile (authoritative)
    const userRole = window.MODA_SUPABASE?.userProfile?.dashboard_role || 'employee';
    
    // Admin always has full edit access - check before loading roles
    if (userRole === 'admin') return true;
    
    // Get roles from localStorage
    const rolesJson = localStorage.getItem('autovol_dashboard_roles');
    if (!rolesJson) return false;
    
    try {
        const roles = JSON.parse(rolesJson);
        const role = roles.find(r => r.id === userRole);
        if (!role) return false;
        
        // Admin always has full edit access (redundant but kept for safety)
        if (role.id === 'admin') return true;
        
        // Check tabPermissions object (new structure)
        if (role.tabPermissions && role.tabPermissions[tabId]) {
            return role.tabPermissions[tabId].canEdit || false;
        }
        
        // Fallback to editableTabs array (legacy structure)
        if (role.editableTabs) {
            return role.editableTabs.includes(tabId) || false;
        }
        
        return false;
    } catch (e) {
        console.error('Error checking tab permissions:', e);
        return false;
    }
}

// Check if current user can perform a specific action on a tab
// Actions: 'canView', 'canEdit', 'canCreate', 'canDelete'
// Uses Supabase as single source of truth
function canUserPerformAction(tabId, action) {
    // Primary source: Supabase profile (authoritative)
    const userRole = window.MODA_SUPABASE?.userProfile?.dashboard_role || 'employee';
    
    // Admin always has full access - check before loading roles
    if (userRole === 'admin') return true;
    
    const rolesJson = localStorage.getItem('autovol_dashboard_roles');
    if (!rolesJson) return false;
    
    try {
        const roles = JSON.parse(rolesJson);
        const role = roles.find(r => r.id === userRole);
        if (!role) return false;
        
        // Admin always has full access (redundant but kept for safety)
        if (role.id === 'admin') return true;
        
        // Check tabPermissions object
        if (role.tabPermissions && role.tabPermissions[tabId]) {
            return role.tabPermissions[tabId][action] || false;
        }
        
        // For canView, check if tab is in viewable tabs
        if (action === 'canView') {
            return role.tabs?.includes(tabId) || false;
        }
        
        return false;
    } catch (e) {
        console.error('Error checking tab permissions:', e);
        return false;
    }
}

// Export for global access
window.canUserEditTab = canUserEditTab;
window.canUserPerformAction = canUserPerformAction;
