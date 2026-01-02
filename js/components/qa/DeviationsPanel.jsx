// ============================================================================
// DEVIATIONS PANEL - Non-Conformance tracking and workflow
// ============================================================================

function DeviationsPanel({ deviations, updateDeviationStatus, modules, employees, QA, canEdit, currentUser, onNewDeviation }) {
    const [filter, setFilter] = React.useState('open');
    const [priorityFilter, setPriorityFilter] = React.useState('all');
    const [selectedDeviation, setSelectedDeviation] = React.useState(null);
    
    // Filter deviations
    const filteredDeviations = deviations.filter(d => {
        const matchesStatus = filter === 'all' || 
            (filter === 'open' && d.status !== 'closed') ||
            d.status === filter;
        const matchesPriority = priorityFilter === 'all' || d.priority === priorityFilter;
        return matchesStatus && matchesPriority;
    }).sort((a, b) => {
        // Sort by priority then date
        const priorityOrder = { critical: 0, major: 1, minor: 2, cosmetic: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    // Status workflow
    const getNextStatuses = (currentStatus) => {
        const workflow = {
            'open': ['assigned'],
            'assigned': ['in-progress', 'open'],
            'in-progress': ['ready-reinspect', 'assigned'],
            'ready-reinspect': ['closed', 'in-progress'],
            'closed': []
        };
        return workflow[currentStatus] || [];
    };

    return (
        <div className="space-y-6">
            {/* Header with Add Button */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--autovol-navy)' }}>
                    Deviation Tracking
                </h3>
                {canEdit && (
                    <button onClick={onNewDeviation}
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2"
                        style={{ backgroundColor: 'var(--autovol-red)' }}>
                        <span>+</span> New Deviation
                    </button>
                )}
            </div>
            
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 flex flex-wrap gap-4">
                <div className="flex gap-2">
                    {['all', 'open', 'assigned', 'in-progress', 'ready-reinspect', 'closed'].map(status => (
                        <button key={status} onClick={() => setFilter(status)}
                            className={`px-3 py-1 text-sm rounded-full transition ${
                                filter === status ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            style={filter === status ? { backgroundColor: 'var(--autovol-teal)' } : {}}>
                            {status === 'all' ? 'All' : status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                    ))}
                </div>
                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-3 py-1 border rounded-lg text-sm">
                    <option value="all">All Priorities</option>
                    {(QA.DEVIATION_PRIORITIES || []).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>
            
            {/* Deviations List */}
            <div className="space-y-4">
                {filteredDeviations.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
                        <span className="icon-checkmark" style={{ width: '64px', height: '64px', display: 'inline-block', opacity: 0.3 }}></span>
                        <p className="mt-4">No deviations found</p>
                    </div>
                ) : (
                    filteredDeviations.map(deviation => {
                        const priority = (QA.DEVIATION_PRIORITIES || []).find(p => p.id === deviation.priority);
                        const status = QA.DEVIATION_STATUS?.[deviation.status?.toUpperCase()?.replace('-', '_')] || { name: deviation.status, color: '#9E9E9E' };
                        const nextStatuses = getNextStatuses(deviation.status);
                        
                        return (
                            <div key={deviation.id} className="bg-white rounded-lg shadow-sm border-l-4 overflow-hidden"
                                 style={{ borderColor: priority?.color || '#9E9E9E' }}>
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-mono text-xs text-gray-400">{deviation.id}</span>
                                                <span className="px-2 py-0.5 text-xs rounded text-white" style={{ backgroundColor: priority?.color || '#9E9E9E' }}>
                                                    {priority?.name || deviation.priority}
                                                </span>
                                                <span className="px-2 py-0.5 text-xs rounded text-white" style={{ backgroundColor: status.color }}>
                                                    {status.name}
                                                </span>
                                            </div>
                                            <h4 className="font-medium" style={{ color: 'var(--autovol-navy)' }}>{deviation.title || deviation.item}</h4>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {deviation.moduleName} • Station {deviation.station} • {deviation.department}
                                            </p>
                                        </div>
                                        <div className="text-right text-xs text-gray-400">
                                            <div>Noted by: {deviation.notedBy}</div>
                                            <div>{new Date(deviation.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    
                                    {/* Status Actions */}
                                    {canEdit && nextStatuses.length > 0 && (
                                        <div className="mt-4 pt-4 border-t flex gap-2">
                                            {nextStatuses.map(nextStatus => (
                                                <button key={nextStatus}
                                                    onClick={() => updateDeviationStatus(deviation.id, nextStatus)}
                                                    className="px-3 py-1 text-xs rounded border hover:bg-gray-50">
                                                    → {nextStatus.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    
                                    {/* History */}
                                    {deviation.history?.length > 0 && (
                                        <div className="mt-4 pt-4 border-t">
                                            <div className="text-xs text-gray-500 mb-2">History</div>
                                            <div className="space-y-1">
                                                {deviation.history.slice(-3).map((h, i) => (
                                                    <div key={i} className="text-xs text-gray-400">
                                                        {new Date(h.timestamp).toLocaleString()} - {h.action} by {h.by}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

// New Deviation Modal
function NewDeviationModal({ modules, employees, onClose, onSave, QA }) {
    const [formData, setFormData] = React.useState({
        moduleId: '',
        station: '',
        department: '',
        title: '',
        item: '',
        priority: 'major',
        notedBy: ''
    });
    
    // Compare as strings to handle both UUID and numeric IDs
    const selectedModule = modules.find(m => String(m.id) === String(formData.moduleId));
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.moduleId || !formData.title) return;
        onSave({
            ...formData,
            moduleId: formData.moduleId, // Keep as-is (may be UUID or number)
            moduleName: selectedModule?.name || selectedModule?.serialNumber || '',
            projectId: selectedModule?.projectId
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b flex items-center justify-between" style={{ backgroundColor: 'var(--autovol-red)' }}>
                    <h3 className="text-lg font-semibold text-white">New Deviation</h3>
                    <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Module *</label>
                        <select value={formData.moduleId} onChange={(e) => setFormData({...formData, moduleId: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg" required>
                            <option value="">Select module...</option>
                            {modules.map(m => <option key={m.id} value={m.id}>{m.name} - {m.projectName}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Station</label>
                            <select value={formData.station} onChange={(e) => setFormData({...formData, station: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg">
                                <option value="">Select...</option>
                                {(QA.PRODUCTION_STATIONS || []).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                            <select value={formData.department} onChange={(e) => setFormData({...formData, department: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg">
                                <option value="">Select...</option>
                                {(QA.DEPARTMENTS || []).map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                        <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg" placeholder="Brief description" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                        <textarea value={formData.item} onChange={(e) => setFormData({...formData, item: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg" rows="3" placeholder="Detailed description of non-conformance..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <select value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg">
                                {(QA.DEVIATION_PRIORITIES || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Noted By</label>
                            <input type="text" value={formData.notedBy} onChange={(e) => setFormData({...formData, notedBy: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg" placeholder="Inspector name" />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="flex-1 px-4 py-2 rounded-lg text-white" style={{ backgroundColor: 'var(--autovol-teal)' }}>
                            Create Deviation
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

window.DeviationsPanel = DeviationsPanel;
window.NewDeviationModal = NewDeviationModal;
