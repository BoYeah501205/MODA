/**
 * HeatMapMatrix Component
 * Displays and allows editing of difficulty settings per project
 * Grid view: Rows = Difficulty Indicators, Columns = Stations
 * Each cell shows the difficulty category (Easy/Average/Medium/Hard/Very Hard)
 */

const { useState, useEffect, useMemo } = React;

// Difficulty categories with colors
const DIFFICULTY_CATEGORIES = [
    { id: 'easy', label: 'Easy', color: 'bg-green-100 text-green-800 border-green-300' },
    { id: 'average', label: 'Average', color: 'bg-gray-100 text-gray-800 border-gray-300' },
    { id: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { id: 'hard', label: 'Hard', color: 'bg-orange-100 text-orange-800 border-orange-300' },
    { id: 'very_hard', label: 'Very Hard', color: 'bg-red-100 text-red-800 border-red-300' }
];

// Get color class for a difficulty category
const getDifficultyColor = (category) => {
    const found = DIFFICULTY_CATEGORIES.find(c => c.id === category);
    return found ? found.color : 'bg-gray-100 text-gray-800 border-gray-300';
};

// Get label for a difficulty category
const getDifficultyLabel = (category) => {
    const found = DIFFICULTY_CATEGORIES.find(c => c.id === category);
    return found ? found.label : 'Average';
};

function HeatMapMatrix({ 
    project, 
    productionStages,
    onClose,
    canEdit = false 
}) {
    const [indicators, setIndicators] = useState([]);
    const [heatMapData, setHeatMapData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [editingCell, setEditingCell] = useState(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [pendingChanges, setPendingChanges] = useState({});

    // Load data on mount
    useEffect(() => {
        loadData();
    }, [project?.id]);

    const loadData = async () => {
        if (!project?.id) return;
        
        setLoading(true);
        setError(null);
        
        try {
            // Get API from window global
            const api = window.HeatMapAPI;
            console.log('[HeatMapMatrix] Loading data, api:', !!api);
            if (!api) {
                throw new Error('HeatMapAPI not loaded');
            }
            
            // Load indicators
            const indicatorsData = await api.getDifficultyIndicators();
            console.log('[HeatMapMatrix] Indicators loaded:', indicatorsData);
            setIndicators(indicatorsData);
            
            // Load heat map for this project
            let heatMap = await api.getProjectHeatMap(project.id);
            
            // If no heat map exists, initialize with defaults
            if (!heatMap || heatMap.length === 0) {
                await api.initializeProjectHeatMap(project.id);
                heatMap = await api.getProjectHeatMap(project.id);
            }
            
            setHeatMapData(heatMap);
        } catch (err) {
            console.error('Error loading heat map data:', err);
            setError('Failed to load heat map data');
        } finally {
            setLoading(false);
        }
    };

    // Build matrix data structure for display
    const matrixData = useMemo(() => {
        const matrix = {};
        
        for (const indicator of indicators) {
            matrix[indicator.id] = {};
            
            for (const stage of productionStages) {
                // Check pending changes first
                const pendingKey = `${indicator.id}|${stage.id}`;
                if (pendingChanges[pendingKey]) {
                    matrix[indicator.id][stage.id] = pendingChanges[pendingKey];
                } else {
                    // Find existing entry
                    const entry = heatMapData.find(
                        e => e.difficulty_indicator_id === indicator.id && e.station_id === stage.id
                    );
                    matrix[indicator.id][stage.id] = entry?.difficulty_category || 'average';
                }
            }
        }
        
        return matrix;
    }, [indicators, heatMapData, productionStages, pendingChanges]);

    // Handle cell click to edit
    const handleCellClick = (indicatorId, stationId) => {
        if (!canEdit) return;
        setEditingCell({ indicatorId, stationId });
    };

    // Handle category selection
    const handleCategorySelect = (category) => {
        if (!editingCell) return;
        
        const key = `${editingCell.indicatorId}|${editingCell.stationId}`;
        setPendingChanges(prev => ({
            ...prev,
            [key]: category
        }));
        setHasChanges(true);
        setEditingCell(null);
    };

    // Save all pending changes
    const handleSave = async () => {
        if (!hasChanges || Object.keys(pendingChanges).length === 0) return;
        
        setSaving(true);
        setError(null);
        
        try {
            const api = window.HeatMapAPI;
            if (!api) {
                throw new Error('HeatMapAPI not loaded');
            }
            
            const entries = Object.entries(pendingChanges).map(([key, category]) => {
                const [indicatorId, stationId] = key.split('|');
                return {
                    indicatorId,
                    stationId,
                    difficultyCategory: category
                };
            });
            
            const success = await api.bulkUpdateHeatMap(project.id, entries);
            
            if (success) {
                // Reload data to get fresh state
                await loadData();
                setPendingChanges({});
                setHasChanges(false);
            } else {
                setError('Failed to save changes');
            }
        } catch (err) {
            console.error('Error saving heat map:', err);
            setError('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    // Discard pending changes
    const handleDiscard = () => {
        setPendingChanges({});
        setHasChanges(false);
        setEditingCell(null);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 max-w-md">
                    <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-autovol-navy"></div>
                        <span>Loading Heat Map...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-[95vw] max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-autovol-navy">
                            Heat Map Matrix
                        </h2>
                        <p className="text-sm text-gray-600">
                            {project?.name} - Difficulty settings by station
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasChanges && (
                            <>
                                <button
                                    onClick={handleDiscard}
                                    className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                                    disabled={saving}
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-1.5 text-sm bg-autovol-navy text-white rounded hover:bg-autovol-navy-light disabled:opacity-50"
                                    disabled={saving}
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-gray-700"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Error message */}
                {error && (
                    <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {/* Legend */}
                <div className="px-4 py-2 border-b bg-gray-50 flex items-center gap-4 flex-wrap">
                    <span className="text-sm font-medium text-gray-700">Legend:</span>
                    {DIFFICULTY_CATEGORIES.map(cat => (
                        <span 
                            key={cat.id}
                            className={`px-2 py-0.5 text-xs rounded border ${cat.color}`}
                        >
                            {cat.label}
                        </span>
                    ))}
                </div>

                {/* Matrix Grid */}
                <div className="flex-1 overflow-auto p-4">
                    <table className="min-w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="sticky left-0 top-0 z-20 bg-gray-100 border p-2 text-left text-sm font-semibold text-gray-700 min-w-[120px]">
                                    Indicator
                                </th>
                                {productionStages.map(stage => (
                                    <th 
                                        key={stage.id}
                                        className="sticky top-0 z-10 bg-gray-100 border p-2 text-center text-xs font-medium text-gray-700 min-w-[80px] max-w-[100px]"
                                        title={stage.name}
                                    >
                                        <div className="truncate">{stage.dept || stage.name}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {indicators.map(indicator => (
                                <tr key={indicator.id}>
                                    <td className="sticky left-0 z-10 bg-white border p-2 text-sm font-medium text-gray-800">
                                        <div className="flex items-center gap-2">
                                            <span>{indicator.name}</span>
                                            {indicator.is_easier && (
                                                <span className="text-xs text-green-600">(easier)</span>
                                            )}
                                        </div>
                                    </td>
                                    {productionStages.map(stage => {
                                        const category = matrixData[indicator.id]?.[stage.id] || 'average';
                                        const isEditing = editingCell?.indicatorId === indicator.id && 
                                                         editingCell?.stationId === stage.id;
                                        const isPending = pendingChanges[`${indicator.id}|${stage.id}`];
                                        
                                        return (
                                            <td 
                                                key={stage.id}
                                                className={`border p-1 text-center relative ${canEdit ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                                onClick={() => handleCellClick(indicator.id, stage.id)}
                                            >
                                                <span 
                                                    className={`inline-block px-2 py-1 text-xs rounded border ${getDifficultyColor(category)} ${isPending ? 'ring-2 ring-blue-400' : ''}`}
                                                >
                                                    {getDifficultyLabel(category)}
                                                </span>
                                                
                                                {/* Dropdown for editing */}
                                                {isEditing && (
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white border rounded-lg shadow-lg z-[60] py-1 min-w-[100px]">
                                                        {DIFFICULTY_CATEGORIES.map(cat => (
                                                            <button
                                                                key={cat.id}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleCategorySelect(cat.id);
                                                                }}
                                                                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 ${category === cat.id ? 'font-semibold' : ''}`}
                                                            >
                                                                <span className={`inline-block w-3 h-3 rounded mr-2 ${cat.color.split(' ')[0]}`}></span>
                                                                {cat.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
                    {canEdit ? (
                        <p>Click on any cell to change the difficulty level for that indicator/station combination.</p>
                    ) : (
                        <p>View-only mode. Contact an administrator to modify difficulty settings.</p>
                    )}
                </div>
            </div>

            {/* Click outside to close dropdown */}
            {editingCell && (
                <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setEditingCell(null)}
                />
            )}
        </div>
    );
}

// Export for use in App.jsx
window.HeatMapMatrix = HeatMapMatrix;
