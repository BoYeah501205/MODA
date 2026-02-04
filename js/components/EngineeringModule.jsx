/**
 * Engineering Module for MODA
 * 
 * Main dashboard for Engineering Issue Tracker.
 * Allows Production to report issues to Engineering, Supply Chain, etc.
 * Features: Issue submission, dashboard view, filtering, assignment, comments.
 */

const { useState, useEffect, useMemo, useCallback } = React;

function EngineeringModule({ projects = [], employees = [], auth = {} }) {
    // ===== STATE =====
    const [issues, setIssues] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // UI State
    const [activeTab, setActiveTab] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [createContext, setCreateContext] = useState(null);
    
    // Filters
    const [filters, setFilters] = useState({
        search: '',
        priority: '',
        issueType: '',
        project: '',
        assignedTo: ''
    });
    
    // Sort
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');

    // ===== CONSTANTS =====
    const ISSUE_TYPES = window.MODA_SUPABASE_ISSUES?.ISSUE_TYPES || [
        { id: 'shop-drawing', label: 'Shop Drawing', color: '#0057B8' },
        { id: 'design-conflict', label: 'Design Conflict', color: '#7C3AED' },
        { id: 'material-supply', label: 'Material/Supply', color: '#EA580C' },
        { id: 'quality', label: 'Quality Issue', color: '#DC2626' },
        { id: 'engineering-question', label: 'Engineering Question', color: '#0891B2' },
        { id: 'rfi', label: 'RFI Required', color: '#4F46E5' },
        { id: 'other', label: 'Other', color: '#6B7280' }
    ];

    const PRIORITY_LEVELS = window.MODA_SUPABASE_ISSUES?.PRIORITY_LEVELS || [
        { id: 'low', label: 'Low', color: '#10B981' },
        { id: 'medium', label: 'Medium', color: '#F59E0B' },
        { id: 'high', label: 'High', color: '#EA580C' },
        { id: 'critical', label: 'Critical', color: '#DC2626' }
    ];

    const ISSUE_STATUSES = window.MODA_SUPABASE_ISSUES?.ISSUE_STATUSES || [
        { id: 'open', label: 'Open', color: '#DC2626' },
        { id: 'in-progress', label: 'In Progress', color: '#0057B8' },
        { id: 'pending-info', label: 'Pending Info', color: '#F59E0B' },
        { id: 'resolved', label: 'Resolved', color: '#10B981' },
        { id: 'closed', label: 'Closed', color: '#6B7280' }
    ];

    const COLORS = {
        red: '#C8102E',
        blue: '#0057B8',
        charcoal: '#2D3436',
        navy: '#1a365d'
    };

    // ===== DATA LOADING =====
    useEffect(() => {
        // Wait for Supabase to initialize before loading
        const waitForSupabaseAndLoad = async () => {
            // Give Supabase a moment to initialize (it's async)
            let attempts = 0;
            const maxAttempts = 10;
            
            while (attempts < maxAttempts) {
                if (window.MODA_SUPABASE?.isInitialized) {
                    console.log('[Engineering] Supabase ready, loading issues...');
                    break;
                }
                attempts++;
                console.log('[Engineering] Waiting for Supabase initialization... attempt', attempts);
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            loadIssues();
        };
        
        waitForSupabaseAndLoad();
        
        // Listen for storage changes (when issues are added from other components)
        const handleStorageChange = (e) => {
            if (e.key === 'moda_engineering_issues') {
                console.log('[Engineering] Storage changed, reloading issues');
                loadIssues();
            }
        };
        
        // Also listen for custom event (for same-tab updates)
        const handleIssueUpdate = () => {
            console.log('[Engineering] Issue update event received, reloading');
            loadIssues();
        };
        
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('moda-issues-updated', handleIssueUpdate);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('moda-issues-updated', handleIssueUpdate);
        };
    }, []);

    const loadIssues = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            // Debug: Check Supabase state
            console.log('[Engineering] Checking Supabase state:', {
                MODA_SUPABASE: !!window.MODA_SUPABASE,
                isInitialized: window.MODA_SUPABASE?.isInitialized,
                MODA_SUPABASE_ISSUES: !!window.MODA_SUPABASE_ISSUES,
                isAvailable: window.MODA_SUPABASE_ISSUES?.isAvailable?.()
            });
            
            // Try Supabase first (primary source for multi-user sync)
            if (window.MODA_SUPABASE_ISSUES?.isAvailable?.()) {
                console.log('[Engineering] Loading issues from Supabase...');
                try {
                    const data = await window.MODA_SUPABASE_ISSUES.issues.getAll();
                    console.log('[Engineering] Loaded', data?.length || 0, 'issues from Supabase');
                    
                    // If Supabase returns empty, also check localStorage (hybrid mode)
                    // This handles the case where issues were created when Supabase was unavailable
                    if (!data || data.length === 0) {
                        const localIssues = loadFromLocalStorageSync();
                        if (localIssues.length > 0) {
                            console.log('[Engineering] Supabase empty, using', localIssues.length, 'issues from localStorage');
                            setIssues(localIssues);
                            return;
                        }
                    }
                    
                    setIssues(data || []);
                } catch (supabaseErr) {
                    console.error('[Engineering] Supabase getAll failed:', supabaseErr);
                    // Fall back to localStorage on Supabase error
                    console.log('[Engineering] Falling back to localStorage due to Supabase error');
                    loadFromLocalStorage();
                }
            } else {
                // Fallback to localStorage (offline mode)
                console.log('[Engineering] Supabase not available, using localStorage fallback');
                loadFromLocalStorage();
            }
        } catch (err) {
            console.error('[Engineering] Error loading issues:', err);
            setError('Failed to load issues');
            setIssues([]);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Sync version that returns data instead of setting state (for hybrid mode check)
    const loadFromLocalStorageSync = () => {
        const stored = localStorage.getItem('moda_engineering_issues');
        if (stored && stored !== 'undefined' && stored !== 'null') {
            try {
                return JSON.parse(stored);
            } catch (parseErr) {
                console.error('[Engineering] Error parsing localStorage:', parseErr);
                return [];
            }
        }
        return [];
    };
    
    const loadFromLocalStorage = () => {
        const issues = loadFromLocalStorageSync();
        console.log('[Engineering] Loaded', issues.length, 'issues from localStorage');
        setIssues(issues);
    };

    // ===== STATISTICS =====
    const stats = useMemo(() => {
        const activeIssues = issues.filter(i => i.status !== 'closed');
        return {
            total: issues.length,
            open: issues.filter(i => i.status === 'open').length,
            inProgress: issues.filter(i => i.status === 'in-progress').length,
            pendingInfo: issues.filter(i => i.status === 'pending-info').length,
            resolved: issues.filter(i => i.status === 'resolved').length,
            closed: issues.filter(i => i.status === 'closed').length,
            critical: activeIssues.filter(i => i.priority === 'critical').length,
            high: activeIssues.filter(i => i.priority === 'high').length
        };
    }, [issues]);

    // ===== FILTERED & SORTED ISSUES =====
    const filteredIssues = useMemo(() => {
        let result = [...issues];

        // Tab filter
        if (activeTab === 'open') {
            result = result.filter(i => i.status === 'open');
        } else if (activeTab === 'in-progress') {
            result = result.filter(i => i.status === 'in-progress' || i.status === 'pending-info');
        } else if (activeTab === 'resolved') {
            result = result.filter(i => i.status === 'resolved' || i.status === 'closed');
        } else if (activeTab === 'my-issues') {
            const userId = auth.userId || window.MODA_SUPABASE?.userProfile?.id;
            result = result.filter(i => 
                i.assigned_to_id === userId || i.submitted_by_id === userId
            );
        }

        // Search filter
        if (filters.search) {
            const search = filters.search.toLowerCase();
            result = result.filter(i =>
                (i.issue_display_id || '').toLowerCase().includes(search) ||
                (i.title || '').toLowerCase().includes(search) ||
                (i.description || '').toLowerCase().includes(search) ||
                (i.blm_id || '').toLowerCase().includes(search) ||
                (i.project_name || '').toLowerCase().includes(search)
            );
        }

        // Priority filter
        if (filters.priority) {
            result = result.filter(i => i.priority === filters.priority);
        }

        // Type filter
        if (filters.issueType) {
            result = result.filter(i => i.issue_type === filters.issueType);
        }

        // Project filter
        if (filters.project) {
            result = result.filter(i => i.project_id === filters.project);
        }

        // Assigned to filter
        if (filters.assignedTo) {
            result = result.filter(i => i.assigned_to_id === filters.assignedTo);
        }

        // Sort
        result.sort((a, b) => {
            let aVal, bVal;
            
            if (sortBy === 'priority') {
                const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                aVal = priorityOrder[a.priority] ?? 99;
                bVal = priorityOrder[b.priority] ?? 99;
            } else if (sortBy === 'created_at' || sortBy === 'updated_at') {
                aVal = new Date(a[sortBy] || 0);
                bVal = new Date(b[sortBy] || 0);
            } else {
                aVal = a[sortBy] || '';
                bVal = b[sortBy] || '';
            }

            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        });

        return result;
    }, [issues, activeTab, filters, sortBy, sortOrder, auth.userId]);

    // ===== HANDLERS =====
    const handleCreateIssue = (context = null) => {
        setCreateContext(context);
        setShowCreateModal(true);
    };

    const handleIssueCreated = async (newIssue) => {
        try {
            if (window.MODA_SUPABASE_ISSUES?.issues) {
                const created = await window.MODA_SUPABASE_ISSUES.issues.create(newIssue);
                setIssues(prev => [created, ...prev]);
            } else {
                // localStorage fallback
                const issueNumber = parseInt(localStorage.getItem('moda_issue_counter') || '0', 10) + 1;
                localStorage.setItem('moda_issue_counter', issueNumber.toString());
                
                const issue = {
                    ...newIssue,
                    id: `issue-${Date.now()}`,
                    issue_number: issueNumber,
                    issue_display_id: `ENG-${String(issueNumber).padStart(4, '0')}`,
                    status: 'open',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    comments: [],
                    status_history: [{
                        status: 'open',
                        changed_by: newIssue.submitted_by,
                        timestamp: new Date().toISOString(),
                        note: 'Issue created'
                    }]
                };
                
                const updated = [issue, ...issues];
                setIssues(updated);
                localStorage.setItem('moda_engineering_issues', JSON.stringify(updated));
            }
            setShowCreateModal(false);
            setCreateContext(null);
        } catch (err) {
            console.error('[Engineering] Error creating issue:', err);
            throw err;
        }
    };

    const handleViewIssue = (issue) => {
        setSelectedIssue(issue);
        setShowDetailModal(true);
    };

    const handleIssueUpdated = async (updatedIssue) => {
        setIssues(prev => prev.map(i => i.id === updatedIssue.id ? updatedIssue : i));
        setSelectedIssue(updatedIssue);
    };

    const handleCloseDetail = () => {
        setShowDetailModal(false);
        setSelectedIssue(null);
    };
    
    const handleIssueDeleted = (issueId) => {
        setIssues(prev => prev.filter(i => i.id !== issueId));
        setShowDetailModal(false);
        setSelectedIssue(null);
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            priority: '',
            issueType: '',
            project: '',
            assignedTo: ''
        });
    };

    // ===== HELPERS =====
    const getStatusColor = (status) => {
        const found = ISSUE_STATUSES.find(s => s.id === status);
        return found?.color || '#6B7280';
    };

    const getPriorityColor = (priority) => {
        const found = PRIORITY_LEVELS.find(p => p.id === priority);
        return found?.color || '#6B7280';
    };

    const getTypeLabel = (typeId) => {
        const found = ISSUE_TYPES.find(t => t.id === typeId);
        return found?.label || typeId;
    };

    const getTimeAgo = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const hasActiveFilters = filters.search || filters.priority || filters.issueType || filters.project || filters.assignedTo;

    // ===== RENDER =====
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading Engineering Issues...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="engineering-module">
            {/* Header */}
            <div className="bg-white rounded-lg shadow mb-6 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: COLORS.navy }}>
                            Engineering Issue Tracker
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Track and resolve production issues with Engineering
                        </p>
                    </div>
                    <button
                        onClick={() => handleCreateIssue()}
                        className="inline-flex items-center px-4 py-2 rounded-lg text-white font-medium transition-colors"
                        style={{ backgroundColor: COLORS.blue }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#004494'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = COLORS.blue}
                    >
                        <span className="icon-plus mr-2" style={{ width: '20px', height: '20px', display: 'inline-block' }}></span>
                        Report Issue
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <div className="text-2xl font-bold text-red-600">{stats.open}</div>
                        <div className="text-sm text-red-700">Open</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                        <div className="text-sm text-blue-700">In Progress</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <div className="text-2xl font-bold text-yellow-600">{stats.pendingInfo}</div>
                        <div className="text-sm text-yellow-700">Pending Info</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
                        <div className="text-sm text-green-700">Resolved</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <div className="text-2xl font-bold text-orange-600">{stats.critical + stats.high}</div>
                        <div className="text-sm text-orange-700">High Priority</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
                        <div className="text-sm text-gray-700">Total Issues</div>
                    </div>
                </div>
            </div>

            {/* Tabs & Filters */}
            <div className="bg-white rounded-lg shadow mb-6">
                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <div className="flex overflow-x-auto">
                        {[
                            { id: 'all', label: 'All Issues', count: stats.total },
                            { id: 'open', label: 'Open', count: stats.open },
                            { id: 'in-progress', label: 'In Progress', count: stats.inProgress + stats.pendingInfo },
                            { id: 'resolved', label: 'Resolved', count: stats.resolved + stats.closed },
                            { id: 'my-issues', label: 'My Issues', count: null }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                                {tab.count !== null && (
                                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                        activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4">
                    <div className="flex flex-wrap gap-3">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px]">
                            <input
                                type="text"
                                placeholder="Search issues..."
                                value={filters.search}
                                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Priority Filter */}
                        <select
                            value={filters.priority}
                            onChange={(e) => setFilters(f => ({ ...f, priority: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Priorities</option>
                            {PRIORITY_LEVELS.map(p => (
                                <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                        </select>

                        {/* Type Filter */}
                        <select
                            value={filters.issueType}
                            onChange={(e) => setFilters(f => ({ ...f, issueType: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Types</option>
                            {ISSUE_TYPES.map(t => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                        </select>

                        {/* Project Filter */}
                        <select
                            value={filters.project}
                            onChange={(e) => setFilters(f => ({ ...f, project: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Projects</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        {/* Sort */}
                        <select
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [by, order] = e.target.value.split('-');
                                setSortBy(by);
                                setSortOrder(order);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="created_at-desc">Newest First</option>
                            <option value="created_at-asc">Oldest First</option>
                            <option value="priority-asc">Priority (High to Low)</option>
                            <option value="priority-desc">Priority (Low to High)</option>
                            <option value="updated_at-desc">Recently Updated</option>
                        </select>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Issues List */}
            <div className="bg-white rounded-lg shadow">
                {filteredIssues.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-gray-400 mb-4">
                            <span className="icon-inbox" style={{ width: '48px', height: '48px', display: 'inline-block' }}></span>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No issues found</h3>
                        <p className="text-gray-500">
                            {hasActiveFilters 
                                ? 'Try adjusting your filters'
                                : 'Click "Report Issue" to create the first one'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredIssues.map(issue => (
                            <div
                                key={issue.id}
                                onClick={() => handleViewIssue(issue)}
                                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Priority Indicator */}
                                    <div
                                        className="w-1 h-16 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: getPriorityColor(issue.priority) }}
                                    ></div>

                                    {/* Main Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-sm text-gray-500">
                                                {issue.issue_display_id}
                                            </span>
                                            <span
                                                className="px-2 py-0.5 rounded text-xs font-medium"
                                                style={{
                                                    backgroundColor: `${getStatusColor(issue.status)}15`,
                                                    color: getStatusColor(issue.status)
                                                }}
                                            >
                                                {ISSUE_STATUSES.find(s => s.id === issue.status)?.label || issue.status}
                                            </span>
                                            <span
                                                className="px-2 py-0.5 rounded text-xs font-medium"
                                                style={{
                                                    backgroundColor: `${getPriorityColor(issue.priority)}15`,
                                                    color: getPriorityColor(issue.priority)
                                                }}
                                            >
                                                {PRIORITY_LEVELS.find(p => p.id === issue.priority)?.label || issue.priority}
                                            </span>
                                        </div>

                                        <h3 className="font-medium text-gray-900 truncate">
                                            {issue.title || issue.description?.substring(0, 60) || 'Untitled Issue'}
                                        </h3>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                                            {issue.blm_id && (
                                                <span className="flex items-center gap-1">
                                                    <span className="icon-module" style={{ width: '14px', height: '14px', display: 'inline-block' }}></span>
                                                    {issue.blm_id}
                                                </span>
                                            )}
                                            {issue.project_name && (
                                                <span className="flex items-center gap-1">
                                                    <span className="icon-folder" style={{ width: '14px', height: '14px', display: 'inline-block' }}></span>
                                                    {issue.project_name}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <span className="icon-tag" style={{ width: '14px', height: '14px', display: 'inline-block' }}></span>
                                                {getTypeLabel(issue.issue_type)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="icon-clock" style={{ width: '14px', height: '14px', display: 'inline-block' }}></span>
                                                {getTimeAgo(issue.created_at)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Right Side Info */}
                                    <div className="flex-shrink-0 text-right">
                                        {issue.assigned_to ? (
                                            <div className="text-sm">
                                                <div className="text-gray-500">Assigned to</div>
                                                <div className="font-medium text-gray-900">{issue.assigned_to}</div>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400 italic">Unassigned</span>
                                        )}
                                        {issue.comments?.length > 0 && (
                                            <div className="flex items-center justify-end gap-1 mt-2 text-sm text-gray-500">
                                                <span className="icon-message" style={{ width: '14px', height: '14px', display: 'inline-block' }}></span>
                                                {issue.comments.length}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Issue Modal */}
            {showCreateModal && (
                <IssueSubmissionModal
                    context={createContext}
                    projects={projects}
                    employees={employees}
                    auth={auth}
                    onSubmit={handleIssueCreated}
                    onClose={() => {
                        setShowCreateModal(false);
                        setCreateContext(null);
                    }}
                />
            )}

            {/* Issue Detail Modal */}
            {showDetailModal && selectedIssue && (
                <IssueDetailModal
                    issue={selectedIssue}
                    employees={employees}
                    auth={auth}
                    onUpdate={handleIssueUpdated}
                    onDelete={handleIssueDeleted}
                    onClose={handleCloseDetail}
                />
            )}
        </div>
    );
}

// Export to window for global access
window.EngineeringModule = EngineeringModule;
