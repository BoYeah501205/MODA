// ============================================================================
// MODA MODULE TRACKER PANEL
// Extracted from App.jsx for better maintainability
// ============================================================================

        // ===== MODULE TRACKER PANEL =====
        // Unified lifecycle view showing all modules across all phases
        function ModuleTrackerPanel({ projects }) {
            const [unifiedModules, setUnifiedModules] = useState({});
            const [stats, setStats] = useState({ total: 0, byPhase: {} });
            const [selectedPhase, setSelectedPhase] = useState('all');
            const [selectedProject, setSelectedProject] = useState('all');
            const [searchTerm, setSearchTerm] = useState('');
            const [selectedModule, setSelectedModule] = useState(null);
            const [sortConfig, setSortConfig] = useState({ key: 'serial', direction: 'asc' });
            
            // Load and sync unified modules
            useEffect(() => {
                const loadUnified = () => {
                    // Check if MODA_UNIFIED is available
                    if (typeof MODA_UNIFIED === 'undefined' || !MODA_UNIFIED) {
                        console.warn('[ModuleTrackerPanel] MODA_UNIFIED not available yet');
                        return;
                    }
                    try {
                        MODA_UNIFIED.migrateFromProjects();
                        setUnifiedModules(MODA_UNIFIED.getAll());
                        setStats(MODA_UNIFIED.getStats());
                    } catch (err) {
                        console.error('[ModuleTrackerPanel] Error loading unified modules:', err);
                    }
                };
                loadUnified();
                
                // Re-sync when projects change
                const interval = setInterval(loadUnified, 5000);
                return () => clearInterval(interval);
            }, [projects]);
            
            // Handle column sort
            const handleSort = (key) => {
                setSortConfig(prev => ({
                    key,
                    direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
                }));
            };
            
            // Sort indicator
            const SortIndicator = ({ columnKey }) => {
                if (sortConfig.key !== columnKey) return <span className="text-gray-300 ml-1">⇅</span>;
                return sortConfig.direction === 'asc' 
                    ? <span className="ml-1">↑</span> 
                    : <span className="ml-1">↓</span>;
            };
            
            // Filter and sort modules
            const filteredModules = useMemo(() => {
                let mods = Object.values(unifiedModules);
                
                if (selectedPhase !== 'all') {
                    mods = mods.filter(m => m.currentPhase === selectedPhase);
                }
                if (selectedProject !== 'all') {
                    mods = mods.filter(m => m.projectId === selectedProject);
                }
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    mods = mods.filter(m => 
                        (m.serialNumber || '').toLowerCase().includes(term) ||
                        (m.projectName || '').toLowerCase().includes(term) ||
                        (m.specs?.blmHitch || '').toLowerCase().includes(term) ||
                        (m.specs?.blmRear || '').toLowerCase().includes(term)
                    );
                }
                
                // Apply sorting
                const phaseOrder = ['production', 'yard', 'transport', 'onsite', 'complete'];
                mods.sort((a, b) => {
                    let comparison = 0;
                    switch (sortConfig.key) {
                        case 'serial':
                            comparison = (a.serialNumber || '').localeCompare(b.serialNumber || '');
                            break;
                        case 'project':
                            comparison = (a.projectName || '').localeCompare(b.projectName || '');
                            break;
                        case 'blm':
                            const blmA = a.specs?.blmHitch || a.specs?.blmRear || '';
                            const blmB = b.specs?.blmHitch || b.specs?.blmRear || '';
                            comparison = blmA.localeCompare(blmB);
                            break;
                        case 'phase':
                            comparison = phaseOrder.indexOf(a.currentPhase) - phaseOrder.indexOf(b.currentPhase);
                            break;
                        case 'progress':
                            const progressA = Object.values(a.production?.stageProgress || {}).reduce((sum, v) => sum + v, 0);
                            const progressB = Object.values(b.production?.stageProgress || {}).reduce((sum, v) => sum + v, 0);
                            comparison = progressA - progressB;
                            break;
                        case 'updated':
                            comparison = new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0);
                            break;
                        default:
                            comparison = (a.production?.buildSequence || 0) - (b.production?.buildSequence || 0);
                    }
                    return sortConfig.direction === 'asc' ? comparison : -comparison;
                });
                
                return mods;
            }, [unifiedModules, selectedPhase, selectedProject, searchTerm, sortConfig]);
            
            const phaseConfig = {
                production: { label: 'Production', iconClass: 'icon-factory', color: '#3B82F6' },
                yard: { label: 'Yard', iconClass: 'icon-box', color: '#6366F1' },
                transport: { label: 'Transport', iconClass: 'icon-truck', color: '#F59E0B' },
                onsite: { label: 'On-Site', iconClass: 'icon-building', color: '#8B5CF6' },
                complete: { label: 'Complete', iconClass: 'icon-check-circle', color: '#10B981' }
            };
            
            const getPhaseColor = (phase) => phaseConfig[phase]?.color || '#6B7280';
            
            const getProductionProgress = (mod) => {
                const progress = mod.production?.stageProgress || {};
                const values = Object.values(progress);
                if (values.length === 0) return 0;
                return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
            };
            
            return (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" style={{color: 'var(--autovol-navy)'}}>
                                <span className="icon-box inline-block w-6 h-6"></span>
                                Module Lifecycle Tracker
                            </h1>
                            <p className="text-gray-600 text-sm mt-1">
                                Unified view of all modules: Production → Yard → Transport → On-Site → Complete
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold" style={{color: 'var(--autovol-red)'}}>{stats.total}</div>
                            <div className="text-sm text-gray-500">Total Modules</div>
                        </div>
                    </div>
                    
                    {/* Phase Summary Cards - responsive grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
                        {Object.entries(phaseConfig).map(([phase, config]) => (
                            <button
                                key={phase}
                                onClick={() => setSelectedPhase(selectedPhase === phase ? 'all' : phase)}
                                className={`p-2 sm:p-4 rounded-lg border-2 transition-all ${
                                    selectedPhase === phase ? 'ring-2 ring-offset-2' : ''
                                }`}
                                style={{
                                    borderColor: config.color,
                                    backgroundColor: selectedPhase === phase ? config.color + '15' : 'white'
                                }}
                            >
                                <div className="flex justify-center mb-1 sm:mb-2">
                                    <span className={`${config.iconClass} inline-block w-6 h-6 sm:w-8 sm:h-8`} style={{filter: `brightness(0) saturate(100%) sepia(1) hue-rotate(${phase === 'production' ? '200' : phase === 'yard' ? '220' : phase === 'transport' ? '30' : phase === 'onsite' ? '250' : '120'}deg)`}}></span>
                                </div>
                                <div className="text-lg sm:text-2xl font-bold" style={{color: config.color}}>
                                    {stats.byPhase?.[phase] || 0}
                                </div>
                                <div className="text-xs sm:text-sm text-gray-600">{config.label}</div>
                            </button>
                        ))}
                    </div>
                    
                    {/* Filters */}
                    <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Search by serial, BLM, or project..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="px-4 py-2 border rounded-lg"
                        >
                            <option value="all">All Projects</option>
                            {projects.filter(p => p.status === 'Active').map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => {
                                setSelectedPhase('all');
                                setSelectedProject('all');
                                setSearchTerm('');
                            }}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            Clear Filters
                        </button>
                    </div>
                    
                    {/* Module List */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 border-b" style={{backgroundColor: 'var(--autovol-navy)'}}>
                            <h3 className="font-semibold text-white">
                                {filteredModules.length} Module{filteredModules.length !== 1 ? 's' : ''} 
                                {selectedPhase !== 'all' && ` in ${phaseConfig[selectedPhase]?.label}`}
                            </h3>
                        </div>
                        
                        {/* Scrollable table container for mobile */}
                        <div className="max-h-[500px] overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                            {filteredModules.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    No modules found matching your criteria
                                </div>
                            ) : (
                                <table className="w-full" style={{ minWidth: '700px' }}>
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('serial')}
                                            >
                                                Serial <SortIndicator columnKey="serial" />
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('project')}
                                            >
                                                Project <SortIndicator columnKey="project" />
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('blm')}
                                            >
                                                BLM <SortIndicator columnKey="blm" />
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('phase')}
                                            >
                                                Phase <SortIndicator columnKey="phase" />
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('progress')}
                                            >
                                                Progress <SortIndicator columnKey="progress" />
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('updated')}
                                            >
                                                Updated <SortIndicator columnKey="updated" />
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredModules.map(mod => {
                                            const progress = getProductionProgress(mod);
                                            const phaseInfo = phaseConfig[mod.currentPhase];
                                            return (
                                                <tr 
                                                    key={mod.id}
                                                    className="hover:bg-gray-50 cursor-pointer"
                                                    onClick={() => setSelectedModule(mod)}
                                                >
                                                    <td className="px-4 py-3">
                                                        <span className="font-mono font-semibold">{mod.serialNumber}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {mod.projectName || 'Unknown'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {mod.specs?.blmHitch || mod.specs?.blmRear ? (
                                                            <span className="font-mono text-xs">
                                                                {mod.specs?.blmHitch}{mod.specs?.blmHitch && mod.specs?.blmRear && ' / '}{mod.specs?.blmRear}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span 
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                                                            style={{backgroundColor: phaseInfo?.color + '20', color: phaseInfo?.color}}
                                                        >
                                                            <span className={`${phaseInfo?.iconClass} inline-block w-3 h-3`}></span>
                                                            {phaseInfo?.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full rounded-full transition-all"
                                                                    style={{
                                                                        width: `${progress}%`,
                                                                        backgroundColor: progress === 100 ? '#10B981' : 'var(--autovol-blue)'
                                                                    }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-gray-500">{progress}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-500">
                                                        {mod.updatedAt ? new Date(mod.updatedAt).toLocaleDateString() : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                    
                    {/* Module Detail Modal */}
                    {selectedModule && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="p-6 border-b sticky top-0 bg-white flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-bold" style={{color: 'var(--autovol-navy)'}}>
                                            Module {selectedModule.serialNumber}
                                        </h2>
                                        <p className="text-sm text-gray-500">{selectedModule.projectName}</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedModule(null)}
                                        className="p-2 hover:bg-gray-100 rounded-lg"
                                    >
                                        ✕
                                    </button>
                                </div>
                                
                                <div className="p-6 space-y-6">
                                    {/* Lifecycle Progress */}
                                    <div>
                                        <h3 className="font-semibold mb-3">Lifecycle Progress</h3>
                                        <div className="flex items-center gap-2">
                                            {Object.entries(phaseConfig).map(([phase, config], idx) => (
                                                <React.Fragment key={phase}>
                                                    <div 
                                                        className={`flex-1 p-2 sm:p-3 rounded-lg text-center ${
                                                            selectedModule.currentPhase === phase ? 'ring-2' : ''
                                                        }`}
                                                        style={{
                                                            backgroundColor: selectedModule.currentPhase === phase ? config.color + '20' : '#F3F4F6',
                                                            ringColor: config.color
                                                        }}
                                                    >
                                                        <div className="flex justify-center">
                                                            <span className={`${config.iconClass} inline-block w-5 h-5 sm:w-6 sm:h-6`}></span>
                                                        </div>
                                                        <div className="text-xs mt-1" style={{
                                                            color: selectedModule.currentPhase === phase ? config.color : '#6B7280'
                                                        }}>{config.label}</div>
                                                    </div>
                                                    {idx < 3 && (
                                                        <div className="text-gray-300">→'</div>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Specs */}
                                    <div>
                                        <h3 className="font-semibold mb-3">Specifications</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="p-3 bg-gray-50 rounded">
                                                <div className="text-gray-500">BLM Hitch</div>
                                                <div className="font-mono">{selectedModule.specs?.blmHitch || '-'}</div>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded">
                                                <div className="text-gray-500">BLM Rear</div>
                                                <div className="font-mono">{selectedModule.specs?.blmRear || '-'}</div>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded">
                                                <div className="text-gray-500">Unit Type</div>
                                                <div>{selectedModule.specs?.unit || '-'}</div>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded">
                                                <div className="text-gray-500">Dimensions</div>
                                                <div>
                                                    {selectedModule.specs?.width && selectedModule.specs?.length 
                                                        ? `${selectedModule.specs.width}' x ${selectedModule.specs.length}'`
                                                        : '-'
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Difficulties */}
                                    {Object.values(selectedModule.specs?.difficulties || {}).some(v => v) && (
                                        <div>
                                            <h3 className="font-semibold mb-3">Difficulties</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedModule.specs.difficulties?.sidewall && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">Sidewall</span>}
                                                {selectedModule.specs.difficulties?.stair && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">Stair</span>}
                                                {selectedModule.specs.difficulties?.hr3Wall && <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">3HR Wall</span>}
                                                {selectedModule.specs.difficulties?.short && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Short</span>}
                                                {selectedModule.specs.difficulties?.doubleStudio && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Double Studio</span>}
                                                {selectedModule.specs.difficulties?.sawbox && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Sawbox</span>}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Production Progress */}
                                    <div>
                                        <h3 className="font-semibold mb-3">Production Stages ({getProductionProgress(selectedModule)}% Complete)</h3>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            {Object.entries(selectedModule.production?.stageProgress || {}).map(([stage, progress]) => (
                                                <div key={stage} className="flex items-center gap-2">
                                                    <div className="w-full">
                                                        <div className="flex justify-between text-gray-500 mb-1">
                                                            <span>{stage}</span>
                                                            <span>{progress}%</span>
                                                        </div>
                                                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: `${progress}%`,
                                                                    backgroundColor: progress === 100 ? '#10B981' : progress > 0 ? '#3B82F6' : '#E5E7EB'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* History */}
                                    <div>
                                        <h3 className="font-semibold mb-3">History</h3>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {(selectedModule.history || []).slice().reverse().map((entry, idx) => (
                                                <div key={idx} className="flex gap-3 text-sm">
                                                    <div className="text-gray-400 text-xs w-32 flex-shrink-0">
                                                        {new Date(entry.timestamp).toLocaleString()}
                                                    </div>
                                                    <div className="text-gray-600">{entry.action}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // ============================================================================
        // ENGINEERING ISSUE CONSTANTS
        // ============================================================================
        const ENGINEERING_ISSUE_CATEGORIES = [
            { id: 'design-error', label: 'Design Error', icon: '📐', color: '#EF4444' },
            { id: 'dimension-issue', label: 'Dimension Issue', icon: '📏', color: '#F59E0B' },
            { id: 'material-spec', label: 'Material Specification', icon: '🔧', color: '#3B82F6' },
            { id: 'structural', label: 'Structural Concern', icon: '🏗️', color: '#8B5CF6' },
            { id: 'mep-conflict', label: 'MEP Conflict', icon: '⚡', color: '#EC4899' },
            { id: 'drawing-update', label: 'Drawing Update Needed', icon: '📋', color: '#06B6D4' },
            { id: 'rfi', label: 'RFI (Request for Information)', icon: '❓', color: '#10B981' },
            { id: 'change-order', label: 'Change Order Request', icon: '📝', color: '#6366F1' },
            { id: 'other', label: 'Other', icon: '📌', color: '#6B7280' }
        ];

// Export for use in App.jsx
window.ModuleTrackerPanel = ModuleTrackerPanel;

