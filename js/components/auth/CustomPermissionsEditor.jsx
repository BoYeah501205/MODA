// ============================================================================
// MODA Custom Permissions Editor
// Admin UI for managing per-user tab permission overrides
// ============================================================================

const { useState, useEffect, useCallback } = React;

// All available tabs for permission matrix
const PERMISSION_TABS = [
    { id: 'executive', label: 'Executive', icon: 'icon-executive' },
    { id: 'production', label: 'Production', icon: 'icon-production' },
    { id: 'projects', label: 'Projects', icon: 'icon-projects' },
    { id: 'people', label: 'People', icon: 'icon-people' },
    { id: 'qa', label: 'QA', icon: 'icon-qa' },
    { id: 'transport', label: 'Transport', icon: 'icon-transport' },
    { id: 'equipment', label: 'Equipment', icon: 'icon-equipment' },
    { id: 'onsite', label: 'On-Site', icon: 'icon-onsite' },
    { id: 'engineering', label: 'Engineering', icon: 'icon-engineering' },
    { id: 'automation', label: 'Automation', icon: 'icon-automation' },
    { id: 'tracker', label: 'Tracker', icon: 'icon-tracker' },
    { id: 'admin', label: 'Admin', icon: 'icon-admin' }
];

// Special features that can have permissions
const SPECIAL_FEATURES = [
    { id: 'schedule_setup', label: 'Schedule Setup', parentTab: 'production' },
    { id: 'weekly_board', label: 'Weekly Board', parentTab: 'production' },
    { id: 'station_stagger', label: 'Station Stagger', parentTab: 'production' }
];

