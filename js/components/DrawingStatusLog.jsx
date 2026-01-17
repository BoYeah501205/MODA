/**
 * DrawingStatusLog - Matrix view showing shop drawing status for all modules
 * 
 * Features:
 * - Shows all modules with their shop drawing status (has package / missing)
 * - Default sort: Module (M), Level (L), Building (B)
 * - Sawboxes defer to hitch side BLM
 * - Color coded: Green = has drawing, Red = missing drawing
 */

const { useState, useMemo, useCallback } = React;

const DrawingStatusLog = ({ 
    project,
    drawings,
    onClose,
    onNavigateToDrawing
}) => {
    const [sortBy, setSortBy] = useState('module'); // 'module', 'level', 'building', 'sequence'
    const [sortDirection, setSortDirection] = useState('asc');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'has', 'missing'
    const [searchTerm, setSearchTerm] = useState('');
    
    // Parse BLM to extract Building, Level, Module components
    const parseBLM = useCallback((blm) => {
        if (!blm) return { building: '', level: 0, module: 0, raw: '' };
        const normalized = blm.toUpperCase().replace(/[_\-\s]/g, '');
        
        // Pattern: B#L#M## or L#M##
        const match = normalized.match(/(?:B(\d+))?L(\d+)M(\d+)/);
        if (match) {
            return {
                building: match[1] || '1',
                level: parseInt(match[2], 10),
                module: parseInt(match[3], 10),
                raw: normalized
            };
        }
        return { building: '', level: 0, module: 0, raw: normalized };
    }, []);
    
    // Check if a module has a shop drawing
    const moduleHasDrawing = useCallback((module) => {
        if (!drawings || drawings.length === 0) return false;
        
        // For sawboxes, use hitch BLM only
        const primaryBLM = module.sawbox ? module.hitchBLM : (module.hitchBLM || module.rearBLM);
        const secondaryBLM = module.sawbox ? null : (module.rearBLM !== module.hitchBLM ? module.rearBLM : null);
        
        const normalizedPrimary = (primaryBLM || '').toUpperCase().replace(/[_\-\s]/g, '');
        const normalizedSecondary = secondaryBLM ? secondaryBLM.toUpperCase().replace(/[_\-\s]/g, '') : null;
        
        // Extract L#M## patterns for matching
        const primaryLM = normalizedPrimary.match(/L\d+M\d+/)?.[0];
        const secondaryLM = normalizedSecondary?.match(/L\d+M\d+/)?.[0];
        
        return drawings.some(drawing => {
            const fileName = drawing.name.toUpperCase().replace(/[_\-\s]/g, '');
            
            // Check if filename contains the BLM
            if (normalizedPrimary && fileName.includes(normalizedPrimary)) return true;
            if (normalizedSecondary && fileName.includes(normalizedSecondary)) return true;
            
            // Check partial match (L#M## pattern)
            if (primaryLM && fileName.includes(primaryLM)) return true;
            if (secondaryLM && fileName.includes(secondaryLM)) return true;
            
            return false;
        });
    }, [drawings]);
    
    // Find the drawing for a module
    const findDrawingForModule = useCallback((module) => {
        if (!drawings || drawings.length === 0) return null;
        
        const primaryBLM = module.sawbox ? module.hitchBLM : (module.hitchBLM || module.rearBLM);
        const secondaryBLM = module.sawbox ? null : (module.rearBLM !== module.hitchBLM ? module.rearBLM : null);
        
        const normalizedPrimary = (primaryBLM || '').toUpperCase().replace(/[_\-\s]/g, '');
        const normalizedSecondary = secondaryBLM ? secondaryBLM.toUpperCase().replace(/[_\-\s]/g, '') : null;
        
        const primaryLM = normalizedPrimary.match(/L\d+M\d+/)?.[0];
        const secondaryLM = normalizedSecondary?.match(/L\d+M\d+/)?.[0];
        
        return drawings.find(drawing => {
            const fileName = drawing.name.toUpperCase().replace(/[_\-\s]/g, '');
            
            if (normalizedPrimary && fileName.includes(normalizedPrimary)) return true;
            if (normalizedSecondary && fileName.includes(normalizedSecondary)) return true;
            if (primaryLM && fileName.includes(primaryLM)) return true;
            if (secondaryLM && fileName.includes(secondaryLM)) return true;
            
            return false;
        });
    }, [drawings]);
    
    // Process modules with drawing status
    const moduleStatuses = useMemo(() => {
        if (!project?.modules) return [];
        
        return project.modules.map(module => {
            const hasDrawing = moduleHasDrawing(module);
            const drawing = hasDrawing ? findDrawingForModule(module) : null;
            
            // For sawboxes, use hitch BLM for sorting
            const sortBLM = module.sawbox ? module.hitchBLM : (module.hitchBLM || module.rearBLM);
            const parsed = parseBLM(sortBLM);
            
            return {
                module,
                hasDrawing,
                drawing,
                parsed,
                displayBLM: module.hitchBLM === module.rearBLM || !module.rearBLM
                    ? module.hitchBLM
                    : `${module.hitchBLM} / ${module.rearBLM}`
            };
        });
    }, [project?.modules, moduleHasDrawing, findDrawingForModule, parseBLM]);
    
    // Filter and sort modules
    const filteredAndSortedModules = useMemo(() => {
        let results = [...moduleStatuses];
        
        // Filter by status
        if (filterStatus === 'has') {
            results = results.filter(m => m.hasDrawing);
        } else if (filterStatus === 'missing') {
            results = results.filter(m => !m.hasDrawing);
        }
        
        // Filter by search term
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            results = results.filter(m => 
                m.module.serialNumber?.toLowerCase().includes(term) ||
                m.module.hitchBLM?.toLowerCase().includes(term) ||
                m.module.rearBLM?.toLowerCase().includes(term) ||
                String(m.module.buildSequence).includes(term)
            );
        }
        
        // Sort - Default: Module (M), Level (L), Building (B)
        results.sort((a, b) => {
            let cmp = 0;
            
            switch (sortBy) {
                case 'module':
                    // Primary: Module number, Secondary: Level, Tertiary: Building
                    cmp = a.parsed.module - b.parsed.module;
                    if (cmp === 0) cmp = a.parsed.level - b.parsed.level;
                    if (cmp === 0) cmp = String(a.parsed.building).localeCompare(String(b.parsed.building));
                    break;
                case 'level':
                    // Primary: Level, Secondary: Module, Tertiary: Building
                    cmp = a.parsed.level - b.parsed.level;
                    if (cmp === 0) cmp = a.parsed.module - b.parsed.module;
                    if (cmp === 0) cmp = String(a.parsed.building).localeCompare(String(b.parsed.building));
                    break;
                case 'building':
                    // Primary: Building, Secondary: Level, Tertiary: Module
                    cmp = String(a.parsed.building).localeCompare(String(b.parsed.building));
                    if (cmp === 0) cmp = a.parsed.level - b.parsed.level;
                    if (cmp === 0) cmp = a.parsed.module - b.parsed.module;
                    break;
                case 'sequence':
                    // Build sequence
                    cmp = (a.module.buildSequence || 9999) - (b.module.buildSequence || 9999);
                    break;
                default:
                    cmp = a.parsed.module - b.parsed.module;
            }
            
            return sortDirection === 'asc' ? cmp : -cmp;
        });
        
        return results;
    }, [moduleStatuses, filterStatus, searchTerm, sortBy, sortDirection]);
    
    // Statistics
    const stats = useMemo(() => {
        const total = moduleStatuses.length;
        const withDrawings = moduleStatuses.filter(m => m.hasDrawing).length;
        const missing = total - withDrawings;
        const percentage = total > 0 ? Math.round((withDrawings / total) * 100) : 0;
        
        return { total, withDrawings, missing, percentage };
    }, [moduleStatuses]);
    
    // Handle sort column click
    const handleSort = useCallback((column) => {
        if (sortBy === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortDirection('asc');
        }
    }, [sortBy]);
    
    // Render sort indicator
    const SortIndicator = ({ column }) => {
        if (sortBy !== column) return <span className="text-gray-300 ml-1">↕</span>;
        return <span className="text-blue-600 ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Drawing Status Log</h2>
                            <p className="text-sm text-gray-600 mt-1">
                                {project?.name} - Shop Drawing Coverage
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                        >
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Stats Bar */}
                    <div className="mt-4 flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span className="text-sm text-gray-700">
                                <strong>{stats.withDrawings}</strong> with drawings
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-sm text-gray-700">
                                <strong>{stats.missing}</strong> missing
                            </span>
                        </div>
                        <div className="flex-1">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-emerald-500 transition-all"
                                    style={{ width: `${stats.percentage}%` }}
                                ></div>
                            </div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">{stats.percentage}%</span>
                    </div>
                </div>
                
                {/* Filters */}
                <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Show:</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
                        >
                            <option value="all">All Modules ({stats.total})</option>
                            <option value="has">With Drawings ({stats.withDrawings})</option>
                            <option value="missing">Missing Drawings ({stats.missing})</option>
                        </select>
                    </div>
                    
                    <div className="flex-1">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by Serial #, BLM, or Build Seq..."
                            className="w-full max-w-xs text-sm border border-gray-300 rounded-lg px-3 py-1.5"
                        />
                    </div>
                    
                    <div className="text-sm text-gray-500">
                        Showing {filteredAndSortedModules.length} of {stats.total} modules
                    </div>
                </div>
                
                {/* Matrix Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">
                                    Status
                                </th>
                                <th 
                                    className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('sequence')}
                                >
                                    Build Seq <SortIndicator column="sequence" />
                                </th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">
                                    Serial #
                                </th>
                                <th 
                                    className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('building')}
                                >
                                    Building <SortIndicator column="building" />
                                </th>
                                <th 
                                    className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('level')}
                                >
                                    Level <SortIndicator column="level" />
                                </th>
                                <th 
                                    className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                                    onClick={() => handleSort('module')}
                                >
                                    Module <SortIndicator column="module" />
                                </th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">
                                    BLM
                                </th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">
                                    Drawing File
                                </th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">
                                    Flags
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredAndSortedModules.map((item, index) => (
                                <tr 
                                    key={item.module.id || index}
                                    className={`hover:bg-gray-50 ${!item.hasDrawing ? 'bg-red-50' : ''}`}
                                >
                                    <td className="px-4 py-3">
                                        {item.hasDrawing ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                Has Drawing
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                                Missing
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                        #{item.module.buildSequence || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {item.module.serialNumber || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                        B{item.parsed.building || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                        L{item.parsed.level || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                        M{String(item.parsed.module || '-').padStart(2, '0')}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                                        {item.displayBLM || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.drawing ? (
                                            <button
                                                onClick={() => onNavigateToDrawing?.(item.drawing)}
                                                className="text-blue-600 hover:text-blue-800 hover:underline text-xs truncate max-w-[200px] block"
                                                title={item.drawing.name}
                                            >
                                                {item.drawing.name}
                                            </button>
                                        ) : (
                                            <span className="text-gray-400 text-xs">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            {item.module.sawbox && (
                                                <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-800" title="Sawbox - uses hitch BLM">
                                                    SB
                                                </span>
                                            )}
                                            {item.module.sidewall && (
                                                <span className="px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                                                    SW
                                                </span>
                                            )}
                                            {item.module.stair && (
                                                <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                                                    ST
                                                </span>
                                            )}
                                            {item.module.hr3Wall && (
                                                <span className="px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-800">
                                                    3HR
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {filteredAndSortedModules.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            No modules match the current filters
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                        * Sawboxes defer to hitch side BLM for drawing matching
                    </p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// Export to window
window.DrawingStatusLog = DrawingStatusLog;
