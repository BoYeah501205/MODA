// ============================================================================
// EXECUTIVE DASHBOARD - Streamlined Executive View
// High-level operational visibility for leadership (CEO, CTO, CFO)
// Design principle: "Quick glimpse, not overwhelming"
// ============================================================================

const { useState, useEffect, useMemo } = React;

// ===== FACTORY CONFIGURATION =====
const FACTORIES = [
    { id: 'all', name: 'All Factories', icon: '🏭' },
    { id: 'nampa', name: 'Nampa Star Rd', icon: '🏭', location: 'Nampa, ID' },
    { id: 'factory2', name: 'Factory 2 (TBD)', icon: '🏗️', location: 'TBD', isFake: true }
];

// ===== FAKE DATA FOR FACTORY 2 (placeholder until real data) =====
const FACTORY2_FAKE_DATA = {
    thisWeek: { completed: 12, target: 14 },
    lastWeek: { completed: 13, target: 14 },
    quarterTotal: 98,
    quarterTarget: 126,
    automation: {
        wallLine: { actual: 580, target: 720, downtime: 2.1 },
        floorLine: { actual: 5800, target: 6500, downtime: 1.4 }
    },
    weeklyHistory: [
        { week: 'W1', completed: 12, target: 14 },
        { week: 'W2', completed: 14, target: 14 },
        { week: 'W3', completed: 11, target: 14 },
        { week: 'W4', completed: 13, target: 14 },
        { week: 'W5', completed: 12, target: 14 },
        { week: 'W6', completed: 14, target: 14 },
        { week: 'W7', completed: 13, target: 14 },
        { week: 'W8', completed: 12, target: 14 }
    ]
};

// ===== FAKE AUTOMATION DATA (placeholder until integration) =====
const getAutomationData = (factoryId) => {
    if (factoryId === 'factory2') {
        return FACTORY2_FAKE_DATA.automation;
    }
    // Nampa / real data placeholder
    return {
        wallLine: { actual: 726.74, target: 905.98, downtime: 1.64, unit: 'LF' },
        floorLine: { actual: 6601.82, target: 7200, downtime: 1.73, unit: 'LF' }
    };
};

// ===== UTILITY FUNCTIONS =====
const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.round(num).toLocaleString();
};

const getPercentColor = (percent) => {
    if (percent >= 95) return 'text-green-600';
    if (percent >= 80) return 'text-yellow-600';
    return 'text-red-600';
};

const getPercentBgColor = (percent) => {
    if (percent >= 95) return 'bg-green-500';
    if (percent >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
};

const getCurrentQuarter = () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return `Q${quarter} '${now.getFullYear().toString().slice(-2)}`;
};

