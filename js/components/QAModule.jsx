// ============================================================================
// QA MODULE - Quality Assurance & Quality Control Management
// Based on Autovol QA Traveler (Version 240117)
// ============================================================================
// QC = Supervisors/Team Leaders (responsible work-party, signs off traveler items)
// QA = QA Manager & Inspectors (documentation, ensuring compliance with QA manual)
// NTA = Third-Party Inspection Agency (State regulatory compliance)
// ============================================================================

// Stop Stations - Require QA approval to progress
const STOP_STATIONS = ['Mezzanine', 'Prior to Drywall-Back Panel', 'Prior to Module Sign-Off'];

// Traveler Status Categories
const TRAVELER_STATUS = {
    ACTIVE: 'active',           // In production, linked to weekly board
    PENDING_APPROVAL: 'pending_approval',  // Completed all stations, awaiting QA Manager sign-off
    COMPLETE: 'complete'        // QA Manager approved, traveler closed
};

// Import constants (will be loaded via script tag)
const getQAConstants = () => window.QA_CONSTANTS || {
    PRODUCTION_STATIONS: [],
    CONFORMANCE_STATUS: {},
    DEPARTMENTS: [],
    TEST_TYPES: {},
    DEVIATION_PRIORITIES: [],
    DEVIATION_STATUS: {}
};

