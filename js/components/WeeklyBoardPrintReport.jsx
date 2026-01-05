// ============================================================================
// WEEKLY BOARD PRINT REPORT
// 11x17 Tabloid format for floor distribution
// Detailed module view with station progress, color-coded status
// ============================================================================

const { useState, useMemo } = React;

// Status color mapping (matches MODA color scheme)
const STATUS_COLORS = {
    complete: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', pdf: [34, 197, 94] },
    inProgress: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', pdf: [59, 130, 246] },
    notStarted: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-300', pdf: [156, 163, 175] }
};

// Get status for a module at a station
const getModuleStationStatus = (module, stationId) => {
    const progress = module?.stageProgress?.[stationId] || 0;
    if (progress === 100) return 'complete';
    if (progress > 0) return 'inProgress';
    return 'notStarted';
};

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

function WeeklyBoardPrintReport({
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
                shift2: scheduleSetup?.shift2 || { friday: 0, saturday: 0, sunday: 0 }
            };
        }
        
        if (selectedWeekId === 'previous') {
            // Calculate previous week dates
            const prevStart = new Date(currentWeek?.weekStart);
            prevStart.setDate(prevStart.getDate() - 7);
            const prevEnd = new Date(prevStart);
            prevEnd.setDate(prevEnd.getDate() + 6);
            
            // Find completed week that matches
            const completed = completedWeeks?.find(w => {
                const wStart = new Date(w.weekStart || w.scheduleSnapshot?.weekStart);
                return Math.abs(wStart - prevStart) < 86400000; // Within 1 day
            });
            
            return {
                weekStart: prevStart.toISOString().split('T')[0],
                weekEnd: prevEnd.toISOString().split('T')[0],
                startingModule: completed?.scheduleSnapshot?.startingModule || currentWeek?.startingModule,
                shift1: completed?.shift1 || scheduleSetup?.shift1,
                shift2: completed?.shift2 || scheduleSetup?.shift2
            };
        }
        
        // Historical completed week
        const completed = completedWeeks?.find(w => w.id === selectedWeekId || w.weekId === selectedWeekId);
        if (completed) {
            return {
                weekStart: completed.weekStart || completed.scheduleSnapshot?.weekStart,
                weekEnd: completed.weekEnd || completed.scheduleSnapshot?.weekEnd,
                startingModule: completed.scheduleSnapshot?.startingModule,
                shift1: completed.shift1,
                shift2: completed.shift2
            };
        }
        
        return currentWeek;
    }, [selectedWeekId, currentWeek, completedWeeks, scheduleSetup]);
    
    // Calculate modules per day
    const modulesByDay = useMemo(() => {
        if (!weekData || !allModules?.length) return {};
        
        const startIdx = allModules.findIndex(m => m.serialNumber === weekData.startingModule);
        if (startIdx === -1) return {};
        
        const result = {};
        let currentIdx = startIdx;
        
        // Shift 1 days (Mon-Thu)
        ['monday', 'tuesday', 'wednesday', 'thursday'].forEach(day => {
            const count = weekData.shift1?.[day] || 0;
            result[day] = allModules.slice(currentIdx, currentIdx + count);
            currentIdx += count;
        });
        
        // Shift 2 days (Fri-Sun)
        ['friday', 'saturday', 'sunday'].forEach(day => {
            const count = weekData.shift2?.[day] || 0;
            result[day] = allModules.slice(currentIdx, currentIdx + count);
            currentIdx += count;
        });
        
        return result;
    }, [weekData, allModules]);
    
    // Get all modules for the week flattened with day info
    const weekModulesFlat = useMemo(() => {
        const result = [];
        DAY_KEYS.forEach((day, dayIdx) => {
            const modules = modulesByDay[day] || [];
            modules.forEach((module, idx) => {
                result.push({
                    ...module,
                    day: DAY_NAMES[dayIdx],
                    dayKey: day,
                    dayIndex: dayIdx,
                    isFirstOfDay: idx === 0,
                    dayModuleCount: modules.length
                });
            });
        });
        return result;
    }, [modulesByDay]);
    
    // Filter out Sign-Off station for display
    const displayStations = useMemo(() => 
        (productionStages || []).filter(s => 
            s.name?.toLowerCase() !== 'sign-off' && s.id !== 'sign-off'
        ),
        [productionStages]
    );
    
    // Generate PDF
    const handleGeneratePDF = async () => {
        setIsGenerating(true);
        
        try {
            const { jsPDF } = window.jspdf;
            
            // Create 11x17 tabloid landscape document
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [279.4, 431.8] // 11x17 inches in mm
            });
            
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margins = { top: 12, bottom: 12, left: 10, right: 10 };
            const contentWidth = pageWidth - margins.left - margins.right;
            
            let yPos = margins.top;
            
            // ===== HEADER =====
            doc.setFillColor(30, 41, 59); // Autovol Navy
            doc.rect(0, 0, pageWidth, 20, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Autovol Weekly Production Board', margins.left, 10);
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text(`Week: ${formatDateRange(weekData?.weekStart, weekData?.weekEnd)}`, margins.left, 16);
            
            doc.setFontSize(9);
            doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margins.right, 10, { align: 'right' });
            doc.text(`Starting Module: ${weekData?.startingModule || 'N/A'}`, pageWidth - margins.right, 16, { align: 'right' });
            
            yPos = 25;
            
            // ===== LEGEND =====
            doc.setFontSize(8);
            doc.setTextColor(0, 0, 0);
            doc.text('Status:', margins.left, yPos);
            
            // Complete
            doc.setFillColor(34, 197, 94);
            doc.rect(margins.left + 15, yPos - 3, 8, 4, 'F');
            doc.text('Complete', margins.left + 25, yPos);
            
            // In Progress
            doc.setFillColor(59, 130, 246);
            doc.rect(margins.left + 55, yPos - 3, 8, 4, 'F');
            doc.text('In Progress', margins.left + 65, yPos);
            
            // Not Started
            doc.setFillColor(156, 163, 175);
            doc.rect(margins.left + 100, yPos - 3, 8, 4, 'F');
            doc.text('Not Started', margins.left + 110, yPos);
            
            yPos += 5;
            
            // ===== BUILD TABLE DATA =====
            // Headers: Day, Serial, BLM ID, Unit Type, Project, then each station
            const headers = [
                'Day',
                'Serial #',
                'BLM ID',
                'Unit Type',
                'Project',
                ...displayStations.map(s => s.dept || s.name)
            ];
            
            // Build rows
            const tableData = weekModulesFlat.map(module => {
                const row = [
                    module.isFirstOfDay ? module.day : '',
                    module.serialNumber || '',
                    module.blmId || module.specs?.blmId || '',
                    module.specs?.unit || module.unitType || '',
                    module.projectName || ''
                ];
                
                // Add station progress
                displayStations.forEach(station => {
                    const progress = module.stageProgress?.[station.id] || 0;
                    row.push(progress === 100 ? '100%' : progress > 0 ? `${progress}%` : '-');
                });
                
                return row;
            });
            
            // Calculate column widths
            const fixedColWidths = [18, 28, 22, 20, 35]; // Day, Serial, BLM, Unit, Project
            const fixedTotal = fixedColWidths.reduce((a, b) => a + b, 0);
            const stationColWidth = (contentWidth - fixedTotal) / displayStations.length;
            
            const columnStyles = {
                0: { cellWidth: fixedColWidths[0] }, // Day
                1: { cellWidth: fixedColWidths[1], fontStyle: 'bold' }, // Serial
                2: { cellWidth: fixedColWidths[2] }, // BLM ID
                3: { cellWidth: fixedColWidths[3], halign: 'center' }, // Unit Type
                4: { cellWidth: fixedColWidths[4] } // Project
            };
            
            // Station columns
            displayStations.forEach((_, idx) => {
                columnStyles[5 + idx] = { 
                    cellWidth: stationColWidth, 
                    halign: 'center',
                    fontSize: 7
                };
            });
            
            // Generate table
            doc.autoTable({
                startY: yPos,
                head: [headers],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [13, 148, 136], // Autovol Teal
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 7,
                    cellPadding: 1.5,
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 7,
                    cellPadding: 1.2,
                    textColor: [30, 41, 59]
                },
                columnStyles: columnStyles,
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                },
                margin: { left: margins.left, right: margins.right },
                didParseCell: function(data) {
                    // Color station cells based on progress
                    if (data.section === 'body' && data.column.index >= 5) {
                        const value = data.cell.raw;
                        if (value === '100%') {
                            data.cell.styles.fillColor = [220, 252, 231]; // green-100
                            data.cell.styles.textColor = [22, 101, 52]; // green-800
                            data.cell.styles.fontStyle = 'bold';
                        } else if (value !== '-' && value !== '') {
                            data.cell.styles.fillColor = [219, 234, 254]; // blue-100
                            data.cell.styles.textColor = [30, 64, 175]; // blue-800
                        }
                    }
                    
                    // Bold day column when it has content
                    if (data.section === 'body' && data.column.index === 0 && data.cell.raw) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [241, 245, 249]; // slate-100
                    }
                },
                didDrawPage: function(data) {
                    // Footer on each page
                    const footerY = pageHeight - 8;
                    doc.setFontSize(7);
                    doc.setTextColor(107, 114, 128);
                    doc.text('Autovol - Weekly Production Board', margins.left, footerY);
                    doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margins.right, footerY, { align: 'right' });
                    doc.text('For Internal Use Only', pageWidth / 2, footerY, { align: 'center' });
                }
            });
            
            // Save PDF
            const weekStr = weekData?.weekStart?.replace(/-/g, '') || 'unknown';
            doc.save(`Weekly_Board_Print_${weekStr}.pdf`);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };
    
    // Preview table
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-autovol-navy">Weekly Board - Print Version</h3>
                    <p className="text-sm text-gray-500">
                        {formatDateRange(weekData?.weekStart, weekData?.weekEnd)}
                        {weekData?.startingModule && ` | Starting: ${weekData.startingModule}`}
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Generate 11x17 PDF
                        </>
                    )}
                </button>
            </div>
            
            {/* Legend */}
            <div className="flex items-center gap-4 text-sm">
                <span className="font-medium text-gray-700">Status:</span>
                <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 border border-green-300">Complete</span>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">In Progress</span>
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-300">Not Started</span>
            </div>
            
            {/* Preview Table */}
            <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-xs">
                    <thead>
                        <tr className="bg-autovol-teal text-white">
                            <th className="p-2 text-left font-semibold sticky left-0 bg-autovol-teal">Day</th>
                            <th className="p-2 text-left font-semibold">Serial #</th>
                            <th className="p-2 text-left font-semibold">BLM ID</th>
                            <th className="p-2 text-center font-semibold">Unit Type</th>
                            <th className="p-2 text-left font-semibold">Project</th>
                            {displayStations.map(station => (
                                <th key={station.id} className="p-2 text-center font-semibold whitespace-nowrap">
                                    {station.dept || station.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {weekModulesFlat.length === 0 ? (
                            <tr>
                                <td colSpan={5 + displayStations.length} className="p-8 text-center text-gray-500">
                                    No modules scheduled for this week
                                </td>
                            </tr>
                        ) : (
                            weekModulesFlat.map((module, idx) => (
                                <tr key={`${module.serialNumber}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className={`p-2 font-semibold sticky left-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${module.isFirstOfDay ? 'bg-slate-100' : ''}`}>
                                        {module.isFirstOfDay ? module.day : ''}
                                    </td>
                                    <td className="p-2 font-bold text-autovol-navy">{module.serialNumber}</td>
                                    <td className="p-2">{module.blmId || module.specs?.blmId || '-'}</td>
                                    <td className="p-2 text-center">{module.specs?.unit || module.unitType || '-'}</td>
                                    <td className="p-2">{module.projectName}</td>
                                    {displayStations.map(station => {
                                        const status = getModuleStationStatus(module, station.id);
                                        const progress = module.stageProgress?.[station.id] || 0;
                                        const colors = STATUS_COLORS[status];
                                        
                                        return (
                                            <td key={station.id} className="p-1 text-center">
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${colors.bg} ${colors.text} ${colors.border} border`}>
                                                    {progress === 100 ? '100%' : progress > 0 ? `${progress}%` : '-'}
                                                </span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Total Modules</div>
                    <div className="text-xl font-bold text-autovol-navy">{weekModulesFlat.length}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Active Projects</div>
                    <div className="text-xl font-bold text-autovol-navy">{activeProjects?.length || 0}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Stations</div>
                    <div className="text-xl font-bold text-autovol-navy">{displayStations.length}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Line Balance</div>
                    <div className="text-xl font-bold text-autovol-navy">{lineBalance || weekModulesFlat.length}</div>
                </div>
            </div>
            
            {/* Info */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-700">
                <strong>Print Format:</strong> This report generates an 11x17 (Tabloid) landscape PDF optimized for printing. 
                Color coding matches MODA status colors for easy reference on the production floor.
            </div>
        </div>
    );
}

// Export for use
window.WeeklyBoardPrintReport = WeeklyBoardPrintReport;
