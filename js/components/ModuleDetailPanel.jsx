// ModuleDetailPanel.jsx - Shared module detail modal
// Used by Projects tab (App.jsx) and Station Task Board (DailyBoardTab)

const { useState, useEffect } = React;

// Difficulty color mappings (shared constants)
const DIFFICULTY_COLORS = {
    sidewall: 'bg-orange-100 text-orange-800',
    stair: 'bg-purple-100 text-purple-800',
    hr3Wall: 'bg-red-100 text-red-800',
    hr2Wall: 'bg-lime-100 text-lime-800',
    short: 'bg-yellow-100 text-yellow-800',
    doubleStudio: 'bg-indigo-100 text-indigo-800',
    common: 'bg-cyan-100 text-cyan-800',
    tile: 'bg-pink-100 text-pink-800',
    sawbox: 'bg-violet-100 text-violet-800'
};

const DIFFICULTY_LABELS = {
    sidewall: 'Ext Sidewall',
    stair: 'Stair',
    hr3Wall: '3HR-Wall',
    hr2Wall: '2HR-Wall',
    short: 'Short',
    doubleStudio: 'Dbl Studio',
    common: 'Common Area',
    tile: 'Tile',
    sawbox: 'Sawbox'
};

/**
 * ModuleDetailPanel - Shared module detail overlay
 * 
 * @param {object} module - Full module object (serialNumber, hitchBLM, rearBLM, buildSequence, etc.)
 * @param {function} onClose - Callback to close the panel
 * @param {array} departments - (optional) Array of dept objects for Production Progress (Station Board)
 * @param {array} assignments - (optional) Task assignment records for completion calculation
 * @param {array} tasks - (optional) Task definitions per department
 */
