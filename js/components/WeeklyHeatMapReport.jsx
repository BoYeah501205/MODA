/**
 * WeeklyHeatMapReport Component
 * Shows module difficulty by station per day for labor planning
 * Layout: Stations as rows, Days as columns
 * Scoring: Easy=-1, Average=0, Medium=+1, Hard=+1, Very Hard=+2
 */

const { useState, useEffect, useMemo } = React;

// Difficulty score mapping
const DIFFICULTY_SCORES = {
    easy: -1,
    average: 0,
    medium: 1,
    hard: 1,
    very_hard: 2
};

// Get color class based on aggregate score
const getScoreColor = (score, moduleCount) => {
    if (moduleCount === 0) return 'bg-gray-100 text-gray-400';
    const avgScore = score / moduleCount;
    if (avgScore <= -0.5) return 'bg-green-100 text-green-800 border-green-300';
    if (avgScore <= 0.25) return 'bg-gray-100 text-gray-800 border-gray-300';
    if (avgScore <= 0.75) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (avgScore <= 1.25) return 'bg-orange-100 text-orange-800 border-orange-300';
    return 'bg-red-100 text-red-800 border-red-300';
};

// Get intensity label
const getIntensityLabel = (score, moduleCount) => {
    if (moduleCount === 0) return 'No modules';
    const avgScore = score / moduleCount;
    if (avgScore <= -0.5) return 'Light';
    if (avgScore <= 0.25) return 'Normal';
    if (avgScore <= 0.75) return 'Moderate';
    if (avgScore <= 1.25) return 'Heavy';
    return 'Very Heavy';
};

