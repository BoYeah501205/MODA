// ============================================================================
// MODA AUTHENTICATION MODULE
// Extracted from App.jsx for better maintainability
// ============================================================================

const { useState, useEffect, useCallback, useRef } = React;

// Check if Supabase roles API is available
function isSupabaseRolesAvailable() {
    return window.MODA_SUPABASE_DATA?.isAvailable?.() && window.MODA_SUPABASE_DATA?.dashboardRoles;
}

// Get localStorage fallback roles (for offline/initial load)
// Uses DEFAULT_DASHBOARD_ROLES from dashboardRoles.js if available
function getDefaultRoles() {
    // Prefer the full DEFAULT_DASHBOARD_ROLES from dashboardRoles.js
    if (window.DEFAULT_DASHBOARD_ROLES && Array.isArray(window.DEFAULT_DASHBOARD_ROLES) && window.DEFAULT_DASHBOARD_ROLES.length > 0) {
        return window.DEFAULT_DASHBOARD_ROLES;
    }
    // Full fallback with all roles if dashboardRoles.js hasn't loaded yet
    return [
        { id: 'admin', name: 'Admin', tabs: ['executive', 'production', 'projects', 'people', 'qa', 'transport', 'equipment', 'onsite', 'engineering', 'automation', 'tracker', 'admin'], capabilities: { canManageUsers: true, canAccessAdmin: true, canExportData: true, canEdit: true, canDelete: true, canCreate: true }, tabPermissions: {}, editableTabs: ['production', 'projects', 'people', 'qa', 'transport', 'equipment', 'onsite', 'engineering', 'automation', 'tracker', 'admin'], isDefault: false, isProtected: true },
        { id: 'production_management', name: 'Production Management', tabs: ['executive', 'production', 'projects', 'people', 'qa'], capabilities: { canEdit: true, canDelete: true, canCreate: true, canExportData: true }, tabPermissions: {}, editableTabs: ['production', 'projects'], isDefault: false, isProtected: false },
        { id: 'production_supervisor', name: 'Production Supervisor', tabs: ['production', 'projects', 'people', 'qa'], capabilities: { canEdit: true, canCreate: true, canExportData: true }, tabPermissions: {}, editableTabs: ['production'], isDefault: false, isProtected: false },
        { id: 'qa_inspector', name: 'QA Inspector', tabs: ['production', 'qa', 'projects'], capabilities: { canEdit: true, canCreate: true, canExportData: true }, tabPermissions: {}, editableTabs: ['qa'], isDefault: false, isProtected: false },
        { id: 'transportation', name: 'Transportation', tabs: ['production', 'transport', 'projects'], capabilities: { canEdit: true, canCreate: true, canExportData: true }, tabPermissions: {}, editableTabs: ['transport'], isDefault: false, isProtected: false },
        { id: 'supply_chain', name: 'Supply Chain', tabs: ['production', 'projects', 'equipment'], capabilities: { canEdit: true, canCreate: true, canExportData: true }, tabPermissions: {}, editableTabs: ['equipment'], isDefault: false, isProtected: false },
        { id: 'preconstruction', name: 'Preconstruction', tabs: ['projects', 'production', 'engineering'], capabilities: { canEdit: true, canCreate: true, canExportData: true }, tabPermissions: {}, editableTabs: ['projects'], isDefault: false, isProtected: false },
        { id: 'onsite', name: 'On-Site', tabs: ['production', 'onsite', 'transport', 'projects'], capabilities: { canEdit: true, canCreate: true }, tabPermissions: {}, editableTabs: ['onsite'], isDefault: false, isProtected: false },
        { id: 'engineering', name: 'Engineering', tabs: ['production', 'engineering', 'projects', 'qa'], capabilities: { canEdit: true, canCreate: true, canExportData: true }, tabPermissions: {}, editableTabs: ['engineering'], isDefault: false, isProtected: false },
        { id: 'maintenance', name: 'Maintenance', tabs: ['production', 'equipment'], capabilities: { canEdit: true, canCreate: true }, tabPermissions: {}, editableTabs: ['equipment'], isDefault: false, isProtected: false },
        { id: 'executive', name: 'Executive', tabs: ['executive', 'production', 'projects', 'people'], capabilities: { canExportData: true }, tabPermissions: {}, editableTabs: [], isDefault: false, isProtected: false },
        { id: 'department-supervisor', name: 'Department Supervisor', tabs: ['production', 'projects', 'people'], capabilities: { canEdit: true, canCreate: true, canExportData: true }, tabPermissions: {}, editableTabs: ['production'], isDefault: false, isProtected: false },
        { id: 'coordinator', name: 'Coordinator', tabs: ['production', 'projects'], capabilities: { canEdit: true, canCreate: true }, tabPermissions: {}, editableTabs: ['production'], isDefault: false, isProtected: false },
        { id: 'employee', name: 'Employee', tabs: ['production'], capabilities: {}, tabPermissions: {}, editableTabs: [], isDefault: true, isProtected: false }
    ];
}

