// ============================================================================
// INSPECTIONS PANEL - Department checklist inspection interface
// ============================================================================

function InspectionsPanel({ modules, travelers, updateTraveler, addDeviation, selectedDepartment, QA, canEdit, currentUser }) {
    const [selectedModuleId, setSelectedModuleId] = React.useState(null);
    const [expandedDepts, setExpandedDepts] = React.useState({});
    
    // Get modules with travelers
    const modulesWithTravelers = modules.filter(m => travelers[`${m.projectId}-${m.id}`]);
    
    // Selected module's traveler
    const selectedModule = modulesWithTravelers.find(m => m.id === selectedModuleId);
    const selectedTraveler = selectedModule ? travelers[`${selectedModule.projectId}-${selectedModule.id}`] : null;
    
    // Filter departments
    const departments = selectedTraveler?.departmentChecklists?.filter(d => 
        selectedDepartment === 'all' || d.departmentId === selectedDepartment
    ) || [];
    
    // Toggle department expansion
    const toggleDept = (deptId) => {
        setExpandedDepts(prev => ({ ...prev, [deptId]: !prev[deptId] }));
    };
    
    // Update checklist item
    const updateChecklistItem = (deptId, itemId, updates) => {
        if (!selectedTraveler || !canEdit) return;
        
        const travelerId = `${selectedModule.projectId}-${selectedModule.id}`;
        const updatedChecklists = selectedTraveler.departmentChecklists.map(dept => {
            if (dept.departmentId !== deptId) return dept;
            return {
                ...dept,
                items: dept.items.map(item => {
                    if (item.itemId !== itemId) return item;
                    return {
                        ...item,
                        ...updates,
                        inspector: currentUser?.name || 'Inspector',
                        timestamp: new Date().toISOString()
                    };
                })
            };
        });
        
        updateTraveler(travelerId, { departmentChecklists: updatedChecklists });
        
        // If NC, prompt for deviation
        if (updates.conformance === 'NC') {
            const dept = QA.DEPARTMENTS.find(d => d.id === deptId);
            const item = dept?.checklistItems?.find(i => i.id === itemId);
            addDeviation({
                moduleId: selectedModule.id,
                moduleName: selectedModule.name,
                projectId: selectedModule.projectId,
                department: dept?.name || deptId,
                station: selectedTraveler.timeline?.currentStation || 'Unknown',
                item: item?.description || itemId,
                title: `NC: ${item?.description?.substring(0, 50) || itemId}`,
                priority: 'major',
                notedBy: currentUser?.name || 'QA Inspector'
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Module Selector */}
            <div className="bg-white rounded-lg shadow-sm p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Module to Inspect</label>
                <select value={selectedModuleId || ''} onChange={(e) => setSelectedModuleId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-2 border rounded-lg text-sm">
                    <option value="">-- Select a module --</option>
                    {modulesWithTravelers.map(m => (
                        <option key={m.id} value={m.id}>{m.name} - {m.projectName}</option>
                    ))}
                </select>
            </div>
            
            {!selectedTraveler ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
                    <span className="icon-clipboard" style={{ width: '64px', height: '64px', display: 'inline-block', opacity: 0.3 }}></span>
                    <p className="mt-4">Select a module with an active traveler to begin inspection</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Module Info Header */}
                    <div className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold" style={{ color: 'var(--autovol-navy)' }}>{selectedModule.name}</h3>
                            <p className="text-sm text-gray-500">Station: {selectedTraveler.timeline?.currentStation || 'Not set'}</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Traveler ID</div>
                            <div className="font-mono text-sm">{selectedTraveler.id}</div>
                        </div>
                    </div>
                    
                    {/* Department Checklists */}
                    {departments.map(dept => {
                        const isExpanded = expandedDepts[dept.departmentId] !== false;
                        const completedCount = dept.items.filter(i => i.conformance).length;
                        const ncCount = dept.items.filter(i => i.conformance === 'NC').length;
                        
                        return (
                            <div key={dept.departmentId} className="bg-white rounded-lg shadow-sm overflow-hidden">
                                {/* Department Header */}
                                <div className="p-4 border-b cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                                     onClick={() => toggleDept(dept.departmentId)}
                                     style={{ backgroundColor: completedCount === dept.items.length ? '#E8F5E9' : 'white' }}>
                                    <div className="flex items-center gap-3">
                                        <span className={`transform transition ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                        <div>
                                            <h4 className="font-medium" style={{ color: 'var(--autovol-navy)' }}>
                                                {dept.departmentNumber}. {dept.departmentName}
                                            </h4>
                                            <p className="text-xs text-gray-500">Stations: {dept.stations?.join(', ')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {ncCount > 0 && (
                                            <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-600">{ncCount} NC</span>
                                        )}
                                        <span className="text-sm text-gray-500">{completedCount}/{dept.items.length}</span>
                                    </div>
                                </div>
                                
                                {/* Checklist Items */}
                                {isExpanded && (
                                    <div className="divide-y">
                                        {dept.items.map((item, idx) => (
                                            <div key={item.itemId} className="p-4 hover:bg-gray-50">
                                                <div className="flex items-start gap-4">
                                                    <span className="text-sm text-gray-400 w-6">{idx + 1}.</span>
                                                    <div className="flex-1">
                                                        <p className="text-sm" style={{ color: 'var(--autovol-navy)' }}>{item.description}</p>
                                                        {item.timestamp && (
                                                            <p className="text-xs text-gray-400 mt-1">
                                                                {item.inspector} • {new Date(item.timestamp).toLocaleString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {['PASS', 'NC', 'N/A'].map(status => (
                                                            <button key={status}
                                                                onClick={() => updateChecklistItem(dept.departmentId, item.itemId, { conformance: status })}
                                                                disabled={!canEdit}
                                                                className={`px-3 py-1 text-xs font-medium rounded transition ${
                                                                    item.conformance === status 
                                                                        ? status === 'PASS' ? 'bg-green-500 text-white' 
                                                                        : status === 'NC' ? 'bg-red-500 text-white' 
                                                                        : 'bg-gray-500 text-white'
                                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                                }`}>
                                                                {status}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

window.InspectionsPanel = InspectionsPanel;