// ============================================================================
// MAIN QA MODULE COMPONENT
// ============================================================================
function QAModule({ projects = [], employees = [], currentUser = {}, canEdit = true }) {
    const QA = getQAConstants();
    
    // Active sub-tab
    const [activeSubTab, setActiveSubTab] = React.useState('dashboard');
    
    // Safe JSON parse helper
    const safeParseJSON = (str, fallback) => {
        if (str && str !== 'undefined' && str !== 'null') {
            try { return JSON.parse(str); } catch (e) { return fallback; }
        }
        return fallback;
    };
    
    // QA Travelers (one per module) - keyed by module serial number
    const [travelers, setTravelers] = React.useState({});
    
    // Deviations (NC items)
    const [deviations, setDeviations] = React.useState([]);
    
    // Test Results
    const [testResults, setTestResults] = React.useState([]);
    
    // Loading state
    const [isLoading, setIsLoading] = React.useState(true);
    
    // Filters
    const [selectedProject, setSelectedProject] = React.useState('all');
    const [selectedDepartment, setSelectedDepartment] = React.useState('all');
    const [selectedStation, setSelectedStation] = React.useState('all');
    
    // Modal states
    const [showTravelerModal, setShowTravelerModal] = React.useState(false);
    const [showDeviationModal, setShowDeviationModal] = React.useState(false);
    const [showTestModal, setShowTestModal] = React.useState(false);
    const [selectedModule, setSelectedModule] = React.useState(null);
    const [selectedTraveler, setSelectedTraveler] = React.useState(null);
    
    // Load data from Supabase on mount
    React.useEffect(() => {
        const loadData = async () => {
            try {
                if (window.MODA_SUPABASE_DATA?.isAvailable?.()) {
                    console.log('[QA] Loading data from Supabase...');
                    const [travelersData, deviationsData, testsData] = await Promise.all([
                        window.MODA_SUPABASE_DATA.qa.getTravelers(),
                        window.MODA_SUPABASE_DATA.qa.getDeviations(),
                        window.MODA_SUPABASE_DATA.qa.getTests()
                    ]);
                    
                    // Convert travelers array to object keyed by module_id
                    const travelersObj = {};
                    travelersData.forEach(t => {
                        travelersObj[t.module_id] = t.checklist || {};
                    });
                    
                    setTravelers(travelersObj);
                    setDeviations(deviationsData);
                    setTestResults(testsData);
                    console.log('[QA] Loaded from Supabase:', travelersData.length, 'travelers,', deviationsData.length, 'deviations,', testsData.length, 'tests');
                } else {
                    // Fallback to localStorage
                    console.log('[QA] Supabase not available, using localStorage');
                    const savedTravelers = localStorage.getItem('moda_qa_travelers');
                    const savedDeviations = localStorage.getItem('moda_qa_deviations');
                    const savedTests = localStorage.getItem('moda_qa_tests');
                    
                    setTravelers(safeParseJSON(savedTravelers, {}));
                    setDeviations(safeParseJSON(savedDeviations, []));
                    setTestResults(safeParseJSON(savedTests, []));
                }
            } catch (error) {
                console.error('[QA] Error loading data:', error);
                // Fallback to localStorage on error
                const savedTravelers = localStorage.getItem('moda_qa_travelers');
                const savedDeviations = localStorage.getItem('moda_qa_deviations');
                const savedTests = localStorage.getItem('moda_qa_tests');
                
                setTravelers(safeParseJSON(savedTravelers, {}));
                setDeviations(safeParseJSON(savedDeviations, []));
                setTestResults(safeParseJSON(savedTests, []));
            } finally {
                setIsLoading(false);
            }
        };
        
        // Wait for Supabase to initialize
        const timer = setTimeout(loadData, 500);
        return () => clearTimeout(timer);
    }, []);
    
    // Save travelers to Supabase (debounced)
    const lastSavedTravelers = React.useRef(null);
    React.useEffect(() => {
        if (isLoading) return;
        
        // Always save to localStorage as backup
        localStorage.setItem('moda_qa_travelers', JSON.stringify(travelers));
        
        // Sync to Supabase
        if (window.MODA_SUPABASE_DATA?.isAvailable?.()) {
            const syncTravelers = async () => {
                const lastTravelers = lastSavedTravelers.current || {};
                for (const [moduleId, checklist] of Object.entries(travelers)) {
                    if (JSON.stringify(lastTravelers[moduleId]) !== JSON.stringify(checklist)) {
                        try {
                            await window.MODA_SUPABASE_DATA.qa.saveTraveler({
                                module_id: moduleId,
                                checklist: checklist
                            });
                        } catch (err) {
                            console.error('[QA] Error saving traveler:', err);
                        }
                    }
                }
                lastSavedTravelers.current = JSON.parse(JSON.stringify(travelers));
            };
            
            const timeout = setTimeout(syncTravelers, 1000);
            return () => clearTimeout(timeout);
        }
    }, [travelers, isLoading]);
    
    // Save deviations to localStorage (Supabase sync happens on create/update)
    React.useEffect(() => {
        if (isLoading) return;
        localStorage.setItem('moda_qa_deviations', JSON.stringify(deviations));
    }, [deviations, isLoading]);
    
    // Save test results to localStorage (Supabase sync happens on create)
    React.useEffect(() => {
        if (isLoading) return;
        localStorage.setItem('moda_qa_tests', JSON.stringify(testResults));
    }, [testResults, isLoading]);
    
    // Production stage IDs (must match App.jsx)
    const PRODUCTION_STAGE_IDS = [
        'auto-fc', 'auto-walls', 'mezzanine', 'elec-ceiling', 'wall-set', 'ceiling-set',
        'soffits', 'mech-rough', 'elec-rough', 'plumb-rough', 'exteriors', 'drywall-bp',
        'drywall-ttp', 'roofing', 'pre-finish', 'mech-trim', 'elec-trim', 'plumb-trim',
        'final-finish', 'sign-off', 'close-up'
    ];
    
    // Check if module completed all stations (ALL stages at 100%)
    const isModuleFullyComplete = (module) => {
        const stageProgress = module.stageProgress || {};
        return PRODUCTION_STAGE_IDS.every(stageId => stageProgress[stageId] === 100);
    };
    
    // Auto-transition travelers to Pending Approval when module completes all stations
    React.useEffect(() => {
        let hasChanges = false;
        const updatedTravelers = { ...travelers };
        
        projects.forEach(project => {
            (project.modules || []).forEach(module => {
                const travelerId = `${project.id}-${module.id}`;
                const traveler = updatedTravelers[travelerId];
                const isComplete = isModuleFullyComplete(module);
                
                // If module completed all stations and traveler is still active, move to pending
                if (isComplete && traveler && traveler.status === TRAVELER_STATUS.ACTIVE) {
                    updatedTravelers[travelerId] = {
                        ...traveler,
                        status: TRAVELER_STATUS.PENDING_APPROVAL,
                        completedProductionAt: new Date().toISOString(),
                        lastUpdated: new Date().toISOString()
                    };
                    hasChanges = true;
                }
            });
        });
        
        if (hasChanges) {
            setTravelers(updatedTravelers);
        }
    }, [projects]); // Re-run when projects change (module progress updates)
    
    // Get all modules from all projects
    const allModules = React.useMemo(() => {
        const modules = [];
        projects.forEach(project => {
            (project.modules || []).forEach(module => {
                modules.push({
                    ...module,
                    projectId: project.id,
                    projectName: project.name,
                    traveler: travelers[`${project.id}-${module.id}`] || null
                });
            });
        });
        return modules;
    }, [projects, travelers]);
    
    // Filter modules by project
    const filteredModules = React.useMemo(() => {
        if (selectedProject === 'all') return allModules;
        return allModules.filter(m => m.projectId === parseInt(selectedProject));
    }, [allModules, selectedProject]);
    
    // Helper: Check if module is online (has started production)
    const isModuleOnline = (module) => {
        const stageProgress = module.stageProgress || {};
        return Object.values(stageProgress).some(progress => progress > 0);
    };
    
    // Calculate QA metrics
    const metrics = React.useMemo(() => {
        const openDeviations = deviations.filter(d => d.status !== 'closed').length;
        const criticalDeviations = deviations.filter(d => d.priority === 'critical' && d.status !== 'closed').length;
        const closedDeviations = deviations.filter(d => d.status === 'closed').length;
        
        const totalTests = testResults.length;
        const passedTests = testResults.filter(t => t.result === 'PASS').length;
        const failedTests = testResults.filter(t => t.result === 'FAIL').length;
        
        // Count inspections across all travelers
        let totalInspections = 0;
        let passedInspections = 0;
        let ncInspections = 0;
        
        Object.values(travelers).forEach(traveler => {
            if (traveler.departmentChecklists) {
                traveler.departmentChecklists.forEach(dept => {
                    (dept.items || []).forEach(item => {
                        if (item.conformance) {
                            totalInspections++;
                            if (item.conformance === 'PASS') passedInspections++;
                            if (item.conformance === 'NC') ncInspections++;
                        }
                    });
                });
            }
        });
        
        // Count modules by status (matching TravelersPanel logic)
        // Active = Online modules not yet complete (close-up < 100)
        // Pending = Completed all stations, awaiting QA approval
        // Complete = QA approved
        const activeModules = filteredModules.filter(m => {
            const online = isModuleOnline(m);
            const complete = isModuleFullyComplete(m);
            const traveler = travelers[`${m.projectId}-${m.id}`];
            return online && !complete && (!traveler || traveler.status === 'active');
        });
        
        const pendingModules = filteredModules.filter(m => {
            const complete = isModuleFullyComplete(m);
            const traveler = travelers[`${m.projectId}-${m.id}`];
            return complete && (!traveler || traveler.status === 'active' || traveler.status === 'pending_approval');
        });
        
        const completeModules = filteredModules.filter(m => {
            const traveler = travelers[`${m.projectId}-${m.id}`];
            return traveler?.status === 'complete';
        });
        
        // Modules awaiting traveler = online modules without a traveler
        const modulesAwaitingTraveler = filteredModules.filter(m => {
            const online = isModuleOnline(m);
            const traveler = travelers[`${m.projectId}-${m.id}`];
            return online && !traveler;
        }).length;
        
        // Milestone progress
        const milestonesComplete = Object.values(travelers).reduce((acc, t) => {
            return acc + Object.values(t.milestones || {}).filter(m => m.completed).length;
        }, 0);
        
        return {
            openDeviations,
            criticalDeviations,
            closedDeviations,
            totalDeviations: deviations.length,
            totalTests,
            passedTests,
            failedTests,
            testPassRate: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
            totalInspections,
            passedInspections,
            ncInspections,
            inspectionPassRate: totalInspections > 0 ? Math.round((passedInspections / totalInspections) * 100) : 0,
            // Updated counts to match Travelers tab
            activeTravelers: activeModules.length,
            pendingApproval: pendingModules.length,
            completeTravelers: completeModules.length,
            modulesAwaitingTraveler,
            milestonesComplete
        };
    }, [deviations, testResults, travelers, filteredModules]);
    
    // Create or get traveler for a module
    // Traveler auto-activates when module goes online at Station 1 (Automation)
    const getOrCreateTraveler = React.useCallback((module) => {
        const travelerId = `${module.projectId}-${module.id}`;
        if (travelers[travelerId]) {
            return travelers[travelerId];
        }
        
        // Create new traveler - captures all module data from Weekly Board
        // Module structure: serialNumber, hitchBLM, rearBLM, specs, stageProgress, etc.
        const newTraveler = {
            id: travelerId,
            moduleId: module.id,
            projectId: module.projectId,
            // Module identification
            serialNumber: module.serialNumber || module.name || '',
            projectName: module.projectName || '',
            buildSequence: module.buildSequence || null,
            // BLM/Unit info (from Weekly Board module data)
            hitchBLM: module.hitchBLM || module.specs?.blmHitch || '',
            rearBLM: module.rearBLM || module.specs?.blmRear || '',
            hitchUnit: module.hitchUnit || module.specs?.hitchUnit || '',
            rearUnit: module.rearUnit || module.specs?.rearUnit || '',
            hitchRoom: module.hitchRoom || '',
            rearRoom: module.rearRoom || '',
            hitchRoomType: module.hitchRoomType || '',
            rearRoomType: module.rearRoomType || '',
            // Dimensions
            width: module.width || module.specs?.width || '',
            length: module.length || module.specs?.length || '',
            squareFootage: module.squareFootage || module.specs?.squareFootage || '',
            // Difficulty indicators
            difficultyIndicators: module.difficultyIndicators || [],
            // Timeline - populated from Weekly Board
            onLineDate: module.onLineDate || null,
            currentStation: module.currentStation || module.stage || 'Automation',
            offLineDate: module.offLineDate || null,
            // Traveler status
            status: TRAVELER_STATUS.ACTIVE,
            createdAt: new Date().toISOString(),
            // Department checklists for inspections
            departmentChecklists: QA.DEPARTMENTS.map(dept => ({
                departmentId: dept.id,
                departmentName: dept.name,
                departmentNumber: dept.number,
                stations: dept.stations,
                items: (dept.checklistItems || []).map(item => ({
                    itemId: item.id,
                    description: item.description,
                    conformance: null,
                    inspector: null,
                    timestamp: null,
                    notes: '',
                    photos: []
                })),
                status: 'pending',
                completedDate: null
            })),
            // Stop station approvals
            stopStationApprovals: {},
            // QA Hold status
            qaHold: false,
            qaHoldReason: null,
            // Completion
            completedBy: null,
            completedAt: null,
            lastUpdated: new Date().toISOString()
        };
        
        setTravelers(prev => ({ ...prev, [travelerId]: newTraveler }));
        return newTraveler;
    }, [travelers, QA.DEPARTMENTS]);
    
    // Update traveler
    const updateTraveler = React.useCallback((travelerId, updates) => {
        setTravelers(prev => ({
            ...prev,
            [travelerId]: {
                ...prev[travelerId],
                ...updates,
                lastUpdated: new Date().toISOString()
            }
        }));
    }, []);
    
    // Add deviation
    const addDeviation = React.useCallback((deviation) => {
        const newDeviation = {
            ...deviation,
            id: `DEV-${Date.now()}`,
            createdAt: new Date().toISOString(),
            status: 'open',
            history: [{
                action: 'created',
                by: currentUser.name || 'QA Inspector',
                timestamp: new Date().toISOString()
            }]
        };
        setDeviations(prev => [...prev, newDeviation]);
        return newDeviation;
    }, [currentUser]);
    
    // Update deviation status
    const updateDeviationStatus = React.useCallback((deviationId, status, notes = '') => {
        setDeviations(prev => prev.map(d => {
            if (d.id === deviationId) {
                return {
                    ...d,
                    status,
                    history: [...(d.history || []), {
                        action: `status changed to ${status}`,
                        by: currentUser.name || 'User',
                        timestamp: new Date().toISOString(),
                        notes
                    }]
                };
            }
            return d;
        }));
    }, [currentUser]);
    
    // Add test result
    const addTestResult = React.useCallback((test) => {
        const newTest = {
            ...test,
            id: `TEST-${Date.now()}`,
            timestamp: new Date().toISOString(),
            inspector: currentUser.name || 'QA Inspector'
        };
        setTestResults(prev => [...prev, newTest]);
        return newTest;
    }, [currentUser]);
    
    // Sub-tab navigation
    const subTabs = [
        { id: 'dashboard', label: 'Dashboard', icon: 'icon-chart' },
        { id: 'travelers', label: 'Travelers', icon: 'icon-clipboard' },
        { id: 'deviations', label: 'Deviations', icon: 'icon-alert', badge: metrics.openDeviations },
        { id: 'reports', label: 'Reports', icon: 'icon-blueprint' }
    ];

    return (
        <div className="qa-module">
            {/* Sub-Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm mb-6">
                <div className="flex border-b overflow-x-auto production-tabs">
                    {subTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition flex items-center gap-2 ${
                                activeSubTab === tab.id 
                                    ? 'border-b-2 text-teal-600' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                            style={activeSubTab === tab.id ? { borderColor: 'var(--autovol-teal)' } : {}}
                        >
                            <span className={tab.icon} style={{ width: '16px', height: '16px', display: 'inline-block' }}></span>
                            {tab.label}
                            {tab.badge > 0 && (
                                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Filters Bar */}
            <div className="mb-6 flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Project:</label>
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="px-3 py-2 border rounded-lg text-sm min-w-[200px]"
                    >
                        <option value="all">All Projects</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                
                {(activeSubTab === 'inspections' || activeSubTab === 'travelers') && (
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">Department:</label>
                        <select
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="px-3 py-2 border rounded-lg text-sm min-w-[200px]"
                        >
                            <option value="all">All Departments</option>
                            {QA.DEPARTMENTS.map(d => (
                                <option key={d.id} value={d.id}>{d.number}. {d.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
            
            {/* Dashboard View */}
            {activeSubTab === 'dashboard' && (
                <QADashboard 
                    metrics={metrics}
                    deviations={deviations}
                    travelers={travelers}
                    modules={filteredModules}
                    QA={QA}
                />
            )}
            
            {/* Travelers View - with sub-sections */}
            {activeSubTab === 'travelers' && (
                <TravelersPanel
                    modules={filteredModules}
                    travelers={travelers}
                    getOrCreateTraveler={getOrCreateTraveler}
                    updateTraveler={updateTraveler}
                    onSelectTraveler={(module) => {
                        setSelectedModule(module);
                        setSelectedTraveler(getOrCreateTraveler(module));
                        setShowTravelerModal(true);
                    }}
                    onCompleteTraveler={(travelerId) => {
                        updateTraveler(travelerId, {
                            status: TRAVELER_STATUS.COMPLETE,
                            completedBy: currentUser.name || 'QA Manager',
                            completedAt: new Date().toISOString()
                        });
                    }}
                    stopStations={STOP_STATIONS}
                    TRAVELER_STATUS={TRAVELER_STATUS}
                    QA={QA}
                    canEdit={canEdit}
                    currentUser={currentUser}
                />
            )}
            
            {/* Deviations View */}
            {activeSubTab === 'deviations' && (
                <DeviationsPanel
                    deviations={deviations}
                    updateDeviationStatus={updateDeviationStatus}
                    modules={filteredModules}
                    employees={employees}
                    QA={QA}
                    canEdit={canEdit}
                    currentUser={currentUser}
                    onNewDeviation={() => setShowDeviationModal(true)}
                />
            )}
            
            {/* Reports View */}
            {activeSubTab === 'reports' && (
                <QAReportsPanel
                    metrics={metrics}
                    deviations={deviations}
                    testResults={testResults}
                    travelers={travelers}
                    modules={filteredModules}
                    QA={QA}
                />
            )}
            
            {/* Traveler Detail Modal */}
            {showTravelerModal && selectedTraveler && (
                <TravelerDetailModal
                    traveler={selectedTraveler}
                    module={selectedModule}
                    updateTraveler={updateTraveler}
                    addDeviation={addDeviation}
                    onClose={() => {
                        setShowTravelerModal(false);
                        setSelectedTraveler(null);
                        setSelectedModule(null);
                    }}
                    QA={QA}
                    canEdit={canEdit}
                    currentUser={currentUser}
                />
            )}
            
            {/* New Deviation Modal */}
            {showDeviationModal && (
                <NewDeviationModal
                    modules={filteredModules}
                    employees={employees}
                    onClose={() => setShowDeviationModal(false)}
                    onSave={(deviation) => {
                        addDeviation(deviation);
                        setShowDeviationModal(false);
                    }}
                    QA={QA}
                />
            )}
        </div>
    );
}

// Make component available globally
window.QAModule = QAModule;
