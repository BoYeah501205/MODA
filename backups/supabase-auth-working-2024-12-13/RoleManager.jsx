// ============================================================================
// MODA DASHBOARD ROLE MANAGER
// Extracted from App.jsx for better maintainability
// ============================================================================

const { useState } = React;

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

// Export for use in App.jsx
window.DashboardRoleManager = DashboardRoleManager;
window.RoleEditModal = RoleEditModal;
window.DeleteConfirmModal = DeleteConfirmModal;

