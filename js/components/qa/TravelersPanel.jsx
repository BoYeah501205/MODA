// ============================================================================
// TRAVELERS PANEL - List and manage QA Travelers with sub-sections
// Sub-sections: Active Travelers, Pending Approval, Complete
// 
// Logic:
// - Active = Module is online (stageProgress > 0) AND close-up < 100
// - Pending Approval = Module completed all stations (close-up = 100) awaiting QA approval
// - Complete = QA Manager has approved the traveler
// ============================================================================

function TravelersPanel({ 
    modules, 
    travelers, 
    getOrCreateTraveler, 
    updateTraveler, 
    onSelectTraveler, 
    onCompleteTraveler,
    stopStations = [],
    TRAVELER_STATUS,
    QA, 
    canEdit,
    currentUser 
}) {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [activeSection, setActiveSection] = React.useState('active'); // 'active', 'pending', 'complete'
    
    // Check if module is online (has started production)
    const isModuleOnline = (module) => {
        const stageProgress = module.stageProgress || {};
        return Object.values(stageProgress).some(progress => progress > 0);
    };
    
    // Check if module has completed all stations
    // A module is complete when ALL stages are at 100% (same logic as Weekly Board)
    const PRODUCTION_STAGE_IDS = [
        'auto-fc', 'auto-walls', 'mezzanine', 'elec-ceiling', 'wall-set', 'ceiling-set',
        'soffits', 'mech-rough', 'elec-rough', 'plumb-rough', 'exteriors', 'drywall-bp',
        'drywall-ttp', 'roofing', 'pre-finish', 'mech-trim', 'elec-trim', 'plumb-trim',
        'final-finish', 'sign-off', 'close-up'
    ];
    
    const isModuleComplete = (module) => {
        const stageProgress = module.stageProgress || {};
        // Check if ALL stages are at 100%
        return PRODUCTION_STAGE_IDS.every(stageId => stageProgress[stageId] === 100);
    };
    
    // Calculate traveler progress
    const getTravelerProgress = (traveler) => {
        if (!traveler) return 0;
        let totalItems = 0, completedItems = 0;
        (traveler.departmentChecklists || []).forEach(dept => {
            (dept.items || []).forEach(item => {
                totalItems++;
                if (item.conformance) completedItems++;
            });
        });
        return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    };
    
    // Check if at stop station
    const isAtStopStation = (traveler) => {
        return stopStations.includes(traveler?.currentStation);
    };
    
    // Filter modules by search and section
    // Active = Online modules that haven't completed all stations
    // Pending = Completed all stations, awaiting QA approval
    // Complete = QA approved
    const getFilteredModules = (section) => {
        return modules.filter(module => {
            const matchesSearch = !searchTerm || 
                module.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                module.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                module.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (!matchesSearch) return false;
            
            const traveler = travelers[`${module.projectId}-${module.id}`];
            const online = isModuleOnline(module);
            const completedAllStations = isModuleComplete(module);
            
            if (section === 'active') {
                // Active = Module is online AND not completed all stations
                // Traveler status must be 'active' or no traveler yet
                return online && !completedAllStations && 
                    (!traveler || traveler.status === 'active');
            } else if (section === 'pending') {
                // Pending = Module completed all stations (close-up = 100)
                // Show if: no traveler yet, OR traveler status is pending_approval
                // (Modules that complete production automatically need QA approval)
                return completedAllStations && 
                    (!traveler || traveler.status === 'active' || traveler.status === 'pending_approval');
            } else if (section === 'complete') {
                // Complete = Traveler has been approved by QA Manager
                return traveler?.status === 'complete';
            }
            return false;
        });
    };
    
    const activeModules = getFilteredModules('active');
    const pendingModules = getFilteredModules('pending');
    const completeModules = getFilteredModules('complete');
    
    // Section tabs
    const sections = [
        { id: 'active', label: 'Active Travelers', count: activeModules.length },
        { id: 'pending', label: 'Pending Approval', count: pendingModules.length },
        { id: 'complete', label: 'Complete', count: completeModules.length }
    ];
    
    const currentModules = activeSection === 'active' ? activeModules 
        : activeSection === 'pending' ? pendingModules 
        : completeModules;

    // Get production progress (average of all stages)
    const getProductionProgress = (module) => {
        const stageProgress = module.stageProgress || {};
        const values = Object.values(stageProgress);
        if (values.length === 0) return 0;
        return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    };
    
    // Production stages in order (matches App.jsx)
    const PRODUCTION_STAGES = [
        { id: 'auto-fc', name: 'Auto-FC' },
        { id: 'auto-walls', name: 'Auto-Walls' },
        { id: 'mezzanine', name: 'Mezzanine' },
        { id: 'elec-ceiling', name: 'Elec-Ceiling' },
        { id: 'wall-set', name: 'Wall Set' },
        { id: 'ceiling-set', name: 'Ceiling Set' },
        { id: 'soffits', name: 'Soffits' },
        { id: 'mech-rough', name: 'Mech Rough' },
        { id: 'elec-rough', name: 'Elec Rough' },
        { id: 'plumb-rough', name: 'Plumb Rough' },
        { id: 'exteriors', name: 'Exteriors' },
        { id: 'drywall-bp', name: 'Drywall-BP' },
        { id: 'drywall-ttp', name: 'Drywall-TTP' },
        { id: 'roofing', name: 'Roofing' },
        { id: 'pre-finish', name: 'Pre-Finish' },
        { id: 'mech-trim', name: 'Mech Trim' },
        { id: 'elec-trim', name: 'Elec Trim' },
        { id: 'plumb-trim', name: 'Plumb Trim' },
        { id: 'final-finish', name: 'Final Finish' },
        { id: 'sign-off', name: 'Sign-Off' },
        { id: 'close-up', name: 'Close-Up' }
    ];
    
    // Get current station from stageProgress
    const getCurrentStation = (module) => {
        const stageProgress = module.stageProgress || {};
        // Find the last stage with progress > 0 but < 100 (in progress)
        for (let i = PRODUCTION_STAGES.length - 1; i >= 0; i--) {
            const stage = PRODUCTION_STAGES[i];
            if (stageProgress[stage.id] > 0 && stageProgress[stage.id] < 100) {
                return stage.name;
            }
        }
        // If close-up is 100, module is complete
        if (stageProgress['close-up'] === 100) return 'Complete';
        // Find the last completed stage
        for (let i = PRODUCTION_STAGES.length - 1; i >= 0; i--) {
            const stage = PRODUCTION_STAGES[i];
            if (stageProgress[stage.id] === 100) {
                // Return the next stage name
                if (i < PRODUCTION_STAGES.length - 1) {
                    return PRODUCTION_STAGES[i + 1].name;
                }
                return 'Complete';
            }
        }
        return 'Not Started';
    };

    // Render module card
    const renderModuleCard = (module, section) => {
        const travelerId = `${module.projectId}-${module.id}`;
        const traveler = travelers[travelerId];
        const inspectionProgress = getTravelerProgress(traveler);
        const productionProgress = getProductionProgress(module);
        const currentStation = getCurrentStation(module);
        const atStopStation = isAtStopStation(traveler);
        
        return (
            <div key={module.id} 
                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition cursor-pointer"
                onClick={() => onSelectTraveler(module)}>
                
                {/* Card Header */}
                <div className="p-4 border-b" style={{ 
                    backgroundColor: traveler?.qaHold ? '#FEE2E2' : 
                        atStopStation ? '#FEF3C7' :
                        traveler ? 'var(--autovol-teal-light)' : '#f9fafb' 
                }}>
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className="font-semibold text-lg font-mono" style={{ color: 'var(--autovol-navy)' }}>
                                {module.serialNumber || module.name || `Module ${module.id}`}
                            </h4>
                            <p className="text-xs text-gray-500">{module.projectName}</p>
                            {module.buildSequence && (
                                <p className="text-xs text-gray-400">Build Sequence: #{module.buildSequence}</p>
                            )}
                            {/* Show BLM info if available */}
                            {(module.hitchBLM || module.specs?.blmHitch) && (
                                <p className="text-xs text-gray-400 font-mono">
                                    {module.hitchBLM || module.specs?.blmHitch}
                                    {(module.rearBLM || module.specs?.blmRear) && ` / ${module.rearBLM || module.specs?.blmRear}`}
                                </p>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {traveler?.qaHold && (
                                <span className="px-2 py-1 text-xs rounded bg-red-500 text-white font-medium">
                                    QA HOLD
                                </span>
                            )}
                            {atStopStation && !traveler?.qaHold && (
                                <span className="px-2 py-1 text-xs rounded bg-yellow-500 text-white font-medium">
                                    STOP STATION
                                </span>
                            )}
                            {!traveler && section === 'active' && (
                                <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
                                    No Traveler
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Card Body */}
                <div className="p-4">
                    {/* Production Status - Always show */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div>
                            <span className="text-gray-400 block">Current Station</span>
                            <span className="font-medium" style={{ color: atStopStation ? '#D97706' : 'var(--autovol-navy)' }}>
                                {currentStation}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Production</span>
                            <span className="font-medium" style={{ color: productionProgress === 100 ? '#43A047' : 'var(--autovol-navy)' }}>
                                {productionProgress}%
                            </span>
                        </div>
                    </div>
                    
                    {traveler ? (
                        <>
                            {/* Inspection Progress Bar */}
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">QA Inspection</span>
                                <span className="font-medium" style={{ color: inspectionProgress === 100 ? '#43A047' : 'var(--autovol-teal)' }}>
                                    {inspectionProgress}%
                                </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" 
                                    style={{ width: `${inspectionProgress}%`, backgroundColor: inspectionProgress === 100 ? '#43A047' : 'var(--autovol-teal)' }}>
                                </div>
                            </div>
                            
                            {/* Complete Button for Pending */}
                            {section === 'pending' && canEdit && onCompleteTraveler && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Mark this traveler as complete? This action cannot be undone.')) {
                                            onCompleteTraveler(travelerId);
                                        }
                                    }}
                                    className="mt-3 w-full px-4 py-2 rounded-lg text-white text-sm font-medium"
                                    style={{ backgroundColor: '#43A047' }}>
                                    Approve & Complete Traveler
                                </button>
                            )}
                            
                            {/* Completed Info */}
                            {section === 'complete' && traveler.completedAt && (
                                <div className="mt-3 text-xs text-gray-500 text-center">
                                    Completed by {traveler.completedBy} on {new Date(traveler.completedAt).toLocaleDateString()}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-center py-2 text-gray-500 text-sm">
                            <p>Click to create QA traveler</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm p-4">
                <input
                    type="text"
                    placeholder="Search by module name, project, or serial number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg text-sm"
                />
            </div>
            
            {/* Section Tabs */}
            <div className="bg-white rounded-lg shadow-sm">
                <div className="flex border-b">
                    {sections.map(section => (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                                activeSection === section.id 
                                    ? 'border-b-2 bg-white' 
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                            style={activeSection === section.id ? { 
                                borderColor: 'var(--autovol-teal)', 
                                color: 'var(--autovol-teal)' 
                            } : {}}
                        >
                            {section.label}
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                activeSection === section.id 
                                    ? 'bg-teal-100 text-teal-700' 
                                    : 'bg-gray-100 text-gray-600'
                            }`}>
                                {section.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Module Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentModules.map(module => renderModuleCard(module, activeSection))}
            </div>
            
            {currentModules.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-sm">
                    <span className="icon-clipboard" style={{ width: '48px', height: '48px', display: 'inline-block', opacity: 0.3 }}></span>
                    <p className="mt-4 font-medium">
                        {activeSection === 'active' ? 'No modules currently in production' :
                         activeSection === 'pending' ? 'No travelers pending approval' :
                         'No completed travelers'}
                    </p>
                    <p className="mt-2 text-sm text-gray-400">
                        {activeSection === 'active' ? 'Modules will appear here when they go online (start production)' :
                         activeSection === 'pending' ? 'Travelers move here when modules complete all stations (Close-Up = 100%)' :
                         'Approved travelers will appear here'}
                    </p>
                </div>
            )}
        </div>
    );
}

window.TravelersPanel = TravelersPanel;