function getLocalStorageRoles() {
    const ROLES_VERSION = 3; // Increment to force update on all clients
    const currentVersion = parseInt(localStorage.getItem('autovol_dashboard_roles_version') || '0');
    
    // Force update if version is old
    if (currentVersion < ROLES_VERSION) {
        console.log('[Auth] Upgrading dashboard roles to version', ROLES_VERSION);
        const defaultRoles = getDefaultRoles();
        localStorage.setItem('autovol_dashboard_roles', JSON.stringify(defaultRoles));
        localStorage.setItem('autovol_dashboard_roles_version', ROLES_VERSION.toString());
        return defaultRoles;
    }
    
    const saved = localStorage.getItem('autovol_dashboard_roles');
    if (saved && saved !== 'undefined' && saved !== 'null') {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed;
            }
        } catch (e) {
            console.error('[Auth] Error parsing dashboard roles from localStorage:', e);
        }
    }
    // Use full DEFAULT_DASHBOARD_ROLES or fallback
    const defaultRoles = getDefaultRoles();
    // Initialize localStorage with defaults so future loads work
    localStorage.setItem('autovol_dashboard_roles', JSON.stringify(defaultRoles));
    localStorage.setItem('autovol_dashboard_roles_version', ROLES_VERSION.toString());
    return defaultRoles;
}

