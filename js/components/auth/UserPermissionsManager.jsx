// ============================================================================
// MODA User Permissions Manager
// Admin UI for viewing users and managing their custom permissions
// ============================================================================

const { useState, useEffect, useCallback } = React;

function UserPermissionsManager({ auth }) {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');

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
                {filteredUsers.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280' }}>
                        No users found
                    </div>
                ) : (
                    filteredUsers.map((user, index) => (
                        <div 
                            key={user.id}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '2fr 1fr 1fr 120px',
                                borderBottom: index < filteredUsers.length - 1 ? '1px solid #E5E7EB' : 'none',
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

                            {/* Role */}
                            <div style={{ padding: '12px 16px' }}>
                                <span style={{
                                    display: 'inline-block',
                                    padding: '4px 10px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    borderRadius: '4px',
                                    background: user.dashboard_role === 'admin' ? '#DBEAFE' : '#F3F4F6',
                                    color: user.dashboard_role === 'admin' ? '#1E40AF' : '#374151'
                                }}>
                                    {user.dashboard_role || 'employee'}
                                </span>
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

            {/* Summary */}
            <div style={{ 
                marginTop: '16px', 
                fontSize: '12px', 
                color: '#6B7280',
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <span>
                    Showing {filteredUsers.length} of {users.length} users
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
