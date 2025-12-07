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
const DEFAULT_DASHBOARD_ROLES = [
    {
        id: 'admin',
        name: 'Admin',
        description: 'Full system access for operations management',
        tabs: ['production', 'projects', 'people', 'qa', 'transport', 'equipment', 'onsite', 'engineering', 'automation', 'tracker', 'admin'],
        capabilities: {
            canEdit: true,
            canDelete: true,
            canCreate: true,
            canManageUsers: true,
            canAccessAdmin: true,
            canExportData: true
        },
        isDefault: false,
        isProtected: true
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
        isDefault: false,
        isProtected: true
    }
];

// Initialize roles in localStorage
function initializeDashboardRoles() {
    const existing = localStorage.getItem('autovol_dashboard_roles');
    const ROLES_VERSION = 1;
    
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
        return saved ? JSON.parse(saved) : DEFAULT_DASHBOARD_ROLES;
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
        hasCapability
    };
}
