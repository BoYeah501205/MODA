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
    return fmt(mon) + ' \u2013 ' + fmt(sun) + ', ' + mon.getFullYear();
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
// TAB 1: DAILY BOARD
// ═══════════════════════════════════════════════════════════════════════════
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
    var [expandedDepts, setExpandedDepts] = useState({});
    var [expandedModules, setExpandedModules] = useState({});
    var [pickerOpen, setPickerOpen] = useState(null); // { moduleSerial, deptId, taskId, taskName, currentStatus }
    var [saving, setSaving] = useState({});

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

    // Get modules assigned to a dept on selected day from schedule
    function getModulesForDeptDay(deptId) {
        if (!weekSchedule || !weekSchedule.assignments) return [];
        return weekSchedule.assignments.filter(function(a) {
            return a.department_id === deptId && a.target_date === selectedDay;
        }).map(function(a) {
            var mod = modules.find(function(m) { return m.serialNumber === a.module_serial; });
            return { serial: a.module_serial, blm: mod ? (mod.hitchBLM || '') : '', module: mod };
        });
    }

    // Get tasks for a department
    function getTasksForDept(deptId) {
        if (!allTasks) return [];
        return allTasks.filter(function(t) { return t.department_id === deptId; });
    }

    function handleToggleDept(deptId) {
        setExpandedDepts(function(prev) {
            var next = Object.assign({}, prev);
            next[deptId] = !prev[deptId];
            return next;
        });
    }

    function handleToggleModule(key) {
        setExpandedModules(function(prev) {
            var next = Object.assign({}, prev);
            next[key] = !prev[key];
            return next;
        });
    }

    function handleOpenPicker(moduleSerial, deptId, taskId, taskName, currentStatus) {
        setPickerOpen({ moduleSerial: moduleSerial, deptId: deptId, taskId: taskId, taskName: taskName, currentStatus: currentStatus });
    }

    function handleClosePicker() {
        setPickerOpen(null);
    }

    function handleStatusSelect(newStatus) {
        if (!pickerOpen) return;
        var info = pickerOpen;
        var key = info.moduleSerial + '|' + info.deptId + '|' + info.taskId;
        setSaving(function(prev) { var n = Object.assign({}, prev); n[key] = true; return n; });

        onUpdateCompletion({
            weekStartDate: weekStart,
            targetDate: selectedDay,
            departmentId: info.deptId,
            moduleSerial: info.moduleSerial,
            taskId: info.taskId,
            status: newStatus,
        }).then(function() {
            setSaving(function(prev) { var n = Object.assign({}, prev); delete n[key]; return n; });
        }).catch(function() {
            setSaving(function(prev) { var n = Object.assign({}, prev); delete n[key]; return n; });
        });

        setPickerOpen(null);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <STBSpinner size="lg" />
            </div>
        );
    }

    if (!weekSchedule) {
        return (
            <STBEmpty icon="!" message="No week scheduled — contact admin to set up the week." />
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-3 pt-3 pb-2">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{stbWeekLabel(weekStart)}</h2>
                    {weekSchedule.status && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                            {weekSchedule.status}
                        </span>
                    )}
                </div>
                {supervisorProfile && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {supervisorProfile.name} {supervisorProfile.departments && supervisorProfile.departments.length > 0 && (
                            <span className="ml-1">
                                {supervisorProfile.departments.map(function(d) { return d.department_name; }).join(', ')}
                            </span>
                        )}
                    </p>
                )}
            </div>

            {/* Day Selector */}
            <div className="px-2 pb-3 overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                    {visibleDays.map(function(day) {
                        var isToday = day.date === stbToday();
                        var isSelected = day.date === selectedDay;
                        var isShift1 = SHIFT1_DAYS.includes(day.dayIndex);
                        var baseCls = 'flex flex-col items-center min-w-[52px] px-2 py-2 rounded-xl text-xs font-medium transition-all';
                        var colorCls = isSelected
                            ? (isShift1 ? 'bg-blue-500 text-white shadow-md' : 'bg-orange-500 text-white shadow-md')
                            : isToday
                                ? (isShift1 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-300' : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 ring-2 ring-orange-300')
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700';
                        return (
                            <button
                                key={day.date}
                                onClick={function() { setSelectedDay(day.date); }}
                                className={baseCls + ' ' + colorCls}
                            >
                                <span className="text-[10px] uppercase opacity-70">{day.label}</span>
                                <span className="text-base font-bold">{day.dayNum}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Department List */}
            <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-2">
                {visibleDepts.length === 0 && (
                    <STBEmpty message="No departments assigned" />
                )}
                {visibleDepts.map(function(dept) {
                    var deptModules = getModulesForDeptDay(dept.id);
                    var deptTasks = getTasksForDept(dept.id);
                    var isExpanded = !!expandedDepts[dept.id];
                    var pct = stbCalcDeptDayPct(
                        deptModules.map(function(m) { return m.serial; }),
                        deptTasks, dayCompletions, dept.id
                    );

                    return (
                        <div key={dept.id} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
                            {/* Department Header */}
                            <button
                                onClick={function() { handleToggleDept(dept.id); }}
                                className="w-full flex items-center gap-3 px-4 py-3 min-h-[52px] hover:bg-gray-50 dark:hover:bg-gray-750 transition"
                            >
                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color || '#6366f1' }} />
                                <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 text-left">{dept.name}</span>
                                <span className="text-xs text-gray-400 ml-1">{deptModules.length} mod</span>
                                <div className="flex-1" />
                                <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: pct + '%', backgroundColor: pct === 100 ? '#16a34a' : pct > 50 ? '#0d9488' : pct > 0 ? '#f59e0b' : '#d1d5db' }}
                                    />
                                </div>
                                <span className="text-xs font-mono text-gray-500 w-10 text-right">{pct}%</span>
                                <span className="text-gray-400 text-sm ml-1">{isExpanded ? '\u25BC' : '\u25B6'}</span>
                            </button>

                            {/* Expanded: Module List */}
                            {isExpanded && (
                                <div className="border-t border-gray-100 dark:border-gray-700">
                                    {deptModules.length === 0 && (
                                        <div className="px-4 py-3 text-xs text-gray-400 italic">No modules assigned today</div>
                                    )}
                                    {deptModules.map(function(modInfo) {
                                        var modKey = dept.id + '|' + modInfo.serial;
                                        var isModExpanded = !!expandedModules[modKey];
                                        var modPct = stbCalcCompletionPct(deptTasks, dayCompletions, modInfo.serial, dept.id);

                                        return (
                                            <div key={modKey} className="border-b border-gray-50 dark:border-gray-700 last:border-b-0">
                                                {/* Module Header */}
                                                <button
                                                    onClick={function() { handleToggleModule(modKey); }}
                                                    className="w-full flex items-center gap-2 px-6 py-2.5 min-h-[44px] hover:bg-gray-50 dark:hover:bg-gray-750 transition text-left"
                                                >
                                                    <span className="text-xs text-gray-400">{isModExpanded ? '\u25BC' : '\u25B6'}</span>
                                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{modInfo.serial}</span>
                                                    {modInfo.blm && (
                                                        <span className="text-xs text-gray-400 dark:text-gray-500">{modInfo.blm}</span>
                                                    )}
                                                    <div className="flex-1" />
                                                    <span className={'text-xs font-bold ' + (modPct === 100 ? 'text-green-600' : modPct > 0 ? 'text-blue-600' : 'text-gray-400')}>{modPct}%</span>
                                                </button>

                                                {/* Expanded: Task Checklist */}
                                                {isModExpanded && (
                                                    <div className="px-6 pb-3 space-y-1">
                                                        {deptTasks.map(function(task) {
                                                            var cKey = modInfo.serial + '|' + dept.id + '|' + task.id;
                                                            var status = dayCompletions[cKey] || 'not_started';
                                                            var sCfg = STB_STATUSES[status] || STB_STATUSES.not_started;
                                                            var isSaving = !!saving[cKey];

                                                            return (
                                                                <button
                                                                    key={task.id}
                                                                    onClick={function() { handleOpenPicker(modInfo.serial, dept.id, task.id, task.task_name, status); }}
                                                                    disabled={isSaving}
                                                                    className={'w-full flex items-center gap-3 px-3 py-2 rounded-lg min-h-[44px] transition ' + sCfg.bg + ' ' + (isSaving ? 'opacity-50' : 'hover:opacity-80 active:scale-[0.98]')}
                                                                >
                                                                    <span className={'text-sm flex-1 text-left ' + sCfg.text}>{task.task_name}</span>
                                                                    {isSaving ? (
                                                                        <STBSpinner size="sm" />
                                                                    ) : (
                                                                        <span className={'text-xs font-bold px-2 py-0.5 rounded ' + sCfg.text}>{sCfg.short}</span>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Status Picker Modal */}
            <StatusPickerModal
                isOpen={!!pickerOpen}
                currentStatus={pickerOpen ? pickerOpen.currentStatus : 'not_started'}
                taskName={pickerOpen ? pickerOpen.taskName : ''}
                onSelect={handleStatusSelect}
                onClose={handleClosePicker}
            />
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
                <span className="text-gray-400 text-xs">{expanded ? '\u25B2' : '\u25BC'}</span>
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
                        <label className="block text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Shift 1 (Mon \u2013 Thu)</label>
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
                        <label className="block text-xs font-medium text-orange-500 dark:text-orange-400 mb-1">Shift 2 (Fri \u2013 Sun)</label>
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
                            <span className="text-gray-700 dark:text-gray-300">{shift1First} \u2192 {shift1Last} <span className="text-gray-400">({shift1Total} modules)</span></span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-orange-500 dark:text-orange-400 font-medium">Shift 2:</span>
                            <span className="text-gray-700 dark:text-gray-300">{shift2First} \u2192 {shift2Last} <span className="text-gray-400">({shift2Total} modules)</span></span>
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
        SB.addTask({ department_id: selectedDeptForTasks, task_name: newTaskName.trim() })
            .then(function() { setNewTaskName(''); setSaving(false); if (onRefresh) onRefresh(); })
            .catch(function(err) { setError(err.message); setSaving(false); });
    }

    function handleRemoveTask(taskId) {
        var SB = window.MODA_STATION_BOARD;
        if (!SB) return;
        SB.removeTask(taskId).then(function() { if (onRefresh) onRefresh(); });
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
                    <span className="text-gray-400">{openPanel === 'departments' ? '\u25BC' : '\u25B6'}</span>
                </button>
                {openPanel === 'departments' && (
                    <div className="p-3 space-y-2 border-t border-gray-200 dark:border-gray-700">
                        {(lineDepts || []).map(function(dept) {
                            return (
                                <div key={dept.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color || '#6366f1' }} />
                                    <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{dept.name}</span>
                                    <span className="text-[10px] text-gray-400">stg: {dept.stagger_offset || 0}</span>
                                    <button onClick={function() { handleDeactivateDept(dept.id); }} className="text-xs text-red-500 px-2 py-1 min-h-[32px]">Remove</button>
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
                    <span className="text-gray-400">{openPanel === 'tasks' ? '\u25BC' : '\u25B6'}</span>
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
                                    <button onClick={function() { handleRemoveTask(task.id); }} className="text-xs text-red-500 px-2 py-1 min-h-[32px]">Remove</button>
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
                                <button onClick={handleAddTask} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium min-h-[44px] disabled:opacity-50">Add</button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Shift Configuration */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button onClick={function() { handleTogglePanel('shifts'); }} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 min-h-[48px]">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">Shift Configuration</span>
                    <span className="text-gray-400">{openPanel === 'shifts' ? '\u25BC' : '\u25B6'}</span>
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
            setWeekSchedule(results[1]);
            setShifts(results[2] || []);
            setLineDepts(results[3] || []);
            setAllTasks(results[4] || []);
            setLoading(false);

            // Load completions for current week
            if (results[1] && results[1].week_start) {
                loadCompletions(safeWeekStart(results[1].week_start));
                subscribeToCompletions(safeWeekStart(results[1].week_start));
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
                    />
                )}
            </div>
        </div>
    );
}

// Export
window.StationTaskBoard = StationTaskBoard;
