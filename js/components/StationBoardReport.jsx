// ============================================================================
// STATION BOARD REPORT
// On-screen completion report + PDF export for the Station Task Board.
// Shows % completion per department vs. weekly goal,
// with WIP/Stopped flags and per-module drilldown.
//
// Follows the WeeklyBoardReport pattern already in MODA.
// Requires: jsPDF (loaded in index.html), supabase-station-board.js
// ============================================================================

// ─── Report Config (matches existing MODA brand) ─────────────────────────────
const SBR_CONFIG = {
    companyName: 'Autovol',
    reportTitle: 'Station Board — Module Completion Report',
    colors: {
        primary:   [13, 148, 136],    // Teal
        secondary: [30, 41, 59],      // Navy
        success:   [22, 163, 74],     // Green
        warning:   [202, 138, 4],     // Yellow
        danger:    [220, 38, 38],     // Red
        gray:      [107, 114, 128],
        lightGray: [243, 244, 246],
        white:     [255, 255, 255],
    },
    margins: { top: 15, bottom: 15, left: 15, right: 15 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatWeekLabel(weekStart) {
    if (!weekStart) return '';
    const [y, m, d] = weekStart.split('-').map(Number);
    const mon = new Date(y, m - 1, d);
    const sun = new Date(y, m - 1, d + 6);
    const fmt = dt => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(mon)} – ${fmt(sun)}, ${y}`;
}

function pctColor(pct) {
    if (pct === null) return 'text-gray-400';
    if (pct >= 100)   return 'text-green-600 dark:text-green-400';
    if (pct >= 75)    return 'text-teal-600 dark:text-teal-400';
    if (pct >= 50)    return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
}

function pctBarColor(pct) {
    if (pct === null) return '#d1d5db';
    if (pct >= 100)   return '#16a34a';
    if (pct >= 75)    return '#0d9488';
    if (pct >= 50)    return '#ca8a04';
    return '#dc2626';
}

// ─── PDF Generation ───────────────────────────────────────────────────────────
function generateStationBoardPDF({ reportData, weekStart, generatedBy }) {
    if (!window.jspdf) {
        alert('jsPDF not loaded. Ensure jspdf is in index.html.');
        return;
    }
    const { jsPDF } = window.jspdf;
    const C = SBR_CONFIG.colors;
    const M = SBR_CONFIG.margins;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
    const PW = doc.internal.pageSize.getWidth();
    const PH = doc.internal.pageSize.getHeight();
    const contentW = PW - M.left - M.right;

    let y = M.top;
    let pageNum = 1;

    const addPage = () => {
        doc.addPage();
        pageNum++;
        y = M.top;
        drawHeader();
    };

    const checkY = (needed) => {
        if (y + needed > PH - M.bottom) addPage();
    };

    const drawHeader = () => {
        // Header bar
        doc.setFillColor(...C.secondary);
        doc.rect(M.left, M.top, contentW, 12, 'F');
        doc.setTextColor(...C.white);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(SBR_CONFIG.companyName, M.left + 4, M.top + 8);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(SBR_CONFIG.reportTitle, M.left + 4 + doc.getTextWidth(SBR_CONFIG.companyName + '  '), M.top + 8);
        doc.text(`Week: ${formatWeekLabel(weekStart)}`, PW - M.right - 4, M.top + 8, { align: 'right' });
        y = M.top + 16;
    };

    const drawFooter = () => {
        doc.setFontSize(7);
        doc.setTextColor(...C.gray);
        doc.text(
            `Generated ${new Date().toLocaleString()} ${generatedBy ? '· ' + generatedBy : ''} · Page ${pageNum}`,
            PW / 2, PH - 6, { align: 'center' }
        );
    };

    // ── Page 1: Summary table ──────────────────────────────────────────────
    drawHeader();

    // Section title
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.secondary);
    doc.text('Department Completion Summary', M.left, y + 5);
    y += 10;

    // Column widths
    const cols = {
        dept:      80,
        completed:  40,
        wip:        30,
        stopped:    30,
        goal:       30,
        pct:        40,
    };
    const colX = {
        dept:     M.left,
        completed: M.left + cols.dept,
        wip:       M.left + cols.dept + cols.completed,
        stopped:   M.left + cols.dept + cols.completed + cols.wip,
        goal:      M.left + cols.dept + cols.completed + cols.wip + cols.stopped,
        pct:       M.left + cols.dept + cols.completed + cols.wip + cols.stopped + cols.goal,
    };
    const rowH = 8;

    // Table header
    doc.setFillColor(...C.primary);
    doc.rect(M.left, y, contentW, rowH, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const headers = [
        ['Department', colX.dept + 2, y + 5.5],
        ['Completed', colX.completed + cols.completed / 2, y + 5.5],
        ['WIP', colX.wip + cols.wip / 2, y + 5.5],
        ['Stopped', colX.stopped + cols.stopped / 2, y + 5.5],
        ['Goal', colX.goal + cols.goal / 2, y + 5.5],
        ['% of Goal', colX.pct + cols.pct / 2, y + 5.5],
    ];
    headers.forEach(([text, x, ty], i) => {
        doc.text(text, x, ty, { align: i === 0 ? 'left' : 'center' });
    });
    y += rowH;

    // Table rows
    reportData.forEach((row, idx) => {
        checkY(rowH + 2);
        const bg = idx % 2 === 0 ? C.white : C.lightGray;
        doc.setFillColor(...bg);
        doc.rect(M.left, y, contentW, rowH, 'F');

        doc.setTextColor(...C.secondary);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);

        doc.text(row.departmentName, colX.dept + 2, y + 5.5);
        doc.text(String(row.completedModules), colX.completed + cols.completed / 2, y + 5.5, { align: 'center' });

        // WIP in yellow
        if (row.wipModules > 0) doc.setTextColor(202, 138, 4);
        doc.text(String(row.wipModules), colX.wip + cols.wip / 2, y + 5.5, { align: 'center' });
        doc.setTextColor(...C.secondary);

        // Stopped in red
        if (row.stoppedModules > 0) doc.setTextColor(...C.danger);
        doc.text(String(row.stoppedModules), colX.stopped + cols.stopped / 2, y + 5.5, { align: 'center' });
        doc.setTextColor(...C.secondary);

        doc.text(row.goalModules > 0 ? String(row.goalModules) : '—', colX.goal + cols.goal / 2, y + 5.5, { align: 'center' });

        // Pct with color
        const pct = row.completionPct;
        if (pct !== null) {
            if (pct >= 100)      doc.setTextColor(...C.success);
            else if (pct >= 50)  doc.setTextColor(...C.primary);
            else                 doc.setTextColor(...C.danger);
            doc.setFont('helvetica', 'bold');
            doc.text(`${pct}%`, colX.pct + cols.pct / 2, y + 5.5, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C.secondary);
        } else {
            doc.setTextColor(...C.gray);
            doc.text('No goal set', colX.pct + cols.pct / 2, y + 5.5, { align: 'center' });
            doc.setTextColor(...C.secondary);
        }

        y += rowH;
    });

    // Border around table
    doc.setDrawColor(...C.gray);
    doc.setLineWidth(0.3);
    doc.rect(M.left, M.top + 16 + 10, contentW, y - (M.top + 16 + 10));

    y += 8;

    // Summary stats block
    checkY(20);
    const totalCompleted = reportData.reduce((s, r) => s + r.completedModules, 0);
    const totalWip       = reportData.reduce((s, r) => s + r.wipModules, 0);
    const totalStopped   = reportData.reduce((s, r) => s + r.stoppedModules, 0);
    const depsWithGoals  = reportData.filter(r => r.goalModules > 0);
    const avgPct = depsWithGoals.length > 0
        ? Math.round(depsWithGoals.reduce((s, r) => s + (r.completionPct || 0), 0) / depsWithGoals.length)
        : null;

    doc.setFillColor(...C.lightGray);
    doc.rect(M.left, y, contentW, 14, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.secondary);
    const summaryItems = [
        `Total Completed: ${totalCompleted}`,
        `Total WIP: ${totalWip}`,
        `Total Stopped: ${totalStopped}`,
        avgPct !== null ? `Avg Completion: ${avgPct}%` : 'Avg Completion: —',
    ];
    summaryItems.forEach((text, i) => {
        doc.text(text, M.left + 6 + i * (contentW / 4), y + 9);
    });
    y += 18;

    drawFooter();

    // ── Save ──────────────────────────────────────────────────────────────
    const dateStr = weekStart || new Date().toISOString().slice(0, 10);
    doc.save(`station-board-report-${dateStr}.pdf`);
}

// ─── DeptCard (on-screen) ─────────────────────────────────────────────────────
const DeptCard = ({ row }) => {
    const { useState } = React;
    const [expanded, setExpanded] = useState(false);

    const pct = row.completionPct;
    const barW = pct !== null ? Math.min(100, pct) : 0;

    return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
            <div className="px-4 py-3 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: row.color }} />
                <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex-1">{row.departmentName}</span>

                <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-green-600 dark:text-green-400">{row.completedModules}</span> complete
                    </span>
                    {row.wipModules > 0 && (
                        <span className="text-yellow-600 dark:text-yellow-400 font-semibold">{row.wipModules} WIP</span>
                    )}
                    {row.stoppedModules > 0 && (
                        <span className="text-red-600 dark:text-red-400 font-semibold">{row.stoppedModules} stopped</span>
                    )}
                    <span className="text-gray-400">
                        goal: {row.goalModules > 0 ? row.goalModules : '—'}
                    </span>
                    {pct !== null ? (
                        <span className={`font-bold text-sm ${pctColor(pct)}`}>{pct}%</span>
                    ) : (
                        <span className="text-gray-400 text-sm">—</span>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700">
                <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${barW}%`, backgroundColor: pctBarColor(pct) }}
                />
            </div>
        </div>
    );
};