// Hook for managing dashboard roles - syncs with Supabase
function useDashboardRoles() {
    const [roles, setRoles] = useState(() => getLocalStorageRoles());
    const [isLoading, setIsLoading] = useState(true);
    const [supabaseAvailable, setSupabaseAvailable] = useState(false);
    const unsubscribeRef = useRef(null);

    // Load roles from Supabase on mount
    useEffect(() => {
        let mounted = true;
        
        const loadRoles = async () => {
            // Check if Supabase is available
            if (isSupabaseRolesAvailable()) {
                try {
                    console.log('[DashboardRoles] Loading from Supabase...');
                    const supabaseRoles = await window.MODA_SUPABASE_DATA.dashboardRoles.getAll();
                    
                    if (mounted && supabaseRoles && supabaseRoles.length > 0) {
                        console.log('[DashboardRoles] Loaded', supabaseRoles.length, 'roles from Supabase');
                        setRoles(supabaseRoles);
                        setSupabaseAvailable(true);
                        // Also cache to localStorage for offline fallback
                        localStorage.setItem('autovol_dashboard_roles', JSON.stringify(supabaseRoles));
                    } else if (mounted) {
                        // Supabase returned empty - use localStorage/defaults
                        console.log('[DashboardRoles] Supabase returned empty, using localStorage');
                        setSupabaseAvailable(true);
                    }
                } catch (err) {
                    console.warn('[DashboardRoles] Failed to load from Supabase, using localStorage:', err.message);
                    setSupabaseAvailable(false);
                }
            } else {
                console.log('[DashboardRoles] Supabase not available, using localStorage');
                setSupabaseAvailable(false);
            }
            
            if (mounted) {
                setIsLoading(false);
            }
        };

        // Small delay to ensure Supabase client is initialized
        const timer = setTimeout(loadRoles, 100);
        
        return () => {
            mounted = false;
            clearTimeout(timer);
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, []);

    // Subscribe to real-time updates when Supabase is available
    useEffect(() => {
        if (supabaseAvailable && isSupabaseRolesAvailable()) {
            console.log('[DashboardRoles] Setting up real-time subscription');
            unsubscribeRef.current = window.MODA_SUPABASE_DATA.dashboardRoles.onSnapshot((updatedRoles) => {
                if (updatedRoles && updatedRoles.length > 0) {
                    setRoles(updatedRoles);
                    localStorage.setItem('autovol_dashboard_roles', JSON.stringify(updatedRoles));
                }
            });
        }
        
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, [supabaseAvailable]);

    // Sync to localStorage whenever roles change (fallback cache)
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem('autovol_dashboard_roles', JSON.stringify(roles));
        }
    }, [roles, isLoading]);

    const addRole = useCallback(async (roleData) => {
        const newRole = {
            id: `role-${Date.now()}`,
            ...roleData,
            tabs: roleData.tabs || [],
            capabilities: roleData.capabilities || {},
            tabPermissions: roleData.tabPermissions || {},
            isProtected: false
        };
        
        // Optimistic update
        setRoles(prev => [...prev, newRole]);
        
        // Sync to Supabase if available
        if (supabaseAvailable && isSupabaseRolesAvailable()) {
            try {
                const created = await window.MODA_SUPABASE_DATA.dashboardRoles.create(newRole);
                console.log('[DashboardRoles] Created in Supabase:', created?.id);
            } catch (err) {
                console.error('[DashboardRoles] Failed to create in Supabase:', err.message);
            }
        }
        
        return newRole;
    }, [supabaseAvailable]);

    const updateRole = useCallback(async (roleId, updates) => {
        // Optimistic update
        setRoles(prev => prev.map(role => 
            role.id === roleId ? { ...role, ...updates } : role
        ));
        
        // Sync to Supabase if available
        if (supabaseAvailable && isSupabaseRolesAvailable()) {
            try {
                await window.MODA_SUPABASE_DATA.dashboardRoles.update(roleId, updates);
                console.log('[DashboardRoles] Updated in Supabase:', roleId);
            } catch (err) {
                console.error('[DashboardRoles] Failed to update in Supabase:', err.message);
            }
        }
    }, [supabaseAvailable]);

    const deleteRole = useCallback(async (roleId) => {
        const role = roles.find(r => r.id === roleId);
        if (role?.isProtected) {
            return { success: false, error: 'Cannot delete protected role' };
        }
        
        // Optimistic update
        setRoles(prev => prev.filter(role => role.id !== roleId));
        
        // Sync to Supabase if available
        if (supabaseAvailable && isSupabaseRolesAvailable()) {
            try {
                await window.MODA_SUPABASE_DATA.dashboardRoles.delete(roleId);
                console.log('[DashboardRoles] Deleted from Supabase:', roleId);
            } catch (err) {
                console.error('[DashboardRoles] Failed to delete from Supabase:', err.message);
            }
        }
        
        return { success: true };
    }, [roles, supabaseAvailable]);

    const setDefaultRole = useCallback(async (roleId) => {
        // Optimistic update
        setRoles(prev => prev.map(role => ({
            ...role,
            isDefault: role.id === roleId
        })));
        
        // Sync to Supabase if available
        if (supabaseAvailable && isSupabaseRolesAvailable()) {
            try {
                await window.MODA_SUPABASE_DATA.dashboardRoles.setDefault(roleId);
                console.log('[DashboardRoles] Set default in Supabase:', roleId);
            } catch (err) {
                console.error('[DashboardRoles] Failed to set default in Supabase:', err.message);
            }
        }
    }, [supabaseAvailable]);

    const moveTab = useCallback((roleId, tabId, direction) => {
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
    }, [roles, updateRole]);

    const toggleTab = useCallback((roleId, tabId) => {
        const role = roles.find(r => r.id === roleId);
        if (!role) return;

        const tabs = role.tabs.includes(tabId)
            ? role.tabs.filter(t => t !== tabId)
            : [...role.tabs, tabId];

        updateRole(roleId, { tabs });
    }, [roles, updateRole]);

    const toggleCapability = useCallback((roleId, capability) => {
        const role = roles.find(r => r.id === roleId);
        if (!role) return;

        const capabilities = {
            ...role.capabilities,
            [capability]: !role.capabilities[capability]
        };

        updateRole(roleId, { capabilities });
    }, [roles, updateRole]);

    const getRoleById = useCallback((roleId) => {
        return roles.find(r => r.id === roleId);
    }, [roles]);

    const getVisibleTabs = useCallback((roleId) => {
        const role = getRoleById(roleId);
        return role ? role.tabs : [];
    }, [getRoleById]);

    const hasCapability = useCallback((roleId, capability) => {
        const role = getRoleById(roleId);
        return role?.capabilities?.[capability] || false;
    }, [getRoleById]);

    // Get full tab permissions for a specific tab
    // Returns { canView, canEdit, canCreate, canDelete }
    const getTabPermission = useCallback((roleId, tabId) => {
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
    }, [getRoleById]);

    // Check if a role can perform a specific action on a tab
    const hasTabPermission = useCallback((roleId, tabId, permission) => {
        const perms = getTabPermission(roleId, tabId);
        return perms[permission] || false;
    }, [getTabPermission]);

    // Convenience methods for common permission checks
    const canViewTab = useCallback((roleId, tabId) => hasTabPermission(roleId, tabId, 'canView'), [hasTabPermission]);
    const canEditTab = useCallback((roleId, tabId) => hasTabPermission(roleId, tabId, 'canEdit'), [hasTabPermission]);
    const canCreateInTab = useCallback((roleId, tabId) => hasTabPermission(roleId, tabId, 'canCreate'), [hasTabPermission]);
    const canDeleteInTab = useCallback((roleId, tabId) => hasTabPermission(roleId, tabId, 'canDelete'), [hasTabPermission]);

    // Toggle a specific permission for a tab
    const toggleTabPermission = useCallback((roleId, tabId, permission = 'canEdit') => {
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
    }, [roles, updateRole]);

    // Set all permissions for a tab at once
    const setTabPermissions = useCallback((roleId, tabId, permissions) => {
        const role = roles.find(r => r.id === roleId);
        if (!role) return;

        const currentPermissions = role.tabPermissions || {};
        const tabPermissions = {
            ...currentPermissions,
            [tabId]: { ...currentPermissions[tabId], ...permissions }
        };

        updateRole(roleId, { tabPermissions });
    }, [roles, updateRole]);

    return { 
        roles, 
        isLoading,
        supabaseAvailable,
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
    // Dashboard roles are now managed by useDashboardRoles hook with Supabase sync
    // No initialization needed here - roles load from Supabase or localStorage fallback
    
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

    // Set global user state for non-React code (like activity logging)
    useEffect(() => {
        window.MODA_CURRENT_USER = currentUser;
    }, [currentUser]);

    // Listen for Supabase profile loaded event AND poll for it if not immediately available
    useEffect(() => {
        let pollInterval = null;
        let pollCount = 0;
        const MAX_POLLS = 20; // Poll for up to 2 seconds (20 * 100ms)
        
        const updateFromProfile = (profile) => {
            if (profile && profile.id) {
                console.log('[Auth] Updating session with Supabase profile, role:', profile.dashboard_role);
                const updatedSession = {
                    id: profile.id,
                    email: profile.email,
                    name: profile.name || profile.email?.split('@')[0],
                    dashboardRole: profile.dashboard_role || 'employee',
                    department: profile.department || '',
                    isProtected: (profile.email || '').toLowerCase() === 'trevor@autovol.com'
                };
                setCurrentUser(updatedSession);
                // Update storage to keep in sync
                const storage = localStorage.getItem('autovol_session') ? localStorage : sessionStorage;
                storage.setItem('autovol_session', JSON.stringify(updatedSession));
                // Stop polling once we have the profile
                if (pollInterval) {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
                return true;
            }
            return false;
        };

        const handleProfileLoaded = (event) => {
            updateFromProfile(event.detail);
        };

        window.addEventListener('moda-profile-loaded', handleProfileLoaded);

        // Check if profile is already loaded
        if (window.MODA_SUPABASE?.userProfile) {
            console.log('[Auth] Found existing Supabase profile on mount');
            updateFromProfile(window.MODA_SUPABASE.userProfile);
        } else {
            // Poll for profile if not immediately available (handles async loading race condition)
            console.log('[Auth] Profile not available yet, starting poll...');
            pollInterval = setInterval(() => {
                pollCount++;
                if (window.MODA_SUPABASE?.userProfile) {
                    console.log('[Auth] Profile found after polling');
                    updateFromProfile(window.MODA_SUPABASE.userProfile);
                } else if (pollCount >= MAX_POLLS) {
                    console.log('[Auth] Profile poll timeout, using localStorage session');
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            }, 100);
        }

        return () => {
            window.removeEventListener('moda-profile-loaded', handleProfileLoaded);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, []);

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

