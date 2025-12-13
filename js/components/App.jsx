// MODA Dashboard - React Components
// Extracted from index.html for optimization

        const { useState, useEffect, useMemo, useRef } = React;
        
        // Feature flag helper
        const isFeatureEnabled = (flag, userEmail) => window.MODA_FEATURE_FLAGS?.isEnabled(flag, userEmail) || false;

        // ===== AUTOVOL LOGO =====
        const AUTOVOL_LOGO = "./public/autovol-logo.png";

        // ===== LICENSE PLATE UTILITIES =====
        const generateQRCode = (text) => {
            const qr = qrcode(0, 'M');
            qr.addData(text);
            qr.make();
            return qr.createDataURL(4, 0);
        };

        const buildModuleUrl = (baseUrl, projectId, serialNumber) => {
            // Point to the Module Scanner page
            const scannerUrl = baseUrl.replace(/[^/]*$/, 'Module_Scanner.html');
            return `${scannerUrl}?project=${encodeURIComponent(projectId)}&module=${encodeURIComponent(serialNumber)}`;
        };

        // Extract Building, Level, Module from BLM ID (e.g., B1L2M52 → Building 1, Level 2, Module 52)
        const extractFromBLM = (blmId) => {
            const blm = String(blmId || '').toUpperCase();
            // Pattern: B{building}L{level}M{module} e.g., B1L2M52
            const match = blm.match(/B(\d+)L(\d+)M(\d+)/);
            if (match) {
                return {
                    building: `B${match[1]}`,
                    level: `L${match[2]}`,
                    module: `M${match[3].padStart(2, '0')}`
                };
            }
            // Fallback: Try 3-digit serial format (e.g., 313 = Building 3, Level 1, Module 3)
            const serialMatch = String(blmId).match(/^(\d)(\d)(\d+)$/);
            if (serialMatch) {
                return {
                    building: `B${serialMatch[1]}`,
                    level: `L${serialMatch[2]}`,
                    module: `M${serialMatch[3].padStart(2, '0')}`
                };
            }
            return { building: 'OTHER', level: 'OTHER', module: 'OTHER' };
        };

        const extractStack = (serialNumber) => {
            // Keep for backwards compatibility - now uses BLM extraction
            const result = extractFromBLM(serialNumber);
            return result.building !== 'OTHER' ? result.building : 'OTHER';
        };

        const extractUnitType = (unitType) => {
            const type = String(unitType).toUpperCase().replace(/[.\-_]/g, ' ').trim();
            const match = type.match(/^(\d*\s*B|STUDIO|STU)/i);
            return match ? match[0].replace(/\s+/g, '') : type.split(' ')[0] || 'OTHER';
        };

        const getLicensePlateIndicators = (module) => {
            const indicators = [];
            const difficulties = module.difficulties || {};
            
            if (difficulties.sidewall) indicators.push({ key: 'SW', label: 'SW' });
            if (difficulties.short) indicators.push({ key: 'SHORT', label: 'SHORT' });
            if (difficulties.stair) indicators.push({ key: 'STAIR', label: 'STAIR' });
            if (difficulties.hr3Wall) indicators.push({ key: '3HR', label: '3HR' });
            if (difficulties.doubleStudio) indicators.push({ key: 'DBL', label: 'DBL STUDIO' });
            if (difficulties.sawbox) indicators.push({ key: 'SAWBOX', label: 'SAWBOX' });
            if (difficulties.proto) indicators.push({ key: 'PROTO', label: 'PROTO' });
            
            return indicators;
        };
// ===== AUTHENTICATION SYSTEM =====

// ============================================================================
// DASHBOARD ROLES SYSTEM - ADDED FOR ROLE-BASED ACCESS CONTROL
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
    { id: 'precon', label: '📝 Precon', icon: '📝', description: 'Preconstruction planning & estimates' },
    { id: 'rfi', label: '📋 RFI', icon: '📋', description: 'Request for Information management' },
    { id: 'onsite', label: '🏗️ On-Site', icon: '🏗️', description: 'Field operations & reporting' },
    { id: 'engineering', label: '📐 Engineering', icon: '📐', description: 'Engineering documentation' },
    { id: 'automation', label: '🤖 Automation', icon: '🤖', description: 'Automation systems' },
    { id: 'tracker', label: '📦 Tracker', icon: '📦', description: 'Module tracking system' },
    { id: 'admin', label: '⚙️ Admin', icon: '⚙️', description: 'System administration' }
];

// Default role configurations
// tabPermissions: per-tab edit permissions. If not specified, falls back to global canEdit capability.
const DEFAULT_DASHBOARD_ROLES = [
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
        // Admin can edit all tabs
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
        isProtected: true // Cannot be deleted
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
        // Executive is view-only on all tabs
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
        // Supervisor can edit production but view-only on people
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
        // Coordinator can edit production but view-only on projects
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
        // Employee is view-only
        tabPermissions: {
            production: { canEdit: false }
        },
        isDefault: true, // Default role for new users
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
        isProtected: true // Cannot be deleted
    }
];

