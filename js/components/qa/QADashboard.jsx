// ============================================================================
// QA DASHBOARD - Overview metrics and status
// ============================================================================

function QADashboard({ metrics, deviations, travelers, modules, QA }) {
    // Recent deviations (last 10)
    const recentDeviations = [...deviations]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);
    
    // Modules needing attention (no traveler or has open deviations)
    const modulesNeedingAttention = modules.filter(m => {
        const hasOpenDeviations = deviations.some(d => 
            d.moduleId === m.id && d.status !== 'closed'
        );
        return !m.traveler || hasOpenDeviations;
    }).slice(0, 5);

    return (
        <div className="space-y-6">
            {/* Metrics Cards Row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Open Deviations */}
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-3xl font-bold text-red-600">{metrics.openDeviations}</div>
                            <div className="text-sm text-gray-600">Open Deviations</div>
                        </div>
                        <span className="icon-alert" style={{ width: '32px', height: '32px', display: 'inline-block', opacity: 0.3 }}></span>
                    </div>
                    {metrics.criticalDeviations > 0 && (
                        <div className="mt-2 text-xs text-red-600 font-medium">
                            {metrics.criticalDeviations} Critical
                        </div>
                    )}
                </div>
                
                {/* Inspection Pass Rate */}
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-3xl font-bold text-green-600">{metrics.inspectionPassRate}%</div>
                            <div className="text-sm text-gray-600">Inspection Pass Rate</div>
                        </div>
                        <span className="icon-checkmark" style={{ width: '32px', height: '32px', display: 'inline-block', opacity: 0.3 }}></span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        {metrics.passedInspections} of {metrics.totalInspections} passed
                    </div>
                </div>
                
                {/* Test Pass Rate */}
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-3xl font-bold text-blue-600">{metrics.testPassRate}%</div>
                            <div className="text-sm text-gray-600">Test Pass Rate</div>
                        </div>
                        <span className="icon-construction" style={{ width: '32px', height: '32px', display: 'inline-block', opacity: 0.3 }}></span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        {metrics.passedTests} of {metrics.totalTests} passed
                    </div>
                </div>
                
                {/* Active Travelers */}
                <div className="bg-white rounded-lg shadow-sm p-4 border-l-4" style={{ borderColor: 'var(--autovol-teal)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-3xl font-bold" style={{ color: 'var(--autovol-teal)' }}>{metrics.activeTravelers}</div>
                            <div className="text-sm text-gray-600">Active Travelers</div>
                        </div>
                        <span className="icon-clipboard" style={{ width: '32px', height: '32px', display: 'inline-block', opacity: 0.3 }}></span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                        {metrics.pendingApproval} pending approval, {metrics.completeTravelers} complete
                    </div>
                </div>
            </div>
            
            {/* Milestones Progress */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--autovol-navy)' }}>
                    Milestone Progress
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {(QA.MILESTONES || []).map((milestone, index) => {
                        // Count modules that have completed this milestone
                        const completedCount = Object.values(travelers).filter(t => 
                            t.milestones?.[milestone.id]?.completed
                        ).length;
                        const totalTravelers = Object.keys(travelers).length;
                        const percentage = totalTravelers > 0 ? Math.round((completedCount / totalTravelers) * 100) : 0;
                        
                        return (
                            <div key={milestone.id} className="text-center p-4 rounded-lg bg-gray-50">
                                <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center text-white font-bold"
                                     style={{ backgroundColor: percentage === 100 ? '#43A047' : percentage > 0 ? '#FB8C00' : '#9E9E9E' }}>
                                    {index + 1}
                                </div>
                                <div className="text-sm font-medium" style={{ color: 'var(--autovol-navy)' }}>
                                    {milestone.name}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {completedCount} / {totalTravelers}
                                </div>
                                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full rounded-full transition-all"
                                        style={{ 
                                            width: `${percentage}%`,
                                            backgroundColor: percentage === 100 ? '#43A047' : '#FB8C00'
                                        }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Deviations */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--autovol-navy)' }}>
                            Recent Deviations
                        </h3>
                        <span className="text-sm text-gray-500">{deviations.length} total</span>
                    </div>
                    
                    {recentDeviations.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <span className="icon-checkmark" style={{ width: '48px', height: '48px', display: 'inline-block', opacity: 0.3 }}></span>
                            <p className="mt-2">No deviations recorded</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentDeviations.map(deviation => {
                                const priority = (QA.DEVIATION_PRIORITIES || []).find(p => p.id === deviation.priority);
                                const status = QA.DEVIATION_STATUS?.[deviation.status?.toUpperCase()] || {};
                                
                                return (
                                    <div key={deviation.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 border-l-4"
                                         style={{ borderColor: priority?.color || '#9E9E9E' }}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium truncate">{deviation.title || deviation.item}</span>
                                                <span className="text-xs px-2 py-0.5 rounded-full text-white"
                                                      style={{ backgroundColor: status.color || '#9E9E9E' }}>
                                                    {status.name || deviation.status}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Station {deviation.station} • {deviation.department}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {new Date(deviation.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {/* Modules Needing Attention */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--autovol-navy)' }}>
                            Modules Needing Attention
                        </h3>
                    </div>
                    
                    {modulesNeedingAttention.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <span className="icon-checkmark" style={{ width: '48px', height: '48px', display: 'inline-block', opacity: 0.3 }}></span>
                            <p className="mt-2">All modules up to date</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {modulesNeedingAttention.map(module => {
                                const moduleDeviations = deviations.filter(d => 
                                    d.moduleId === module.id && d.status !== 'closed'
                                );
                                
                                return (
                                    <div key={module.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                                             style={{ backgroundColor: 'var(--autovol-navy)' }}>
                                            {module.name?.substring(0, 2) || 'M'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">{module.name}</div>
                                            <div className="text-xs text-gray-500">{module.projectName}</div>
                                        </div>
                                        <div className="text-right">
                                            {!module.traveler && (
                                                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                                                    No Traveler
                                                </span>
                                            )}
                                            {moduleDeviations.length > 0 && (
                                                <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 ml-1">
                                                    {moduleDeviations.length} NC
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Department Progress */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--autovol-navy)' }}>
                    Department Inspection Progress
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(QA.DEPARTMENTS || []).map(dept => {
                        // Calculate completion for this department across all travelers
                        let totalItems = 0;
                        let completedItems = 0;
                        
                        Object.values(travelers).forEach(traveler => {
                            const deptChecklist = traveler.departmentChecklists?.find(d => d.departmentId === dept.id);
                            if (deptChecklist) {
                                (deptChecklist.items || []).forEach(item => {
                                    totalItems++;
                                    if (item.conformance) completedItems++;
                                });
                            }
                        });
                        
                        const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
                        
                        return (
                            <div key={dept.id} className="p-4 rounded-lg border hover:shadow-md transition">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium" style={{ color: 'var(--autovol-navy)' }}>
                                        {dept.number}. {dept.name}
                                    </span>
                                    <span className="text-sm font-bold" style={{ color: 'var(--autovol-teal)' }}>
                                        {percentage}%
                                    </span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full rounded-full transition-all"
                                        style={{ 
                                            width: `${percentage}%`,
                                            backgroundColor: percentage === 100 ? '#43A047' : 'var(--autovol-teal)'
                                        }}
                                    ></div>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {completedItems} / {totalItems} items inspected
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Make available globally
window.QADashboard = QADashboard;
