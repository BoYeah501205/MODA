/**
 * NavigationGroups.jsx - Collapsible Navigation System
 * 
 * Phase 3 of MODA Dashboard Migration
 * Groups related tabs into collapsible sections for cleaner navigation
 * 
 * Groups:
 * - Operations: Production, Projects, Tracker, People, Automation, Equipment
 * - Projects: Precon, Engineering
 * - Quality & Site: QA, On-Site
 * - Supply & Logistics: Transport, Supply Chain
 * - Executive: Standalone
 * 
 * Easy to modify: Just update NAV_GROUPS array or STANDALONE_TABS array
 * Single-tab groups auto-render as standalone buttons (no dropdown)
 */

// Navigation group definitions
const NAV_GROUPS = [
    {
        id: 'operations',
        label: 'Operations',
        iconClass: 'icon-production',
        tabs: [
            { id: 'production', label: 'Production Board', iconClass: 'icon-production' },
            { id: 'projects', label: 'Projects', iconClass: 'icon-projects' },
            { id: 'tracker', label: 'Tracker', iconClass: 'icon-tracker' },
            { id: 'people', label: 'People', iconClass: 'icon-people' },
            { id: 'automation', label: 'Automation', iconClass: 'icon-automation' },
            { id: 'equipment', label: 'Tools & Equipment', iconClass: 'icon-equipment' }
        ]
    },
    {
        id: 'design',
        label: 'Projects',
        iconClass: 'icon-precon',
        tabs: [
            { id: 'precon', label: 'Precon', iconClass: 'icon-precon' },
            { id: 'engineering', label: 'Engineering', iconClass: 'icon-engineering' }
        ]
    },
    {
        id: 'quality-site',
        label: 'Quality & Site',
        iconClass: 'icon-qa',
        tabs: [
            { id: 'qa', label: 'QA', iconClass: 'icon-qa' },
            { id: 'onsite', label: 'On-Site', iconClass: 'icon-onsite' }
        ]
    },
    {
        id: 'supply-logistics',
        label: 'Supply & Logistics',
        iconClass: 'icon-transport',
        tabs: [
            { id: 'transport', label: 'Transport', iconClass: 'icon-transport' },
            { id: 'supply-chain', label: 'Supply Chain', iconClass: 'icon-supply' }
        ]
    }
];

// Standalone tabs (not in groups)
const STANDALONE_TABS = [
    { id: 'executive', label: 'Executive', iconClass: 'icon-executive' }
];