// ===== KPI CARD COMPONENT =====
function KPICard({ title, value, target, subtitle, status, large = false }) {
    const percent = target ? (value / target) * 100 : null;
    const statusColor = status === 'good' ? 'border-green-400 bg-green-50' :
                       status === 'warning' ? 'border-yellow-400 bg-yellow-50' :
                       status === 'critical' ? 'border-red-400 bg-red-50' :
                       'border-gray-200 bg-white';
    
    return (
        <div className={`rounded-xl border-2 p-4 ${statusColor} transition-all hover:shadow-md`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
            <div className="flex items-baseline gap-2 mt-1">
                <span className={`font-bold ${large ? 'text-3xl' : 'text-2xl'} text-gray-900`}>
                    {value}
                </span>
                {target && (
                    <span className="text-lg text-gray-400">/ {target}</span>
                )}
            </div>
            {subtitle && (
                <p className={`text-sm mt-1 font-medium ${percent ? getPercentColor(percent) : 'text-gray-500'}`}>
                    {subtitle}
                </p>
            )}
        </div>
    );
}

// ===== WEEKLY TREND CHART =====
function WeeklyTrendChart({ data, target }) {
    const maxValue = Math.max(...data.map(d => Math.max(d.completed, d.target)), target, 1);
    
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">Weekly Trend</h3>
                <span className="text-xs text-gray-500">Target: {target} modules/week</span>
            </div>
            <div className="flex items-end gap-2 h-24">
                {data.map((week, idx) => {
                    const percent = (week.completed / maxValue) * 100;
                    const hitTarget = week.completed >= week.target;
                    return (
                        <div key={idx} className="flex-1 flex flex-col items-center">
                            <div className="relative w-full flex justify-center">
                                <div 
                                    className={`w-8 rounded-t transition-all ${hitTarget ? 'bg-green-500' : 'bg-red-400'}`}
                                    style={{ height: `${percent}%`, minHeight: week.completed > 0 ? 8 : 0 }}
                                    title={`${week.week}: ${week.completed}/${week.target}`}
                                />
                                {/* Target line indicator */}
                                <div 
                                    className="absolute w-10 border-t-2 border-dashed border-gray-400"
                                    style={{ bottom: `${(week.target / maxValue) * 100}%` }}
                                />
                            </div>
                            <span className="text-xs text-gray-500 mt-1">{week.week}</span>
                            <span className="text-xs font-semibold text-gray-700">{week.completed}</span>
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-gray-600">Met Target</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-red-400 rounded"></div>
                    <span className="text-gray-600">Below Target</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-6 border-t-2 border-dashed border-gray-400"></div>
                    <span className="text-gray-600">Target</span>
                </div>
            </div>
        </div>
    );
}

// ===== AUTOMATION STATUS CARD =====
function AutomationCard({ title, actual, target, downtime, unit = 'LF' }) {
    const percent = (actual / target) * 100;
    const gap = actual - target;
    
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-800">{title}</h4>
                <span className={`text-sm font-bold ${getPercentColor(percent)}`}>
                    {percent.toFixed(0)}%
                </span>
            </div>
            
            {/* Progress bar */}
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div 
                    className={`h-full transition-all ${getPercentBgColor(percent)}`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
            
            <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                    {formatNumber(actual)} / {formatNumber(target)} {unit}
                </span>
                <span className={gap >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {gap >= 0 ? '+' : ''}{formatNumber(gap)} {unit}
                </span>
            </div>
            
            <div className="mt-2 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                    Downtime: <span className="font-semibold text-gray-700">{downtime.toFixed(1)} hrs</span>
                </span>
            </div>
        </div>
    );
}

// ===== PROJECT PROGRESS BAR =====
function ProjectProgressBar({ project, completedModules, totalModules }) {
    const percent = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
    const isComplete = percent >= 100;
    
    return (
        <div className="flex items-center gap-3 py-2">
            <div className="w-36 truncate">
                <span className="font-medium text-gray-800 text-sm">{project.name}</span>
            </div>
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
            <div className="w-24 text-right">
                <span className={`text-sm font-semibold ${isComplete ? 'text-green-600' : 'text-gray-700'}`}>
                    {isComplete ? 'Complete' : `${completedModules}/${totalModules}`}
                </span>
            </div>
            <div className="w-12 text-right">
                <span className={`text-sm font-medium ${getPercentColor(percent)}`}>
                    {percent.toFixed(0)}%
                </span>
            </div>
        </div>
    );
}

// ===== FACTORY COMPARISON CARD =====
function FactoryCard({ factory, metrics }) {
    const percent = metrics.target > 0 ? (metrics.completed / metrics.target) * 100 : 0;
    
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{factory.icon}</span>
                <div>
                    <h4 className="font-semibold text-gray-800">{factory.name}</h4>
                    {factory.location && (
                        <p className="text-xs text-gray-500">{factory.location}</p>
                    )}
                </div>
                {factory.isFake && (
                    <span className="ml-auto px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                        Sample Data
                    </span>
                )}
            </div>
            
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">This Week</span>
                    <span className="font-semibold">{metrics.completed}/{metrics.target} modules</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${getPercentBgColor(percent)}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                    <span>Efficiency: {percent.toFixed(0)}%</span>
                </div>
            </div>
        </div>
    );
}

// ===== MAIN EXECUTIVE DASHBOARD COMPONENT =====
function ExecutiveDashboard({ 
    projects = [], 
    completedWeeks = [], 
    scheduleSetup = {},
    currentWeek = null
}) {
    const [selectedFactory, setSelectedFactory] = useState('all');
    const [lastRefresh, setLastRefresh] = useState(new Date());

    // Calculate line balance (weekly target)
    const lineBalance = useMemo(() => {
        const shift1 = scheduleSetup?.shift1 || {};
        const shift2 = scheduleSetup?.shift2 || {};
        return Object.values(shift1).reduce((sum, v) => sum + (v || 0), 0) +
               Object.values(shift2).reduce((sum, v) => sum + (v || 0), 0);
    }, [scheduleSetup]);

    const weeklyTarget = lineBalance || 21; // Default to 21 if not set

    // ===== COMPUTE METRICS =====
    const metrics = useMemo(() => {
        const activeProjects = projects.filter(p => p.status === 'Active');
        const allModules = projects.flatMap(p => (p.modules || []).map(m => ({ 
            ...m, 
            projectId: p.id, 
            projectName: p.name 
        })));
        
        // Count completed modules (close-up = 100%)
        const completedModules = allModules.filter(m => m.stageProgress?.['close-up'] === 100).length;
        
        // Get this week's completed count from currentWeek or estimate
        const thisWeekCompleted = currentWeek?.modulesCompleted || 
            completedWeeks[0]?.modulesCompleted || 
            Math.floor(Math.random() * 5) + 16; // Placeholder
        
        // Get last week's data
        const lastWeekData = completedWeeks[0] || { modulesCompleted: 19, lineBalance: weeklyTarget };
        
        // Build weekly history for chart (last 8 weeks)
        const weeklyHistory = [];
        for (let i = 7; i >= 0; i--) {
            const weekData = completedWeeks[i];
            if (weekData) {
                weeklyHistory.push({
                    week: `W${8 - i}`,
                    completed: weekData.modulesCompleted || 0,
                    target: weekData.lineBalance || weeklyTarget
                });
            } else {
                // Generate placeholder data for demo
                weeklyHistory.push({
                    week: `W${8 - i}`,
                    completed: Math.floor(Math.random() * 6) + 16,
                    target: weeklyTarget
                });
            }
        }
        
        // Quarter calculations
        const now = new Date();
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const weeksInQuarter = Math.ceil((now - quarterStart) / (7 * 24 * 60 * 60 * 1000));
        const quarterTarget = weeksInQuarter * weeklyTarget;
        const quarterTotal = weeklyHistory.reduce((sum, w) => sum + w.completed, 0);
        
        // Full quarter projection (13 weeks)
        const avgWeekly = quarterTotal / Math.max(weeksInQuarter, 1);
        const quarterProjection = Math.round(avgWeekly * 13);
        
        // Project-level metrics
        const projectMetrics = activeProjects.map(p => {
            const modules = p.modules || [];
            const completed = modules.filter(m => m.stageProgress?.['close-up'] === 100).length;
            return {
                project: p,
                completed,
                total: modules.length
            };
        });

        return {
            thisWeek: { completed: thisWeekCompleted, target: weeklyTarget },
            lastWeek: { completed: lastWeekData.modulesCompleted || 19, target: lastWeekData.lineBalance || weeklyTarget },
            quarterTotal,
            quarterTarget,
            quarterProjection,
            weeklyHistory,
            projectMetrics,
            activeProjects,
            totalModules: allModules.length,
            completedModules
        };
    }, [projects, completedWeeks, currentWeek, weeklyTarget]);

    // Get automation data based on selected factory
    const automationData = useMemo(() => {
        return getAutomationData(selectedFactory === 'all' ? 'nampa' : selectedFactory);
    }, [selectedFactory]);

    // Factory-specific metrics
    const factoryMetrics = useMemo(() => {
        if (selectedFactory === 'all') {
            return {
                nampa: metrics.thisWeek,
                factory2: FACTORY2_FAKE_DATA.thisWeek
            };
        }
        return null;
    }, [selectedFactory, metrics]);

    // Manual refresh
    const handleRefresh = () => {
        setLastRefresh(new Date());
    };

    // Determine status for KPI cards
    const getStatus = (completed, target) => {
        const percent = (completed / target) * 100;
        if (percent >= 95) return 'good';
        if (percent >= 80) return 'warning';
        return 'critical';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
                    <p className="text-sm text-gray-500">
                        High-level operational overview • Updated {lastRefresh.toLocaleTimeString()}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Factory Selector */}
                    <select
                        value={selectedFactory}
                        onChange={(e) => setSelectedFactory(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {FACTORIES.map(f => (
                            <option key={f.id} value={f.id}>
                                {f.icon} {f.name}
                            </option>
                        ))}
                    </select>
                    
                    <button
                        onClick={handleRefresh}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>

            {/* SECTION 1: Production Scorecard */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
                <h2 className="text-lg font-semibold mb-4 opacity-90">Production Scorecard</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPICard 
                        title="This Week"
                        value={metrics.thisWeek.completed}
                        target={metrics.thisWeek.target}
                        subtitle={`${((metrics.thisWeek.completed / metrics.thisWeek.target) * 100).toFixed(0)}% to target`}
                        status={getStatus(metrics.thisWeek.completed, metrics.thisWeek.target)}
                        large
                    />
                    <KPICard 
                        title="Last Week"
                        value={metrics.lastWeek.completed}
                        target={metrics.lastWeek.target}
                        subtitle={`${((metrics.lastWeek.completed / metrics.lastWeek.target) * 100).toFixed(0)}% to target`}
                        status={getStatus(metrics.lastWeek.completed, metrics.lastWeek.target)}
                    />
                    <KPICard 
                        title={`${getCurrentQuarter()} Total`}
                        value={metrics.quarterTotal}
                        subtitle="modules completed"
                        status="good"
                    />
                    <KPICard 
                        title={`${getCurrentQuarter()} Projection`}
                        value={metrics.quarterProjection}
                        target={metrics.quarterTarget}
                        subtitle="projected by quarter end"
                        status={getStatus(metrics.quarterProjection, metrics.quarterTarget)}
                    />
                </div>
            </div>

            {/* SECTION 2: Weekly Trend + Automation Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Trend Chart */}
                <WeeklyTrendChart 
                    data={metrics.weeklyHistory} 
                    target={weeklyTarget}
                />
                
                {/* Automation Status */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-800">Automation Status</h3>
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                            Daily Summary
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <AutomationCard 
                            title="Wall Line"
                            actual={automationData.wallLine.actual}
                            target={automationData.wallLine.target}
                            downtime={automationData.wallLine.downtime}
                            unit={automationData.wallLine.unit || 'LF'}
                        />
                        <AutomationCard 
                            title="Floor Line"
                            actual={automationData.floorLine.actual}
                            target={automationData.floorLine.target}
                            downtime={automationData.floorLine.downtime}
                            unit={automationData.floorLine.unit || 'LF'}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-3 text-center">
                        * Automation data updates once per day
                    </p>
                </div>
            </div>

            {/* SECTION 3: Project Pipeline */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-800 mb-4">Project Pipeline</h3>
                {metrics.projectMetrics.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {metrics.projectMetrics.map(({ project, completed, total }) => (
                            <ProjectProgressBar 
                                key={project.id}
                                project={project}
                                completedModules={completed}
                                totalModules={total}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <span className="text-3xl">📋</span>
                        <p className="mt-2">No active projects</p>
                    </div>
                )}
            </div>

            {/* SECTION 4: Factory Comparison (only when "All Factories" selected) */}
            {selectedFactory === 'all' && factoryMetrics && (
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-800 mb-4">Factory Comparison</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FactoryCard 
                            factory={FACTORIES.find(f => f.id === 'nampa')}
                            metrics={factoryMetrics.nampa}
                        />
                        <FactoryCard 
                            factory={FACTORIES.find(f => f.id === 'factory2')}
                            metrics={factoryMetrics.factory2}
                        />
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 py-2">
                Executive Dashboard • Data refreshes on page load • Factory 2 data is placeholder
            </div>
        </div>
    );
}

// Export for use in MODA
window.ExecutiveDashboard = ExecutiveDashboard;
