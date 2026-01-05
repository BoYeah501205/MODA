// ============================================================================
// REPORTS HUB COMPONENT
// Central hub for all production reports in the Reports sub-tab
// ============================================================================

const { useState, useMemo } = React;

// Format date for display
const formatWeekDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Report type definitions
const REPORT_TYPES = {
    HEAT_MAP: 'heat-map',
    WEEKLY_BOARD_PRINT: 'weekly-board-print',
    WEEKLY_BOARD_MANAGEMENT: 'weekly-board-management'
};

// Report card component
function ReportCard({ 
    title, 
    description, 
    icon, 
    iconBgColor = 'bg-autovol-teal',
    status = 'active', // 'active', 'coming-soon', 'planned'
    onClick 
}) {
    const isActive = status === 'active';
    
    return (
        <div 
            className={`border-2 rounded-lg p-6 transition-all ${
                isActive 
                    ? 'border-gray-200 hover:border-autovol-teal hover:shadow-md cursor-pointer bg-white' 
                    : 'border-dashed border-gray-300 bg-gray-50/50'
            }`}
            onClick={isActive ? onClick : undefined}
        >
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 ${isActive ? iconBgColor : 'bg-gray-300'} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold ${isActive ? 'text-autovol-navy' : 'text-gray-500'}`}>
                        {title}
                    </h4>
                    <p className={`text-sm mt-1 ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                        {description}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                        {status === 'coming-soon' && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">Coming Soon</span>
                        )}
                        {status === 'planned' && (
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-xs rounded-full">Planned</span>
                        )}
                        {isActive && (
                            <span className="text-autovol-teal text-sm font-medium flex items-center gap-1">
                                Open Report
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Week selector component for reports
function WeekSelector({ 
    weeks, 
    currentWeek, 
    selectedWeekId, 
    onSelectWeek,
    completedWeeks = []
}) {
    // Build list of available weeks
    const availableWeeks = useMemo(() => {
        const weekList = [];
        
        // Current week
        if (currentWeek) {
            weekList.push({
                id: 'current',
                label: 'Current Week',
                weekStart: currentWeek.weekStart,
                weekEnd: currentWeek.weekEnd,
                isCurrent: true
            });
        }
        
        // Previous week (one week before current)
        if (currentWeek?.weekStart) {
            const prevStart = new Date(currentWeek.weekStart);
            prevStart.setDate(prevStart.getDate() - 7);
            const prevEnd = new Date(prevStart);
            prevEnd.setDate(prevEnd.getDate() + 6);
            
            weekList.push({
                id: 'previous',
                label: 'Previous Week',
                weekStart: prevStart.toISOString().split('T')[0],
                weekEnd: prevEnd.toISOString().split('T')[0],
                isPrevious: true
            });
        }
        
        // Completed weeks from history
        if (completedWeeks && completedWeeks.length > 0) {
            completedWeeks.forEach(w => {
                // Skip if it matches current or previous
                if (w.weekId === 'current' || w.weekId === 'previous') return;
                
                weekList.push({
                    id: w.id || w.weekId,
                    label: `Week of ${formatWeekDate(w.weekStart || w.scheduleSnapshot?.weekStart)}`,
                    weekStart: w.weekStart || w.scheduleSnapshot?.weekStart,
                    weekEnd: w.weekEnd || w.scheduleSnapshot?.weekEnd,
                    isCompleted: true,
                    completedAt: w.completedAt
                });
            });
        }
        
        return weekList;
    }, [currentWeek, completedWeeks]);
    
    const selectedWeek = availableWeeks.find(w => w.id === selectedWeekId) || availableWeeks[0];
    
    return (
        <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Week:</label>
            <select
                value={selectedWeekId || 'current'}
                onChange={(e) => onSelectWeek(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm bg-white"
            >
                {availableWeeks.map(week => (
                    <option key={week.id} value={week.id}>
                        {week.label}
                        {week.weekStart && ` (${formatWeekDate(week.weekStart)} - ${formatWeekDate(week.weekEnd)})`}
                    </option>
                ))}
            </select>
        </div>
    );
}

// Main Reports Hub component
function ReportsHub({
    projects,
    productionStages,
    weeks,
    currentWeek,
    completedWeeks = [],
    scheduleSetup,
    staggerConfig,
    lineBalance
}) {
    const [activeReport, setActiveReport] = useState(null);
    const [selectedWeekId, setSelectedWeekId] = useState('current');
    
    // Get all modules sorted by build sequence
    const allModules = useMemo(() => {
        const activeProjects = (projects || [])
            .filter(p => p.status === 'Active')
            .sort((a, b) => (a.productionOrder || 999) - (b.productionOrder || 999));
        
        return activeProjects.flatMap(p => 
            (p.modules || []).map(m => ({
                ...m,
                projectId: p.id,
                projectName: p.name
            }))
        ).sort((a, b) => (a.buildSequence || 0) - (b.buildSequence || 0));
    }, [projects]);
    
    // Get active projects
    const activeProjects = useMemo(() => 
        (projects || []).filter(p => p.status === 'Active'),
        [projects]
    );
    
    // Handle report selection
    const handleOpenReport = (reportType) => {
        setActiveReport(reportType);
    };
    
    // Handle back to hub
    const handleBackToHub = () => {
        setActiveReport(null);
    };
    
    // Render active report
    if (activeReport === REPORT_TYPES.HEAT_MAP) {
        return (
            <div className="space-y-4">
                <button
                    onClick={handleBackToHub}
                    className="flex items-center gap-2 text-gray-600 hover:text-autovol-navy text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Reports
                </button>
                
                {window.WeeklyHeatMapReport ? (
                    <window.WeeklyHeatMapReport
                        projects={projects}
                        productionStages={productionStages}
                        weeks={weeks}
                        currentWeek={currentWeek}
                    />
                ) : (
                    <div className="p-8 text-center text-gray-500">Loading Heat Map Report...</div>
                )}
            </div>
        );
    }
    
    if (activeReport === REPORT_TYPES.WEEKLY_BOARD_PRINT) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <button
                        onClick={handleBackToHub}
                        className="flex items-center gap-2 text-gray-600 hover:text-autovol-navy text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Reports
                    </button>
                    
                    <WeekSelector
                        weeks={weeks}
                        currentWeek={currentWeek}
                        selectedWeekId={selectedWeekId}
                        onSelectWeek={setSelectedWeekId}
                        completedWeeks={completedWeeks}
                    />
                </div>
                
                {window.WeeklyBoardPrintReport ? (
                    <window.WeeklyBoardPrintReport
                        projects={projects}
                        productionStages={productionStages}
                        currentWeek={currentWeek}
                        selectedWeekId={selectedWeekId}
                        completedWeeks={completedWeeks}
                        scheduleSetup={scheduleSetup}
                        staggerConfig={staggerConfig}
                        allModules={allModules}
                        activeProjects={activeProjects}
                        lineBalance={lineBalance}
                    />
                ) : (
                    <div className="p-8 text-center text-gray-500">Loading Print Report...</div>
                )}
            </div>
        );
    }
    
    if (activeReport === REPORT_TYPES.WEEKLY_BOARD_MANAGEMENT) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <button
                        onClick={handleBackToHub}
                        className="flex items-center gap-2 text-gray-600 hover:text-autovol-navy text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Reports
                    </button>
                    
                    <WeekSelector
                        weeks={weeks}
                        currentWeek={currentWeek}
                        selectedWeekId={selectedWeekId}
                        onSelectWeek={setSelectedWeekId}
                        completedWeeks={completedWeeks}
                    />
                </div>
                
                {window.WeeklyBoardManagementReport ? (
                    <window.WeeklyBoardManagementReport
                        projects={projects}
                        productionStages={productionStages}
                        currentWeek={currentWeek}
                        selectedWeekId={selectedWeekId}
                        completedWeeks={completedWeeks}
                        scheduleSetup={scheduleSetup}
                        staggerConfig={staggerConfig}
                        allModules={allModules}
                        activeProjects={activeProjects}
                        lineBalance={lineBalance}
                    />
                ) : (
                    <div className="p-8 text-center text-gray-500">Loading Management Report...</div>
                )}
            </div>
        );
    }
    
    // Render report hub (default view)
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-autovol-navy">Production Reports</h3>
                    <p className="text-sm text-gray-500">Analytics, schedules, and labor planning reports</p>
                </div>
            </div>
            
            {/* Report Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Weekly Heat Map Report */}
                <ReportCard
                    title="Weekly Heat Map Report"
                    description="View module difficulty by station per day. Plan labor adjustments based on workload intensity."
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    }
                    iconBgColor="bg-autovol-teal"
                    status="active"
                    onClick={() => handleOpenReport(REPORT_TYPES.HEAT_MAP)}
                />
                
                {/* Weekly Board Print Report */}
                <ReportCard
                    title="Weekly Board - Print Version"
                    description="11x17 tabloid format for floor distribution. Detailed module view with station progress, color-coded status."
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                    }
                    iconBgColor="bg-purple-600"
                    status="active"
                    onClick={() => handleOpenReport(REPORT_TYPES.WEEKLY_BOARD_PRINT)}
                />
                
                {/* Weekly Board Management Report */}
                <ReportCard
                    title="Weekly Board - Management Summary"
                    description="Track production against daily goals. Orange line shows target progress by end of shift."
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    }
                    iconBgColor="bg-orange-500"
                    status="active"
                    onClick={() => handleOpenReport(REPORT_TYPES.WEEKLY_BOARD_MANAGEMENT)}
                />
                
                {/* Labor Allocation - Planned */}
                <ReportCard
                    title="Labor Allocation"
                    description="AI-powered staffing recommendations by department based on workload."
                    icon={
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    }
                    status="planned"
                />
            </div>
            
            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                <strong>Tip:</strong> Select a report to view it. Weekly Board reports allow you to choose current, previous, or any completed week from history.
            </div>
        </div>
    );
}

// Export for use in App.jsx
window.ReportsHub = ReportsHub;
