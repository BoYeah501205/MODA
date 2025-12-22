// ============================================================================
// MODA AUTHENTICATION MODULE
// Extracted from App.jsx for better maintainability
// ============================================================================

const { useState, useEffect } = React;

// Initialize roles in localStorage
function initializeDashboardRoles() {
    const existing = localStorage.getItem('autovol_dashboard_roles');
    const ROLES_VERSION = 5; // Increment this if you change DEFAULT_DASHBOARD_ROLES (v5: migrated to full tabPermissions with canView/canEdit/canCreate/canDelete)
    
    if (!existing) {
        // No roles exist, initialize
        localStorage.setItem('autovol_dashboard_roles', JSON.stringify(window.DEFAULT_DASHBOARD_ROLES));
        localStorage.setItem('autovol_dashboard_roles_version', ROLES_VERSION);
        console.log('✅ Dashboard roles initialized');
    } else {
        // Check if we need to upgrade
        const currentVersion = parseInt(localStorage.getItem('autovol_dashboard_roles_version') || '0');
        if (currentVersion < ROLES_VERSION) {
            // Version mismatch - reinitialize
            localStorage.setItem('autovol_dashboard_roles', JSON.stringify(window.DEFAULT_DASHBOARD_ROLES));
            localStorage.setItem('autovol_dashboard_roles_version', ROLES_VERSION);
            console.log('✅ Dashboard roles upgraded to version ' + ROLES_VERSION);
        }
    }
}

