// ============================================================================
// WEEKLY BOARD MORNING SENDOUT PDF EXPORT
// Professional landscape PDF for morning distribution to supervisors,
// department leads, and COO
// ============================================================================

const { useState, useMemo } = React;

// Difficulty indicator abbreviations and colors for PDF
const DIFFICULTY_CONFIG = {
    sidewall: { abbr: 'SW', color: [249, 115, 22] },      // orange
    stair: { abbr: 'STAIR', color: [139, 92, 246] },      // purple
    hr3Wall: { abbr: '3HR', color: [239, 68, 68] },       // red
    short: { abbr: 'SHORT', color: [234, 179, 8] },       // yellow
    doubleStudio: { abbr: 'DBL', color: [99, 102, 241] }, // indigo
    sawbox: { abbr: 'SAW', color: [236, 72, 153] }        // pink
};

// Format date for display
const formatDateShort = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Format date range for header
const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
};

// Get day name from date
const getDayName = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short' });
};

// Generate morning sendout PDF
async function generateMorningSendoutPDF({
    displayWeek,
    productionStages,
    allModules,
    lineBalance,
    scheduleSetup,
    getModulesForStation
}) {
    if (!window.jspdf?.jsPDF) {
        throw new Error('jsPDF library not loaded');
    }

    const { jsPDF } = window.jspdf;
    
    // Create landscape letter document
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'letter' // 279.4 x 215.9 mm
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margins = { top: 12, bottom: 15, left: 8, right: 8 };
    const contentWidth = pageWidth - margins.left - margins.right;

    // Filter out Sign-Off station
    const displayStations = (productionStages || []).filter(s => 
        s.name?.toLowerCase() !== 'sign-off' && s.id !== 'sign-off'
    );

    // Get modules for the week (current section only, no PREV)
    const firstStation = displayStations[0];
    if (!firstStation || !getModulesForStation) {
        throw new Error('No station data available');
    }

    const { current = [], next = [] } = getModulesForStation(firstStation);
    const weekModules = [...current, ...next];

    if (weekModules.length === 0) {
        throw new Error('No modules scheduled for this week');
    }

    // Calculate modules per day based on schedule setup
    const modulesByDay = {};
    let moduleIndex = 0;
    
    // Shift 1 days (Mon-Thu)
    const shift1Days = ['monday', 'tuesday', 'wednesday', 'thursday'];
    shift1Days.forEach(day => {
        const count = scheduleSetup?.shift1?.[day] || 0;
        modulesByDay[day] = weekModules.slice(moduleIndex, moduleIndex + count);
        moduleIndex += count;
    });
    
    // Shift 2 days (Fri-Sun)
    const shift2Days = ['friday', 'saturday', 'sunday'];
    shift2Days.forEach(day => {
        const count = scheduleSetup?.shift2?.[day] || 0;
        modulesByDay[day] = weekModules.slice(moduleIndex, moduleIndex + count);
        moduleIndex += count;
    });

    // Build flat list with day info
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = {
        monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
        friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
    };
    
    // Calculate day dates from week start
    const weekStart = displayWeek?.weekStart ? new Date(displayWeek.weekStart + 'T12:00:00') : new Date();
    const getDayDate = (dayKey) => {
        const dayIndex = dayOrder.indexOf(dayKey);
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + dayIndex);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    let yPos = margins.top;

    // ===== HEADER SECTION =====
    // Navy header bar
    doc.setFillColor(30, 41, 59); // Autovol Navy
    doc.rect(0, 0, pageWidth, 22, 'F');

    // Left: AUTOVOL wordmark
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('AUTOVOL', margins.left, 9);

    // Center: Title
    doc.setFontSize(16);
    doc.text('Weekly Production Schedule', pageWidth / 2, 9, { align: 'center' });

    // Right: Week date range
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const weekRange = formatDateRange(displayWeek?.weekStart, displayWeek?.weekEnd);
    doc.text(weekRange, pageWidth - margins.right, 8, { align: 'right' });

    // Right: Generated timestamp
    doc.setFontSize(8);
    const generatedAt = `Generated: ${new Date().toLocaleString()}`;
    doc.text(generatedAt, pageWidth - margins.right, 13, { align: 'right' });

    // Sub-header info bar
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(0, 22, pageWidth, 10, 'F');
    
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    // Starting module
    doc.text(`Starting Module: ${displayWeek?.startingModule || 'N/A'}`, margins.left, 28);
    
    // Line balance
    doc.text(`Line Balance: ${lineBalance || weekModules.length}`, margins.left + 70, 28);
    
    // Current week badge
    doc.setFillColor(13, 148, 136); // teal
    doc.roundedRect(margins.left + 130, 24, 28, 6, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('CURRENT WEEK', margins.left + 144, 28, { align: 'center' });

    yPos = 36;

    // ===== BUILD TABLE DATA =====
    // Headers: Day, Serial #, BLM/Type, then each station
    const headers = [
        'Day',
        'Serial #',
        'BLM / Type',
        ...displayStations.map(s => s.dept || s.name)
    ];

    // Build rows grouped by day
    const tableData = [];
    let currentDay = null;

    dayOrder.forEach(dayKey => {
        const dayModules = modulesByDay[dayKey] || [];
        if (dayModules.length === 0) return;

        dayModules.forEach((module, idx) => {
            const row = [];
            
            // Day column - only show on first module of day
            if (idx === 0) {
                row.push(`${dayLabels[dayKey]} ${getDayDate(dayKey)}`);
            } else {
                row.push('');
            }
            
            // Serial number
            row.push(module.serialNumber || '');
            
            // BLM / Type - combine BLM ID and unit type
            const blm = module.blmId || module.specs?.blmId || '';
            const unitType = module.specs?.unit || module.unitType || '';
            row.push(blm ? `${blm}${unitType ? ' / ' + unitType : ''}` : unitType);
            
            // Station assignments - show starting serial for each station
            displayStations.forEach(station => {
                // Get the station's starting module info
                const stationData = getModulesForStation(station);
                const stationCurrent = stationData?.current || [];
                const stationNext = stationData?.next || [];
                const stationModules = [...stationCurrent, ...stationNext];
                
                // Find this module's position in the station
                const moduleInStation = stationModules.find(m => m.id === module.id);
                if (moduleInStation) {
                    row.push(module.serialNumber?.slice(-4) || '-');
                } else {
                    row.push('-');
                }
            });
            
            // Store difficulty indicators for cell styling
            row._module = module;
            row._isFirstOfDay = idx === 0;
            row._dayKey = dayKey;
            
            tableData.push(row);
        });
    });

    // Calculate column widths
    const dayColWidth = 22;
    const serialColWidth = 24;
    const blmColWidth = 32;
    const fixedTotal = dayColWidth + serialColWidth + blmColWidth;
    const stationColWidth = (contentWidth - fixedTotal) / displayStations.length;

    // Generate table using autoTable
    doc.autoTable({
        startY: yPos,
        head: [headers],
        body: tableData.map(row => row.slice(0, -3)), // Remove metadata
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: 1.5,
            lineColor: [200, 200, 200],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [13, 148, 136], // Autovol Teal
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 7,
            cellPadding: 2,
            halign: 'center'
        },
        bodyStyles: {
            textColor: [30, 41, 59],
            fontSize: 8
        },
        columnStyles: {
            0: { cellWidth: dayColWidth, fontStyle: 'bold', halign: 'left' }, // Day
            1: { cellWidth: serialColWidth, fontStyle: 'bold', halign: 'center' }, // Serial
            2: { cellWidth: blmColWidth, halign: 'left', fontSize: 7 }, // BLM/Type
            ...Object.fromEntries(
                displayStations.map((_, idx) => [
                    3 + idx,
                    { cellWidth: stationColWidth, halign: 'center', fontSize: 7 }
                ])
            )
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] // slate-50
        },
        didParseCell: function(data) {
            // Style day separator rows
            if (data.section === 'body' && data.column.index === 0 && data.cell.raw) {
                data.cell.styles.fillColor = [241, 245, 249]; // slate-100
            }
            
            // Add difficulty indicator dot via left border
            if (data.section === 'body' && data.column.index === 1) {
                const rowData = tableData[data.row.index];
                const module = rowData?._module;
                if (module?.difficultyIndicators) {
                    const indicators = module.difficultyIndicators;
                    // Get first active indicator for border color
                    for (const [key, config] of Object.entries(DIFFICULTY_CONFIG)) {
                        if (indicators[key]) {
                            data.cell.styles.cellPadding = { left: 3, right: 1, top: 1.5, bottom: 1.5 };
                            break;
                        }
                    }
                }
            }
        },
        didDrawCell: function(data) {
            // Draw difficulty indicator dot
            if (data.section === 'body' && data.column.index === 1) {
                const rowData = tableData[data.row.index];
                const module = rowData?._module;
                if (module?.difficultyIndicators) {
                    const indicators = module.difficultyIndicators;
                    let dotY = data.cell.y + data.cell.height / 2;
                    let dotX = data.cell.x + 1.5;
                    
                    for (const [key, config] of Object.entries(DIFFICULTY_CONFIG)) {
                        if (indicators[key]) {
                            doc.setFillColor(...config.color);
                            doc.circle(dotX, dotY, 1, 'F');
                            break; // Only show first indicator as dot
                        }
                    }
                }
            }
        },
        didDrawPage: function(data) {
            // Footer on each page
            const footerY = pageHeight - 8;
            
            // Page number
            doc.setFontSize(7);
            doc.setTextColor(107, 114, 128);
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margins.right, footerY, { align: 'right' });
            
            // Confidential notice
            doc.setFontSize(7);
            doc.text('CONFIDENTIAL - AUTOVOL INTERNAL USE ONLY', pageWidth / 2, footerY, { align: 'center' });
        },
        margin: { left: margins.left, right: margins.right, bottom: margins.bottom }
    });

    // Save PDF
    const weekStr = displayWeek?.weekStart?.replace(/-/g, '') || 'unknown';
    const fileName = `Weekly_Schedule_${weekStr}.pdf`;
    doc.save(fileName);
    
    return fileName;
}