// Navigation Group Component
function NavigationGroups({ 
    activeTab, 
    setActiveTab, 
    visibleTabs = [],
    canAccessAdmin = false,
    setSelectedProject
}) {
    const { useState, useMemo, useEffect, useRef } = React;
    
    // Track which groups are expanded
    const [expandedGroups, setExpandedGroups] = useState({});
    
    // Ref for the nav container to detect outside clicks
    const navRef = useRef(null);
    
    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (navRef.current && !navRef.current.contains(event.target)) {
                setExpandedGroups({});
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    // Filter groups to only show those with visible tabs
    const visibleGroups = useMemo(() => {
        return NAV_GROUPS.map(group => ({
            ...group,
            tabs: group.tabs.filter(tab => visibleTabs.includes(tab.id))
        })).filter(group => group.tabs.length > 0);
    }, [visibleTabs]);
    
    // Filter standalone tabs
    const visibleStandalone = useMemo(() => {
        return STANDALONE_TABS.filter(tab => visibleTabs.includes(tab.id));
    }, [visibleTabs]);
    
    // Check if active tab is in a group
    const activeGroupId = useMemo(() => {
        for (const group of visibleGroups) {
            if (group.tabs.some(tab => tab.id === activeTab)) {
                return group.id;
            }
        }
        return null;
    }, [activeTab, visibleGroups]);
    
    // Toggle group expansion - only one dropdown at a time
    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => {
            // If this group is already open, close it
            if (prev[groupId]) {
                return {};
            }
            // Otherwise, close all others and open this one
            return { [groupId]: true };
        });
    };
    
    // Handle tab click
    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
        setExpandedGroups({}); // Close all dropdowns
        if (setSelectedProject) setSelectedProject(null);
    };
    
    // Check if group should show as expanded (dropdown visible)
    const isGroupExpanded = (groupId) => {
        // Only use manual expansion state - user controls dropdown visibility
        return expandedGroups[groupId] || false;
    };
    
    // Check if group contains the active tab (for styling)
    const isGroupActive = (groupId) => {
        return activeGroupId === groupId;
    };

    return (
        <nav ref={navRef} className="nav-groups bg-white border-b nav-groups-container">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center gap-1 overflow-x-auto nav-groups-wrapper">
                    {/* Home Tab (if feature enabled) */}
                    {window.MODA_FEATURE_FLAGS?.isEnabled('enableDashboardHome') && (
                        <button
                            onClick={() => handleTabClick('home')}
                            className={`nav-tab px-4 py-3 text-sm font-medium transition rounded-t-lg whitespace-nowrap ${activeTab === 'home' ? 'active' : ''}`}
                            style={activeTab === 'home' 
                                ? { backgroundColor: 'var(--autovol-teal)', color: 'white' } 
                                : { color: 'var(--autovol-navy)' }}
                        >
                            <span className="tab-icon icon-home"></span>
                            Home
                        </button>
                    )}
                    
                    {/* Standalone Tabs (Executive) */}
                    {visibleStandalone.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={`nav-tab px-4 py-3 text-sm font-medium transition rounded-t-lg whitespace-nowrap ${activeTab === tab.id ? 'active' : ''}`}
                            style={activeTab === tab.id 
                                ? { backgroundColor: 'var(--autovol-red)', color: 'white' } 
                                : { color: 'var(--autovol-navy)' }}
                        >
                            <span className={`tab-icon ${tab.iconClass}`}></span>
                            {tab.label}
                        </button>
                    ))}
                    
                    {/* Grouped Navigation */}
                    {visibleGroups.map(group => (
                        <div key={group.id} className="nav-group relative">
                            {/* Group has single tab - render as regular tab */}
                            {group.tabs.length === 1 ? (
                                <button
                                    onClick={() => handleTabClick(group.tabs[0].id)}
                                    className={`nav-tab px-4 py-3 text-sm font-medium transition rounded-t-lg whitespace-nowrap ${activeTab === group.tabs[0].id ? 'active' : ''}`}
                                    style={activeTab === group.tabs[0].id 
                                        ? { backgroundColor: 'var(--autovol-red)', color: 'white' } 
                                        : { color: 'var(--autovol-navy)' }}
                                >
                                    <span className={`tab-icon ${group.tabs[0].iconClass}`}></span>
                                    {group.tabs[0].label}
                                </button>
                            ) : (
                                /* Group has multiple tabs - render as dropdown */
                                <>
                                    <button
                                        onClick={() => toggleGroup(group.id)}
                                        className={`nav-group-header nav-group-button px-4 py-3 text-sm font-medium transition rounded-t-lg whitespace-nowrap flex items-center gap-1 ${activeGroupId === group.id ? 'active' : ''}`}
                                        style={activeGroupId === group.id 
                                            ? { backgroundColor: 'var(--autovol-red)', color: 'white' } 
                                            : { color: 'var(--autovol-navy)' }}
                                    >
                                        <span className={`tab-icon ${group.iconClass}`}></span>
                                        {group.label}
                                        <span className={`dropdown-arrow ${isGroupExpanded(group.id) ? 'expanded' : ''}`} 
                                              style={{ fontSize: '10px', marginLeft: '4px', transition: 'transform 0.2s' }}>
                                            {isGroupExpanded(group.id) ? '▲' : '▼'}
                                        </span>
                                    </button>
                                    
                                    {/* Dropdown Menu */}
                                    {isGroupExpanded(group.id) && (
                                        <div className="nav-dropdown absolute top-full left-0 bg-white shadow-lg rounded-b-lg border border-gray-200 min-w-48 z-50">
                                            {group.tabs.map(tab => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => handleTabClick(tab.id)}
                                                    className={`nav-dropdown-item w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 ${activeTab === tab.id ? 'bg-gray-100 font-medium' : ''}`}
                                                    style={{ color: 'var(--autovol-navy)' }}
                                                >
                                                    <span className={`tab-icon ${tab.iconClass}`} style={{ width: '16px', height: '16px' }}></span>
                                                    {tab.label}
                                                    {activeTab === tab.id && (
                                                        <span className="ml-auto" style={{ color: 'var(--autovol-teal)' }}>●</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))}
                    
                    {/* Admin Tab - Always at end */}
                    {canAccessAdmin && (
                        <button
                            onClick={() => handleTabClick('admin')}
                            className={`nav-tab px-4 py-3 text-sm font-medium transition rounded-t-lg ml-auto whitespace-nowrap ${activeTab === 'admin' ? 'active' : ''}`}
                            style={activeTab === 'admin' 
                                ? { backgroundColor: 'var(--autovol-navy)', color: 'white' } 
                                : { backgroundColor: 'var(--autovol-gray-bg)', color: 'var(--autovol-navy)' }}
                        >
                            <span className="tab-icon icon-admin"></span>
                            Admin
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}

// Export for use
window.NavigationGroups = NavigationGroups;
window.NAV_GROUPS = NAV_GROUPS;
