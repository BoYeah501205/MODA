// ============================================================================
// WEEKLY BOARD MANAGEMENT REPORT
// Management summary with daily goal tracking
// Orange line shows target progress by end of shift
// ============================================================================

const { useState, useMemo } = React;

// Format date for display
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Format date range
const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '';
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

// Get day name from index
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ABBREV = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Calculate what time of day we're at (for goal line positioning)
const getTimeOfDayProgress = () => {
    const now = new Date();
    const hour = now.getHours();
    // Assume shift runs 6am-3pm (9 hours)
    // Before 6am = 0%, After 3pm = 100%
    if (hour < 6) return 0;
    if (hour >= 15) return 100;
    return Math.round(((hour - 6) / 9) * 100);
};

// Get current day of week (0 = Monday, 6 = Sunday)
const getCurrentDayIndex = () => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday=0 to Monday=0 format
};

function WeeklyBoardManagementReport({
    projects,
    productionStages,
    currentWeek,
    selectedWeekId,
    completedWeeks,
    scheduleSetup,
    staggerConfig,
    allModules,
    activeProjects,
    lineBalance
}) {
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Get the week data based on selection
    const weekData = useMemo(() => {
        if (selectedWeekId === 'current' || !selectedWeekId) {
            return {
                weekStart: currentWeek?.weekStart,
                weekEnd: currentWeek?.weekEnd,
                startingModule: currentWeek?.startingModule,
                shift1: scheduleSetup?.shift1 || { monday: 5, tuesday: 5, wednesday: 5, thursday: 5 },
                shift2: scheduleSetup?.shift2 || { friday: 0, saturday: 0, sunday: 0 },
                isCurrent: true
            };
        }
        
        if (selectedWeekId === 'previous') {
            const prevStart = new Date(currentWeek?.weekStart);
            prevStart.setDate(prevStart.getDate() - 7);
            const prevEnd = new Date(prevStart);
            prevEnd.setDate(prevEnd.getDate() + 6);
            
            const completed = completedWeeks?.find(w => {
                const wStart = new Date(w.weekStart || w.scheduleSnapshot?.weekStart);
                return Math.abs(wStart - prevStart) < 86400000;
            });
            
            return {
                weekStart: prevStart.toISOString().split('T')[0],
                weekEnd: prevEnd.toISOString().split('T')[0],
                startingModule: completed?.scheduleSnapshot?.startingModule || currentWeek?.startingModule,
                shift1: completed?.shift1 || scheduleSetup?.shift1,
                shift2: completed?.shift2 || scheduleSetup?.shift2,
                isCurrent: false
            };
        }
        
        const completed = completedWeeks?.find(w => w.id === selectedWeekId || w.weekId === selectedWeekId);
        if (completed) {
            return {
                weekStart: completed.weekStart || completed.scheduleSnapshot?.weekStart,
                weekEnd: completed.weekEnd || completed.scheduleSnapshot?.weekEnd,
                startingModule: completed.scheduleSnapshot?.startingModule,
                shift1: completed.shift1,
                shift2: completed.shift2,
                isCurrent: false
            };
        }
        
        return { ...currentWeek, isCurrent: true };
    }, [selectedWeekId, currentWeek, completedWeeks, scheduleSetup]);
    
    // Calculate modules per day with progress tracking
    const dailyData = useMemo(() => {
        if (!weekData || !allModules?.length) return [];
        
        const startIdx = allModules.findIndex(m => m.serialNumber === weekData.startingModule);
        if (startIdx === -1) return [];
        
        const result = [];
        let currentIdx = startIdx;
        let cumulativeTarget = 0;
        let cumulativeComplete = 0;
        
        // Get week start date for calculating actual dates
        const weekStartDate = weekData.weekStart ? new Date(weekData.weekStart) : new Date();
        
        DAY_KEYS.forEach((day, dayIdx) => {
            const isShift1 = dayIdx < 4;
            const target = isShift1 
                ? (weekData.shift1?.[day] || 0)
                : (weekData.shift2?.[day] || 0);
            
            const modules = allModules.slice(currentIdx, currentIdx + target);
            currentIdx += target;
            
            // Calculate actual date for this day
            const dayDate = new Date(weekStartDate);
            dayDate.setDate(dayDate.getDate() + dayIdx);
            
            // Count completed modules (100% at final station or Sign-Off)
            const finalStation = productionStages?.[productionStages.length - 1];
            const signOffStation = productionStages?.find(s => 
                s.name?.toLowerCase() === 'sign-off' || s.id === 'sign-off'
            );
            const checkStation = signOffStation || finalStation;
            
            const completed = modules.filter(m => 
                (m.stageProgress?.[checkStation?.id] || 0) === 100
            ).length;
            
            const inProgress = modules.filter(m => {
                const progress = Object.values(m.stageProgress || {});
                return progress.some(p => p > 0) && (m.stageProgress?.[checkStation?.id] || 0) < 100;
            }).length;
            
            cumulativeTarget += target;
            cumulativeComplete += completed;
            
            result.push({
                day: DAY_NAMES[dayIdx],
                dayAbbrev: DAY_ABBREV[dayIdx],
                dayKey: day,
                dayIndex: dayIdx,
                date: dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                target,
                completed,
                inProgress,
                pending: target - completed - inProgress,
                cumulativeTarget,
                cumulativeComplete,
                modules,
                isShift1,
                completionRate: target > 0 ? Math.round((completed / target) * 100) : 0
            });
        });
        
        return result;
    }, [weekData, allModules, productionStages]);
    
    // Calculate overall stats
    const overallStats = useMemo(() => {
        const totalTarget = dailyData.reduce((sum, d) => sum + d.target, 0);
        const totalComplete = dailyData.reduce((sum, d) => sum + d.completed, 0);
        const totalInProgress = dailyData.reduce((sum, d) => sum + d.inProgress, 0);
        
        return {
            totalTarget,
            totalComplete,
            totalInProgress,
            totalPending: totalTarget - totalComplete - totalInProgress,
            overallRate: totalTarget > 0 ? Math.round((totalComplete / totalTarget) * 100) : 0
        };
    }, [dailyData]);
    
    // Current day for goal line (only for current week)
    const currentDayIndex = getCurrentDayIndex();
    const timeProgress = getTimeOfDayProgress();
    
    // Project breakdown
    const projectBreakdown = useMemo(() => {
        const breakdown = {};
        
        dailyData.forEach(day => {
            day.modules.forEach(module => {
                const projectName = module.projectName || 'Unknown';
                if (!breakdown[projectName]) {
                    breakdown[projectName] = { total: 0, complete: 0, inProgress: 0 };
                }
                breakdown[projectName].total++;
                
                const finalStation = productionStages?.[productionStages.length - 1];
                const signOffStation = productionStages?.find(s => 
                    s.name?.toLowerCase() === 'sign-off' || s.id === 'sign-off'
                );
                const checkStation = signOffStation || finalStation;
                const progress = module.stageProgress?.[checkStation?.id] || 0;
                
                if (progress === 100) {
                    breakdown[projectName].complete++;
                } else if (Object.values(module.stageProgress || {}).some(p => p > 0)) {
                    breakdown[projectName].inProgress++;
                }
            });
        });
        
        return Object.entries(breakdown).map(([name, data]) => ({
            name,
            ...data,
            rate: data.total > 0 ? Math.round((data.complete / data.total) * 100) : 0
        }));
    }, [dailyData, productionStages]);
    
    // Generate PDF
    const handleGeneratePDF = async () => {
        setIsGenerating(true);
        
        try {
            const { jsPDF } = window.jspdf;
            
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'letter'
            });
            
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margins = { top: 15, bottom: 15, left: 15, right: 15 };
            const contentWidth = pageWidth - margins.left - margins.right;
            
            let yPos = margins.top;
            
            // ===== HEADER =====
            doc.setFillColor(30, 41, 59);
            doc.rect(0, 0, pageWidth, 22, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Weekly Production Summary', margins.left, 11);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Week: ${formatDateRange(weekData?.weekStart, weekData?.weekEnd)}`, margins.left, 18);
            
            doc.setFontSize(9);
            doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margins.right, 11, { align: 'right' });
            doc.text(`Line Balance: ${lineBalance || overallStats.totalTarget}`, pageWidth - margins.right, 17, { align: 'right' });
            
            yPos = 28;
            
            // ===== SUMMARY BOXES =====
            const boxWidth = (contentWidth - 15) / 4;
            const boxHeight = 18;
            
            const summaryBoxes = [
                { label: 'Target', value: overallStats.totalTarget, color: [107, 114, 128] },
                { label: 'Completed', value: overallStats.totalComplete, color: [34, 197, 94] },
                { label: 'In Progress', value: overallStats.totalInProgress, color: [59, 130, 246] },
                { label: 'Completion Rate', value: `${overallStats.overallRate}%`, color: [13, 148, 136] }
            ];
            
            summaryBoxes.forEach((box, idx) => {
                const x = margins.left + (idx * (boxWidth + 5));
                
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(x, yPos, boxWidth, boxHeight, 2, 2, 'F');
                
                doc.setFontSize(8);
                doc.setTextColor(107, 114, 128);
                doc.text(box.label, x + 3, yPos + 5);
                
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...box.color);
                doc.text(String(box.value), x + 3, yPos + 14);
            });
            
            yPos += boxHeight + 8;
            
            // ===== DAILY PROGRESS TABLE =====
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Daily Production Tracking', margins.left, yPos);
            yPos += 4;
            
            const dailyTableData = dailyData.map((day, idx) => {
                const isCurrentDay = weekData.isCurrent && idx === currentDayIndex;
                return [
                    `${day.dayAbbrev} ${day.date}`,
                    day.target.toString(),
                    day.completed.toString(),
                    day.inProgress.toString(),
                    day.pending.toString(),
                    `${day.completionRate}%`,
                    day.cumulativeComplete.toString(),
                    day.cumulativeTarget.toString()
                ];
            });
            
            doc.autoTable({
                startY: yPos,
                head: [['Day', 'Target', 'Complete', 'In Progress', 'Pending', 'Rate', 'Cumul. Done', 'Cumul. Target']],
                body: dailyTableData,
                theme: 'striped',
                headStyles: {
                    fillColor: [13, 148, 136],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9
                },
                bodyStyles: {
                    fontSize: 9,
                    textColor: [30, 41, 59]
                },
                columnStyles: {
                    0: { cellWidth: 35, fontStyle: 'bold' },
                    1: { cellWidth: 20, halign: 'center' },
                    2: { cellWidth: 22, halign: 'center' },
                    3: { cellWidth: 25, halign: 'center' },
                    4: { cellWidth: 20, halign: 'center' },
                    5: { cellWidth: 20, halign: 'center' },
                    6: { cellWidth: 28, halign: 'center' },
                    7: { cellWidth: 28, halign: 'center' }
                },
                margin: { left: margins.left, right: margins.right },
                didParseCell: function(data) {
                    // Highlight current day row with orange border
                    if (data.section === 'body' && weekData.isCurrent && data.row.index === currentDayIndex) {
                        data.cell.styles.fillColor = [255, 237, 213]; // orange-100
                    }
                    
                    // Color completion rate
                    if (data.section === 'body' && data.column.index === 5) {
                        const rate = parseInt(data.cell.raw) || 0;
                        if (rate === 100) {
                            data.cell.styles.textColor = [22, 101, 52];
                            data.cell.styles.fontStyle = 'bold';
                        } else if (rate >= 50) {
                            data.cell.styles.textColor = [13, 148, 136];
                        } else if (rate > 0) {
                            data.cell.styles.textColor = [234, 88, 12];
                        }
                    }
                    
                    // Color completed column
                    if (data.section === 'body' && data.column.index === 2) {
                        const val = parseInt(data.cell.raw) || 0;
                        if (val > 0) {
                            data.cell.styles.textColor = [22, 101, 52];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                },
                didDrawCell: function(data) {
                    // Draw orange goal line after current day
                    if (data.section === 'body' && weekData.isCurrent && data.row.index === currentDayIndex) {
                        const cellHeight = data.cell.height;
                        const lineY = data.cell.y + (cellHeight * (timeProgress / 100));
                        
                        // Only draw on first column
                        if (data.column.index === 0) {
                            doc.setDrawColor(249, 115, 22); // orange-500
                            doc.setLineWidth(0.8);
                            // Draw across entire row
                            const rowWidth = data.table.columns.reduce((sum, col) => sum + col.width, 0);
                            doc.line(data.cell.x, lineY, data.cell.x + rowWidth, lineY);
                        }
                    }
                }
            });
            
            yPos = doc.lastAutoTable.finalY + 8;
            
            // ===== PROJECT BREAKDOWN =====
            if (yPos < pageHeight - 60) {
                doc.setTextColor(30, 41, 59);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('Project Breakdown', margins.left, yPos);
                yPos += 4;
                
                const projectTableData = projectBreakdown.map(p => [
                    p.name,
                    p.total.toString(),
                    p.complete.toString(),
                    p.inProgress.toString(),
                    (p.total - p.complete - p.inProgress).toString(),
                    `${p.rate}%`
                ]);
                
                doc.autoTable({
                    startY: yPos,
                    head: [['Project', 'Total', 'Complete', 'In Progress', 'Pending', 'Rate']],
                    body: projectTableData,
                    theme: 'striped',
                    headStyles: {
                        fillColor: [30, 41, 59],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        fontSize: 9
                    },
                    bodyStyles: {
                        fontSize: 9
                    },
                    margin: { left: margins.left, right: margins.right }
                });
            }
            
            // ===== FOOTER =====
            const footerY = pageHeight - 10;
            doc.setDrawColor(229, 231, 235);
            doc.line(margins.left, footerY - 3, pageWidth - margins.right, footerY - 3);
            
            doc.setFontSize(8);
            doc.setTextColor(107, 114, 128);
            doc.text('Autovol - Weekly Production Summary', margins.left, footerY);
            doc.text('Management Report - Confidential', pageWidth / 2, footerY, { align: 'center' });
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margins.right, footerY, { align: 'right' });
            
            // Add legend for orange line
            if (weekData.isCurrent) {
                doc.setFontSize(7);
                doc.setTextColor(249, 115, 22);
                doc.text('Orange line indicates current time progress through shift', margins.left, footerY - 6);
            }
            
            // Save
            const weekStr = weekData?.weekStart?.replace(/-/g, '') || 'unknown';
            doc.save(`Weekly_Management_Report_${weekStr}.pdf`);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };
    
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-autovol-navy">Weekly Board - Management Summary</h3>
                    <p className="text-sm text-gray-500">
                        {formatDateRange(weekData?.weekStart, weekData?.weekEnd)}
                        {weekData?.isCurrent && ' (Current Week)'}
                    </p>
                </div>
                <button
                    onClick={handleGeneratePDF}
                    disabled={isGenerating}
                    className="px-4 py-2 btn-primary rounded-lg text-sm font-medium flex items-center gap-2"
                >
                    {isGenerating ? (
                        <>
                            <span className="animate-spin">...</span>
                            Generating...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Export PDF
                        </>
                    )}
                </button>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Target</div>
                    <div className="text-2xl font-bold text-gray-700">{overallStats.totalTarget}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="text-xs text-green-600 uppercase tracking-wide">Completed</div>
                    <div className="text-2xl font-bold text-green-700">{overallStats.totalComplete}</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="text-xs text-blue-600 uppercase tracking-wide">In Progress</div>
                    <div className="text-2xl font-bold text-blue-700">{overallStats.totalInProgress}</div>
                </div>
                <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
                    <div className="text-xs text-teal-600 uppercase tracking-wide">Completion Rate</div>
                    <div className="text-2xl font-bold text-teal-700">{overallStats.overallRate}%</div>
                </div>
            </div>
            
            {/* Daily Progress Table */}
            <div className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                    <h4 className="font-semibold text-autovol-navy">Daily Production Tracking</h4>
                    {weekData.isCurrent && (
                        <p className="text-xs text-orange-600 flex items-center gap-1 mt-1">
                            <span className="w-3 h-0.5 bg-orange-500 inline-block"></span>
                            Orange line shows where production should be by current time
                        </p>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-autovol-teal text-white">
                                <th className="p-3 text-left font-semibold">Day</th>
                                <th className="p-3 text-center font-semibold">Target</th>
                                <th className="p-3 text-center font-semibold">Complete</th>
                                <th className="p-3 text-center font-semibold">In Progress</th>
                                <th className="p-3 text-center font-semibold">Pending</th>
                                <th className="p-3 text-center font-semibold">Rate</th>
                                <th className="p-3 text-center font-semibold">Cumul. Done</th>
                                <th className="p-3 text-center font-semibold">Cumul. Target</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dailyData.map((day, idx) => {
                                const isCurrentDay = weekData.isCurrent && idx === currentDayIndex;
                                const isPastDay = weekData.isCurrent && idx < currentDayIndex;
                                
                                return (
                                    <tr 
                                        key={day.dayKey} 
                                        className={`
                                            ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                            ${isCurrentDay ? 'bg-orange-50 border-l-4 border-orange-500' : ''}
                                            ${isPastDay && day.completionRate < 100 ? 'bg-red-50/30' : ''}
                                        `}
                                    >
                                        <td className="p-3 font-semibold">
                                            <div>{day.dayAbbrev}</div>
                                            <div className="text-xs text-gray-500">{day.date}</div>
                                        </td>
                                        <td className="p-3 text-center">{day.target}</td>
                                        <td className="p-3 text-center">
                                            <span className={day.completed > 0 ? 'text-green-700 font-bold' : ''}>
                                                {day.completed}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={day.inProgress > 0 ? 'text-blue-700' : ''}>
                                                {day.inProgress}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">{day.pending}</td>
                                        <td className="p-3 text-center">
                                            <span className={`
                                                px-2 py-0.5 rounded text-xs font-medium
                                                ${day.completionRate === 100 ? 'bg-green-100 text-green-800' : ''}
                                                ${day.completionRate >= 50 && day.completionRate < 100 ? 'bg-teal-100 text-teal-800' : ''}
                                                ${day.completionRate > 0 && day.completionRate < 50 ? 'bg-orange-100 text-orange-800' : ''}
                                                ${day.completionRate === 0 && day.target > 0 ? 'bg-gray-100 text-gray-600' : ''}
                                            `}>
                                                {day.completionRate}%
                                            </span>
                                        </td>
                                        <td className="p-3 text-center font-medium">{day.cumulativeComplete}</td>
                                        <td className="p-3 text-center text-gray-500">{day.cumulativeTarget}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-autovol-navy text-white font-semibold">
                                <td className="p-3">Total</td>
                                <td className="p-3 text-center">{overallStats.totalTarget}</td>
                                <td className="p-3 text-center">{overallStats.totalComplete}</td>
                                <td className="p-3 text-center">{overallStats.totalInProgress}</td>
                                <td className="p-3 text-center">{overallStats.totalPending}</td>
                                <td className="p-3 text-center">{overallStats.overallRate}%</td>
                                <td className="p-3 text-center" colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            
            {/* Project Breakdown */}
            {projectBreakdown.length > 0 && (
                <div className="bg-white border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                        <h4 className="font-semibold text-autovol-navy">Project Breakdown</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-3 text-left font-semibold">Project</th>
                                    <th className="p-3 text-center font-semibold">Total</th>
                                    <th className="p-3 text-center font-semibold">Complete</th>
                                    <th className="p-3 text-center font-semibold">In Progress</th>
                                    <th className="p-3 text-center font-semibold">Pending</th>
                                    <th className="p-3 text-center font-semibold">Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projectBreakdown.map((project, idx) => (
                                    <tr key={project.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                        <td className="p-3 font-medium">{project.name}</td>
                                        <td className="p-3 text-center">{project.total}</td>
                                        <td className="p-3 text-center text-green-700 font-medium">{project.complete}</td>
                                        <td className="p-3 text-center text-blue-700">{project.inProgress}</td>
                                        <td className="p-3 text-center">{project.total - project.complete - project.inProgress}</td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                project.rate === 100 ? 'bg-green-100 text-green-800' :
                                                project.rate >= 50 ? 'bg-teal-100 text-teal-800' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {project.rate}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {/* Info */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-700">
                <strong>Goal Tracking:</strong> The orange highlight indicates the current day. 
                For current week reports, the orange line in the PDF shows where production should be based on time of day.
                Use this to quickly assess if production is on track.
            </div>
        </div>
    );
}

// Export for use
window.WeeklyBoardManagementReport = WeeklyBoardManagementReport;