function CustomPermissionsEditor({ userId, userEmail, userName, userRole, onClose, onSave }) {
    const [customPermissions, setCustomPermissions] = useState({});
    const [originalPermissions, setOriginalPermissions] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);

    // Load user's current custom permissions
    useEffect(() => {
        const loadPermissions = async () => {
            if (!userId) return;
            
            setIsLoading(true);
            setError(null);
            
            try {
                const result = await window.MODA_SUPABASE.getUserCustomPermissions(userId);
                if (result.success) {
                    const perms = result.customPermissions || {};
                    setCustomPermissions(perms);
                    setOriginalPermissions(JSON.stringify(perms));
                } else {
                    setError(result.error);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadPermissions();
    }, [userId]);

    // Track changes
    useEffect(() => {
        if (originalPermissions !== null) {
            setHasChanges(JSON.stringify(customPermissions) !== originalPermissions);
        }
    }, [customPermissions, originalPermissions]);

    // Toggle a permission for a tab
    const togglePermission = useCallback((tabId, permission) => {
        setCustomPermissions(prev => {
            const current = prev[tabId] || { canView: false, canEdit: false, canCreate: false, canDelete: false };
            const newPerms = { ...current, [permission]: !current[permission] };
            
            // If all permissions are false, remove the tab entry
            const allFalse = !newPerms.canView && !newPerms.canEdit && !newPerms.canCreate && !newPerms.canDelete;
            
            if (allFalse) {
                const { [tabId]: removed, ...rest } = prev;
                return rest;
            }
            
            return { ...prev, [tabId]: newPerms };
        });
    }, []);

    // Clear all custom permissions
    const handleClearAll = useCallback(() => {
        if (confirm('Clear all custom permissions? User will revert to role-based defaults.')) {
            setCustomPermissions({});
        }
    }, []);

    // Save permissions to Supabase
    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        
        try {
            // If no custom permissions, pass null to clear
            const permsToSave = Object.keys(customPermissions).length === 0 ? null : customPermissions;
            
            const result = await window.MODA_SUPABASE.updateUserCustomPermissions(userId, permsToSave);
            
            if (result.success) {
                setOriginalPermissions(JSON.stringify(customPermissions));
                setHasChanges(false);
                if (onSave) onSave(result.user);
                if (onClose) onClose();
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Get permission value (with fallback to false)
    const getPermission = (tabId, permission) => {
        return customPermissions[tabId]?.[permission] || false;
    };

    // Check if tab has any custom permissions set
    const hasCustomForTab = (tabId) => {
        return customPermissions[tabId] !== undefined;
    };

    if (isLoading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>Loading permissions...</div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px',
                paddingBottom: '15px',
                borderBottom: '2px solid #E5E7EB'
            }}>
                <div>
                    <h3 style={{ margin: 0, color: 'var(--autovol-navy)', fontSize: '18px' }}>
                        Custom Permissions
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B7280' }}>
                        {userName || userEmail} ({userRole})
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {Object.keys(customPermissions).length > 0 && (
                        <button
                            onClick={handleClearAll}
                            style={{
                                padding: '8px 16px',
                                fontSize: '13px',
                                border: '1px solid #EF4444',
                                borderRadius: '6px',
                                background: 'white',
                                color: '#EF4444',
                                cursor: 'pointer'
                            }}
                        >
                            Clear All
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            style={{
                                padding: '8px 16px',
                                fontSize: '13px',
                                border: '1px solid #D1D5DB',
                                borderRadius: '6px',
                                background: 'white',
                                color: '#374151',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>

            {/* Info Banner */}
            <div style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '6px',
                padding: '12px 16px',
                marginBottom: '20px',
                fontSize: '13px',
                color: '#1E40AF'
            }}>
                <strong>How it works:</strong> Custom permissions override the user's role defaults. 
                Only set permissions for tabs you want to customize. Unchecked tabs will use role defaults.
            </div>

            {/* Error Display */}
            {error && (
                <div style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    marginBottom: '20px',
                    fontSize: '13px',
                    color: '#DC2626'
                }}>
                    {error}
                </div>
            )}

            {/* Permission Matrix */}
            <div style={{ 
                border: '2px solid #E5E7EB', 
                borderRadius: '8px', 
                overflow: 'hidden',
                marginBottom: '20px'
            }}>
                {/* Header Row */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 70px 70px 70px 70px',
                    background: '#F3F4F6',
                    borderBottom: '2px solid #E5E7EB',
                    fontWeight: '600',
                    fontSize: '12px',
                    color: 'var(--autovol-navy)'
                }}>
                    <div style={{ padding: '12px 16px' }}>Tab / Feature</div>
                    <div style={{ padding: '12px 8px', textAlign: 'center' }}>View</div>
                    <div style={{ padding: '12px 8px', textAlign: 'center' }}>Edit</div>
                    <div style={{ padding: '12px 8px', textAlign: 'center' }}>Create</div>
                    <div style={{ padding: '12px 8px', textAlign: 'center' }}>Delete</div>
                </div>

                {/* Main Tabs */}
                {PERMISSION_TABS.map((tab, index) => (
                    <div 
                        key={tab.id}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 70px 70px 70px 70px',
                            borderBottom: '1px solid #E5E7EB',
                            background: hasCustomForTab(tab.id) 
                                ? '#FEF3C7' 
                                : (index % 2 === 0 ? 'white' : '#FAFAFA')
                        }}
                    >
                        <div style={{ 
                            padding: '10px 16px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            color: 'var(--autovol-navy)',
                            fontWeight: '500',
                            fontSize: '13px'
                        }}>
                            <span className={tab.icon} style={{ width: '16px', height: '16px', opacity: 0.7 }}></span>
                            {tab.label}
                            {hasCustomForTab(tab.id) && (
                                <span style={{ 
                                    fontSize: '10px', 
                                    background: '#F59E0B', 
                                    color: 'white',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: '600'
                                }}>
                                    CUSTOM
                                </span>
                            )}
                        </div>
                        {['canView', 'canEdit', 'canCreate', 'canDelete'].map(perm => (
                            <div key={perm} style={{ padding: '10px 8px', textAlign: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={getPermission(tab.id, perm)}
                                    onChange={() => togglePermission(tab.id, perm)}
                                    style={{ 
                                        width: '18px', 
                                        height: '18px', 
                                        cursor: 'pointer',
                                        accentColor: perm === 'canDelete' ? '#EF4444' : 'var(--autovol-teal)'
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                ))}

                {/* Special Features Section */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 70px 70px 70px 70px',
                    background: '#E0F2FE',
                    borderBottom: '1px solid #E5E7EB',
                    fontWeight: '600',
                    fontSize: '12px',
                    color: '#0369A1'
                }}>
                    <div style={{ padding: '10px 16px' }}>Special Features</div>
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                </div>

                {SPECIAL_FEATURES.map((feature, index) => (
                    <div 
                        key={feature.id}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 70px 70px 70px 70px',
                            borderBottom: '1px solid #E5E7EB',
                            background: hasCustomForTab(feature.id) 
                                ? '#FEF3C7' 
                                : (index % 2 === 0 ? '#F0F9FF' : '#E0F2FE')
                        }}
                    >
                        <div style={{ 
                            padding: '10px 16px', 
                            paddingLeft: '32px',
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            color: '#0369A1',
                            fontWeight: '500',
                            fontSize: '13px'
                        }}>
                            {feature.label}
                            <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: '400' }}>
                                ({feature.parentTab})
                            </span>
                            {hasCustomForTab(feature.id) && (
                                <span style={{ 
                                    fontSize: '10px', 
                                    background: '#F59E0B', 
                                    color: 'white',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: '600'
                                }}>
                                    CUSTOM
                                </span>
                            )}
                        </div>
                        {['canView', 'canEdit', 'canCreate', 'canDelete'].map(perm => (
                            <div key={perm} style={{ padding: '10px 8px', textAlign: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={getPermission(feature.id, perm)}
                                    onChange={() => togglePermission(feature.id, perm)}
                                    style={{ 
                                        width: '18px', 
                                        height: '18px', 
                                        cursor: 'pointer',
                                        accentColor: perm === 'canDelete' ? '#EF4444' : '#0EA5E9'
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Summary */}
            {Object.keys(customPermissions).length > 0 && (
                <div style={{
                    background: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    marginBottom: '20px',
                    fontSize: '13px',
                    color: '#92400E'
                }}>
                    <strong>Custom overrides active:</strong> {Object.keys(customPermissions).join(', ')}
                </div>
            )}

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                {hasChanges && (
                    <span style={{ 
                        fontSize: '12px', 
                        color: '#F59E0B', 
                        alignSelf: 'center',
                        fontStyle: 'italic'
                    }}>
                        Unsaved changes
                    </span>
                )}
                <button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges}
                    style={{
                        padding: '10px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        border: 'none',
                        borderRadius: '6px',
                        background: hasChanges ? 'var(--autovol-teal)' : '#D1D5DB',
                        color: 'white',
                        cursor: hasChanges ? 'pointer' : 'not-allowed',
                        opacity: isSaving ? 0.7 : 1
                    }}
                >
                    {isSaving ? 'Saving...' : 'Save Custom Permissions'}
                </button>
            </div>
        </div>
    );
}

// Export for global access
window.CustomPermissionsEditor = CustomPermissionsEditor;