// Initialize roles in localStorage
function initializeDashboardRoles() {
    const existing = localStorage.getItem('autovol_dashboard_roles');
    const ROLES_VERSION = 3; // Increment this if you change DEFAULT_DASHBOARD_ROLES (v3: added executive tab to admin role)
    
    if (!existing) {
        // No roles exist, initialize
        localStorage.setItem('autovol_dashboard_roles', JSON.stringify(DEFAULT_DASHBOARD_ROLES));
        localStorage.setItem('autovol_dashboard_roles_version', ROLES_VERSION);
        console.log('✅ Dashboard roles initialized');
    } else {
        // Check if we need to upgrade
        const currentVersion = parseInt(localStorage.getItem('autovol_dashboard_roles_version') || '0');
        if (currentVersion < ROLES_VERSION) {
            // Version mismatch - reinitialize
            localStorage.setItem('autovol_dashboard_roles', JSON.stringify(DEFAULT_DASHBOARD_ROLES));
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

    // Check if a role can edit a specific tab
    // Falls back to global canEdit capability if tabPermissions not defined
    const canEditTab = (roleId, tabId) => {
        const role = getRoleById(roleId);
        if (!role) return false;
        
        // Check tab-specific permission first
        if (role.tabPermissions && role.tabPermissions[tabId] !== undefined) {
            return role.tabPermissions[tabId]?.canEdit || false;
        }
        
        // Fall back to global canEdit capability
        return role.capabilities?.canEdit || false;
    };

    // Toggle tab-specific edit permission
    const toggleTabPermission = (roleId, tabId) => {
        const role = roles.find(r => r.id === roleId);
        if (!role) return;

        const currentPermissions = role.tabPermissions || {};
        const currentTabPerm = currentPermissions[tabId] || { canEdit: role.capabilities?.canEdit || false };
        
        const tabPermissions = {
            ...currentPermissions,
            [tabId]: { ...currentTabPerm, canEdit: !currentTabPerm.canEdit }
        };

        updateRole(roleId, { tabPermissions });
    };

    // Get tab permission for a specific tab
    const getTabPermission = (roleId, tabId) => {
        const role = getRoleById(roleId);
        if (!role) return { canEdit: false };
        
        if (role.tabPermissions && role.tabPermissions[tabId]) {
            return role.tabPermissions[tabId];
        }
        
        // Default to global canEdit
        return { canEdit: role.capabilities?.canEdit || false };
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
        toggleTabPermission,
        getTabPermission
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
    
    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem('autovol_session');
        return saved ? JSON.parse(saved) : null;
    });
    
    const [users, setUsers] = useState(() => {
        const saved = localStorage.getItem('autovol_users');
        if (saved) {
            const savedUsers = JSON.parse(saved);
            // Merge in any new INITIAL_USERS that don't exist in saved
            const savedEmails = savedUsers.map(u => u.email.toLowerCase());
            const newUsers = INITIAL_USERS.filter(u => !savedEmails.includes(u.email.toLowerCase()));
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
        // Try Firebase first
        if (window.MODA_FIREBASE && MODA_FIREBASE.isInitialized) {
            try {
                const result = await MODA_FIREBASE.login(email, password);
                if (result.success && result.user) {
                    // Get profile from result (login now waits for profile to load)
                    const profile = result.profile || MODA_FIREBASE.userProfile || {};
                    console.log('[Auth] Firebase login success, profile:', profile);
                    const session = {
                        id: result.user.uid,
                        email: result.user.email,
                        name: profile.name || result.user.email.split('@')[0],
                        dashboardRole: profile.dashboardRole || profile.role || 'employee',
                        department: profile.department || '',
                        isProtected: (profile.email || result.user.email).toLowerCase() === 'trevor@autovol.com'
                    };
                    setCurrentUser(session);
                    if (rememberMe) localStorage.setItem('autovol_session', JSON.stringify(session));
                    else sessionStorage.setItem('autovol_session', JSON.stringify(session));
                    return { success: true };
                }
            } catch (err) {
                console.log('[Auth] Firebase login failed, trying local:', err.message);
                // Fall through to try local credentials
            }
        }
        
        // Fallback to local users
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.active);
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
        setCurrentUser(null); 
        localStorage.removeItem('autovol_session'); 
        sessionStorage.removeItem('autovol_session'); 
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
        // Try Firebase first
        if (window.MODA_FIREBASE && MODA_FIREBASE.isInitialized) {
            try {
                await MODA_FIREBASE.resetPassword(email);
                return { success: true, message: 'Password reset email sent! Check your inbox.' };
            } catch (err) {
                const msg = MODA_FIREBASE.getErrorMessage ? MODA_FIREBASE.getErrorMessage(err.code) : err.message;
                return { success: false, error: msg };
            }
        }
        // Fallback to local (simulated)
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase()); 
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


        function LoginForm({ auth, onForgotPassword }) {
            const [email, setEmail] = useState('');
            const [password, setPassword] = useState('');
            const [showPassword, setShowPassword] = useState(false);
            const [rememberMe, setRememberMe] = useState(false);
            const [error, setError] = useState('');
            const [loading, setLoading] = useState(false);

            const handleSubmit = async (e) => {
                e.preventDefault();
                setError(''); setLoading(true);
                await new Promise(r => setTimeout(r, 500));
                const result = await auth.login(email, password, rememberMe);
                if (!result.success) setError(result.error);
                setLoading(false);
            };

            return (
                <>
                    <div className="text-center mb-8">
                        <img 
                            src={AUTOVOL_LOGO} 
                            alt="Autovol Volumetric Modular" 
                            style={{height: '60px', width: 'auto', margin: '0 auto'}}
                        />
                        <p className="text-gray-500 text-xs mt-3">Making Smart Construction Brilliant™</p>
                    </div>
                    <h2 style={{color: '#1E3A5F'}} className="text-xl font-semibold text-center mb-6">Sign in to MODA</h2>
                    {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{backgroundColor: '#FDEAEA', color: '#E31B23'}}>{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@autovol.com" required /></div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? 'text' : 'password'} 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    className="input-field pr-10" 
                                    placeholder="••••••••" 
                                    required 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showPassword ? '🙈' : '👁'}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm text-gray-600">Remember me</span></label>
                            <button type="button" onClick={onForgotPassword} className="text-sm font-medium" style={{color: '#007B8A'}}>Forgot password?</button>
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-semibold btn-primary">{loading ? 'Signing in...' : 'Sign In'}</button>
                    </form>
                    <div className="mt-6 pt-6 border-t text-center">
                        <p className="text-xs text-gray-400">Modular Operations Dashboard Application</p>
                        <p className="text-xs text-gray-300 mt-2">Admin: trevor@autovol.com or curtis@autovol.com / admin123</p>
                    </div>
                </>
            );
        }

        function ForgotPasswordForm({ auth, onBack }) {
            const [email, setEmail] = useState('');
            const [message, setMessage] = useState('');
            const [error, setError] = useState('');
            const [loading, setLoading] = useState(false);

            const handleSubmit = async (e) => {
                e.preventDefault();
                setError(''); setMessage(''); setLoading(true);
                const result = await auth.resetPassword(email);
                if (result.success) setMessage(result.message);
                else setError(result.error);
                setLoading(false);
            };

            return (
                <>
                    <button onClick={onBack} className="mb-4 text-sm flex items-center gap-1" style={{color: '#007B8A'}}>← Back to login</button>
                    <h2 style={{color: '#1E3A5F'}} className="text-xl font-semibold mb-2">Reset Password</h2>
                    <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send you a reset link.</p>
                    {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{backgroundColor: '#FDEAEA', color: '#E31B23'}}>{error}</div>}
                    {message && <div className="mb-4 p-3 rounded-lg text-sm" style={{backgroundColor: '#E6F4F5', color: '#007B8A'}}>{message}</div>}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@autovol.com" required /></div>
                        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-semibold btn-primary">{loading ? 'Sending...' : 'Send Reset Link'}</button>
                    </form>
                </>
            );
        }

        function LoginPage({ auth }) {
            const [view, setView] = useState('login');
            return (
                <div className="min-h-screen flex items-center justify-center p-4 relative login-background">
                    <div className="production-lines"></div>
                    <div className="login-card w-full max-w-md p-8 relative z-10">
                        {view === 'login' && <LoginForm auth={auth} onForgotPassword={() => setView('forgot')} />}
                        {view === 'forgot' && <ForgotPasswordForm auth={auth} onBack={() => setView('login')} />}
                    </div>
                </div>
            );
        }
        // ===== END AUTHENTICATION SYSTEM =====

        // Production Stages Definition - 21 stations with staggers
        // startingSerial: the module serial # that starts at this station this week
        // stagger: offset from Automation (calculated from starting modules)
        const productionStages = [
            { id: 'auto-fc', name: 'Automation (Floor/Ceiling)', dept: 'AUTO-FC', color: 'bg-slate-600', group: 'automation', startingSerial: '25-0861' },
            { id: 'auto-walls', name: 'Automation (Walls)', dept: 'AUTO-W', color: 'bg-slate-500', group: 'automation', startingSerial: '25-0861' },
            { id: 'mezzanine', name: 'Mezzanine (FC Prep, Plumbing - Floors)', dept: 'MEZZ', color: 'bg-violet-500', group: null, startingSerial: '25-0860' },
            { id: 'elec-ceiling', name: 'Electrical - Ceilings', dept: 'ELEC-C', color: 'bg-amber-400', group: null, startingSerial: '25-0857' },
            { id: 'wall-set', name: 'Wall Set', dept: 'WALL', color: 'bg-autovol-teal', group: null, startingSerial: '25-0856' },
            { id: 'ceiling-set', name: 'Ceiling Set', dept: 'CEIL', color: 'bg-teal-400', group: null, startingSerial: '25-0855' },
            { id: 'soffits', name: 'Soffits', dept: 'SOFF', color: 'bg-sky-500', group: null, startingSerial: '25-0854' },
            { id: 'mech-rough', name: 'Mechanical Rough-In', dept: 'MECH-R', color: 'bg-cyan-600', group: 'mep-rough', startingSerial: '25-0959' },
            { id: 'elec-rough', name: 'Electrical Rough-In', dept: 'ELEC-R', color: 'bg-cyan-500', group: 'mep-rough', startingSerial: '25-0959' },
            { id: 'plumb-rough', name: 'Plumbing Rough-In', dept: 'PLMB-R', color: 'bg-cyan-400', group: 'mep-rough', startingSerial: '25-0959' },
            { id: 'exteriors', name: 'Exteriors', dept: 'EXT', color: 'bg-teal-500', group: null, startingSerial: '25-0853' },
            { id: 'drywall-bp', name: 'Drywall - BackPanel', dept: 'DRY-BP', color: 'bg-green-600', group: null, startingSerial: '25-0852' },
            { id: 'drywall-ttp', name: 'Drywall - Tape/Texture/Paint', dept: 'DRY-TTP', color: 'bg-green-500', group: null, startingSerial: '25-0846' },
            { id: 'roofing', name: 'Roofing', dept: 'ROOF', color: 'bg-amber-500', group: null, startingSerial: '25-0848' },
            { id: 'pre-finish', name: 'Pre-Finish', dept: 'PRE-FIN', color: 'bg-lime-500', group: null, startingSerial: '25-0840' },
            { id: 'mech-trim', name: 'Mechanical Trim', dept: 'MECH-T', color: 'bg-yellow-600', group: 'mep-trim', startingSerial: '25-0956' },
            { id: 'elec-trim', name: 'Electrical Trim', dept: 'ELEC-T', color: 'bg-yellow-500', group: 'mep-trim', startingSerial: '25-0956' },
            { id: 'plumb-trim', name: 'Plumbing Trim', dept: 'PLMB-T', color: 'bg-yellow-400', group: 'mep-trim', startingSerial: '25-0956' },
            { id: 'final-finish', name: 'Final Finish', dept: 'FINAL', color: 'bg-orange-500', group: null, startingSerial: '25-0958' },
            { id: 'sign-off', name: 'Module Sign-Off', dept: 'SIGN-OFF', color: 'bg-rose-500', group: null, startingSerial: '25-0955' },
            { id: 'close-up', name: 'Close-Up', dept: 'CLOSE', color: 'bg-red-500', group: null, startingSerial: '25-0953' }
        ];

        // Station groups for visual styling
        const stationGroups = {
            'automation': { name: 'Automation', borderColor: 'border-autovol-teal', stations: ['auto-fc', 'auto-walls'] },
            'mep-rough': { name: 'MEP Rough-In', borderColor: 'border-cyan-500', stations: ['mech-rough', 'elec-rough', 'plumb-rough'] },
            'mep-trim': { name: 'MEP Trim', borderColor: 'border-yellow-500', stations: ['mech-trim', 'elec-trim', 'plumb-trim'] }
        };

        // Station staggers (offset from Automation in build sequence)
        // Higher number = station is working on modules further ahead in production
        // Default values as of Dec 5, 2025
        const stationStaggers = {
            'auto-fc': 0,        // Automation (Floor/Ceiling) - Base
            'auto-walls': 0,     // Automation (Walls) - Parallel with F/C
            'mezzanine': 1,      // Mezzanine (FC Prep, Plumbing - Floors)
            'elec-ceiling': 4,   // Electrical - Ceilings
            'wall-set': 5,       // Wall Set
            'ceiling-set': 6,    // Ceiling Set
            'soffits': 7,        // Soffits
            'mech-rough': 8,     // Mechanical Rough-In (MEP Rough-In group)
            'elec-rough': 8,     // Electrical Rough-In (MEP Rough-In group)
            'plumb-rough': 8,    // Plumbing Rough-In (MEP Rough-In group)
            'exteriors': 9,      // Exteriors
            'drywall-bp': 10,    // Drywall - BackPanel
            'drywall-ttp': 18,   // Drywall - Tape/Texture/Paint
            'roofing': 15,       // Roofing
            'pre-finish': 24,    // Pre-Finish
            'mech-trim': 25,     // Mechanical Trim (MEP Trim group)
            'elec-trim': 25,     // Electrical Trim (MEP Trim group)
            'plumb-trim': 25,    // Plumbing Trim (MEP Trim group)
            'final-finish': 27,  // Final Finish
            'sign-off': 29,      // Module Sign-Off
            'close-up': 36       // Close-Up
        };

        // Difficulty color mappings
        const difficultyColors = {
            sidewall: 'bg-orange-100 text-orange-800',
            stair: 'bg-purple-100 text-purple-800',
            hr3Wall: 'bg-red-100 text-red-800',
            short: 'bg-yellow-100 text-yellow-800',
            doubleStudio: 'bg-indigo-100 text-indigo-800',
            sawbox: 'bg-pink-100 text-pink-800'
        };

        const difficultyLabels = {
            sidewall: 'Sidewall',
            stair: 'Stair',
            hr3Wall: '3HR-Wall',
            short: 'Short',
            doubleStudio: 'Dbl Studio',
            sawbox: 'Sawbox'
        };

        // Default Employee Roster (from Autovol_Roster_Current.xlsx)
        const defaultEmployees = [];

// ===== PRODUCTION WEEK MANAGEMENT HOOK =====
const useProductionWeeks = () => {
    const [weeks, setWeeks] = useState(() => {
        const saved = localStorage.getItem('autovol_production_weeks');
        return saved ? JSON.parse(saved) : [];
    });
    
    const [staggerConfig, setStaggerConfig] = useState(() => {
        const saved = localStorage.getItem('autovol_station_staggers');
        return saved ? JSON.parse(saved) : { ...stationStaggers };
    });
    
    // Stagger change log - tracks all saved stagger configurations
    const [staggerChangeLog, setStaggerChangeLog] = useState(() => {
        const saved = localStorage.getItem('autovol_stagger_change_log');
        return saved ? JSON.parse(saved) : [];
    });
    
    // Track if there are unsaved changes
    const [hasUnsavedStaggerChanges, setHasUnsavedStaggerChanges] = useState(false);
    const [pendingStaggerChanges, setPendingStaggerChanges] = useState({});
    
    useEffect(() => {
        localStorage.setItem('autovol_production_weeks', JSON.stringify(weeks));
    }, [weeks]);
    
    useEffect(() => {
        localStorage.setItem('autovol_station_staggers', JSON.stringify(staggerConfig));
    }, [staggerConfig]);
    
    useEffect(() => {
        localStorage.setItem('autovol_stagger_change_log', JSON.stringify(staggerChangeLog));
    }, [staggerChangeLog]);
    
    const addWeek = (weekData) => {
        const newWeek = { ...weekData, id: `week-${Date.now()}`, createdAt: new Date().toISOString() };
        setWeeks(prev => [...prev, newWeek]);
        return newWeek;
    };
    
    const updateWeek = (weekId, updates) => {
        setWeeks(prev => prev.map(w => w.id === weekId ? { ...w, ...updates } : w));
    };
    
    const deleteWeek = (weekId) => {
        setWeeks(prev => prev.filter(w => w.id !== weekId));
    };
    
    // Update stagger value (marks as pending until saved)
    const updateStagger = (stationId, value) => {
        const newValue = parseInt(value) || 0;
        setPendingStaggerChanges(prev => ({ ...prev, [stationId]: newValue }));
        setStaggerConfig(prev => ({ ...prev, [stationId]: newValue }));
        setHasUnsavedStaggerChanges(true);
    };
    
    // Save stagger changes with description to change log
    const saveStaggerChanges = (description, userName = 'Unknown') => {
        if (!hasUnsavedStaggerChanges) return;
        
        const logEntry = {
            id: `stagger-${Date.now()}`,
            timestamp: new Date().toISOString(),
            description: description || 'No description provided',
            changedBy: userName,
            changes: { ...pendingStaggerChanges },
            fullConfig: { ...staggerConfig }
        };
        
        setStaggerChangeLog(prev => [logEntry, ...prev]);
        setPendingStaggerChanges({});
        setHasUnsavedStaggerChanges(false);
        
        return logEntry;
    };
    
    // Revert to a previous stagger configuration
    const revertToStaggerConfig = (logEntryId) => {
        const entry = staggerChangeLog.find(e => e.id === logEntryId);
        if (entry && entry.fullConfig) {
            setStaggerConfig({ ...entry.fullConfig });
            setPendingStaggerChanges({});
            setHasUnsavedStaggerChanges(false);
        }
    };
    
    // Reset to default staggers
    const resetToDefaultStaggers = () => {
        setStaggerConfig({ ...stationStaggers });
        setPendingStaggerChanges({});
        setHasUnsavedStaggerChanges(true);
    };
    
    const validateWeek = (weekData, excludeId = null) => {
        const start = new Date(weekData.weekStart);
        const end = new Date(weekData.weekEnd);
        if (end <= start) return { valid: false, error: 'End date must be after start date' };
        const overlap = weeks.find(w => {
            if (w.id === excludeId) return false;
            const wStart = new Date(w.weekStart);
            const wEnd = new Date(w.weekEnd);
            return (start <= wEnd && end >= wStart);
        });
        if (overlap) return { valid: false, error: 'Week overlaps with existing schedule' };
        return { valid: true };
    };
    
    const getCurrentWeek = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return weeks.find(week => {
            const start = new Date(week.weekStart);
            const end = new Date(week.weekEnd);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return today >= start && today <= end;
        });
    };
    
    const getWeekForDate = (date) => {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        return weeks.find(week => {
            const start = new Date(week.weekStart);
            const end = new Date(week.weekEnd);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return targetDate >= start && targetDate <= end;
        });
    };

    return { 
        weeks, 
        staggerConfig, 
        staggerChangeLog,
        hasUnsavedStaggerChanges,
        addWeek, 
        updateWeek, 
        deleteWeek, 
        updateStagger,
        saveStaggerChanges,
        revertToStaggerConfig,
        resetToDefaultStaggers,
        validateWeek,
        getCurrentWeek,
        getWeekForDate
    };
};

// ===== STAGGER CONFIG TAB COMPONENT =====
function StaggerConfigTab({ productionStages, stationGroups, staggerConfig, staggerChangeLog, hasUnsavedStaggerChanges, updateStagger, saveStaggerChanges, revertToStaggerConfig, resetToDefaultStaggers, currentUser, isAdmin }) {
    // Only admins can edit staggers
    const [changeDescription, setChangeDescription] = useState('');
    const [showChangeLog, setShowChangeLog] = useState(false);
    const [confirmRevert, setConfirmRevert] = useState(null);

    const handleSaveChanges = () => {
        if (!changeDescription.trim()) { alert('Please enter a description for this change'); return; }
        const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unknown';
        saveStaggerChanges(changeDescription.trim(), userName);
        setChangeDescription('');
    };

    const handleRevert = (logEntryId) => { revertToStaggerConfig(logEntryId); setConfirmRevert(null); };

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-autovol-navy">Station Stagger Configuration</h3>
                    <p className="text-sm text-gray-600">Configure the offset between departments. A stagger of 5 means that station is working on modules 5 positions ahead of Automation.</p>
                    {!isAdmin && <p className="text-xs text-amber-600 mt-1">🔒 View only - Admin access required to modify staggers</p>}
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <button onClick={resetToDefaultStaggers} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">Reset to Default</button>
                    )}
                    <button onClick={() => setShowChangeLog(!showChangeLog)} className={`px-3 py-1.5 text-sm border rounded-lg flex items-center gap-1 ${showChangeLog ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50 text-gray-600'}`}>
                        📋 Change Log ({staggerChangeLog.length})
                    </button>
                </div>
            </div>

            {/* Unsaved Changes Banner */}
            {hasUnsavedStaggerChanges && isAdmin && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">⚠️ You have unsaved stagger changes</div>
                    <div className="flex items-center gap-2">
                        <input type="text" value={changeDescription} onChange={(e) => setChangeDescription(e.target.value)} placeholder="Describe why you're making this change..." className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm" />
                        <button onClick={handleSaveChanges} disabled={!changeDescription.trim()} className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed">Save Changes</button>
                    </div>
                </div>
            )}

            {/* Change Log Panel */}
            {showChangeLog && (
                <div className="bg-gray-50 border rounded-lg">
                    <div className="p-3 border-b bg-gray-100 flex items-center justify-between">
                        <h4 className="font-semibold text-gray-700">Stagger Change History</h4>
                        <button onClick={() => setShowChangeLog(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {staggerChangeLog.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">No changes recorded yet.</div>
                        ) : (
                            <div className="divide-y">
                                {staggerChangeLog.map((entry, idx) => (
                                    <div key={entry.id} className="p-3 hover:bg-white">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-medium text-gray-800">{entry.description}</span>
                                                    {idx === 0 && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">Current</span>}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">{formatDate(entry.timestamp)} • by {entry.changedBy}</div>
                                                {Object.keys(entry.changes || {}).length > 0 && (
                                                    <div className="mt-1 text-xs text-gray-600">
                                                        Changed: {Object.entries(entry.changes).map(([station, value]) => (
                                                            <span key={station} className="inline-block bg-gray-200 px-1.5 py-0.5 rounded mr-1 mb-1">{station}: {value}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {idx !== 0 && isAdmin && (
                                                confirmRevert === entry.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => handleRevert(entry.id)} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">Confirm</button>
                                                        <button onClick={() => setConfirmRevert(null)} className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded">Cancel</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setConfirmRevert(entry.id)} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100">Revert</button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Stagger Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Station</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Dept Code</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Stagger Offset</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Group</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productionStages.map((station, idx) => (
                            <tr key={station.id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="py-2 px-3">{station.name}</td>
                                <td className="py-2 px-3 font-mono">{station.dept}</td>
                                <td className="py-2 px-3">
                                    <input type="number" min="0" max="50" value={staggerConfig[station.id] || 0} onChange={(e) => isAdmin && updateStagger(station.id, e.target.value)} disabled={!isAdmin} className={`w-20 px-2 py-1 border rounded text-center font-mono ${!isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
                                </td>
                                <td className="py-2 px-3">
                                    {station.group && <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">{stationGroups[station.group]?.name || station.group}</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Info Tip */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <strong>Tip:</strong> Stagger values determine which module appears at each station on the Weekly Board. <strong>Remember to save your changes with a description!</strong>
            </div>
        </div>
    );
}

function DashboardRoleManager({ auth }) {
    const { 
        roles, 
        addRole, 
        updateRole, 
        deleteRole, 
        setDefaultRole, 
        moveTab, 
        toggleTab, 
        toggleCapability
    } = auth.dashboardRoles;
    
    const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingRole, setDeletingRole] = useState(null);

    const selectedRole = roles.find(r => r.id === selectedRoleId);

    // Handlers
    const handleCreateRole = () => {
        setEditingRole(null);
        setShowEditModal(true);
    };

    const handleEditRole = () => {
        setEditingRole(selectedRole);
        setShowEditModal(true);
    };

    const handleSaveRole = (roleData) => {
        if (editingRole) {
            updateRole(editingRole.id, roleData);
            if (roleData.isDefault) {
                setDefaultRole(editingRole.id);
            }
        } else {
            const newRole = addRole(roleData);
            setSelectedRoleId(newRole.id);
            if (roleData.isDefault) {
                setDefaultRole(newRole.id);
            }
        }
        setShowEditModal(false);
        setEditingRole(null);
    };

    const handleDeleteRole = () => {
        setDeletingRole(selectedRole);
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        const result = deleteRole(deletingRole.id);
        if (result.success) {
            setShowDeleteModal(false);
            setDeletingRole(null);
            setSelectedRoleId(roles[0]?.id);
        }
    };

    const canDeleteRole = (role) => {
        if (role.isProtected) {
            return { canDelete: false, reason: 'This is a protected system role.' };
        }
        return { canDelete: true };
    };

    const deletionCheck = selectedRole ? canDeleteRole(selectedRole) : { canDelete: true };

    // Emergency recovery function
    const handleEmergencyRecovery = () => {
        if (confirm('This will restore Trevor Fletcher as Admin. Continue?')) {
            const updatedUsers = auth.users.map(u => {
                if (u.email === 'trevor@autovol.com') {
                    return { ...u, dashboardRole: 'admin', isProtected: true };
                }
                return u;
            });
            localStorage.setItem('autovol_users', JSON.stringify(updatedUsers));
            alert('✅ Trevor Fletcher restored as Admin. Please refresh the page.');
            window.location.reload();
        }
    };

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ 
                background: 'white', 
                padding: '20px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--autovol-navy)', marginBottom: '5px' }}>
                    🎭 Dashboard Role Manager
                </h1>
                <p style={{ fontSize: '14px', color: '#6B7280' }}>
                    Configure role-based views and capabilities - Manage who sees what
                </p>
            </div>

            {/* Safety Alert */}
            <div style={{ 
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '13px',
                background: '#D1FAE5',
                color: '#065F46',
                border: '2px solid #6EE7B7'
            }}>
                <strong>✅ Protected System:</strong> Trevor Fletcher's admin access is permanently protected.
            </div>

            {/* Main Grid */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '300px 1fr 350px', 
                gap: '20px',
                minHeight: '600px'
            }}>
                {/* LEFT PANEL - Role List */}
                <div style={{ 
                    background: 'white', 
                    borderRadius: '8px', 
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    overflowY: 'auto'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h2 style={{ fontSize: '18px', color: 'var(--autovol-navy)' }}>Roles</h2>
                        <button 
                            onClick={handleCreateRole}
                            className="btn-primary"
                            style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '14px' }}
                        >
                            + New
                        </button>
                    </div>

                    {roles.map(role => (
                        <div
                            key={role.id}
                            onClick={() => setSelectedRoleId(role.id)}
                            style={{
                                padding: '12px',
                                border: `2px solid ${selectedRoleId === role.id ? 'var(--autovol-red)' : '#E5E7EB'}`,
                                borderRadius: '6px',
                                marginBottom: '8px',
                                cursor: 'pointer',
                                background: selectedRoleId === role.id ? '#FEF2F2' : (role.isProtected ? '#F0FDF4' : 'white'),
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: '600', color: 'var(--autovol-navy)', fontSize: '14px' }}>
                                    {role.isProtected && '🛡️ '}
                                    {role.name}
                                </div>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {role.isDefault && (
                                        <span style={{
                                            background: '#10B981',
                                            color: 'white',
                                            fontSize: '10px',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontWeight: '600'
                                        }}>DEFAULT</span>
                                    )}
                                    {role.capabilities?.canAccessAdmin && (
                                        <span style={{
                                            background: 'var(--autovol-red)',
                                            color: 'white',
                                            fontSize: '10px',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontWeight: '600'
                                        }}>ADMIN</span>
                                    )}
                                </div>
                            </div>
                            {role.description && (
                                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                                    {role.description}
                                </div>
                            )}
                            <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                                {role.tabs.length} tabs • {Object.values(role.capabilities || {}).filter(Boolean).length} capabilities
                            </div>
                        </div>
                    ))}

                    {/* Emergency Recovery */}
                    <div style={{
                        background: '#FEE2E2',
                        border: '2px solid #EF4444',
                        borderRadius: '8px',
                        padding: '15px',
                        marginTop: '20px'
                    }}>
                        <div style={{
                            color: '#991B1B',
                            fontWeight: '600',
                            fontSize: '14px',
                            marginBottom: '8px'
                        }}>
                            🚨 Emergency Recovery
                        </div>
                        <div style={{ fontSize: '12px', color: '#7F1D1D', marginBottom: '10px' }}>
                            Restore admin access if locked out
                        </div>
                        <button 
                            onClick={handleEmergencyRecovery}
                            style={{
                                background: '#EF4444',
                                color: 'white',
                                border: 'none',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            Restore Trevor's Admin
                        </button>
                    </div>
                </div>

                {/* CENTER PANEL - Configuration */}
                <div style={{ 
                    background: 'white', 
                    borderRadius: '8px', 
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    overflowY: 'auto'
                }}>
                    {selectedRole ? (
                        <>
                            {/* Role Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '20px',
                                paddingBottom: '15px',
                                borderBottom: '2px solid #E5E7EB'
                            }}>
                                <div>
                                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--autovol-navy)' }}>
                                        {selectedRole.isProtected && '🛡️ '}
                                        {selectedRole.name}
                                    </div>
                                    {selectedRole.description && (
                                        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                                            {selectedRole.description}
                                        </p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        onClick={handleEditRole}
                                        className="btn-secondary"
                                        style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '14px' }}
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={handleDeleteRole}
                                        disabled={!deletionCheck.canDelete}
                                        title={!deletionCheck.canDelete ? deletionCheck.reason : ''}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            cursor: deletionCheck.canDelete ? 'pointer' : 'not-allowed',
                                            border: 'none',
                                            background: '#EF4444',
                                            color: 'white',
                                            opacity: deletionCheck.canDelete ? 1 : 0.4
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>

                            {selectedRole.isProtected && (
                                <div style={{
                                    padding: '12px',
                                    borderRadius: '6px',
                                    marginBottom: '20px',
                                    fontSize: '13px',
                                    background: '#DBEAFE',
                                    color: '#1E40AF',
                                    border: '2px solid #93C5FD'
                                }}>
                                    <strong>🛡️ Protected Role:</strong> Cannot be deleted to ensure system integrity.
                                </div>
                            )}

                            {/* Default Role Toggle */}
                            <div style={{ marginBottom: '25px' }}>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--autovol-navy)', marginBottom: '12px' }}>
                                    Default Role Setting
                                </div>
                                <div 
                                    onClick={() => setDefaultRole(selectedRole.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '12px',
                                        background: '#F9FAFB',
                                        borderRadius: '6px',
                                        border: '2px solid #E5E7EB',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{
                                        width: '44px',
                                        height: '24px',
                                        background: selectedRole.isDefault ? '#10B981' : '#D1D5DB',
                                        borderRadius: '12px',
                                        position: 'relative',
                                        transition: 'background 0.2s'
                                    }}>
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            background: 'white',
                                            borderRadius: '50%',
                                            position: 'absolute',
                                            top: '2px',
                                            left: selectedRole.isDefault ? '22px' : '2px',
                                            transition: 'left 0.2s',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                        }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--autovol-navy)' }}>
                                            {selectedRole.isDefault ? 'This is the default role' : 'Set as default role'}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#6B7280' }}>
                                            New employees automatically receive this role
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Capabilities */}
                            <div style={{ marginBottom: '25px' }}>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--autovol-navy)', marginBottom: '12px' }}>
                                    Role Capabilities
                                </div>
                                <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
                                    Define what actions users with this role can perform
                                </p>

                                {[
                                    { key: 'canEdit', name: 'Can Edit Data', desc: 'Modify existing records' },
                                    { key: 'canCreate', name: 'Can Create Records', desc: 'Add new modules and projects' },
                                    { key: 'canDelete', name: 'Can Delete Data', desc: 'Remove records from system' },
                                    { key: 'canManageUsers', name: 'Can Manage Users', desc: 'Edit employee roles' },
                                    { key: 'canAccessAdmin', name: 'Can Access Admin', desc: 'Full system administration' },
                                    { key: 'canExportData', name: 'Can Export Data', desc: 'Download Excel reports' }
                                ].map(cap => (
                                    <div 
                                        key={cap.key}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '10px 12px',
                                            background: 'white',
                                            border: '2px solid #E5E7EB',
                                            borderRadius: '6px',
                                            marginBottom: '8px'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedRole.capabilities?.[cap.key] || false}
                                            onChange={() => toggleCapability(selectedRole.id, cap.key)}
                                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--autovol-navy)' }}>
                                                {cap.name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                                                {cap.desc}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Tab Visibility */}
                            <div style={{ marginBottom: '25px' }}>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--autovol-navy)', marginBottom: '12px' }}>
                                    Tab Visibility & Order
                                </div>
                                <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
                                    Check to enable, use arrows to reorder tabs
                                </p>

                                <div style={{ border: '2px solid #E5E7EB', borderRadius: '6px', overflow: 'hidden' }}>
                                    {ALL_AVAILABLE_TABS.map((tab) => {
                                        const isEnabled = selectedRole.tabs.includes(tab.id);
                                        const enabledIndex = selectedRole.tabs.indexOf(tab.id);
                                        const isFirst = enabledIndex === 0;
                                        const isLast = enabledIndex === selectedRole.tabs.length - 1;

                                        return (
                                            <div 
                                                key={tab.id} 
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '12px',
                                                    borderBottom: '1px solid #E5E7EB',
                                                    background: 'white',
                                                    opacity: isEnabled ? 1 : 0.5
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isEnabled}
                                                    onChange={() => toggleTab(selectedRole.id, tab.id)}
                                                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                                />
                                                
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--autovol-navy)' }}>
                                                        {tab.label}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                                                        {tab.description}
                                                    </div>
                                                </div>

                                                {isEnabled && (
                                                    <>
                                                        <div style={{
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            color: 'var(--autovol-navy)',
                                                            minWidth: '20px',
                                                            textAlign: 'center'
                                                        }}>
                                                            #{enabledIndex + 1}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            <button
                                                                onClick={() => moveTab(selectedRole.id, tab.id, 'up')}
                                                                disabled={isFirst}
                                                                style={{
                                                                    width: '28px',
                                                                    height: '28px',
                                                                    border: '1px solid #D1D5DB',
                                                                    background: 'white',
                                                                    borderRadius: '4px',
                                                                    cursor: isFirst ? 'not-allowed' : 'pointer',
                                                                    fontSize: '12px',
                                                                    opacity: isFirst ? 0.3 : 1
                                                                }}
                                                                title="Move up"
                                                            >
                                                                ▲
                                                            </button>
                                                            <button
                                                                onClick={() => moveTab(selectedRole.id, tab.id, 'down')}
                                                                disabled={isLast}
                                                                style={{
                                                                    width: '28px',
                                                                    height: '28px',
                                                                    border: '1px solid #D1D5DB',
                                                                    background: 'white',
                                                                    borderRadius: '4px',
                                                                    cursor: isLast ? 'not-allowed' : 'pointer',
                                                                    fontSize: '12px',
                                                                    opacity: isLast ? 0.3 : 1
                                                                }}
                                                                title="Move down"
                                                            >
                                                                ▼
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎭</div>
                            <p>Select a role to configure</p>
                        </div>
                    )}
                </div>

                {/* RIGHT PANEL - Preview */}
                <div style={{ 
                    background: 'white', 
                    borderRadius: '8px', 
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    overflowY: 'auto'
                }}>
                    {selectedRole ? (
                        <>
                            <div style={{ marginBottom: '15px' }}>
                                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--autovol-navy)', marginBottom: '5px' }}>
                                    Navigation Preview
                                </div>
                                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                                    How navigation appears for this role
                                </div>
                            </div>

                            <div style={{
                                background: '#F9FAFB',
                                border: '2px solid #E5E7EB',
                                borderRadius: '6px',
                                padding: '8px'
                            }}>
                                {selectedRole.tabs.length === 0 ? (
                                    <div style={{
                                        padding: '20px',
                                        textAlign: 'center',
                                        color: '#9CA3AF',
                                        fontSize: '13px'
                                    }}>
                                        No tabs enabled
                                    </div>
                                ) : (
                                    selectedRole.tabs.map((tabId, index) => {
                                        const tab = ALL_AVAILABLE_TABS.find(t => t.id === tabId);
                                        if (!tab) return null;

                                        return (
                                            <div
                                                key={tabId}
                                                style={{
                                                    padding: '8px 12px',
                                                    marginBottom: '4px',
                                                    borderRadius: '4px',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: index === 0 ? 'var(--autovol-red)' : 'white',
                                                    color: index === 0 ? 'white' : 'var(--autovol-navy)',
                                                    border: index === 0 ? 'none' : '1px solid #E5E7EB'
                                                }}
                                            >
                                                <span>{tab.icon}</span>
                                                <span>{tab.label.replace(tab.icon + ' ', '')}</span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Stats */}
                            <div style={{
                                marginTop: '15px',
                                padding: '12px',
                                background: '#F9FAFB',
                                borderRadius: '6px',
                                border: '2px solid #E5E7EB'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '13px',
                                    marginBottom: '8px',
                                    color: 'var(--autovol-navy)'
                                }}>
                                    <span>Enabled Tabs:</span>
                                    <span style={{ fontWeight: '600' }}>
                                        {selectedRole.tabs.length} / {ALL_AVAILABLE_TABS.length}
                                    </span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '13px',
                                    marginBottom: '8px',
                                    color: 'var(--autovol-navy)'
                                }}>
                                    <span>Default Role:</span>
                                    <span style={{ fontWeight: '600' }}>
                                        {selectedRole.isDefault ? 'Yes' : 'No'}
                                    </span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '13px',
                                    color: 'var(--autovol-navy)'
                                }}>
                                    <span>Protected:</span>
                                    <span style={{ fontWeight: '600' }}>
                                        {selectedRole.isProtected ? '🛡️ Yes' : 'No'}
                                    </span>
                                </div>
                            </div>

                            {/* Capabilities Preview */}
                            <div style={{ marginTop: '15px' }}>
                                <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '10px' }}>
                                    Capabilities:
                                </div>
                                {[
                                    { key: 'canEdit', icon: '✏️', label: 'Can Edit Data' },
                                    { key: 'canCreate', icon: '➕', label: 'Can Create Records' },
                                    { key: 'canDelete', icon: '🗑️', label: 'Can Delete Data' },
                                    { key: 'canManageUsers', icon: '👥', label: 'Can Manage Users' },
                                    { key: 'canAccessAdmin', icon: '⚙️', label: 'Can Access Admin' },
                                    { key: 'canExportData', icon: '📥', label: 'Can Export Data' }
                                ].filter(cap => selectedRole.capabilities?.[cap.key]).map(cap => (
                                    <div key={cap.key} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '12px',
                                        color: 'var(--autovol-navy)',
                                        marginBottom: '6px'
                                    }}>
                                        <span style={{ fontSize: '14px' }}>{cap.icon}</span>
                                        <span>{cap.label}</span>
                                    </div>
                                ))}
                                {Object.values(selectedRole.capabilities || {}).every(v => !v) && (
                                    <div style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic' }}>
                                        View-only access
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>
                            <div style={{ fontSize: '48px', marginBottom: '15px' }}>👁️</div>
                            <p>Preview will appear here</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showEditModal && (
                <RoleEditModal
                    role={editingRole}
                    onSave={handleSaveRole}
                    onCancel={() => {
                        setShowEditModal(false);
                        setEditingRole(null);
                    }}
                />
            )}

            {showDeleteModal && (
                <DeleteConfirmModal
                    role={deletingRole}
                    onConfirm={confirmDelete}
                    onCancel={() => {
                        setShowDeleteModal(false);
                        setDeletingRole(null);
                    }}
                    cannotDelete={!deletionCheck.canDelete}
                    reason={deletionCheck.reason}
                />
            )}
        </div>
    );
}

// Role Edit Modal Component
function RoleEditModal({ role, onSave, onCancel }) {
    const [formData, setFormData] = useState({
        name: role?.name || '',
        description: role?.description || '',
        isDefault: role?.isDefault || false
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div 
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
            }}
            onClick={onCancel}
        >
            <div 
                style={{
                    background: 'white',
                    borderRadius: '8px',
                    maxWidth: '500px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ padding: '20px', borderBottom: '2px solid #E5E7EB' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--autovol-navy)' }}>
                        {role ? 'Edit Dashboard Role' : 'Create Dashboard Role'}
                    </div>
                </div>
                <form onSubmit={handleSubmit}>
                    <div style={{ padding: '20px' }}>
                        {!role && (
                            <div style={{
                                padding: '12px',
                                borderRadius: '6px',
                                marginBottom: '15px',
                                fontSize: '13px',
                                background: '#DBEAFE',
                                color: '#1E40AF',
                                border: '2px solid #93C5FD'
                            }}>
                                After creating, you'll configure tabs and capabilities
                            </div>
                        )}
                        
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                                Role Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Department Supervisor"
                                required
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '2px solid #E5E7EB',
                                    borderRadius: '6px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Brief description of this role's purpose"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    border: '2px solid #E5E7EB',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    minHeight: '60px',
                                    resize: 'vertical'
                                }}
                            />
                            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                                Help users understand who this role is for
                            </div>
                        </div>

                        <div 
                            onClick={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px',
                                background: '#F9FAFB',
                                borderRadius: '6px',
                                border: '2px solid #E5E7EB',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{
                                width: '44px',
                                height: '24px',
                                background: formData.isDefault ? '#10B981' : '#D1D5DB',
                                borderRadius: '12px',
                                position: 'relative',
                                transition: 'background 0.2s'
                            }}>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    background: 'white',
                                    borderRadius: '50%',
                                    position: 'absolute',
                                    top: '2px',
                                    left: formData.isDefault ? '22px' : '2px',
                                    transition: 'left 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--autovol-navy)' }}>
                                    Set as Default Role
                                </div>
                                <div style={{ fontSize: '11px', color: '#6B7280' }}>
                                    New employees automatically get this role
                                </div>
                            </div>
                        </div>
                    </div>
                    <div style={{ padding: '20px', borderTop: '2px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button 
                            type="button" 
                            onClick={onCancel}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                border: 'none',
                                background: '#E5E7EB',
                                color: 'var(--autovol-navy)'
                            }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="btn-primary"
                            style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '14px' }}
                        >
                            {role ? 'Save Changes' : 'Create Role'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Delete Confirmation Modal
function DeleteConfirmModal({ role, onConfirm, onCancel, cannotDelete, reason }) {
    const [confirmText, setConfirmText] = useState('');

    return (
        <div 
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
            }}
            onClick={onCancel}
        >
            <div 
                style={{
                    background: 'white',
                    borderRadius: '8px',
                    maxWidth: '500px',
                    width: '100%',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ padding: '20px', borderBottom: '2px solid #E5E7EB' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--autovol-navy)' }}>
                        Delete Dashboard Role
                    </div>
                </div>
                <div style={{ padding: '20px' }}>
                    {cannotDelete ? (
                        <div style={{
                            padding: '12px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            background: '#FEE2E2',
                            color: '#991B1B',
                            border: '2px solid #FCA5A5'
                        }}>
                            <strong>Cannot Delete Role:</strong> {reason}
                        </div>
                    ) : (
                        <>
                            <div style={{
                                padding: '12px',
                                borderRadius: '6px',
                                marginBottom: '15px',
                                fontSize: '13px',
                                background: '#FEF3C7',
                                color: '#92400E',
                                border: '2px solid #FCD34D'
                            }}>
                                <strong>Warning:</strong> This cannot be undone. Users assigned this role will need reassignment.
                            </div>
                            
                            <p style={{ marginBottom: '15px', fontSize: '14px', color: 'var(--autovol-navy)' }}>
                                Delete: <strong>{role.name}</strong>
                            </p>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                                    Type "<strong>DELETE</strong>" to confirm
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={e => setConfirmText(e.target.value)}
                                    placeholder="DELETE"
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: '2px solid #E5E7EB',
                                        borderRadius: '6px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
                <div style={{ padding: '20px', borderTop: '2px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button 
                        onClick={onCancel}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            border: 'none',
                            background: '#E5E7EB',
                            color: 'var(--autovol-navy)'
                        }}
                    >
                        {cannotDelete ? 'Close' : 'Cancel'}
                    </button>
                    {!cannotDelete && (
                        <button 
                            onClick={onConfirm}
                            disabled={confirmText !== 'DELETE'}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: confirmText === 'DELETE' ? 'pointer' : 'not-allowed',
                                border: 'none',
                                background: '#EF4444',
                                color: 'white',
                                opacity: confirmText === 'DELETE' ? 1 : 0.4
                            }}
                        >
                            Delete Role
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// END DASHBOARD ROLE MANAGER COMPONENT
// ============================================================================

        // Main Dashboard Component (requires authentication)
        function Dashboard({ auth }) {
            // Use URL-based navigation if feature flag is enabled, otherwise use local state
            const useUrlNav = isFeatureEnabled('enableUrlNavigation', auth.currentUser?.email) && window.useUrlNavigation;
            const [urlActiveTab, urlSetActiveTab] = useUrlNav ? window.useUrlNavigation('production') : [null, null];
            const [localActiveTab, setLocalActiveTab] = useState('production');
            
            // Use URL navigation if available, otherwise fall back to local state
            const activeTab = useUrlNav ? urlActiveTab : localActiveTab;
            const setActiveTab = useUrlNav ? urlSetActiveTab : setLocalActiveTab;
            
            // Use Firestore hooks for projects (with localStorage fallback)
            const { 
                projects, 
                setProjects, 
                loading: projectsLoading, 
                synced: projectsSynced 
            } = window.FirestoreHooks?.useProjects() || {
                projects: JSON.parse(localStorage.getItem('autovol_projects') || '[]'),
                setProjects: (p) => localStorage.setItem('autovol_projects', JSON.stringify(p)),
                loading: false,
                synced: false
            };
            const [trashedProjects, setTrashedProjects] = useState(() => {
                const saved = localStorage.getItem('autovol_trash_projects');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // Auto-purge items older than 90 days
                    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
                    return parsed.filter(p => p.deletedAt > ninetyDaysAgo);
                }
                return [];
            });
            const [trashedEmployees, setTrashedEmployees] = useState(() => {
                const saved = localStorage.getItem('autovol_trash_employees');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // Auto-purge items older than 90 days
                    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
                    return parsed.filter(e => e.deletedAt > ninetyDaysAgo);
                }
                return [];
            });
            const [showDataManagement, setShowDataManagement] = useState(false);
            const [selectedProject, setSelectedProject] = useState(null);
            const [showProjectModal, setShowProjectModal] = useState(false);
            const [showImportModal, setShowImportModal] = useState(false);
            const [viewMode, setViewMode] = useState('grid'); // grid, list
            const [searchTerm, setSearchTerm] = useState('');
            const [stageFilter, setStageFilter] = useState('all');
            
            // Theme state (dark mode) - defaults to light mode
            const [darkMode, setDarkMode] = useState(() => {
                const saved = localStorage.getItem('moda_theme');
                if (saved) return saved === 'dark';
                // Default to light mode instead of system preference
                return false;
            });
            
            // Keyboard shortcuts help modal
            const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
            
            // Apply theme to document
            useEffect(() => {
                document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
                localStorage.setItem('moda_theme', darkMode ? 'dark' : 'light');
            }, [darkMode]);
            
            // Keyboard shortcuts
            useEffect(() => {
                const handleKeyDown = (e) => {
                    // Don't trigger shortcuts when typing in inputs
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                        return;
                    }
                    
                    const key = e.key.toLowerCase();
                    const ctrl = e.ctrlKey || e.metaKey;
                    
                    // Ctrl+D: Toggle dark mode
                    if (ctrl && key === 'd') {
                        e.preventDefault();
                        setDarkMode(prev => !prev);
                        return;
                    }
                    
                    // ?: Show shortcuts help
                    if (e.key === '?' || (e.shiftKey && key === '/')) {
                        e.preventDefault();
                        setShowShortcutsHelp(true);
                        return;
                    }
                    
                    // Escape: Close modals
                    if (key === 'escape') {
                        setShowShortcutsHelp(false);
                        setShowProjectModal(false);
                        setShowImportModal(false);
                        setShowDataManagement(false);
                        return;
                    }
                    
                    // Tab navigation with number keys (1-9)
                    if (!ctrl && !e.altKey && /^[1-9]$/.test(key)) {
                        const tabIndex = parseInt(key) - 1;
                        const visibleTabs = [
                            'executive', 'production', 'projects', 'people', 'qa', 
                            'transport', 'equipment', 'precon', 'onsite', 'engineering', 
                            'automation', 'tracker'
                        ].filter(tab => auth.visibleTabs.includes(tab));
                        
                        if (tabIndex < visibleTabs.length) {
                            e.preventDefault();
                            setActiveTab(visibleTabs[tabIndex]);
                            setSelectedProject(null);
                        }
                        return;
                    }
                    
                    // Ctrl+E: Export data (admin only)
                    if (ctrl && key === 'e' && auth.isAdmin) {
                        e.preventDefault();
                        exportData();
                        return;
                    }
                    
                    // Ctrl+F: Focus search (if on projects tab)
                    if (ctrl && key === 'f' && activeTab === 'projects') {
                        e.preventDefault();
                        const searchInput = document.querySelector('input[placeholder*="Search"]');
                        if (searchInput) searchInput.focus();
                        return;
                    }
                };
                
                document.addEventListener('keydown', handleKeyDown);
                return () => document.removeEventListener('keydown', handleKeyDown);
            }, [activeTab, auth.visibleTabs, auth.isAdmin]);
            
            // People Module State
            const [employees, setEmployees] = useState(() => {
                const saved = localStorage.getItem('autovol_employees');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    // Use defaults if saved is empty array
                    return parsed.length > 0 ? parsed : defaultEmployees;
                }
                return defaultEmployees;
            });
            const [departments, setDepartments] = useState(() => {
                const saved = localStorage.getItem('autovol_departments');
                return saved ? JSON.parse(saved) : productionStages.map(s => ({
                    id: s.id,
                    name: s.name,
                    supervisor: null,
                    employeeCount: 0
                }));
            });

            // Save to localStorage (only when not synced to Firestore)
            useEffect(() => {
                // Only save to localStorage if not using Firestore (Firestore handles its own persistence)
                if (!projectsSynced) {
                    localStorage.setItem('autovol_projects', JSON.stringify(projects));
                }
                // Sync to unified layer for any modules with close-up at 100%
                MODA_UNIFIED.migrateFromProjects();
            }, [projects, projectsSynced]);

            useEffect(() => {
                localStorage.setItem('autovol_trash_projects', JSON.stringify(trashedProjects));
            }, [trashedProjects]);

            useEffect(() => {
                localStorage.setItem('autovol_trash_employees', JSON.stringify(trashedEmployees));
            }, [trashedEmployees]);

            useEffect(() => {
                localStorage.setItem('autovol_employees', JSON.stringify(employees));
            }, [employees]);

            useEffect(() => {
                localStorage.setItem('autovol_departments', JSON.stringify(departments));
            }, [departments]);

            // Export all data as JSON
            const exportData = () => {
                const data = {
                    exportDate: new Date().toISOString(),
                    version: '1.0',
                    projects,
                    trashedProjects,
                    employees,
                    trashedEmployees,
                    departments
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `MODA_Backup_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            };

            // Import data from JSON file
            const importData = (file) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.projects) setProjects(data.projects);
                        if (data.trashedProjects) setTrashedProjects(data.trashedProjects);
                        if (data.employees) setEmployees(data.employees);
                        if (data.trashedEmployees) setTrashedEmployees(data.trashedEmployees);
                        if (data.departments) setDepartments(data.departments);
                        alert('Data restored successfully!');
                    } catch (err) {
                        alert('Error reading backup file: ' + err.message);
                    }
                };
                reader.readAsText(file);
            };

            // Calculate department status from ALL active projects
            const departmentStatus = useMemo(() => {
                const status = {};
                productionStages.forEach(stage => {
                    status[stage.id] = { inProgress: 0, completed: 0 };
                });

                projects.filter(p => p.status === 'Active').forEach(project => {
                    (project.modules || []).forEach(module => {
                        productionStages.forEach(stage => {
                            const progress = module.stageProgress?.[stage.id] || 0;
                            if (progress > 0 && progress < 100) {
                                status[stage.id].inProgress++;
                            } else if (progress === 100) {
                                status[stage.id].completed++;
                            }
                        });
                    });
                });

                return status;
            }, [projects]);

            // Active projects count
            const activeProjects = projects.filter(p => p.status === 'Active');
            const totalActiveModules = activeProjects.reduce((sum, p) => sum + (p.modules?.length || 0), 0);

            // Weekly schedule integration for Executive Dashboard
            const weeklySchedule = window.WeeklyBoardComponents?.useWeeklySchedule?.() || {
                scheduleSetup: { shift1: { monday: 5, tuesday: 5, wednesday: 5, thursday: 5 }, shift2: { friday: 0, saturday: 0, sunday: 0 } },
                completedWeeks: [],
                updateShiftSchedule: () => {},
                getShiftTotal: () => 0,
                getLineBalance: () => 21,
                completeWeek: () => {}
            };

            // Get current week for Executive Dashboard
            const getCurrentWeek = () => {
                const now = new Date();
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
                return Math.ceil((days + startOfYear.getDay() + 1) / 7);
            };
            const currentWeek = getCurrentWeek();

            return (
                <div className="min-h-screen" style={{backgroundColor: 'var(--autovol-gray-bg)'}}>
                    {/* Header */}
                    <header className="bg-white shadow-sm border-b mobile-header">
                        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {/* Mobile Navigation - Hamburger Menu */}
                                {window.MobileNavigation && (
                                    <window.MobileNavigation
                                        tabs={[
                                            {id: 'executive', label: 'Executive', icon: 'icon-executive'},
                                            {id: 'production', label: 'Production', icon: 'icon-production'},
                                            {id: 'projects', label: 'Projects', icon: 'icon-projects'},
                                            {id: 'people', label: 'People', icon: 'icon-people'},
                                            {id: 'qa', label: 'QA', icon: 'icon-qa'},
                                            {id: 'transport', label: 'Transport', icon: 'icon-transport'},
                                            {id: 'equipment', label: 'Tools & Equipment', icon: 'icon-equipment'},
                                            {id: 'precon', label: 'Precon', icon: 'icon-precon'},
                                            {id: 'tracker', label: 'Tracker', icon: 'icon-tracker'}
                                        ].filter(tab => auth.visibleTabs.includes(tab.id))}
                                        activeTab={activeTab}
                                        onTabChange={(tabId) => { setActiveTab(tabId); setSelectedProject(null); }}
                                        currentUser={auth.currentUser}
                                        onLogout={auth.logout}
                                    />
                                )}
                                {/* Autovol Logo */}
                                <img 
                                    src={AUTOVOL_LOGO}
                                    alt="Autovol Volumetric Modular" 
                                    className="mobile-logo"
                                    style={{height: '45px', width: 'auto'}}
                                />
                                <div className="border-l pl-4 hide-mobile" style={{borderColor: 'var(--autovol-teal)'}}>
                                    <h1 className="text-lg font-bold" style={{color: 'var(--autovol-navy)'}}>Modular Operations Dashboard</h1>
                                    <p className="text-xs" style={{color: 'var(--autovol-teal)'}}>MODA</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Theme Toggle */}
                                <button 
                                    onClick={() => setDarkMode(prev => !prev)}
                                    className="theme-toggle hide-mobile-tablet"
                                    title={`Switch to ${darkMode ? 'light' : 'dark'} mode (Ctrl+D)`}
                                >
                                    {darkMode ? '☀️' : '🌙'}
                                </button>
                                {/* Keyboard Shortcuts Help */}
                                <button 
                                    onClick={() => setShowShortcutsHelp(true)}
                                    className="theme-toggle hide-mobile-tablet"
                                    title="Keyboard shortcuts (?)"
                                >
                                    ⌨️
                                </button>
                                {auth.isAdmin && (
                                    <button 
                                        onClick={() => setShowDataManagement(true)}
                                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 transition flex items-center gap-1 hide-mobile-tablet"
                                        title="Data Management"
                                    >
                                        <span>⚙</span> Data
                                    </button>
                                )}
                                <div className="text-right cursor-pointer hover:opacity-80 transition mobile-user-profile" onClick={() => setShowUserProfile(true)} title="View your profile">
                                    <p className="text-sm font-medium hide-mobile" style={{color: 'var(--autovol-navy)'}}>{auth.currentUser?.name || 'User'}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${auth.isAdmin ? 'role-badge-admin' : 'role-badge-user'}`}>
                                        {auth.userRole?.name || auth.currentUser?.dashboardRole || 'User'}
                                    </span>
                                </div>
                                <button 
                                    onClick={auth.logout} 
                                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 transition hide-mobile-tablet"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* Navigation - Grouped or Flat based on feature flag */}
                    {isFeatureEnabled('enableNavGroups', auth.currentUser?.email) && window.NavigationGroups ? (
                        <window.NavigationGroups
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            visibleTabs={auth.visibleTabs}
                            canAccessAdmin={auth.canAccessAdmin}
                            setSelectedProject={setSelectedProject}
                        />
                    ) : (
                        /* Original flat navigation - hidden on mobile/tablet */
                        <nav className="bg-white border-b hide-mobile-tablet">
                            <div className="max-w-7xl mx-auto px-4">
                                <div className="flex gap-1">
                                    {/* HOME TAB - Feature flagged */}
                                    {isFeatureEnabled('enableDashboardHome', auth.currentUser?.email) && (
                                        <button
                                            onClick={() => { setActiveTab('home'); setSelectedProject(null); }}
                                            className={`tab-button px-4 py-3 text-sm font-medium transition rounded-t-lg ${activeTab === 'home' ? 'active' : ''}`}
                                            style={activeTab === 'home' 
                                                ? {backgroundColor: 'var(--autovol-teal)', color: 'white'} 
                                                : {color: 'var(--autovol-navy)'}}
                                        >
                                            <span className="tab-icon icon-home"></span>
                                            Home
                                        </button>
                                    )}
                                    {[
                                        {id: 'executive', label: 'Executive', icon: 'icon-executive'},
                                        {id: 'production', label: 'Production', icon: 'icon-production'},
                                        {id: 'projects', label: 'Projects', icon: 'icon-projects'},
                                        {id: 'people', label: 'People', icon: 'icon-people'},
                                        {id: 'qa', label: 'QA', icon: 'icon-qa'},
                                        {id: 'transport', label: 'Transport', icon: 'icon-transport'},
                                        {id: 'equipment', label: 'Tools & Equipment', icon: 'icon-equipment'},
                                        {id: 'precon', label: 'Precon', icon: 'icon-precon'},
                                        {id: 'onsite', label: 'On-Site', icon: 'icon-onsite'},
                                        {id: 'engineering', label: 'Engineering', icon: 'icon-engineering'},
                                        {id: 'automation', label: 'Automation', icon: 'icon-automation'},
                                        {id: 'tracker', label: 'Tracker', icon: 'icon-tracker'}
                                    ]
                                    .filter(tab => auth.visibleTabs.includes(tab.id)) // FILTER BASED ON ROLE
                                    .map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => { setActiveTab(tab.id); setSelectedProject(null); }}
                                            className={`tab-button px-4 py-3 text-sm font-medium transition rounded-t-lg ${activeTab === tab.id ? 'active' : ''}`}
                                            style={activeTab === tab.id 
                                                ? {backgroundColor: 'var(--autovol-red)', color: 'white'} 
                                                : {color: 'var(--autovol-navy)'}}
                                        >
                                            <span className={`tab-icon ${tab.icon}`}></span>
                                            {tab.label}
                                        </button>
                                    ))}
                                    {/* ADMIN TAB - ONLY VISIBLE WITH canAccessAdmin */}
                                    {auth.canAccessAdmin && (
                                        <button
                                            key="admin"
                                            onClick={() => { setActiveTab('admin'); setSelectedProject(null); }}
                                            className={`tab-button px-4 py-3 text-sm font-medium transition rounded-t-lg ml-auto ${activeTab === 'admin' ? 'active' : ''}`}
                                            style={activeTab === 'admin' 
                                                ? {backgroundColor: 'var(--autovol-navy)', color: 'white'} 
                                                : {backgroundColor: 'var(--autovol-gray-bg)', color: 'var(--autovol-navy)'}}
                                        >
                                            <span className="tab-icon icon-admin"></span>
                                            Admin
                                        </button>
                                    )}
                                </div>
                            </div>
                        </nav>
                    )}

                    {/* Main Content */}
                    <main className="max-w-7xl mx-auto px-4 py-6">
                        {/* Dashboard Home - Feature flagged */}
                        {activeTab === 'home' && isFeatureEnabled('enableDashboardHome', auth.currentUser?.email) && (
                            window.DashboardHome ? (
                                <window.DashboardHome
                                    projects={projects}
                                    employees={employees}
                                    auth={auth}
                                    onNavigate={(tab) => { setActiveTab(tab); setSelectedProject(null); }}
                                />
                            ) : (
                                <div className="text-center py-20">
                                    <div className="text-6xl mb-4">🏠</div>
                                    <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>Dashboard Home</h2>
                                    <p className="text-gray-600">Loading...</p>
                                </div>
                            )
                        )}

                        {activeTab === 'production' && !selectedProject && (
                            <ProductionDashboard 
                                projects={projects}
                                setProjects={setProjects}
                                departmentStatus={departmentStatus}
                                onSelectProject={setSelectedProject}
                                auth={auth}
                            />
                        )}
                        
                        {activeTab === 'projects' && !selectedProject && (
                            <ProjectsDirectory 
                                projects={projects}
                                setProjects={setProjects}
                                trashedProjects={trashedProjects}
                                setTrashedProjects={setTrashedProjects}
                                onSelectProject={setSelectedProject}
                                showNewProjectModal={() => setShowProjectModal(true)}
                                auth={auth}
                                exportData={exportData}
                                importData={importData}
                            />
                        )}

                        {activeTab === 'people' && (
                            window.PeopleModule ? (
                                <window.PeopleModule 
                                    employees={employees}
                                    setEmployees={setEmployees}
                                    departments={departments}
                                    setDepartments={setDepartments}
                                    productionStages={productionStages}
                                    isAdmin={auth.isAdmin}
                                />
                            ) : <div className="p-8 text-center text-gray-500">Loading People Module...</div>
                        )}

                        {/* Executive Dashboard */}
                        {activeTab === 'executive' && (
                            window.ExecutiveDashboard ? (
                                <window.ExecutiveDashboard
                                    projects={projects}
                                    completedWeeks={weeklySchedule.completedWeeks}
                                    scheduleSetup={weeklySchedule.scheduleSetup}
                                    currentWeek={currentWeek}
                                />
                            ) : (
                                <div className="text-center py-20">
                                    <div className="text-6xl mb-4">📊</div>
                                    <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>Executive Dashboard</h2>
                                    <p className="text-gray-600">Loading executive view...</p>
                                </div>
                            )
                        )}

                        {activeTab === 'qa' && (
                            window.QAModule ? (
                                <window.QAModule 
                                    projects={projects}
                                    employees={employees}
                                    currentUser={{ name: auth.currentUser?.name, role: auth.userRole?.name }}
                                    canEdit={auth.canEditTab('qa')}
                                />
                            ) : (
                                <div className="text-center py-20">
                                    <div className="text-6xl mb-4">
                                        <span className="icon-qa" style={{ width: '64px', height: '64px', display: 'inline-block' }}></span>
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>QA Module</h2>
                                    <p className="text-gray-600">Loading QA Module...</p>
                                </div>
                            )
                        )}

                        {activeTab === 'transport' && (
                            <div className="bg-white rounded-lg shadow-sm">
                                {window.TransportApp ? <window.TransportApp canEdit={auth.canEditTab('transport')} /> : <div className="p-8 text-center text-gray-500">Loading Transport Module...</div>}
                            </div>
                        )}

                        {activeTab === 'equipment' && (
                            <div className="bg-white rounded-lg shadow-sm">
                                {window.EquipmentApp ? <window.EquipmentApp /> : <div className="p-8 text-center text-gray-500">Loading Equipment Module...</div>}
                            </div>
                        )}

                        {activeTab === 'precon' && (
                            <PreconModule projects={projects} employees={employees} />
                        )}

                        {activeTab === 'onsite' && (
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">🏗️</div>
                                <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>On-Site Services Module</h2>
                                <p className="text-gray-600">Coming soon - Module integration pending</p>
                            </div>
                        )}

                        {activeTab === 'engineering' && (
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">📋</div>
                                <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>Engineering Module</h2>
                                <p className="text-gray-600">Coming soon - Module integration pending</p>
                            </div>
                        )}

                        {activeTab === 'automation' && (
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">🤖</div>
                                <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>Automation Module</h2>
                                <p className="text-gray-600">Coming soon - Module integration pending</p>
                            </div>
                        )}

                        {activeTab === 'tracker' && (
                            <ModuleTrackerPanel projects={projects} />
                        )}

                        
                        {activeTab === 'admin' && auth.canAccessAdmin && (
                            <>
                                <FirebaseUserManager auth={auth} />
                                <div className="mt-6">
                                    <DashboardRoleManager auth={auth} />
                                </div>
                            </>
                        )}

                        {activeTab === 'admin' && !auth.canAccessAdmin && (
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">🔒</div>
                                <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>Access Denied</h2>
                                <p className="text-gray-600">You don't have permission to access this area</p>
                            </div>
                        )}


                        {selectedProject && (
                            <ProjectDetail 
                                project={projects.find(p => p.id === selectedProject.id) || selectedProject}
                                projects={projects}
                                setProjects={setProjects}
                                onBack={() => setSelectedProject(null)}
                                viewMode={viewMode}
                                setViewMode={setViewMode}
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                stageFilter={stageFilter}
                                setStageFilter={setStageFilter}
                            />
                        )}
                    </main>

                    {/* New Project Modal */}
                    {showProjectModal && (
                        <NewProjectModal 
                            onClose={() => setShowProjectModal(false)}
                            onSave={(project) => {
                                setProjects([...projects, { ...project, id: Date.now(), modules: [], createdAt: new Date().toISOString() }]);
                                setShowProjectModal(false);
                            }}
                        />
                    )}

                    {/* Data Management Panel (Admin Only) */}
                    {showDataManagement && auth.isAdmin && (
                        <DataManagementPanel
                            onClose={() => setShowDataManagement(false)}
                            projects={projects}
                            setProjects={setProjects}
                            trashedProjects={trashedProjects}
                            setTrashedProjects={setTrashedProjects}
                            employees={employees}
                            setEmployees={setEmployees}
                            trashedEmployees={trashedEmployees}
                            setTrashedEmployees={setTrashedEmployees}
                            exportData={exportData}
                            importData={importData}
                        />
                    )}

                    {/* Keyboard Shortcuts Help Modal */}
                    {showShortcutsHelp && (
                        <div className="shortcuts-modal-overlay" onClick={() => setShowShortcutsHelp(false)}>
                            <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold" style={{color: 'var(--autovol-navy)'}}>Keyboard Shortcuts</h2>
                                    <button 
                                        onClick={() => setShowShortcutsHelp(false)}
                                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                    >
                                        ×
                                    </button>
                                </div>
                                
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Navigation</h3>
                                    <div className="shortcut-row">
                                        <span>Go to tab 1-9</span>
                                        <span className="shortcut-key"><kbd>1</kbd> - <kbd>9</kbd></span>
                                    </div>
                                    <div className="shortcut-row">
                                        <span>Close modal / Go back</span>
                                        <span className="shortcut-key"><kbd>Esc</kbd></span>
                                    </div>
                                </div>
                                
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Actions</h3>
                                    <div className="shortcut-row">
                                        <span>Toggle dark mode</span>
                                        <span className="shortcut-key"><kbd>Ctrl</kbd> + <kbd>D</kbd></span>
                                    </div>
                                    <div className="shortcut-row">
                                        <span>Focus search (Projects tab)</span>
                                        <span className="shortcut-key"><kbd>Ctrl</kbd> + <kbd>F</kbd></span>
                                    </div>
                                    {auth.isAdmin && (
                                        <div className="shortcut-row">
                                            <span>Export data backup</span>
                                            <span className="shortcut-key"><kbd>Ctrl</kbd> + <kbd>E</kbd></span>
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Help</h3>
                                    <div className="shortcut-row">
                                        <span>Show this help</span>
                                        <span className="shortcut-key"><kbd>?</kbd></span>
                                    </div>
                                </div>
                                
                                <div className="mt-6 pt-4 border-t text-center">
                                    <p className="text-xs text-gray-500">
                                        Press <kbd className="bg-gray-100 px-1 rounded">Esc</kbd> to close
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // ===== MODULE TRACKER PANEL =====
        // Unified lifecycle view showing all modules across all phases
        function ModuleTrackerPanel({ projects }) {
            const [unifiedModules, setUnifiedModules] = useState({});
            const [stats, setStats] = useState({ total: 0, byPhase: {} });
            const [selectedPhase, setSelectedPhase] = useState('all');
            const [selectedProject, setSelectedProject] = useState('all');
            const [searchTerm, setSearchTerm] = useState('');
            const [selectedModule, setSelectedModule] = useState(null);
            const [sortConfig, setSortConfig] = useState({ key: 'serial', direction: 'asc' });
            
            // Load and sync unified modules
            useEffect(() => {
                const loadUnified = () => {
                    MODA_UNIFIED.migrateFromProjects();
                    setUnifiedModules(MODA_UNIFIED.getAll());
                    setStats(MODA_UNIFIED.getStats());
                };
                loadUnified();
                
                // Re-sync when projects change
                const interval = setInterval(loadUnified, 5000);
                return () => clearInterval(interval);
            }, [projects]);
            
            // Handle column sort
            const handleSort = (key) => {
                setSortConfig(prev => ({
                    key,
                    direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
                }));
            };
            
            // Sort indicator
            const SortIndicator = ({ columnKey }) => {
                if (sortConfig.key !== columnKey) return <span className="text-gray-300 ml-1">⇅</span>;
                return sortConfig.direction === 'asc' 
                    ? <span className="ml-1">↑</span> 
                    : <span className="ml-1">↓</span>;
            };
            
            // Filter and sort modules
            const filteredModules = useMemo(() => {
                let mods = Object.values(unifiedModules);
                
                if (selectedPhase !== 'all') {
                    mods = mods.filter(m => m.currentPhase === selectedPhase);
                }
                if (selectedProject !== 'all') {
                    mods = mods.filter(m => m.projectId === selectedProject);
                }
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    mods = mods.filter(m => 
                        (m.serialNumber || '').toLowerCase().includes(term) ||
                        (m.projectName || '').toLowerCase().includes(term) ||
                        (m.specs?.blmHitch || '').toLowerCase().includes(term) ||
                        (m.specs?.blmRear || '').toLowerCase().includes(term)
                    );
                }
                
                // Apply sorting
                const phaseOrder = ['production', 'yard', 'transport', 'onsite', 'complete'];
                mods.sort((a, b) => {
                    let comparison = 0;
                    switch (sortConfig.key) {
                        case 'serial':
                            comparison = (a.serialNumber || '').localeCompare(b.serialNumber || '');
                            break;
                        case 'project':
                            comparison = (a.projectName || '').localeCompare(b.projectName || '');
                            break;
                        case 'blm':
                            const blmA = a.specs?.blmHitch || a.specs?.blmRear || '';
                            const blmB = b.specs?.blmHitch || b.specs?.blmRear || '';
                            comparison = blmA.localeCompare(blmB);
                            break;
                        case 'phase':
                            comparison = phaseOrder.indexOf(a.currentPhase) - phaseOrder.indexOf(b.currentPhase);
                            break;
                        case 'progress':
                            const progressA = Object.values(a.production?.stageProgress || {}).reduce((sum, v) => sum + v, 0);
                            const progressB = Object.values(b.production?.stageProgress || {}).reduce((sum, v) => sum + v, 0);
                            comparison = progressA - progressB;
                            break;
                        case 'updated':
                            comparison = new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0);
                            break;
                        default:
                            comparison = (a.production?.buildSequence || 0) - (b.production?.buildSequence || 0);
                    }
                    return sortConfig.direction === 'asc' ? comparison : -comparison;
                });
                
                return mods;
            }, [unifiedModules, selectedPhase, selectedProject, searchTerm, sortConfig]);
            
            const phaseConfig = {
                production: { label: 'Production', iconClass: 'icon-factory', color: '#3B82F6' },
                yard: { label: 'Yard', iconClass: 'icon-box', color: '#6366F1' },
                transport: { label: 'Transport', iconClass: 'icon-truck', color: '#F59E0B' },
                onsite: { label: 'On-Site', iconClass: 'icon-building', color: '#8B5CF6' },
                complete: { label: 'Complete', iconClass: 'icon-check-circle', color: '#10B981' }
            };
            
            const getPhaseColor = (phase) => phaseConfig[phase]?.color || '#6B7280';
            
            const getProductionProgress = (mod) => {
                const progress = mod.production?.stageProgress || {};
                const values = Object.values(progress);
                if (values.length === 0) return 0;
                return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
            };
            
            return (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{color: 'var(--autovol-navy)'}}>
                                <span className="icon-box inline-block w-6 h-6"></span>
                                Module Lifecycle Tracker
                            </h1>
                            <p className="text-gray-600 text-sm mt-1">
                                Unified view of all modules: Production → Yard → Transport → On-Site → Complete
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold" style={{color: 'var(--autovol-red)'}}>{stats.total}</div>
                            <div className="text-sm text-gray-500">Total Modules</div>
                        </div>
                    </div>
                    
                    {/* Phase Summary Cards - responsive grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
                        {Object.entries(phaseConfig).map(([phase, config]) => (
                            <button
                                key={phase}
                                onClick={() => setSelectedPhase(selectedPhase === phase ? 'all' : phase)}
                                className={`p-2 sm:p-4 rounded-lg border-2 transition-all ${
                                    selectedPhase === phase ? 'ring-2 ring-offset-2' : ''
                                }`}
                                style={{
                                    borderColor: config.color,
                                    backgroundColor: selectedPhase === phase ? config.color + '15' : 'white'
                                }}
                            >
                                <div className="flex justify-center mb-1 sm:mb-2">
                                    <span className={`${config.iconClass} inline-block w-6 h-6 sm:w-8 sm:h-8`} style={{filter: `brightness(0) saturate(100%) sepia(1) hue-rotate(${phase === 'production' ? '200' : phase === 'yard' ? '220' : phase === 'transport' ? '30' : phase === 'onsite' ? '250' : '120'}deg)`}}></span>
                                </div>
                                <div className="text-lg sm:text-2xl font-bold" style={{color: config.color}}>
                                    {stats.byPhase?.[phase] || 0}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-600">{config.label}</div>
                            </button>
                        ))}
                    </div>
                    
                    {/* Filters */}
                    <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search by serial, BLM, or project..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="px-4 py-2 border rounded-lg"
                        >
                            <option value="all">All Projects</option>
                            {projects.filter(p => p.status === 'Active').map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => {
                                setSelectedPhase('all');
                                setSelectedProject('all');
                                setSearchTerm('');
                            }}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            Clear Filters
                        </button>
                    </div>
                    
                    {/* Module List */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 border-b" style={{backgroundColor: 'var(--autovol-navy)'}}>
                            <h3 className="font-semibold text-white">
                                {filteredModules.length} Module{filteredModules.length !== 1 ? 's' : ''} 
                                {selectedPhase !== 'all' && ` in ${phaseConfig[selectedPhase]?.label}`}
                            </h3>
                        </div>
                        
                        {/* Scrollable table container for mobile */}
                        <div className="max-h-[500px] overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                            {filteredModules.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    No modules found matching your criteria
                                </div>
                            ) : (
                                <table className="w-full" style={{ minWidth: '700px' }}>
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('serial')}
                                            >
                                                Serial <SortIndicator columnKey="serial" />
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('project')}
                                            >
                                                Project <SortIndicator columnKey="project" />
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('blm')}
                                            >
                                                BLM <SortIndicator columnKey="blm" />
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('phase')}
                                            >
                                                Phase <SortIndicator columnKey="phase" />
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('progress')}
                                            >
                                                Progress <SortIndicator columnKey="progress" />
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('updated')}
                                            >
                                                Updated <SortIndicator columnKey="updated" />
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredModules.map(mod => {
                                            const progress = getProductionProgress(mod);
                                            const phaseInfo = phaseConfig[mod.currentPhase];
                                            return (
                                                <tr 
                                                    key={mod.id}
                                                    className="hover:bg-gray-50 cursor-pointer"
                                                    onClick={() => setSelectedModule(mod)}
                                                >
                                                    <td className="px-4 py-3">
                                                        <span className="font-mono font-semibold">{mod.serialNumber}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {mod.projectName || 'Unknown'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {mod.specs?.blmHitch || mod.specs?.blmRear ? (
                                                            <span className="font-mono text-xs">
                                                                {mod.specs?.blmHitch}{mod.specs?.blmHitch && mod.specs?.blmRear && ' / '}{mod.specs?.blmRear}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span 
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                                                            style={{backgroundColor: phaseInfo?.color + '20', color: phaseInfo?.color}}
                                                        >
                                                            <span className={`${phaseInfo?.iconClass} inline-block w-3 h-3`}></span>
                                                            {phaseInfo?.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full rounded-full transition-all"
                                                                    style={{
                                                                        width: `${progress}%`,
                                                                        backgroundColor: progress === 100 ? '#10B981' : 'var(--autovol-blue)'
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-gray-500">{progress}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-500">
                                                        {mod.updatedAt ? new Date(mod.updatedAt).toLocaleDateString() : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                    
                    {/* Module Detail Modal */}
                    {selectedModule && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="p-6 border-b sticky top-0 bg-white flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold" style={{color: 'var(--autovol-navy)'}}>
                                            Module {selectedModule.serialNumber}
                                        </h2>
                                        <p className="text-sm text-gray-500">{selectedModule.projectName}</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedModule(null)}
                                        className="p-2 hover:bg-gray-100 rounded-lg"
                                    >
                                        ✕
                                    </button>
                                </div>
                                
                                <div className="p-6 space-y-6">
                                    {/* Lifecycle Progress */}
                                    <div>
                                        <h3 className="font-semibold mb-3">Lifecycle Progress</h3>
                                        <div className="flex items-center gap-2">
                                            {Object.entries(phaseConfig).map(([phase, config], idx) => (
                                                <React.Fragment key={phase}>
                                                    <div 
                                                        className={`flex-1 p-2 sm:p-3 rounded-lg text-center ${
                                                            selectedModule.currentPhase === phase ? 'ring-2' : ''
                                                        }`}
                                                        style={{
                                                            backgroundColor: selectedModule.currentPhase === phase ? config.color + '20' : '#F3F4F6',
                                                            ringColor: config.color
                                                        }}
                                                    >
                                                        <div className="flex justify-center">
                                                            <span className={`${config.iconClass} inline-block w-5 h-5 sm:w-6 sm:h-6`}></span>
                                                        </div>
                                                        <div className="text-xs mt-1" style={{
                                                            color: selectedModule.currentPhase === phase ? config.color : '#6B7280'
                                                        }}>{config.label}</div>
                                                    </div>
                                                    {idx < 3 && (
                                                        <div className="text-gray-300">→'</div>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Specs */}
                                    <div>
                                        <h3 className="font-semibold mb-3">Specifications</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="p-3 bg-gray-50 rounded">
                                                <div className="text-gray-500">BLM Hitch</div>
                                                <div className="font-mono">{selectedModule.specs.blmHitch || '-'}</div>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded">
                                                <div className="text-gray-500">BLM Rear</div>
                                                <div className="font-mono">{selectedModule.specs.blmRear || '-'}</div>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded">
                                                <div className="text-gray-500">Unit Type</div>
                                                <div>{selectedModule.specs.unit || '-'}</div>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded">
                                                <div className="text-gray-500">Dimensions</div>
                                                <div>
                                                    {selectedModule.specs.width && selectedModule.specs.length 
                                                        ? `${selectedModule.specs.width}' x ${selectedModule.specs.length}'`
                                                        : '-'
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Difficulties */}
                                    {Object.values(selectedModule.specs.difficulties || {}).some(v => v) && (
                                        <div>
                                            <h3 className="font-semibold mb-3">Difficulties</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedModule.specs.difficulties?.sidewall && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">Sidewall</span>}
                                                {selectedModule.specs.difficulties?.stair && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">Stair</span>}
                                                {selectedModule.specs.difficulties?.hr3Wall && <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">3HR Wall</span>}
                                                {selectedModule.specs.difficulties?.short && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Short</span>}
                                                {selectedModule.specs.difficulties?.doubleStudio && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Double Studio</span>}
                                                {selectedModule.specs.difficulties?.sawbox && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Sawbox</span>}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Production Progress */}
                                    <div>
                                        <h3 className="font-semibold mb-3">Production Stages ({getProductionProgress(selectedModule)}% Complete)</h3>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            {Object.entries(selectedModule.production?.stageProgress || {}).map(([stage, progress]) => (
                                                <div key={stage} className="flex items-center gap-2">
                                                    <div className="w-full">
                                                        <div className="flex justify-between text-gray-500 mb-1">
                                                            <span>{stage}</span>
                                                            <span>{progress}%</span>
                                                        </div>
                                                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: `${progress}%`,
                                                                    backgroundColor: progress === 100 ? '#10B981' : progress > 0 ? '#3B82F6' : '#E5E7EB'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* History */}
                                    <div>
                                        <h3 className="font-semibold mb-3">History</h3>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {(selectedModule.history || []).slice().reverse().map((entry, idx) => (
                                                <div key={idx} className="flex gap-3 text-sm">
                                                    <div className="text-gray-400 text-xs w-32 flex-shrink-0">
                                                        {new Date(entry.timestamp).toLocaleString()}
                                                    </div>
                                                    <div className="text-gray-600">{entry.action}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // ============================================================================
        // ENGINEERING ISSUE CONSTANTS
        // ============================================================================
        const ENGINEERING_ISSUE_CATEGORIES = [
            { id: 'design-error', label: 'Design Error', icon: '📐', color: '#EF4444' },
            { id: 'dimension-issue', label: 'Dimension Issue', icon: '📏', color: '#F59E0B' },
            { id: 'material-spec', label: 'Material Specification', icon: '🔧', color: '#3B82F6' },
            { id: 'structural', label: 'Structural Concern', icon: '🏗️', color: '#8B5CF6' },
            { id: 'mep-conflict', label: 'MEP Conflict', icon: '⚡', color: '#EC4899' },
            { id: 'drawing-update', label: 'Drawing Update Needed', icon: '📋', color: '#06B6D4' },
            { id: 'rfi', label: 'RFI (Request for Information)', icon: '❓', color: '#10B981' },
            { id: 'change-order', label: 'Change Order Request', icon: '📝', color: '#6366F1' },
            { id: 'other', label: 'Other', icon: '📌', color: '#6B7280' }
        ];

        const URGENCY_LEVELS = [
            { id: 'critical', label: 'Critical - Production Stopped', color: '#DC2626', bgColor: '#FEE2E2' },
            { id: 'high', label: 'High - Blocking Progress', color: '#EA580C', bgColor: '#FFEDD5' },
            { id: 'medium', label: 'Medium - Needs Attention', color: '#CA8A04', bgColor: '#FEF9C3' },
            { id: 'low', label: 'Low - When Time Permits', color: '#16A34A', bgColor: '#DCFCE7' }
        ];

        const ENGINEERING_DEPARTMENTS = [
            'Automation', 'Auto Floor/Ceiling', 'Auto Walls', 'Mezzanine', 'Electrical',
            'Wall Set', 'Ceiling Set', 'Soffits', 'Mechanical', 'Plumbing', 'Exteriors',
            'Drywall', 'Roofing', 'Pre-Finish', 'Final Finish', 'Sign-Off', 'Close-Up',
            'QA', 'Transport', 'On-Site', 'General'
        ];

        // Production Dashboard Component - Vertical Department Workflow
        function ProductionDashboard({ projects, setProjects, departmentStatus, onSelectProject, auth }) {
            const activeProjects = projects.filter(p => p.status === 'Active');
            const [selectedProjectId, setSelectedProjectId] = useState(activeProjects[0]?.id || null);
            const [productionTab, setProductionTab] = useState('weekly-board');
            
            // Module Detail State (for Station Board "View Details" button)
            const [selectedModuleDetail, setSelectedModuleDetail] = useState(null);
            const [editMode, setEditMode] = useState(false);
            
            // Report Issue State
            const [showReportIssueModal, setShowReportIssueModal] = useState(false);
            const [reportIssueContext, setReportIssueContext] = useState(null);
            const [engineeringIssues, setEngineeringIssues] = useState(() => {
                const saved = localStorage.getItem('autovol_engineering_issues');
                return saved ? JSON.parse(saved) : [];
            });
            
            // Production weeks integration
            const { weeks, staggerConfig, staggerChangeLog, hasUnsavedStaggerChanges, addWeek, updateWeek, deleteWeek, updateStagger, saveStaggerChanges, revertToStaggerConfig, resetToDefaultStaggers, validateWeek, getCurrentWeek } = useProductionWeeks();
            const currentWeek = getCurrentWeek();
            
            // Weekly schedule integration (from WeeklyBoard.jsx)
            const weeklySchedule = window.WeeklyBoardComponents?.useWeeklySchedule?.() || {
                scheduleSetup: { shift1: { monday: 5, tuesday: 5, wednesday: 5, thursday: 5 }, shift2: { friday: 0, saturday: 0, sunday: 0 } },
                completedWeeks: [],
                updateShiftSchedule: () => {},
                getShiftTotal: () => 0,
                getLineBalance: () => 20,
                completeWeek: () => {},
                getCompletedWeek: () => null,
                getRecentWeeks: () => [],
                deleteCompletedWeek: () => {}
            };
            
            // Save engineering issues to localStorage
            useEffect(() => {
                localStorage.setItem('autovol_engineering_issues', JSON.stringify(engineeringIssues));
            }, [engineeringIssues]);
            
            // Open report issue modal with context
            const openReportIssue = (module, station) => {
                setReportIssueContext({ module, station, project: selectedProject });
                setShowReportIssueModal(true);
            };
            
            // Handle issue submission
            const handleSubmitIssue = (issueData) => {
                const newIssue = {
                    id: `ENG-${Date.now()}`,
                    ...issueData,
                    status: 'open',
                    createdAt: new Date().toISOString(),
                    history: [{
                        action: 'Issue Created',
                        timestamp: new Date().toISOString(),
                        by: issueData.reportedBy
                    }]
                };
                setEngineeringIssues(prev => [newIssue, ...prev]);
                setShowReportIssueModal(false);
                setReportIssueContext(null);
            };
            
            const selectedProject = projects.find(p => p.id === selectedProjectId);
            const modules = selectedProject?.modules || [];
            
            // Sort modules by build sequence (lower = further along)
            const sortedModules = [...modules].sort((a, b) => (a.buildSequence || 0) - (b.buildSequence || 0));
            
            // Categorize modules
            const categorizeModules = () => {
                const scheduled = []; // Not yet in Automation
                const inProduction = []; // Automation through Sign-Off
                const allComplete = []; // Completed Close-Up (all of them)
                
                sortedModules.forEach(module => {
                    const progress = module.stageProgress || {};
                    const autoProgress = Math.max(progress['auto-fc'] || 0, progress['auto-walls'] || 0);
                    const closeUpProgress = progress['close-up'] || 0;
                    
                    if (closeUpProgress === 100) {
                        // Include close-up completion timestamp if available
                        const completedAt = module.stationCompletedAt?.['close-up'] || 0;
                        allComplete.push({ ...module, completedAt });
                    } else if (autoProgress > 0) {
                        inProduction.push(module);
                    } else {
                        scheduled.push(module);
                    }
                });
                
                // Limit to 5 most recently completed (by completion timestamp)
                // For modules without timestamps (legacy), use build sequence as fallback
                const complete = allComplete
                    .sort((a, b) => {
                        if (a.completedAt && b.completedAt) return b.completedAt - a.completedAt;
                        if (a.completedAt && !b.completedAt) return -1;
                        if (!a.completedAt && b.completedAt) return 1;
                        return (b.buildSequence || 0) - (a.buildSequence || 0);
                    })
                    .slice(0, 5)
                    .reverse();  // Oldest at top, newest at bottom
                
                return { scheduled, inProduction, complete };
            };
            

            // Update module progress for a specific station
            const updateModuleProgress = (moduleId, stationId, newProgress) => {
                setProjects(prevProjects => prevProjects.map(project => {
                    if (project.id !== selectedProjectId) return project;
                    
                    return {
                        ...project,
                        modules: project.modules.map(module => {
                            if (module.id !== moduleId) return module;
                            
                            const updatedProgress = { ...module.stageProgress };
                            const wasComplete = updatedProgress[stationId] === 100;
                            updatedProgress[stationId] = newProgress;
                            
                            // Track completion timestamps per station
                            let stationCompletedAt = module.stationCompletedAt || {};
                            if (newProgress === 100 && !wasComplete) {
                                // Just marked complete - record timestamp
                                stationCompletedAt = { ...stationCompletedAt, [stationId]: Date.now() };
                            } else if (newProgress < 100 && wasComplete) {
                                // Reverted from complete - remove timestamp
                                stationCompletedAt = { ...stationCompletedAt };
                                delete stationCompletedAt[stationId];
                            }
                            
                            return { ...module, stageProgress: updatedProgress, stationCompletedAt };
                        })
                    };
                }));
            };
            
            const { scheduled, inProduction, complete } = categorizeModules();
            
         
            return (
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <h2 className="text-2xl font-bold text-autovol-navy">Production Dashboard</h2>
                        <div className="flex items-center gap-4">
                            {activeProjects.length > 0 && (
                                <select 
                                    value={selectedProjectId || ''}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="border rounded px-3 py-2 font-medium"
                                >
                                    {activeProjects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                    
                    {activeProjects.length === 0 ? (
                        <div className="bg-white rounded-lg shadow p-8 text-center">
                            <p className="text-gray-500">No active projects. Go to Projects tab to create one and set status to Active.</p>
                        </div>
                    ) : !selectedProject ? (
                        <div className="bg-white rounded-lg shadow p-8 text-center">
                            <p className="text-gray-500">Select a project to view production.</p>
                        </div>
                    ) : (
                        <>
                            {/* Sub-tabs */}
                            <div className="bg-white rounded-lg shadow">
                                <div className="border-b flex overflow-x-auto">
                                    {[
                                        { id: 'weekly-board', label: 'Weekly Board' },
                                        { id: 'module-status', label: 'Module Status' },
                                        { id: 'staggers', label: 'Station Stagger' },
                                        { id: 'schedule-setup', label: 'Schedule Setup' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setProductionTab(tab.id)}
                                            className={`px-6 py-3 text-sm font-medium transition ${
                                                productionTab === tab.id
                                                    ? 'text-autovol-teal border-b-2 border-autovol-teal'
                                                    : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                                
                                {/* Tab Content */}
                                <div className="p-4">
                                    
                                    
                                    {productionTab === 'module-status' && (
                                        <div className="space-y-6">
                                            {/* Scheduled */}
                                            <div>
                                                <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                                                    Scheduled ({scheduled.length})
                                                    <span className="font-normal text-sm text-gray-500">– Not yet in Automation</span>
                                                </h3>
                                                <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                                                    {scheduled.slice(0, 24).map(module => (
                                                        <div key={module.id} className="border rounded p-2 text-center bg-gray-50">
                                                            <div className="font-mono text-xs font-bold text-gray-600">
                                                                {module.serialNumber?.slice(-4)}
                                                            </div>
                                                            <div className="text-xs text-gray-400">#{module.buildSequence}</div>
                                                        </div>
                                                    ))}
                                                    {scheduled.length > 24 && (
                                                        <div className="border rounded p-2 text-center bg-gray-100 text-gray-500 text-xs">
                                                            +{scheduled.length - 24} more
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* In Production */}
                                            <div>
                                                <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-autovol-teal"></span>
                                                    In Production ({inProduction.length})
                                                    <span className="font-normal text-sm text-gray-500">– Automation through Sign-Off</span>
                                                </h3>
                                                <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                                                    {inProduction.map(module => (
                                                        <div key={module.id} className="border rounded p-2 text-center bg-teal-50 border-autovol-teal">
                                                            <div className="font-mono text-xs font-bold text-gray-800">
                                                                {module.serialNumber?.slice(-4)}
                                                            </div>
                                                            <div className="text-xs text-gray-500">#{module.buildSequence}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            {/* Complete */}
                                            <div>
                                                <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                                    Recently Complete ({complete.length})
                                                    <span className="font-normal text-sm text-gray-500">– Last 5 finished Close-Up</span>
                                                </h3>
                                                <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                                                    {complete.map(module => (
                                                        <div key={module.id} className="border rounded p-2 text-center bg-green-50 border-green-500">
                                                            <div className="font-mono text-xs font-bold text-gray-800">
                                                                {module.serialNumber?.slice(-4)}
                                                            </div>
                                                            <div className="text-xs text-gray-500">#{module.buildSequence}</div>
                                                        </div>
                                                    ))}
                                                    {complete.length === 0 && (
                                                        <div className="text-sm text-gray-400 col-span-full">No completed modules yet</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {productionTab === 'staggers' && (
                                        <StaggerConfigTab 
                                            productionStages={productionStages}
                                            stationGroups={stationGroups}
                                            staggerConfig={staggerConfig}
                                            staggerChangeLog={staggerChangeLog}
                                            hasUnsavedStaggerChanges={hasUnsavedStaggerChanges}
                                            updateStagger={updateStagger}
                                            saveStaggerChanges={saveStaggerChanges}
                                            revertToStaggerConfig={revertToStaggerConfig}
                                            resetToDefaultStaggers={resetToDefaultStaggers}
                                            currentUser={auth.currentUser}
                                            isAdmin={auth.isAdmin}
                                        />
                                    )}
                                    
                                    {productionTab === 'weekly-board' && (
                                        window.WeeklyBoardComponents?.WeeklyBoardTab ? (
                                            <window.WeeklyBoardComponents.WeeklyBoardTab
                                                projects={projects}
                                                productionStages={productionStages}
                                                staggerConfig={staggerConfig}
                                                currentWeek={currentWeek}
                                                weeks={weeks}
                                                scheduleSetup={weeklySchedule.scheduleSetup}
                                                getLineBalance={weeklySchedule.getLineBalance}
                                                completedWeeks={weeklySchedule.completedWeeks}
                                                completeWeek={weeklySchedule.completeWeek}
                                                addWeek={addWeek}
                                                onModuleClick={setSelectedModuleDetail}
                                                setProductionTab={setProductionTab}
                                                setProjects={setProjects}
                                                canEdit={auth.canEditTab('production')}
                                                onReportIssue={(module, station) => {
                                                    setReportIssueContext({ module, station, project: selectedProject });
                                                    setShowReportIssueModal(true);
                                                }}
                                            />
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                <p>Weekly Board component loading...</p>
                                                <p className="text-sm mt-2">If this persists, check that WeeklyBoard.jsx is loaded.</p>
                                            </div>
                                        )
                                    )}
                                    
                                    {productionTab === 'schedule-setup' && (
                                        window.WeeklyBoardComponents?.ScheduleSetupTab ? (
                                            <window.WeeklyBoardComponents.ScheduleSetupTab
                                                scheduleSetup={weeklySchedule.scheduleSetup}
                                                updateShiftSchedule={weeklySchedule.updateShiftSchedule}
                                                getShiftTotal={weeklySchedule.getShiftTotal}
                                                getLineBalance={weeklySchedule.getLineBalance}
                                                weeks={weeks}
                                                currentWeek={currentWeek}
                                                addWeek={addWeek}
                                                updateWeek={updateWeek}
                                                deleteWeek={deleteWeek}
                                                validateWeek={validateWeek}
                                                allModules={activeProjects.flatMap(p => (p.modules || []).map(m => ({ ...m, projectId: p.id, projectName: p.name })))}
                                                projects={projects}
                                                setProjects={setProjects}
                                                canEdit={auth.canEditTab('production')}
                                            />
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                <p>Schedule Setup component loading...</p>
                                                <p className="text-sm mt-2">If this persists, check that WeeklyBoard.jsx is loaded.</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                    
                    {/* Report Issue Modal */}
                    {showReportIssueModal && reportIssueContext && (
                        <ReportIssueModal
                            context={reportIssueContext}
                            onSubmit={handleSubmitIssue}
                            onClose={() => {
                                setShowReportIssueModal(false);
                                setReportIssueContext(null);
                            }}
                        />
                    )}
                    
                    {/* Module Detail Modal (for Station Board "View Details" button) */}
                    {selectedModuleDetail && (
                        <ModuleDetailModal 
                            module={selectedModuleDetail}
                            project={selectedProject}
                            projects={projects}
                            setProjects={setProjects}
                            onClose={() => { setSelectedModuleDetail(null); setEditMode(false); }}
                            editMode={editMode}
                            setEditMode={setEditMode}
                        />
                    )}
                </div>
            );
        }

        // ============================================================================
        // REPORT ISSUE MODAL COMPONENT
        // ============================================================================
        function ReportIssueModal({ context, onSubmit, onClose }) {
            const { module, station, project } = context;
            const fileInputRef = useRef(null);
            const [formData, setFormData] = useState({
                title: '',
                category: '',
                urgency: 'medium',
                department: station?.name || '',
                moduleSerial: module?.serialNumber || '',
                projectName: project?.name || '',
                description: '',
                reportedBy: '',
                contactPhone: '',
                location: station?.name || '',
                photos: []
            });
            const [photoPreview, setPhotoPreview] = useState([]);

            const handlePhotoCapture = (e) => {
                const files = Array.from(e.target.files);
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        setPhotoPreview(prev => [...prev, event.target.result]);
                        setFormData(prev => ({
                            ...prev,
                            photos: [...prev.photos, {
                                data: event.target.result,
                                name: file.name,
                                timestamp: new Date().toISOString()
                            }]
                        }));
                    };
                    reader.readAsDataURL(file);
                });
            };

            const removePhoto = (index) => {
                setPhotoPreview(prev => prev.filter((_, i) => i !== index));
                setFormData(prev => ({
                    ...prev,
                    photos: prev.photos.filter((_, i) => i !== index)
                }));
            };

            const handleSubmit = (e) => {
                e.preventDefault();
                if (!formData.title || !formData.category || !formData.reportedBy) {
                    alert('Please fill in Title, Category, and Your Name');
                    return;
                }
                onSubmit(formData);
            };

            return (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-4 border-b sticky top-0 bg-white z-10" style={{borderTopColor: 'var(--autovol-red)', borderTopWidth: '4px'}}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold" style={{color: 'var(--autovol-navy)'}}>
                                        ⚠️ Report Issue to Engineering
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Module: <span className="font-mono font-semibold">{module?.serialNumber}</span>
                                        {station && <> • Station: <span className="font-semibold">{station.name}</span></>}
                                    </p>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-2xl">×</button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Issue Title */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Issue Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    placeholder="Brief description of the issue"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            {/* Category Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Issue Category <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {ENGINEERING_ISSUE_CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setFormData({...formData, category: cat.id})}
                                            className={`p-2 rounded-lg border-2 text-left transition text-sm ${
                                                formData.category === cat.id 
                                                    ? 'border-blue-500 bg-blue-50' 
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <span className="mr-1">{cat.icon}</span>
                                            <span className="font-medium">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Urgency Level */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Urgency Level <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {URGENCY_LEVELS.map(u => (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => setFormData({...formData, urgency: u.id})}
                                            className={`p-2 rounded-lg border-2 text-left transition text-sm ${
                                                formData.urgency === u.id ? 'ring-2 ring-offset-1' : ''
                                            }`}
                                            style={{
                                                borderColor: u.color,
                                                backgroundColor: formData.urgency === u.id ? u.bgColor : 'white'
                                            }}
                                        >
                                            <span className="font-medium" style={{color: u.color}}>{u.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Department & Location */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                    <select
                                        value={formData.department}
                                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    >
                                        <option value="">Select department...</option>
                                        {ENGINEERING_DEPARTMENTS.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location/Station</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                                        placeholder="e.g., Station 5, Bay 3"
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Detailed Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    placeholder="Describe the issue in detail..."
                                    rows={3}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>

                            {/* Photo Capture */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Photos (Optional)</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    capture="environment"
                                    onChange={handlePhotoCapture}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:bg-gray-50 w-full"
                                >
                                    📷 Add Photos
                                </button>
                                {photoPreview.length > 0 && (
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                        {photoPreview.map((src, idx) => (
                                            <div key={idx} className="relative">
                                                <img src={src} alt={`Photo ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(idx)}
                                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Reporter Info */}
                            <div className="border-t pt-4">
                                <h3 className="font-semibold text-gray-700 mb-3">Your Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Your Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.reportedBy}
                                            onChange={(e) => setFormData({...formData, reportedBy: e.target.value})}
                                            placeholder="Full name"
                                            className="w-full px-3 py-2 border rounded-lg"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={formData.contactPhone}
                                            onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                                            placeholder="(555) 123-4567"
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 px-4 py-2 text-white rounded-lg font-medium" style={{backgroundColor: 'var(--autovol-red)'}}>
                                    📋 Submit Issue
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            );
        }

        // Projects Directory Component
        function ProjectsDirectory({ projects, setProjects, trashedProjects, setTrashedProjects, onSelectProject, showNewProjectModal, auth, exportData, importData }) {
            const [statusFilter, setStatusFilter] = useState('all');
            const [editMode, setEditMode] = useState(false);
            const [editingProject, setEditingProject] = useState(null);
            const [deleteConfirm, setDeleteConfirm] = useState(null);
            
            const filteredProjects = projects.filter(p => 
                statusFilter === 'all' || p.status === statusFilter
            );

            const statusCounts = {
                'Pre-Construction': projects.filter(p => p.status === 'Pre-Construction').length,
                'Planned': projects.filter(p => p.status === 'Planned').length,
                'Active': projects.filter(p => p.status === 'Active').length,
                'Complete': projects.filter(p => p.status === 'Complete').length
            };

            // Move to trash instead of permanent delete
            const handleDeleteProject = (project) => {
                const trashedProject = {
                    ...project,
                    deletedAt: Date.now(),
                    deletedBy: auth.currentUser?.name || 'Unknown'
                };
                setTrashedProjects([...trashedProjects, trashedProject]);
                setProjects(projects.filter(p => p.id !== project.id));
                setDeleteConfirm(null);
            };

            const handleUpdateProject = (updatedProject) => {
                setProjects(projects.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p));
                setEditingProject(null);
            };

            return (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-autovol-navy">Project Directory</h2>
                        <div className="flex items-center gap-2">
                            {auth.isAdmin && (
                                <button
                                    onClick={() => setEditMode(!editMode)}
                                    className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                                        editMode 
                                            ? 'bg-gray-800 text-white' 
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                >
                                    {editMode ? '✓ Done Editing' : '✎ Edit Projects'}
                                </button>
                            )}
                            <button
                                onClick={showNewProjectModal}
                                className="px-4 py-2 btn-primary rounded-lg transition flex items-center gap-2"
                            >
                                <span>+</span> New Project
                            </button>
                        </div>
                    </div>

                    {/* Status Filter Pills */}
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1 rounded-full text-sm ${statusFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                            All ({projects.length})
                        </button>
                        {Object.entries(statusCounts).map(([status, count]) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-3 py-1 rounded-full text-sm ${statusFilter === status ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}
                            >
                                {status} ({count})
                            </button>
                        ))}
                    </div>

                    {/* Project Cards */}
                    <div className="grid gap-4">
                        {filteredProjects.length === 0 ? (
                            <div className="bg-white rounded-lg shadow p-8 text-center">
                                <p className="text-gray-500">No projects found. Click "New Project" to create one.</p>
                            </div>
                        ) : (
                            filteredProjects.map(project => (
                                <div 
                                    key={project.id}
                                    className={`bg-white rounded-lg shadow p-4 transition ${!editMode ? 'hover:shadow-md cursor-pointer' : ''}`}
                                    onClick={() => !editMode && onSelectProject(project)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900">{project.name}</h3>
                                            <p className="text-sm text-gray-500">{project.location}</p>
                                            {project.description && (
                                                <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`px-2 py-0.5 text-xs rounded ${
                                                    project.status === 'Active' ? 'bg-green-100 text-green-800' :
                                                    project.status === 'Complete' ? 'bg-gray-100 text-gray-800' :
                                                    project.status === 'Planned' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {project.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-gray-600">{project.modules?.length || 0} modules</span>
                                            {editMode && (
                                                <div className="flex gap-2 ml-4">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingProject(project); }}
                                                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(project); }}
                                                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Edit Project Modal */}
                    {editingProject && (
                        <EditProjectModal
                            project={editingProject}
                            onClose={() => setEditingProject(null)}
                            onSave={handleUpdateProject}
                        />
                    )}

                    {/* Delete Confirmation Modal */}
                    {deleteConfirm && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
                            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Move to Trash?</h2>
                                <p className="text-gray-600 mb-2">
                                    Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
                                </p>
                                {deleteConfirm.modules?.length > 0 && (
                                    <p className="text-orange-600 text-sm mb-4">
                                        ⚠ This project has {deleteConfirm.modules.length} modules that will also be moved to trash.
                                    </p>
                                )}
                                <p className="text-sm text-gray-500 mb-6">
                                    ✓ This project will be moved to Trash and can be restored within 90 days from the Data Management panel.
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setDeleteConfirm(null)}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleDeleteProject(deleteConfirm)}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    >
                                        Move to Trash
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Edit Project Modal
        function EditProjectModal({ project, onClose, onSave }) {
            const [name, setName] = useState(project.name || '');
            const [location, setLocation] = useState(project.location || '');
            const [description, setDescription] = useState(project.description || '');
            const [status, setStatus] = useState(project.status || 'Pre-Construction');
            const [sharepointSite, setSharepointSite] = useState(project.sharepointSite || 'ProductDevelopmentAutovolPrefab');
            const [sharepointChannel, setSharepointChannel] = useState(project.sharepointChannel || '');
            
            // Shop Drawing Links state - convert existing links object to text format
            const existingLinksText = Object.entries(project.shopDrawingLinks || {})
                .map(([blm, url]) => `${blm}, ${url}`)
                .join('\n');
            const [shopDrawingLinksText, setShopDrawingLinksText] = useState(existingLinksText);
            const [shopDrawingLinksError, setShopDrawingLinksError] = useState('');
            const [parsedLinksCount, setParsedLinksCount] = useState(Object.keys(project.shopDrawingLinks || {}).length);
            
            // Parse shop drawing links from text input
            const parseShopDrawingLinks = (text) => {
                const links = {};
                const lines = text.split('\n').filter(line => line.trim());
                let errorMsg = '';
                
                for (const line of lines) {
                    const parts = line.split(/[,\t]/).map(p => p.trim());
                    if (parts.length >= 2) {
                        const blm = parts[0];
                        const url = parts[1];
                        if (blm && url && url.startsWith('http')) {
                            links[blm] = url;
                        } else if (blm && url && !url.startsWith('http')) {
                            errorMsg = `Invalid URL for BLM "${blm}"`;
                        }
                    }
                }
                
                setShopDrawingLinksError(errorMsg);
                setParsedLinksCount(Object.keys(links).length);
                return links;
            };
            
            const handleLinksTextChange = (text) => {
                setShopDrawingLinksText(text);
                parseShopDrawingLinks(text);
            };

            const handleSubmit = (e) => {
                e.preventDefault();
                if (!name.trim()) return;
                onSave({ 
                    ...project, 
                    name: name.trim(), 
                    location: location.trim(), 
                    description: description.trim(), 
                    status, 
                    sharepointSite: sharepointSite.trim(), 
                    sharepointChannel: sharepointChannel.trim(),
                    shopDrawingLinks: parseShopDrawingLinks(shopDrawingLinksText)
                });
            };

            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Edit Project</h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                            </div>
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Building A - Phoenix"
                                        className="w-full px-3 py-2 border rounded-lg"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="e.g., Phoenix, AZ"
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Brief project description..."
                                        className="w-full px-3 py-2 border rounded-lg"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    >
                                        <option value="Pre-Construction">Pre-Construction</option>
                                        <option value="Planned">Planned</option>
                                        <option value="Active">Active</option>
                                        <option value="Complete">Complete</option>
                                    </select>
                                </div>
                                
                                {/* SharePoint Integration */}
                                <div className="border-t pt-4 mt-4">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <span>📋</span> SharePoint Integration
                                        <span className="text-xs font-normal text-gray-500">(for Shop Drawings)</span>
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">SharePoint Site</label>
                                            <input
                                                type="text"
                                                value={sharepointSite}
                                                onChange={(e) => setSharepointSite(e.target.value)}
                                                placeholder="e.g., ProductDevelopmentAutovolPrefab"
                                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Site name from SharePoint URL</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Teams Channel Folder</label>
                                            <input
                                                type="text"
                                                value={sharepointChannel}
                                                onChange={(e) => setSharepointChannel(e.target.value)}
                                                placeholder="e.g., Alvarado Creek - San Diego, CA (TPC)"
                                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Exact channel name from Teams</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Shop Drawing Links */}
                                <div className="border-t pt-4 mt-4">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <span>📐</span> Shop Drawing Links
                                    </h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">BLM / URL Mapping</label>
                                        <textarea
                                            value={shopDrawingLinksText}
                                            onChange={(e) => handleLinksTextChange(e.target.value)}
                                            placeholder="B1L2M39, https://sharepoint.com/..."
                                            rows={5}
                                            className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                                        />
                                        <div className="flex justify-between mt-1">
                                            <p className="text-xs text-gray-500">Format: BLM, URL (one per line)</p>
                                            {parsedLinksCount > 0 && (
                                                <p className="text-xs text-green-600 font-medium">{parsedLinksCount} links</p>
                                            )}
                                        </div>
                                        {shopDrawingLinksError && (
                                            <p className="text-xs text-red-600 mt-1">{shopDrawingLinksError}</p>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 justify-end pt-4">
                                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                                        Cancel
                                    </button>
                                    <button type="submit" className="px-4 py-2 btn-primary rounded-lg">
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            );
        }

        // Data Management Panel (Admin Only)
        function DataManagementPanel({ onClose, projects, setProjects, trashedProjects, setTrashedProjects, employees, setEmployees, trashedEmployees, setTrashedEmployees, exportData, importData }) {
            const [activeTab, setActiveTab] = useState('trash');
            const [trashTab, setTrashTab] = useState('projects');
            const [confirmEmpty, setConfirmEmpty] = useState(false);

            const formatDate = (timestamp) => {
                if (!timestamp) return 'Unknown';
                return new Date(timestamp).toLocaleDateString('en-US', { 
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                });
            };

            const getDaysRemaining = (deletedAt) => {
                const ninetyDays = 90 * 24 * 60 * 60 * 1000;
                const expiresAt = deletedAt + ninetyDays;
                const remaining = Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
                return remaining;
            };

            const restoreProject = (project) => {
                const { deletedAt, deletedBy, ...cleanProject } = project;
                setProjects([...projects, cleanProject]);
                setTrashedProjects(trashedProjects.filter(p => p.id !== project.id));
            };

            const restoreEmployee = (employee) => {
                const { deletedAt, deletedBy, ...cleanEmployee } = employee;
                setEmployees([...employees, cleanEmployee]);
                setTrashedEmployees(trashedEmployees.filter(e => e.id !== employee.id));
            };

            const permanentlyDeleteProject = (projectId) => {
                setTrashedProjects(trashedProjects.filter(p => p.id !== projectId));
            };

            const permanentlyDeleteEmployee = (employeeId) => {
                setTrashedEmployees(trashedEmployees.filter(e => e.id !== employeeId));
            };

            const emptyTrash = () => {
                if (trashTab === 'projects') {
                    setTrashedProjects([]);
                } else {
                    setTrashedEmployees([]);
                }
                setConfirmEmpty(false);
            };

            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">⚙</span>
                                <h2 className="text-xl font-bold text-gray-900">Data Management</h2>
                            </div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>

                        {/* Tabs */}
                        <div className="border-b">
                            <div className="flex">
                                <button
                                    onClick={() => setActiveTab('trash')}
                                    className={`px-6 py-3 text-sm font-medium ${activeTab === 'trash' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-600'}`}
                                >
                                    🗑 Trash ({trashedProjects.length + trashedEmployees.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('backup')}
                                    className={`px-6 py-3 text-sm font-medium ${activeTab === 'backup' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                                >
                                    💾 Backup & Restore
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto" style={{maxHeight: 'calc(90vh - 140px)'}}>
                            {activeTab === 'trash' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setTrashTab('projects')}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium ${trashTab === 'projects' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}
                                            >
                                                Projects ({trashedProjects.length})
                                            </button>
                                            <button
                                                onClick={() => setTrashTab('employees')}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium ${trashTab === 'employees' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}
                                            >
                                                Employees ({trashedEmployees.length})
                                            </button>
                                        </div>
                                        {((trashTab === 'projects' && trashedProjects.length > 0) || (trashTab === 'employees' && trashedEmployees.length > 0)) && (
                                            <button
                                                onClick={() => setConfirmEmpty(true)}
                                                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
                                            >
                                                Empty {trashTab === 'projects' ? 'Projects' : 'Employees'} Trash
                                            </button>
                                        )}
                                    </div>

                                    <p className="text-sm text-gray-500">
                                        Items in trash are automatically deleted after 90 days.
                                    </p>

                                    {trashTab === 'projects' && (
                                        <div className="space-y-2">
                                            {trashedProjects.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500">
                                                    <p>No deleted projects</p>
                                                </div>
                                            ) : (
                                                trashedProjects.map(project => (
                                                    <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                                        <div>
                                                            <h4 className="font-medium text-gray-900">{project.name}</h4>
                                                            <p className="text-sm text-gray-500">
                                                                {project.modules?.length || 0} modules • Deleted {formatDate(project.deletedAt)}
                                                            </p>
                                                            <p className="text-xs text-orange-600">
                                                                {getDaysRemaining(project.deletedAt)} days until permanent deletion
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => restoreProject(project)}
                                                                className="px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                                                            >
                                                                Restore
                                                            </button>
                                                            <button
                                                                onClick={() => permanentlyDeleteProject(project.id)}
                                                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                                                            >
                                                                Delete Forever
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {trashTab === 'employees' && (
                                        <div className="space-y-2">
                                            {trashedEmployees.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500">
                                                    <p>No deleted employees</p>
                                                </div>
                                            ) : (
                                                trashedEmployees.map(employee => (
                                                    <div key={employee.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                                                        <div>
                                                            <h4 className="font-medium text-gray-900">
                                                                {employee.firstName} {employee.lastName}
                                                            </h4>
                                                            <p className="text-sm text-gray-500">
                                                                {employee.jobTitle} • {employee.department} • Deleted {formatDate(employee.deletedAt)}
                                                            </p>
                                                            <p className="text-xs text-orange-600">
                                                                {getDaysRemaining(employee.deletedAt)} days until permanent deletion
                                                            </p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => restoreEmployee(employee)}
                                                                className="px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm"
                                                            >
                                                                Restore
                                                            </button>
                                                            <button
                                                                onClick={() => permanentlyDeleteEmployee(employee.id)}
                                                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                                                            >
                                                                Delete Forever
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'backup' && (
                                <div className="space-y-6">
                                    {/* Export Section */}
                                    <div className="p-4 border rounded-lg">
                                        <h3 className="font-semibold text-gray-900 mb-2">📋¤ Export Data</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Download a complete backup of all MODA data including projects, modules, employees, and trash.
                                        </p>
                                        <button
                                            onClick={exportData}
                                            className="px-4 py-2 btn-primary rounded-lg"
                                        >
                                            Download Backup
                                        </button>
                                    </div>

                                    {/* Import Section */}
                                    <div className="p-4 border rounded-lg">
                                        <h3 className="font-semibold text-gray-900 mb-2">📋¥ Import Data</h3>
                                        <p className="text-sm text-gray-600 mb-4">
                                            Restore MODA data from a previously exported backup file. This will replace current data.
                                        </p>
                                        <label className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
                                            Select Backup File
                                            <input 
                                                type="file" 
                                                accept=".json" 
                                                className="hidden" 
                                                onChange={(e) => {
                                                    if (e.target.files[0]) {
                                                        if (confirm('This will replace all current data. Are you sure?')) {
                                                            importData(e.target.files[0]);
                                                        }
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>

                                    {/* Data Summary */}
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <h3 className="font-semibold text-gray-900 mb-3">📋Š Current Data Summary</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-600">Projects:</span>
                                                <span className="ml-2 font-medium">{projects.length}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Trashed Projects:</span>
                                                <span className="ml-2 font-medium">{trashedProjects.length}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Employees:</span>
                                                <span className="ml-2 font-medium">{employees.length}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Trashed Employees:</span>
                                                <span className="ml-2 font-medium">{trashedEmployees.length}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Total Modules:</span>
                                                <span className="ml-2 font-medium">{projects.reduce((sum, p) => sum + (p.modules?.length || 0), 0)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Empty Trash Confirmation */}
                        {confirmEmpty && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                <div className="bg-white rounded-lg p-6 max-w-sm">
                                    <h3 className="font-bold text-lg mb-2">Empty {trashTab === 'projects' ? 'Projects' : 'Employees'} Trash?</h3>
                                    <p className="text-gray-600 text-sm mb-4">
                                        This will permanently delete all {trashTab === 'projects' ? trashedProjects.length + ' projects' : trashedEmployees.length + ' employees'}. This cannot be undone.
                                    </p>
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setConfirmEmpty(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                                        <button onClick={emptyTrash} className="px-4 py-2 bg-red-600 text-white rounded-lg">Delete All</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Project Detail View
        function ProjectDetail({ project, projects, setProjects, onBack, viewMode, setViewMode, searchTerm, setSearchTerm, stageFilter, setStageFilter }) {
            const [showImportModal, setShowImportModal] = useState(false);
            const [selectedModule, setSelectedModule] = useState(null);
            const [editMode, setEditMode] = useState(false);
            const [editingModule, setEditingModule] = useState(null);
            const [showLicensePlates, setShowLicensePlates] = useState(false);
            
            // Report Issue State
            const [showReportIssueModal, setShowReportIssueModal] = useState(false);
            const [reportIssueContext, setReportIssueContext] = useState(null);
            const [engineeringIssues, setEngineeringIssues] = useState(() => {
                const saved = localStorage.getItem('autovol_engineering_issues');
                return saved ? JSON.parse(saved) : [];
            });
            
            const [difficultyFilters, setDifficultyFilters] = useState({
                sidewall: false,
                stair: false,
                hr3Wall: false,
                short: false,
                doubleStudio: false,
                sawbox: false
            });
            
            // Get fresh project data from projects array to ensure we have latest modules
            const currentProject = projects.find(p => p.id === project.id) || project;
            const modules = currentProject.modules || [];
            
            // Toggle difficulty filter
            const toggleDifficultyFilter = (key) => {
                setDifficultyFilters(prev => ({ ...prev, [key]: !prev[key] }));
            };
            
            // Check if any difficulty filter is active
            const anyDifficultyFilterActive = Object.values(difficultyFilters).some(v => v);
            
            // Filter modules
            const filteredModules = modules.filter(m => {
                const matchesSearch = !searchTerm || 
                    m.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    m.hitchBLM?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    m.rearBLM?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    String(m.hitchUnit)?.toLowerCase().includes(searchTerm.toLowerCase());
                
                const matchesStage = stageFilter === 'all' || 
                    (m.stageProgress?.[stageFilter] > 0 && m.stageProgress?.[stageFilter] < 100);
                
                // Difficulty filter - show modules that have ANY of the selected difficulties
                const matchesDifficulty = !anyDifficultyFilterActive || (
                    (difficultyFilters.sidewall && m.difficulties?.sidewall) ||
                    (difficultyFilters.stair && m.difficulties?.stair) ||
                    (difficultyFilters.hr3Wall && m.difficulties?.hr3Wall) ||
                    (difficultyFilters.short && m.difficulties?.short) ||
                    (difficultyFilters.doubleStudio && m.difficulties?.doubleStudio) ||
                    (difficultyFilters.sawbox && m.difficulties?.sawbox)
                );
                
                return matchesSearch && matchesStage && matchesDifficulty;
            });

            // Save engineering issues to localStorage
            useEffect(() => {
                localStorage.setItem('autovol_engineering_issues', JSON.stringify(engineeringIssues));
            }, [engineeringIssues]);
            
            // Open report issue modal with context
            const openReportIssue = (module, station) => {
                setReportIssueContext({ module, station: station || null, project: currentProject });
                setShowReportIssueModal(true);
            };
            
            // Handle issue submission
            const handleSubmitIssue = (issueData) => {
                const newIssue = {
                    id: `ENG-${Date.now()}`,
                    ...issueData,
                    status: 'open',
                    createdAt: new Date().toISOString(),
                    history: [{
                        action: 'Issue Created',
                        timestamp: new Date().toISOString(),
                        by: issueData.reportedBy
                    }]
                };
                setEngineeringIssues(prev => [newIssue, ...prev]);
                setShowReportIssueModal(false);
                setReportIssueContext(null);
            };
            
            // Update project modules
            const updateProjectModules = (newModules) => {
                const updatedProjects = projects.map(p => 
                    p.id === project.id ? { ...p, modules: newModules } : p
                );
                setProjects(updatedProjects);
            };

            // Import handler
            const handleImport = (importedModules) => {
                const newModules = importedModules.map((m, idx) => ({
                    ...m,
                    id: Date.now() + idx,
                    stageProgress: productionStages.reduce((acc, stage) => {
                        acc[stage.id] = 0;
                        return acc;
                    }, {})
                }));
                updateProjectModules([...modules, ...newModules]);
                setShowImportModal(false);
            };

            // Update project status
            const updateProjectStatus = (newStatus) => {
                const updatedProjects = projects.map(p => 
                    p.id === project.id ? { ...p, status: newStatus } : p
                );
                setProjects(updatedProjects);
            };

            // Get progress color class
            const getProgressClass = (progress) => {
                if (progress === 100) return 'stage-bg-100';
                if (progress >= 75) return 'stage-bg-75';
                if (progress >= 50) return 'stage-bg-50';
                if (progress >= 25) return 'stage-bg-25';
                return 'stage-bg-0';
            };

            // Get current stage for display
            const getCurrentStage = (module) => {
                const stageProgress = module.stageProgress || {};
                for (let i = productionStages.length - 1; i >= 0; i--) {
                    const stage = productionStages[i];
                    if (stageProgress[stage.id] > 0) {
                        return { stage, progress: stageProgress[stage.id] };
                    }
                }
                return { stage: null, progress: 0 };
            };

            return (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <button 
                                onClick={onBack}
                                className="text-autovol-red hover:text-autovol-red text-sm mb-2 flex items-center gap-1"
                            >
                                ← Back to Projects
                            </button>
                            <h2 className="text-2xl font-bold text-autovol-navy">{project.name}</h2>
                            <p className="text-gray-500">{project.location}</p>
                            {project.description && <p className="text-sm text-gray-600">{project.description}</p>}
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                    project.status === 'Active' ? 'bg-green-100 text-green-800' :
                                    project.status === 'Complete' ? 'bg-gray-100 text-gray-800' :
                                    project.status === 'Planned' ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {project.status}
                                </span>
                                <span className="text-sm text-gray-600">{modules.length} modules</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {project.status !== 'Active' && (
                                <button
                                    onClick={() => updateProjectStatus('Active')}
                                    className="px-4 py-2 btn-secondary rounded-lg transition"
                                >
                                    Go Online
                                </button>
                            )}
                            <button
                                onClick={() => setShowLicensePlates(true)}
                                disabled={modules.length === 0}
                                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                                    modules.length === 0 
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                        : 'bg-autovol-navy text-white hover:bg-autovol-navy-light'
                                }`}
                            >
                                🏷️ License Plates
                            </button>
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="px-4 py-2 btn-primary rounded-lg transition"
                            >
                                Import Modules
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <input
                                type="text"
                                placeholder="Search serial, BLM, unit..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="px-3 py-2 border rounded-lg flex-1 min-w-48"
                            />
                            <select
                                value={stageFilter}
                                onChange={(e) => setStageFilter(e.target.value)}
                                className="px-3 py-2 border rounded-lg"
                            >
                                <option value="all">All Stages</option>
                                {productionStages.map(stage => (
                                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                                ))}
                            </select>
                            <div className="flex gap-1 border rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-gray-800 text-white' : 'text-gray-600'}`}
                                >
                                    Grid
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-gray-800 text-white' : 'text-gray-600'}`}
                                >
                                    List
                                </button>
                            </div>
                        </div>
                        
                        {/* Difficulty Filters */}
                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                            <span className="text-sm text-gray-600 font-medium">Difficulty Filters:</span>
                            <button
                                onClick={() => toggleDifficultyFilter('sidewall')}
                                className={`px-2 py-1 text-xs rounded-full border transition ${difficultyFilters.sidewall ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'}`}
                            >
                                Sidewall
                            </button>
                            <button
                                onClick={() => toggleDifficultyFilter('stair')}
                                className={`px-2 py-1 text-xs rounded-full border transition ${difficultyFilters.stair ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'}`}
                            >
                                Stair
                            </button>
                            <button
                                onClick={() => toggleDifficultyFilter('hr3Wall')}
                                className={`px-2 py-1 text-xs rounded-full border transition ${difficultyFilters.hr3Wall ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}
                            >
                                3HR-Wall
                            </button>
                            <button
                                onClick={() => toggleDifficultyFilter('short')}
                                className={`px-2 py-1 text-xs rounded-full border transition ${difficultyFilters.short ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-gray-600 border-gray-300 hover:border-yellow-400'}`}
                            >
                                Short
                            </button>
                            <button
                                onClick={() => toggleDifficultyFilter('doubleStudio')}
                                className={`px-2 py-1 text-xs rounded-full border transition ${difficultyFilters.doubleStudio ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
                            >
                                Dbl Studio
                            </button>
                            <button
                                onClick={() => toggleDifficultyFilter('sawbox')}
                                className={`px-2 py-1 text-xs rounded-full border transition ${difficultyFilters.sawbox ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}
                            >
                                Sawbox
                            </button>
                            {anyDifficultyFilterActive && (
                                <button
                                    onClick={() => setDifficultyFilters({ sidewall: false, stair: false, hr3Wall: false, short: false, doubleStudio: false, sawbox: false })}
                                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 underline"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                        
                        <p className="text-sm text-gray-500 mt-2">
                            Showing {filteredModules.length} of {modules.length} modules
                        </p>
                    </div>

                    {/* Module Grid/List */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-4 border-b">
                            <h3 className="font-semibold text-gray-900">Project Modules</h3>
                        </div>
                        
                        {modules.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No modules imported yet. Click "Import Modules" to add modules from Excel.
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredModules.map(module => {
                                    const { stage: currentStage, progress } = getCurrentStage(module);
                                    const hasDifficulties = Object.values(module.difficulties || {}).some(v => v);
                                    
                                    return (
                                        <div 
                                            key={module.id}
                                            onClick={() => setSelectedModule(module)}
                                            className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                                        >
                                            {/* Header with Serial & Stage */}
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="flex items-center gap-1">
                                                        <h4 className="font-bold text-lg text-gray-900">{module.serialNumber}</h4>
                                                        {module.isPrototype && (
                                                            <span 
                                                                className="text-yellow-500 cursor-help" 
                                                                title="Prototype"
                                                                style={{ fontSize: '14px' }}
                                                            >
                                                                ★
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500">Build Seq: {module.buildSequence}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {currentStage && (
                                                        <span className={`px-2 py-1 text-xs rounded ${getProgressClass(progress)} ${progress === 100 ? 'text-white' : progress >= 50 ? 'text-white' : 'text-gray-800'}`}>
                                                            {currentStage.name}
                                                        </span>
                                                    )}
                                                    {/* Module Actions Menu */}
                                                    <div className="relative group">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); }}
                                                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                                                            title="More options"
                                                        >
                                                            ⋮
                                                        </button>
                                                        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setSelectedModule(module); }}
                                                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                                            >
                                                                👁️ View Details
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setEditingModule(module); }}
                                                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                                            >
                                                                ✏️ Edit Module
                                                            </button>
                                                            <div className="border-t"></div>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); openReportIssue(module, null); }}
                                                                className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                                            >
                                                                ⚠️ Report Issue
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Unit Info */}
                                            <div className="text-sm text-gray-600 mb-2">
                                                <span className="font-medium">Unit:</span> {module.hitchUnit || 'N/A'}
                                            </div>
                                            
                                            {/* Dimensions */}
                                            <div className="flex gap-4 text-sm text-gray-600 mb-3">
                                                <span><strong>W:</strong> {module.moduleWidth}'</span>
                                                <span><strong>L:</strong> {module.moduleLength}'</span>
                                                <span><strong>SF:</strong> {module.squareFootage}</span>
                                            </div>

                                            {/* HITCH/REAR BLM */}
                                            <div className="border-t pt-2 space-y-1 text-sm">
                                                <div className="flex gap-2">
                                                    <span className="text-gray-500 w-12">HITCH:</span>
                                                    <span className="font-medium">{module.hitchBLM || 'N/A'}</span>
                                                    <span className="text-gray-500">|</span>
                                                    <span>{module.hitchRoomType || 'N/A'}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="text-gray-500 w-12">REAR:</span>
                                                    <span className="font-medium">{module.rearBLM || 'N/A'}</span>
                                                    <span className="text-gray-500">|</span>
                                                    <span>{module.rearRoomType || 'N/A'}</span>
                                                </div>
                                            </div>

                                            {/* Difficulty Indicators */}
                                            {hasDifficulties && (
                                                <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t">
                                                    {Object.entries(module.difficulties || {}).map(([key, value]) => 
                                                        value && (
                                                            <span key={key} className={`px-2 py-0.5 text-xs rounded ${difficultyColors[key]}`}>
                                                                {difficultyLabels[key]}
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            )}

                                            {/* Progress Bar */}
                                            {progress > 0 && (
                                                <div className="mt-3">
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                        <span>{currentStage?.name}</span>
                                                        <span>{progress}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div 
                                                            className={`h-2 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-autovol-teal'}`}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial #</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Build Seq</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dimensions</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hitch BLM</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rear BLM</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulties</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredModules.map(module => {
                                            const { stage: currentStage, progress } = getCurrentStage(module);
                                            return (
                                                <tr 
                                                    key={module.id} 
                                                    onClick={() => setSelectedModule(module)}
                                                    className="hover:bg-gray-50 cursor-pointer"
                                                >
                                                    <td className="px-4 py-3 font-medium">
                                                        <span className="flex items-center gap-1">
                                                            {module.serialNumber}
                                                            {module.isPrototype && (
                                                                <span 
                                                                    className="text-yellow-500 cursor-help" 
                                                                    title="Prototype"
                                                                    style={{ fontSize: '12px' }}
                                                                >
                                                                    ★
                                                                </span>
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">{module.buildSequence}</td>
                                                    <td className="px-4 py-3">{module.hitchUnit}</td>
                                                    <td className="px-4 py-3 text-sm">{module.moduleWidth}' x {module.moduleLength}'</td>
                                                    <td className="px-4 py-3">{module.hitchBLM}</td>
                                                    <td className="px-4 py-3">{module.rearBLM}</td>
                                                    <td className="px-4 py-3">
                                                        {currentStage && (
                                                            <span className={`px-2 py-1 text-xs rounded ${getProgressClass(progress)} ${progress >= 50 ? 'text-white' : ''}`}>
                                                                {currentStage.name}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-20 bg-gray-200 rounded-full h-2">
                                                                <div 
                                                                    className={`h-2 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-autovol-teal'}`}
                                                                    style={{ width: `${progress}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-gray-500">{progress}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {Object.entries(module.difficulties || {}).map(([key, value]) => 
                                                                value && (
                                                                    <span key={key} className={`px-1.5 py-0.5 text-xs rounded ${difficultyColors[key]}`}>
                                                                        {difficultyLabels[key]}
                                                                    </span>
                                                                )
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Import Modal */}
                    {showImportModal && (
                        <ImportModal 
                            onClose={() => setShowImportModal(false)}
                            onImport={handleImport}
                        />
                    )}

                    {/* Module Detail Modal */}
                    {selectedModule && (
                        <ModuleDetailModal 
                            module={selectedModule}
                            project={project}
                            projects={projects}
                            setProjects={setProjects}
                            onClose={() => { setSelectedModule(null); setEditMode(false); }}
                            editMode={editMode}
                            setEditMode={setEditMode}
                        />
                    )}

                    {/* License Plate Generator */}
                    {showLicensePlates && (
                        <LicensePlateGenerator
                            project={currentProject}
                            modules={modules}
                            onClose={() => setShowLicensePlates(false)}
                        />
                    )}
                    
                    {/* Report Issue Modal */}
                    {showReportIssueModal && reportIssueContext && (
                        <ReportIssueModal
                            context={reportIssueContext}
                            onSubmit={handleSubmitIssue}
                            onClose={() => {
                                setShowReportIssueModal(false);
                                setReportIssueContext(null);
                            }}
                        />
                    )}
                </div>
            );
        }

        // ===== LICENSE PLATE GENERATOR =====
        function LicensePlateGenerator({ project, modules, onClose }) {
            const [selectedModules, setSelectedModules] = useState(new Set(modules.map((_, i) => i)));
            const [searchTerm, setSearchTerm] = useState('');
            const [buildingFilters, setBuildingFilters] = useState(new Set());
            const [levelFilters, setLevelFilters] = useState(new Set());
            const [difficultyFilters, setDifficultyFilters] = useState(new Set());
            const [unitTypeFilters, setUnitTypeFilters] = useState(new Set());
            const [seqFrom, setSeqFrom] = useState('');
            const [seqTo, setSeqTo] = useState('');
            const [previewModule, setPreviewModule] = useState(modules[0] || null);
            const [previewSide, setPreviewSide] = useState('H');
            const [pageSize, setPageSize] = useState('letter');
            const [footerNotes, setFooterNotes] = useState('');
            const [isGenerating, setIsGenerating] = useState(false);

            const baseUrl = window.location.origin + window.location.pathname;
            const pageSizes = {
                letter: { width: 612, height: 792, label: 'Letter (8.5" × 11")' },
                legal: { width: 612, height: 1008, label: 'Legal (8.5" × 14")' },
                tabloid: { width: 792, height: 1224, label: 'Tabloid (11" × 17")' }
            };

            // Extract filter options
            const filterOptions = useMemo(() => {
                const buildings = new Map();
                const levels = new Map();
                const difficulties = new Map();
                const unitTypes = new Map();
                
                modules.forEach((module) => {
                    // Extract from BLM ID (hitchBLM) for Building/Level
                    const blmData = extractFromBLM(module.hitchBLM || module.serialNumber || '');
                    if (blmData.building !== 'OTHER') {
                        buildings.set(blmData.building, (buildings.get(blmData.building) || 0) + 1);
                    }
                    if (blmData.level !== 'OTHER') {
                        levels.set(blmData.level, (levels.get(blmData.level) || 0) + 1);
                    }
                    
                    const indicators = getLicensePlateIndicators(module);
                    indicators.forEach(ind => {
                        difficulties.set(ind.key, (difficulties.get(ind.key) || 0) + 1);
                    });
                    
                    const unitType = extractUnitType(module.hitchUnit || module.unitType || '');
                    unitTypes.set(unitType, (unitTypes.get(unitType) || 0) + 1);
                });
                
                // Sort buildings and levels naturally (B1, B2, B3... and L0, L1, L2...)
                const sortNatural = (a, b) => {
                    const numA = parseInt(a[0].slice(1)) || 0;
                    const numB = parseInt(b[0].slice(1)) || 0;
                    return numA - numB;
                };
                
                return {
                    buildings: Array.from(buildings.entries()).sort(sortNatural),
                    levels: Array.from(levels.entries()).sort(sortNatural),
                    difficulties: Array.from(difficulties.entries()),
                    unitTypes: Array.from(unitTypes.entries()).sort((a, b) => a[0].localeCompare(b[0]))
                };
            }, [modules]);

            // Filter modules
            const filteredModules = useMemo(() => {
                return modules.filter((module) => {
                    if (searchTerm) {
                        const term = searchTerm.toLowerCase();
                        const serial = String(module.serialNumber || '').toLowerCase();
                        const buildSeq = String(module.buildSequence || '').toLowerCase();
                        const unitType = String(module.hitchUnit || module.unitType || '').toLowerCase();
                        const blm = String(module.hitchBLM || '').toLowerCase();
                        if (!serial.includes(term) && !buildSeq.includes(term) && !unitType.includes(term) && !blm.includes(term)) return false;
                    }
                    // Building filter
                    if (buildingFilters.size > 0) {
                        const blmData = extractFromBLM(module.hitchBLM || module.serialNumber || '');
                        if (!buildingFilters.has(blmData.building)) return false;
                    }
                    // Level filter
                    if (levelFilters.size > 0) {
                        const blmData = extractFromBLM(module.hitchBLM || module.serialNumber || '');
                        if (!levelFilters.has(blmData.level)) return false;
                    }
                    if (difficultyFilters.size > 0) {
                        const indicators = getLicensePlateIndicators(module);
                        const indicatorKeys = indicators.map(i => i.key);
                        if (!Array.from(difficultyFilters).some(f => indicatorKeys.includes(f))) return false;
                    }
                    if (unitTypeFilters.size > 0) {
                        const unitType = extractUnitType(module.hitchUnit || module.unitType || '');
                        if (!unitTypeFilters.has(unitType)) return false;
                    }
                    const seq = parseInt(module.buildSequence) || 0;
                    if (seqFrom && seq < parseInt(seqFrom)) return false;
                    if (seqTo && seq > parseInt(seqTo)) return false;
                    return true;
                });
            }, [modules, searchTerm, buildingFilters, levelFilters, difficultyFilters, unitTypeFilters, seqFrom, seqTo]);

            const toggleFilter = (set, setFn, value) => {
                const newSet = new Set(set);
                newSet.has(value) ? newSet.delete(value) : newSet.add(value);
                setFn(newSet);
            };

            const clearFilters = () => {
                setBuildingFilters(new Set());
                setLevelFilters(new Set());
                setDifficultyFilters(new Set());
                setUnitTypeFilters(new Set());
                setSeqFrom('');
                setSeqTo('');
                setSearchTerm('');
            };

            const hasActiveFilters = buildingFilters.size > 0 || levelFilters.size > 0 || difficultyFilters.size > 0 || unitTypeFilters.size > 0 || seqFrom || seqTo || searchTerm;

            const selectAllFiltered = () => {
                const indices = filteredModules.map(m => modules.indexOf(m));
                setSelectedModules(new Set(indices));
            };

            const selectNone = () => setSelectedModules(new Set());

            const toggleModuleSelection = (moduleIdx) => {
                const newSelected = new Set(selectedModules);
                newSelected.has(moduleIdx) ? newSelected.delete(moduleIdx) : newSelected.add(moduleIdx);
                setSelectedModules(newSelected);
            };

            const selectedInFiltered = Array.from(selectedModules).filter(idx => filteredModules.includes(modules[idx])).length;

            // PDF Generation
            const generatePDF = async () => {
                const selectedArray = Array.from(selectedModules).filter(idx => filteredModules.includes(modules[idx])).sort((a, b) => {
                    const seqA = parseInt(modules[a].buildSequence) || 0;
                    const seqB = parseInt(modules[b].buildSequence) || 0;
                    return seqA - seqB;
                });
                if (selectedArray.length === 0) return alert('Please select at least one module');
                setIsGenerating(true);
                try {
                    const { jsPDF } = window.jspdf;
                    const size = pageSizes[pageSize];
                    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [size.width, size.height] });
                    let isFirstPage = true;
                    for (const idx of selectedArray) {
                        const module = modules[idx];
                        if (!isFirstPage) doc.addPage();
                        isFirstPage = false;
                        drawPlate(doc, module, 'H', size);
                        doc.addPage();
                        drawPlate(doc, module, 'R', size);
                    }
                    doc.save(`License_Plates_${project.name.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-US', {month:'2-digit',day:'2-digit',year:'2-digit'}).replace(/\//g,'-')}.pdf`);
                } catch (error) {
                    alert('Error generating PDF: ' + error.message);
                } finally {
                    setIsGenerating(false);
                }
            };

            const drawPlate = (doc, module, side, size) => {
                const { width, height } = size;
                const centerX = width / 2;
                const scale = height > 900 ? (height > 1100 ? 1.3 : 1.15) : 1;
                const serial = module.serialNumber || '';
                const buildSeq = module.buildSequence || '';
                const blm = side === 'H' ? (module.hitchBLM || '') : (module.rearBLM || '');
                const unitType = module.hitchUnit || module.unitType || '';
                const indicators = getLicensePlateIndicators(module);
                
                // Get shop drawing URL for this module's BLM
                const shopDrawingLinks = project.shopDrawingLinks || {};
                const shopDrawingUrl = shopDrawingLinks[blm] || '';
                
                let y = 50 * scale;
                doc.setFontSize(14 * scale).setFont('helvetica', 'bold');
                doc.text(`PROJECT: ${project.name.toUpperCase()}`, centerX, y, { align: 'center' });
                y += 18 * scale;
                doc.text(`LOCATION: ${(project.location || '').toUpperCase()}`, centerX, y, { align: 'center' });
                y += 35 * scale;
                doc.setFontSize(36 * scale).text(`#${buildSeq}`, centerX, y, { align: 'center' });
                y += 45 * scale;
                doc.setFontSize(42 * scale).text(String(serial), centerX, y, { align: 'center' });
                y += 55 * scale;
                doc.setFontSize(54 * scale).text(`(${side}) - ${blm}`, centerX, y, { align: 'center' });
                y += 50 * scale;
                if (indicators.length > 0) {
                    doc.setTextColor(220, 38, 38).setFontSize(24 * scale);
                    doc.text(indicators.map(i => i.label).join('; '), centerX, y, { align: 'center' });
                    doc.setTextColor(0, 0, 0);
                }
                y += 35 * scale;
                doc.setFontSize(32 * scale).text(String(unitType).toUpperCase(), centerX, y, { align: 'center' });
                y += 50 * scale;
                
                // Only show QR code if shop drawing URL exists
                if (shopDrawingUrl) {
                    doc.setFontSize(8 * scale).setFont('helvetica', 'bold');
                    doc.text('Shop Drawing Package Link', centerX, y, { align: 'center' });
                    y += 12 * scale;
                    const qr = qrcode(0, 'M');
                    qr.addData(shopDrawingUrl);
                    qr.make();
                    const qrSize = 100 * scale;
                    doc.addImage(qr.createDataURL(4, 0), 'PNG', centerX - qrSize/2, y, qrSize, qrSize);
                    y += qrSize + 12 * scale;
                    doc.setFontSize(8 * scale).setFont('helvetica', 'normal');
                    doc.text('Scan to open shop drawing', centerX, y, { align: 'center' });
                }
                
                let footerY = height - 50 * scale;
                doc.setFontSize(10 * scale);
                doc.text(new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }), centerX, footerY, { align: 'center' });
                if (footerNotes?.trim()) {
                    doc.setFont('helvetica', 'italic').setFontSize(9 * scale);
                    doc.text(footerNotes.trim(), centerX, footerY - 15 * scale, { align: 'center' });
                }
            };

            // Filter Chip Component
            const FilterChip = ({ label, count, selected, onClick, color = 'blue' }) => {
                const colors = {
                    blue: selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400',
                    orange: selected ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400',
                    purple: selected ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400',
                    red: selected ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:border-red-400',
                    yellow: selected ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-400',
                    green: selected ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:border-green-400',
                    pink: selected ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-gray-700 border-gray-300 hover:border-pink-400',
                };
                return (
                    <button onClick={onClick} className={`px-3 py-1.5 rounded-full border text-sm font-medium flex items-center gap-1.5 transition ${colors[color]}`}>
                        {label}
                        {count !== undefined && <span className={`text-xs px-1.5 rounded-full ${selected ? 'bg-white/30' : 'bg-gray-200'}`}>{count}</span>}
                    </button>
                );
            };

            const difficultyColors = { 'PROTO': 'pink', 'STAIR': 'purple', '3HR': 'red', 'SW': 'orange', 'SHORT': 'yellow', 'DBL': 'blue', 'SAWBOX': 'green' };

            // Plate Preview Component
            const PlatePreview = ({ module, side }) => {
                if (!module) return <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">Select a module to preview</div>;
                const serial = module.serialNumber || '';
                const buildSeq = module.buildSequence || '';
                const blm = side === 'H' ? (module.hitchBLM || '') : (module.rearBLM || '');
                const unitType = module.hitchUnit || module.unitType || '';
                const indicators = getLicensePlateIndicators(module);
                const shopDrawingLinks = project.shopDrawingLinks || {};
                const shopDrawingUrl = shopDrawingLinks[blm] || '';
                return (
                    <div className="bg-white border-2 border-gray-400 rounded p-4 w-64 text-center mx-auto shadow-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
                        <div className="text-xs font-bold text-gray-700">PROJECT: {project.name.toUpperCase()}</div>
                        <div className="text-xs font-bold text-gray-700 mb-2">LOCATION: {(project.location || '').toUpperCase()}</div>
                        <div className="text-3xl font-bold text-gray-900">#{buildSeq}</div>
                        <div className="text-2xl font-bold text-gray-800 my-1">{serial}</div>
                        <div className="text-4xl font-bold my-2" style={{ color: 'var(--autovol-navy)' }}>({side}) - {blm}</div>
                        {indicators.length > 0 && <div className="text-red-600 font-bold text-sm my-1">{indicators.map(i => i.label).join('; ')}</div>}
                        <div className="text-xl font-bold text-gray-800 my-1">{String(unitType).toUpperCase()}</div>
                        {shopDrawingUrl ? (
                            <div className="my-3">
                                <div className="text-xs font-bold text-gray-600 mb-1">Shop Drawing Package Link</div>
                                <img src={generateQRCode(shopDrawingUrl)} className="w-20 h-20 mx-auto" alt="QR Code" />
                                <div className="text-xs text-gray-500 mt-1">Scan to open shop drawing</div>
                            </div>
                        ) : (
                            <div className="my-3 py-4 text-xs text-gray-400 italic">No shop drawing link</div>
                        )}
                        {footerNotes && <div className="text-xs italic text-gray-600 my-1">{footerNotes}</div>}
                        <div className="text-xs text-gray-500 border-t pt-2 mt-2">
                            <div>{new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}</div>
                        </div>
                    </div>
                );
            };

            return (
                <div className="fixed inset-0 bg-autovol-gray z-50 overflow-auto">
                    {/* Header */}
                    <div className="bg-autovol-navy text-white p-4 sticky top-0 z-10 shadow-lg">
                        <div className="max-w-7xl mx-auto flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={onClose} className="hover:bg-autovol-navy-light p-2 rounded flex items-center gap-1">
                                    <span>←</span> Back
                                </button>
                                <div>
                                    <h1 className="text-xl font-bold flex items-center gap-2">🏷️ License Plate Generator</h1>
                                    <p className="text-blue-200 text-sm">{project.name} • {modules.length} modules</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                            {/* Filters Column */}
                            <div className="lg:col-span-1 space-y-4">
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h3 className="font-bold text-autovol-navy mb-3">🏢 Building</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {filterOptions.buildings.length > 0 ? filterOptions.buildings.map(([building, count]) => (
                                            <FilterChip key={building} label={building} count={count} selected={buildingFilters.has(building)} onClick={() => toggleFilter(buildingFilters, setBuildingFilters, building)} color="blue" />
                                        )) : <p className="text-sm text-gray-500">No building data</p>}
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h3 className="font-bold text-autovol-navy mb-3">📋Š Level</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {filterOptions.levels.length > 0 ? filterOptions.levels.map(([level, count]) => (
                                            <FilterChip key={level} label={level} count={count} selected={levelFilters.has(level)} onClick={() => toggleFilter(levelFilters, setLevelFilters, level)} color="purple" />
                                        )) : <p className="text-sm text-gray-500">No level data</p>}
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h3 className="font-bold text-autovol-navy mb-3">⚠ Difficulty</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {filterOptions.difficulties.map(([diff, count]) => (
                                            <FilterChip key={diff} label={diff} count={count} selected={difficultyFilters.has(diff)} onClick={() => toggleFilter(difficultyFilters, setDifficultyFilters, diff)} color={difficultyColors[diff] || 'blue'} />
                                        ))}
                                    </div>
                                    {filterOptions.difficulties.length === 0 && <p className="text-sm text-gray-500">No difficulty indicators</p>}
                                </div>
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h3 className="font-bold text-autovol-navy mb-3">🏠 Unit Type</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {filterOptions.unitTypes.map(([type, count]) => (
                                            <FilterChip key={type} label={type} count={count} selected={unitTypeFilters.has(type)} onClick={() => toggleFilter(unitTypeFilters, setUnitTypeFilters, type)} color="green" />
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h3 className="font-bold text-autovol-navy mb-3">📢 Sequence Range</h3>
                                    <div className="flex items-center gap-2">
                                        <input type="number" placeholder="From" value={seqFrom} onChange={(e) => setSeqFrom(e.target.value)} className="w-20 border rounded px-2 py-1.5 text-sm" min="1" />
                                        <span className="text-gray-500">to</span>
                                        <input type="number" placeholder="To" value={seqTo} onChange={(e) => setSeqTo(e.target.value)} className="w-20 border rounded px-2 py-1.5 text-sm" min="1" />
                                    </div>
                                </div>
                                {hasActiveFilters && (
                                    <button onClick={clearFilters} className="w-full py-2 text-sm text-autovol-red hover:bg-red-50 rounded-lg border border-red-200 font-medium">
                                        ✕ Clear All Filters
                                    </button>
                                )}
                            </div>

                            {/* Module List */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-lg shadow">
                                    <div className="p-4 border-b">
                                        <div className="flex flex-wrap items-center gap-3 mb-3">
                                            <h3 className="font-bold text-autovol-navy">Modules</h3>
                                            <span className="text-sm text-gray-500">{filteredModules.length} of {modules.length} shown</span>
                                            <div className="flex-1" />
                                            <button onClick={selectAllFiltered} className="text-sm text-autovol-teal hover:underline font-medium">Select All</button>
                                            <button onClick={selectNone} className="text-sm text-gray-600 hover:underline font-medium">Select None</button>
                                        </div>
                                        <input type="text" placeholder="Search by serial, sequence, or unit type..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                                    </div>
                                    <div className="max-h-[500px] overflow-y-auto">
                                        {filteredModules.length === 0 ? (
                                            <div className="p-8 text-center text-gray-500">
                                                <div className="text-4xl mb-2">📍</div>
                                                <p>No modules match your filters</p>
                                                <button onClick={clearFilters} className="mt-2 text-autovol-teal hover:underline font-medium">Clear filters</button>
                                            </div>
                                        ) : (
                                            filteredModules.map((module) => {
                                                const idx = modules.indexOf(module);
                                                const isSelected = selectedModules.has(idx);
                                                const indicators = getLicensePlateIndicators(module);
                                                return (
                                                    <div key={idx} className={`p-3 border-b flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`} onClick={() => toggleModuleSelection(idx)}>
                                                        <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 rounded" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-gray-900">#{module.buildSequence}</span>
                                                                <span className="text-gray-700">{module.serialNumber}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                <span>{module.hitchUnit || module.unitType}</span>
                                                                <span>•</span>
                                                                <span>H:{module.hitchBLM}</span>
                                                                <span>R:{module.rearBLM}</span>
                                                            </div>
                                                            {indicators.length > 0 && (
                                                                <div className="flex gap-1 mt-1">
                                                                    {indicators.map((ind, i) => (
                                                                        <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">{ind.label}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button onClick={(e) => { e.stopPropagation(); setPreviewModule(module); }} className="p-2 text-gray-400 hover:text-autovol-teal hover:bg-teal-50 rounded" title="Preview">👁</button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Preview & Generate */}
                            <div className="lg:col-span-1 space-y-4">
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h3 className="font-bold text-autovol-navy mb-3">Preview</h3>
                                    <div className="flex justify-center gap-2 mb-4">
                                        <button onClick={() => setPreviewSide('H')} className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${previewSide === 'H' ? 'bg-autovol-navy text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Hitch (H)</button>
                                        <button onClick={() => setPreviewSide('R')} className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${previewSide === 'R' ? 'bg-autovol-navy text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Rear (R)</button>
                                    </div>
                                    <PlatePreview module={previewModule} side={previewSide} />
                                </div>
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h3 className="font-bold text-autovol-navy mb-3">PDF Settings</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Page Size</label>
                                            <select value={pageSize} onChange={(e) => setPageSize(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                                                {Object.entries(pageSizes).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Footer Notes</label>
                                            <textarea value={footerNotes} onChange={(e) => setFooterNotes(e.target.value)} placeholder="e.g., Rev 2, Updated 11/23..." className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} maxLength={100} />
                                            <p className="text-xs text-gray-500 mt-1">{footerNotes.length}/100</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg shadow p-4">
                                    <div className="bg-autovol-teal-light rounded-lg p-3 mb-4 text-sm">
                                        <div className="flex justify-between mb-1"><span className="text-gray-600">Selected Modules:</span><span className="font-bold text-gray-900">{selectedInFiltered}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-600">Total Pages:</span><span className="font-bold text-autovol-teal">{selectedInFiltered * 2}</span></div>
                                    </div>
                                    <button onClick={generatePDF} disabled={isGenerating || selectedInFiltered === 0} className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-colors ${isGenerating || selectedInFiltered === 0 ? 'bg-gray-400 cursor-not-allowed' : 'btn-primary'}`}>
                                        {isGenerating ? (<><span className="animate-spin">⏳</span>Generating...</>) : (<>📋„ Generate {selectedInFiltered * 2} Plates</>)}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Module Detail Modal
        function ModuleDetailModal({ module, project, projects, setProjects, onClose, editMode, setEditMode }) {
            const [editingModule, setEditingModule] = useState({ ...module });
            
            // Close on Escape key
            useEffect(() => {
                const handleEscapeKey = (e) => {
                    if (e.key === 'Escape') {
                        onClose();
                    }
                };
                document.addEventListener('keydown', handleEscapeKey);
                return () => document.removeEventListener('keydown', handleEscapeKey);
            }, [onClose]);

            const handleSave = () => {
                const updatedProjects = projects.map(p => {
                    if (p.id === project.id) {
                        return {
                            ...p,
                            modules: p.modules.map(m => m.id === module.id ? editingModule : m)
                        };
                    }
                    return p;
                });
                setProjects(updatedProjects);
                
                // DUAL-WRITE: When close-up hits 100%, update unified layer to "Ready for Yard"
                const closeUpProgress = editingModule.stageProgress?.['close-up'] || 0;
                const wasCloseUpComplete = module.stageProgress?.['close-up'] === 100;
                
                if (closeUpProgress === 100 && !wasCloseUpComplete) {
                    // Module just completed production - mark as Ready for Yard
                    console.log(`[MODA] Module ${editingModule.serialNumber} completed close-up - marking Ready for Yard`);
                    
                    // IMPORTANT: Save to localStorage IMMEDIATELY before sync
                    // React setState is async, so migrateFromProjects would read stale data
                    localStorage.setItem('autovol_projects', JSON.stringify(updatedProjects));
                    console.log(`[MODA] Saved project data to localStorage`);
                    
                    // Now sync to unified layer with fresh data
                    MODA_UNIFIED.migrateFromProjects();
                    
                    // Then update transport status to 'ready' (Ready for Yard)
                    MODA_UNIFIED.updateTransport(
                        editingModule.id,
                        { 
                            status: MODA_UNIFIED.TRANSPORT_STAGES.READY,
                            completedProductionAt: new Date().toISOString()
                        },
                        'station-board'
                    );
                    
                    console.log(`[MODA] Module ${editingModule.serialNumber} now in Yard phase - Ready for Transport`);
                }
                
                setEditMode(false);
                onClose();
            };

            const updateField = (field, value) => {
                setEditingModule(prev => ({ ...prev, [field]: value }));
            };

            const updateStageProgress = (stageId, value) => {
                setEditingModule(prev => ({
                    ...prev,
                    stageProgress: { ...prev.stageProgress, [stageId]: parseInt(value) }
                }));
            };

            const displayModule = editMode ? editingModule : module;

            const handleOpenShopDrawing = () => {
                const shopDrawingLinks = project?.shopDrawingLinks || {};
                const blmToCheck = [displayModule.hitchBLM, displayModule.rearBLM].filter(Boolean);
                let foundUrl = null;
                
                for (const blm of blmToCheck) {
                    if (shopDrawingLinks[blm]) {
                        foundUrl = shopDrawingLinks[blm];
                        break;
                    }
                }
                
                if (foundUrl) {
                    window.open(foundUrl, '_blank');
                } else {
                    const blmList = blmToCheck.length > 0 ? blmToCheck.join(', ') : 'No BLM';
                    alert(`Shop Drawing Not Found\n\nNo shop drawing link found for module ${displayModule.serialNumber} (BLM: ${blmList}).\n\nTo add shop drawing links, go to Projects → Edit Project → Shop Drawing Links.`);
                }
            };

            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-autovol-navy">{displayModule.serialNumber}</h2>
                                    <p className="text-gray-500">Build Sequence: {displayModule.buildSequence}</p>
                                </div>
                                <div className="flex gap-2">
                                    {editMode ? (
                                        <>
                                            <button onClick={handleSave} className="px-3 py-1 btn-secondary rounded">Save</button>
                                            <button onClick={() => { setEditMode(false); setEditingModule({ ...module }); }} className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Cancel</button>
                                        </>
                                    ) : (
                                        <button onClick={() => setEditMode(true)} className="px-3 py-1 btn-primary rounded">Edit</button>
                                    )}
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                                </div>
                            </div>
                            
                            {/* Shop Drawing Button */}
                            <div className="mb-6">
                                <button
                                    onClick={handleOpenShopDrawing}
                                    className="w-full py-3 bg-autovol-navy text-white rounded-lg font-medium hover:bg-autovol-navy-light transition flex items-center justify-center gap-2"
                                >
                                    <span>📐</span> Open Shop Drawing
                                </button>
                            </div>

                            {/* Dimensions */}
                            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <span className="text-sm text-gray-500">Width</span>
                                    {editMode ? (
                                        <input type="number" value={displayModule.moduleWidth} onChange={(e) => updateField('moduleWidth', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                    ) : (
                                        <p className="font-semibold">{displayModule.moduleWidth}'</p>
                                    )}
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Length</span>
                                    {editMode ? (
                                        <input type="number" value={displayModule.moduleLength} onChange={(e) => updateField('moduleLength', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                    ) : (
                                        <p className="font-semibold">{displayModule.moduleLength}'</p>
                                    )}
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Square Footage</span>
                                    {editMode ? (
                                        <input type="number" value={displayModule.squareFootage} onChange={(e) => updateField('squareFootage', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                    ) : (
                                        <p className="font-semibold">{displayModule.squareFootage ? parseFloat(displayModule.squareFootage).toFixed(2) : '—'} SF</p>
                                    )}
                                </div>
                            </div>

                            {/* HITCH Details */}
                            <div className="mb-4">
                                <h3 className="font-semibold text-gray-700 mb-2">HITCH Side</h3>
                                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
                                    <div>
                                        <span className="text-gray-500">BLM ID</span>
                                        {editMode ? (
                                            <input type="text" value={displayModule.hitchBLM || ''} onChange={(e) => updateField('hitchBLM', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                        ) : (
                                            <p className="font-medium">{displayModule.hitchBLM}</p>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Unit</span>
                                        {editMode ? (
                                            <input type="text" value={displayModule.hitchUnit || ''} onChange={(e) => updateField('hitchUnit', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                        ) : (
                                            <p className="font-medium">{displayModule.hitchUnit}</p>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Room</span>
                                        {editMode ? (
                                            <input type="text" value={displayModule.hitchRoom || ''} onChange={(e) => updateField('hitchRoom', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                        ) : (
                                            <p className="font-medium">{displayModule.hitchRoom}</p>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Room Type</span>
                                        {editMode ? (
                                            <input type="text" value={displayModule.hitchRoomType || ''} onChange={(e) => updateField('hitchRoomType', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                        ) : (
                                            <p className="font-medium">{displayModule.hitchRoomType}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* REAR Details */}
                            <div className="mb-4">
                                <h3 className="font-semibold text-gray-700 mb-2">REAR Side</h3>
                                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
                                    <div>
                                        <span className="text-gray-500">BLM ID</span>
                                        {editMode ? (
                                            <input type="text" value={displayModule.rearBLM || ''} onChange={(e) => updateField('rearBLM', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                        ) : (
                                            <p className="font-medium">{displayModule.rearBLM}</p>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Unit</span>
                                        {editMode ? (
                                            <input type="text" value={displayModule.rearUnit || ''} onChange={(e) => updateField('rearUnit', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                        ) : (
                                            <p className="font-medium">{displayModule.rearUnit}</p>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Room</span>
                                        {editMode ? (
                                            <input type="text" value={displayModule.rearRoom || ''} onChange={(e) => updateField('rearRoom', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                        ) : (
                                            <p className="font-medium">{displayModule.rearRoom}</p>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Room Type</span>
                                        {editMode ? (
                                            <input type="text" value={displayModule.rearRoomType || ''} onChange={(e) => updateField('rearRoomType', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                        ) : (
                                            <p className="font-medium">{displayModule.rearRoomType}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Difficulty Indicators */}
                            <div className="mb-4">
                                <h3 className="font-semibold text-gray-700 mb-2">Difficulty Indicators</h3>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(difficultyLabels).map(([key, label]) => (
                                        <label key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${
                                            displayModule.difficulties?.[key] ? difficultyColors[key] : 'bg-gray-100'
                                        }`}>
                                            <input
                                                type="checkbox"
                                                checked={displayModule.difficulties?.[key] || false}
                                                onChange={(e) => {
                                                    if (editMode) {
                                                        setEditingModule(prev => ({
                                                            ...prev,
                                                            difficulties: { ...prev.difficulties, [key]: e.target.checked }
                                                        }));
                                                    }
                                                }}
                                                disabled={!editMode}
                                                className="rounded"
                                            />
                                            <span className="text-sm">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Stage Progress */}
                            <div>
                                <h3 className="font-semibold text-gray-700 mb-2">Production Progress</h3>
                                <div className="space-y-2">
                                    {productionStages.map(stage => {
                                        const progress = displayModule.stageProgress?.[stage.id] || 0;
                                        return (
                                            <div key={stage.id} className="flex items-center gap-3">
                                                <span className="w-36 text-sm text-gray-600">{stage.name}</span>
                                                {editMode ? (
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        step="25"
                                                        value={progress}
                                                        onChange={(e) => updateStageProgress(stage.id, e.target.value)}
                                                        className="flex-1"
                                                    />
                                                ) : (
                                                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                                                        <div 
                                                            className={`h-3 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-autovol-teal'}`}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                )}
                                                <span className="w-10 text-right text-sm">{progress}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Import Modal Component
        function ImportModal({ onClose, onImport }) {
            const [dragActive, setDragActive] = useState(false);
            const [preview, setPreview] = useState(null);
            const [error, setError] = useState(null);

            const handleFile = (file) => {
                setError(null);
                
                if (!file) {
                    setError('No file selected');
                    return;
                }
                
                console.log('Processing file:', file.name, file.type, file.size);
                
                const reader = new FileReader();
                reader.onerror = () => {
                    setError('Error reading file');
                };
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        console.log('File loaded, size:', data.length);
                        
                        if (typeof XLSX === 'undefined') {
                            setError('Excel library not loaded. Please refresh the page.');
                            return;
                        }
                        
                        const workbook = XLSX.read(data, { type: 'array' });
                        console.log('Workbook sheets:', workbook.SheetNames);
                        
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                        console.log('Rows found:', jsonData.length);
                        console.log('First row (headers):', jsonData[0]);
                        
                        if (jsonData.length < 2) {
                            setError('File must have at least a header row and one data row');
                            return;
                        }

                        const headers = jsonData[0].map(h => String(h).toLowerCase().trim());
                        const modules = [];

                        for (let i = 1; i < jsonData.length; i++) {
                            const row = jsonData[i];
                            if (!row || row.length === 0 || !row[0]) continue;

                            const getVal = (keywords) => {
                                for (const keyword of keywords) {
                                    const idx = headers.findIndex(h => h.includes(keyword.toLowerCase()));
                                    if (idx !== -1 && row[idx] !== undefined) return row[idx];
                                }
                                return '';
                            };

                            modules.push({
                                serialNumber: getVal(['serial']) || row[0],
                                buildSequence: getVal(['build', 'sequence']) || i,
                                moduleWidth: parseFloat(getVal(['width'])) || 0,
                                moduleLength: parseFloat(getVal(['length'])) || 0,
                                squareFootage: parseFloat(getVal(['square', 'sf', 'footage'])) || 0,
                                hitchBLM: getVal(['hitch blm', 'hitch_blm']) || getVal(['blm']) || '',
                                hitchUnit: getVal(['hitch unit', 'hitch_unit']) || getVal(['unit']) || '',
                                hitchRoom: getVal(['hitch room', 'hitch_room']) || '',
                                hitchRoomType: getVal(['hitch room type', 'hitch_room_type', 'hitch type']) || '',
                                rearBLM: getVal(['rear blm', 'rear_blm']) || '',
                                rearUnit: getVal(['rear unit', 'rear_unit']) || '',
                                rearRoom: getVal(['rear room', 'rear_room']) || '',
                                rearRoomType: getVal(['rear room type', 'rear_room_type', 'rear type']) || '',
                                difficulties: {
                                    sidewall: String(getVal(['sidewall'])).toLowerCase() === 'x' || String(getVal(['sidewall'])).toLowerCase() === 'true',
                                    stair: String(getVal(['stair'])).toLowerCase() === 'x' || String(getVal(['stair'])).toLowerCase() === 'true',
                                    hr3Wall: String(getVal(['3hr', '3 hr', 'three hr'])).toLowerCase() === 'x' || String(getVal(['3hr'])).toLowerCase() === 'true',
                                    short: String(getVal(['short'])).toLowerCase() === 'x' || String(getVal(['short'])).toLowerCase() === 'true',
                                    doubleStudio: String(getVal(['double', 'dbl studio'])).toLowerCase() === 'x' || String(getVal(['double studio'])).toLowerCase() === 'true',
                                    sawbox: String(getVal(['sawbox'])).toLowerCase() === 'x' || String(getVal(['sawbox'])).toLowerCase() === 'true'
                                },
                                isPrototype: String(getVal(['proto', 'prototype'])).toLowerCase() === 'x' || String(getVal(['proto', 'prototype'])).toLowerCase() === 'true'
                            });
                        }

                        if (modules.length === 0) {
                            setError('No valid modules found in file. Make sure your file has data rows after the header.');
                            console.log('No modules parsed from file');
                            return;
                        }

                        console.log('Successfully parsed', modules.length, 'modules');
                        setPreview({ modules, headers: jsonData[0] });
                    } catch (err) {
                        console.error('Import error:', err);
                        setError('Error reading file: ' + err.message + '. Check browser console for details.');
                    }
                };
                reader.readAsArrayBuffer(file);
            };

            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Import Modules from Excel</h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                            </div>

                            {!preview ? (
                                <>
                                    <div
                                        className={`border-2 border-dashed rounded-lg p-12 text-center transition ${dragActive ? 'border-autovol-teal bg-autovol-teal-light' : 'border-gray-300'}`}
                                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                        onDragLeave={() => setDragActive(false)}
                                        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files[0]); }}
                                    >
                                        <p className="text-gray-600 mb-2">Drag and drop your Excel file here, or</p>
                                        <label className="inline-block px-4 py-2 btn-primary rounded-lg cursor-pointer">
                                            Browse Files
                                            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
                                        </label>
                                    </div>
                                    {error && <p className="text-red-600 mt-4">{error}</p>}
                                    
                                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                        <h3 className="font-semibold mb-2">Expected Columns:</h3>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                            <span>• Serial Number</span>
                                            <span>• Build Sequence</span>
                                            <span>• Module Width</span>
                                            <span>• Module Length</span>
                                            <span>• Square Footage</span>
                                            <span>• HITCH BLM ID</span>
                                            <span>• HITCH Unit</span>
                                            <span>• HITCH Room</span>
                                            <span>• HITCH Room Type</span>
                                            <span>• REAR BLM ID</span>
                                            <span>• REAR Unit</span>
                                            <span>• REAR Room</span>
                                            <span>• REAR Room Type</span>
                                            <span>• Sidewall (X)</span>
                                            <span>• Stair (X)</span>
                                            <span>• 3HR-Wall (X)</span>
                                            <span>• Short (X)</span>
                                            <span>• Double Studio (X)</span>
                                            <span>• Sawbox (X)</span>
                                            <span>• Proto (X)</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-green-800 font-medium">✓ Found {preview.modules.length} modules to import</p>
                                    </div>
                                    
                                    <div className="overflow-x-auto max-h-64 mb-4">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-100 sticky top-0">
                                                <tr>
                                                    <th className="px-2 py-1 text-left">Serial #</th>
                                                    <th className="px-2 py-1 text-left">Build Seq</th>
                                                    <th className="px-2 py-1 text-left">Dimensions</th>
                                                    <th className="px-2 py-1 text-left">Hitch BLM</th>
                                                    <th className="px-2 py-1 text-left">Unit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {preview.modules.slice(0, 10).map((m, i) => (
                                                    <tr key={i}>
                                                        <td className="px-2 py-1 font-medium">{m.serialNumber}</td>
                                                        <td className="px-2 py-1">{m.buildSequence}</td>
                                                        <td className="px-2 py-1">{m.moduleWidth}' x {m.moduleLength}'</td>
                                                        <td className="px-2 py-1">{m.hitchBLM}</td>
                                                        <td className="px-2 py-1">{m.hitchUnit}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {preview.modules.length > 10 && (
                                            <p className="text-sm text-gray-500 mt-2 text-center">...and {preview.modules.length - 10} more</p>
                                        )}
                                    </div>
                                    
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setPreview(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
                                        <button onClick={() => onImport(preview.modules)} className="px-4 py-2 btn-primary rounded-lg">Import {preview.modules.length} Modules</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // New Project Modal
        function NewProjectModal({ onClose, onSave }) {
            const [name, setName] = useState('');
            const [location, setLocation] = useState('');
            const [description, setDescription] = useState('');
            const [status, setStatus] = useState('Pre-Construction');
            const [sharepointSite, setSharepointSite] = useState('ProductDevelopmentAutovolPrefab');
            const [sharepointChannel, setSharepointChannel] = useState('');
            const [shopDrawingLinksText, setShopDrawingLinksText] = useState('');
            const [shopDrawingLinksError, setShopDrawingLinksError] = useState('');
            const [parsedLinksCount, setParsedLinksCount] = useState(0);
            
            // Parse shop drawing links from text input
            const parseShopDrawingLinks = (text) => {
                const links = {};
                const lines = text.split('\n').filter(line => line.trim());
                let errorMsg = '';
                
                for (const line of lines) {
                    // Support formats: "BLM, URL" or "BLM URL" or "BLM\tURL"
                    const parts = line.split(/[,\t]/).map(p => p.trim());
                    if (parts.length >= 2) {
                        const blm = parts[0];
                        const url = parts[1];
                        if (blm && url && url.startsWith('http')) {
                            links[blm] = url;
                        } else if (blm && !url.startsWith('http')) {
                            errorMsg = `Invalid URL for BLM "${blm}"`;
                        }
                    }
                }
                
                setShopDrawingLinksError(errorMsg);
                setParsedLinksCount(Object.keys(links).length);
                return links;
            };
            
            // Handle text change and parse
            const handleLinksTextChange = (text) => {
                setShopDrawingLinksText(text);
                parseShopDrawingLinks(text);
            };

            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">New Project</h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Building A - Phoenix"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="e.g., Phoenix, AZ"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Phase 1 residential units..."
                                        rows={2}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="Pre-Construction">Pre-Construction</option>
                                        <option value="Planned">Planned</option>
                                        <option value="Active">Active</option>
                                        <option value="Complete">Complete</option>
                                    </select>
                                </div>
                                
                                {/* SharePoint Integration */}
                                <div className="border-t pt-4 mt-4">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <span>📋</span> SharePoint Integration
                                        <span className="text-xs font-normal text-gray-500">(for Shop Drawings)</span>
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">SharePoint Site</label>
                                            <input
                                                type="text"
                                                value={sharepointSite}
                                                onChange={(e) => setSharepointSite(e.target.value)}
                                                placeholder="e.g., ProductDevelopmentAutovolPrefab"
                                                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Site name from SharePoint URL</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Teams Channel Folder</label>
                                            <input
                                                type="text"
                                                value={sharepointChannel}
                                                onChange={(e) => setSharepointChannel(e.target.value)}
                                                placeholder="e.g., Alvarado Creek - San Diego, CA (TPC)"
                                                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Exact channel name from Teams</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Shop Drawing Links */}
                                <div className="border-t pt-4 mt-4">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <span>📐</span> Shop Drawing Links
                                        <span className="text-xs font-normal text-gray-500">(optional)</span>
                                    </h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">BLM / URL Mapping</label>
                                        <textarea
                                            value={shopDrawingLinksText}
                                            onChange={(e) => handleLinksTextChange(e.target.value)}
                                            placeholder="B1L2M39, https://sharepoint.com/..."
                                            rows={4}
                                            className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <div className="flex justify-between mt-1">
                                            <p className="text-xs text-gray-500">Format: BLM, URL (comma or tab separated)</p>
                                            {parsedLinksCount > 0 && (
                                                <p className="text-xs text-green-600 font-medium">{parsedLinksCount} links parsed</p>
                                            )}
                                        </div>
                                        {shopDrawingLinksError && (
                                            <p className="text-xs text-red-600 mt-1">{shopDrawingLinksError}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 justify-end mt-6">
                                <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
                                <button 
                                    onClick={() => onSave({ 
                                        name, 
                                        location, 
                                        description, 
                                        status, 
                                        sharepointSite, 
                                        sharepointChannel,
                                        shopDrawingLinks: parseShopDrawingLinks(shopDrawingLinksText)
                                    })}
                                    disabled={!name || !location}
                                    className="px-4 py-2 btn-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Create Project
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // ============================================================================
        // EXTRACTED MODULES:
        // - PeopleModule.jsx (People directory, employee management)
        // - TransportModule.jsx (Transport board, yards, companies)
        // - EquipmentModule.jsx (Tools & equipment tracking)
        // ============================================================================

        function App() {
            const auth = useAuth();
            
            // If not logged in, show login page
            if (!auth.currentUser) {
                return <LoginPage auth={auth} />;
            }
            
            // If logged in, show dashboard
            return <Dashboard auth={auth} />;
        }

        ReactDOM.render(<App />, document.getElementById('root'));
        // ============================================================================
// EMERGENCY RECOVERY FUNCTION
// Accessible from browser console in case of lockout
// ============================================================================
window.MODA_EMERGENCY_ADMIN_RESTORE = function() {
    console.log('🚨 EMERGENCY ADMIN RESTORE INITIATED');
    
    // Restore Trevor as protected admin
    const users = JSON.parse(localStorage.getItem('autovol_users') || '[]');
    const trevor = users.find(u => 
        u.email === 'trevor@autovol.com' || 
        (u.firstName === 'Trevor' && u.lastName === 'Fletcher')
    );
    
    if (trevor) {
        trevor.dashboardRole = 'admin';
        trevor.isProtected = true;
        localStorage.setItem('autovol_users', JSON.stringify(users));
        console.log('✅ Trevor Fletcher restored as protected Admin');
        alert('✅ Admin access restored to Trevor Fletcher. Refreshing page...');
        window.location.reload();
    } else {
        console.error('❌ Trevor Fletcher not found in user records');
        alert('❌ Could not find Trevor Fletcher in user records');
    }
};

// Log system status
console.log('🛡️ MODA Dashboard Role System Loaded');
console.log('🛡️ Emergency recovery: MODA_EMERGENCY_ADMIN_RESTORE()');
console.log('🛡️ Trevor Fletcher account is protected');