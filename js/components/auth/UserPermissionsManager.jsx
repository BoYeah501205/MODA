// ============================================================================
// MODA User Permissions Manager
// Admin UI for viewing users and managing their custom permissions
// ============================================================================

const { useState, useEffect, useCallback } = React;

const USERS_PER_PAGE = 10;

function UserPermissionsManager({ auth }) {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [savingRoleFor, setSavingRoleFor] = useState(null);

    // Get all available dashboard roles
    const allDashboardRoles = window.DEFAULT_DASHBOARD_ROLES || [
        { id: 'admin', name: 'Admin' },
        { id: 'executive', name: 'Executive' },
        { id: 'production_management', name: 'Production Management' },
        { id: 'production_supervisor', name: 'Production Supervisor' },
        { id: 'department-supervisor', name: 'Department Supervisor' },
        { id: 'coordinator', name: 'Coordinator' },
        { id: 'employee', name: 'Employee' }
    ];

    // Load users from Supabase
    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const result = await window.MODA_SUPABASE.getAllUsers();
            if (result.success) {
                setUsers(result.users || []);
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    // Filter users
    const filteredUsers = users.filter(user => {
        const matchesSearch = !searchTerm || 
            (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.dashboard_role === filterRole;
        return matchesSearch && matchesRole;
    });

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
    const startIndex = (currentPage - 1) * USERS_PER_PAGE;
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterRole]);

    // Get unique roles for filter dropdown
    const uniqueRoles = [...new Set(users.map(u => u.dashboard_role).filter(Boolean))];

    // Handle user selection for editing
    const handleEditPermissions = (user) => {
        if (user.is_protected) {
            alert('Cannot modify permissions for protected users.');
            return;
        }
        setSelectedUser(user);
    };

    // Handle save from CustomPermissionsEditor
    const handleSavePermissions = (updatedUser) => {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        setSelectedUser(null);
    };

    // Handle role change from dropdown
    const handleRoleChange = async (userId, newRole) => {
        const user = users.find(u => u.id === userId);
        if (!user || user.is_protected) return;
        
        setSavingRoleFor(userId);
        try {
            const result = await window.MODA_SUPABASE?.updateUserRole(userId, newRole);
            if (result?.success) {
                setUsers(prev => prev.map(u => 
                    u.id === userId ? { ...u, dashboard_role: newRole } : u
                ));
                console.log('[UserPermissions] Role updated:', userId, '->', newRole);
            } else {
                console.error('[UserPermissions] Failed to update role:', result?.error);
                alert('Failed to update role: ' + (result?.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('[UserPermissions] Error updating role:', err);
            alert('Error updating role: ' + err.message);
        } finally {
            setSavingRoleFor(null);
        }
    };

    // Check if user has custom permissions
    const hasCustomPermissions = (user) => {
        return user.custom_tab_permissions != null && 
               Object.keys(user.custom_tab_permissions).length > 0;
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center py-8">
                    <div className="text-gray-500">Loading users...</div>
                </div>
            </div>
        );
    }

    // Show CustomPermissionsEditor modal when user is selected
    if (selectedUser) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <window.CustomPermissionsEditor
                    userId={selectedUser.id}
                    userEmail={selectedUser.email}
                    userName={selectedUser.name}
                    userRole={selectedUser.dashboard_role}
                    onClose={() => setSelectedUser(null)}
                    onSave={handleSavePermissions}
                />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            {/* Header */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px'
            }}>
                <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--autovol-navy)', margin: 0 }}>
                        User Permissions
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B7280' }}>
                        Manage custom tab permissions for individual users
                    </p>
                </div>
                <button
                    onClick={loadUsers}
                    style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        background: 'white',
                        color: '#374151',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <span className="icon-refresh" style={{ width: '14px', height: '14px' }}></span>
                    Refresh
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    color: '#DC2626'
                }}>
                    {error}
                </div>
            )}

            {/* Filters */}
            <div style={{ 
                display: 'flex', 
                gap: '12px', 
                marginBottom: '16px',
                flexWrap: 'wrap'
            }}>
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        flex: '1',
                        minWidth: '200px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px'
                    }}
                />
                <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        fontSize: '13px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        background: 'white',
                        minWidth: '150px'
                    }}
                >
                    <option value="all">All Roles</option>
                    {uniqueRoles.map(role => (
                        <option key={role} value={role}>{role}</option>
                    ))}
                </select>
            </div>

            {/* Info Banner */}
            <div style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '6px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '12px',
                color: '#166534'
            }}>
                <strong>Tip:</strong> Custom permissions override role defaults. 
                Users with custom permissions show a yellow badge.
            </div>

            {/* Users Table */}
            <div style={{ 
                border: '1px solid #E5E7EB', 
                borderRadius: '8px', 
                overflow: 'hidden' 
            }}>
                {/* Table Header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 120px',
                    background: '#F9FAFB',
                    borderBottom: '1px solid #E5E7EB',
                    fontWeight: '600',
                    fontSize: '12px',
                    color: 'var(--autovol-navy)'
                }}>
                    <div style={{ padding: '12px 16px' }}>User</div>
                    <div style={{ padding: '12px 16px' }}>Role</div>
                    <div style={{ padding: '12px 16px' }}>Status</div>
                    <div style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</div>
                </div>

                {/* Table Body */}
                {paginatedUsers.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
                        No users found
                    </div>
                ) : (
                    paginatedUsers.map((user, index) => (
                        <div 
                            key={user.id}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr 120px',
                                borderBottom: index < paginatedUsers.length - 1 ? '1px solid #E5E7EB' : 'none',
                                background: index % 2 === 0 ? 'white' : '#FAFAFA',
                                alignItems: 'center'
                            }}
                        >
                            {/* User Info */}
                            <div style={{ padding: '12px 16px' }}>
                                <div style={{ 
                                    fontWeight: '500', 
                                    color: 'var(--autovol-navy)',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    {user.name || user.email?.split('@')[0] || 'Unknown'}
                                    {user.is_protected && (
                                        <span style={{ 
                                            fontSize: '10px', 
                                            background: '#3B82F6', 
                                            color: 'white',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontWeight: '600'
                                        }}>
                                            PROTECTED
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                                    {user.email}
                                </div>
                            </div>

                            {/* Role - Editable Dropdown */}
                            <div style={{ padding: '12px 16px' }}>
                                {user.is_protected ? (
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '4px 10px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        borderRadius: '4px',
                                        background: '#DBEAFE',
                                        color: '#1E40AF'
                                    }}>
                                        {user.dashboard_role || 'admin'}
                                    </span>
                                ) : (
                                    <select
                                        value={user.dashboard_role || 'employee'}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        disabled={savingRoleFor === user.id}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: '12px',
                                            border: '1px solid #D1D5DB',
                                            borderRadius: '4px',
                                            background: savingRoleFor === user.id ? '#F3F4F6' : 'white',
                                            color: '#374151',
                                            cursor: savingRoleFor === user.id ? 'wait' : 'pointer',
                                            minWidth: '120px'
                                        }}
                                    >
                                        {allDashboardRoles.filter(r => r.id !== 'no-access').map(role => (
                                            <option key={role.id} value={role.id}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Custom Permissions Status */}
                            <div style={{ padding: '12px 16px' }}>
                                {hasCustomPermissions(user) ? (
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '4px 10px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        borderRadius: '4px',
                                        background: '#FEF3C7',
                                        color: '#92400E'
                                    }}>
                                        <span style={{ 
                                            width: '6px', 
                                            height: '6px', 
                                            borderRadius: '50%', 
                                            background: '#F59E0B' 
                                        }}></span>
                                        Custom
                                    </span>
                                ) : (
                                    <span style={{
                                        fontSize: '12px',
                                        color: '#9CA3AF'
                                    }}>
                                        Role defaults
                                    </span>
                                )}
                            </div>

                            {/* Actions */}
                            <div style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <button
                                    onClick={() => handleEditPermissions(user)}
                                    disabled={user.is_protected}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        border: '1px solid',
                                        borderColor: user.is_protected ? '#E5E7EB' : 'var(--autovol-teal)',
                                        borderRadius: '4px',
                                        background: 'white',
                                        color: user.is_protected ? '#9CA3AF' : 'var(--autovol-teal)',
                                        cursor: user.is_protected ? 'not-allowed' : 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    {hasCustomPermissions(user) ? 'Edit' : 'Customize'}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ 
                    marginTop: '16px', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '4px',
                            background: 'white',
                            color: currentPage === 1 ? '#9CA3AF' : '#374151',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Previous
                    </button>
                    
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(page => {
                                // Show first, last, current, and adjacent pages
                                return page === 1 || 
                                       page === totalPages || 
                                       Math.abs(page - currentPage) <= 1;
                            })
                            .map((page, idx, arr) => (
                                <React.Fragment key={page}>
                                    {idx > 0 && arr[idx - 1] !== page - 1 && (
                                        <span style={{ padding: '6px 4px', color: '#9CA3AF' }}>...</span>
                                    )}
                                    <button
                                        onClick={() => setCurrentPage(page)}
                                        style={{
                                            padding: '6px 10px',
                                            fontSize: '12px',
                                            border: '1px solid',
                                            borderColor: currentPage === page ? 'var(--autovol-teal)' : '#D1D5DB',
                                            borderRadius: '4px',
                                            background: currentPage === page ? 'var(--autovol-teal)' : 'white',
                                            color: currentPage === page ? 'white' : '#374151',
                                            cursor: 'pointer',
                                            fontWeight: currentPage === page ? '600' : '400'
                                        }}
                                    >
                                        {page}
                                    </button>
                                </React.Fragment>
                            ))
                        }
                    </div>
                    
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '4px',
                            background: 'white',
                            color: currentPage === totalPages ? '#9CA3AF' : '#374151',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Summary */}
            <div style={{ 
                marginTop: '16px', 
                fontSize: '12px', 
                color: '#6B7280',
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <span>
                    Showing {startIndex + 1}-{Math.min(startIndex + USERS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
                    {filteredUsers.length !== users.length && ` (${users.length} total)`}
                </span>
                <span>
                    {users.filter(hasCustomPermissions).length} with custom permissions
                </span>
            </div>
        </div>
    );
}

// Export for global access
window.UserPermissionsManager = UserPermissionsManager;