function ModuleDetailPanel({ module, onClose, departments, assignments, tasks }) {
    if (!module) return null;

    // Close on Escape key
    useEffect(() => {
        const handleEscapeKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscapeKey);
        return () => document.removeEventListener('keydown', handleEscapeKey);
    }, [onClose]);

    // Shop Drawing handler
    const handleOpenShopDrawing = async () => {
        // Try the new Drawings Module system
        if (window.MODA_MODULE_DRAWINGS?.isAvailable()) {
            try {
                let hasDrawings = await window.MODA_MODULE_DRAWINGS.hasDrawings(module.serialNumber);
                let searchTerm = module.serialNumber;
                
                if (!hasDrawings && module.hitchBLM) {
                    hasDrawings = await window.MODA_MODULE_DRAWINGS.hasDrawings(module.hitchBLM);
                    if (hasDrawings) searchTerm = module.hitchBLM;
                }
                if (!hasDrawings && module.rearBLM && module.rearBLM !== module.hitchBLM) {
                    hasDrawings = await window.MODA_MODULE_DRAWINGS.hasDrawings(module.rearBLM);
                    if (hasDrawings) searchTerm = module.rearBLM;
                }
                
                if (hasDrawings) {
                    if (window.location.hash !== '#drawings') {
                        window.location.hash = 'drawings';
                    }
                    sessionStorage.setItem('moda_drawings_module_filter', searchTerm);
                    onClose();
                    return;
                }
            } catch (error) {
                console.error('[ModuleDetailPanel] Error checking drawings:', error);
            }
        }
        
        // Fallback: alert
        const blmToCheck = [module.hitchBLM, module.rearBLM].filter(Boolean);
        const blmList = blmToCheck.length > 0 ? blmToCheck.join(', ') : 'No BLM';
        alert(`Shop Drawing Not Found\n\nNo shop drawing link found for module ${module.serialNumber} (BLM: ${blmList}).\n\nTo add shop drawings:\n1. Go to Drawings > Shop Drawings > Module Packages\n2. Upload drawings to the folder for this module`);
    };

    // Calculate production progress from station board data if departments provided
    const renderProductionProgress = () => {
        if (!departments || departments.length === 0) return null;

        return (
            <div className="mt-4">
                <h3 className="font-semibold text-gray-700 mb-2">Production Progress</h3>
                <div className="space-y-2">
                    {departments.map(dept => {
                        // Get tasks for this department
                        const deptTasks = (tasks || []).filter(t => t.department_id === dept.id);
                        if (deptTasks.length === 0) return null;

                        // Calculate completion: complete / (total - na)
                        let complete = 0;
                        let na = 0;
                        const total = deptTasks.length;

                        deptTasks.forEach(task => {
                            const key = module.serialNumber + '|' + dept.id + '|' + task.id;
                            const status = getCompletionStatus(key);
                            if (status === 'complete') complete++;
                            else if (status === 'na') na++;
                        });

                        const denominator = total - na;
                        const pct = denominator > 0 ? Math.round((complete / denominator) * 100) : 0;

                        return (
                            <div key={dept.id} className="flex items-center gap-3">
                                <span className="w-36 text-sm text-gray-600 truncate">{dept.name}</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-3">
                                    <div 
                                        className={`h-3 rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                                <span className="w-10 text-right text-sm">{pct}%</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // Helper: get completion status from assignments
    const getCompletionStatus = (key) => {
        if (!assignments) return 'not_started';
        // assignments is typically an array of { module_serial, department_id, task_id, status, ... }
        // key format: "serial|deptId|taskId"
        const parts = key.split('|');
        if (parts.length !== 3) return 'not_started';
        const [serial, deptId, taskId] = parts;
        const match = assignments.find(a => 
            a.module_serial === serial && 
            a.department_id === deptId && 
            a.task_id === taskId
        );
        return match ? match.status : 'not_started';
    };

    // Build key-value pairs for the info grid
    const infoFields = [
        ['Hitch BLM', module.hitchBLM],
        ['Rear BLM', module.rearBLM],
        ['Build Sequence', module.buildSequence],
        ['Width', module.moduleWidth ? module.moduleWidth + "'" : null],
        ['Length', module.moduleLength ? module.moduleLength + "'" : null],
        ['Square Footage', module.squareFootage ? parseFloat(module.squareFootage).toFixed(2) + ' SF' : null],
        ['Level', module.level],
        ['Building', module.building],
        ['Stack', module.stack],
        ['Hitch Unit', module.hitchUnit],
        ['Hitch Room', module.hitchRoom],
        ['Hitch Room Type', module.hitchRoomType],
        ['Rear Unit', module.rearUnit],
        ['Rear Room', module.rearRoom],
        ['Rear Room Type', module.rearRoomType],
        ['Unit Type', module.unitType],
        ['Floor Plan', module.floorPlan],
    ].filter(pair => pair[1] !== undefined && pair[1] !== null && pair[1] !== '');

    // Difficulty flags (from either .difficulties object or .tags array)
    const hasDifficulties = module.difficulties && Object.values(module.difficulties).some(v => v);
    const hasTags = module.tags && module.tags.length > 0;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-start p-4 md:p-6 border-b bg-white rounded-t-lg flex-shrink-0">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl md:text-2xl font-bold text-autovol-navy truncate">{module.serialNumber}</h2>
                        {module.buildSequence && (
                            <p className="text-gray-500 text-sm">Build Sequence: {module.buildSequence}</p>
                        )}
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full text-2xl flex-shrink-0 ml-2"
                        aria-label="Close"
                    >
                        &#x2715;
                    </button>
                </div>
                
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
                    
                    {/* Action Buttons */}
                    <div className="mb-6 grid grid-cols-2 gap-3">
                        <button
                            onClick={handleOpenShopDrawing}
                            className="py-3 bg-autovol-navy text-white rounded-lg font-medium hover:bg-autovol-navy-light transition flex items-center justify-center gap-2"
                        >
                            <span className="icon-file"></span> Open Shop Drawing
                        </button>
                        <button
                            onClick={() => alert('License Plate Viewer - Coming Soon!\n\nThis will show the module license plate with download and QR code options.')}
                            className="py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2"
                        >
                            <span className="icon-tag"></span> View License Plate
                        </button>
                    </div>

                    {/* Info Grid */}
                    {infoFields.length > 0 && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                                {infoFields.map(([label, value]) => (
                                    <div key={label}>
                                        <span className="text-gray-500">{label}</span>
                                        <p className="font-medium">{String(value)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Difficulty Indicators (from .difficulties object) */}
                    {hasDifficulties && (
                        <div className="mb-4">
                            <h3 className="font-semibold text-gray-700 mb-2">Difficulty Indicators</h3>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => {
                                    if (!module.difficulties[key]) return null;
                                    return (
                                        <span key={key} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${DIFFICULTY_COLORS[key]}`}>
                                            {label}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Difficulty Flags (from .tags array - Station Board style) */}
                    {!hasDifficulties && hasTags && (
                        <div className="mb-4">
                            <h3 className="font-semibold text-gray-700 mb-2">Difficulty Flags</h3>
                            <div className="flex flex-wrap gap-2">
                                {module.tags.map(tag => (
                                    <span key={tag} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Production Progress (only when departments provided) */}
                    {renderProductionProgress()}
                </div>
            </div>
        </div>
    );
}

window.ModuleDetailPanel = ModuleDetailPanel;
