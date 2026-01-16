/**
 * Issue Types Manager for MODA
 * 
 * Admin component to manage issue types and their routing.
 * Types are stored in Supabase and used throughout the issue tracking system.
 * Includes export functionality for reporting.
 */

const { useState, useEffect, useCallback } = React;

// Default issue types (used as fallback and initial seed)
const DEFAULT_ISSUE_TYPES = [
    { id: 'shop-drawing', label: 'Shop Drawing', color: '#0057B8', dashboard: 'engineering', is_active: true },
    { id: 'design-conflict', label: 'Design Conflict', color: '#7C3AED', dashboard: 'engineering', is_active: true },
    { id: 'material-supply', label: 'Material/Supply', color: '#EA580C', dashboard: 'supply-chain', is_active: true },
    { id: 'quality', label: 'Quality Issue', color: '#DC2626', dashboard: 'qa', is_active: true },
    { id: 'engineering-question', label: 'Engineering Question', color: '#0891B2', dashboard: 'engineering', is_active: true },
    { id: 'rfi', label: 'RFI Required', color: '#4F46E5', dashboard: 'rfi', is_active: true },
    { id: 'other', label: 'Other', color: '#6B7280', dashboard: 'engineering', is_active: true }
];

const DASHBOARD_OPTIONS = [
    { id: 'engineering', label: 'Engineering' },
    { id: 'supply-chain', label: 'Supply Chain' },
    { id: 'qa', label: 'QA' },
    { id: 'rfi', label: 'RFI' }
];

