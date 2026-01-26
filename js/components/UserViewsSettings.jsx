/**
 * UserViewsSettings.jsx - User Tab Visibility & Ordering Settings
 * 
 * Allows users to customize their navigation:
 * - Hide tabs they don't want to see (from their allowed tabs)
 * - Reorder tabs within each navigation group
 * - Reset to role defaults
 * 
 * Data is stored in Supabase profiles.user_tab_preferences
 */

function UserViewsSettings({ auth, onClose, onSave }) {
    const { useState, useEffect, useMemo, useCallback } = React;
    
    // Get user's allowed tabs (from role + any custom permissions)
    const allowedTabs = useMemo(() => {
        return window.getUserVisibleTabs ? window.getUserVisibleTabs() : [];
    }, []);
    
    // Navigation groups definition (same as NavigationGroups.jsx)
    const NAV_GROUPS = [
        {
            id: 'standalone',
            label: 'Main',
            tabs: [
                { id: 'executive', label: 'Executive', iconClass: 'icon-executive' },
                { id: 'home', label: 'Home', iconClass: 'icon-home' }
            ]
        },
        {
            id: 'operations',
            label: 'Operations',
            tabs: [
                { id: 'production', label: 'Production Board', iconClass: 'icon-production' },
                { id: 'tracker', label: 'Tracker', iconClass: 'icon-tracker' },
                { id: 'people', label: 'People', iconClass: 'icon-people' },
                { id: 'automation', label: 'Automation', iconClass: 'icon-automation' },
                { id: 'equipment', label: 'Tools & Equipment', iconClass: 'icon-equipment' },
                { id: 'supplychain', label: 'Supply Chain', iconClass: 'icon-supply-chain' }
            ]
        },
        {
            id: 'design',
            label: 'Projects',
            tabs: [
                { id: 'projects', label: 'Projects', iconClass: 'icon-projects' },
                { id: 'precon', label: 'Precon', iconClass: 'icon-precon' },
                { id: 'engineering', label: 'Engineering', iconClass: 'icon-engineering' },
                { id: 'drawings', label: 'Drawings', iconClass: 'icon-drawings' }
            ]
        },
        {
            id: 'quality-site',
            label: 'Quality & Site',
            tabs: [
                { id: 'qa', label: 'QA', iconClass: 'icon-qa' },
                { id: 'onsite', label: 'On-Site', iconClass: 'icon-onsite' }
            ]
        },
        {
            id: 'supply-logistics',
            label: 'Supply & Logistics',
            tabs: [
                { id: 'transport', label: 'Transport', iconClass: 'icon-transport' }
            ]
        },
        {
            id: 'admin',
            label: 'Administration',
            tabs: [
                { id: 'admin', label: 'Admin', iconClass: 'icon-admin' }
            ]
        }
    ];
    
    // State for preferences
    const [hiddenTabs, setHiddenTabs] = useState(new Set());
    const [tabOrder, setTabOrder] = useState({});
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    // Load existing preferences on mount
    useEffect(() => {
        const profile = window.MODA_SUPABASE?.userProfile;
        if (profile?.user_tab_preferences) {
            const prefs = profile.user_tab_preferences;
            if (prefs.hidden_tabs) {
                setHiddenTabs(new Set(prefs.hidden_tabs));
            }
            if (prefs.tab_order) {
                setTabOrder(prefs.tab_order);
            }
        }
    }, []);
    
    // Filter groups to only show tabs user has access to
    const visibleGroups = useMemo(() => {
        return NAV_GROUPS.map(group => ({
            ...group,
            tabs: group.tabs.filter(tab => allowedTabs.includes(tab.id))
        })).filter(group => group.tabs.length > 0);
    }, [allowedTabs]);
    
    // Get ordered tabs for a group
    const getOrderedTabs = useCallback((group) => {
        const groupOrder = tabOrder[group.id];
        if (!groupOrder || groupOrder.length === 0) {
            return group.tabs;
        }
        
        // Sort tabs by custom order, keeping unordered tabs at end
        const orderedTabs = [...group.tabs].sort((a, b) => {
            const aIndex = groupOrder.indexOf(a.id);
            const bIndex = groupOrder.indexOf(b.id);
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        });
        
        return orderedTabs;
    }, [tabOrder]);
    
    // Toggle tab visibility
    const toggleTabVisibility = (tabId) => {
        setHiddenTabs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(tabId)) {
                newSet.delete(tabId);
            } else {
                newSet.add(tabId);
            }
            return newSet;
        });
        setHasChanges(true);
    };
    
    // Move tab up within group
    const moveTabUp = (groupId, tabId) => {
        const group = visibleGroups.find(g => g.id === groupId);
        if (!group) return;
        
        const currentOrder = tabOrder[groupId] || group.tabs.map(t => t.id);
        const index = currentOrder.indexOf(tabId);
        if (index <= 0) return;
        
        const newOrder = [...currentOrder];
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
        
        setTabOrder(prev => ({ ...prev, [groupId]: newOrder }));
        setHasChanges(true);
    };
    
    // Move tab down within group
    const moveTabDown = (groupId, tabId) => {
        const group = visibleGroups.find(g => g.id === groupId);
        if (!group) return;
        
        const currentOrder = tabOrder[groupId] || group.tabs.map(t => t.id);
        const index = currentOrder.indexOf(tabId);
        if (index === -1 || index >= currentOrder.length - 1) return;
        
        const newOrder = [...currentOrder];
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        
        setTabOrder(prev => ({ ...prev, [groupId]: newOrder }));
        setHasChanges(true);
    };
    
    // Save preferences to Supabase
    const savePreferences = async () => {
        setSaving(true);
        setError(null);
        setSuccessMessage(null);
        
        try {
            const preferences = {
                hidden_tabs: Array.from(hiddenTabs),
                tab_order: tabOrder,
                updated_at: new Date().toISOString()
            };
            
            // Use the Supabase function to update preferences
            const result = await window.MODA_SUPABASE?.updateProfile({
                user_tab_preferences: preferences
            });
            
            if (result?.success) {
                setHasChanges(false);
                setSuccessMessage('Preferences saved successfully');
                
                // Notify parent to refresh navigation
                if (onSave) {
                    onSave(preferences);
                }
                
                // Dispatch event for navigation to update
                window.dispatchEvent(new CustomEvent('moda-tab-preferences-changed', { 
                    detail: preferences 
                }));
                
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setError(result?.error || 'Failed to save preferences');
            }
        } catch (err) {
            console.error('Error saving tab preferences:', err);
            setError(err.message || 'Failed to save preferences');
        } finally {
            setSaving(false);
        }
    };
    
    // Reset to defaults
    const resetToDefaults = async () => {
        if (!confirm('Reset all tab preferences to defaults? This will show all tabs in their default order.')) {
            return;
        }
        
        setSaving(true);
        setError(null);
        
        try {
            const result = await window.MODA_SUPABASE?.updateProfile({
                user_tab_preferences: null
            });
            
            if (result?.success) {
                setHiddenTabs(new Set());
                setTabOrder({});
                setHasChanges(false);
                setSuccessMessage('Preferences reset to defaults');
                
                if (onSave) {
                    onSave(null);
                }
                
                window.dispatchEvent(new CustomEvent('moda-tab-preferences-changed', { 
                    detail: null 
                }));
                
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                setError(result?.error || 'Failed to reset preferences');
            }
        } catch (err) {
            console.error('Error resetting tab preferences:', err);
            setError(err.message || 'Failed to reset preferences');
        } finally {
            setSaving(false);
        }
    };
    
    // Count visible tabs
    const visibleTabCount = useMemo(() => {
        return allowedTabs.filter(t => !hiddenTabs.has(t)).length;
    }, [allowedTabs, hiddenTabs]);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                            Customize Navigation
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Hide tabs or reorder them within each group
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Status Messages */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                            {successMessage}
                        </div>
                    )}
                    
                    {/* Summary */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm text-gray-600">Visible Tabs: </span>
                                <span className="font-semibold" style={{ color: 'var(--autovol-navy)' }}>
                                    {visibleTabCount} of {allowedTabs.length}
                                </span>
                            </div>
                            {hiddenTabs.size > 0 && (
                                <span className="text-xs text-amber-600">
                                    {hiddenTabs.size} tab{hiddenTabs.size !== 1 ? 's' : ''} hidden
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {/* Tab Groups */}
                    <div className="space-y-6">
                        {visibleGroups.map(group => (
                            <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Group Header */}
                                <div 
                                    className="px-4 py-3 font-semibold text-sm"
                                    style={{ 
                                        backgroundColor: 'var(--autovol-gray-bg)', 
                                        color: 'var(--autovol-navy)' 
                                    }}
                                >
                                    {group.label}
                                </div>
                                
                                {/* Tabs in Group */}
                                <div className="divide-y divide-gray-100">
                                    {getOrderedTabs(group).map((tab, index) => {
                                        const isHidden = hiddenTabs.has(tab.id);
                                        const orderedTabs = getOrderedTabs(group);
                                        const isFirst = index === 0;
                                        const isLast = index === orderedTabs.length - 1;
                                        
                                        return (
                                            <div 
                                                key={tab.id}
                                                className={`flex items-center gap-3 px-4 py-3 ${isHidden ? 'bg-gray-50 opacity-60' : ''}`}
                                            >
                                                {/* Visibility Toggle */}
                                                <button
                                                    onClick={() => toggleTabVisibility(tab.id)}
                                                    className={`w-8 h-8 rounded flex items-center justify-center transition ${
                                                        isHidden 
                                                            ? 'bg-gray-200 text-gray-500 hover:bg-gray-300' 
                                                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                                                    }`}
                                                    title={isHidden ? 'Show tab' : 'Hide tab'}
                                                >
                                                    {isHidden ? (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    )}
                                                </button>
                                                
                                                {/* Tab Icon & Label */}
                                                <div className="flex items-center gap-2 flex-1">
                                                    <span 
                                                        className={tab.iconClass} 
                                                        style={{ width: '18px', height: '18px', display: 'inline-block' }}
                                                    ></span>
                                                    <span className={`text-sm font-medium ${isHidden ? 'line-through text-gray-400' : ''}`} style={{ color: isHidden ? undefined : 'var(--autovol-navy)' }}>
                                                        {tab.label}
                                                    </span>
                                                </div>
                                                
                                                {/* Reorder Buttons */}
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => moveTabUp(group.id, tab.id)}
                                                        disabled={isFirst}
                                                        className={`w-7 h-7 rounded flex items-center justify-center transition ${
                                                            isFirst 
                                                                ? 'text-gray-300 cursor-not-allowed' 
                                                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                                        }`}
                                                        title="Move up"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => moveTabDown(group.id, tab.id)}
                                                        disabled={isLast}
                                                        className={`w-7 h-7 rounded flex items-center justify-center transition ${
                                                            isLast 
                                                                ? 'text-gray-300 cursor-not-allowed' 
                                                                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                                        }`}
                                                        title="Move down"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Help Text */}
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                        <strong>Tip:</strong> Hidden tabs are still accessible via direct URL. 
                        Your role determines which tabs you can access - this only controls what appears in your navigation.
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
                    <button
                        onClick={resetToDefaults}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                    >
                        Reset to Defaults
                    </button>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={savePreferences}
                            disabled={saving || !hasChanges}
                            className="px-6 py-2 text-sm font-medium text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ 
                                backgroundColor: hasChanges ? 'var(--autovol-teal)' : 'var(--autovol-gray)',
                            }}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Export for use
window.UserViewsSettings = UserViewsSettings;