// Export function for use in WeeklyBoard
window.generateMorningSendoutPDF = generateMorningSendoutPDF;

// React component wrapper (optional, for preview)
function WeeklyBoardMorningSendout({
    displayWeek,
    productionStages,
    allModules,
    lineBalance,
    scheduleSetup,
    getModulesForStation,
    onClose
}) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        
        try {
            await generateMorningSendoutPDF({
                displayWeek,
                productionStages,
                allModules,
                lineBalance,
                scheduleSetup,
                getModulesForStation
            });
            onClose?.();
        } catch (err) {
            console.error('PDF generation error:', err);
            setError(err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-4">
            <h3 className="text-lg font-bold text-autovol-navy mb-4">Export Morning Sendout PDF</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-sm space-y-1">
                    <div><strong>Week:</strong> {formatDateRange(displayWeek?.weekStart, displayWeek?.weekEnd)}</div>
                    <div><strong>Starting Module:</strong> {displayWeek?.startingModule || 'N/A'}</div>
                    <div><strong>Line Balance:</strong> {lineBalance}</div>
                </div>
            </div>
            
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
                    {error}
                </div>
            )}
            
            <div className="flex justify-end gap-2">
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                >
                    Cancel
                </button>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="px-4 py-2 btn-primary rounded-lg text-sm flex items-center gap-2"
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
        </div>
    );
}

window.WeeklyBoardMorningSendout = WeeklyBoardMorningSendout;