// ─── Main Report Component ────────────────────────────────────────────────────
const StationBoardReport = ({ weekStart: propWeekStart, currentUser, projectId }) => {
    const { useState, useEffect, useCallback } = React;

    const sb = () => window.MODA_STATION_BOARD;
    const initialWeek = propWeekStart || sb()?.weekStart() || '';

    const [weekStart, setWeekStart]     = useState(initialWeek);
    const [reportData, setReportData]   = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState(null);
    const [exporting, setExporting]     = useState(false);

    const shiftWeek = (weeks) => {
        if (!weekStart) return;
        const [y, m, d] = weekStart.split('-').map(Number);
        const dt = new Date(y, m - 1, d + weeks * 7);
        const ny = dt.getFullYear();
        const nm = String(dt.getMonth() + 1).padStart(2, '0');
        const nd = String(dt.getDate()).padStart(2, '0');
        setWeekStart(`${ny}-${nm}-${nd}`);
    };

    const load = useCallback(async () => {
        if (!sb()) return;
        setLoading(true);
        setError(null);
        try {
            const data = await sb().getWeeklyReport(weekStart);
            setReportData(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [weekStart]);

    useEffect(() => { load(); }, [load]);

    const handleExportPDF = async () => {
        setExporting(true);
        try {
            generateStationBoardPDF({
                reportData,
                weekStart,
                generatedBy: currentUser?.email,
            });
        } catch (e) {
            alert('PDF export failed: ' + e.message);
        } finally {
            setExporting(false);
        }
    };

    // Summary stats
    const totalCompleted  = reportData.reduce((s, r) => s + r.completedModules, 0);
    const totalWip        = reportData.reduce((s, r) => s + r.wipModules, 0);
    const totalStopped    = reportData.reduce((s, r) => s + r.stoppedModules, 0);
    const depsWithGoals   = reportData.filter(r => r.goalModules > 0);
    const avgPct = depsWithGoals.length > 0
        ? Math.round(depsWithGoals.reduce((s, r) => s + (r.completionPct || 0), 0) / depsWithGoals.length)
        : null;

    return (
        <div className="p-4 ">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Station Board Report</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Module completion % by department</p>
                </div>
                <div className="flex-1" />
                {/* Week nav */}
                <div className="flex items-center gap-2">
                    <button onClick={() => shiftWeek(-1)} className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">◀</button>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 min-w-[200px] text-center">{formatWeekLabel(weekStart)}</span>
                    <button onClick={() => shiftWeek(1)}  className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">▶</button>
                </div>
                <button
                    onClick={handleExportPDF}
                    disabled={loading || exporting || reportData.length === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {exporting ? (
                        <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> Exporting…</>
                    ) : (
                        <>⬇ Export PDF</>
                    )}
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full" />
                    <span className="ml-3 text-gray-500">Loading report…</span>
                </div>
            ) : error ? (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
                    {error} <button onClick={load} className="ml-2 underline">Retry</button>
                </div>
            ) : (
                <>
                    {/* Summary stat strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        {[
                            { label: 'Modules Completed', value: totalCompleted, color: 'text-green-600 dark:text-green-400' },
                            { label: 'In Progress (WIP)',  value: totalWip,       color: 'text-yellow-600 dark:text-yellow-400' },
                            { label: 'Stopped',            value: totalStopped,   color: 'text-red-600 dark:text-red-400' },
                            { label: 'Avg Completion',     value: avgPct !== null ? `${avgPct}%` : '—', color: pctColor(avgPct) },
                        ].map(stat => (
                            <div key={stat.label} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-center">
                                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Dept cards */}
                    {reportData.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">No data for this week yet.</div>
                    ) : (
                        <div className="space-y-3">
                            {reportData.map(row => (
                                <DeptCard key={row.departmentId} row={row} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// Export for MODA App.jsx
window.StationBoardReport = StationBoardReport;
