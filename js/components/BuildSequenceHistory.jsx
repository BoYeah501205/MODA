/**
 * Build Sequence History Viewer Component
 * Displays history of sequence changes with restore functionality
 */

const BuildSequenceHistory = ({ projectId, projectName, modules, setProjects, auth, onClose }) => {
    const { useState, useEffect, useMemo } = React;
    
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [restoring, setRestoring] = useState(false);
    const [showConfirmRestore, setShowConfirmRestore] = useState(null);
    
    // Load history on mount
    useEffect(() => {
        const loadHistory = async () => {
            setLoading(true);
            try {
                if (window.MODA_SEQUENCE_HISTORY?.getHistory) {
                    const data = await window.MODA_SEQUENCE_HISTORY.getHistory(projectId, 50);
                    setHistory(data);
                }
            } catch (err) {
                console.error('[BuildSequenceHistory] Error loading:', err);
            } finally {
                setLoading(false);
            }
        };
        loadHistory();
    }, [projectId]);
    
    // Format change type for display
    const formatChangeType = (type) => {
        const types = {
            'manual_edit': 'Manual Edit',
            'import': 'CSV Import',
            'reorder': 'Reorder',
            'prototype_insert': 'Prototype Insert',
            'restore': 'Restored'
        };
        return types[type] || type;
    };
    
    // Get icon for change type
    const getChangeTypeIcon = (type) => {
        const icons = {
            'manual_edit': 'icon-edit',
            'import': 'icon-upload',
            'reorder': 'icon-move',
            'prototype_insert': 'icon-add',
            'restore': 'icon-restore'
        };
        return icons[type] || 'icon-edit';
    };
    
    // Get color for change type
    const getChangeTypeColor = (type) => {
        const colors = {
            'manual_edit': 'bg-blue-100 text-blue-800',
            'import': 'bg-purple-100 text-purple-800',
            'reorder': 'bg-amber-100 text-amber-800',
            'prototype_insert': 'bg-green-100 text-green-800',
            'restore': 'bg-gray-100 text-gray-800'
        };
        return colors[type] || 'bg-gray-100 text-gray-800';
    };
    
    // Compare selected entry with current state
    const comparison = useMemo(() => {
        if (!selectedEntry || !modules) return null;
        
        const currentSnapshot = modules.map(m => ({
            moduleId: m.id,
            serialNumber: m.serialNumber,
            buildSequence: m.buildSequence,
            hitchBLM: m.hitchBLM
        }));
        
        return window.MODA_SEQUENCE_HISTORY?.compareSnapshots?.(
            selectedEntry.sequence_snapshot,
            currentSnapshot
        ) || [];
    }, [selectedEntry, modules]);
    
    // Handle restore
    const handleRestore = async (entry) => {
        setRestoring(true);
        try {
            const user = auth?.currentUser;
            const success = await window.MODA_SEQUENCE_HISTORY.restoreSnapshot(
                projectId,
                entry.id,
                setProjects,
                user
            );
            
            if (success) {
                // Refresh history
                const data = await window.MODA_SEQUENCE_HISTORY.getHistory(projectId, 50);
                setHistory(data);
                setShowConfirmRestore(null);
                setSelectedEntry(null);
            }
        } catch (err) {
            console.error('[BuildSequenceHistory] Restore error:', err);
        } finally {
            setRestoring(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Build Sequence History</h2>
                        <p className="text-sm text-gray-500">{projectName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                        <span className="text-xl">&times;</span>
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-hidden flex">
                    {/* History List */}
                    <div className="w-1/2 border-r overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">
                                Loading history...
                            </div>
                        ) : history.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <p className="text-lg mb-2">No history yet</p>
                                <p className="text-sm">Sequence changes will be logged here</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {history.map((entry) => (
                                    <div 
                                        key={entry.id}
                                        className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                                            selectedEntry?.id === entry.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                        }`}
                                        onClick={() => setSelectedEntry(entry)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getChangeTypeColor(entry.change_type)}`}>
                                                        {formatChangeType(entry.change_type)}
                                                    </span>
                                                    {entry.is_current && (
                                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                            Current
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-700 truncate">
                                                    {entry.change_description || 'No description'}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                    <span>{new Date(entry.created_at).toLocaleString()}</span>
                                                    <span>{entry.module_count} modules</span>
                                                    {entry.changed_by_name && (
                                                        <span>by {entry.changed_by_name}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {!entry.is_current && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowConfirmRestore(entry);
                                                    }}
                                                    className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 flex-shrink-0"
                                                >
                                                    Restore
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Detail View */}
                    <div className="w-1/2 overflow-y-auto bg-gray-50">
                        {selectedEntry ? (
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-900 mb-3">
                                    Snapshot Details
                                </h3>
                                
                                {/* Comparison with current */}
                                {comparison && comparison.length > 0 ? (
                                    <div className="mb-4">
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                                            Differences from Current ({comparison.length} changes)
                                        </h4>
                                        <div className="bg-white rounded-lg border max-h-48 overflow-y-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-100 sticky top-0">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left">Serial</th>
                                                        <th className="px-3 py-2 text-center">Then</th>
                                                        <th className="px-3 py-2 text-center">Now</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {comparison.slice(0, 20).map((change, idx) => (
                                                        <tr key={idx} className={change.isNew ? 'bg-green-50' : change.isRemoved ? 'bg-red-50' : ''}>
                                                            <td className="px-3 py-1.5 font-mono text-xs">
                                                                {change.serialNumber}
                                                            </td>
                                                            <td className="px-3 py-1.5 text-center">
                                                                {change.oldSequence ?? '-'}
                                                            </td>
                                                            <td className="px-3 py-1.5 text-center">
                                                                {change.newSequence ?? '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {comparison.length > 20 && (
                                                <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50">
                                                    + {comparison.length - 20} more changes
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : comparison && (
                                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                                        This snapshot matches the current sequence
                                    </div>
                                )}
                                
                                {/* Full snapshot */}
                                <h4 className="text-sm font-medium text-gray-700 mb-2">
                                    Full Sequence ({selectedEntry.module_count} modules)
                                </h4>
                                <div className="bg-white rounded-lg border max-h-64 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Seq</th>
                                                <th className="px-3 py-2 text-left">Serial</th>
                                                <th className="px-3 py-2 text-left">BLM</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {selectedEntry.sequence_snapshot
                                                .sort((a, b) => (a.buildSequence || 0) - (b.buildSequence || 0))
                                                .map((mod, idx) => (
                                                    <tr key={idx} className={mod.isPrototype ? 'bg-purple-50' : ''}>
                                                        <td className="px-3 py-1.5 font-medium">
                                                            {mod.buildSequence}
                                                        </td>
                                                        <td className="px-3 py-1.5 font-mono text-xs">
                                                            {mod.serialNumber}
                                                        </td>
                                                        <td className="px-3 py-1.5 text-gray-600">
                                                            {mod.hitchBLM || '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                <p>Select an entry to view details</p>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Confirm Restore Modal */}
                {showConfirmRestore && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                Confirm Restore
                            </h3>
                            <p className="text-gray-600 mb-4">
                                This will restore the build sequence to the snapshot from{' '}
                                <strong>{new Date(showConfirmRestore.created_at).toLocaleString()}</strong>.
                            </p>
                            <p className="text-sm text-amber-600 mb-4">
                                This will update {showConfirmRestore.module_count} module sequences. 
                                The current sequence will be saved to history before restoring.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowConfirmRestore(null)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                    disabled={restoring}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleRestore(showConfirmRestore)}
                                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
                                    disabled={restoring}
                                >
                                    {restoring ? 'Restoring...' : 'Restore Sequence'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Export
window.BuildSequenceHistory = BuildSequenceHistory;
