/**
 * DashboardHome.jsx - Role-Based Dashboard Home
 * 
 * Phase 2 & 5 of MODA Dashboard Migration
 * Provides a central hub with role-adaptive widgets showing key metrics
 * 
 * Role Views:
 * - Admin: Full overview with all widgets + system health
 * - Executive: High-level KPIs, project timeline, completion trends
 * - Supervisor: Production focus, crew assignments, bottlenecks, daily targets
 * - Coordinator: Production flow, cross-department handoffs
 * - Employee: Personal station, assignments, training status
 */

// Dashboard Home Component
function DashboardHome({ 
    projects = [], 
    employees = [], 
    auth,
    onNavigate // callback to switch tabs
}) {
    const { useState, useEffect, useMemo } = React;
    
    // Get user's role for adaptive content
    const userRole = auth?.userRole?.id || auth?.currentUser?.dashboardRole || 'employee';
    const userName = auth?.currentUser?.name || auth?.currentUser?.firstName || 'User';
    
    // Current time for greeting
    const [currentTime, setCurrentTime] = useState(new Date());
    
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);
    
    const greeting = useMemo(() => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    }, [currentTime]);
    
    // Calculate production metrics from projects
    const metrics = useMemo(() => {
        const activeProjects = projects.filter(p => p.status === 'Active');
        const allModules = activeProjects.flatMap(p => p.modules || []);
        
        // Count modules by status
        let inProgress = 0;
        let completed = 0;
        let notStarted = 0;
        
        allModules.forEach(module => {
            const stages = module.stageProgress || {};
            const stageValues = Object.values(stages);
            const avgProgress = stageValues.length > 0 
                ? stageValues.reduce((a, b) => a + b, 0) / stageValues.length 
                : 0;
            
            if (avgProgress === 0) notStarted++;
            else if (avgProgress >= 100) completed++;
            else inProgress++;
        });
        
        // Find bottlenecks (stations with most in-progress modules)
        const stationCounts = {};
        allModules.forEach(module => {
            const stages = module.stageProgress || {};
            Object.entries(stages).forEach(([stageId, progress]) => {
                if (progress > 0 && progress < 100) {
                    stationCounts[stageId] = (stationCounts[stageId] || 0) + 1;
                }
            });
        });
        
        const bottlenecks = Object.entries(stationCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([stageId, count]) => ({ stageId, count }));
        
        return {
            activeProjects: activeProjects.length,
            totalModules: allModules.length,
            inProgress,
            completed,
            notStarted,
            bottlenecks
        };
    }, [projects]);
    
    // Stage name lookup
    const stageNames = {
        'frame': 'Framing',
        'rough': 'Rough-In',
        'closeIn': 'Close-In',
        'finish': 'Finish',
        'closeUp': 'Close-Up',
        'wrap': 'Wrap'
    };
    
    // Check if user is Production Floor (view-only drawings access)
    const isProductionFloor = userRole === 'production_floor';
    
    // Quick actions based on role - using CSS icon classes
    const quickActions = useMemo(() => {
        // Production Floor only gets Drawings access
        if (isProductionFloor) {
            return [
                { id: 'drawings', label: 'Drawings', iconClass: 'icon-file', tab: 'drawings' },
            ];
        }
        
        const actions = [
            { id: 'production', label: 'Production Board', iconClass: 'icon-production', tab: 'production' },
            { id: 'projects', label: 'Projects', iconClass: 'icon-projects', tab: 'projects' },
        ];
        
        if (['admin', 'department-supervisor', 'coordinator'].includes(userRole)) {
            actions.push({ id: 'people', label: 'People', iconClass: 'icon-people', tab: 'people' });
        }
        
        if (['admin', 'executive'].includes(userRole)) {
            actions.push({ id: 'executive', label: 'Executive View', iconClass: 'icon-executive', tab: 'executive' });
        }
        
        if (userRole === 'admin') {
            actions.push({ id: 'admin', label: 'Admin', iconClass: 'icon-admin', tab: 'admin' });
        }
        
        return actions;
    }, [userRole, isProductionFloor]);

    return (
        <div className="dashboard-home">
            {/* Header with Greeting */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                    {greeting}, {userName}
                </h1>
                <p className="text-gray-500 text-sm">
                    {currentTime.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </p>
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {quickActions.map(action => (
                        <button
                            key={action.id}
                            onClick={() => onNavigate?.(action.tab)}
                            className="quick-action-card bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all text-left"
                        >
                            <span className={`quick-action-icon ${action.iconClass}`} style={{ width: '28px', height: '28px', display: 'block', marginBottom: '8px' }}></span>
                            <span className="font-medium text-sm" style={{ color: 'var(--autovol-navy)' }}>
                                {action.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Metrics Grid - Hidden for Production Floor */}
            {!isProductionFloor && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* Active Projects */}
                    <div className="metric-card bg-white rounded-lg p-4 shadow-sm border-l-4" style={{ borderLeftColor: 'var(--autovol-teal)' }}>
                        <div className="text-3xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                            {metrics.activeProjects}
                        </div>
                        <div className="text-sm text-gray-500">Active Projects</div>
                    </div>

                    {/* Total Modules */}
                    <div className="metric-card bg-white rounded-lg p-4 shadow-sm border-l-4" style={{ borderLeftColor: 'var(--autovol-navy)' }}>
                        <div className="text-3xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                            {metrics.totalModules}
                        </div>
                        <div className="text-sm text-gray-500">Total Modules</div>
                    </div>

                    {/* In Progress */}
                    <div className="metric-card bg-white rounded-lg p-4 shadow-sm border-l-4" style={{ borderLeftColor: '#F59E0B' }}>
                        <div className="text-3xl font-bold" style={{ color: '#F59E0B' }}>
                            {metrics.inProgress}
                        </div>
                        <div className="text-sm text-gray-500">In Progress</div>
                    </div>

                    {/* Completed */}
                    <div className="metric-card bg-white rounded-lg p-4 shadow-sm border-l-4" style={{ borderLeftColor: '#10B981' }}>
                        <div className="text-3xl font-bold" style={{ color: '#10B981' }}>
                            {metrics.completed}
                        </div>
                        <div className="text-sm text-gray-500">Completed</div>
                    </div>
                </div>
            )}

            {/* Two Column Layout - Hidden for Production Floor */}
            {!isProductionFloor && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bottlenecks / Attention Needed */}
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--autovol-navy)' }}>
                            <span className="icon-alert" style={{ width: '20px', height: '20px', display: 'inline-block' }}></span> Stations Needing Attention
                        </h3>
                        {metrics.bottlenecks.length > 0 ? (
                            <div className="space-y-2">
                                {metrics.bottlenecks.map(({ stageId, count }) => (
                                    <div 
                                        key={stageId}
                                        className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                                    >
                                        <span className="font-medium">{stageNames[stageId] || stageId}</span>
                                        <span className="text-amber-700 font-semibold">{count} modules</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <span className="icon-check" style={{ width: '40px', height: '40px', display: 'block', margin: '0 auto 8px', filter: 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(130deg) brightness(95%) contrast(95%)' }}></span>
                                No bottlenecks detected
                            </div>
                        )}
                    </div>

                    {/* Active Projects List */}
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--autovol-navy)' }}>
                            <span className="icon-projects" style={{ width: '20px', height: '20px', display: 'inline-block' }}></span> Active Projects
                        </h3>
                        {projects.filter(p => p.status === 'Active').length > 0 ? (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {projects.filter(p => p.status === 'Active').slice(0, 5).map(project => {
                                    const moduleCount = project.modules?.length || 0;
                                    const completedCount = (project.modules || []).filter(m => {
                                        const stages = m.stageProgress || {};
                                        const avg = Object.values(stages).reduce((a, b) => a + b, 0) / (Object.values(stages).length || 1);
                                        return avg >= 100;
                                    }).length;
                                    const progress = moduleCount > 0 ? Math.round((completedCount / moduleCount) * 100) : 0;
                                    
                                    return (
                                        <div 
                                            key={project.id}
                                            className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer transition"
                                            onClick={() => onNavigate?.('projects')}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-medium">{project.name}</span>
                                                <span className="text-sm text-gray-500">{moduleCount} modules</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="h-2 rounded-full transition-all"
                                                    style={{ 
                                                        width: `${progress}%`,
                                                        backgroundColor: progress === 100 ? '#10B981' : 'var(--autovol-teal)'
                                                    }}
                                                />
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">{progress}% complete</div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <span className="icon-folder" style={{ width: '40px', height: '40px', display: 'block', margin: '0 auto 8px', opacity: '0.5' }}></span>
                                No active projects
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== WEEKLY SCHEDULE WIDGET ===== */}
            {['admin', 'department-supervisor', 'coordinator'].includes(userRole) && (
                <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
                    <h3 className="font-semibold mb-3 flex items-center justify-between" style={{ color: 'var(--autovol-navy)' }}>
                        <span className="flex items-center gap-2">
                            <span className="icon-tracker" style={{ width: '20px', height: '20px', display: 'inline-block' }}></span>
                            This Week's Schedule
                        </span>
                        <button 
                            onClick={() => onNavigate?.('production')}
                            className="text-xs px-3 py-1 rounded-lg transition"
                            style={{ backgroundColor: 'var(--autovol-teal)', color: 'white' }}
                        >
                            View Production →
                        </button>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 bg-blue-50 rounded-lg text-center border border-blue-200">
                            <div className="text-2xl font-bold text-blue-700">
                                {metrics.inProgress}
                            </div>
                            <div className="text-xs text-blue-600">In Production</div>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-lg text-center border border-amber-200">
                            <div className="text-2xl font-bold text-amber-700">
                                {metrics.bottlenecks.length}
                            </div>
                            <div className="text-xs text-amber-600">Bottlenecks</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg text-center border border-green-200">
                            <div className="text-2xl font-bold text-green-700">
                                {metrics.completed}
                            </div>
                            <div className="text-xs text-green-600">Completed</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg text-center border border-gray-200">
                            <div className="text-2xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                                {metrics.notStarted}
                            </div>
                            <div className="text-xs text-gray-600">Not Started</div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== ROLE-SPECIFIC WIDGETS ===== */}
            
            {/* EXECUTIVE VIEW: High-level trends and timeline */}
            {userRole === 'executive' && (
                <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--autovol-navy)' }}>
                        <span className="icon-executive" style={{ width: '20px', height: '20px', display: 'inline-block' }}></span> Executive Summary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                            <div className="text-sm text-blue-600 font-medium mb-1">Completion Rate</div>
                            <div className="text-3xl font-bold text-blue-800">
                                {metrics.totalModules > 0 ? Math.round((metrics.completed / metrics.totalModules) * 100) : 0}%
                            </div>
                            <div className="text-xs text-blue-600 mt-1">{metrics.completed} of {metrics.totalModules} modules</div>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                            <div className="text-sm text-green-600 font-medium mb-1">On Track</div>
                            <div className="text-3xl font-bold text-green-800">
                                {metrics.bottlenecks.length === 0 ? 'Yes' : 'Review'}
                            </div>
                            <div className="text-xs text-green-600 mt-1">
                                {metrics.bottlenecks.length === 0 ? 'No bottlenecks detected' : `${metrics.bottlenecks.length} stations need attention`}
                            </div>
                        </div>
                        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                            <div className="text-sm text-purple-600 font-medium mb-1">Active Workforce</div>
                            <div className="text-3xl font-bold text-purple-800">
                                {employees.filter(e => e.status === 'Active').length}
                            </div>
                            <div className="text-xs text-purple-600 mt-1">employees on roster</div>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg text-center">
                        <button 
                            onClick={() => onNavigate?.('executive')}
                            className="text-sm font-medium px-4 py-2 rounded-lg transition"
                            style={{ backgroundColor: 'var(--autovol-navy)', color: 'white' }}
                        >
                            View Full Executive Dashboard →
                        </button>
                    </div>
                </div>
            )}

            {/* SUPERVISOR VIEW: Crew Overview + Daily Targets */}
            {['admin', 'department-supervisor'].includes(userRole) && employees.length > 0 && (
                <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--autovol-navy)' }}>
                        <span className="icon-people" style={{ width: '20px', height: '20px', display: 'inline-block' }}></span> Crew Overview
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                                {employees.filter(e => e.status === 'Active').length}
                            </div>
                            <div className="text-sm text-gray-600">Active</div>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                                {employees.filter(e => e.shift === 'Day').length}
                            </div>
                            <div className="text-sm text-gray-600">Day Shift</div>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                                {employees.filter(e => e.shift === 'Night').length}
                            </div>
                            <div className="text-sm text-gray-600">Night Shift</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-600">
                                {employees.length}
                            </div>
                            <div className="text-sm text-gray-600">Total</div>
                        </div>
                    </div>
                    
                    {/* Daily Production Target - Supervisor specific */}
                    <div className="mt-4 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="text-sm text-teal-700 font-medium">Today's Target</div>
                                <div className="text-xs text-teal-600">Modules to complete all stations</div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold" style={{ color: 'var(--autovol-teal)' }}>
                                    {metrics.inProgress > 0 ? Math.min(5, metrics.inProgress) : 0}
                                </div>
                                <div className="text-xs text-teal-600">modules in queue</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* COORDINATOR VIEW: Production Flow */}
            {userRole === 'coordinator' && (
                <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--autovol-navy)' }}>
                        <span className="icon-production" style={{ width: '20px', height: '20px', display: 'inline-block' }}></span> Production Flow
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                        {Object.entries(stageNames).map(([stageId, stageName]) => {
                            const stageModules = projects.flatMap(p => p.modules || []).filter(m => {
                                const progress = m.stageProgress?.[stageId] || 0;
                                return progress > 0 && progress < 100;
                            }).length;
                            return (
                                <div key={stageId} className="p-3 bg-gray-50 rounded-lg text-center">
                                    <div className="text-lg font-bold" style={{ color: 'var(--autovol-navy)' }}>
                                        {stageModules}
                                    </div>
                                    <div className="text-xs text-gray-500">{stageName}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* EMPLOYEE VIEW: Personal Status */}
            {userRole === 'employee' && (
                <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--autovol-navy)' }}>
                        <span className="icon-people" style={{ width: '20px', height: '20px', display: 'inline-block' }}></span> My Status
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-sm text-blue-600 font-medium mb-1">My Role</div>
                            <div className="text-lg font-bold text-blue-800">
                                {auth?.userRole?.name || 'Employee'}
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                                {auth?.userRole?.description || 'Production floor access'}
                            </div>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="text-sm text-green-600 font-medium mb-1">Access Level</div>
                            <div className="text-lg font-bold text-green-800">
                                {auth?.visibleTabs?.length || 1} Tab{(auth?.visibleTabs?.length || 1) !== 1 ? 's' : ''}
                            </div>
                            <div className="text-xs text-green-600 mt-1">
                                {auth?.visibleTabs?.join(', ') || 'Production'}
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
                        <div className="text-sm text-amber-700">
                            💡 Need access to more features? Contact your supervisor.
                        </div>
                    </div>
                </div>
            )}

            {/* ADMIN VIEW: System Health */}
            {userRole === 'admin' && (
                <div className="mt-6 bg-white rounded-lg shadow-sm p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--autovol-navy)' }}>
                        <span className="icon-admin" style={{ width: '20px', height: '20px', display: 'inline-block' }}></span> System Health
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-green-50 rounded-lg text-center">
                            <div className="text-lg font-bold text-green-600">✓</div>
                            <div className="text-xs text-gray-600">Firebase</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg text-center">
                            <div className="text-lg font-bold text-green-600">✓</div>
                            <div className="text-xs text-gray-600">Auth</div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg text-center">
                            <div className="text-lg font-bold text-blue-600">{projects.length}</div>
                            <div className="text-xs text-gray-600">Projects</div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-lg text-center">
                            <div className="text-lg font-bold text-blue-600">{employees.length}</div>
                            <div className="text-xs text-gray-600">Users</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Export for use
window.DashboardHome = DashboardHome;
