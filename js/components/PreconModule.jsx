// ============================================================================
// PRECON MODULE - Preconstruction Planning & Management
// Contains sub-tabs: Overview, RFI, Estimates, Submittals, Schedule
// ============================================================================

function PreconModule({ projects, employees }) {
    const { useState } = React;
    const [activeSubTab, setActiveSubTab] = useState('overview');
    
    // Get RFI stats for badges
    const getRfiStats = () => {
        let rfis = [];
        try {
            const saved = localStorage.getItem('autovol_rfis');
            if (saved && saved !== 'undefined' && saved !== 'null') {
                rfis = JSON.parse(saved);
            }
        } catch (e) {
            console.error('[PreconModule] Error parsing RFIs:', e);
        }
        const open = rfis.filter(r => r.status === 'Open').length;
        const pending = rfis.filter(r => r.status === 'Pending').length;
        const overdue = rfis.filter(r => {
            if (r.status === 'Closed') return false;
            return r.dueDate && new Date(r.dueDate) < new Date();
        }).length;
        return { open, pending, overdue, total: rfis.length };
    };
    
    const rfiStats = getRfiStats();
    
    const subTabs = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'rfi', label: 'RFI', icon: '📋', badge: rfiStats.open + rfiStats.pending },
        { id: 'estimates', label: 'Estimates', icon: '💰' },
        { id: 'submittals', label: 'Submittals', icon: '📁' },
        { id: 'schedule', label: 'Schedule', icon: '📅' }
    ];
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{color: 'var(--autovol-navy)'}}>
                        📝 Preconstruction
                    </h1>
                    <p className="text-gray-500 text-sm">Planning, estimates, RFIs, and submittals</p>
                </div>
            </div>
            
            {/* Sub-Navigation */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="flex border-b" style={{backgroundColor: '#f8fafc'}}>
                    {subTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className="px-5 py-3 text-sm font-medium transition-all relative"
                            style={{
                                color: activeSubTab === tab.id ? 'var(--autovol-red)' : 'var(--autovol-navy)',
                                borderBottom: activeSubTab === tab.id ? '3px solid var(--autovol-red)' : '3px solid transparent',
                                backgroundColor: activeSubTab === tab.id ? 'white' : 'transparent'
                            }}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                            {tab.badge > 0 && (
                                <span 
                                    className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full"
                                    style={{
                                        backgroundColor: 'var(--autovol-red)',
                                        color: 'white'
                                    }}
                                >
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                
                {/* Sub-Tab Content */}
                <div className="p-0">
                    {activeSubTab === 'overview' && (
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                {/* RFI Summary Card */}
                                <div 
                                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 cursor-pointer hover:shadow-md transition"
                                    onClick={() => setActiveSubTab('rfi')}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-2xl">📋</span>
                                        <span className="text-2xl font-bold" style={{color: 'var(--autovol-navy)'}}>{rfiStats.total}</span>
                                    </div>
                                    <h3 className="font-semibold" style={{color: 'var(--autovol-navy)'}}>RFIs</h3>
                                    <div className="flex gap-3 mt-2 text-xs">
                                        <span className="text-orange-600">{rfiStats.open} Open</span>
                                        <span className="text-yellow-600">{rfiStats.pending} Pending</span>
                                        {rfiStats.overdue > 0 && <span className="text-red-600">{rfiStats.overdue} Overdue</span>}
                                    </div>
                                </div>
                                
                                {/* Estimates Card */}
                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-2xl">💰</span>
                                        <span className="text-2xl font-bold" style={{color: 'var(--autovol-navy)'}}>—</span>
                                    </div>
                                    <h3 className="font-semibold" style={{color: 'var(--autovol-navy)'}}>Estimates</h3>
                                    <p className="text-xs text-gray-500 mt-2">Coming soon</p>
                                </div>
                                
                                {/* Submittals Card */}
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-2xl">📁</span>
                                        <span className="text-2xl font-bold" style={{color: 'var(--autovol-navy)'}}>—</span>
                                    </div>
                                    <h3 className="font-semibold" style={{color: 'var(--autovol-navy)'}}>Submittals</h3>
                                    <p className="text-xs text-gray-500 mt-2">Coming soon</p>
                                </div>
                                
                                {/* Schedule Card */}
                                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-2xl">📅</span>
                                        <span className="text-2xl font-bold" style={{color: 'var(--autovol-navy)'}}>—</span>
                                    </div>
                                    <h3 className="font-semibold" style={{color: 'var(--autovol-navy)'}}>Schedule</h3>
                                    <p className="text-xs text-gray-500 mt-2">Coming soon</p>
                                </div>
                            </div>
                            
                            {/* Quick Actions */}
                            <div className="bg-gray-50 rounded-lg p-4 border">
                                <h3 className="font-semibold mb-3" style={{color: 'var(--autovol-navy)'}}>Quick Actions</h3>
                                <div className="flex flex-wrap gap-2">
                                    <button 
                                        onClick={() => setActiveSubTab('rfi')}
                                        className="px-4 py-2 text-sm font-medium rounded-lg transition"
                                        style={{backgroundColor: 'var(--autovol-teal)', color: 'white'}}
                                    >
                                        + New RFI
                                    </button>
                                    <button 
                                        className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-500"
                                        disabled
                                    >
                                        + New Estimate
                                    </button>
                                    <button 
                                        className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-500"
                                        disabled
                                    >
                                        + New Submittal
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeSubTab === 'rfi' && (
                        <RFIManager projects={projects} employees={employees} />
                    )}
                    
                    {activeSubTab === 'estimates' && (
                        <div className="p-6 text-center py-20">
                            <div className="text-6xl mb-4">💰</div>
                            <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>Estimates</h2>
                            <p className="text-gray-600">Coming soon - Cost estimation and budgeting tools</p>
                        </div>
                    )}
                    
                    {activeSubTab === 'submittals' && (
                        <div className="p-6 text-center py-20">
                            <div className="text-6xl mb-4">📁</div>
                            <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>Submittals</h2>
                            <p className="text-gray-600">Coming soon - Document submittals and approvals</p>
                        </div>
                    )}
                    
                    {activeSubTab === 'schedule' && (
                        <div className="p-6 text-center py-20">
                            <div className="text-6xl mb-4">📅</div>
                            <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>Schedule</h2>
                            <p className="text-gray-600">Coming soon - Preconstruction scheduling and milestones</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
