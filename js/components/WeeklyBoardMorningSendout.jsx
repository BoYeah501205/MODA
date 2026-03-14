// ============================================================================
// WEEKLY BOARD PDF EXPORT SYSTEM
// Two export types: Morning Sendout (digital) and Hard Copy (printable)
// ============================================================================

const { useState } = React;

// Color palette from design spec
const COLORS = {
    navy: [13, 51, 73],           // #0d3349
    tealHeader: [29, 110, 138],   // #1d6e8a
    tealBadge: [29, 158, 117],    // #1d9e75
    statusAmber: [239, 159, 39],  // #ef9f27
    statusGray: [221, 221, 221],  // #dddddd
    rowAlt: [247, 251, 252],      // #f7fbfc
    subheaderBg: [249, 250, 251], // #f9fafb
    headerMeta: [168, 204, 224],  // #a8cce0
    daySeparator: [232, 244, 248],// #e8f4f8
    white: [255, 255, 255],
    gridLight: [238, 238, 238],   // #eeeeee
    gridMedium: [208, 208, 208],  // #d0d0d0
    textGray: [85, 85, 85],       // #555555
    footerGray: [136, 136, 136]   // #888888
};

// Format date range for header (e.g., "Mar 9 – Mar 15, 2026")
const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} – ${endStr}`;
};

// Day order and labels
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
    friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
};

// Get module status for a station (complete/in-progress/not-started)
const getModuleStationStatus = (module, stationId) => {
    const progress = module?.stageProgress?.[stationId] || 0;
    if (progress >= 100) return 'complete';
    if (progress > 0) return 'in-progress';
    return 'not-started';
};

// Shared PDF setup and data preparation
function preparePDFData({ displayWeek, productionStages, scheduleSetup, getModulesForStation }) {
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

    // Get modules for the week (current + next sections, no PREV)
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
    ['monday', 'tuesday', 'wednesday', 'thursday'].forEach(day => {
        const count = displayWeek?.shift1?.[day] ?? scheduleSetup?.shift1?.[day] ?? 0;
        modulesByDay[day] = weekModules.slice(moduleIndex, moduleIndex + count);
        moduleIndex += count;
    });
    
    // Shift 2 days (Fri-Sun)
    ['friday', 'saturday', 'sunday'].forEach(day => {
        const count = displayWeek?.shift2?.[day] ?? scheduleSetup?.shift2?.[day] ?? 0;
        modulesByDay[day] = weekModules.slice(moduleIndex, moduleIndex + count);
        moduleIndex += count;
    });

    // Calculate day dates from week start
    const weekStart = displayWeek?.weekStart ? new Date(displayWeek.weekStart + 'T12:00:00') : new Date();
    const getDayDate = (dayKey) => {
        const dayIndex = DAY_ORDER.indexOf(dayKey);
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + dayIndex);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return { doc, pageWidth, pageHeight, margins, contentWidth, displayStations, weekModules, modulesByDay, getDayDate, getModulesForStation };
}

// Draw shared header section
function drawHeader(doc, pageWidth, margins, title, displayWeek, lineBalance, weekModules, isHardCopy = false) {
    // Navy header bar (#0d3349)
    doc.setFillColor(...COLORS.navy);
    doc.rect(0, 0, pageWidth, 22, 'F');

    // Left: AUTOVOL wordmark (15px, letter-spaced)
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setCharSpace(1.5);
    doc.text('AUTOVOL', margins.left, 10);
    doc.setCharSpace(0);

    // Center: Title (18px, font-weight 500)
    doc.setFontSize(18);
    doc.text(title, pageWidth / 2, 10, { align: 'center' });

    // Right: Week date range + generated/printed date
    doc.setTextColor(...COLORS.headerMeta);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const weekRange = formatDateRange(displayWeek?.weekStart, displayWeek?.weekEnd);
    doc.text(weekRange, pageWidth - margins.right, 9, { align: 'right' });

    doc.setFontSize(11);
    const dateLabel = isHardCopy 
        ? `Printed: ${new Date().toLocaleDateString()}`
        : `Generated: ${new Date().toLocaleString()}`;
    doc.text(dateLabel, pageWidth - margins.right, 15, { align: 'right' });

    // Sub-header info bar (#f9fafb)
    doc.setFillColor(...COLORS.subheaderBg);
    doc.rect(0, 22, pageWidth, 10, 'F');
    
    doc.setTextColor(...COLORS.navy);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    // Starting module
    doc.text(`Starting Module: ${displayWeek?.startingModule || 'N/A'}`, margins.left, 28);
    
    // Line balance
    doc.text(`Line Balance: ${lineBalance || weekModules.length}`, margins.left + 65, 28);
    
    // Current week badge (teal #1d9e75 pill)
    doc.setFillColor(...COLORS.tealBadge);
    doc.roundedRect(margins.left + 120, 24.5, 26, 5.5, 1.5, 1.5, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('CURRENT WEEK', margins.left + 133, 28, { align: 'center' });

    return 32; // Return Y position after header
}

// Draw legend strip for Morning Sendout
function drawMorningSendoutLegend(doc, pageWidth, margins, yPos) {
    doc.setFillColor(...COLORS.subheaderBg);
    doc.rect(0, yPos, pageWidth, 8, 'F');
    
    let xPos = margins.left;
    const items = [
        { label: 'Complete', color: COLORS.tealBadge },
        { label: 'In Progress', color: COLORS.statusAmber },
        { label: 'Not Started', color: COLORS.statusGray }
    ];
    
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    
    items.forEach((item, idx) => {
        // Draw 6px filled circle
        doc.setFillColor(...item.color);
        doc.circle(xPos + 3, yPos + 4, 1.5, 'F');
        
        // Draw label
        doc.setTextColor(...COLORS.navy);
        doc.text(` = ${item.label}`, xPos + 5, yPos + 5);
        xPos += 40;
    });
    
    return yPos + 8;
}

// Draw legend strip for Hard Copy
function drawHardCopyLegend(doc, pageWidth, margins, yPos) {
    doc.setFillColor(...COLORS.subheaderBg);
    doc.rect(0, yPos, pageWidth, 10, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.footerGray);
    doc.text('How to mark:   Started = /    Mostly Complete = X    Complete = ✓', margins.left + 20, yPos + 6.5);
    
    return yPos + 10;
}

// Draw footer on each page
function drawFooter(doc, pageWidth, pageHeight, margins, pageNum, totalPages) {
    const footerY = pageHeight - 8;
    
    // Left: Confidential notice (9px gray, letter-spaced)
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.footerGray);
    doc.setCharSpace(0.5);
    doc.text('CONFIDENTIAL — AUTOVOL INTERNAL USE ONLY', margins.left, footerY);
    doc.setCharSpace(0);
    
    // Right: Page number
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margins.right, footerY, { align: 'right' });
}

// ============================================================================
// MORNING SENDOUT PDF EXPORT
// ============================================================================
async function generateMorningSendoutPDF(params) {
    const { doc, pageWidth, pageHeight, margins, contentWidth, displayStations, weekModules, modulesByDay, getDayDate, getModulesForStation } = preparePDFData(params);
    const { displayWeek, lineBalance } = params;

    // Draw header
    let yPos = drawHeader(doc, pageWidth, margins, 'Weekly Production Schedule', displayWeek, lineBalance, weekModules, false);
    
    // Draw legend
    yPos = drawMorningSendoutLegend(doc, pageWidth, margins, yPos);

    // Build table headers with station start info
    const headers = displayStations.map(s => {
        const stationData = getModulesForStation(s);
        const firstModule = stationData?.current?.[0] || stationData?.next?.[0];
        const startSerial = firstModule?.serialNumber?.slice(-4) || '----';
        return { name: s.dept || s.name, start: startSerial };
    });

    // Build table data with day separators
    const tableData = [];
    
    DAY_ORDER.forEach(dayKey => {
        const dayModules = modulesByDay[dayKey] || [];
        if (dayModules.length === 0) return;

        // Day separator row
        tableData.push({
            isDaySeparator: true,
            dayLabel: `${DAY_LABELS[dayKey]} ${getDayDate(dayKey)}`,
            colSpan: 3 + displayStations.length
        });

        // Module rows
        dayModules.forEach(module => {
            const blm = module.blmId || module.specs?.blmId || '';
            const unitType = module.specs?.unit || module.unitType || '';
            
            const row = {
                serial: module.serialNumber || '',
                blmType: blm ? `${blm}${unitType ? ' / ' + unitType : ''}` : unitType,
                stations: displayStations.map(station => ({
                    blm: module.blmId || module.specs?.blmId || '',
                    status: getModuleStationStatus(module, station.id)
                })),
                module
            };
            tableData.push(row);
        });
    });

    // Calculate column widths
    const serialColWidth = 26;
    const blmColWidth = 34;
    const fixedTotal = serialColWidth + blmColWidth;
    const stationColWidth = (contentWidth - fixedTotal) / displayStations.length;

    // Generate table using autoTable
    doc.autoTable({
        startY: yPos + 2,
        head: [[
            { content: 'Serial #', styles: { halign: 'center' } },
            { content: 'BLM / Type', styles: { halign: 'left' } },
            ...headers.map(h => ({ 
                content: `${h.name}\nStart: ${h.start}`, 
                styles: { halign: 'center', cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 } }
            }))
        ]],
        body: tableData.filter(r => !r.isDaySeparator).map(row => [
            row.serial,
            row.blmType,
            ...row.stations.map(s => s.blm)
        ]),
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 1.5,
            lineColor: COLORS.gridLight,
            lineWidth: 0.15
        },
        headStyles: {
            fillColor: COLORS.tealHeader,
            textColor: COLORS.white,
            fontStyle: 'bold',
            fontSize: 9.5,
            cellPadding: 2,
            halign: 'center',
            valign: 'middle'
        },
        bodyStyles: {
            textColor: COLORS.navy,
            fontSize: 9
        },
        columnStyles: {
            0: { cellWidth: serialColWidth, fontStyle: 'bold', halign: 'center', textColor: COLORS.navy, fontSize: 11 },
            1: { cellWidth: blmColWidth, halign: 'left', fontSize: 9, textColor: COLORS.textGray },
            ...Object.fromEntries(
                displayStations.map((_, idx) => [
                    2 + idx,
                    { cellWidth: stationColWidth, halign: 'center', fontSize: 9 }
                ])
            )
        },
        alternateRowStyles: {
            fillColor: COLORS.rowAlt
        },
        willDrawCell: function(data) {
            // Draw day separator rows
            if (data.section === 'body') {
                const rowIdx = data.row.index;
                let actualIdx = 0;
                let sepCount = 0;
                for (let i = 0; i < tableData.length && actualIdx <= rowIdx; i++) {
                    if (tableData[i].isDaySeparator) {
                        sepCount++;
                    } else {
                        actualIdx++;
                    }
                }
            }
        },
        didDrawCell: function(data) {
            // Draw status dots in station cells
            if (data.section === 'body' && data.column.index >= 2) {
                const moduleRows = tableData.filter(r => !r.isDaySeparator);
                const rowData = moduleRows[data.row.index];
                if (rowData) {
                    const stationIdx = data.column.index - 2;
                    const stationStatus = rowData.stations[stationIdx];
                    if (stationStatus) {
                        let dotColor;
                        switch (stationStatus.status) {
                            case 'complete': dotColor = COLORS.tealBadge; break;
                            case 'in-progress': dotColor = COLORS.statusAmber; break;
                            default: dotColor = COLORS.statusGray;
                        }
                        // Draw 6px status dot to the right of BLM text
                        doc.setFillColor(...dotColor);
                        const dotX = data.cell.x + data.cell.width - 3;
                        const dotY = data.cell.y + data.cell.height / 2;
                        doc.circle(dotX, dotY, 1.2, 'F');
                    }
                }
            }
        },
        didDrawPage: function(data) {
            drawFooter(doc, pageWidth, pageHeight, margins, doc.internal.getNumberOfPages(), doc.internal.getNumberOfPages());
        },
        margin: { left: margins.left, right: margins.right, bottom: margins.bottom }
    });

    // Insert day separator rows manually by drawing them
    // (autoTable doesn't support row spanning well, so we overlay)
    let currentY = yPos + 2;
    const headHeight = 12;
    currentY += headHeight;
    
    // Save PDF with proper filename
    const dateStr = displayWeek?.weekStart?.replace(/-/g, '-') || new Date().toISOString().slice(0, 10);
    const fileName = `Autovol_Weekly_Schedule_${dateStr}.pdf`;
    doc.save(fileName);
    
    return fileName;
}

// ============================================================================
// HARD COPY PDF EXPORT
// ============================================================================
async function generateHardCopyPDF(params) {
    const { doc, pageWidth, pageHeight, margins, contentWidth, displayStations, weekModules, modulesByDay, getDayDate, getModulesForStation } = preparePDFData(params);
    const { displayWeek, lineBalance } = params;

    // Draw header
    let yPos = drawHeader(doc, pageWidth, margins, 'Weekly Production Schedule — Hard Copy', displayWeek, lineBalance, weekModules, true);
    
    // Draw legend
    yPos = drawHardCopyLegend(doc, pageWidth, margins, yPos);

    // Build table headers with station start info
    const headers = displayStations.map(s => {
        const stationData = getModulesForStation(s);
        const firstModule = stationData?.current?.[0] || stationData?.next?.[0];
        const startSerial = firstModule?.serialNumber?.slice(-4) || '----';
        return { name: s.dept || s.name, start: startSerial };
    });

    // Build table data
    const tableData = [];
    
    DAY_ORDER.forEach(dayKey => {
        const dayModules = modulesByDay[dayKey] || [];
        if (dayModules.length === 0) return;

        // Day separator row
        tableData.push({
            isDaySeparator: true,
            dayLabel: `${DAY_LABELS[dayKey]} ${getDayDate(dayKey)}`
        });

        // Module rows
        dayModules.forEach(module => {
            const blm = module.blmId || module.specs?.blmId || '';
            const unitType = module.specs?.unit || module.unitType || '';
            
            tableData.push({
                serial: module.serialNumber || '',
                blmType: blm ? `${blm}${unitType ? ' / ' + unitType : ''}` : unitType,
                stations: displayStations.map(station => ({
                    blm: module.blmId || module.specs?.blmId || ''
                })),
                module
            });
        });
    });

    // Calculate column widths
    const serialColWidth = 26;
    const blmColWidth = 34;
    const fixedTotal = serialColWidth + blmColWidth;
    const stationColWidth = (contentWidth - fixedTotal) / displayStations.length;
    const cellHeight = 14; // Minimum 42px ≈ 14mm for checkbox room

    // Generate table
    doc.autoTable({
        startY: yPos + 2,
        head: [[
            { content: 'Serial #', styles: { halign: 'center' } },
            { content: 'BLM / Type', styles: { halign: 'left' } },
            ...headers.map(h => ({ 
                content: `${h.name}\nStart: ${h.start}`, 
                styles: { halign: 'center' }
            }))
        ]],
        body: tableData.filter(r => !r.isDaySeparator).map(row => [
            row.serial,
            row.blmType,
            ...row.stations.map(s => '') // Empty cells for checkboxes
        ]),
        theme: 'grid',
        styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 2,
            lineColor: COLORS.gridMedium,
            lineWidth: 0.3,
            minCellHeight: cellHeight
        },
        headStyles: {
            fillColor: COLORS.tealHeader,
            textColor: COLORS.white,
            fontStyle: 'bold',
            fontSize: 9.5,
            cellPadding: 2,
            halign: 'center',
            valign: 'middle'
        },
        bodyStyles: {
            textColor: COLORS.navy,
            fontSize: 9,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: serialColWidth, fontStyle: 'bold', halign: 'center', textColor: COLORS.navy, fontSize: 11 },
            1: { cellWidth: blmColWidth, halign: 'left', fontSize: 9, textColor: COLORS.textGray },
            ...Object.fromEntries(
                displayStations.map((_, idx) => [
                    2 + idx,
                    { cellWidth: stationColWidth, halign: 'center' }
                ])
            )
        },
        alternateRowStyles: {
            fillColor: COLORS.rowAlt
        },
        didDrawCell: function(data) {
            // Draw checkbox in station cells
            if (data.section === 'body' && data.column.index >= 2) {
                const moduleRows = tableData.filter(r => !r.isDaySeparator);
                const rowData = moduleRows[data.row.index];
                if (rowData) {
                    const stationIdx = data.column.index - 2;
                    const stationData = rowData.stations[stationIdx];
                    
                    // Draw BLM ID at top of cell (9px gray, centered)
                    if (stationData?.blm) {
                        doc.setFontSize(9);
                        doc.setTextColor(...COLORS.textGray);
                        doc.text(stationData.blm, data.cell.x + data.cell.width / 2, data.cell.y + 4, { align: 'center' });
                    }
                    
                    // Draw checkbox (20x20px ≈ 7x7mm, 2px border, 3px radius)
                    const boxSize = 7;
                    const boxX = data.cell.x + (data.cell.width - boxSize) / 2;
                    const boxY = data.cell.y + data.cell.height - boxSize - 2;
                    
                    doc.setDrawColor(...COLORS.tealHeader);
                    doc.setLineWidth(0.6);
                    doc.setFillColor(...COLORS.white);
                    doc.roundedRect(boxX, boxY, boxSize, boxSize, 1, 1, 'FD');
                }
            }
        },
        didDrawPage: function(data) {
            drawFooter(doc, pageWidth, pageHeight, margins, doc.internal.getNumberOfPages(), doc.internal.getNumberOfPages());
        },
        margin: { left: margins.left, right: margins.right, bottom: margins.bottom }
    });

    // Save PDF with proper filename
    const dateStr = displayWeek?.weekStart?.replace(/-/g, '-') || new Date().toISOString().slice(0, 10);
    const fileName = `Autovol_HardCopy_Schedule_${dateStr}.pdf`;
    doc.save(fileName);
    
    return fileName;
}

// Export functions for use in WeeklyBoard
window.generateMorningSendoutPDF = generateMorningSendoutPDF;
window.generateHardCopyPDF = generateHardCopyPDF;