function IssueTypesManager({ auth }) {
    const [issueTypes, setIssueTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [editingType, setEditingType] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newType, setNewType] = useState({ 
        id: '', 
        label: '', 
        color: '#6B7280', 
        dashboard: 'engineering',
        is_active: true 
    });

    // Load issue types from Supabase
    const loadIssueTypes = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const supabase = window.MODA_SUPABASE?.client;
            if (!supabase) {
                // Fallback to localStorage or defaults
                const saved = localStorage.getItem('moda_issue_types');
                if (saved) {
                    setIssueTypes(JSON.parse(saved));
                } else {
                    setIssueTypes(DEFAULT_ISSUE_TYPES);
                    localStorage.setItem('moda_issue_types', JSON.stringify(DEFAULT_ISSUE_TYPES));
                }
                setLoading(false);
                return;
            }

            const { data, error: fetchError } = await supabase
                .from('issue_types')
                .select('*')
                .order('sort_order');

            if (fetchError) {
                // Table might not exist yet - use defaults
                if (fetchError.code === '42P01') {
                    console.log('[IssueTypesManager] Table does not exist, using defaults');
                    setIssueTypes(DEFAULT_ISSUE_TYPES);
                    localStorage.setItem('moda_issue_types', JSON.stringify(DEFAULT_ISSUE_TYPES));
                } else {
                    throw fetchError;
                }
            } else {
                const types = data && data.length > 0 ? data : DEFAULT_ISSUE_TYPES;
                setIssueTypes(types);
                localStorage.setItem('moda_issue_types', JSON.stringify(types));
            }
        } catch (err) {
            console.error('[IssueTypesManager] Error loading issue types:', err);
            setError('Failed to load issue types. Using cached data.');
            const saved = localStorage.getItem('moda_issue_types');
            setIssueTypes(saved ? JSON.parse(saved) : DEFAULT_ISSUE_TYPES);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadIssueTypes();
    }, [loadIssueTypes]);

    // Generate ID from label
    const generateId = (label) => {
        return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    };

    // Add new issue type
    const handleAddType = async () => {
        if (!newType.label.trim()) {
            setError('Issue type name is required');
            return;
        }

        const typeId = newType.id || generateId(newType.label);
        
        // Check for duplicate ID
        if (issueTypes.some(t => t.id === typeId)) {
            setError('An issue type with this ID already exists');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const typeData = {
                id: typeId,
                label: newType.label.trim(),
                color: newType.color,
                dashboard: newType.dashboard,
                is_active: true,
                sort_order: issueTypes.length + 1,
                created_at: new Date().toISOString()
            };

            const supabase = window.MODA_SUPABASE?.client;
            if (supabase) {
                const { error: insertError } = await supabase
                    .from('issue_types')
                    .insert(typeData);

                if (insertError && insertError.code !== '42P01') {
                    throw insertError;
                }
            }

            // Update local state
            const updated = [...issueTypes, typeData];
            setIssueTypes(updated);
            localStorage.setItem('moda_issue_types', JSON.stringify(updated));
            
            // Update global routing
            updateGlobalRouting(updated);

            setNewType({ id: '', label: '', color: '#6B7280', dashboard: 'engineering', is_active: true });
            setShowAddForm(false);
            setSuccessMessage('Issue type added successfully');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error('[IssueTypesManager] Error adding type:', err);
            setError('Failed to add issue type: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Update existing issue type
    const handleUpdateType = async (typeId, updates) => {
        setSaving(true);
        setError(null);

        try {
            const supabase = window.MODA_SUPABASE?.client;
            if (supabase) {
                const { error: updateError } = await supabase
                    .from('issue_types')
                    .update(updates)
                    .eq('id', typeId);

                if (updateError && updateError.code !== '42P01') {
                    throw updateError;
                }
            }

            // Update local state
            const updated = issueTypes.map(t => t.id === typeId ? { ...t, ...updates } : t);
            setIssueTypes(updated);
            localStorage.setItem('moda_issue_types', JSON.stringify(updated));
            
            // Update global routing
            updateGlobalRouting(updated);

            setEditingType(null);
            setSuccessMessage('Issue type updated successfully');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error('[IssueTypesManager] Error updating type:', err);
            setError('Failed to update issue type: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Delete (deactivate) issue type
    const handleDeleteType = async (typeId) => {
        if (!confirm(`Are you sure you want to delete the "${issueTypes.find(t => t.id === typeId)?.label}" issue type? This will hide it from the issue submission form.`)) {
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const supabase = window.MODA_SUPABASE?.client;
            if (supabase) {
                // Soft delete - just mark as inactive
                const { error: updateError } = await supabase
                    .from('issue_types')
                    .update({ is_active: false })
                    .eq('id', typeId);

                if (updateError && updateError.code !== '42P01') {
                    throw updateError;
                }
            }

            // Update local state - remove from list
            const updated = issueTypes.filter(t => t.id !== typeId);
            setIssueTypes(updated);
            localStorage.setItem('moda_issue_types', JSON.stringify(updated));
            
            // Update global routing
            updateGlobalRouting(updated);

            setSuccessMessage('Issue type deleted successfully');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error('[IssueTypesManager] Error deleting type:', err);
            setError('Failed to delete issue type: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Update global routing system with new types
    const updateGlobalRouting = (types) => {
        if (window.MODA_ISSUE_ROUTING) {
            window.MODA_ISSUE_ROUTING.ISSUE_TYPES = types.filter(t => t.is_active !== false);
        }
        // Dispatch event for other components to update
        window.dispatchEvent(new CustomEvent('moda-issue-types-updated', { detail: { types } }));
    };

    // Export issues data
    const handleExportIssues = async () => {
        try {
            let issues = [];
            const supabase = window.MODA_SUPABASE?.client;
            
            if (supabase) {
                const { data, error } = await supabase
                    .from('engineering_issues')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (!error && data) {
                    issues = data;
                }
            }
            
            // Fallback to localStorage
            if (issues.length === 0) {
                const saved = localStorage.getItem('moda_engineering_issues');
                if (saved) {
                    issues = JSON.parse(saved);
                }
            }

            if (issues.length === 0) {
                setError('No issues to export');
                return;
            }

            // Create CSV
            const headers = [
                'Issue ID', 'Type', 'Priority', 'Status', 'Title', 'Description',
                'Project', 'Module (BLM)', 'Department', 'Submitted By', 'Assigned To',
                'Created', 'Updated', 'Resolved'
            ];
            
            const rows = issues.map(issue => [
                issue.issue_display_id || '',
                issue.issue_type || '',
                issue.priority || '',
                issue.status || '',
                (issue.title || '').replace(/"/g, '""'),
                (issue.description || '').replace(/"/g, '""'),
                issue.project_name || '',
                issue.blm_id || '',
                issue.department || '',
                issue.submitted_by || '',
                issue.assigned_to || '',
                issue.created_at ? new Date(issue.created_at).toLocaleString() : '',
                issue.updated_at ? new Date(issue.updated_at).toLocaleString() : '',
                issue.resolved_at ? new Date(issue.resolved_at).toLocaleString() : ''
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `engineering_issues_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();

            setSuccessMessage(`Exported ${issues.length} issues to CSV`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error('[IssueTypesManager] Export error:', err);
            setError('Failed to export issues: ' + err.message);
        }
    };

    // Render
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--autovol-navy, #1E3A5F)' }}>
                        Issue Types Manager
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Configure issue types and their routing destinations
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportIssues}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Issues
                    </button>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="px-4 py-2 text-sm text-white rounded-lg flex items-center gap-2"
                        style={{ backgroundColor: 'var(--autovol-blue, #0057B8)' }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Issue Type
                    </button>
                </div>
            </div>

            {/* Messages */}
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

            {/* Add Form */}
            {showAddForm && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="font-semibold mb-3">Add New Issue Type</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                            <input
                                type="text"
                                value={newType.label}
                                onChange={(e) => setNewType({ ...newType, label: e.target.value, id: generateId(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., Safety Issue"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">ID (auto-generated)</label>
                            <input
                                type="text"
                                value={newType.id}
                                onChange={(e) => setNewType({ ...newType, id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                                placeholder="safety-issue"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={newType.color}
                                    onChange={(e) => setNewType({ ...newType, color: e.target.value })}
                                    className="w-10 h-10 rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={newType.color}
                                    onChange={(e) => setNewType({ ...newType, color: e.target.value })}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Route To Dashboard</label>
                            <select
                                value={newType.dashboard}
                                onChange={(e) => setNewType({ ...newType, dashboard: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {DASHBOARD_OPTIONS.map(opt => (
                                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            onClick={() => {
                                setShowAddForm(false);
                                setNewType({ id: '', label: '', color: '#6B7280', dashboard: 'engineering', is_active: true });
                            }}
                            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddType}
                            disabled={saving || !newType.label.trim()}
                            className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50"
                            style={{ backgroundColor: 'var(--autovol-blue, #0057B8)' }}
                        >
                            {saving ? 'Adding...' : 'Add Type'}
                        </button>
                    </div>
                </div>
            )}

            {/* Issue Types List */}
            {loading ? (
                <div className="text-center py-8 text-gray-500">Loading issue types...</div>
            ) : (
                <div className="space-y-2">
                    {issueTypes.filter(t => t.is_active !== false).map((type) => (
                        <div
                            key={type.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                            {editingType === type.id ? (
                                // Edit mode
                                <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                                    <input
                                        type="text"
                                        defaultValue={type.label}
                                        id={`edit-label-${type.id}`}
                                        className="px-3 py-2 border border-gray-300 rounded-lg"
                                    />
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            defaultValue={type.color}
                                            id={`edit-color-${type.id}`}
                                            className="w-8 h-8 rounded cursor-pointer"
                                        />
                                    </div>
                                    <select
                                        defaultValue={type.dashboard}
                                        id={`edit-dashboard-${type.id}`}
                                        className="px-3 py-2 border border-gray-300 rounded-lg"
                                    >
                                        {DASHBOARD_OPTIONS.map(opt => (
                                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2 justify-end">
                                        <button
                                            onClick={() => setEditingType(null)}
                                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                const label = document.getElementById(`edit-label-${type.id}`).value;
                                                const color = document.getElementById(`edit-color-${type.id}`).value;
                                                const dashboard = document.getElementById(`edit-dashboard-${type.id}`).value;
                                                handleUpdateType(type.id, { label, color, dashboard });
                                            }}
                                            className="px-3 py-1 text-sm text-white rounded"
                                            style={{ backgroundColor: 'var(--autovol-blue, #0057B8)' }}
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // View mode
                                <>
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: type.color }}
                                        />
                                        <div>
                                            <div className="font-medium">{type.label}</div>
                                            <div className="text-xs text-gray-500">
                                                ID: {type.id} | Routes to: {DASHBOARD_OPTIONS.find(d => d.id === type.dashboard)?.label || type.dashboard}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setEditingType(type.id)}
                                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="Edit"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteType(type.id)}
                                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Delete"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                <strong>Note:</strong> Changes to issue types will be reflected in the Issue Submission form. 
                Deleting a type will hide it from new submissions but won't affect existing issues.
            </div>
        </div>
    );
}

// Export to window
window.IssueTypesManager = IssueTypesManager;
