// ============================================================================
// WEEKLY BOARD REPORT GENERATOR
// PDF Report Generation for Weekly Production Board
// Designed for internal and external distribution
// ============================================================================

// ===== REPORT CONFIGURATION =====
const REPORT_CONFIG = {
    // Company branding
    companyName: 'Autovol',
    reportTitle: 'Weekly Production Report',
    
    // PDF settings
    pageSize: 'letter', // 'letter' or 'a4'
    orientation: 'landscape', // 'portrait' or 'landscape'
    
    // Colors (RGB arrays for jsPDF)
    colors: {
        primary: [13, 148, 136],      // Autovol Teal (#0d9488)
        secondary: [30, 41, 59],       // Autovol Navy (#1e293b)
        success: [34, 197, 94],        // Green
        warning: [234, 179, 8],        // Yellow
        danger: [239, 68, 68],         // Red
        gray: [107, 114, 128],         // Gray
        lightGray: [243, 244, 246],    // Light gray for alternating rows
        white: [255, 255, 255]
    },
    
    // Margins (in mm)
    margins: {
        top: 15,
        bottom: 15,
        left: 15,
        right: 15
    }
};

// ===== UTILITY FUNCTIONS =====

// Format date for display
const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
};

// Format date range
const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '—';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
};

// Get current timestamp for report
const getReportTimestamp = () => {
    return new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

// Calculate progress percentage
const calculateProgress = (modules, stationId) => {
    if (!modules || modules.length === 0) return 0;
    const totalProgress = modules.reduce((sum, m) => {
        const progress = m.stageProgress?.[stationId] || 0;
        return sum + progress;
    }, 0);
    return Math.round(totalProgress / modules.length);
};

// Get status color based on progress
const getStatusColor = (progress) => {
    if (progress === 100) return REPORT_CONFIG.colors.success;
    if (progress >= 50) return REPORT_CONFIG.colors.primary;
    if (progress > 0) return REPORT_CONFIG.colors.warning;
    return REPORT_CONFIG.colors.gray;
};

// ===== PDF GENERATION FUNCTIONS =====

/**
 * Generate Weekly Board PDF Report
 * @param {Object} options - Report options
 * @param {Object} options.currentWeek - Current week configuration
 * @param {Array} options.productionStages - Array of production stations
 * @param {Object} options.staggerConfig - Station stagger configuration
 * @param {Array} options.allModules - All modules sorted by build sequence
 * @param {Array} options.activeProjects - Active projects
 * @param {Object} options.scheduleSetup - Schedule setup (shift configuration)
 * @param {number} options.lineBalance - Weekly line balance
 * @param {string} options.reportType - 'summary', 'detailed', or 'external'
 */
function generateWeeklyBoardPDF(options) {
    const { jsPDF } = window.jspdf;
    
    const {
        currentWeek,
        productionStages,
        staggerConfig,
        allModules,
        activeProjects,
        scheduleSetup,
        lineBalance,
        reportType = 'summary'
    } = options;
    
    // Create PDF document
    const doc = new jsPDF({
        orientation: REPORT_CONFIG.orientation,
        unit: 'mm',
        format: REPORT_CONFIG.pageSize
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const { margins } = REPORT_CONFIG;
    const contentWidth = pageWidth - margins.left - margins.right;
    
    let yPos = margins.top;
    
    // ===== HEADER SECTION =====
    const addHeader = () => {
        // Company name and logo area
        doc.setFillColor(...REPORT_CONFIG.colors.secondary);
        doc.rect(0, 0, pageWidth, 25, 'F');
        
        doc.setTextColor(...REPORT_CONFIG.colors.white);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(REPORT_CONFIG.companyName, margins.left, 12);
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text(REPORT_CONFIG.reportTitle, margins.left, 20);
        
        // Week info on right side
        doc.setFontSize(10);
        doc.text(`Week of ${formatDateRange(currentWeek?.weekStart, currentWeek?.weekEnd)}`, pageWidth - margins.right, 12, { align: 'right' });
        doc.text(`Generated: ${getReportTimestamp()}`, pageWidth - margins.right, 18, { align: 'right' });
        
        yPos = 32;
    };
    
    // ===== SUMMARY SECTION =====
    const addSummarySection = () => {
        doc.setTextColor(...REPORT_CONFIG.colors.secondary);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Production Summary', margins.left, yPos);
        yPos += 6;
        
        // Summary boxes
        const boxWidth = (contentWidth - 15) / 4;
        const boxHeight = 20;
        const boxes = [
            { label: 'Line Balance', value: `${lineBalance}`, sublabel: 'modules/week' },
            { label: 'Starting Module', value: currentWeek?.startingModule || '—', sublabel: 'AUTO-FC/AUTO-W' },
            { label: 'Active Projects', value: `${activeProjects?.length || 0}`, sublabel: 'in production' },
            { label: 'Total Modules', value: `${allModules?.length || 0}`, sublabel: 'in queue' }
        ];
        
        boxes.forEach((box, idx) => {
            const x = margins.left + (idx * (boxWidth + 5));
            
            // Box background
            doc.setFillColor(...REPORT_CONFIG.colors.lightGray);
            doc.roundedRect(x, yPos, boxWidth, boxHeight, 2, 2, 'F');
            
            // Box content
            doc.setTextColor(...REPORT_CONFIG.colors.secondary);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(box.label, x + 3, yPos + 5);
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...REPORT_CONFIG.colors.primary);
            doc.text(box.value, x + 3, yPos + 13);
            
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...REPORT_CONFIG.colors.gray);
            doc.text(box.sublabel, x + 3, yPos + 18);
        });
        
        yPos += boxHeight + 8;
    };
    
    // ===== STATION PROGRESS TABLE =====
    const addStationProgressTable = () => {
        doc.setTextColor(...REPORT_CONFIG.colors.secondary);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Station Progress Overview', margins.left, yPos);
        yPos += 4;
        
        // Get modules for each station
        const getStationModules = (station) => {
            const stagger = staggerConfig?.[station.id] || 0;
            const startingModule = allModules?.find(m => m.serialNumber === currentWeek?.startingModule);
            if (!startingModule) return [];
            
            const startBuildSeq = (startingModule.buildSequence || 0) - stagger;
            const startIdx = allModules.findIndex(m => (m.buildSequence || 0) >= startBuildSeq);
            if (startIdx === -1) return [];
            
            return allModules.slice(startIdx, startIdx + lineBalance);
        };
        
        // Build table data
        const tableData = (productionStages || []).map(station => {
            const modules = getStationModules(station);
            const completed = modules.filter(m => (m.stageProgress?.[station.id] || 0) === 100).length;
            const inProgress = modules.filter(m => {
                const p = m.stageProgress?.[station.id] || 0;
                return p > 0 && p < 100;
            }).length;
            const pending = modules.length - completed - inProgress;
            const avgProgress = calculateProgress(modules, station.id);
            const stagger = staggerConfig?.[station.id] || 0;
            
            return [
                station.dept || station.name,
                stagger.toString(),
                modules.length.toString(),
                completed.toString(),
                inProgress.toString(),
                pending.toString(),
                `${avgProgress}%`
            ];
        });
        
        doc.autoTable({
            startY: yPos,
            head: [['Station', 'Stagger', 'Total', 'Complete', 'In Progress', 'Pending', 'Avg %']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: REPORT_CONFIG.colors.secondary,
                textColor: REPORT_CONFIG.colors.white,
                fontStyle: 'bold',
                fontSize: 9
            },
            bodyStyles: {
                fontSize: 8,
                textColor: REPORT_CONFIG.colors.secondary
            },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 25, halign: 'center' },
                5: { cellWidth: 20, halign: 'center' },
                6: { cellWidth: 20, halign: 'center' }
            },
            margin: { left: margins.left, right: margins.right },
            didParseCell: function(data) {
                // Color the progress column based on value
                if (data.section === 'body' && data.column.index === 6) {
                    const progress = parseInt(data.cell.raw) || 0;
                    if (progress === 100) {
                        data.cell.styles.textColor = REPORT_CONFIG.colors.success;
                        data.cell.styles.fontStyle = 'bold';
                    } else if (progress >= 50) {
                        data.cell.styles.textColor = REPORT_CONFIG.colors.primary;
                    }
                }
                // Color completed column green
                if (data.section === 'body' && data.column.index === 3) {
                    const val = parseInt(data.cell.raw) || 0;
                    if (val > 0) {
                        data.cell.styles.textColor = REPORT_CONFIG.colors.success;
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            }
        });
        
        yPos = doc.lastAutoTable.finalY + 8;
    };
    
    // ===== MODULE SCHEDULE TABLE =====
    const addModuleScheduleTable = () => {
        doc.setTextColor(...REPORT_CONFIG.colors.secondary);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Weekly Module Schedule', margins.left, yPos);
        yPos += 4;
        
        // Get day labels from schedule setup
        const shift1Days = ['monday', 'tuesday', 'wednesday', 'thursday'];
        const dayNames = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu' };
        
        // Find starting module index
        const startIdx = allModules?.findIndex(m => m.serialNumber === currentWeek?.startingModule) || 0;
        const weekModules = allModules?.slice(startIdx, startIdx + lineBalance) || [];
        
        // Build schedule with day assignments
        let moduleIdx = 0;
        const scheduleData = [];
        
        shift1Days.forEach(day => {
            const count = scheduleSetup?.shift1?.[day] || 0;
            for (let i = 0; i < count && moduleIdx < weekModules.length; i++) {
                const module = weekModules[moduleIdx];
                const project = activeProjects?.find(p => p.id === module.projectId);
                
                // Calculate overall progress (average across all stations)
                const stationCount = productionStages?.length || 1;
                const totalProgress = (productionStages || []).reduce((sum, station) => {
                    return sum + (module.stageProgress?.[station.id] || 0);
                }, 0);
                const avgProgress = Math.round(totalProgress / stationCount);
                
                scheduleData.push([
                    dayNames[day],
                    module.serialNumber,
                    project?.name || module.projectName || '—',
                    `#${module.buildSequence || '—'}`,
                    module.specs?.unit || '—',
                    `${avgProgress}%`
                ]);
                
                moduleIdx++;
            }
        });
        
        doc.autoTable({
            startY: yPos,
            head: [['Day', 'Serial Number', 'Project', 'Sequence', 'Unit Type', 'Progress']],
            body: scheduleData,
            theme: 'striped',
            headStyles: {
                fillColor: REPORT_CONFIG.colors.primary,
                textColor: REPORT_CONFIG.colors.white,
                fontStyle: 'bold',
                fontSize: 9
            },
            bodyStyles: {
                fontSize: 8,
                textColor: REPORT_CONFIG.colors.secondary
            },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 40, fontStyle: 'bold' },
                2: { cellWidth: 50 },
                3: { cellWidth: 25, halign: 'center' },
                4: { cellWidth: 30, halign: 'center' },
                5: { cellWidth: 25, halign: 'center' }
            },
            margin: { left: margins.left, right: margins.right },
            didParseCell: function(data) {
                if (data.section === 'body' && data.column.index === 5) {
                    const progress = parseInt(data.cell.raw) || 0;
                    if (progress === 100) {
                        data.cell.styles.textColor = REPORT_CONFIG.colors.success;
                        data.cell.styles.fontStyle = 'bold';
                    } else if (progress >= 50) {
                        data.cell.styles.textColor = REPORT_CONFIG.colors.primary;
                    }
                }
            }
        });
        
        yPos = doc.lastAutoTable.finalY + 8;
    };
    
    // ===== PROJECT BREAKDOWN TABLE =====
    const addProjectBreakdownTable = () => {
        // Check if we need a new page
        if (yPos > pageHeight - 60) {
            doc.addPage();
            yPos = margins.top;
        }
        
        doc.setTextColor(...REPORT_CONFIG.colors.secondary);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Project Breakdown', margins.left, yPos);
        yPos += 4;
        
        // Find starting module index
        const startIdx = allModules?.findIndex(m => m.serialNumber === currentWeek?.startingModule) || 0;
        const weekModules = allModules?.slice(startIdx, startIdx + lineBalance) || [];
        
        // Count modules per project
        const projectCounts = {};
        weekModules.forEach(m => {
            const projectName = m.projectName || 'Unknown';
            if (!projectCounts[projectName]) {
                projectCounts[projectName] = { total: 0, complete: 0, inProgress: 0, pending: 0 };
            }
            projectCounts[projectName].total++;
            
            // Check if module is complete at final station
            const finalStation = productionStages?.[productionStages.length - 1];
            const finalProgress = m.stageProgress?.[finalStation?.id] || 0;
            
            if (finalProgress === 100) {
                projectCounts[projectName].complete++;
            } else if (Object.values(m.stageProgress || {}).some(p => p > 0)) {
                projectCounts[projectName].inProgress++;
            } else {
                projectCounts[projectName].pending++;
            }
        });
        
        const projectData = Object.entries(projectCounts).map(([name, counts]) => [
            name,
            counts.total.toString(),
            counts.complete.toString(),
            counts.inProgress.toString(),
            counts.pending.toString(),
            `${Math.round((counts.complete / counts.total) * 100)}%`
        ]);
        
        doc.autoTable({
            startY: yPos,
            head: [['Project', 'Modules', 'Complete', 'In Progress', 'Pending', 'Completion']],
            body: projectData,
            theme: 'striped',
            headStyles: {
                fillColor: REPORT_CONFIG.colors.secondary,
                textColor: REPORT_CONFIG.colors.white,
                fontStyle: 'bold',
                fontSize: 9
            },
            bodyStyles: {
                fontSize: 8,
                textColor: REPORT_CONFIG.colors.secondary
            },
            margin: { left: margins.left, right: margins.right }
        });
        
        yPos = doc.lastAutoTable.finalY + 8;
    };
    
    // ===== FOOTER =====
    const addFooter = () => {
        const footerY = pageHeight - 10;
        
        doc.setDrawColor(...REPORT_CONFIG.colors.lightGray);
        doc.line(margins.left, footerY - 3, pageWidth - margins.right, footerY - 3);
        
        doc.setFontSize(8);
        doc.setTextColor(...REPORT_CONFIG.colors.gray);
        doc.text(`${REPORT_CONFIG.companyName} - ${REPORT_CONFIG.reportTitle}`, margins.left, footerY);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth - margins.right, footerY, { align: 'right' });
        doc.text('Confidential - Internal Use Only', pageWidth / 2, footerY, { align: 'center' });
    };
    
    // ===== BUILD THE REPORT =====
    addHeader();
    addSummarySection();
    addStationProgressTable();
    
    // Check if we need a new page before module schedule
    if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = margins.top;
    }
    
    addModuleScheduleTable();
    
    // Add project breakdown for detailed reports
    if (reportType === 'detailed' || reportType === 'summary') {
        addProjectBreakdownTable();
    }
    
    // Add footer to all pages
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter();
    }
    
    return doc;
}

