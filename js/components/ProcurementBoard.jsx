/**
 * ProcurementBoard.jsx - Procurement/Supply Chain Shortage Tracking
 * 
 * Tracks material shortages reported by production teams.
 * Allows logging shortages with impacted stations, modules, and projects.
 */

const ProcurementBoard = ({ projects = [], auth }) => {
    const { useState, useEffect, useCallback, useMemo } = React;

    // ============================================================================
    // STATE
    // ============================================================================
    
    const [shortages, setShortages] = useState([]);
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(null);
    const [showIssueDetailModal, setShowIssueDetailModal] = useState(null);
    const [filterStatus, setFilterStatus] = useState('active');
    const [filterPriority, setFilterPriority] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSection, setActiveSection] = useState('shortages'); // 'shortages' or 'issues'

    // Get constants from the data layer
    const STATUSES = window.MODA_SUPABASE_PROCUREMENT?.SHORTAGE_STATUSES || [
        { id: 'open', label: 'Open', color: '#DC2626' },
        { id: 'ordered', label: 'Ordered', color: '#F59E0B' },
        { id: 'partial', label: 'Partial Delivery', color: '#0891B2' },
        { id: 'resolved', label: 'Resolved', color: '#10B981' },
        { id: 'cancelled', label: 'Cancelled', color: '#6B7280' }
    ];

    const PRIORITIES = window.MODA_SUPABASE_PROCUREMENT?.PRIORITY_LEVELS || [
        { id: 'low', label: 'Low', color: '#10B981' },
        { id: 'medium', label: 'Medium', color: '#F59E0B' },
        { id: 'high', label: 'High', color: '#EA580C' },
        { id: 'critical', label: 'Critical', color: '#DC2626' }
    ];

    const UNITS = window.MODA_SUPABASE_PROCUREMENT?.UNITS_OF_MEASURE || [
        { id: 'ea', label: 'Each (ea)' },
        { id: 'ft', label: 'Feet (ft)' },
        { id: 'lf', label: 'Linear Feet (lf)' },
        { id: 'sqft', label: 'Square Feet (sqft)' },
        { id: 'lbs', label: 'Pounds (lbs)' },
        { id: 'gal', label: 'Gallons (gal)' },
        { id: 'box', label: 'Box' },
        { id: 'roll', label: 'Roll' },
        { id: 'bundle', label: 'Bundle' },
        { id: 'pallet', label: 'Pallet' },
        { id: 'set', label: 'Set' },
        { id: 'kit', label: 'Kit' }
    ];

    // Production stages from constants
    const STATIONS = window.MODA_CONSTANTS?.PRODUCTION_STAGES || [
        { id: 'auto-c', name: 'Auto Ceiling' },
        { id: 'auto-f', name: 'Auto Floor' },
        { id: 'auto-walls', name: 'Auto Walls' },
        { id: 'mezzanine', name: 'Mezzanine' },
        { id: 'elec-ceiling', name: 'Electrical Ceiling' },
        { id: 'wall-set', name: 'Wall Set' },
        { id: 'ceiling-set', name: 'Ceiling Set' },
        { id: 'soffits', name: 'Soffits' },
        { id: 'mech-rough', name: 'Mechanical Rough' },
        { id: 'elec-rough', name: 'Electrical Rough' },
        { id: 'plumb-rough', name: 'Plumbing Rough' },
        { id: 'exteriors', name: 'Exteriors' },
        { id: 'drywall-bp', name: 'Drywall B&P' },
        { id: 'drywall-ttp', name: 'Drywall TTP' },
        { id: 'roofing', name: 'Roofing' },
        { id: 'pre-finish', name: 'Pre-Finish' },
        { id: 'mech-trim', name: 'Mechanical Trim' },
        { id: 'elec-trim', name: 'Electrical Trim' },
        { id: 'plumb-trim', name: 'Plumbing Trim' },
        { id: 'final-finish', name: 'Final Finish' },
        { id: 'sign-off', name: 'Sign-Off' },
        { id: 'close-up', name: 'Close-Up' }
    ];

    // ============================================================================
    // COLORS
    // ============================================================================
    
    const COLORS = {
        charcoal: '#1a1a1a',
        red: '#cc0000',
        blue: '#0057B8',
        white: '#ffffff',
        lightGray: '#f5f5f5',
        mediumGray: '#e0e0e0',
        darkGray: '#666666'
    };

    // ============================================================================
    // DATA LOADING
    // ============================================================================

    const loadShortages = useCallback(async () => {
        try {
            setLoading(true);
            if (window.MODA_SUPABASE_PROCUREMENT?.isAvailable?.()) {
                const data = await window.MODA_SUPABASE_PROCUREMENT.shortages.getAll();
                setShortages(data);
            } else {
                const stored = localStorage.getItem('moda_shortages');
                if (stored) {
                    setShortages(JSON.parse(stored));
                }
            }
        } catch (error) {
            console.error('[ProcurementBoard] Error loading shortages:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadIssues = useCallback(() => {
        try {
            // Load issues routed to supply-chain from the issue routing system
            if (window.MODA_ISSUE_ROUTING?.getIssuesForDashboard) {
                const supplyChainIssues = window.MODA_ISSUE_ROUTING.getIssuesForDashboard('supply-chain');
                setIssues(supplyChainIssues || []);
            } else {
                // Fallback: load directly from localStorage
                const stored = localStorage.getItem('moda_supply_chain_issues');
                if (stored && stored !== 'undefined' && stored !== 'null') {
                    setIssues(JSON.parse(stored));
                }
            }
        } catch (error) {
            console.error('[ProcurementBoard] Error loading issues:', error);
        }
    }, []);

    useEffect(() => {
        loadShortages();
        loadIssues();

        // Subscribe to real-time updates if available
        if (window.MODA_SUPABASE_PROCUREMENT?.isAvailable?.()) {
            const unsubscribe = window.MODA_SUPABASE_PROCUREMENT.shortages.onSnapshot(
                (data) => setShortages(data)
            );
            return () => unsubscribe?.();
        }

        // Listen for issue updates
        const handleIssueUpdate = (e) => {
            if (e.detail?.dashboard === 'supply-chain') {
                loadIssues();
            }
        };
        window.addEventListener('moda-issues-updated', handleIssueUpdate);
        
        return () => {
            window.removeEventListener('moda-issues-updated', handleIssueUpdate);
        };
    }, [loadShortages, loadIssues]);

    // ============================================================================
    // FILTERED DATA
    // ============================================================================

    const filteredShortages = useMemo(() => {
        return shortages.filter(s => {
            // Status filter
            if (filterStatus === 'active' && ['resolved', 'cancelled'].includes(s.status)) {
                return false;
            }
            if (filterStatus !== 'all' && filterStatus !== 'active' && s.status !== filterStatus) {
                return false;
            }

            // Priority filter
            if (filterPriority !== 'all' && s.priority !== filterPriority) {
                return false;
            }

            // Search filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesItem = s.item?.toLowerCase().includes(term);
                const matchesSupplier = s.supplier?.toLowerCase().includes(term);
                const matchesId = s.shortage_display_id?.toLowerCase().includes(term);
                if (!matchesItem && !matchesSupplier && !matchesId) {
                    return false;
                }
            }

            return true;
        });
    }, [shortages, filterStatus, filterPriority, searchTerm]);

    // ============================================================================
    // STATS
    // ============================================================================

    const stats = useMemo(() => {
        const active = shortages.filter(s => !['resolved', 'cancelled'].includes(s.status));
        const now = new Date();
        
        return {
            total: shortages.length,
            active: active.length,
            critical: active.filter(s => s.priority === 'critical').length,
            high: active.filter(s => s.priority === 'high').length,
            overdue: active.filter(s => s.delivery_eta && new Date(s.delivery_eta) < now).length
        };
    }, [shortages]);

    // Issue stats
    const issueStats = useMemo(() => {
        const activeIssues = issues.filter(i => !['resolved', 'closed'].includes(i.status));
        return {
            total: issues.length,
            open: issues.filter(i => i.status === 'open').length,
            inProgress: issues.filter(i => i.status === 'in-progress').length,
            resolved: issues.filter(i => i.status === 'resolved' || i.status === 'closed').length,
            critical: activeIssues.filter(i => i.priority === 'critical').length,
            high: activeIssues.filter(i => i.priority === 'high').length
        };
    }, [issues]);

    // Filtered issues
    const filteredIssues = useMemo(() => {
        return issues.filter(issue => {
            // Status filter
            if (filterStatus === 'active' && ['resolved', 'closed'].includes(issue.status)) {
                return false;
            }
            if (filterStatus !== 'all' && filterStatus !== 'active' && issue.status !== filterStatus) {
                return false;
            }

            // Priority filter
            if (filterPriority !== 'all' && issue.priority !== filterPriority) {
                return false;
            }

            // Search filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchesTitle = issue.title?.toLowerCase().includes(term);
                const matchesDesc = issue.description?.toLowerCase().includes(term);
                const matchesId = issue.issue_display_id?.toLowerCase().includes(term);
                const matchesBlm = issue.blm_id?.toLowerCase().includes(term);
                if (!matchesTitle && !matchesDesc && !matchesId && !matchesBlm) {
                    return false;
                }
            }

            return true;
        });
    }, [issues, filterStatus, filterPriority, searchTerm]);

    // Issue status constants
    const ISSUE_STATUSES = [
        { id: 'open', label: 'Open', color: '#DC2626' },
        { id: 'in-progress', label: 'In Progress', color: '#0057B8' },
        { id: 'pending-info', label: 'Pending Info', color: '#F59E0B' },
        { id: 'resolved', label: 'Resolved', color: '#10B981' },
        { id: 'closed', label: 'Closed', color: '#6B7280' }
    ];

    // ============================================================================
    // HANDLERS
    // ============================================================================

    const handleCreateShortage = async (formData) => {
        try {
            const userProfile = window.MODA_SUPABASE?.userProfile;
            const currentUser = window.MODA_SUPABASE?.currentUser;
            
            const newShortage = {
                ...formData,
                reported_by: userProfile?.name || currentUser?.email || 'Unknown',
                reported_by_id: userProfile?.id || currentUser?.id || null
            };

            if (window.MODA_SUPABASE_PROCUREMENT?.isAvailable?.()) {
                await window.MODA_SUPABASE_PROCUREMENT.shortages.create(newShortage);
            } else {
                const stored = JSON.parse(localStorage.getItem('moda_shortages') || '[]');
                const shortage = {
                    ...newShortage,
                    id: `shortage-${Date.now()}`,
                    shortage_display_id: `SHT-${String(stored.length + 1).padStart(4, '0')}`,
                    status: 'open',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                stored.unshift(shortage);
                localStorage.setItem('moda_shortages', JSON.stringify(stored));
                setShortages(stored);
            }

            setShowAddModal(false);
            loadShortages();
        } catch (error) {
            console.error('[ProcurementBoard] Error creating shortage:', error);
            alert('Failed to create shortage: ' + error.message);
        }
    };

    const handleUpdateStatus = async (shortageId, newStatus) => {
        try {
            const userProfile = window.MODA_SUPABASE?.userProfile;
            const currentUser = window.MODA_SUPABASE?.currentUser;

            if (window.MODA_SUPABASE_PROCUREMENT?.isAvailable?.()) {
                await window.MODA_SUPABASE_PROCUREMENT.shortages.updateStatus(
                    shortageId,
                    newStatus,
                    userProfile?.id || currentUser?.id,
                    userProfile?.name || currentUser?.email
                );
            } else {
                const stored = JSON.parse(localStorage.getItem('moda_shortages') || '[]');
                const index = stored.findIndex(s => s.id === shortageId);
                if (index !== -1) {
                    stored[index].status = newStatus;
                    stored[index].updated_at = new Date().toISOString();
                    if (newStatus === 'resolved') {
                        stored[index].resolved_at = new Date().toISOString();
                        stored[index].resolved_by = userProfile?.name || currentUser?.email;
                    }
                    localStorage.setItem('moda_shortages', JSON.stringify(stored));
                    setShortages(stored);
                }
            }
            loadShortages();
        } catch (error) {
            console.error('[ProcurementBoard] Error updating status:', error);
        }
    };

    const handleUpdateIssueStatus = (issueId, newStatus) => {
        try {
            const userProfile = window.MODA_SUPABASE?.userProfile;
            const currentUser = window.MODA_SUPABASE?.currentUser;
            const userName = userProfile?.name || currentUser?.email || 'Unknown';

            if (window.MODA_ISSUE_ROUTING?.updateIssue) {
                window.MODA_ISSUE_ROUTING.updateIssue(issueId, {
                    status: newStatus,
                    status_history: [
                        ...(issues.find(i => i.id === issueId)?.status_history || []),
                        {
                            status: newStatus,
                            changed_by: userName,
                            timestamp: new Date().toISOString()
                        }
                    ]
                }, 'moda_supply_chain_issues');
                loadIssues();
            }
        } catch (error) {
            console.error('[ProcurementBoard] Error updating issue status:', error);
        }
    };

    // ============================================================================
    // STYLES
    // ============================================================================

    const styles = {
        container: {
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: COLORS.lightGray
        },
        header: {
            background: COLORS.charcoal,
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `4px solid ${COLORS.red}`
        },
        headerTitle: {
            color: COLORS.white,
            fontSize: '20px',
            fontWeight: '600',
            margin: 0
        },
        statsBar: {
            display: 'flex',
            gap: '16px',
            padding: '16px 24px',
            background: COLORS.white,
            borderBottom: `1px solid ${COLORS.mediumGray}`
        },
        statCard: {
            padding: '12px 20px',
            borderRadius: '8px',
            textAlign: 'center',
            minWidth: '100px'
        },
        statValue: {
            fontSize: '24px',
            fontWeight: '700',
            margin: 0
        },
        statLabel: {
            fontSize: '12px',
            color: COLORS.darkGray,
            margin: 0
        },
        toolbar: {
            display: 'flex',
            gap: '12px',
            padding: '16px 24px',
            background: COLORS.white,
            borderBottom: `1px solid ${COLORS.mediumGray}`,
            flexWrap: 'wrap',
            alignItems: 'center'
        },
        searchInput: {
            padding: '8px 12px',
            border: `1px solid ${COLORS.mediumGray}`,
            borderRadius: '6px',
            fontSize: '14px',
            minWidth: '200px'
        },
        select: {
            padding: '8px 12px',
            border: `1px solid ${COLORS.mediumGray}`,
            borderRadius: '6px',
            fontSize: '14px',
            background: COLORS.white
        },
        addButton: {
            padding: '10px 20px',
            background: COLORS.blue,
            color: COLORS.white,
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            marginLeft: 'auto'
        },
        tableContainer: {
            flex: 1,
            overflow: 'auto',
            padding: '16px 24px'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            background: COLORS.white,
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        },
        th: {
            padding: '12px 16px',
            textAlign: 'left',
            background: COLORS.charcoal,
            color: COLORS.white,
            fontSize: '13px',
            fontWeight: '600',
            whiteSpace: 'nowrap'
        },
        td: {
            padding: '12px 16px',
            borderBottom: `1px solid ${COLORS.mediumGray}`,
            fontSize: '14px'
        },
        badge: {
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600'
        },
        actionButton: {
            padding: '6px 12px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
            marginRight: '4px'
        }
    };

    // ============================================================================
    // RENDER HELPERS
    // ============================================================================

    const getStatusBadge = (status) => {
        const statusObj = STATUSES.find(s => s.id === status) || STATUSES[0];
        return (
            <span style={{
                ...styles.badge,
                background: `${statusObj.color}20`,
                color: statusObj.color
            }}>
                {statusObj.label}
            </span>
        );
    };

    const getPriorityBadge = (priority) => {
        const priorityObj = PRIORITIES.find(p => p.id === priority) || PRIORITIES[1];
        return (
            <span style={{
                ...styles.badge,
                background: `${priorityObj.color}20`,
                color: priorityObj.color
            }}>
                {priorityObj.label}
            </span>
        );
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getProjectNames = (projectIds) => {
        if (!projectIds || projectIds.length === 0) return '-';
        return projectIds.map(id => {
            const project = projects.find(p => p.id === id);
            return project?.abbreviation || project?.name || id;
        }).join(', ');
    };

    const getStationNames = (stationIds) => {
        if (!stationIds || stationIds.length === 0) return '-';
        return stationIds.map(id => {
            const station = STATIONS.find(s => s.id === id);
            return station?.name || id;
        }).join(', ');
    };

    // ============================================================================
    // RENDER HELPERS FOR ISSUES
    // ============================================================================

    const getIssueStatusBadge = (status) => {
        const statusObj = ISSUE_STATUSES.find(s => s.id === status) || ISSUE_STATUSES[0];
        return (
            <span style={{
                ...styles.badge,
                background: `${statusObj.color}20`,
                color: statusObj.color
            }}>
                {statusObj.label}
            </span>
        );
    };

    const getIssueTypeBadge = (issueType) => {
        const typeColors = {
            'material-supply': '#EA580C',
            'quality': '#DC2626',
            'shop-drawing': '#0057B8',
            'design-conflict': '#7C3AED',
            'engineering-question': '#0891B2',
            'rfi': '#4F46E5',
            'other': '#6B7280'
        };
        const typeLabels = {
            'material-supply': 'Material/Supply',
            'quality': 'Quality Issue',
            'shop-drawing': 'Shop Drawing',
            'design-conflict': 'Design Conflict',
            'engineering-question': 'Engineering Question',
            'rfi': 'RFI Required',
            'other': 'Other'
        };
        const color = typeColors[issueType] || '#6B7280';
        const label = typeLabels[issueType] || issueType;
        return (
            <span style={{
                ...styles.badge,
                background: `${color}20`,
                color: color
            }}>
                {label}
            </span>
        );
    };

    // ============================================================================
    // RENDER
    // ============================================================================

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.headerTitle}>Supply Chain Board</h1>
            </div>

            {/* Section Toggle Tabs */}
            <div style={{
                display: 'flex',
                background: COLORS.white,
                borderBottom: `1px solid ${COLORS.mediumGray}`
            }}>
                <button
                    onClick={() => setActiveSection('shortages')}
                    style={{
                        padding: '14px 24px',
                        border: 'none',
                        background: activeSection === 'shortages' ? COLORS.white : '#f5f5f5',
                        borderBottom: activeSection === 'shortages' ? `3px solid ${COLORS.blue}` : '3px solid transparent',
                        fontSize: '14px',
                        fontWeight: activeSection === 'shortages' ? '600' : '400',
                        color: activeSection === 'shortages' ? COLORS.blue : COLORS.darkGray,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    Shortages
                    {stats.active > 0 && (
                        <span style={{
                            background: '#DC2626',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}>
                            {stats.active}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveSection('issues')}
                    style={{
                        padding: '14px 24px',
                        border: 'none',
                        background: activeSection === 'issues' ? COLORS.white : '#f5f5f5',
                        borderBottom: activeSection === 'issues' ? `3px solid ${COLORS.blue}` : '3px solid transparent',
                        fontSize: '14px',
                        fontWeight: activeSection === 'issues' ? '600' : '400',
                        color: activeSection === 'issues' ? COLORS.blue : COLORS.darkGray,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    Issues
                    {issueStats.open > 0 && (
                        <span style={{
                            background: '#EA580C',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}>
                            {issueStats.open}
                        </span>
                    )}
                </button>
            </div>

            {/* Stats Bar - Shortages */}
            {activeSection === 'shortages' && (
                <div style={styles.statsBar}>
                    <div style={{ ...styles.statCard, background: '#f0f9ff' }}>
                        <p style={{ ...styles.statValue, color: COLORS.blue }}>{stats.active}</p>
                        <p style={styles.statLabel}>Active Shortages</p>
                    </div>
                    <div style={{ ...styles.statCard, background: '#fef2f2' }}>
                        <p style={{ ...styles.statValue, color: '#DC2626' }}>{stats.critical}</p>
                        <p style={styles.statLabel}>Critical</p>
                    </div>
                    <div style={{ ...styles.statCard, background: '#fff7ed' }}>
                        <p style={{ ...styles.statValue, color: '#EA580C' }}>{stats.high}</p>
                        <p style={styles.statLabel}>High Priority</p>
                    </div>
                    <div style={{ ...styles.statCard, background: '#fefce8' }}>
                        <p style={{ ...styles.statValue, color: '#CA8A04' }}>{stats.overdue}</p>
                        <p style={styles.statLabel}>Overdue</p>
                    </div>
                </div>
            )}

            {/* Stats Bar - Issues */}
            {activeSection === 'issues' && (
                <div style={styles.statsBar}>
                    <div style={{ ...styles.statCard, background: '#fef2f2' }}>
                        <p style={{ ...styles.statValue, color: '#DC2626' }}>{issueStats.open}</p>
                        <p style={styles.statLabel}>Open Issues</p>
                    </div>
                    <div style={{ ...styles.statCard, background: '#f0f9ff' }}>
                        <p style={{ ...styles.statValue, color: COLORS.blue }}>{issueStats.inProgress}</p>
                        <p style={styles.statLabel}>In Progress</p>
                    </div>
                    <div style={{ ...styles.statCard, background: '#f0fdf4' }}>
                        <p style={{ ...styles.statValue, color: '#10B981' }}>{issueStats.resolved}</p>
                        <p style={styles.statLabel}>Resolved</p>
                    </div>
                    <div style={{ ...styles.statCard, background: '#fff7ed' }}>
                        <p style={{ ...styles.statValue, color: '#EA580C' }}>{issueStats.critical + issueStats.high}</p>
                        <p style={styles.statLabel}>High/Critical</p>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div style={styles.toolbar}>
                <input
                    type="text"
                    placeholder={activeSection === 'shortages' ? "Search items, suppliers..." : "Search issues..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={styles.select}
                >
                    <option value="active">Active Only</option>
                    <option value="all">All Statuses</option>
                    {activeSection === 'shortages' 
                        ? STATUSES.map(s => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                        ))
                        : ISSUE_STATUSES.map(s => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                        ))
                    }
                </select>
                <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    style={styles.select}
                >
                    <option value="all">All Priorities</option>
                    {PRIORITIES.map(p => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                </select>
                {activeSection === 'shortages' && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        style={styles.addButton}
                    >
                        + Add Shortage
                    </button>
                )}
            </div>

            {/* Shortages Table */}
            {activeSection === 'shortages' && (
                <div style={styles.tableContainer}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.darkGray }}>
                            Loading shortages...
                        </div>
                    ) : filteredShortages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.darkGray }}>
                            No shortages found. Click "Add Shortage" to report one.
                        </div>
                    ) : (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>ID</th>
                                    <th style={styles.th}>Item</th>
                                    <th style={styles.th}>Qty</th>
                                    <th style={styles.th}>Supplier</th>
                                    <th style={styles.th}>ETA</th>
                                    <th style={styles.th}>Projects</th>
                                    <th style={styles.th}>Stations</th>
                                    <th style={styles.th}>Priority</th>
                                    <th style={styles.th}>Status</th>
                                    <th style={styles.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredShortages.map(shortage => (
                                    <tr key={shortage.id} style={{ 
                                        background: shortage.priority === 'critical' ? '#fef2f2' : 'transparent'
                                    }}>
                                        <td style={styles.td}>
                                            <strong>{shortage.shortage_display_id}</strong>
                                        </td>
                                        <td style={styles.td}>{shortage.item}</td>
                                        <td style={styles.td}>{shortage.qty} {shortage.uom}</td>
                                        <td style={styles.td}>{shortage.supplier || '-'}</td>
                                        <td style={{ 
                                            ...styles.td,
                                            color: shortage.delivery_eta && new Date(shortage.delivery_eta) < new Date() 
                                                ? '#DC2626' : 'inherit'
                                        }}>
                                            {formatDate(shortage.delivery_eta)}
                                        </td>
                                        <td style={styles.td}>{getProjectNames(shortage.projects_impacted)}</td>
                                        <td style={styles.td}>{getStationNames(shortage.stations_impacted)}</td>
                                        <td style={styles.td}>{getPriorityBadge(shortage.priority)}</td>
                                        <td style={styles.td}>{getStatusBadge(shortage.status)}</td>
                                        <td style={styles.td}>
                                            <button
                                                onClick={() => setShowDetailModal(shortage)}
                                                style={{ ...styles.actionButton, background: COLORS.blue, color: COLORS.white }}
                                            >
                                                View
                                            </button>
                                            {shortage.status === 'open' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(shortage.id, 'ordered')}
                                                    style={{ ...styles.actionButton, background: '#F59E0B', color: COLORS.white }}
                                                >
                                                    Mark Ordered
                                                </button>
                                            )}
                                            {shortage.status !== 'resolved' && shortage.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(shortage.id, 'resolved')}
                                                    style={{ ...styles.actionButton, background: '#10B981', color: COLORS.white }}
                                                >
                                                    Resolve
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Issues Table */}
            {activeSection === 'issues' && (
                <div style={styles.tableContainer}>
                    {filteredIssues.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: COLORS.darkGray }}>
                            No issues found. Material/Supply issues logged from production will appear here.
                        </div>
                    ) : (
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>ID</th>
                                    <th style={styles.th}>Type</th>
                                    <th style={styles.th}>Title</th>
                                    <th style={styles.th}>Project</th>
                                    <th style={styles.th}>BLM ID</th>
                                    <th style={styles.th}>Priority</th>
                                    <th style={styles.th}>Status</th>
                                    <th style={styles.th}>Submitted</th>
                                    <th style={styles.th}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredIssues.map(issue => (
                                    <tr key={issue.id} style={{ 
                                        background: issue.priority === 'critical' ? '#fef2f2' : 'transparent'
                                    }}>
                                        <td style={styles.td}>
                                            <strong>{issue.issue_display_id}</strong>
                                        </td>
                                        <td style={styles.td}>{getIssueTypeBadge(issue.issue_type)}</td>
                                        <td style={styles.td}>
                                            {issue.title || issue.description?.substring(0, 50) || '-'}
                                            {issue.description?.length > 50 && '...'}
                                        </td>
                                        <td style={styles.td}>{issue.project_name || '-'}</td>
                                        <td style={styles.td}>{issue.blm_id || '-'}</td>
                                        <td style={styles.td}>{getPriorityBadge(issue.priority)}</td>
                                        <td style={styles.td}>{getIssueStatusBadge(issue.status)}</td>
                                        <td style={styles.td}>{formatDate(issue.created_at)}</td>
                                        <td style={styles.td}>
                                            <button
                                                onClick={() => setShowIssueDetailModal(issue)}
                                                style={{ ...styles.actionButton, background: COLORS.blue, color: COLORS.white }}
                                            >
                                                View
                                            </button>
                                            {issue.status === 'open' && (
                                                <button
                                                    onClick={() => handleUpdateIssueStatus(issue.id, 'in-progress')}
                                                    style={{ ...styles.actionButton, background: '#F59E0B', color: COLORS.white }}
                                                >
                                                    Start
                                                </button>
                                            )}
                                            {issue.status !== 'resolved' && issue.status !== 'closed' && (
                                                <button
                                                    onClick={() => handleUpdateIssueStatus(issue.id, 'resolved')}
                                                    style={{ ...styles.actionButton, background: '#10B981', color: COLORS.white }}
                                                >
                                                    Resolve
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Add Shortage Modal */}
            {showAddModal && (
                <AddShortageModal
                    onClose={() => setShowAddModal(false)}
                    onSubmit={handleCreateShortage}
                    projects={projects}
                    stations={STATIONS}
                    units={UNITS}
                    priorities={PRIORITIES}
                />
            )}

            {/* Shortage Detail Modal */}
            {showDetailModal && (
                <ShortageDetailModal
                    shortage={showDetailModal}
                    onClose={() => setShowDetailModal(null)}
                    onUpdateStatus={handleUpdateStatus}
                    projects={projects}
                    stations={STATIONS}
                    statuses={STATUSES}
                    priorities={PRIORITIES}
                />
            )}

            {/* Issue Detail Modal */}
            {showIssueDetailModal && (
                <IssueDetailModal
                    issue={showIssueDetailModal}
                    onClose={() => setShowIssueDetailModal(null)}
                    onUpdateStatus={handleUpdateIssueStatus}
                    priorities={PRIORITIES}
                    statuses={ISSUE_STATUSES}
                />
            )}
        </div>
    );
};

// ============================================================================
// ADD SHORTAGE MODAL
// ============================================================================

const AddShortageModal = ({ onClose, onSubmit, projects, stations, units, priorities }) => {
    const { useState, useMemo } = React;

    const [formData, setFormData] = useState({
        item: '',
        uom: 'ea',
        qty: '',
        supplier: '',
        delivery_eta: '',
        priority: 'medium',
        notes: '',
        stations_impacted: [],
        modules_impacted: [],
        projects_impacted: []
    });

    const [showStationDropdown, setShowStationDropdown] = useState(false);
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [showModuleDropdown, setShowModuleDropdown] = useState(false);

    // Get all modules from selected projects
    const availableModules = useMemo(() => {
        if (formData.projects_impacted.length === 0) {
            return projects.flatMap(p => (p.modules || []).map(m => ({
                ...m,
                projectName: p.abbreviation || p.name,
                projectId: p.id
            })));
        }
        return projects
            .filter(p => formData.projects_impacted.includes(p.id))
            .flatMap(p => (p.modules || []).map(m => ({
                ...m,
                projectName: p.abbreviation || p.name,
                projectId: p.id
            })));
    }, [projects, formData.projects_impacted]);

    const COLORS = {
        charcoal: '#1a1a1a',
        blue: '#0057B8',
        white: '#ffffff',
        lightGray: '#f5f5f5',
        mediumGray: '#e0e0e0',
        darkGray: '#666666'
    };

    const styles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        },
        modal: {
            background: COLORS.white,
            borderRadius: '12px',
            width: '600px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        },
        header: {
            padding: '20px 24px',
            borderBottom: `1px solid ${COLORS.mediumGray}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        title: {
            margin: 0,
            fontSize: '18px',
            fontWeight: '600'
        },
        closeButton: {
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: COLORS.darkGray
        },
        body: {
            padding: '24px'
        },
        row: {
            display: 'flex',
            gap: '16px',
            marginBottom: '16px'
        },
        field: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
        },
        label: {
            fontSize: '13px',
            fontWeight: '600',
            color: COLORS.charcoal
        },
        input: {
            padding: '10px 12px',
            border: `1px solid ${COLORS.mediumGray}`,
            borderRadius: '6px',
            fontSize: '14px'
        },
        select: {
            padding: '10px 12px',
            border: `1px solid ${COLORS.mediumGray}`,
            borderRadius: '6px',
            fontSize: '14px',
            background: COLORS.white
        },
        textarea: {
            padding: '10px 12px',
            border: `1px solid ${COLORS.mediumGray}`,
            borderRadius: '6px',
            fontSize: '14px',
            minHeight: '80px',
            resize: 'vertical'
        },
        multiSelectContainer: {
            position: 'relative'
        },
        multiSelectButton: {
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${COLORS.mediumGray}`,
            borderRadius: '6px',
            fontSize: '14px',
            background: COLORS.white,
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        dropdown: {
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: COLORS.white,
            border: `1px solid ${COLORS.mediumGray}`,
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            maxHeight: '200px',
            overflow: 'auto',
            zIndex: 10
        },
        dropdownItem: {
            padding: '10px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: `1px solid ${COLORS.lightGray}`
        },
        checkbox: {
            width: '16px',
            height: '16px'
        },
        selectedTags: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            marginTop: '8px'
        },
        tag: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            background: COLORS.lightGray,
            borderRadius: '4px',
            fontSize: '12px'
        },
        tagRemove: {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: COLORS.darkGray
        },
        footer: {
            padding: '16px 24px',
            borderTop: `1px solid ${COLORS.mediumGray}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
        },
        cancelButton: {
            padding: '10px 20px',
            border: `1px solid ${COLORS.mediumGray}`,
            borderRadius: '6px',
            background: COLORS.white,
            fontSize: '14px',
            cursor: 'pointer'
        },
        submitButton: {
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            background: COLORS.blue,
            color: COLORS.white,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
        }
    };

    const toggleStation = (stationId) => {
        setFormData(prev => ({
            ...prev,
            stations_impacted: prev.stations_impacted.includes(stationId)
                ? prev.stations_impacted.filter(id => id !== stationId)
                : [...prev.stations_impacted, stationId]
        }));
    };

    const toggleProject = (projectId) => {
        setFormData(prev => ({
            ...prev,
            projects_impacted: prev.projects_impacted.includes(projectId)
                ? prev.projects_impacted.filter(id => id !== projectId)
                : [...prev.projects_impacted, projectId]
        }));
    };

    const toggleModule = (moduleId) => {
        setFormData(prev => ({
            ...prev,
            modules_impacted: prev.modules_impacted.includes(moduleId)
                ? prev.modules_impacted.filter(id => id !== moduleId)
                : [...prev.modules_impacted, moduleId]
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.item || !formData.qty) {
            alert('Please fill in Item and Quantity');
            return;
        }
        onSubmit(formData);
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.header}>
                    <h2 style={styles.title}>Add Shortage</h2>
                    <button style={styles.closeButton} onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={styles.body}>
                        {/* Item */}
                        <div style={styles.row}>
                            <div style={styles.field}>
                                <label style={styles.label}>Item *</label>
                                <input
                                    type="text"
                                    value={formData.item}
                                    onChange={(e) => setFormData(prev => ({ ...prev, item: e.target.value }))}
                                    placeholder="e.g., 2x4 Studs, Drywall Screws..."
                                    style={styles.input}
                                    required
                                />
                            </div>
                        </div>

                        {/* Qty, UOM, Priority */}
                        <div style={styles.row}>
                            <div style={{ ...styles.field, flex: 1 }}>
                                <label style={styles.label}>Quantity *</label>
                                <input
                                    type="number"
                                    value={formData.qty}
                                    onChange={(e) => setFormData(prev => ({ ...prev, qty: e.target.value }))}
                                    placeholder="0"
                                    style={styles.input}
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div style={{ ...styles.field, flex: 1 }}>
                                <label style={styles.label}>Unit of Measure</label>
                                <select
                                    value={formData.uom}
                                    onChange={(e) => setFormData(prev => ({ ...prev, uom: e.target.value }))}
                                    style={styles.select}
                                >
                                    {units.map(u => (
                                        <option key={u.id} value={u.id}>{u.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ ...styles.field, flex: 1 }}>
                                <label style={styles.label}>Priority</label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                                    style={styles.select}
                                >
                                    {priorities.map(p => (
                                        <option key={p.id} value={p.id}>{p.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Supplier & ETA */}
                        <div style={styles.row}>
                            <div style={styles.field}>
                                <label style={styles.label}>Supplier</label>
                                <input
                                    type="text"
                                    value={formData.supplier}
                                    onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                                    placeholder="Supplier name"
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Delivery ETA</label>
                                <input
                                    type="date"
                                    value={formData.delivery_eta}
                                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_eta: e.target.value }))}
                                    style={styles.input}
                                />
                            </div>
                        </div>

                        {/* Projects Multi-Select */}
                        <div style={styles.row}>
                            <div style={styles.field}>
                                <label style={styles.label}>Projects Impacted</label>
                                <div style={styles.multiSelectContainer}>
                                    <button
                                        type="button"
                                        style={styles.multiSelectButton}
                                        onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                                    >
                                        <span>
                                            {formData.projects_impacted.length === 0 
                                                ? 'Select projects...' 
                                                : `${formData.projects_impacted.length} selected`}
                                        </span>
                                        <span>{showProjectDropdown ? '▲' : '▼'}</span>
                                    </button>
                                    {showProjectDropdown && (
                                        <div style={styles.dropdown}>
                                            {projects.map(project => (
                                                <div
                                                    key={project.id}
                                                    style={styles.dropdownItem}
                                                    onClick={() => toggleProject(project.id)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.projects_impacted.includes(project.id)}
                                                        onChange={() => {}}
                                                        style={styles.checkbox}
                                                    />
                                                    <span>{project.abbreviation || project.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {formData.projects_impacted.length > 0 && (
                                    <div style={styles.selectedTags}>
                                        {formData.projects_impacted.map(id => {
                                            const project = projects.find(p => p.id === id);
                                            return (
                                                <span key={id} style={styles.tag}>
                                                    {project?.abbreviation || project?.name || id}
                                                    <button
                                                        type="button"
                                                        style={styles.tagRemove}
                                                        onClick={() => toggleProject(id)}
                                                    >
                                                        &times;
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stations Multi-Select */}
                        <div style={styles.row}>
                            <div style={styles.field}>
                                <label style={styles.label}>Stations Impacted</label>
                                <div style={styles.multiSelectContainer}>
                                    <button
                                        type="button"
                                        style={styles.multiSelectButton}
                                        onClick={() => setShowStationDropdown(!showStationDropdown)}
                                    >
                                        <span>
                                            {formData.stations_impacted.length === 0 
                                                ? 'Select stations...' 
                                                : `${formData.stations_impacted.length} selected`}
                                        </span>
                                        <span>{showStationDropdown ? '▲' : '▼'}</span>
                                    </button>
                                    {showStationDropdown && (
                                        <div style={styles.dropdown}>
                                            {stations.map(station => (
                                                <div
                                                    key={station.id}
                                                    style={styles.dropdownItem}
                                                    onClick={() => toggleStation(station.id)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.stations_impacted.includes(station.id)}
                                                        onChange={() => {}}
                                                        style={styles.checkbox}
                                                    />
                                                    <span>{station.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {formData.stations_impacted.length > 0 && (
                                    <div style={styles.selectedTags}>
                                        {formData.stations_impacted.map(id => {
                                            const station = stations.find(s => s.id === id);
                                            return (
                                                <span key={id} style={styles.tag}>
                                                    {station?.name || id}
                                                    <button
                                                        type="button"
                                                        style={styles.tagRemove}
                                                        onClick={() => toggleStation(id)}
                                                    >
                                                        &times;
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modules Multi-Select */}
                        <div style={styles.row}>
                            <div style={styles.field}>
                                <label style={styles.label}>Modules Impacted</label>
                                <div style={styles.multiSelectContainer}>
                                    <button
                                        type="button"
                                        style={styles.multiSelectButton}
                                        onClick={() => setShowModuleDropdown(!showModuleDropdown)}
                                    >
                                        <span>
                                            {formData.modules_impacted.length === 0 
                                                ? 'Select modules...' 
                                                : `${formData.modules_impacted.length} selected`}
                                        </span>
                                        <span>{showModuleDropdown ? '▲' : '▼'}</span>
                                    </button>
                                    {showModuleDropdown && (
                                        <div style={styles.dropdown}>
                                            {availableModules.length === 0 ? (
                                                <div style={{ ...styles.dropdownItem, color: '#999' }}>
                                                    No modules available
                                                </div>
                                            ) : (
                                                availableModules.map(module => {
                                                    const moduleId = module.id || module.serialNumber || module.serial_number;
                                                    const displayName = module.serialNumber || module.serial_number || module.blm_id || moduleId;
                                                    return (
                                                        <div
                                                            key={moduleId}
                                                            style={styles.dropdownItem}
                                                            onClick={() => toggleModule(moduleId)}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.modules_impacted.includes(moduleId)}
                                                                onChange={() => {}}
                                                                style={styles.checkbox}
                                                            />
                                                            <span>{module.projectName}: {displayName}</span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                                {formData.modules_impacted.length > 0 && (
                                    <div style={styles.selectedTags}>
                                        {formData.modules_impacted.map(id => (
                                            <span key={id} style={styles.tag}>
                                                {id}
                                                <button
                                                    type="button"
                                                    style={styles.tagRemove}
                                                    onClick={() => toggleModule(id)}
                                                >
                                                    &times;
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notes */}
                        <div style={styles.row}>
                            <div style={styles.field}>
                                <label style={styles.label}>Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Additional details about the shortage..."
                                    style={styles.textarea}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={styles.footer}>
                        <button type="button" style={styles.cancelButton} onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" style={styles.submitButton}>
                            Add Shortage
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ============================================================================
// SHORTAGE DETAIL MODAL
// ============================================================================

const ShortageDetailModal = ({ shortage, onClose, onUpdateStatus, projects, stations, statuses, priorities }) => {
    const COLORS = {
        charcoal: '#1a1a1a',
        blue: '#0057B8',
        white: '#ffffff',
        lightGray: '#f5f5f5',
        mediumGray: '#e0e0e0',
        darkGray: '#666666'
    };

    const styles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        },
        modal: {
            background: COLORS.white,
            borderRadius: '12px',
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        },
        header: {
            padding: '20px 24px',
            borderBottom: `1px solid ${COLORS.mediumGray}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        title: {
            margin: 0,
            fontSize: '18px',
            fontWeight: '600'
        },
        closeButton: {
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: COLORS.darkGray
        },
        body: {
            padding: '24px'
        },
        row: {
            display: 'flex',
            marginBottom: '12px'
        },
        label: {
            width: '120px',
            fontWeight: '600',
            color: COLORS.darkGray,
            fontSize: '13px'
        },
        value: {
            flex: 1,
            fontSize: '14px'
        },
        badge: {
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600'
        },
        footer: {
            padding: '16px 24px',
            borderTop: `1px solid ${COLORS.mediumGray}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
        },
        button: {
            padding: '10px 20px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer'
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric' 
        });
    };

    const getProjectNames = (projectIds) => {
        if (!projectIds || projectIds.length === 0) return '-';
        return projectIds.map(id => {
            const project = projects.find(p => p.id === id);
            return project?.abbreviation || project?.name || id;
        }).join(', ');
    };

    const getStationNames = (stationIds) => {
        if (!stationIds || stationIds.length === 0) return '-';
        return stationIds.map(id => {
            const station = stations.find(s => s.id === id);
            return station?.name || id;
        }).join(', ');
    };

    const statusObj = statuses.find(s => s.id === shortage.status) || statuses[0];
    const priorityObj = priorities.find(p => p.id === shortage.priority) || priorities[1];

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.header}>
                    <h2 style={styles.title}>{shortage.shortage_display_id}</h2>
                    <button style={styles.closeButton} onClick={onClose}>&times;</button>
                </div>

                <div style={styles.body}>
                    <div style={styles.row}>
                        <span style={styles.label}>Item:</span>
                        <span style={styles.value}><strong>{shortage.item}</strong></span>
                    </div>
                    <div style={styles.row}>
                        <span style={styles.label}>Quantity:</span>
                        <span style={styles.value}>{shortage.qty} {shortage.uom}</span>
                    </div>
                    <div style={styles.row}>
                        <span style={styles.label}>Supplier:</span>
                        <span style={styles.value}>{shortage.supplier || '-'}</span>
                    </div>
                    <div style={styles.row}>
                        <span style={styles.label}>Delivery ETA:</span>
                        <span style={styles.value}>{formatDate(shortage.delivery_eta)}</span>
                    </div>
                    <div style={styles.row}>
                        <span style={styles.label}>Priority:</span>
                        <span style={{
                            ...styles.badge,
                            background: `${priorityObj.color}20`,
                            color: priorityObj.color
                        }}>
                            {priorityObj.label}
                        </span>
                    </div>
                    <div style={styles.row}>
                        <span style={styles.label}>Status:</span>
                        <span style={{
                            ...styles.badge,
                            background: `${statusObj.color}20`,
                            color: statusObj.color
                        }}>
                            {statusObj.label}
                        </span>
                    </div>
                    <div style={styles.row}>
                        <span style={styles.label}>Projects:</span>
                        <span style={styles.value}>{getProjectNames(shortage.projects_impacted)}</span>
                    </div>
                    <div style={styles.row}>
                        <span style={styles.label}>Stations:</span>
                        <span style={styles.value}>{getStationNames(shortage.stations_impacted)}</span>
                    </div>
                    <div style={styles.row}>
                        <span style={styles.label}>Modules:</span>
                        <span style={styles.value}>
                            {shortage.modules_impacted?.length > 0 
                                ? shortage.modules_impacted.join(', ') 
                                : '-'}
                        </span>
                    </div>
                    <div style={styles.row}>
                        <span style={styles.label}>Reported By:</span>
                        <span style={styles.value}>{shortage.reported_by || '-'}</span>
                    </div>
                    <div style={styles.row}>
                        <span style={styles.label}>Created:</span>
                        <span style={styles.value}>{formatDate(shortage.created_at)}</span>
                    </div>
                    {shortage.notes && (
                        <div style={styles.row}>
                            <span style={styles.label}>Notes:</span>
                            <span style={styles.value}>{shortage.notes}</span>
                        </div>
                    )}
                    {shortage.resolved_at && (
                        <>
                            <div style={styles.row}>
                                <span style={styles.label}>Resolved:</span>
                                <span style={styles.value}>{formatDate(shortage.resolved_at)}</span>
                            </div>
                            <div style={styles.row}>
                                <span style={styles.label}>Resolved By:</span>
                                <span style={styles.value}>{shortage.resolved_by || '-'}</span>
                            </div>
                        </>
                    )}
                </div>

                <div style={styles.footer}>
                    {shortage.status === 'open' && (
                        <button
                            style={{ ...styles.button, background: '#F59E0B', color: COLORS.white }}
                            onClick={() => { onUpdateStatus(shortage.id, 'ordered'); onClose(); }}
                        >
                            Mark Ordered
                        </button>
                    )}
                    {shortage.status === 'ordered' && (
                        <button
                            style={{ ...styles.button, background: '#0891B2', color: COLORS.white }}
                            onClick={() => { onUpdateStatus(shortage.id, 'partial'); onClose(); }}
                        >
                            Partial Delivery
                        </button>
                    )}
                    {!['resolved', 'cancelled'].includes(shortage.status) && (
                        <button
                            style={{ ...styles.button, background: '#10B981', color: COLORS.white }}
                            onClick={() => { onUpdateStatus(shortage.id, 'resolved'); onClose(); }}
                        >
                            Resolve
                        </button>
                    )}
                    <button
                        style={{ ...styles.button, background: COLORS.mediumGray }}
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// Export for use in App.jsx
window.ProcurementBoard = ProcurementBoard;
