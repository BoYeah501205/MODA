/**
 * MODA - Sheet Browser Component
 * 
 * Advanced filtering and viewing of individual drawing sheets extracted from
 * multi-page PDF packages. Supports filtering by module, unit type, discipline,
 * BLM type, and text search.
 */

const { useState, useEffect, useMemo } = React;

const SheetBrowser = ({ 
    projectId, 
    projectName,
    modules = [], 
    onClose,
    auth 
}) => {
    // State
    const [sheets, setSheets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    
    // Filter state
    const [filters, setFilters] = useState({
        moduleId: null,
        unitType: null,
        roomType: null,
        discipline: null,
        blmType: null,
        searchText: ''
    });
    
    // UI state
    const [selectedSheets, setSelectedSheets] = useState(new Set());
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [sortBy, setSortBy] = useState('sheet_number'); // 'sheet_number', 'sheet_name', 'discipline'
    
    // Available filter options
    const [unitTypes, setUnitTypes] = useState([]);
    const [roomTypes, setRoomTypes] = useState([]);
    const [blmTypes, setBlmTypes] = useState([]);
    
    // Check if sheet module is available
    const isAvailable = () => window.MODA_DRAWING_SHEETS?.searchSheets;
    
    // Load filter options from project modules
    useEffect(() => {
        if (!modules || modules.length === 0) return;
        
        // Extract unique unit types from modules
        const units = new Set();
        const rooms = new Set();
        const blms = new Set();
        
        modules.forEach(mod => {
            // Unit types (S1, A1, C1, B2, etc.)
            if (mod.hitchUnit) units.add(mod.hitchUnit);
            if (mod.rearUnit) units.add(mod.rearUnit);
            
            // Room types (LIV/KIT, BED/BA, etc.)
            if (mod.hitchRoomType) rooms.add(mod.hitchRoomType);
            if (mod.rearRoomType) rooms.add(mod.rearRoomType);
            
            // BLM types
            if (mod.hitchBLM) blms.add(mod.hitchBLM);
            if (mod.rearBLM) blms.add(mod.rearBLM);
        });
        
        setUnitTypes(Array.from(units).sort());
        setRoomTypes(Array.from(rooms).sort());
        setBlmTypes(Array.from(blms).sort());
    }, [modules]);
    
    // Load sheets and stats
    useEffect(() => {
        if (!projectId || !isAvailable()) return;
        
        loadSheets();
        loadStats();
    }, [projectId, filters]);
    
    const loadSheets = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const results = await window.MODA_DRAWING_SHEETS.searchSheets({
                projectId,
                ...filters
            });
            
            setSheets(results || []);
        } catch (err) {
            console.error('[SheetBrowser] Error loading sheets:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const loadStats = async () => {
        try {
            const projectStats = await window.MODA_DRAWING_SHEETS.getProjectSheetStats(projectId);
            setStats(projectStats);
        } catch (err) {
            console.error('[SheetBrowser] Error loading stats:', err);
        }
    };
    
    // Get unique disciplines from sheets
    const disciplines = useMemo(() => {
        const unique = new Set();
        sheets.forEach(s => s.discipline && unique.add(s.discipline));
        return Array.from(unique).sort();
    }, [sheets]);
    
    // Sorted and filtered sheets
    const sortedSheets = useMemo(() => {
        const sorted = [...sheets];
        
        switch (sortBy) {
            case 'sheet_name':
                sorted.sort((a, b) => (a.sheet_name || '').localeCompare(b.sheet_name || ''));
                break;
            case 'discipline':
                sorted.sort((a, b) => (a.discipline || '').localeCompare(b.discipline || ''));
                break;
            case 'sheet_number':
            default:
                sorted.sort((a, b) => {
                    if (a.drawing_file_name !== b.drawing_file_name) {
                        return a.drawing_file_name.localeCompare(b.drawing_file_name);
                    }
                    return a.sheet_number - b.sheet_number;
                });
        }
        
        return sorted;
    }, [sheets, sortBy]);
    
    // Handlers
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setSelectedSheets(new Set()); // Clear selection on filter change
    };
    
    const handleToggleSheet = (sheetId) => {
        setSelectedSheets(prev => {
            const next = new Set(prev);
            if (next.has(sheetId)) {
                next.delete(sheetId);
            } else {
                next.add(sheetId);
            }
            return next;
        });
    };
    
    const handleSelectAll = () => {
        if (selectedSheets.size === sortedSheets.length) {
            setSelectedSheets(new Set());
        } else {
            setSelectedSheets(new Set(sortedSheets.map(s => s.sheet_id)));
        }
    };
    
    const handleViewSheet = async (sheet) => {
        const url = window.MODA_DRAWING_SHEETS.getSheetUrl(sheet.storage_path);
        if (url) {
            window.open(url, '_blank');
        }
    };
    
    const handleDownloadSheet = async (sheet) => {
        try {
            await window.MODA_DRAWING_SHEETS.downloadSheet(sheet);
        } catch (err) {
            console.error('[SheetBrowser] Error downloading sheet:', err);
            alert('Failed to download sheet: ' + err.message);
        }
    };
    
    const handleDownloadSelected = async () => {
        const selectedSheetObjects = sortedSheets.filter(s => selectedSheets.has(s.sheet_id));
        
        if (selectedSheetObjects.length === 0) {
            alert('No sheets selected');
            return;
        }
        
        try {
            await window.MODA_DRAWING_SHEETS.downloadSheetsAsZip(
                selectedSheetObjects,
                `${projectName}_sheets.zip`
            );
        } catch (err) {
            console.error('[SheetBrowser] Error downloading sheets:', err);
            alert('Failed to download sheets: ' + err.message);
        }
    };
    
    const handleClearFilters = () => {
        setFilters({
            moduleId: null,
            unitType: null,
            roomType: null,
            discipline: null,
            blmType: null,
            searchText: ''
        });
    };
    
    // Render helpers
    const renderFilters = () => (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Filters</h3>
                <button
                    onClick={handleClearFilters}
                    className="text-sm text-blue-600 hover:text-blue-800"
                >
                    Clear All
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {/* Module Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                    <select
                        value={filters.moduleId || ''}
                        onChange={(e) => handleFilterChange('moduleId', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Modules</option>
                        {modules.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.moduleId || m.module_id}
                            </option>
                        ))}
                    </select>
                </div>
                
                {/* Unit Type Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Type</label>
                    <select
                        value={filters.unitType || ''}
                        onChange={(e) => handleFilterChange('unitType', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Types</option>
                        {unitTypes.map(ut => (
                            <option key={ut} value={ut}>{ut}</option>
                        ))}
                    </select>
                </div>
                
                {/* Room Type Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                    <select
                        value={filters.roomType || ''}
                        onChange={(e) => handleFilterChange('roomType', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Room Types</option>
                        {roomTypes.map(rt => (
                            <option key={rt} value={rt}>{rt}</option>
                        ))}
                    </select>
                </div>
                
                {/* Discipline Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discipline</label>
                    <select
                        value={filters.discipline || ''}
                        onChange={(e) => handleFilterChange('discipline', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Disciplines</option>
                        {Object.values(window.MODA_DRAWING_SHEETS?.DISCIPLINES || {}).map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>
                
                {/* BLM Type Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">BLM Type</label>
                    <select
                        value={filters.blmType || ''}
                        onChange={(e) => handleFilterChange('blmType', e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All BLM Types</option>
                        {blmTypes.map(bt => (
                            <option key={bt} value={bt}>{bt}</option>
                        ))}
                    </select>
                </div>
                
                {/* Search */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <input
                        type="text"
                        value={filters.searchText}
                        onChange={(e) => handleFilterChange('searchText', e.target.value)}
                        placeholder="Sheet name or title..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>
        </div>
    );
    
    const renderStats = () => {
        if (!stats) return null;
        
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-gray-900">{stats.total_sheets}</div>
                    <div className="text-sm text-gray-500">Total Sheets</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-green-600">{stats.linked_modules}</div>
                    <div className="text-sm text-gray-500">Linked to Modules</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-amber-600">{stats.unlinked_sheets}</div>
                    <div className="text-sm text-gray-500">Unlinked</div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-2xl font-bold text-blue-600">{Object.keys(stats.by_discipline).length}</div>
                    <div className="text-sm text-gray-500">Disciplines</div>
                </div>
            </div>
        );
    };
    
    const renderToolbar = () => (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                    {sortedSheets.length} sheet{sortedSheets.length !== 1 ? 's' : ''}
                    {selectedSheets.size > 0 && ` (${selectedSheets.size} selected)`}
                </div>
                
                {selectedSheets.size > 0 && (
                    <button
                        onClick={handleDownloadSelected}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                    >
                        <span className="icon-download w-4 h-4"></span>
                        Download Selected
                    </button>
                )}
            </div>
            
            <div className="flex items-center gap-3">
                {/* Sort */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="sheet_number">Sort by Sheet Number</option>
                    <option value="sheet_name">Sort by Sheet Name</option>
                    <option value="discipline">Sort by Discipline</option>
                </select>
                
                {/* View Mode */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-1.5 rounded text-sm transition ${
                            viewMode === 'grid' 
                                ? 'bg-white shadow text-gray-900' 
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Grid
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 rounded text-sm transition ${
                            viewMode === 'list' 
                                ? 'bg-white shadow text-gray-900' 
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        List
                    </button>
                </div>
            </div>
        </div>
    );
    
    const renderSheetCard = (sheet) => (
        <div
            key={sheet.sheet_id}
            className={`bg-white rounded-lg border-2 p-4 transition cursor-pointer ${
                selectedSheets.has(sheet.sheet_id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleToggleSheet(sheet.sheet_id)}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <input
                            type="checkbox"
                            checked={selectedSheets.has(sheet.sheet_id)}
                            onChange={() => handleToggleSheet(sheet.sheet_id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <h4 className="font-medium text-gray-900 truncate">
                            {sheet.sheet_name || `Sheet ${sheet.sheet_number}`}
                        </h4>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                        {sheet.sheet_title || 'No title'}
                    </p>
                </div>
            </div>
            
            <div className="space-y-2 mb-3">
                {sheet.discipline && (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Discipline:</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">{sheet.discipline}</span>
                    </div>
                )}
                
                {sheet.blm_type && (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">BLM Type:</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">{sheet.blm_type}</span>
                    </div>
                )}
                
                {sheet.module_identifier && (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Module:</span>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded">{sheet.module_identifier}</span>
                    </div>
                )}
                
                {sheet.ocr_confidence && (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">OCR Confidence:</span>
                        <span className={window.MODA_DRAWING_SHEETS?.getConfidenceColor(sheet.ocr_confidence)}>
                            {window.MODA_DRAWING_SHEETS?.formatConfidence(sheet.ocr_confidence)}
                        </span>
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                <button
                    onClick={(e) => { e.stopPropagation(); handleViewSheet(sheet); }}
                    className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition flex items-center justify-center gap-2"
                >
                    <span className="icon-eye w-4 h-4"></span>
                    View
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleDownloadSheet(sheet); }}
                    className="flex-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition flex items-center justify-center gap-2"
                >
                    <span className="icon-download w-4 h-4"></span>
                    Download
                </button>
            </div>
        </div>
    );
    
    const renderSheetList = (sheet) => (
        <tr
            key={sheet.sheet_id}
            className={`hover:bg-gray-50 cursor-pointer ${
                selectedSheets.has(sheet.sheet_id) ? 'bg-blue-50' : ''
            }`}
            onClick={() => handleToggleSheet(sheet.sheet_id)}
        >
            <td className="px-4 py-3">
                <input
                    type="checkbox"
                    checked={selectedSheets.has(sheet.sheet_id)}
                    onChange={() => handleToggleSheet(sheet.sheet_id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
            </td>
            <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{sheet.sheet_name || `Sheet ${sheet.sheet_number}`}</div>
                <div className="text-sm text-gray-500">{sheet.drawing_file_name}</div>
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">{sheet.sheet_title || '-'}</td>
            <td className="px-4 py-3">
                {sheet.discipline && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{sheet.discipline}</span>
                )}
            </td>
            <td className="px-4 py-3">
                {sheet.blm_type && (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded">{sheet.blm_type}</span>
                )}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">{sheet.module_identifier || '-'}</td>
            <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleViewSheet(sheet); }}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded transition"
                        title="View"
                    >
                        <span className="icon-eye w-4 h-4"></span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDownloadSheet(sheet); }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                        title="Download"
                    >
                        <span className="icon-download w-4 h-4"></span>
                    </button>
                </div>
            </td>
        </tr>
    );
    
    // Main render
    if (!isAvailable()) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Sheet Browser Unavailable</h2>
                    <p className="text-gray-600 mb-6">
                        The sheet browser module is not available. Please ensure the drawing sheets module is loaded.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Sheet Browser</h2>
                        <p className="text-sm text-gray-600 mt-1">{projectName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    >
                        <span className="icon-x w-6 h-6"></span>
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {renderStats()}
                    {renderFilters()}
                    {renderToolbar()}
                    
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                            Error loading sheets: {error}
                        </div>
                    ) : sortedSheets.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No sheets found matching your filters.</p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {sortedSheets.map(renderSheetCard)}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedSheets.size === sortedSheets.length && sortedSheets.length > 0}
                                                onChange={handleSelectAll}
                                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sheet Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discipline</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">BLM Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {sortedSheets.map(renderSheetList)}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

window.SheetBrowser = SheetBrowser;
