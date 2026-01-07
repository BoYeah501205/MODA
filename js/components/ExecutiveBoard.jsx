// ============================================================================
// EXECUTIVE BOARD - Executive Dashboard for Business Health Overview
// Standalone component for executive-level operational insights
// ============================================================================

const { useState, useEffect, useMemo } = React;

// ===== PRODUCTION STAGES (mirrored from App.jsx for standalone use) =====
const PRODUCTION_STAGES = [
    { id: 'auto-c', name: 'Automation (Ceiling)', dept: 'AUTO-C', group: 'automation' },
    { id: 'auto-f', name: 'Automation (Floor)', dept: 'AUTO-F', group: 'automation' },
    { id: 'auto-walls', name: 'Automation (Walls)', dept: 'AUTO-W', group: 'automation' },
    { id: 'mezzanine', name: 'Mezzanine', dept: 'MEZZ', group: null },
    { id: 'elec-ceiling', name: 'Electrical Ceiling', dept: 'ELEC-C', group: null },
    { id: 'wall-set', name: 'Wall Set', dept: 'WALL', group: null },
    { id: 'ceiling-set', name: 'Ceiling Set', dept: 'CEIL', group: null },
    { id: 'soffits', name: 'Soffits', dept: 'SOFF', group: null },
    { id: 'mech-rough', name: 'Mechanical Rough', dept: 'MECH-R', group: 'rough' },
    { id: 'elec-rough', name: 'Electrical Rough', dept: 'ELEC-R', group: 'rough' },
    { id: 'plumb-rough', name: 'Plumbing Rough', dept: 'PLUMB-R', group: 'rough' },
    { id: 'exteriors', name: 'Exteriors', dept: 'EXT', group: null },
    { id: 'drywall-bp', name: 'Drywall Board/Patch', dept: 'DW-BP', group: 'drywall' },
    { id: 'drywall-ttp', name: 'Drywall Tape/Texture/Paint', dept: 'DW-TTP', group: 'drywall' },
    { id: 'roofing', name: 'Roofing', dept: 'ROOF', group: null },
    { id: 'pre-finish', name: 'Pre-Finish', dept: 'PRE-FIN', group: null },
    { id: 'mech-trim', name: 'Mechanical Trim', dept: 'MECH-T', group: 'trim' },
    { id: 'elec-trim', name: 'Electrical Trim', dept: 'ELEC-T', group: 'trim' },
    { id: 'plumb-trim', name: 'Plumbing Trim', dept: 'PLUMB-T', group: 'trim' },
    { id: 'final-finish', name: 'Final Finish', dept: 'FIN', group: null },
    { id: 'sign-off', name: 'Sign Off', dept: 'QA', group: null },
    { id: 'close-up', name: 'Close Up', dept: 'CLOSE', group: null }
];

// ===== UTILITY FUNCTIONS =====
const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

const formatPercent = (value, decimals = 1) => {
    return `${value.toFixed(decimals)}%`;
};

const getHealthColor = (value, thresholds = { good: 80, warning: 60 }) => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
};

const getHealthBgColor = (value, thresholds = { good: 80, warning: 60 }) => {
    if (value >= thresholds.good) return 'bg-green-500';
    if (value >= thresholds.warning) return 'bg-yellow-500';
    return 'bg-red-500';
};

const getTrendIcon = (trend) => {
    if (trend > 0) return '↑';
    if (trend < 0) return '↓';
    return '→';
};

const getTrendColor = (trend, inverse = false) => {
    const positive = inverse ? trend < 0 : trend > 0;
    const negative = inverse ? trend > 0 : trend < 0;
    if (positive) return 'text-green-600';
    if (negative) return 'text-red-600';
    return 'text-gray-500';
};