function WeeklyHeatMapReport({ 
    projects,
    productionStages,
    weeks,
    currentWeek,
    onClose
}) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [heatMapData, setHeatMapData] = useState({});
    const [indicators, setIndicators] = useState([]);
    const [showNextWeek, setShowNextWeek] = useState(false);
    const [selectedProject, setSelectedProject] = useState('all');
    
    // Get active projects
    const activeProjects = projects.filter(p => p.status === 'Active');
    
    // Calculate week dates
    const getWeekDates = (weekOffset = 0) => {
        const today = new Date();
        const currentMonday = new Date(today);
        const day = currentMonday.getDay();
        currentMonday.setDate(currentMonday.getDate() - day + (day === 0 ? -6 : 1) + (weekOffset * 7));
        
        const dates = [];
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(currentMonday);
            date.setDate(currentMonday.getDate() + i);
            dates.push({
                dayName: dayNames[i],
                date: date,
                dateStr: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                isWeekend: i >= 4
            });
        }
        return dates;
    };
    
    const currentWeekDates = getWeekDates(0);
    const nextWeekDates = getWeekDates(1);
    const displayDates = showNextWeek ? nextWeekDates : currentWeekDates;
    
    // Load heat map data for all active projects
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const api = window.HeatMapAPI;
                if (!api) {
                    throw new Error('HeatMapAPI not loaded');
                }
                
                // Load indicators
                const indicatorsData = await api.getDifficultyIndicators();
                setIndicators(indicatorsData);
                
                // Load heat map data for each active project
                const allHeatMapData = {};
                for (const project of activeProjects) {
                    const projectHeatMap = await api.getProjectHeatMap(project.id);
                    allHeatMapData[project.id] = projectHeatMap;
                }
                setHeatMapData(allHeatMapData);
                
            } catch (err) {
                console.error('Error loading report data:', err);
                setError('Failed to load report data');
            } finally {
                setLoading(false);
            }
        };
        
        loadData();
    }, [activeProjects.length]);
    
    // Get modules scheduled for each day based on week configuration
    const getModulesForDay = (dayIndex, weekOffset = 0) => {
        // Get the target week configuration
        const targetWeek = weekOffset === 0 ? currentWeek : weeks?.find(w => {
            const weekStart = new Date(w.weekStart);
            const targetDate = new Date(displayDates[0].date);
            targetDate.setDate(targetDate.getDate() + (weekOffset * 7));
            return weekStart <= targetDate && new Date(w.weekEnd) >= targetDate;
        });
        
        if (!targetWeek) return [];
        
        // Get all modules from active projects sorted by production order
        const allModules = activeProjects
            .filter(p => selectedProject === 'all' || p.id === selectedProject)
            .sort((a, b) => (a.productionOrder || 999) - (b.productionOrder || 999))
            .flatMap(p => (p.modules || []).map(m => ({ 
                ...m, 
                projectId: p.id, 
                projectName: p.name 
            })));
        
        // Find starting module index
        const startingModule = targetWeek.startingModule;
        let startIdx = allModules.findIndex(m => m.serialNumber === startingModule);
        if (startIdx === -1) startIdx = 0;
        
        // Get daily targets from week config
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const shift1Days = ['monday', 'tuesday', 'wednesday', 'thursday'];
        const shift2Days = ['friday', 'saturday', 'sunday'];
        
        const dayName = dayNames[dayIndex];
        let dailyTarget = 0;
        
        if (shift1Days.includes(dayName)) {
            dailyTarget = targetWeek.shift1?.[dayName] || 0;
        } else {
            dailyTarget = targetWeek.shift2?.[dayName] || 0;
        }
        
        if (dailyTarget === 0) return [];
        
        // Calculate cumulative modules before this day
        let cumulativeModules = 0;
        for (let i = 0; i < dayIndex; i++) {
            const prevDayName = dayNames[i];
            if (shift1Days.includes(prevDayName)) {
                cumulativeModules += targetWeek.shift1?.[prevDayName] || 0;
            } else {
                cumulativeModules += targetWeek.shift2?.[prevDayName] || 0;
            }
        }
        
        // Get modules for this day
        const dayStartIdx = startIdx + cumulativeModules;
        return allModules.slice(dayStartIdx, dayStartIdx + dailyTarget);
    };
    
    // Calculate difficulty score for a station on a specific day
    const calculateStationDayScore = (stationId, dayIndex) => {
        const modules = getModulesForDay(dayIndex, showNextWeek ? 1 : 0);
        
        if (modules.length === 0) {
            return { score: 0, moduleCount: 0, details: [] };
        }
        
        let totalScore = 0;
        const details = [];
        
        modules.forEach(module => {
            const projectHeatMap = heatMapData[module.projectId] || [];
            let moduleScore = 0;
            const moduleIndicators = [];
            
            // Check each indicator for this module's project
            indicators.forEach(indicator => {
                const entry = projectHeatMap.find(
                    e => e.difficulty_indicator_id === indicator.id && e.station_id === stationId
                );
                
                if (entry) {
                    const score = DIFFICULTY_SCORES[entry.difficulty_category] || 0;
                    if (score !== 0) {
                        moduleScore += score;
                        moduleIndicators.push({
                            name: indicator.name,
                            category: entry.difficulty_category,
                            score
                        });
                    }
                }
            });
            
            totalScore += moduleScore;
            if (moduleIndicators.length > 0) {
                details.push({
                    serial: module.serialNumber,
                    score: moduleScore,
                    indicators: moduleIndicators
                });
            }
        });
        
        return { score: totalScore, moduleCount: modules.length, details };
    };
    
    // Build report data matrix
    const reportData = useMemo(() => {
        if (loading || indicators.length === 0) return [];
        
        return productionStages.map(station => {
            const dayScores = displayDates.map((_, dayIndex) => 
                calculateStationDayScore(station.id, dayIndex)
            );
            
            const weekTotal = dayScores.reduce((sum, d) => sum + d.score, 0);
            const weekModules = dayScores.reduce((sum, d) => sum + d.moduleCount, 0);
            
            return {
                station,
                dayScores,
                weekTotal,
                weekModules
            };
        });
    }, [loading, indicators, heatMapData, productionStages, displayDates, selectedProject, showNextWeek]);
    
    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Station', ...displayDates.map(d => `${d.dayName} ${d.dateStr}`), 'Week Total', 'Avg Intensity'];
        const rows = reportData.map(row => [
            row.station.name,
            ...row.dayScores.map(d => d.moduleCount > 0 ? `${d.score} (${d.moduleCount} modules)` : '-'),
            row.weekTotal,
            row.weekModules > 0 ? getIntensityLabel(row.weekTotal, row.weekModules) : '-'
        ]);
        
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `weekly-heat-map-report-${showNextWeek ? 'next' : 'current'}-week.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };
    
    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-autovol-teal border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading report data...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-600">{error}</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-autovol-navy">Weekly Heat Map Report</h3>
                    <p className="text-sm text-gray-500">
                        {showNextWeek ? 'Next Week' : 'Current Week'}: {displayDates[0].dateStr} - {displayDates[6].dateStr}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Project Filter */}
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="all">All Projects</option>
                        {activeProjects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    
                    {/* Week Toggle */}
                    <div className="flex rounded-lg border overflow-hidden">
                        <button
                            onClick={() => setShowNextWeek(false)}
                            className={`px-3 py-2 text-sm ${!showNextWeek ? 'bg-autovol-teal text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            This Week
                        </button>
                        <button
                            onClick={() => setShowNextWeek(true)}
                            className={`px-3 py-2 text-sm ${showNextWeek ? 'bg-autovol-teal text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            Next Week
                        </button>
                    </div>
                    
                    {/* Export */}
                    <button
                        onClick={exportToCSV}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export CSV
                    </button>
                </div>
            </div>
            
            {/* Legend */}
            <div className="flex items-center gap-4 text-sm">
                <span className="font-medium text-gray-700">Intensity:</span>
                <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 border border-green-300">Light</span>
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-300">Normal</span>
                <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">Moderate</span>
                <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-300">Heavy</span>
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300">Very Heavy</span>
            </div>
            
            {/* Report Table */}
            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="sticky left-0 bg-gray-100 border-r p-3 text-left text-sm font-semibold text-gray-700 min-w-[150px]">
                                Station
                            </th>
                            {displayDates.map((day, idx) => (
                                <th 
                                    key={idx}
                                    className={`p-3 text-center text-sm font-medium text-gray-700 min-w-[100px] ${day.isWeekend ? 'bg-gray-200' : ''}`}
                                >
                                    <div>{day.dayName}</div>
                                    <div className="text-xs text-gray-500">{day.dateStr}</div>
                                </th>
                            ))}
                            <th className="p-3 text-center text-sm font-semibold text-gray-700 min-w-[100px] bg-autovol-navy/10">
                                Week Total
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.map((row, rowIdx) => (
                            <tr key={row.station.id} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="sticky left-0 bg-inherit border-r p-3 text-sm font-medium text-gray-800">
                                    <div>{row.station.dept || row.station.name}</div>
                                    <div className="text-xs text-gray-500">{row.station.group}</div>
                                </td>
                                {row.dayScores.map((dayScore, dayIdx) => (
                                    <td 
                                        key={dayIdx}
                                        className={`p-2 text-center ${displayDates[dayIdx].isWeekend ? 'bg-gray-100/50' : ''}`}
                                    >
                                        {dayScore.moduleCount > 0 ? (
                                            <div className={`inline-block px-2 py-1 rounded border text-xs ${getScoreColor(dayScore.score, dayScore.moduleCount)}`}>
                                                <div className="font-semibold">{dayScore.score >= 0 ? '+' : ''}{dayScore.score}</div>
                                                <div className="text-[10px] opacity-75">{dayScore.moduleCount} mod</div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                ))}
                                <td className="p-2 text-center bg-autovol-navy/5">
                                    {row.weekModules > 0 ? (
                                        <div className={`inline-block px-3 py-1 rounded border text-sm font-semibold ${getScoreColor(row.weekTotal, row.weekModules)}`}>
                                            {row.weekTotal >= 0 ? '+' : ''}{row.weekTotal}
                                        </div>
                                    ) : (
                                        <span className="text-gray-300">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Heaviest Days */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-800 mb-2">Heaviest Days</h4>
                    <div className="space-y-1 text-sm">
                        {displayDates.map((day, idx) => {
                            const dayTotal = reportData.reduce((sum, row) => sum + row.dayScores[idx].score, 0);
                            const dayModules = reportData.reduce((sum, row) => sum + row.dayScores[idx].moduleCount, 0);
                            return { day, dayTotal, dayModules, idx };
                        })
                        .filter(d => d.dayModules > 0)
                        .sort((a, b) => b.dayTotal - a.dayTotal)
                        .slice(0, 3)
                        .map(d => (
                            <div key={d.idx} className="flex justify-between">
                                <span>{d.day.dayName} {d.day.dateStr}</span>
                                <span className="font-semibold text-orange-700">+{d.dayTotal}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Heaviest Stations */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 mb-2">Heaviest Stations</h4>
                    <div className="space-y-1 text-sm">
                        {[...reportData]
                            .filter(r => r.weekModules > 0)
                            .sort((a, b) => b.weekTotal - a.weekTotal)
                            .slice(0, 3)
                            .map(row => (
                                <div key={row.station.id} className="flex justify-between">
                                    <span>{row.station.dept || row.station.name}</span>
                                    <span className="font-semibold text-red-700">+{row.weekTotal}</span>
                                </div>
                            ))}
                    </div>
                </div>
                
                {/* Lightest Stations */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">Lightest Stations</h4>
                    <div className="space-y-1 text-sm">
                        {[...reportData]
                            .filter(r => r.weekModules > 0)
                            .sort((a, b) => a.weekTotal - b.weekTotal)
                            .slice(0, 3)
                            .map(row => (
                                <div key={row.station.id} className="flex justify-between">
                                    <span>{row.station.dept || row.station.name}</span>
                                    <span className="font-semibold text-green-700">{row.weekTotal >= 0 ? '+' : ''}{row.weekTotal}</span>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
            
            {/* Scoring Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                <strong>Scoring:</strong> Easy = -1, Average = 0, Medium = +1, Hard = +1, Very Hard = +2. 
                Scores are summed across all difficulty indicators for each module at each station.
                Higher positive scores indicate heavier workload requiring more labor.
            </div>
        </div>
    );
}

// Export for use in App.jsx
window.WeeklyHeatMapReport = WeeklyHeatMapReport;
