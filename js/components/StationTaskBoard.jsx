// ============================================================================
// STATION TASK BOARD v3 — Session C Full Rebuild
// Production board with 4 tabs: Daily Board | Week Setup | Handoff Report | Admin
//
// Requires: supabase-station-board.js (window.MODA_STATION_BOARD)
//           supabase-supervisors.js (window.MODA_SUPERVISORS)
// Props: { currentUser, modules, projectId }
// ============================================================================

const { useState, useEffect, useCallback, useMemo, useRef } = React;

// ─── Constants ─────────────────────────────────────────────────────────────
const STB_STATUSES = {
    not_started: { label: 'Not Started', short: '--',   color: 'gray',   bg: 'bg-gray-100 dark:bg-gray-800',        text: 'text-gray-500 dark:text-gray-400',         ring: '', btnBg: 'bg-gray-200 dark:bg-gray-700' },
    wip:         { label: 'WIP',         short: 'WIP',  color: 'yellow', bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300',      ring: 'ring-2 ring-yellow-400', btnBg: 'bg-yellow-400 dark:bg-yellow-600' },
    complete:    { label: 'Complete',    short: 'Done', color: 'green',  bg: 'bg-green-100 dark:bg-green-900/40',   text: 'text-green-700 dark:text-green-300',        ring: 'ring-2 ring-green-500', btnBg: 'bg-green-500 dark:bg-green-600' },
    stopped:     { label: 'Stopped',     short: 'Stop', color: 'red',    bg: 'bg-red-100 dark:bg-red-900/40',       text: 'text-red-700 dark:text-red-300',            ring: 'ring-2 ring-red-500', btnBg: 'bg-red-500 dark:bg-red-600' },
    na:          { label: 'N/A',         short: 'N/A',  color: 'slate',  bg: 'bg-slate-50 dark:bg-slate-900',       text: 'text-slate-400 dark:text-slate-500 italic', ring: '', btnBg: 'bg-slate-300 dark:bg-slate-600' },
};

const STATUS_ORDER = ['not_started', 'wip', 'complete', 'stopped', 'na'];
const ADMIN_EMAILS = ['trevor@autovol.com', 'stephanie@autovol.com'];
const SHIFT1_DAYS = [0, 1, 2, 3]; // Mon-Thu (dayIndex)
const SHIFT2_DAYS = [4, 5, 6];    // Fri-Sun (dayIndex)

// ─── Helpers ───────────────────────────────────────────────────────────────
function stbIsAdmin(user) {
    if (!user) return false;
    if (user.dashboard_role === 'admin') return true;
    if (ADMIN_EMAILS.includes(user.email)) return true;
    return false;
}

function stbGetCurrentWeekStart() {
    var now = new Date();
    var day = now.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    var mon = new Date(now);
    mon.setDate(now.getDate() + diff);
    return stbFormatDate(mon);
}

function stbFormatDate(dt) {
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}

function stbParseDate(str) {
    if (!str) return new Date();
    var parts = str.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

function stbWeekDates(ws) {
    if (!ws) return [];
    var mon = stbParseDate(ws);
    var labels = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    var result = [];
    for (var i = 0; i < 7; i++) {
        var dt = new Date(mon);
        dt.setDate(mon.getDate() + i);
        result.push({ date: stbFormatDate(dt), label: labels[i], dayNum: dt.getDate(), dayIndex: i });
    }
    return result;
}

function stbWeekLabel(ws) {
    if (!ws) return '';
    var mon = stbParseDate(ws);
    var sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    function fmt(dt) { return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    return fmt(mon) + ' – ' + fmt(sun) + ', ' + mon.getFullYear();
}

function stbShiftWeek(ws, delta) {
    var mon = stbParseDate(ws);
    mon.setDate(mon.getDate() + delta * 7);
    return stbFormatDate(mon);
}

function stbToday() {
    return stbFormatDate(new Date());
}

function safeWeekStart(val) {
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    var SB = window.MODA_STATION_BOARD;
    if (SB && SB.weekStart) return SB.weekStart();
    return stbGetCurrentWeekStart();
}

function stbCalcCompletionPct(tasks, completionMap, moduleSerial, deptId) {
    if (!tasks || tasks.length === 0) return 0;
    var total = 0;
    var done = 0;
    for (var i = 0; i < tasks.length; i++) {
        var key = moduleSerial + '|' + deptId + '|' + tasks[i].id;
        var status = completionMap[key] || 'not_started';
        if (status === 'na') continue;
        total++;
        if (status === 'complete') done++;
    }
    return total === 0 ? 100 : Math.round((done / total) * 100);
}

function stbCalcDeptDayPct(moduleSerials, tasks, completionMap, deptId) {
    if (!moduleSerials || moduleSerials.length === 0 || !tasks || tasks.length === 0) return 0;
    var totalPct = 0;
    for (var i = 0; i < moduleSerials.length; i++) {
        totalPct += stbCalcCompletionPct(tasks, completionMap, moduleSerials[i], deptId);
    }
    return Math.round(totalPct / moduleSerials.length);
}

// ─── StatusPickerModal (Bottom Sheet) ──────────────────────────────────────
function StatusPickerModal(props) {
    var isOpen = props.isOpen;
    var onSelect = props.onSelect;
    var onClose = props.onClose;
    var currentStatus = props.currentStatus;
    var taskName = props.taskName;

    if (!isOpen) return null;

    function handleSelect(status) {
        onSelect(status);
        onClose();
    }

    function handleBackdropClick() {
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={handleBackdropClick}>
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-t-2xl p-4 pb-8 shadow-2xl" onClick={function(e) { e.stopPropagation(); }}>
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">{taskName || 'Set Status'}</p>
                <div className="grid grid-cols-5 gap-2">
                    {STATUS_ORDER.map(function(statusKey) {
                        var s = STB_STATUSES[statusKey];
                        var isActive = statusKey === currentStatus;
                        return (
                            <button
                                key={statusKey}
                                onClick={function() { handleSelect(statusKey); }}
                                className={'flex flex-col items-center justify-center min-h-[56px] rounded-xl font-semibold text-xs transition-all ' + s.bg + ' ' + s.text + ' ' + (isActive ? 'ring-2 ring-offset-2 ring-blue-500 scale-105' : 'hover:scale-105')}
                            >
                                {s.short}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── LoadingSpinner ────────────────────────────────────────────────────────
function STBSpinner(props) {
    var size = props.size || 'md';
    var cls = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
    return (
        <div className={'animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 ' + cls} />
    );
}

// ─── EmptyState ────────────────────────────────────────────────────────────
function STBEmpty(props) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-3 text-gray-300 dark:text-gray-600">{props.icon || '—'}</div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{props.message || 'No data'}</p>
            {props.children}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: DAILY BOARD — iPad Optimized (Option B)
// Two-column layout: Left=dept list+module pills, Right=task checklist
// Phone portrait: stacks vertically
// ═══════════════════════════════════════════════════════════════════════════

function DailyBoardStatusIcon(props) {
    var status = props.status;
    var size = props.size || 20;
    var colors = { complete: '#16a34a', wip: '#f59e0b', not_started: '#9ca3af', stopped: '#dc2626', na: '#94a3b8' };
    var color = colors[status] || colors.not_started;

    if (status === 'complete') {
        return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
            React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
            React.createElement('path', { d: 'M9 12l2 2 4-4' })
        );
    }
    if (status === 'wip') {
        return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round', strokeDasharray: '3 3' },
            React.createElement('circle', { cx: 12, cy: 12, r: 10 })
        );
    }
    if (status === 'stopped') {
        return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
            React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
            React.createElement('path', { d: 'M15 9l-6 6' }),
            React.createElement('path', { d: 'M9 9l6 6' })
        );
    }
    if (status === 'na') {
        return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.5, strokeLinecap: 'round' },
            React.createElement('path', { d: 'M5 12h14' })
        );
    }
    // not_started
    return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' },
        React.createElement('circle', { cx: 12, cy: 12, r: 10 })
    );
}

function DailyBoardTab(props) {
    var currentUser = props.currentUser;
    var modules = props.modules;
    var weekSchedule = props.weekSchedule;
    var shifts = props.shifts;
    var lineDepts = props.lineDepts;
    var allTasks = props.allTasks;
    var completions = props.completions;
    var supervisorProfile = props.supervisorProfile;
    var onUpdateCompletion = props.onUpdateCompletion;
    var loading = props.loading;

    var [selectedDay, setSelectedDay] = useState(stbToday());
    var [selectedDept, setSelectedDept] = useState(null);
    var [selectedModule, setSelectedModule] = useState(null);
    var [inlinePickerTask, setInlinePickerTask] = useState(null);
    var [saving, setSaving] = useState({});
    var [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

    var isAdmin = stbIsAdmin(currentUser);
    var weekStart = weekSchedule ? weekSchedule.week_start : null;
    var weekDays = useMemo(function() { return stbWeekDates(weekStart); }, [weekStart]);

    // Determine which days this user can see
    var visibleDays = useMemo(function() {
        if (isAdmin) return weekDays;
        if (!supervisorProfile || !supervisorProfile.shift_id) return weekDays;
        var shiftName = (supervisorProfile.shift_name || '').toLowerCase();
        if (shiftName.includes('2') || shiftName.includes('night')) {
            return weekDays.filter(function(d) { return SHIFT2_DAYS.includes(d.dayIndex); });
        }
        return weekDays.filter(function(d) { return SHIFT1_DAYS.includes(d.dayIndex); });
    }, [weekDays, isAdmin, supervisorProfile]);

    // Set selected day to today if within visible days, else first visible day
    useEffect(function() {
        var today = stbToday();
        var inVisible = visibleDays.some(function(d) { return d.date === today; });
        if (inVisible) {
            setSelectedDay(today);
        } else if (visibleDays.length > 0) {
            setSelectedDay(visibleDays[0].date);
        }
    }, [visibleDays]);

    // Determine visible departments
    var visibleDepts = useMemo(function() {
        if (!lineDepts) return [];
        if (isAdmin) return lineDepts;
        if (!supervisorProfile || !supervisorProfile.departments) return lineDepts;
        var assignedIds = supervisorProfile.departments.map(function(d) { return d.department_id; });
        return lineDepts.filter(function(dept) { return assignedIds.includes(dept.id); });
    }, [lineDepts, isAdmin, supervisorProfile]);

    // Auto-select first dept
    useEffect(function() {
        if (visibleDepts.length > 0 && !selectedDept) {
            setSelectedDept(visibleDepts[0].id);
        }
    }, [visibleDepts]);

    // Build completion map for selected day: key = "moduleSerial|deptId|taskId" -> status
    var dayCompletions = useMemo(function() {
        var map = {};
        if (!completions) return map;
        for (var i = 0; i < completions.length; i++) {
            var c = completions[i];
            if (c.target_date === selectedDay) {
                var key = c.module_serial + '|' + c.department_id + '|' + c.task_id;
                map[key] = c.status;
            }
        }
        return map;
    }, [completions, selectedDay]);

    // Get modules assigned to a dept on selected day
    function getModulesForDeptDay(deptId) {
        if (!weekSchedule || !weekSchedule.assignments) return [];
        var filtered = weekSchedule.assignments.filter(function(a) {
            return a.department_id === deptId && a.target_date === selectedDay;
        });
        return filtered.map(function(a) {
            var mod = modules.find(function(m) { return m.serialNumber === a.module_serial; });
            return { serial: a.module_serial, blm: mod ? (mod.hitchBLM || '') : '', unitType: mod ? (mod.unitType || '') : '', module: mod };
        });
    }

    // Get tasks for a department
    function getTasksForDept(deptId) {
        if (!allTasks) return [];
        return allTasks.filter(function(t) { return t.department_id === deptId; });
    }

    // Computed: modules for currently selected dept
    var deptModules = useMemo(function() {
        if (!selectedDept) return [];
        return getModulesForDeptDay(selectedDept);
    }, [selectedDept, selectedDay, weekSchedule, modules]);

    // Auto-select first module when dept changes or day changes
    useEffect(function() {
        if (deptModules.length > 0) {
            setSelectedModule(deptModules[0].serial);
        } else {
            setSelectedModule(null);
        }
        setInlinePickerTask(null);
    }, [selectedDept, selectedDay, deptModules.length]);

    // Selected dept object
    var selectedDeptObj = useMemo(function() {
        if (!selectedDept || !visibleDepts) return null;
        return visibleDepts.find(function(d) { return d.id === selectedDept; }) || null;
    }, [selectedDept, visibleDepts]);

    // Tasks for current dept
    var deptTasks = useMemo(function() {
        if (!selectedDept) return [];
        return getTasksForDept(selectedDept);
    }, [selectedDept, allTasks]);

    // Current module info
    var currentModInfo = useMemo(function() {
        if (!selectedModule || !deptModules) return null;
        return deptModules.find(function(m) { return m.serial === selectedModule; }) || null;
    }, [selectedModule, deptModules]);

    // Dept completion stats
    var deptStats = useMemo(function() {
        if (!selectedDept || !deptModules || deptModules.length === 0) return { complete: 0, total: 0, pct: 0 };
        var complete = 0;
        for (var i = 0; i < deptModules.length; i++) {
            var pct = stbCalcCompletionPct(deptTasks, dayCompletions, deptModules[i].serial, selectedDept);
            if (pct === 100) complete++;
        }
        var total = deptModules.length;
        return { complete: complete, total: total, pct: total === 0 ? 0 : Math.round((complete / total) * 100) };
    }, [selectedDept, deptModules, deptTasks, dayCompletions]);

    // Handle dept selection
    function handleSelectDept(deptId) {
        setSelectedDept(deptId);
        setInlinePickerTask(null);
    }

    // Handle module selection
    function handleSelectModule(serial) {
        setSelectedModule(serial);
        setInlinePickerTask(null);
    }

    // Handle inline picker toggle
    function handleToggleInlinePicker(taskId) {
        setInlinePickerTask(function(prev) { return prev === taskId ? null : taskId; });
    }

    // Handle status change with optimistic update
    function handleStatusChange(taskId, newStatus) {
        if (!selectedModule || !selectedDept) return;
        var key = selectedModule + '|' + selectedDept + '|' + taskId;
        setSaving(function(prev) { var n = Object.assign({}, prev); n[key] = true; return n; });
        setInlinePickerTask(null);

        onUpdateCompletion({
            weekStartDate: weekStart,
            targetDate: selectedDay,
            departmentId: selectedDept,
            moduleSerial: selectedModule,
            taskId: taskId,
            status: newStatus,
        }).then(function() {
            setSaving(function(prev) { var n = Object.assign({}, prev); delete n[key]; return n; });
        }).catch(function() {
            setSaving(function(prev) { var n = Object.assign({}, prev); delete n[key]; return n; });
        });
    }

    // Selected day label for summary
    var selectedDayObj = useMemo(function() {
        return visibleDays.find(function(d) { return d.date === selectedDay; }) || null;
    }, [visibleDays, selectedDay]);

    var selectedDayLabel = useMemo(function() {
        if (!selectedDayObj) return '';
        var dt = stbParseDate(selectedDay);
        return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }, [selectedDayObj, selectedDay]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <STBSpinner size="lg" />
            </div>
        );
    }

    if (!weekSchedule) {
        return (
            <STBEmpty icon="!" message="No week scheduled -- contact admin to set up the week." />
        );
    }

    // ─── DAY SELECTOR ────────────────────────────────────────────────────────
    var daySelector = (
        <div className="px-2 py-2 overflow-x-auto bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-1 min-w-max">
                {visibleDays.map(function(day) {
                    var isToday = day.date === stbToday();
                    var isSelected = day.date === selectedDay;
                    var isShift1 = SHIFT1_DAYS.includes(day.dayIndex);
                    var baseCls = 'flex flex-col items-center justify-center min-w-[60px] min-h-[48px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all';
                    var colorCls;
                    if (isSelected) {
                        colorCls = isShift1 ? 'bg-blue-600 text-white shadow-lg' : 'bg-orange-500 text-white shadow-lg';
                    } else if (isToday) {
                        colorCls = isShift1 ? 'border-2 border-blue-400 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30' : 'border-2 border-orange-400 text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30';
                    } else {
                        colorCls = isShift1 ? 'border border-blue-200 dark:border-blue-800 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'border border-orange-200 dark:border-orange-800 text-gray-600 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20';
                    }
                    return (
                        <button
                            key={day.date}
                            onClick={function() { setSelectedDay(day.date); }}
                            className={baseCls + ' ' + colorCls}
                        >
                            <span className="text-[10px] uppercase tracking-wide">{day.label}</span>
                            <span className="text-lg font-bold leading-tight">{day.dayNum}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    // ─── LEFT PANEL: Department list ─────────────────────────────────────────
    var leftPanel = (
        <div className="flex flex-col h-full" style={{ width: '280px', minWidth: '280px' }}>
            {/* Department list - scrollable */}
            <div className="flex-1 overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                {visibleDepts.length === 0 && (
                    <div className="p-4 text-xs text-gray-400 italic text-center">No departments</div>
                )}
                {visibleDepts.map(function(dept) {
                    var isActive = dept.id === selectedDept;
                    var deptMods = getModulesForDeptDay(dept.id);
                    var dTasks = getTasksForDept(dept.id);
                    var completeCount = 0;
                    for (var i = 0; i < deptMods.length; i++) {
                        if (stbCalcCompletionPct(dTasks, dayCompletions, deptMods[i].serial, dept.id) === 100) completeCount++;
                    }
                    var dPct = deptMods.length === 0 ? 0 : Math.round((completeCount / deptMods.length) * 100);
                    var borderStyle = isActive ? { borderLeft: '4px solid ' + (dept.color || '#6366f1') } : { borderLeft: '4px solid transparent' };

                    return (
                        <button
                            key={dept.id}
                            onClick={function() { handleSelectDept(dept.id); }}
                            className={'w-full flex flex-col gap-1 px-3 py-3 min-h-[52px] text-left transition-all ' + (isActive ? 'bg-white dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800')}
                            style={borderStyle}
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color || '#6366f1' }} />
                                <span className={'text-sm font-semibold ' + (isActive ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300')}>{dept.name}</span>
                            </div>
                            <div className="flex items-center gap-2 pl-5">
                                <span className="text-xs text-gray-500 dark:text-gray-400">{completeCount}/{deptMods.length} complete</span>
                                <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-300" style={{ width: dPct + '%', backgroundColor: dPct === 100 ? '#16a34a' : dPct > 50 ? '#0d9488' : dPct > 0 ? '#f59e0b' : '#e5e7eb' }} />
                                </div>
                                <span className="text-[10px] font-mono text-gray-500 w-8 text-right">{dPct}%</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    // ─── RIGHT PANEL: Task checklist ─────────────────────────────────────────
    var rightPanel = (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-800">
            {/* Header: dept summary + module info */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                    {/* Module info */}
                    {currentModInfo ? (
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-gray-900 dark:text-white">{currentModInfo.serial}</span>
                                {currentModInfo.blm && (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{currentModInfo.blm}</span>
                                )}
                            </div>
                            {currentModInfo.unitType && (
                                <span className="text-xs text-gray-400">{currentModInfo.unitType}</span>
                            )}
                        </div>
                    ) : (
                        <span className="text-sm text-gray-400 italic">Select a module</span>
                    )}

                    {/* Dept day summary */}
                    <div className="text-right">
                        <div className="text-2xl font-bold" style={{ color: deptStats.pct === 100 ? '#16a34a' : deptStats.pct > 50 ? '#0d9488' : deptStats.pct > 0 ? '#f59e0b' : '#9ca3af' }}>
                            {deptStats.pct}%
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                            {selectedDeptObj ? selectedDeptObj.name : ''} {selectedDayLabel ? ' \u00B7 ' + selectedDayLabel : ''} {' \u00B7 '} {deptStats.complete}/{deptStats.total} modules
                        </div>
                    </div>
                </div>

                {/* Module navigation tiles */}
                {deptModules.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 relative">
                        {(deptModules.length <= 4 ? deptModules : deptModules.slice(0, 3)).map(function(modInfo) {
                            var isModActive = modInfo.serial === selectedModule;
                            var modPct = stbCalcCompletionPct(deptTasks, dayCompletions, modInfo.serial, selectedDept);
                            var deptColor = selectedDeptObj ? (selectedDeptObj.color || '#6366f1') : '#6366f1';
                            var dotColor = modPct === 100 ? '#16a34a' : modPct > 0 ? '#f59e0b' : '#9ca3af';
                            var tileStyle = isModActive ? { backgroundColor: deptColor, color: '#fff', padding: '5px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 500 } : { padding: '5px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, border: '1px solid #d1d5db' };
                            return (
                                <button key={modInfo.serial} onClick={function() { handleSelectModule(modInfo.serial); }} style={tileStyle} className={'flex items-center gap-1.5 transition-all ' + (isModActive ? '' : 'text-gray-600 dark:text-gray-300 dark:border-gray-600')}>
                                    {!isModActive && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />}
                                    {modInfo.serial}
                                </button>
                            );
                        })}
                        {deptModules.length > 4 && (
                            <div className="relative">
                                <button onClick={function() { setMoreDropdownOpen(function(v) { return !v; }); }} style={{ padding: '5px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, border: '1px solid #d1d5db' }} className="text-gray-600 dark:text-gray-300 dark:border-gray-600 transition-all">
                                    More &#9660;
                                </button>
                                {moreDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-[120px]">
                                        {deptModules.slice(3).map(function(modInfo) {
                                            var isModActive = modInfo.serial === selectedModule;
                                            var modPct = stbCalcCompletionPct(deptTasks, dayCompletions, modInfo.serial, selectedDept);
                                            var dotColor = modPct === 100 ? '#16a34a' : modPct > 0 ? '#f59e0b' : '#9ca3af';
                                            return (
                                                <button key={modInfo.serial} onClick={function() { handleSelectModule(modInfo.serial); setMoreDropdownOpen(false); }} className={'w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 ' + (isModActive ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300')}>
                                                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                                                    {modInfo.serial}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Module-level completion bar */}
                {currentModInfo && (
                    <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-300" style={{ width: stbCalcCompletionPct(deptTasks, dayCompletions, currentModInfo.serial, selectedDept) + '%', backgroundColor: selectedDeptObj ? (selectedDeptObj.color || '#6366f1') : '#6366f1' }} />
                        </div>
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{stbCalcCompletionPct(deptTasks, dayCompletions, currentModInfo.serial, selectedDept)}%</span>
                    </div>
                )}
            </div>

            {/* Task list - scrollable */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {!selectedModule && (
                    <STBEmpty message="Select a department and module to view tasks" />
                )}
                {selectedModule && deptTasks.length === 0 && (
                    <STBEmpty message="No tasks configured for this department" />
                )}
                {selectedModule && deptTasks.map(function(task) {
                    var cKey = selectedModule + '|' + selectedDept + '|' + task.id;
                    var status = dayCompletions[cKey] || 'not_started';
                    var isSaving = !!saving[cKey];

                    return (
                        <div key={task.id} className={'px-3 py-2 rounded-lg ' + (isSaving ? 'opacity-50' : '')}>
                            {/* Task name */}
                            <div className="flex items-center gap-2 mb-1">
                                <span className="flex-shrink-0">
                                    {isSaving ? <STBSpinner size="sm" /> : <DailyBoardStatusIcon status={status} size={18} />}
                                </span>
                                <span style={{ fontSize: '15px' }} className="text-gray-800 dark:text-gray-200">{task.task_name}</span>
                            </div>
                            {/* Always-visible status buttons */}
                            <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                <button
                                    onClick={function() { handleStatusChange(task.id, 'not_started'); }}
                                    disabled={isSaving}
                                    style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', minHeight: '36px' }}
                                    className={'flex-1 font-semibold transition-all ' + (status === 'not_started' ? 'bg-gray-500 text-white' : 'bg-transparent border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700')}
                                >
                                    --
                                </button>
                                <button
                                    onClick={function() { handleStatusChange(task.id, 'wip'); }}
                                    disabled={isSaving}
                                    style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', minHeight: '36px' }}
                                    className={'flex-1 font-semibold transition-all ' + (status === 'wip' ? 'bg-amber-500 text-white' : 'bg-transparent border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30')}
                                >
                                    WIP
                                </button>
                                <button
                                    onClick={function() { handleStatusChange(task.id, 'complete'); }}
                                    disabled={isSaving}
                                    style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', minHeight: '36px' }}
                                    className={'flex-1 font-semibold transition-all ' + (status === 'complete' ? 'bg-green-600 text-white' : 'bg-transparent border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30')}
                                >
                                    Complete
                                </button>
                                <button
                                    onClick={function() { handleStatusChange(task.id, 'stopped'); }}
                                    disabled={isSaving}
                                    style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', minHeight: '36px' }}
                                    className={'flex-1 font-semibold transition-all ' + (status === 'stopped' ? 'bg-red-600 text-white' : 'bg-transparent border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30')}
                                >
                                    Stop
                                </button>
                                <button
                                    onClick={function() { handleStatusChange(task.id, 'na'); }}
                                    disabled={isSaving}
                                    style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px', minHeight: '36px' }}
                                    className={'flex-1 font-semibold italic transition-all ' + (status === 'na' ? 'bg-slate-400 text-white' : 'bg-transparent border border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800')}
                                >
                                    N/A
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // ─── MOBILE LAYOUT (phone portrait): stack vertically ────────────────────
    // ─── TABLET/DESKTOP: two-column side by side ─────────────────────────────
    return (
        <div className="flex flex-col h-full">
            {daySelector}

            {/* Two-column for md+ (iPad landscape), stacked for sm (phone) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* On phone: show dept list, then module pills, then tasks stacked */}
                <div className="md:hidden flex flex-col overflow-y-auto flex-1">
                    {/* Dept horizontal scroll on mobile */}
                    <div className="overflow-x-auto px-2 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                        <div className="flex gap-1.5 min-w-max">
                            {visibleDepts.map(function(dept) {
                                var isActive = dept.id === selectedDept;
                                return (
                                    <button
                                        key={dept.id}
                                        onClick={function() { handleSelectDept(dept.id); }}
                                        className={'flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg text-xs font-semibold whitespace-nowrap transition-all ' + (isActive ? 'bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-300 dark:ring-gray-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400')}
                                    >
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dept.color || '#6366f1' }} />
                                        {dept.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {/* Tasks on mobile */}
                    {rightPanel}
                </div>

                {/* Desktop / iPad landscape: side by side */}
                <div className="hidden md:flex flex-1 overflow-hidden">
                    {leftPanel}
                    {rightPanel}
                </div>
            </div>
        </div>
    );
}

// ─── buildDailyOverrides helper ────────────────────────────────────────────
function buildDailyOverrides(depts, weekStart, dailyQtys) {
    var dates = stbWeekDates(weekStart);
    var dayNames = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    var dayKeyMap = { monday:'mon', tuesday:'tue', wednesday:'wed', thursday:'thu', friday:'fri', saturday:'sat', sunday:'sun' };
    var overrides = {};
    for (var di = 0; di < depts.length; di++) {
        for (var i = 0; i < dates.length; i++) {
            var dayKey = dayKeyMap[dayNames[i]];
            var qty = dailyQtys[dayKey];
            overrides[depts[di].id + '|' + dates[i].date] = qty != null ? qty : 5;
        }
    }
    return overrides;
}

// ─── Week status helpers ────────────────────────────────────────────────────
var WEEK_STATUS_CFG = {
    not_set_up:        { label: 'Not Set Up',        bg: 'bg-gray-100 dark:bg-gray-700',         text: 'text-gray-500 dark:text-gray-400' },
    active:            { label: 'Active',             bg: 'bg-teal-100 dark:bg-teal-900/40',      text: 'text-teal-700 dark:text-teal-300' },
    shift_1_complete:  { label: 'Shift 1 Complete',   bg: 'bg-orange-100 dark:bg-orange-900/40',  text: 'text-orange-700 dark:text-orange-300' },
    complete:          { label: 'Complete',            bg: 'bg-green-100 dark:bg-green-900/40',    text: 'text-green-700 dark:text-green-300' },
};

function weekStatusBadge(status) {
    var cfg = WEEK_STATUS_CFG[status] || WEEK_STATUS_CFG.not_set_up;
    return cfg;
}

// ─── Lookup module serial by index in sorted array ──────────────────────────
function lookupSerial(sortedMods, idx) {
    if (!sortedMods || idx < 0 || idx >= sortedMods.length) return '---';
    return sortedMods[idx].serialNumber || '---';
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: WEEK SETUP (Admin only) — Rolling 4-week view
// ═══════════════════════════════════════════════════════════════════════════

// ─── Single Week Card (expandable) ──────────────────────────────────────────
function WeekCard(props) {
    var weekStart = props.weekStart;
    var weekIdx = props.weekIdx;
    var schedule = props.schedule;
    var allModules = props.allModules;
    var lineDepts = props.lineDepts;
    var shifts = props.shifts;
    var projectId = props.projectId;
    var onRefresh = props.onRefresh;
    var prevWeekSerial = props.prevWeekSerial;
    var prevWeekTotal = props.prevWeekTotal;
    var onQtysChange = props.onQtysChange;

    var [expanded, setExpanded] = useState(props.defaultExpanded || false);
    var [startSerial, setStartSerial] = useState('');
    var [dailyQtys, setDailyQtys] = useState({ mon: 5, tue: 5, wed: 5, thu: 5, fri: 2, sat: 2, sun: 2 });
    var [saving, setSaving] = useState(false);
    var [completing, setCompleting] = useState(false);
    var [error, setError] = useState('');
    var [success, setSuccess] = useState('');
    var [serialSuggestions, setSerialSuggestions] = useState([]);
    var [showSuggestions, setShowSuggestions] = useState(false);
    var suggestRef = useRef(null);

    var status = schedule ? (schedule.status || 'active') : 'not_set_up';
    var statusCfg = weekStatusBadge(status);
    var dates = stbWeekDates(weekStart);

    // Sort modules by buildSequence for index lookups
    var sortedMods = useMemo(function() {
        if (!allModules || allModules.length === 0) return [];
        return [].concat(allModules).sort(function(a, b) {
            return (a.buildSequence || 0) - (b.buildSequence || 0);
        });
    }, [allModules]);

    // Load from schedule if exists, otherwise auto-calculate from previous week
    useEffect(function() {
        if (schedule) {
            setStartSerial(schedule.starting_serial || '');
            if (schedule.line_balance) {
                // If we have daily targets stored, they'd come from a separate query
                // For now use line_balance as default
                setDailyQtys({ mon: schedule.line_balance, tue: schedule.line_balance, wed: schedule.line_balance, thu: schedule.line_balance, fri: 2, sat: 2, sun: 2 });
            }
        } else if (prevWeekSerial && prevWeekTotal > 0 && sortedMods.length > 0) {
            // Auto-calculate: find prev serial index, add prev total
            var prevIdx = sortedMods.findIndex(function(m) {
                return (m.serialNumber || '').toString().trim() === (prevWeekSerial || '').toString().trim();
            });
            if (prevIdx !== -1) {
                var nextIdx = prevIdx + prevWeekTotal;
                if (nextIdx < sortedMods.length) {
                    setStartSerial(sortedMods[nextIdx].serialNumber || '');
                }
            }
        }
    }, [schedule, prevWeekSerial, prevWeekTotal, sortedMods]);

    // Notify parent of qty changes for cascade calculation
    var totalWeekQty = dailyQtys.mon + dailyQtys.tue + dailyQtys.wed + dailyQtys.thu + dailyQtys.fri + dailyQtys.sat + dailyQtys.sun;
    useEffect(function() {
        if (onQtysChange) onQtysChange(weekIdx, startSerial, totalWeekQty);
    }, [startSerial, totalWeekQty]);

    // Shift calculations
    var shift1Total = dailyQtys.mon + dailyQtys.tue + dailyQtys.wed + dailyQtys.thu;
    var shift2Total = dailyQtys.fri + dailyQtys.sat + dailyQtys.sun;
    var startIdx = sortedMods.findIndex(function(m) {
        return (m.serialNumber || '').toString().trim() === (startSerial || '').toString().trim();
    });

    var shift1First = startIdx !== -1 ? lookupSerial(sortedMods, startIdx) : '---';
    var shift1Last = startIdx !== -1 ? lookupSerial(sortedMods, startIdx + shift1Total - 1) : '---';
    var shift2First = startIdx !== -1 ? lookupSerial(sortedMods, startIdx + shift1Total) : '---';
    var shift2Last = startIdx !== -1 ? lookupSerial(sortedMods, startIdx + totalWeekQty - 1) : '---';

    // Serial autocomplete
    function handleSerialInput(e) {
        var val = e.target.value;
        setStartSerial(val);
        if (val.length >= 2 && allModules) {
            var matches = allModules.filter(function(m) {
                return (m.serialNumber || '').toLowerCase().includes(val.toLowerCase());
            }).slice(0, 8);
            setSerialSuggestions(matches);
            setShowSuggestions(matches.length > 0);
        } else {
            setShowSuggestions(false);
        }
    }

    function handlePickSerial(sn) {
        setStartSerial(sn);
        setShowSuggestions(false);
    }

    function handleQtyChange(dayKey, value) {
        var val = parseInt(value) || 0;
        setDailyQtys(function(prev) {
            var next = Object.assign({}, prev);
            next[dayKey] = val;
            return next;
        });
    }

    // Save Week
    function handleSave() {
        if (!startSerial) { setError('Enter a starting serial number'); return; }
        setSaving(true);
        setError('');
        setSuccess('');

        var SB = window.MODA_STATION_BOARD;
        if (!SB) { setError('Station board data layer not loaded'); setSaving(false); return; }

        // 1. Upsert schedule
        SB.upsertWeeklySchedule({
            weekStartDate: safeWeekStart(weekStart),
            startingSerial: startSerial,
            lineBalance: dailyQtys.mon,
        }).then(function() {
            // 2. Upsert daily targets for each dept/day
            var targetPromises = [];
            if (lineDepts && lineDepts.length > 0) {
                var dayKeys = ['mon','tue','wed','thu','fri','sat','sun'];
                for (var di = 0; di < lineDepts.length; di++) {
                    for (var i = 0; i < dates.length; i++) {
                        targetPromises.push(SB.upsertDailyTarget({
                            weekStartDate: safeWeekStart(weekStart),
                            departmentId: lineDepts[di].id,
                            targetDate: dates[i].date,
                            moduleCount: dailyQtys[dayKeys[i]],
                        }));
                    }
                }
            }
            return Promise.all(targetPromises);
        }).then(function() {
            // 3. Generate assignments
            return SB.generateWeekAssignments({
                weekStartDate: safeWeekStart(weekStart),
                startingSerial: startSerial,
                lineBalance: dailyQtys.mon,
                modules: allModules || [],
                departments: lineDepts || [],
                shifts: shifts || [],
                dailyOverrides: buildDailyOverrides(lineDepts || [], weekStart, dailyQtys),
            });
        }).then(function(result) {
            // Re-fetch schedule to update local state with saved status
            var SB2 = window.MODA_STATION_BOARD;
            return SB2.getWeeklySchedule(safeWeekStart(weekStart)).then(function(updated) {
                if (updated && props.onScheduleUpdated) {
                    props.onScheduleUpdated(safeWeekStart(weekStart), updated);
                }
                return result;
            });
        }).then(function(result) {
            setSaving(false);
            setSuccess('Saved: ' + (result.totalAssignments || 0) + ' assignments');
            if (onRefresh) onRefresh();
        }).catch(function(err) {
            setSaving(false);
            setError(err.message || 'Failed to save week');
        });
    }

    // Complete Shift 1
    function handleCompleteShift1() {
        if (!window.confirm('Complete Shift 1 and generate handoff report?')) return;
        setCompleting(true);
        setError('');
        var SUP = window.MODA_SUPERVISORS;
        if (!SUP) { setError('Supervisor data layer not loaded'); setCompleting(false); return; }

        SUP.generateHandoffReport({ weekStartDate: safeWeekStart(weekStart), projectId: projectId })
            .then(function() {
                var SB = window.MODA_STATION_BOARD;
                return SB.upsertWeeklySchedule({ weekStartDate: safeWeekStart(weekStart), startingSerial: startSerial, lineBalance: dailyQtys.mon });
            })
            .then(function() {
                setCompleting(false);
                setSuccess('Shift 1 complete. Handoff report generated.');
                if (onRefresh) onRefresh();
            })
            .catch(function(err) {
                setCompleting(false);
                setError(err.message || 'Failed to complete shift 1');
            });
    }

    // Complete Week
    function handleCompleteWeek() {
        if (!window.confirm('Complete this week? This action cannot be undone.')) return;
        setCompleting(true);
        setError('');
        var SUP = window.MODA_SUPERVISORS;
        if (!SUP) { setError('Supervisor data layer not loaded'); setCompleting(false); return; }

        SUP.completeShift2({ weekStartDate: safeWeekStart(weekStart), projectId: projectId })
            .then(function() {
                var SB = window.MODA_STATION_BOARD;
                return SB.completeWeek(safeWeekStart(weekStart));
            })
            .then(function() {
                setCompleting(false);
                setSuccess('Week completed.');
                if (onRefresh) onRefresh();
            })
            .catch(function(err) {
                setCompleting(false);
                setError(err.message || 'Failed to complete week');
            });
    }

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800">
            {/* Header — always visible */}
            <button
                onClick={function() { setExpanded(function(v) { return !v; }); }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition"
            >
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{stbWeekLabel(weekStart)}</span>
                    <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + statusCfg.bg + ' ' + statusCfg.text}>{statusCfg.label}</span>
                </div>
                <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
            </button>

            {/* Expanded body */}
            {expanded && (
                <div className="px-4 pb-4 pt-1 space-y-4 border-t border-gray-100 dark:border-gray-700">
                    {/* Starting Serial */}
                    <div className="relative" ref={suggestRef}>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Starting Serial #</label>
                        <input
                            type="text"
                            value={startSerial}
                            onChange={handleSerialInput}
                            onFocus={function() { if (serialSuggestions.length > 0) setShowSuggestions(true); }}
                            onBlur={function() { setTimeout(function() { setShowSuggestions(false); }, 200); }}
                            placeholder="e.g. 26-0413"
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm min-h-[44px]"
                        />
                        {showSuggestions && (
                            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {serialSuggestions.map(function(m) {
                                    var sn = m.serialNumber || '';
                                    return (
                                        <button key={sn} onClick={function() { handlePickSerial(sn); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                                            {sn} {m.hitchBLM ? '(' + m.hitchBLM + ')' : ''}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Shift 1: Mon-Thu */}
                    <div>
                        <label className="block text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Shift 1 (Mon – Thu)</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[{key:'mon',idx:0},{key:'tue',idx:1},{key:'wed',idx:2},{key:'thu',idx:3}].map(function(d) {
                                var dt = dates[d.idx];
                                return (
                                    <div key={d.key} className="flex flex-col items-center">
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400">{dt ? dt.label + ' ' + dt.dayNum : d.key}</span>
                                        <input
                                            type="number"
                                            value={dailyQtys[d.key]}
                                            onChange={function(e) { handleQtyChange(d.key, e.target.value); }}
                                            min="0" max="20"
                                            className="w-full px-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-center min-h-[44px]"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Shift 2: Fri-Sun */}
                    <div>
                        <label className="block text-xs font-medium text-orange-500 dark:text-orange-400 mb-1">Shift 2 (Fri – Sun)</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[{key:'fri',idx:4},{key:'sat',idx:5},{key:'sun',idx:6}].map(function(d) {
                                var dt = dates[d.idx];
                                return (
                                    <div key={d.key} className="flex flex-col items-center">
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400">{dt ? dt.label + ' ' + dt.dayNum : d.key}</span>
                                        <input
                                            type="number"
                                            value={dailyQtys[d.key]}
                                            onChange={function(e) { handleQtyChange(d.key, e.target.value); }}
                                            min="0" max="20"
                                            className="w-full px-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-center min-h-[44px]"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Line Summary */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2.5 space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-blue-600 dark:text-blue-400 font-medium">Shift 1:</span>
                            <span className="text-gray-700 dark:text-gray-300">{shift1First} → {shift1Last} <span className="text-gray-400">({shift1Total} modules)</span></span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-orange-500 dark:text-orange-400 font-medium">Shift 2:</span>
                            <span className="text-gray-700 dark:text-gray-300">{shift2First} → {shift2Last} <span className="text-gray-400">({shift2Total} modules)</span></span>
                        </div>
                        <div className="flex justify-between text-xs font-bold border-t border-gray-200 dark:border-gray-700 pt-1 mt-1">
                            <span className="text-gray-800 dark:text-gray-200">Total:</span>
                            <span className="text-gray-800 dark:text-gray-200">{totalWeekQty} modules</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        <button
                            onClick={handleSave}
                            disabled={saving || !startSerial}
                            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm min-h-[44px] disabled:opacity-50 transition"
                        >
                            {saving ? 'Saving...' : 'Save Week'}
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleCompleteShift1}
                                disabled={completing || status === 'not_set_up' || status === 'shift_1_complete' || status === 'complete'}
                                className="py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium text-xs min-h-[40px] disabled:opacity-40 transition"
                            >
                                {completing ? '...' : 'Complete Shift 1'}
                            </button>
                            <button
                                onClick={handleCompleteWeek}
                                disabled={completing || status !== 'shift_1_complete'}
                                className="py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-xs min-h-[40px] disabled:opacity-40 transition"
                            >
                                {completing ? '...' : 'Complete Week'}
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    {error && <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs">{error}</div>}
                    {success && <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">{success}</div>}
                </div>
            )}
        </div>
    );
}

// ─── WeekSetupTab — rolling 4-week container ────────────────────────────────
function WeekSetupTab(props) {
    var currentUser = props.currentUser;
    var allModules = props.modules;
    var projectId = props.projectId;
    var lineDepts = props.lineDepts;
    var shifts = props.shifts;
    var onRefresh = props.onRefresh;

    // Generate 4 rolling week start dates (current + 3 future)
    var currentWeekStart = stbGetCurrentWeekStart();
    var weekStarts = useMemo(function() {
        var result = [];
        for (var i = 0; i < 4; i++) {
            result.push(stbShiftWeek(currentWeekStart, i));
        }
        return result;
    }, [currentWeekStart]);

    // Load existing schedules for all 4 weeks
    var [schedules, setSchedules] = useState({});
    var [loadingSchedules, setLoadingSchedules] = useState(true);

    useEffect(function() {
        setLoadingSchedules(true);
        var SB = window.MODA_STATION_BOARD;
        if (!SB || !SB.getWeeklySchedule) { setLoadingSchedules(false); return; }

        var promises = weekStarts.map(function(ws) {
            return SB.getWeeklySchedule(ws).then(function(data) {
                return { ws: ws, data: data };
            }).catch(function() {
                return { ws: ws, data: null };
            });
        });

        Promise.all(promises).then(function(results) {
            var map = {};
            results.forEach(function(r) {
                if (r.data) map[r.ws] = r.data;
            });
            setSchedules(map);
            setLoadingSchedules(false);
        });
    }, [weekStarts]);

    // Callback: when a WeekCard saves, update local schedules state
    function handleScheduleUpdated(ws, updatedSchedule) {
        setSchedules(function(prev) {
            var next = Object.assign({}, prev);
            next[ws] = updatedSchedule;
            return next;
        });
    }

    // Track cascade data from each week card: { weekIdx: { serial, total } }
    var cascadeRef = useRef({});
    function handleQtysChange(weekIdx, serial, total) {
        cascadeRef.current[weekIdx] = { serial: serial, total: total };
    }

    // Derive previous week serial and total for each card
    function getPrevWeekData(weekIdx) {
        if (weekIdx === 0) {
            // First card: use schedule data if available, otherwise no cascade
            var firstSched = schedules[weekStarts[0]];
            return { serial: firstSched ? firstSched.starting_serial : '', total: 0 };
        }
        var prevData = cascadeRef.current[weekIdx - 1];
        if (prevData) return { serial: prevData.serial, total: prevData.total };
        // Fallback: check if previous week has a schedule
        var prevSched = schedules[weekStarts[weekIdx - 1]];
        if (prevSched) return { serial: prevSched.starting_serial || '', total: prevSched.line_balance ? prevSched.line_balance * 7 : 0 };
        return { serial: '', total: 0 };
    }

    // Stagger config state
    var [staggers, setStaggers] = useState([]);
    var [editingStagger, setEditingStagger] = useState(null);
    var [staggerValue, setStaggerValue] = useState('');
    var [staggerError, setStaggerError] = useState('');

    useEffect(function() {
        if (lineDepts) {
            setStaggers(lineDepts.map(function(d) {
                return { id: d.id, name: d.name, stagger_offset: d.stagger_offset || 0, color: d.color };
            }));
        }
    }, [lineDepts]);

    function handleSaveStagger(deptId) {
        var val = parseInt(staggerValue) || 0;
        var SB = window.MODA_STATION_BOARD;
        if (!SB) return;
        SB.updateStagger(deptId, val).then(function() {
            setStaggers(function(prev) {
                return prev.map(function(s) { return s.id === deptId ? Object.assign({}, s, { stagger_offset: val }) : s; });
            });
            setEditingStagger(null);
        }).catch(function(err) {
            setStaggerError(err.message || 'Failed to save stagger');
        });
    }

    if (loadingSchedules) {
        return <div className="flex items-center justify-center py-16"><STBSpinner size="lg" /></div>;
    }

    return (
        <div className="px-3 py-4 space-y-4 max-w-lg mx-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Week Setup</h3>

            {/* Rolling 4-week cards */}
            <div className="space-y-3">
                {weekStarts.map(function(ws, idx) {
                    var prev = getPrevWeekData(idx);
                    return (
                        <WeekCard
                            key={ws}
                            weekStart={ws}
                            weekIdx={idx}
                            schedule={schedules[ws] || null}
                            allModules={allModules}
                            lineDepts={lineDepts}
                            shifts={shifts}
                            projectId={projectId}
                            onRefresh={onRefresh}
                            prevWeekSerial={prev.serial}
                            prevWeekTotal={prev.total}
                            onQtysChange={handleQtysChange}
                            onScheduleUpdated={handleScheduleUpdated}
                            defaultExpanded={idx === 0}
                        />
                    );
                })}
            </div>

            {/* Section B: Stagger Configuration */}
            <div className="space-y-3 pt-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Stagger Configuration</h3>
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[1fr_80px_60px] px-3 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <span>Department</span>
                        <span className="text-center">Offset</span>
                        <span className="text-center">Edit</span>
                    </div>
                    {staggers.map(function(dept) {
                        var isEditing = editingStagger === dept.id;
                        return (
                            <div key={dept.id} className="grid grid-cols-[1fr_80px_60px] px-3 py-2 items-center border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dept.color || '#6366f1' }} />
                                    <span className="text-sm text-gray-800 dark:text-gray-200">{dept.name}</span>
                                </div>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={staggerValue}
                                        onChange={function(e) { setStaggerValue(e.target.value); }}
                                        className="w-16 mx-auto px-2 py-1 text-xs text-center border border-blue-400 rounded bg-white dark:bg-gray-700"
                                        autoFocus
                                    />
                                ) : (
                                    <span className="text-sm text-center text-gray-600 dark:text-gray-300">{dept.stagger_offset}</span>
                                )}
                                <div className="text-center">
                                    {isEditing ? (
                                        <button onClick={function() { handleSaveStagger(dept.id); }} className="text-xs text-green-600 font-medium">Save</button>
                                    ) : (
                                        <button onClick={function() { setEditingStagger(dept.id); setStaggerValue(String(dept.stagger_offset)); }} className="text-xs text-blue-600 font-medium">Edit</button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                {staggerError && <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs">{staggerError}</div>}
                {staggers.length > 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                        Stagger offset = how many module positions behind the lead department (Automation).
                    </p>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: HANDOFF REPORT
// ═══════════════════════════════════════════════════════════════════════════
function HandoffReportTab(props) {
    var currentUser = props.currentUser;
    var weekSchedule = props.weekSchedule;
    var projectId = props.projectId;
    var onRefresh = props.onRefresh;

    var [report, setReport] = useState(null);
    var [loading, setLoading] = useState(true);
    var [generating, setGenerating] = useState(false);
    var [error, setError] = useState('');

    var isAdmin = stbIsAdmin(currentUser);
    var weekStart = weekSchedule ? weekSchedule.week_start : null;

    useEffect(function() {
        if (!weekStart) { setLoading(false); return; }
        setLoading(true);
        var SUP = window.MODA_SUPERVISORS;
        if (!SUP || !SUP.getHandoffReport) { setLoading(false); return; }

        SUP.getHandoffReport({ weekStartDate: safeWeekStart(weekStart), projectId: projectId })
            .then(function(data) {
                setReport(data);
                setLoading(false);
            })
            .catch(function() {
                setReport(null);
                setLoading(false);
            });
    }, [weekStart, projectId]);

    function handleGenerate() {
        setGenerating(true);
        setError('');
        var SUP = window.MODA_SUPERVISORS;
        if (!SUP) { setError('Supervisor data layer not loaded'); setGenerating(false); return; }

        SUP.generateHandoffReport({ weekStartDate: safeWeekStart(weekStart), projectId: projectId })
            .then(function(data) {
                setReport(data);
                setGenerating(false);
                if (onRefresh) onRefresh();
            })
            .catch(function(err) {
                setError(err.message || 'Failed to generate report');
                setGenerating(false);
            });
    }

    function handleResolveFlag(flagId) {
        var SUP = window.MODA_SUPERVISORS;
        if (!SUP || !SUP.resolveFlaggedModule) return;
        SUP.resolveFlaggedModule(flagId).then(function() {
            setReport(function(prev) {
                if (!prev || !prev.flagged) return prev;
                var updated = Object.assign({}, prev);
                updated.flagged = prev.flagged.filter(function(f) { return f.id !== flagId; });
                return updated;
            });
        });
    }

    if (loading) {
        return <div className="flex items-center justify-center py-16"><STBSpinner size="lg" /></div>;
    }

    if (!weekStart) {
        return <STBEmpty message="No week scheduled" />;
    }

    if (!report) {
        return (
            <STBEmpty icon="!" message="Shift 1 handoff not yet generated">
                {isAdmin && (
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="mt-4 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm min-h-[44px] disabled:opacity-50"
                    >
                        {generating ? 'Generating...' : 'Generate Handoff'}
                    </button>
                )}
                {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            </STBEmpty>
        );
    }

    // Report exists
    var summary = report.summary || {};
    var deptBreakdown = report.departments || [];
    var flagged = report.flagged || [];

    return (
        <div className="px-3 py-4 space-y-4 max-w-2xl mx-auto">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Shift 1 Handoff Report</h3>
            <p className="text-xs text-gray-500">{stbWeekLabel(weekStart)}</p>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                    { label: 'Total', value: summary.total || 0, color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200' },
                    { label: 'Complete', value: summary.complete || 0, color: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
                    { label: 'WIP', value: summary.wip || 0, color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300' },
                    { label: 'Stopped', value: summary.stopped || 0, color: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
                    { label: 'Incomplete', value: summary.incomplete || 0, color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' },
                ].map(function(card) {
                    return (
                        <div key={card.label} className={'rounded-xl p-3 text-center ' + card.color}>
                            <div className="text-2xl font-bold">{card.value}</div>
                            <div className="text-xs font-medium mt-0.5">{card.label}</div>
                        </div>
                    );
                })}
            </div>

            {/* Department Breakdown */}
            {deptBreakdown.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-[1fr_repeat(5,_40px)_50px] px-3 py-2 bg-gray-50 dark:bg-gray-800 text-[10px] font-medium text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">
                        <span>Dept</span>
                        <span className="text-center">Tot</span>
                        <span className="text-center">OK</span>
                        <span className="text-center">WIP</span>
                        <span className="text-center">Stp</span>
                        <span className="text-center">Inc</span>
                        <span className="text-center">%</span>
                    </div>
                    {deptBreakdown.map(function(row) {
                        var hasStopped = (row.stopped || 0) > 0;
                        var hasWip = (row.wip || 0) > 0;
                        var rowCls = hasStopped ? 'bg-red-50 dark:bg-red-900/10' : hasWip ? 'bg-yellow-50 dark:bg-yellow-900/10' : '';
                        return (
                            <div key={row.department_id || row.name} className={'grid grid-cols-[1fr_repeat(5,_40px)_50px] px-3 py-2 items-center border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-xs ' + rowCls}>
                                <span className="font-medium text-gray-800 dark:text-gray-200 truncate">{row.name}</span>
                                <span className="text-center text-gray-600 dark:text-gray-400">{row.total || 0}</span>
                                <span className="text-center text-green-600">{row.complete || 0}</span>
                                <span className="text-center text-yellow-600">{row.wip || 0}</span>
                                <span className="text-center text-red-600">{row.stopped || 0}</span>
                                <span className="text-center text-orange-600">{row.incomplete || 0}</span>
                                <span className="text-center font-bold text-gray-700 dark:text-gray-300">{row.pct || 0}%</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Flagged Modules */}
            {flagged.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">Flagged Modules</h4>
                    {flagged.map(function(flag) {
                        var badgeColor = flag.flag_type === 'stopped' ? 'bg-red-100 text-red-700' :
                            flag.flag_type === 'wip' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-orange-100 text-orange-700';
                        return (
                            <div key={flag.id || flag.module_serial} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <span className={'text-[10px] font-bold px-2 py-0.5 rounded uppercase ' + badgeColor}>{flag.flag_type}</span>
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{flag.module_serial}</span>
                                    {flag.department_name && <span className="text-xs text-gray-400 ml-2">{flag.department_name}</span>}
                                </div>
                                <span className="text-xs text-gray-500">{flag.pct || 0}%</span>
                                <button
                                    onClick={function() { handleResolveFlag(flag.id); }}
                                    className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium min-h-[32px]"
                                >
                                    Resolve
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Print Button */}
            <div className="text-center pt-2">
                <button
                    onClick={function() { window.print(); }}
                    className="px-6 py-2.5 rounded-xl bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 font-medium text-sm min-h-[44px]"
                >
                    Print / Export
                </button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4: ADMIN
// ═══════════════════════════════════════════════════════════════════════════
function AdminConfigTab(props) {
    var lineDepts = props.lineDepts;
    var allTasks = props.allTasks;
    var shifts = props.shifts;
    var onRefresh = props.onRefresh;
    var onTaskAdded = props.onTaskAdded;
    var onTaskRemoved = props.onTaskRemoved;

    var [openPanel, setOpenPanel] = useState('departments');
    var [selectedDeptForTasks, setSelectedDeptForTasks] = useState(null);
    var [newDeptName, setNewDeptName] = useState('');
    var [newDeptColor, setNewDeptColor] = useState('#6366f1');
    var [newTaskName, setNewTaskName] = useState('');
    var [editingShift, setEditingShift] = useState(null);
    var [shiftName, setShiftName] = useState('');
    var [shiftDays, setShiftDays] = useState('');
    var [saving, setSaving] = useState(false);
    var [error, setError] = useState('');

    function handleTogglePanel(panel) {
        setOpenPanel(function(prev) { return prev === panel ? null : panel; });
    }

    // Department Management
    function handleAddDept() {
        if (!newDeptName.trim()) return;
        setSaving(true);
        var SB = window.MODA_STATION_BOARD;
        if (!SB) { setError('Data layer not loaded'); setSaving(false); return; }
        SB.addDepartment({ name: newDeptName.trim(), color: newDeptColor, is_active: true })
            .then(function() { setNewDeptName(''); setSaving(false); if (onRefresh) onRefresh(); })
            .catch(function(err) { setError(err.message); setSaving(false); });
    }

    function handleDeactivateDept(deptId) {
        var SB = window.MODA_STATION_BOARD;
        if (!SB) return;
        SB.deactivateDepartment(deptId).then(function() { if (onRefresh) onRefresh(); });
    }

    // Task Management
    function handleAddTask() {
        if (!newTaskName.trim() || !selectedDeptForTasks) return;
        setSaving(true);
        var SB = window.MODA_STATION_BOARD;
        if (!SB) { setError('Data layer not loaded'); setSaving(false); return; }
        var taskName = newTaskName.trim();
        SB.addTask({ department_id: selectedDeptForTasks, task_name: taskName })
            .then(function(newTask) {
                setNewTaskName(''); setSaving(false);
                if (onTaskAdded && newTask) { onTaskAdded(newTask); }
                else if (onRefresh) { onRefresh(); }
            })
            .catch(function(err) { setError(err.message); setSaving(false); });
    }

    function handleRemoveTask(taskId) {
        var SB = window.MODA_STATION_BOARD;
        if (!SB) return;
        SB.removeTask(taskId).then(function() {
            if (onTaskRemoved) { onTaskRemoved(taskId); }
            else if (onRefresh) { onRefresh(); }
        });
    }

    // Shift Management
    function handleSaveShift() {
        if (!editingShift || !shiftName.trim()) return;
        setSaving(true);
        var SB = window.MODA_STATION_BOARD;
        if (!SB) { setSaving(false); return; }
        SB.upsertShift({ id: editingShift.id, name: shiftName, days: shiftDays })
            .then(function() { setSaving(false); setEditingShift(null); if (onRefresh) onRefresh(); })
            .catch(function(err) { setError(err.message); setSaving(false); });
    }

    var deptTasks = useMemo(function() {
        if (!selectedDeptForTasks || !allTasks) return [];
        return allTasks.filter(function(t) { return t.department_id === selectedDeptForTasks; });
    }, [selectedDeptForTasks, allTasks]);

    return (
        <div className="px-3 py-4 space-y-3 max-w-lg mx-auto">
            {error && <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 text-xs">{error}</div>}

            {/* Department Manager */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button onClick={function() { handleTogglePanel('departments'); }} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 min-h-[48px]">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">Department Manager</span>
                    <span className="text-gray-400">{openPanel === 'departments' ? '▼' : '▶'}</span>
                </button>
                {openPanel === 'departments' && (
                    <div className="p-3 space-y-2 border-t border-gray-200 dark:border-gray-700">
                        {(lineDepts || []).map(function(dept) {
                            return (
                                <div key={dept.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color || '#6366f1' }} />
                                    <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{dept.name}</span>
                                    <span className="text-[10px] text-gray-400">stg: {dept.stagger_offset || 0}</span>
                                    <button type="button" onClick={function() { handleDeactivateDept(dept.id); }} className="text-xs text-red-500 px-2 py-1 min-h-[32px]">Remove</button>
                                </div>
                            );
                        })}
                        <div className="flex gap-2 pt-2">
                            <input
                                type="text"
                                value={newDeptName}
                                onChange={function(e) { setNewDeptName(e.target.value); }}
                                placeholder="New department name"
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm min-h-[44px]"
                            />
                            <input
                                type="color"
                                value={newDeptColor}
                                onChange={function(e) { setNewDeptColor(e.target.value); }}
                                className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                            />
                            <button onClick={handleAddDept} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium min-h-[44px] disabled:opacity-50">Add</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Task List Manager */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button onClick={function() { handleTogglePanel('tasks'); }} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 min-h-[48px]">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">Task List Manager</span>
                    <span className="text-gray-400">{openPanel === 'tasks' ? '▼' : '▶'}</span>
                </button>
                {openPanel === 'tasks' && (
                    <div className="p-3 space-y-2 border-t border-gray-200 dark:border-gray-700">
                        {/* Dept selector */}
                        <select
                            value={selectedDeptForTasks || ''}
                            onChange={function(e) { setSelectedDeptForTasks(e.target.value || null); }}
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm min-h-[44px]"
                        >
                            <option value="">Select department...</option>
                            {(lineDepts || []).map(function(dept) {
                                return <option key={dept.id} value={dept.id}>{dept.name}</option>;
                            })}
                        </select>
                        {/* Task list */}
                        {deptTasks.map(function(task) {
                            return (
                                <div key={task.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                                    <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{task.task_name}</span>
                                    <button type="button" onClick={function() { handleRemoveTask(task.id); }} className="text-xs text-red-500 px-2 py-1 min-h-[32px]">Remove</button>
                                </div>
                            );
                        })}
                        {selectedDeptForTasks && (
                            <div className="flex gap-2 pt-2">
                                <input
                                    type="text"
                                    value={newTaskName}
                                    onChange={function(e) { setNewTaskName(e.target.value); }}
                                    placeholder="New task name"
                                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm min-h-[44px]"
                                />
                                <button type="button" onClick={handleAddTask} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium min-h-[44px] disabled:opacity-50">Add</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Shift Configuration */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button onClick={function() { handleTogglePanel('shifts'); }} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 min-h-[48px]">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">Shift Configuration</span>
                    <span className="text-gray-400">{openPanel === 'shifts' ? '▼' : '▶'}</span>
                </button>
                {openPanel === 'shifts' && (
                    <div className="p-3 space-y-2 border-t border-gray-200 dark:border-gray-700">
                        {(shifts || []).map(function(shift) {
                            var isEditing = editingShift && editingShift.id === shift.id;
                            return (
                                <div key={shift.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                                    {isEditing ? (
                                        <React.Fragment>
                                            <input
                                                type="text"
                                                value={shiftName}
                                                onChange={function(e) { setShiftName(e.target.value); }}
                                                className="flex-1 px-2 py-1 text-sm border border-blue-400 rounded"
                                            />
                                            <input
                                                type="text"
                                                value={shiftDays}
                                                onChange={function(e) { setShiftDays(e.target.value); }}
                                                placeholder="Mon-Thu"
                                                className="w-24 px-2 py-1 text-xs border border-blue-400 rounded"
                                            />
                                            <button onClick={handleSaveShift} className="text-xs text-green-600 font-medium px-2 py-1 min-h-[32px]">Save</button>
                                        </React.Fragment>
                                    ) : (
                                        <React.Fragment>
                                            <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{shift.name}</span>
                                            <span className="text-xs text-gray-400">{shift.days || ''}</span>
                                            <button onClick={function() { setEditingShift(shift); setShiftName(shift.name); setShiftDays(shift.days || ''); }} className="text-xs text-blue-600 font-medium px-2 py-1 min-h-[32px]">Edit</button>
                                        </React.Fragment>
                                    )}
                                </div>
                            );
                        })}
                        {(!shifts || shifts.length === 0) && (
                            <p className="text-xs text-gray-400 italic py-2">No shifts configured</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: StationTaskBoard
// ═══════════════════════════════════════════════════════════════════════════
function StationTaskBoard(props) {
    var currentUser = props.currentUser;
    var modules = props.modules;
    var allModules = props.allModules || props.modules;
    var projectId = props.projectId;

    var isAdmin = stbIsAdmin(currentUser);

    // State
    var [activeTab, setActiveTab] = useState('daily');
    var [loading, setLoading] = useState(true);
    var [error, setError] = useState('');

    // Data
    var [supervisorProfile, setSupervisorProfile] = useState(null);
    var [weekSchedule, setWeekSchedule] = useState(null);
    var [shifts, setShifts] = useState([]);
    var [lineDepts, setLineDepts] = useState([]);
    var [allTasks, setAllTasks] = useState([]);
    var [completions, setCompletions] = useState([]);

    // Subscription ref
    var subRef = useRef(null);

    // Load all data on mount
    useEffect(function() {
        loadData();
        return function() {
            if (subRef.current && subRef.current.unsubscribe) {
                subRef.current.unsubscribe();
            }
        };
    }, [projectId]);

    function loadData() {
        setLoading(true);
        setError('');

        var SB = window.MODA_STATION_BOARD;
        var SUP = window.MODA_SUPERVISORS;

        if (!SB) {
            setError('Station board data layer (MODA_STATION_BOARD) not loaded');
            setLoading(false);
            return;
        }

        var weekStart = stbGetCurrentWeekStart();

        var promises = [
            SUP ? SUP.getCurrentSupervisor() : Promise.resolve(null),
            SB.getWeeklySchedule ? SB.getWeeklySchedule(weekStart) : Promise.resolve(null),
            SB.getShifts ? SB.getShifts() : Promise.resolve([]),
            SB.getLineDepartments ? SB.getLineDepartments() : Promise.resolve([]),
            SB.getAllTasks ? SB.getAllTasks() : Promise.resolve([]),
        ];

        Promise.all(promises).then(function(results) {
            setSupervisorProfile(results[0]);
            var schedule = results[1];
            setShifts(results[2] || []);
            setLineDepts(results[3] || []);
            setAllTasks(results[4] || []);

            // Also load assignments for this week and attach to schedule
            if (schedule && schedule.week_start) {
                var ws = safeWeekStart(schedule.week_start);
                console.log('[StationTaskBoard] Schedule loaded, fetching assignments for ws:', ws);
                SB.getDayAssignments(ws).then(function(assignments) {
                    console.log('[StationTaskBoard] Assignments loaded:', assignments ? assignments.length : 0);
                    schedule.assignments = assignments || [];
                    setWeekSchedule(Object.assign({}, schedule));
                    setLoading(false);
                    loadCompletions(ws);
                    subscribeToCompletions(ws);
                }).catch(function(err) {
                    console.error('[StationTaskBoard] Assignments load error:', err);
                    schedule.assignments = [];
                    setWeekSchedule(Object.assign({}, schedule));
                    setLoading(false);
                    loadCompletions(ws);
                    subscribeToCompletions(ws);
                });
            } else {
                console.warn('[StationTaskBoard] No weekly schedule found for', weekStart);
                setWeekSchedule(null);
                setLoading(false);
            }
        }).catch(function(err) {
            console.error('[StationTaskBoard] Load error:', err);
            setError(err.message || 'Failed to load data');
            setLoading(false);
        });
    }

    function loadCompletions(weekStart) {
        var SB = window.MODA_STATION_BOARD;
        if (!SB || !SB.getCompletions) return;
        SB.getCompletions(weekStart).then(function(data) {
            setCompletions(data || []);
        }).catch(function(err) {
            console.error('[StationTaskBoard] Completions load error:', err);
        });
    }

    function subscribeToCompletions(weekStart) {
        var SB = window.MODA_STATION_BOARD;
        if (!SB || !SB.subscribeToCompletions) return;
        if (subRef.current && subRef.current.unsubscribe) {
            subRef.current.unsubscribe();
        }
        subRef.current = SB.subscribeToCompletions(weekStart, function(payload) {
            // Real-time update: merge new completion into state
            if (payload && payload.new) {
                setCompletions(function(prev) {
                    var updated = prev.filter(function(c) {
                        return !(c.module_serial === payload.new.module_serial &&
                                 c.department_id === payload.new.department_id &&
                                 c.task_id === payload.new.task_id &&
                                 c.target_date === payload.new.target_date);
                    });
                    updated.push(payload.new);
                    return updated;
                });
            }
        });
    }

    // Optimistic completion update
    function handleUpdateCompletion(params) {
        // Optimistic: update local immediately
        var optimisticCompletion = {
            week_start: params.weekStartDate,
            target_date: params.targetDate,
            department_id: params.departmentId,
            module_serial: params.moduleSerial,
            task_id: params.taskId,
            status: params.status,
        };

        setCompletions(function(prev) {
            var filtered = prev.filter(function(c) {
                return !(c.module_serial === params.moduleSerial &&
                         c.department_id === params.departmentId &&
                         c.task_id === params.taskId &&
                         c.target_date === params.targetDate);
            });
            filtered.push(optimisticCompletion);
            return filtered;
        });

        var SB = window.MODA_STATION_BOARD;
        if (!SB || !SB.upsertCompletion) return Promise.reject(new Error('Data layer not loaded'));

        return SB.upsertCompletion({
            weekStartDate: params.weekStartDate,
            targetDate: params.targetDate,
            departmentId: params.departmentId,
            moduleSerial: params.moduleSerial,
            taskId: params.taskId,
            status: params.status,
        }).catch(function(err) {
            // Revert on error
            setCompletions(function(prev) {
                return prev.filter(function(c) {
                    return !(c.module_serial === params.moduleSerial &&
                             c.department_id === params.departmentId &&
                             c.task_id === params.taskId &&
                             c.target_date === params.targetDate);
                });
            });
            throw err;
        });
    }

    function handleRefresh() {
        loadData();
    }

    // Tab definitions
    var tabs = [
        { id: 'daily', label: 'Daily Board', visible: true },
        { id: 'setup', label: 'Week Setup', visible: isAdmin },
        { id: 'handoff', label: 'Handoff', visible: true },
        { id: 'admin', label: 'Admin', visible: isAdmin },
    ];

    var visibleTabs = tabs.filter(function(t) { return t.visible; });

    // Loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <STBSpinner size="lg" />
                <p className="text-sm text-gray-500 mt-4">Loading Station Board...</p>
            </div>
        );
    }

    // Error state
    if (error && !weekSchedule && !lineDepts.length) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="text-red-500 text-4xl mb-3">!</div>
                <p className="text-sm text-red-600 dark:text-red-400 text-center max-w-sm">{error}</p>
                <button onClick={handleRefresh} className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium min-h-[44px]">Retry</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1 overflow-x-auto">
                {visibleTabs.map(function(tab) {
                    var isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={function() { setActiveTab(tab.id); }}
                            className={'flex-1 min-w-[80px] py-3 px-2 text-xs sm:text-sm font-medium transition-all border-b-2 min-h-[48px] ' +
                                (isActive
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                                )
                            }
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'daily' && (
                    <DailyBoardTab
                        currentUser={currentUser}
                        modules={modules}
                        weekSchedule={weekSchedule}
                        shifts={shifts}
                        lineDepts={lineDepts}
                        allTasks={allTasks}
                        completions={completions}
                        supervisorProfile={supervisorProfile}
                        onUpdateCompletion={handleUpdateCompletion}
                        loading={false}
                    />
                )}
                {activeTab === 'setup' && isAdmin && (
                    <WeekSetupTab
                        currentUser={currentUser}
                        modules={allModules}
                        projectId={projectId}
                        weekSchedule={weekSchedule}
                        lineDepts={lineDepts}
                        shifts={shifts}
                        onRefresh={handleRefresh}
                    />
                )}
                {activeTab === 'handoff' && (
                    <HandoffReportTab
                        currentUser={currentUser}
                        weekSchedule={weekSchedule}
                        projectId={projectId}
                        onRefresh={handleRefresh}
                    />
                )}
                {activeTab === 'admin' && isAdmin && (
                    <AdminConfigTab
                        lineDepts={lineDepts}
                        allTasks={allTasks}
                        shifts={shifts}
                        onRefresh={handleRefresh}
                        onTaskAdded={function(task) { setAllTasks(function(prev) { return prev.concat([task]); }); }}
                        onTaskRemoved={function(taskId) { setAllTasks(function(prev) { return prev.filter(function(t) { return t.id !== taskId; }); }); }}
                    />
                )}
            </div>
        </div>
    );
}

// Export
window.StationTaskBoard = StationTaskBoard;