// ===== KPI CARD COMPONENT =====
function KPICard({ title, value, subtitle, trend, trendLabel, icon, color = 'blue', size = 'normal' }) {
    const colorClasses = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
        teal: 'bg-teal-50 border-teal-200 text-teal-700',
        navy: 'bg-slate-50 border-slate-200 text-slate-700'
    };

    const iconBgClasses = {
        blue: 'bg-blue-100',
        green: 'bg-green-100',
        red: 'bg-red-100',
        yellow: 'bg-yellow-100',
        purple: 'bg-purple-100',
        teal: 'bg-teal-100',
        navy: 'bg-slate-100'
    };

    return (
        <div className={`rounded-xl border-2 p-5 ${colorClasses[color]} transition-all hover:shadow-lg`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium opacity-80 uppercase tracking-wide">{title}</p>
                    <p className={`font-bold mt-1 ${size === 'large' ? 'text-4xl' : 'text-2xl'}`}>{value}</p>
                    {subtitle && <p className="text-sm mt-1 opacity-70">{subtitle}</p>}
                    {trend !== undefined && (
                        <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${getTrendColor(trend)}`}>
                            <span>{getTrendIcon(trend)}</span>
                            <span>{Math.abs(trend).toFixed(1)}%</span>
                            {trendLabel && <span className="opacity-70">{trendLabel}</span>}
                        </div>
                    )}
                </div>
                {icon && (
                    <div className={`w-12 h-12 rounded-lg ${iconBgClasses[color]} flex items-center justify-center text-2xl`}>
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
}

// ===== HEALTH INDICATOR COMPONENT =====
function HealthIndicator({ label, value, maxValue = 100, showPercent = true }) {
    const percent = (value / maxValue) * 100;
    const healthColor = getHealthBgColor(percent);
    
    return (
        <div className="flex items-center gap-3">
            <div className="w-32 text-sm font-medium text-gray-600">{label}</div>
            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                    className={`h-full ${healthColor} transition-all duration-500`}
                    style={{ width: `${Math.min(percent, 100)}%` }}
                />
            </div>
            <div className={`w-16 text-right text-sm font-semibold ${getHealthColor(percent)}`}>
                {showPercent ? formatPercent(percent, 0) : value}
            </div>
        </div>
    );
}

// ===== MINI CHART COMPONENT (Simple Bar Chart) =====
function MiniBarChart({ data, height = 60, barColor = 'bg-blue-500' }) {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    
    return (
        <div className="flex items-end gap-1" style={{ height }}>
            {data.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                    <div 
                        className={`w-full ${barColor} rounded-t transition-all duration-300`}
                        style={{ height: `${(item.value / maxValue) * 100}%`, minHeight: item.value > 0 ? 4 : 0 }}
                        title={`${item.label}: ${item.value}`}
                    />
                    <span className="text-xs text-gray-500 mt-1 truncate w-full text-center">{item.label}</span>
                </div>
            ))}
        </div>
    );
}

// ===== PROJECT STATUS CARD =====
function ProjectStatusCard({ project, modules }) {
    const totalModules = modules.length;
    const completedModules = modules.filter(m => {
        const progress = m.stageProgress || {};
        return progress['close-up'] === 100;
    }).length;
    
    const avgProgress = modules.reduce((sum, m) => {
        const progress = m.stageProgress || {};
        const stageValues = Object.values(progress);
        return sum + (stageValues.length > 0 ? stageValues.reduce((a, b) => a + b, 0) / stageValues.length : 0);
    }, 0) / Math.max(totalModules, 1);
    
    const inProductionCount = modules.filter(m => {
        const progress = m.stageProgress || {};
        const hasStarted = Object.values(progress).some(v => v > 0);
        const isComplete = progress['close-up'] === 100;
        return hasStarted && !isComplete;
    }).length;

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h4 className="font-semibold text-gray-900">{project.name}</h4>
                    <p className="text-sm text-gray-500">{project.client || 'No client'}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    project.status === 'Active' ? 'bg-green-100 text-green-700' :
                    project.status === 'On Hold' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                }`}>
                    {project.status}
                </span>
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-center mb-3">
                <div>
                    <p className="text-2xl font-bold text-gray-900">{totalModules}</p>
                    <p className="text-xs text-gray-500">Total</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-blue-600">{inProductionCount}</p>
                    <p className="text-xs text-gray-500">In Progress</p>
                </div>
                <div>
                    <p className="text-2xl font-bold text-green-600">{completedModules}</p>
                    <p className="text-xs text-gray-500">Complete</p>
                </div>
            </div>
            
            <div className="space-y-1">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Overall Progress</span>
                    <span className={`font-semibold ${getHealthColor(avgProgress)}`}>{formatPercent(avgProgress, 0)}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${getHealthBgColor(avgProgress)} transition-all`}
                        style={{ width: `${avgProgress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

// ===== BOTTLENECK ALERT COMPONENT =====
function BottleneckAlert({ station, count, severity }) {
    const severityColors = {
        high: 'bg-red-50 border-red-300 text-red-800',
        medium: 'bg-yellow-50 border-yellow-300 text-yellow-800',
        low: 'bg-blue-50 border-blue-300 text-blue-800'
    };
    
    const severityIcons = {
        high: '🔴',
        medium: '🟡',
        low: '🔵'
    };

    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${severityColors[severity]}`}>
            <span className="text-lg">{severityIcons[severity]}</span>
            <div className="flex-1">
                <p className="font-medium">{station}</p>
                <p className="text-sm opacity-80">{count} modules queued</p>
            </div>
        </div>
    );
}

// ===== MAIN EXECUTIVE BOARD COMPONENT =====
function ExecutiveBoard({ projects: externalProjects, employees: externalEmployees }) {
    // Load data from localStorage if not provided externally
    const [projects, setProjects] = useState(() => {
        if (externalProjects) return externalProjects;
        const saved = localStorage.getItem('autovol_projects');
        if (saved && saved !== 'undefined' && saved !== 'null') {
            try { return JSON.parse(saved); } catch (e) { return []; }
        }
        return [];
    });
    
    const [employees, setEmployees] = useState(() => {
        if (externalEmployees) return externalEmployees;
        const saved = localStorage.getItem('autovol_employees');
        if (saved && saved !== 'undefined' && saved !== 'null') {
            try { return JSON.parse(saved); } catch (e) { return []; }
        }
        return [];
    });

    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Auto-refresh data every 5 minutes
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => {
            const savedProjects = localStorage.getItem('autovol_projects');
            const savedEmployees = localStorage.getItem('autovol_employees');
            if (savedProjects && savedProjects !== 'undefined' && savedProjects !== 'null') {
                try { setProjects(JSON.parse(savedProjects)); } catch (e) { /* ignore */ }
            }
            if (savedEmployees && savedEmployees !== 'undefined' && savedEmployees !== 'null') {
                try { setEmployees(JSON.parse(savedEmployees)); } catch (e) { /* ignore */ }
            }
            setLastRefresh(new Date());
        }, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [autoRefresh]);

    // ===== COMPUTED METRICS =====
    const metrics = useMemo(() => {
        const activeProjects = projects.filter(p => p.status === 'Active');
        const allModules = projects.flatMap(p => (p.modules || []).map(m => ({ ...m, projectId: p.id, projectName: p.name })));
        const activeModules = activeProjects.flatMap(p => (p.modules || []).map(m => ({ ...m, projectId: p.id, projectName: p.name })));
        
        // Module counts
        const totalModules = allModules.length;
        const completedModules = allModules.filter(m => m.stageProgress?.['close-up'] === 100).length;
        const inProgressModules = allModules.filter(m => {
            const progress = m.stageProgress || {};
            const hasStarted = Object.values(progress).some(v => v > 0);
            const isComplete = progress['close-up'] === 100;
            return hasStarted && !isComplete;
        }).length;
        const notStartedModules = totalModules - completedModules - inProgressModules;
        
        // Overall completion rate
        const overallCompletion = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
        
        // Average progress across all modules
        const avgProgress = allModules.reduce((sum, m) => {
            const progress = m.stageProgress || {};
            const stageValues = Object.values(progress);
            return sum + (stageValues.length > 0 ? stageValues.reduce((a, b) => a + b, 0) / stageValues.length : 0);
        }, 0) / Math.max(totalModules, 1);
        
        // Station workload analysis
        const stationWorkload = {};
        PRODUCTION_STAGES.forEach(stage => {
            stationWorkload[stage.id] = {
                name: stage.name,
                dept: stage.dept,
                inProgress: 0,
                completed: 0,
                queued: 0
            };
        });
        
        activeModules.forEach(module => {
            const progress = module.stageProgress || {};
            PRODUCTION_STAGES.forEach((stage, idx) => {
                const stageProgress = progress[stage.id] || 0;
                if (stageProgress > 0 && stageProgress < 100) {
                    stationWorkload[stage.id].inProgress++;
                } else if (stageProgress === 100) {
                    stationWorkload[stage.id].completed++;
                } else if (idx > 0) {
                    // Check if previous stage is complete (queued for this stage)
                    const prevStage = PRODUCTION_STAGES[idx - 1];
                    const prevProgress = progress[prevStage.id] || 0;
                    if (prevProgress === 100) {
                        stationWorkload[stage.id].queued++;
                    }
                }
            });
        });
        
        // Identify bottlenecks (stations with high queue)
        const bottlenecks = Object.entries(stationWorkload)
            .filter(([_, data]) => data.queued > 3)
            .map(([id, data]) => ({
                id,
                name: data.name,
                count: data.queued,
                severity: data.queued > 10 ? 'high' : data.queued > 5 ? 'medium' : 'low'
            }))
            .sort((a, b) => b.count - a.count);
        
        // Weekly throughput (simulated - would come from historical data)
        const weeklyData = [
            { label: 'W1', value: Math.floor(Math.random() * 10) + 15 },
            { label: 'W2', value: Math.floor(Math.random() * 10) + 15 },
            { label: 'W3', value: Math.floor(Math.random() * 10) + 15 },
            { label: 'W4', value: Math.floor(Math.random() * 10) + 15 },
            { label: 'This', value: completedModules > 0 ? completedModules : Math.floor(Math.random() * 5) + 18 }
        ];
        
        // Employee metrics
        const activeEmployees = employees.filter(e => e.status === 'Active' || !e.status).length;
        const totalEmployees = employees.length;
        
        // Calculate production health score (0-100)
        const healthFactors = {
            completion: overallCompletion * 0.3,
            progress: avgProgress * 0.3,
            bottleneckPenalty: Math.max(0, 20 - bottlenecks.length * 5),
            activeProjects: Math.min(activeProjects.length * 10, 20)
        };
        const healthScore = Object.values(healthFactors).reduce((a, b) => a + b, 0);
        
        return {
            activeProjects,
            totalProjects: projects.length,
            totalModules,
            completedModules,
            inProgressModules,
            notStartedModules,
            overallCompletion,
            avgProgress,
            stationWorkload,
            bottlenecks,
            weeklyData,
            activeEmployees,
            totalEmployees,
            healthScore,
            allModules
        };
    }, [projects, employees]);

    // Manual refresh
    const handleRefresh = () => {
        const savedProjects = localStorage.getItem('autovol_projects');
        const savedEmployees = localStorage.getItem('autovol_employees');
        if (savedProjects && savedProjects !== 'undefined' && savedProjects !== 'null') {
            try { setProjects(JSON.parse(savedProjects)); } catch (e) { /* ignore */ }
        }
        if (savedEmployees && savedEmployees !== 'undefined' && savedEmployees !== 'null') {
            try { setEmployees(JSON.parse(savedEmployees)); } catch (e) { /* ignore */ }
        }
        setLastRefresh(new Date());
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center font-bold text-xl">
                                A
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Executive Board</h1>
                                <p className="text-slate-400 text-sm">Autovol Operations Overview</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right text-sm">
                                <p className="text-slate-400">Last updated</p>
                                <p className="font-medium">{lastRefresh.toLocaleTimeString()}</p>
                            </div>
                            <button 
                                onClick={handleRefresh}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <span>↻</span> Refresh
                            </button>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={autoRefresh} 
                                    onChange={(e) => setAutoRefresh(e.target.checked)}
                                    className="w-4 h-4 rounded"
                                />
                                <span className="text-sm">Auto</span>
                            </label>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                {/* Health Score Banner */}
                <div className={`rounded-xl p-6 text-white ${
                    metrics.healthScore >= 70 ? 'bg-gradient-to-r from-green-600 to-green-700' :
                    metrics.healthScore >= 50 ? 'bg-gradient-to-r from-yellow-600 to-yellow-700' :
                    'bg-gradient-to-r from-red-600 to-red-700'
                }`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-medium opacity-90">Operations Health Score</h2>
                            <p className="text-5xl font-bold mt-1">{metrics.healthScore.toFixed(0)}</p>
                            <p className="text-sm opacity-80 mt-1">
                                {metrics.healthScore >= 70 ? 'Operations running smoothly' :
                                 metrics.healthScore >= 50 ? 'Some areas need attention' :
                                 'Critical issues require immediate attention'}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-6xl opacity-30">
                                {metrics.healthScore >= 70 ? '✓' : metrics.healthScore >= 50 ? '⚠' : '⚡'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Primary KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard 
                        title="Active Projects"
                        value={metrics.activeProjects.length}
                        subtitle={`${metrics.totalProjects} total projects`}
                        icon="📋"
                        color="blue"
                    />
                    <KPICard 
                        title="Modules in Production"
                        value={metrics.inProgressModules}
                        subtitle={`${metrics.totalModules} total modules`}
                        icon="🏭"
                        color="purple"
                    />
                    <KPICard 
                        title="Completed Modules"
                        value={metrics.completedModules}
                        subtitle={formatPercent(metrics.overallCompletion, 0) + ' completion rate'}
                        icon="✅"
                        color="green"
                    />
                    <KPICard 
                        title="Active Workforce"
                        value={metrics.activeEmployees}
                        subtitle={`${metrics.totalEmployees} total employees`}
                        icon="👥"
                        color="teal"
                    />
                </div>

                {/* Secondary Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Production Progress */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Production Progress Overview</h3>
                        <div className="space-y-4">
                            <HealthIndicator label="Overall Progress" value={metrics.avgProgress} />
                            <HealthIndicator label="Completion Rate" value={metrics.overallCompletion} />
                            <HealthIndicator 
                                label="Modules Started" 
                                value={metrics.inProgressModules + metrics.completedModules} 
                                maxValue={metrics.totalModules}
                            />
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h4 className="text-sm font-medium text-gray-600 mb-3">Weekly Throughput</h4>
                            <MiniBarChart data={metrics.weeklyData} height={80} barColor="bg-blue-500" />
                        </div>
                    </div>

                    {/* Bottlenecks & Alerts */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Bottlenecks & Alerts
                            {metrics.bottlenecks.length > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                                    {metrics.bottlenecks.length}
                                </span>
                            )}
                        </h3>
                        {metrics.bottlenecks.length > 0 ? (
                            <div className="space-y-3">
                                {metrics.bottlenecks.slice(0, 5).map(bottleneck => (
                                    <BottleneckAlert 
                                        key={bottleneck.id}
                                        station={bottleneck.name}
                                        count={bottleneck.count}
                                        severity={bottleneck.severity}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <span className="text-4xl">✓</span>
                                <p className="mt-2">No bottlenecks detected</p>
                                <p className="text-sm">Production is flowing smoothly</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Module Status Breakdown */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Module Status Distribution</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-8 bg-gray-200 rounded-full overflow-hidden flex">
                            {metrics.completedModules > 0 && (
                                <div 
                                    className="bg-green-500 h-full transition-all"
                                    style={{ width: `${(metrics.completedModules / metrics.totalModules) * 100}%` }}
                                    title={`Completed: ${metrics.completedModules}`}
                                />
                            )}
                            {metrics.inProgressModules > 0 && (
                                <div 
                                    className="bg-blue-500 h-full transition-all"
                                    style={{ width: `${(metrics.inProgressModules / metrics.totalModules) * 100}%` }}
                                    title={`In Progress: ${metrics.inProgressModules}`}
                                />
                            )}
                            {metrics.notStartedModules > 0 && (
                                <div 
                                    className="bg-gray-400 h-full transition-all"
                                    style={{ width: `${(metrics.notStartedModules / metrics.totalModules) * 100}%` }}
                                    title={`Not Started: ${metrics.notStartedModules}`}
                                />
                            )}
                        </div>
                    </div>
                    <div className="flex justify-center gap-8 mt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-500 rounded"></div>
                            <span className="text-sm text-gray-600">Completed ({metrics.completedModules})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-500 rounded"></div>
                            <span className="text-sm text-gray-600">In Progress ({metrics.inProgressModules})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-gray-400 rounded"></div>
                            <span className="text-sm text-gray-600">Not Started ({metrics.notStartedModules})</span>
                        </div>
                    </div>
                </div>

                {/* Active Projects Grid */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Projects</h3>
                    {metrics.activeProjects.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {metrics.activeProjects.map(project => (
                                <ProjectStatusCard 
                                    key={project.id}
                                    project={project}
                                    modules={project.modules || []}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <span className="text-4xl">📋</span>
                            <p className="mt-2">No active projects</p>
                        </div>
                    )}
                </div>

                {/* Station Workload Summary */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Station Workload Summary</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-2 px-3 font-medium text-gray-600">Station</th>
                                    <th className="text-center py-2 px-3 font-medium text-gray-600">Dept</th>
                                    <th className="text-center py-2 px-3 font-medium text-gray-600">In Progress</th>
                                    <th className="text-center py-2 px-3 font-medium text-gray-600">Queued</th>
                                    <th className="text-center py-2 px-3 font-medium text-gray-600">Completed</th>
                                    <th className="text-center py-2 px-3 font-medium text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {PRODUCTION_STAGES.slice(0, 10).map((stage, idx) => {
                                    const workload = metrics.stationWorkload[stage.id];
                                    const isBottleneck = workload.queued > 3;
                                    return (
                                        <tr key={stage.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-gray-50' : ''}`}>
                                            <td className="py-2 px-3 font-medium">{stage.name}</td>
                                            <td className="py-2 px-3 text-center text-gray-500 font-mono text-xs">{stage.dept}</td>
                                            <td className="py-2 px-3 text-center">
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                    {workload.inProgress}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    isBottleneck ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {workload.queued}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                    {workload.completed}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                {isBottleneck ? (
                                                    <span className="text-red-600">⚠ Bottleneck</span>
                                                ) : workload.inProgress > 0 ? (
                                                    <span className="text-green-600">✓ Active</span>
                                                ) : (
                                                    <span className="text-gray-400">— Idle</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {PRODUCTION_STAGES.length > 10 && (
                        <p className="text-sm text-gray-500 mt-3 text-center">
                            Showing 10 of {PRODUCTION_STAGES.length} stations
                        </p>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-slate-800 text-slate-400 py-4 mt-8">
                <div className="max-w-7xl mx-auto px-6 text-center text-sm">
                    <p>Autovol MODA Executive Board • Data refreshes automatically every 5 minutes</p>
                </div>
            </footer>
        </div>
    );
}

// Export for use in standalone page
window.ExecutiveBoard = ExecutiveBoard;
