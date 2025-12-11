/**
 * DashboardHome.jsx - Role-Based Dashboard Home
 * 
 * Phase 2 of MODA Dashboard Migration
 * Provides a central hub with role-adaptive widgets showing key metrics
 * 
 * Views:
 * - Supervisor: Production focus, crew assignments, bottlenecks
 * - Executive: High-level KPIs (uses existing ExecutiveDashboard)
 * - Worker: Personal tasks, station status
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
    
    // Quick actions based on role - using CSS icon classes
    const quickActions = useMemo(() => {
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
    }, [userRole]);

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

            {/* Metrics Grid */}
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

            {/* Two Column Layout */}
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

            {/* Supervisor-specific: Crew Overview */}
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
                </div>
            )}
        </div>
    );
}

// Export for use
window.DashboardHome = DashboardHome;
