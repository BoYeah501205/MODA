/**
 * MODA - Analysis Browser Component
 * 
 * Unified browser for AI-extracted drawing analysis data:
 * - Walls: Wall IDs, types, dimensions
 * - Fixtures: MEP fixture counts by category
 * - Changes: Version change tracking
 */

const { useState, useEffect, useMemo } = React;

const AnalysisBrowser = ({ 
    projectId, 
    projectName,
    analysisType, // 'walls' | 'fixtures' | 'changes'
    onClose,
    auth 
}) => {
    // State
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [filterCategory, setFilterCategory] = useState(null);
    
    // Tab configuration
    const TABS = {
        walls: {
            title: 'Wall Schedule',
            icon: 'icon-box',
            color: 'green',
            table: 'sheet_walls',
            columns: ['wall_id', 'wall_type', 'wall_height', 'stud_spacing', 'stud_gauge', 'grid_location'],
            groupBy: 'wall_type'
        },
        fixtures: {
            title: 'MEP Fixtures',
            icon: 'icon-zap',
            color: 'yellow',
            table: 'sheet_mep_fixtures',
            columns: ['fixture_tag', 'fixture_type', 'fixture_category', 'quantity', 'description', 'room_name'],
            groupBy: 'fixture_category'
        },
        changes: {
            title: 'Version Changes',
            icon: 'icon-git-compare',
            color: 'red',
            table: 'drawing_version_changes',
            columns: ['change_type', 'change_category', 'change_severity', 'sheet_name', 'description', 'detected_at'],
            groupBy: 'change_severity'
        }
    };
    
    const config = TABS[analysisType] || TABS.walls;
    
    // Load data
    useEffect(() => {
        if (!projectId || !window.MODA_SUPABASE?.client) return;
        loadData();
    }, [projectId, analysisType]);
    
    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const { data: results, error: queryError } = await window.MODA_SUPABASE.client
                .from(config.table)
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });
            
            if (queryError) throw queryError;
            setData(results || []);
        } catch (err) {
            console.error('[AnalysisBrowser] Error loading data:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Get unique categories for filter
    const categories = useMemo(() => {
        const groupField = config.groupBy;
        const unique = new Set(data.map(item => item[groupField]).filter(Boolean));
        return Array.from(unique).sort();
    }, [data, config.groupBy]);
    
    // Filter data
    const filteredData = useMemo(() => {
        let result = data;
        
        if (filterCategory) {
            result = result.filter(item => item[config.groupBy] === filterCategory);
        }
        
        if (searchText) {
            const search = searchText.toLowerCase();
            result = result.filter(item => 
                Object.values(item).some(val => 
                    String(val).toLowerCase().includes(search)
                )
            );
        }
        
        return result;
    }, [data, filterCategory, searchText, config.groupBy]);
    
    // Summary stats
    const stats = useMemo(() => {
        const grouped = {};
        data.forEach(item => {
            const key = item[config.groupBy] || 'Unknown';
            grouped[key] = (grouped[key] || 0) + 1;
        });
        return grouped;
    }, [data, config.groupBy]);
    
    // Severity color helper
    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'critical': return 'bg-red-100 text-red-800';
            case 'major': return 'bg-orange-100 text-orange-800';
            case 'moderate': return 'bg-yellow-100 text-yellow-800';
            case 'minor': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    // Category color helper
    const getCategoryColor = (category) => {
        switch (category?.toLowerCase()) {
            case 'electrical': return 'bg-yellow-100 text-yellow-800';
            case 'plumbing': return 'bg-blue-100 text-blue-800';
            case 'mechanical': return 'bg-purple-100 text-purple-800';
            case 'fire': case 'fire protection': return 'bg-red-100 text-red-800';
            case 'structural': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className={`px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-${config.color}-50`}>
                    <div className="flex items-center gap-3">
                        <span className={`${config.icon} w-6 h-6 text-${config.color}-600`}></span>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{config.title}</h2>
                            <p className="text-sm text-gray-600">{projectName} • {data.length} items</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-lg transition"
                    >
                        <span className="icon-x w-5 h-5"></span>
                    </button>
                </div>
                
                {/* Summary Cards */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilterCategory(null)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                                !filterCategory 
                                    ? 'bg-gray-800 text-white' 
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                            }`}
                        >
                            All ({data.length})
                        </button>
                        {Object.entries(stats).map(([category, count]) => (
                            <button
                                key={category}
                                onClick={() => setFilterCategory(filterCategory === category ? null : category)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                                    filterCategory === category 
                                        ? 'bg-gray-800 text-white' 
                                        : analysisType === 'changes' 
                                            ? getSeverityColor(category)
                                            : analysisType === 'fixtures'
                                                ? getCategoryColor(category)
                                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                                }`}
                            >
                                {category} ({count})
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Search */}
                <div className="px-6 py-3 border-b border-gray-100">
                    <div className="relative">
                        <span className="icon-search w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></span>
                        <input
                            type="text"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            placeholder="Search..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-600">Loading...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <span className="icon-alert-circle w-12 h-12 text-red-400 mx-auto mb-4"></span>
                            <p className="text-red-600">{error}</p>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="text-center py-12">
                            <span className={`${config.icon} w-12 h-12 text-gray-300 mx-auto mb-4`}></span>
                            <p className="text-gray-500">No {analysisType} data found</p>
                            <p className="text-sm text-gray-400 mt-2">
                                Run AI Analysis on drawings to extract {analysisType}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50">
                                        {config.columns.map(col => (
                                            <th key={col} className="px-4 py-3 text-left font-semibold text-gray-700 border-b">
                                                {col.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.map((item, idx) => (
                                        <tr key={item.id || idx} className="border-b border-gray-100 hover:bg-gray-50">
                                            {config.columns.map(col => (
                                                <td key={col} className="px-4 py-3">
                                                    {col === 'change_severity' ? (
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(item[col])}`}>
                                                            {item[col]}
                                                        </span>
                                                    ) : col === 'fixture_category' ? (
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item[col])}`}>
                                                            {item[col]}
                                                        </span>
                                                    ) : col === 'detected_at' || col === 'created_at' ? (
                                                        <span className="text-gray-500">
                                                            {item[col] ? new Date(item[col]).toLocaleDateString() : '-'}
                                                        </span>
                                                    ) : (
                                                        item[col] || '-'
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        Showing {filteredData.length} of {data.length} items
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// Export for use
window.AnalysisBrowser = AnalysisBrowser;