/**
 * Generate and download the PDF
 */
function downloadWeeklyBoardPDF(options) {
    const doc = generateWeeklyBoardPDF(options);
    const weekStr = options.currentWeek?.weekStart?.replace(/-/g, '') || 'unknown';
    const filename = `Weekly_Production_Report_${weekStr}.pdf`;
    doc.save(filename);
}

/**
 * Generate and open PDF in new tab for preview
 */
function previewWeeklyBoardPDF(options) {
    const doc = generateWeeklyBoardPDF(options);
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
}

// ===== REACT COMPONENT FOR REPORT MODAL =====
function WeeklyBoardReportModal({ 
    isOpen, 
    onClose, 
    currentWeek,
    productionStages,
    staggerConfig,
    allModules,
    activeProjects,
    scheduleSetup,
    lineBalance
}) {
    const { useState } = React;
    const [reportType, setReportType] = useState('summary');
    const [isGenerating, setIsGenerating] = useState(false);
    
    if (!isOpen) return null;
    
    const handleGenerate = async (action) => {
        setIsGenerating(true);
        
        // Small delay for UI feedback
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const options = {
            currentWeek,
            productionStages,
            staggerConfig,
            allModules,
            activeProjects,
            scheduleSetup,
            lineBalance,
            reportType
        };
        
        try {
            if (action === 'download') {
                downloadWeeklyBoardPDF(options);
            } else {
                previewWeeklyBoardPDF(options);
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF. Please try again.');
        }
        
        setIsGenerating(false);
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-autovol-navy">Generate Weekly Report</h3>
                        <p className="text-sm text-gray-500">Create PDF for distribution</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-gray-100 rounded-lg text-xl"
                        disabled={isGenerating}
                    >
                        ✕
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Week Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-500 mb-1">Report Period</div>
                        <div className="font-semibold text-gray-800">
                            {formatDateRange(currentWeek?.weekStart, currentWeek?.weekEnd)}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                            Starting: <span className="font-mono">{currentWeek?.startingModule || '—'}</span>
                            <span className="mx-2">•</span>
                            Line Balance: <span className="font-bold text-autovol-teal">{lineBalance}</span>
                        </div>
                    </div>
                    
                    {/* Report Type Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Report Type
                        </label>
                        <div className="space-y-2">
                            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                reportType === 'summary' ? 'border-autovol-teal bg-teal-50' : 'border-gray-200'
                            }`}>
                                <input
                                    type="radio"
                                    name="reportType"
                                    value="summary"
                                    checked={reportType === 'summary'}
                                    onChange={(e) => setReportType(e.target.value)}
                                    className="mt-1"
                                />
                                <div>
                                    <div className="font-medium text-gray-800">Summary Report</div>
                                    <div className="text-sm text-gray-500">
                                        Station progress, module schedule, and project breakdown
                                    </div>
                                </div>
                            </label>
                            
                            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                reportType === 'detailed' ? 'border-autovol-teal bg-teal-50' : 'border-gray-200'
                            }`}>
                                <input
                                    type="radio"
                                    name="reportType"
                                    value="detailed"
                                    checked={reportType === 'detailed'}
                                    onChange={(e) => setReportType(e.target.value)}
                                    className="mt-1"
                                />
                                <div>
                                    <div className="font-medium text-gray-800">Detailed Report</div>
                                    <div className="text-sm text-gray-500">
                                        Full module details with station-by-station progress
                                    </div>
                                </div>
                            </label>
                            
                            <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                                reportType === 'external' ? 'border-autovol-teal bg-teal-50' : 'border-gray-200'
                            }`}>
                                <input
                                    type="radio"
                                    name="reportType"
                                    value="external"
                                    checked={reportType === 'external'}
                                    onChange={(e) => setReportType(e.target.value)}
                                    className="mt-1"
                                />
                                <div>
                                    <div className="font-medium text-gray-800">External Report</div>
                                    <div className="text-sm text-gray-500">
                                        Client-friendly version with key milestones only
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
                
                {/* Actions */}
                <div className="p-4 border-t flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                        disabled={isGenerating}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => handleGenerate('preview')}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium flex items-center gap-2"
                        disabled={isGenerating}
                    >
                        {isGenerating ? '...' : '👁️'} Preview
                    </button>
                    <button
                        onClick={() => handleGenerate('download')}
                        className="px-4 py-2 btn-primary rounded-lg text-sm font-medium flex items-center gap-2"
                        disabled={isGenerating}
                    >
                        {isGenerating ? 'Generating...' : '📄 Download PDF'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ===== EXPORT FOR USE IN OTHER COMPONENTS =====
if (typeof window !== 'undefined') {
    window.WeeklyBoardReportComponents = {
        generateWeeklyBoardPDF,
        downloadWeeklyBoardPDF,
        previewWeeklyBoardPDF,
        WeeklyBoardReportModal,
        REPORT_CONFIG
    };
}