// Hook for managing dashboard roles
function useDashboardRoles() {
    const [roles, setRoles] = useState(() => {
        initializeDashboardRoles();
        const saved = localStorage.getItem('autovol_dashboard_roles');
        if (saved && saved !== 'undefined' && saved !== 'null') {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('[Auth] Error parsing dashboard roles:', e);
            }
        }
        return window.DEFAULT_DASHBOARD_ROLES;
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

    // Get full tab permissions for a specific tab
    // Returns { canView, canEdit, canCreate, canDelete }
    const getTabPermission = (roleId, tabId) => {
        const role = getRoleById(roleId);
        const defaultPerms = { canView: false, canEdit: false, canCreate: false, canDelete: false };
        if (!role) return defaultPerms;
        
        if (role.tabPermissions && role.tabPermissions[tabId]) {
            return { ...defaultPerms, ...role.tabPermissions[tabId] };
        }
        
        // If tab is in viewable tabs but no specific permissions, default to view-only
        if (role.tabs?.includes(tabId)) {
            return { canView: true, canEdit: false, canCreate: false, canDelete: false };
        }
        
        return defaultPerms;
    };

    // Check if a role can perform a specific action on a tab
    const hasTabPermission = (roleId, tabId, permission) => {
        const perms = getTabPermission(roleId, tabId);
        return perms[permission] || false;
    };

    // Convenience methods for common permission checks
    const canViewTab = (roleId, tabId) => hasTabPermission(roleId, tabId, 'canView');
    const canEditTab = (roleId, tabId) => hasTabPermission(roleId, tabId, 'canEdit');
    const canCreateInTab = (roleId, tabId) => hasTabPermission(roleId, tabId, 'canCreate');
    const canDeleteInTab = (roleId, tabId) => hasTabPermission(roleId, tabId, 'canDelete');

    // Toggle a specific permission for a tab
    const toggleTabPermission = (roleId, tabId, permission = 'canEdit') => {
        const role = roles.find(r => r.id === roleId);
        if (!role) return;

        const currentPermissions = role.tabPermissions || {};
        const currentTabPerm = currentPermissions[tabId] || { 
            canView: role.tabs?.includes(tabId) || false, 
            canEdit: false, 
            canCreate: false, 
            canDelete: false 
        };
        
        const tabPermissions = {
            ...currentPermissions,
            [tabId]: { ...currentTabPerm, [permission]: !currentTabPerm[permission] }
        };

        updateRole(roleId, { tabPermissions });
    };

    // Set all permissions for a tab at once
    const setTabPermissions = (roleId, tabId, permissions) => {
        const role = roles.find(r => r.id === roleId);
        if (!role) return;

        const currentPermissions = role.tabPermissions || {};
        const tabPermissions = {
            ...currentPermissions,
            [tabId]: { ...currentPermissions[tabId], ...permissions }
        };

        updateRole(roleId, { tabPermissions });
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
        // Per-tab permission methods
        getTabPermission,
        hasTabPermission,
        canViewTab,
        canEditTab,
        canCreateInTab,
        canDeleteInTab,
        toggleTabPermission,
        setTabPermissions
    };
}

// ============================================================================
// END DASHBOARD ROLES SYSTEM
// ============================================================================


        // ===== AUTHENTICATION SYSTEM =====

const INITIAL_USERS = [
    { 
        id: 1, 
        email: 'trevor@autovol.com', 
        password: 'admin123', 
        name: 'Trevor Fletcher', 
        dashboardRole: 'admin',     // CHANGED: Uses dashboardRole instead of role
        isProtected: true,          // NEW: Trevor cannot be changed
        department: 'Operations', 
        active: true, 
        createdAt: '2024-01-01' 
    },
    { 
        id: 2, 
        email: 'curtis@autovol.com', 
        password: 'admin123', 
        name: 'Curtis Fletcher', 
        dashboardRole: 'executive',  // CHANGED: Curtis gets Executive role
        isProtected: false,
        department: 'CTO', 
        active: true, 
        createdAt: '2024-01-01' 
    },
    { 
        id: 3, 
        email: 'user@autovol.com', 
        password: 'user123', 
        name: 'Demo User', 
        dashboardRole: 'employee',  // CHANGED: Uses dashboardRole instead of role
        isProtected: false,
        department: 'Production', 
        active: true, 
        createdAt: '2024-01-15' 
    }
];

        
function useAuth() {
    // Initialize dashboard roles system
    initializeDashboardRoles();
    
    // Simple state - load from localStorage on init
    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem('autovol_session');
        if (saved && saved !== 'undefined' && saved !== 'null') {
            try {
                console.log('[Auth] Found saved session in localStorage');
                return JSON.parse(saved);
            } catch (e) { console.error('[Auth] Failed to parse localStorage session:', e); }
        }
        const sessionSaved = sessionStorage.getItem('autovol_session');
        if (sessionSaved && sessionSaved !== 'undefined' && sessionSaved !== 'null') {
            try {
                console.log('[Auth] Found saved session in sessionStorage');
                return JSON.parse(sessionSaved);
            } catch (e) { console.error('[Auth] Failed to parse sessionStorage session:', e); }
        }
        return null;
    });
    
    const [users, setUsers] = useState(() => {
        const saved = localStorage.getItem('autovol_users');
        if (saved && saved !== 'undefined' && saved !== 'null') {
            let savedUsers;
            try { savedUsers = JSON.parse(saved); } catch (e) { return INITIAL_USERS; }
            // Merge in any new INITIAL_USERS that don't exist in saved
            const savedEmails = savedUsers.map(u => (u.email || '').toLowerCase());
            const newUsers = INITIAL_USERS.filter(u => !savedEmails.includes((u.email || '').toLowerCase()));
            if (newUsers.length > 0) {
                return [...savedUsers, ...newUsers];
            }
            return savedUsers;
        }
        return INITIAL_USERS;
    });

    // MIGRATION: Convert old role/permissions to dashboardRole
    useEffect(() => {
        let needsMigration = false;
        const migratedUsers = users.map(user => {
            // Migrate old 'role' field to 'dashboardRole'
            if (user.role && !user.dashboardRole) {
                needsMigration = true;
                let dashboardRole = 'employee';
                if (user.role === 'Admin') dashboardRole = 'admin';
                else if (user.role === 'User') dashboardRole = 'employee';
                
                const isProtected = user.email === 'trevor@autovol.com';
                if (isProtected) dashboardRole = 'admin';
                
                return { 
                    ...user, 
                    dashboardRole, 
                    isProtected,
                    role: undefined,        // Remove old field
                    permissions: undefined  // Remove if exists
                };
            }
            
            // Migrate old 'permissions' field to 'dashboardRole'
            if (user.permissions && !user.dashboardRole) {
                needsMigration = true;
                let dashboardRole = 'employee';
                if (user.permissions === 'Admin') dashboardRole = 'admin';
                else if (user.permissions === 'User') dashboardRole = 'employee';
                else if (user.permissions === 'No Access') dashboardRole = 'no-access';
                
                const isProtected = user.email === 'trevor@autovol.com';
                if (isProtected) dashboardRole = 'admin';
                
                return { 
                    ...user, 
                    dashboardRole, 
                    isProtected,
                    permissions: undefined,
                    role: undefined
                };
            }
            
            // Ensure Trevor is always protected
            if (user.email === 'trevor@autovol.com' && !user.isProtected) {
                needsMigration = true;
                return { ...user, isProtected: true, dashboardRole: 'admin' };
            }
            
            return user;
        });
        
        if (needsMigration) {
            setUsers(migratedUsers);
            console.log('✅ Migrated users to dashboard role system');
        }
    }, []);

    useEffect(() => { 
        localStorage.setItem('autovol_users', JSON.stringify(users)); 
    }, [users]);

    const login = async (email, password, rememberMe) => {
        // Try Supabase (primary backend)
        if (window.MODA_SUPABASE) {
            try {
                console.log('[Auth] Attempting Supabase login...');
                console.log('[Auth] MODA_SUPABASE.isInitialized:', MODA_SUPABASE.isInitialized);
                const result = await MODA_SUPABASE.login(email, password);
                console.log('[Auth] Supabase login result:', result);
                if (result.success && result.user) {
                    // Use profile from login result (already fetched)
                    const profile = result.profile || MODA_SUPABASE.userProfile || {};
                    console.log('[Auth] Supabase login success, profile:', profile);
                    const session = {
                        id: result.user.id,
                        email: result.user.email,
                        name: profile.name || result.user.email.split('@')[0],
                        dashboardRole: profile.dashboard_role || 'employee',
                        department: profile.department || '',
                        isProtected: ((profile.email || result.user.email) || '').toLowerCase() === 'trevor@autovol.com'
                    };
                    console.log('[Auth] Setting session:', session);
                    setCurrentUser(session);
                    if (rememberMe) localStorage.setItem('autovol_session', JSON.stringify(session));
                    else sessionStorage.setItem('autovol_session', JSON.stringify(session));
                    console.log('[Auth] Login complete, returning success');
                    return { success: true };
                } else if (result.error) {
                    console.log('[Auth] Supabase login failed:', result.error);
                    return { success: false, error: result.error };
                }
            } catch (err) {
                console.log('[Auth] Supabase login error:', err.message);
                return { success: false, error: err.message };
            }
        } else {
            console.log('[Auth] MODA_SUPABASE not available');
        }
        
        // Fallback to local users (offline/demo mode only)
        const user = users.find(u => (u.email || '').toLowerCase() === (email || '').toLowerCase() && u.password === password && u.active);
        if (user) {
            let migratedUser = { ...user };
            if (user.role && !user.dashboardRole) {
                if (user.role === 'Admin') migratedUser.dashboardRole = 'admin';
                else if (user.role === 'User') migratedUser.dashboardRole = 'employee';
                migratedUser.isProtected = user.email === 'trevor@autovol.com';
                delete migratedUser.role;
                delete migratedUser.permissions;
            }
            
            const session = { ...migratedUser, password: undefined };
            setCurrentUser(session);
            if (rememberMe) localStorage.setItem('autovol_session', JSON.stringify(session));
            else sessionStorage.setItem('autovol_session', JSON.stringify(session));
            return { success: true };
        }
        return { success: false, error: 'Invalid email or password' };
    };

    const logout = () => { 
        console.log('[Auth] Logout called - clearing session');
        
        // Clear local state immediately
        localStorage.removeItem('autovol_session'); 
        sessionStorage.removeItem('autovol_session');
        setCurrentUser(null);
        
        // Try Supabase logout in background (don't wait for it)
        if (window.MODA_SUPABASE && MODA_SUPABASE.isInitialized) {
            MODA_SUPABASE.logout().catch(err => {
                console.log('[Auth] Supabase logout error (ignored):', err.message);
            });
        }
        
        console.log('[Auth] Reloading page');
        window.location.reload();
    };
    
    const addUser = (userData) => { 
        const newUser = { 
            ...userData, 
            id: Date.now(), 
            active: true, 
            createdAt: new Date().toISOString().split('T')[0],
            dashboardRole: userData.dashboardRole || 'employee',
            isProtected: false
        }; 
        setUsers([...users, newUser]); 
        return newUser; 
    };
    
    const updateUser = (userId, updates) => { 
        setUsers(users.map(u => {
            if (u.id === userId) {
                // Prevent changing protected accounts
                if (u.isProtected && updates.dashboardRole && updates.dashboardRole !== u.dashboardRole) {
                    console.warn('Cannot change role of protected account');
                    return u;
                }
                return { ...u, ...updates };
            }
            return u;
        })); 
    };
    
    const toggleUserActive = (userId) => { 
        setUsers(users.map(u => u.id === userId ? { ...u, active: !u.active } : u)); 
    };
    
    const resetPassword = async (email) => { 
        // Try Supabase
        if (window.MODA_SUPABASE && MODA_SUPABASE.isInitialized) {
            try {
                const result = await MODA_SUPABASE.resetPassword(email);
                if (result.success) {
                    return { success: true, message: 'Password reset email sent! Check your inbox.' };
                }
                return { success: false, error: result.error || 'Failed to send reset email' };
            } catch (err) {
                console.log('[Auth] Supabase reset failed:', err.message);
                return { success: false, error: err.message };
            }
        }
        // Fallback to local (simulated - offline mode only)
        const user = users.find(u => (u.email || '').toLowerCase() === (email || '').toLowerCase()); 
        return user ? { success: true, message: 'Password reset email sent (simulated)' } : { success: false, error: 'Email not found' }; 
    };

    // Dashboard roles integration
    const dashboardRoles = useDashboardRoles();
    const userRole = currentUser ? dashboardRoles.getRoleById(currentUser.dashboardRole) : null;
    const visibleTabs = currentUser ? dashboardRoles.getVisibleTabs(currentUser.dashboardRole) : [];
    
    // Capability checks
    const canEdit = currentUser ? dashboardRoles.hasCapability(currentUser.dashboardRole, 'canEdit') : false;
    const canDelete = currentUser ? dashboardRoles.hasCapability(currentUser.dashboardRole, 'canDelete') : false;
    const canCreate = currentUser ? dashboardRoles.hasCapability(currentUser.dashboardRole, 'canCreate') : false;
    const canManageUsers = currentUser ? dashboardRoles.hasCapability(currentUser.dashboardRole, 'canManageUsers') : false;
    const canAccessAdmin = currentUser ? dashboardRoles.hasCapability(currentUser.dashboardRole, 'canAccessAdmin') : false;
    const canExportData = currentUser ? dashboardRoles.hasCapability(currentUser.dashboardRole, 'canExportData') : false;

    // Tab-specific edit permission check
    // Usage: auth.canEditTab('production') returns true/false
    const canEditTabFn = (tabId) => {
        if (!currentUser) return false;
        return dashboardRoles.canEditTab(currentUser.dashboardRole, tabId);
    };

    return { 
        currentUser, 
        users, 
        login, 
        logout, 
        addUser, 
        updateUser, 
        toggleUserActive, 
        resetPassword,
        // Dashboard role system
        dashboardRoles,
        userRole,
        visibleTabs,
        // Capabilities
        canEdit,
        canDelete,
        canCreate,
        canManageUsers,
        canAccessAdmin,
        canExportData,
        // Tab-specific permissions
        canEditTab: canEditTabFn,
        // Backward compatibility
        isAdmin: canAccessAdmin
    };
}

// Export for use in App.jsx
window.useAuth = useAuth;
window.useDashboardRoles = useDashboardRoles;
window.initializeDashboardRoles = initializeDashboardRoles;

