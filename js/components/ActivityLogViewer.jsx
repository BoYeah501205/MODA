// ============================================================================
// MODA Activity Log Viewer Component
// Admin UI for viewing and filtering activity logs
// ============================================================================

(function() {
    'use strict';

    const { useState, useEffect, useMemo, useCallback } = React;

    // Action type display config
    const ACTION_TYPE_CONFIG = {
        login: { label: 'Login', color: 'bg-green-100 text-green-800', icon: 'icon-login' },
        logout: { label: 'Logout', color: 'bg-gray-100 text-gray-800', icon: 'icon-logout' },
        login_failed: { label: 'Login Failed', color: 'bg-red-100 text-red-800', icon: 'icon-warning' },
        password_reset: { label: 'Password Reset', color: 'bg-yellow-100 text-yellow-800', icon: 'icon-key' },
        password_change: { label: 'Password Change', color: 'bg-yellow-100 text-yellow-800', icon: 'icon-key' },
        create: { label: 'Create', color: 'bg-blue-100 text-blue-800', icon: 'icon-plus' },
        read: { label: 'View', color: 'bg-gray-100 text-gray-600', icon: 'icon-eye' },
        update: { label: 'Update', color: 'bg-amber-100 text-amber-800', icon: 'icon-edit' },
        delete: { label: 'Delete', color: 'bg-red-100 text-red-800', icon: 'icon-trash' },
        import: { label: 'Import', color: 'bg-purple-100 text-purple-800', icon: 'icon-upload' },
        export: { label: 'Export', color: 'bg-purple-100 text-purple-800', icon: 'icon-download' },
        bulk_update: { label: 'Bulk Update', color: 'bg-orange-100 text-orange-800', icon: 'icon-layers' },
        view: { label: 'View', color: 'bg-gray-100 text-gray-600', icon: 'icon-eye' },
        navigate: { label: 'Navigate', color: 'bg-gray-100 text-gray-500', icon: 'icon-arrow' }
    };

    // Category display config
    const CATEGORY_CONFIG = {
        auth: { label: 'Authentication', color: 'text-green-600' },
        project: { label: 'Project', color: 'text-blue-600' },
        module: { label: 'Module', color: 'text-indigo-600' },
        employee: { label: 'Employee', color: 'text-purple-600' },
        user: { label: 'User', color: 'text-pink-600' },
        permission: { label: 'Permission', color: 'text-red-600' },
        role: { label: 'Role', color: 'text-red-600' },
        deviation: { label: 'Deviation', color: 'text-orange-600' },
        transport: { label: 'Transport', color: 'text-cyan-600' },
        equipment: { label: 'Equipment', color: 'text-teal-600' },
        schedule: { label: 'Schedule', color: 'text-amber-600' },
        system: { label: 'System', color: 'text-gray-600' }
    };

    // Severity config
    const SEVERITY_CONFIG = {
        info: { label: 'Info', color: 'bg-blue-50 border-blue-200', dot: 'bg-blue-400' },
        warning: { label: 'Warning', color: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-400' },
        critical: { label: 'Critical', color: 'bg-red-50 border-red-200', dot: 'bg-red-400' }
    };

    // Format relative time
    function formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    // Format full timestamp
    function formatFullTimestamp(dateString) {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // Single log entry row
    function ActivityLogRow({ log, onUserClick, onEntityClick }) {
        const [expanded, setExpanded] = useState(false);
        
        const actionConfig = ACTION_TYPE_CONFIG[log.action_type] || { 
            label: log.action_type, 
            color: 'bg-gray-100 text-gray-800' 
        };
        const categoryConfig = CATEGORY_CONFIG[log.action_category] || { 
            label: log.action_category, 
            color: 'text-gray-600' 
        };
        const severityConfig = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.info;

        const hasDetails = log.details && Object.keys(log.details).length > 0;

        return (
            <div className={`border-l-4 ${severityConfig.color} border rounded-r-lg mb-2 hover:shadow-sm transition-shadow`}>
                <div 
                    className="p-3 cursor-pointer"
                    onClick={() => hasDetails && setExpanded(!expanded)}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`w-2 h-2 rounded-full mt-2 ${severityConfig.dot}`} />
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionConfig.color}`}>
                                        {actionConfig.label}
                                    </span>
                                    <span className={`text-xs font-medium ${categoryConfig.color}`}>
                                        {categoryConfig.label}
                                    </span>
                                </div>
                                
                                <div className="mt-1 text-sm text-gray-900">
                                    <button 
                                        className="font-medium text-blue-600 hover:underline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onUserClick?.(log.user_id, log.user_email);
                                        }}
                                    >
                                        {log.user_name || log.user_email || 'Unknown'}
                                    </button>
                                    <span className="text-gray-600">
                                        {' '}{log.action_type === 'login' || log.action_type === 'logout' 
                                            ? log.action_type === 'login' ? 'logged in' : 'logged out'
                                            : `${log.action_type}d`}
                                        {log.entity_name && (
                                            <>
                                                {' '}
                                                <button
                                                    className="font-medium text-indigo-600 hover:underline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEntityClick?.(log.entity_type, log.entity_id);
                                                    }}
                                                >
                                                    {log.entity_name}
                                                </button>
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500 whitespace-nowrap">
                            <span title={formatFullTimestamp(log.created_at)}>
                                {formatRelativeTime(log.created_at)}
                            </span>
                            {hasDetails && (
                                <svg 
                                    className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            )}
                        </div>
                    </div>
                </div>
                
                {expanded && hasDetails && (
                    <div className="px-3 pb-3 pt-0">
                        <div className="ml-5 p-2 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                            <pre className="whitespace-pre-wrap text-gray-700">
                                {JSON.stringify(log.details, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Filter panel
    function FilterPanel({ filters, onFilterChange, onReset }) {
        const actionTypes = Object.keys(ACTION_TYPE_CONFIG);
        const categories = Object.keys(CATEGORY_CONFIG);
        const severities = Object.keys(SEVERITY_CONFIG);

        return (
            <div className="bg-white border rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Filters</h3>
                    <button
                        onClick={onReset}
                        className="text-sm text-blue-600 hover:text-blue-800"
                    >
                        Reset
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">User Email</label>
                        <input
                            type="text"
                            value={filters.userEmail || ''}
                            onChange={(e) => onFilterChange({ userEmail: e.target.value || null })}
                            placeholder="Search by email..."
                            className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Action Type</label>
                        <select
                            value={filters.actionType || ''}
                            onChange={(e) => onFilterChange({ actionType: e.target.value || null })}
                            className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Actions</option>
                            {actionTypes.map(type => (
                                <option key={type} value={type}>
                                    {ACTION_TYPE_CONFIG[type].label}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                        <select
                            value={filters.actionCategory || ''}
                            onChange={(e) => onFilterChange({ actionCategory: e.target.value || null })}
                            className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>
                                    {CATEGORY_CONFIG[cat].label}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
                        <select
                            value={filters.severity || ''}
                            onChange={(e) => onFilterChange({ severity: e.target.value || null })}
                            className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Severities</option>
                            {severities.map(sev => (
                                <option key={sev} value={sev}>
                                    {SEVERITY_CONFIG[sev].label}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={filters.startDate ? filters.startDate.split('T')[0] : ''}
                            onChange={(e) => onFilterChange({ 
                                startDate: e.target.value ? new Date(e.target.value).toISOString() : null 
                            })}
                            className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={filters.endDate ? filters.endDate.split('T')[0] : ''}
                            onChange={(e) => onFilterChange({ 
                                endDate: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : null 
                            })}
                            className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Main Activity Log Viewer component
    function ActivityLogViewer({ 
        initialFilters = {},
        showFilters = true,
        showExport = true,
        maxHeight = '600px',
        onUserClick,
        onEntityClick
    }) {
        const [filters, setFilters] = useState({
            userEmail: null,
            actionType: null,
            actionCategory: null,
            severity: null,
            startDate: null,
            endDate: null,
            limit: 50,
            ...initialFilters
        });
        
        const [showFilterPanel, setShowFilterPanel] = useState(false);

        // Use the activity logs hook
        const { logs, loading, error, totalCount, hasMore, refetch, loadMore } = 
            window.useActivityLogs ? window.useActivityLogs(filters) : { 
                logs: [], 
                loading: false, 
                error: 'Activity log hooks not loaded',
                totalCount: 0,
                hasMore: false,
                refetch: () => {},
                loadMore: () => {}
            };

        const handleFilterChange = useCallback((newFilters) => {
            setFilters(prev => ({ ...prev, ...newFilters }));
        }, []);

        const handleResetFilters = useCallback(() => {
            setFilters({
                userEmail: null,
                actionType: null,
                actionCategory: null,
                severity: null,
                startDate: null,
                endDate: null,
                limit: 50
            });
        }, []);

        const handleExport = useCallback(async () => {
            if (logs.length === 0) return;
            
            const csvContent = [
                ['Timestamp', 'User', 'Email', 'Action', 'Category', 'Entity Type', 'Entity Name', 'Severity', 'Details'].join(','),
                ...logs.map(log => [
                    formatFullTimestamp(log.created_at),
                    `"${(log.user_name || '').replace(/"/g, '""')}"`,
                    log.user_email,
                    log.action_type,
                    log.action_category,
                    log.entity_type || '',
                    `"${(log.entity_name || '').replace(/"/g, '""')}"`,
                    log.severity,
                    `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            // Log the export action
            if (window.ActivityLog) {
                window.ActivityLog.logExport('system', 'activity_log', logs.length, 'csv');
            }
        }, [logs]);

        // Count active filters
        const activeFilterCount = useMemo(() => {
            return Object.entries(filters).filter(([key, value]) => 
                value !== null && key !== 'limit'
            ).length;
        }, [filters]);

        return (
            <div className="bg-gray-50 rounded-lg">
                <div className="p-4 border-b bg-white rounded-t-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>
                            <p className="text-sm text-gray-500">
                                {totalCount.toLocaleString()} total entries
                                {activeFilterCount > 0 && ` (${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active)`}
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {showFilters && (
                                <button
                                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                                    className={`px-3 py-1.5 text-sm border rounded-lg flex items-center gap-1 ${
                                        showFilterPanel || activeFilterCount > 0
                                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                                            : 'bg-white hover:bg-gray-50'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                    </svg>
                                    Filters
                                    {activeFilterCount > 0 && (
                                        <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </button>
                            )}
                            
                            <button
                                onClick={refetch}
                                disabled={loading}
                                className="px-3 py-1.5 text-sm border rounded-lg bg-white hover:bg-gray-50 flex items-center gap-1"
                            >
                                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </button>
                            
                            {showExport && (
                                <button
                                    onClick={handleExport}
                                    disabled={logs.length === 0}
                                    className="px-3 py-1.5 text-sm border rounded-lg bg-white hover:bg-gray-50 flex items-center gap-1 disabled:opacity-50"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Export CSV
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                
                {showFilterPanel && (
                    <div className="p-4 border-b">
                        <FilterPanel 
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onReset={handleResetFilters}
                        />
                    </div>
                )}
                
                <div className="p-4" style={{ maxHeight, overflowY: 'auto' }}>
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
                            {error}
                        </div>
                    )}
                    
                    {loading && logs.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p>No activity logs found</p>
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={handleResetFilters}
                                    className="mt-2 text-blue-600 hover:underline"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {logs.map(log => (
                                <ActivityLogRow
                                    key={log.id}
                                    log={log}
                                    onUserClick={onUserClick}
                                    onEntityClick={onEntityClick}
                                />
                            ))}
                            
                            {hasMore && (
                                <div className="text-center py-4">
                                    <button
                                        onClick={loadMore}
                                        disabled={loading}
                                        className="px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        {loading ? 'Loading...' : `Load More (${logs.length} of ${totalCount})`}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Compact activity feed for dashboards
    function ActivityFeed({ limit = 10, showHeader = true }) {
        const { recentLogs, isConnected } = window.useActivityFeed ? 
            window.useActivityFeed({}) : { recentLogs: [], isConnected: false };
        
        const [logs, setLogs] = useState([]);
        const [loading, setLoading] = useState(true);

        // Fetch initial logs
        useEffect(() => {
            async function fetchInitial() {
                if (!window.ActivityLog) {
                    setLoading(false);
                    return;
                }
                
                const result = await window.ActivityLog.getRecentActivity(limit);
                setLogs(result.data || []);
                setLoading(false);
            }
            fetchInitial();
        }, [limit]);

        // Merge real-time logs
        useEffect(() => {
            if (recentLogs.length > 0) {
                setLogs(prev => {
                    const newLogs = [...recentLogs, ...prev];
                    const uniqueLogs = newLogs.filter((log, index, self) =>
                        index === self.findIndex(l => l.id === log.id)
                    );
                    return uniqueLogs.slice(0, limit);
                });
            }
        }, [recentLogs, limit]);

        return (
            <div className="bg-white rounded-lg border">
                {showHeader && (
                    <div className="px-4 py-3 border-b flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">Recent Activity</h3>
                        <div className="flex items-center gap-2">
                            {isConnected && (
                                <span className="flex items-center gap-1 text-xs text-green-600">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    Live
                                </span>
                            )}
                        </div>
                    </div>
                )}
                
                <div className="divide-y max-h-80 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 text-center text-gray-500">Loading...</div>
                    ) : logs.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No recent activity</div>
                    ) : (
                        logs.map(log => {
                            const actionConfig = ACTION_TYPE_CONFIG[log.action_type] || {};
                            return (
                                <div key={log.id} className="px-4 py-2 hover:bg-gray-50">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className={`px-1.5 py-0.5 rounded text-xs ${actionConfig.color || 'bg-gray-100'}`}>
                                            {actionConfig.label || log.action_type}
                                        </span>
                                        <span className="text-gray-900 truncate">
                                            {log.user_name || log.user_email}
                                        </span>
                                        {log.entity_name && (
                                            <span className="text-gray-500 truncate">
                                                - {log.entity_name}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                        {formatRelativeTime(log.created_at)}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    // Export components
    window.ActivityLogViewer = ActivityLogViewer;
    window.ActivityFeed = ActivityFeed;

    console.log('[ActivityLogViewer] Component loaded');
})();
