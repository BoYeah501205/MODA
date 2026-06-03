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
var TRAVELER_SIGNED_ID = '00000000-0000-0000-0000-000000000001';
var NON_CONFORMANCE_ID  = '00000000-0000-0000-0000-000000000002';

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

// ─── Shared master-sequence module assignment ────────────────────────────
// All departments are OFFSET VIEWS of ONE master build sequence.
// Formula: start = baseIdx + (prodDayOffset * modulesPerDay) + staggerOffset
function stbDeptModulesForDay(masterSeq, baseIdx, prodDayOffset, modulesPerDay, staggerOffset) {
    var dayStart = baseIdx + (prodDayOffset * modulesPerDay);
    var start = dayStart + (staggerOffset || 0);
    var result = [];
    for (var i = 0; i < modulesPerDay; i++) {
        var idx = start + i;
        if (idx >= 0 && idx < masterSeq.length) {
            result.push(masterSeq[idx]);
        }
    }
    return result;
}

function stbGetActiveDates(weekDays, shifts) {
    var shiftDaySet = {};
    if (shifts) {
        for (var i = 0; i < shifts.length; i++) {
            var s = shifts[i];
            if (s.days) {
                for (var j = 0; j < s.days.length; j++) {
                    shiftDaySet[s.days[j]] = true;
                }
            }
        }
    }
    var dayNameMap = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    var result = [];
    for (var k = 0; k < weekDays.length; k++) {
        var dt = stbParseDate(weekDays[k].date);
        if (shiftDaySet[dayNameMap[dt.getDay()]]) {
            result.push(weekDays[k].date);
        }
    }
    return result;
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
        if (tasks[i].id === TRAVELER_SIGNED_ID || tasks[i].id === NON_CONFORMANCE_ID) continue;
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
    var ribbonSettings = props.ribbonSettings || { ribbon_trailing_count: 5, ribbon_upcoming_count: 5 };

    var [selectedDay, setSelectedDay] = useState(stbToday());
    var [selectedDept, setSelectedDept] = useState(null);
    var [selectedModule, setSelectedModule] = useState(null);
    var [inlinePickerTask, setInlinePickerTask] = useState(null);
    var [saving, setSaving] = useState({});
    var [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
    var [showModuleInfo, setShowModuleInfo] = useState(false);
    var moduleNavRef = useRef(null);
    var [visibleCount, setVisibleCount] = useState(null);
    var [bulkConfirm, setBulkConfirm] = useState(null); // { status, timer }
    var bulkTimerRef = useRef(null);

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

    // Master build sequence (sorted by buildSequence ascending — one shared ordered list)
    var masterSeq = useMemo(function() {
        if (!modules || modules.length === 0) return [];
        return modules.slice().sort(function(a, b) {
            return (a.buildSequence ?? a.build_sequence ?? 0) - (b.buildSequence ?? b.build_sequence ?? 0);
        });
    }, [modules]);

    // Base index: position of the week's starting serial in master sequence
    var baseIdx = useMemo(function() {
        if (!weekSchedule || !weekSchedule.starting_serial || masterSeq.length === 0) return -1;
        var ss = (weekSchedule.starting_serial || '').trim();
        for (var i = 0; i < masterSeq.length; i++) {
            if ((masterSeq[i].serialNumber || '').trim() === ss) return i;
        }
        return -1;
    }, [weekSchedule, masterSeq]);

    // Active production dates (only days that have scheduled shifts)
    var activeDates = useMemo(function() {
        return stbGetActiveDates(weekDays, shifts);
    }, [weekDays, shifts]);

    var modulesPerDay = (weekSchedule && weekSchedule.line_balance) || 5;

    // Get modules for a dept on selected day — from master sequence + stagger
    function getModulesForDeptDay(deptId) {
        if (baseIdx < 0 || masterSeq.length === 0) return [];
        var dept = (lineDepts || []).find(function(d) { return d.id === deptId; });
        var stagger = dept ? (dept.stagger_offset || 0) : 0;
        var prodDayOffset = activeDates.indexOf(selectedDay);
        if (prodDayOffset < 0) return [];
        var mods = stbDeptModulesForDay(masterSeq, baseIdx, prodDayOffset, modulesPerDay, stagger);
        return mods.map(function(m) {
            return {
                serial: m.serialNumber || '',
                blm: m.hitchBLM || '',
                unitType: m.unitType || '',
                module: m
            };
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

    // Compute ribbon sections: Previous / Scheduled / Upcoming
    var ribbonSections = useMemo(function() {
        var result = { previous: [], scheduled: deptModules, upcoming: [] };
        if (!selectedDept || baseIdx < 0 || masterSeq.length === 0) return result;

        var dept = (lineDepts || []).find(function(d) { return d.id === selectedDept; });
        var stagger = dept ? (dept.stagger_offset || 0) : 0;
        var prodDayOffset = activeDates.indexOf(selectedDay);
        if (prodDayOffset < 0) return result;

        var schedStart = baseIdx + (prodDayOffset * modulesPerDay) + stagger;
        var schedEnd = schedStart + modulesPerDay; // exclusive

        var trailingCount = ribbonSettings.ribbon_trailing_count || 5;
        var upcomingCount = ribbonSettings.ribbon_upcoming_count || 5;

        // --- Upcoming: next N after scheduled window ---
        var upcomingMods = [];
        for (var u = schedEnd; u < Math.min(schedEnd + upcomingCount, masterSeq.length); u++) {
            var um = masterSeq[u];
            upcomingMods.push({ serial: um.serialNumber || '', blm: um.hitchBLM || '', unitType: um.unitType || '', module: um });
        }
        result.upcoming = upcomingMods;

        // --- Previous: HYBRID rule ---
        // 1. Last N trailing modules before scheduled window
        var trailStart = Math.max(0, schedStart - trailingCount);
        var trailingSet = {};
        var previousMods = [];
        for (var t = trailStart; t < schedStart; t++) {
            var tm = masterSeq[t];
            var info = { serial: tm.serialNumber || '', blm: tm.hitchBLM || '', unitType: tm.unitType || '', module: tm };
            previousMods.push(info);
            trailingSet[tm.serialNumber || ''] = true;
        }

        // 2. Also include any incomplete modules further back (up to cap of 20)
        // Build all-day completions map (not filtered to selectedDay) so we can
        // accurately check completion for modules that were scheduled on other days.
        var allDayCompletions = {};
        if (completions) {
            for (var ci = 0; ci < completions.length; ci++) {
                var cc = completions[ci];
                var ck = cc.module_serial + '|' + cc.department_id + '|' + cc.task_id;
                // Keep latest status per module|dept|task (prefer complete > wip > not_started)
                if (!allDayCompletions[ck] || cc.status === 'complete' || (cc.status === 'na' && allDayCompletions[ck] !== 'complete')) {
                    allDayCompletions[ck] = cc.status;
                }
            }
        }
        var deptTasksList = getTasksForDept(selectedDept);
        var incompleteCap = 20;
        var incompleteExtras = [];
        var searchStart = Math.max(0, schedStart - incompleteCap);
        for (var ic = searchStart; ic < trailStart; ic++) {
            var icm = masterSeq[ic];
            if (trailingSet[icm.serialNumber || '']) continue;
            // Check if incomplete using allDayCompletions (not day-filtered)
            var pct = stbCalcCompletionPct(deptTasksList, allDayCompletions, icm.serialNumber || '', selectedDept);
            var hasRealTasks = false;
            for (var ti = 0; ti < deptTasksList.length; ti++) {
                if (deptTasksList[ti].id === TRAVELER_SIGNED_ID || deptTasksList[ti].id === NON_CONFORMANCE_ID) continue;
                var ckey = (icm.serialNumber || '') + '|' + selectedDept + '|' + deptTasksList[ti].id;
                var st = allDayCompletions[ckey] || 'not_started';
                if (st !== 'na') { hasRealTasks = true; break; }
            }
            if (hasRealTasks && pct < 100) {
                incompleteExtras.push({ serial: icm.serialNumber || '', blm: icm.hitchBLM || '', unitType: icm.unitType || '', module: icm, _seqIdx: ic });
            }
        }
        // Tag trailing mods with sequence index for sorting
        for (var pi = 0; pi < previousMods.length; pi++) {
            previousMods[pi]._seqIdx = trailStart + pi;
        }
        // Merge and sort by master sequence index
        var merged = incompleteExtras.concat(previousMods);
        merged.sort(function(a, b) { return a._seqIdx - b._seqIdx; });
        result.previous = merged;

        return result;
    }, [selectedDept, selectedDay, weekSchedule, modules, masterSeq, baseIdx, activeDates, modulesPerDay, lineDepts, ribbonSettings, completions, dayCompletions, allTasks]);

    // Auto-select first module when dept changes or day changes
    useEffect(function() {
        if (deptModules.length > 0) {
            setSelectedModule(deptModules[0].serial);
        } else {
            setSelectedModule(null);
        }
        setInlinePickerTask(null);
        setShowModuleInfo(false);
    }, [selectedDept, selectedDay, deptModules.length]);

    // Calculate how many module pills fit in the nav row
    useEffect(function() {
        if (!moduleNavRef.current || !deptModules || !deptModules.length) { setVisibleCount(null); return; }
        var container = moduleNavRef.current;
        var containerWidth = container.offsetWidth;
        var pillWidth = 106;
        var dropdownWidth = 90;
        var maxPills = Math.floor((containerWidth - dropdownWidth) / pillWidth);
        setVisibleCount(Math.max(1, maxPills));
    }, [deptModules.length]);

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

    // Current module info (check scheduled, then previous, then upcoming)
    var currentModInfo = useMemo(function() {
        if (!selectedModule) return null;
        var found = deptModules.find(function(m) { return m.serial === selectedModule; });
        if (found) return found;
        found = ribbonSections.previous.find(function(m) { return m.serial === selectedModule; });
        if (found) return found;
        found = ribbonSections.upcoming.find(function(m) { return m.serial === selectedModule; });
        return found || null;
    }, [selectedModule, deptModules, ribbonSections]);

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
        setShowModuleInfo(false);
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

    // Traveler sign-off and non-conformance handlers
    function handleTravelerToggle() {
        var travKey = selectedModule + '|' + selectedDept + '|' + TRAVELER_SIGNED_ID;
        var currentSigned = (dayCompletions[travKey] || 'not_started') === 'complete';
        var newStatus = currentSigned ? 'not_started' : 'complete';
        onUpdateCompletion({
            weekStartDate: weekStart,
            targetDate: selectedDay,
            departmentId: selectedDept,
            moduleSerial: selectedModule,
            taskId: TRAVELER_SIGNED_ID,
            status: newStatus,
        }).catch(function(err) { console.error('Traveler sign error:', err); });
    }

    function handleNonConformanceToggle() {
        var ncKey = selectedModule + '|' + selectedDept + '|' + NON_CONFORMANCE_ID;
        var currentFlagged = (dayCompletions[ncKey] || 'not_started') === 'complete';
        var newStatus = currentFlagged ? 'not_started' : 'complete';
        onUpdateCompletion({
            weekStartDate: weekStart,
            targetDate: selectedDay,
            departmentId: selectedDept,
            moduleSerial: selectedModule,
            taskId: NON_CONFORMANCE_ID,
            status: newStatus,
        }).catch(function(err) { console.error('NC flag error:', err); });
    }

    // Mark All bulk handler
    function handleMarkAllClick(status) {
        if (bulkTimerRef.current) clearTimeout(bulkTimerRef.current);
        setBulkConfirm({ status: status });
        bulkTimerRef.current = setTimeout(function() { setBulkConfirm(null); }, 3000);
    }

    function handleBulkConfirm() {
        if (bulkTimerRef.current) clearTimeout(bulkTimerRef.current);
        var st = bulkConfirm ? bulkConfirm.status : null;
        setBulkConfirm(null);
        if (!st || !selectedModule || !selectedDept) return;
        var tasks = (deptTasks || []).filter(function(t) {
            return t.id !== TRAVELER_SIGNED_ID && t.id !== NON_CONFORMANCE_ID;
        });
        tasks.forEach(function(task) {
            var key = selectedModule + '|' + selectedDept + '|' + task.id;
            setSaving(function(prev) { var n = Object.assign({}, prev); n[key] = true; return n; });
            onUpdateCompletion({
                weekStartDate: weekStart,
                targetDate: selectedDay,
                departmentId: selectedDept,
                moduleSerial: selectedModule,
                taskId: task.id,
                status: st,
            }).then(function() {
                setSaving(function(prev) { var n = Object.assign({}, prev); delete n[key]; return n; });
            }).catch(function() {
                setSaving(function(prev) { var n = Object.assign({}, prev); delete n[key]; return n; });
            });
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
                                <button
                                    onClick={function() { setShowModuleInfo(true); }}
                                    style={{
                                        marginLeft: '10px',
                                        padding: '3px 10px',
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        borderRadius: '6px',
                                        border: '1.5px solid #6366f1',
                                        color: '#6366f1',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        verticalAlign: 'middle'
                                    }}
                                >
                                    Info
                                </button>
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

                {/* Module ribbon: Previous / Scheduled / Upcoming */}
                {(ribbonSections.previous.length > 0 || deptModules.length > 0 || ribbonSections.upcoming.length > 0) && (
                    <div ref={moduleNavRef} className="mt-2 overflow-x-auto" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '4px', alignItems: 'center', minWidth: 'max-content' }}>
                            {/* Previous section */}
                            {ribbonSections.previous.length > 0 && (
                                <React.Fragment>
                                    <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.05em', flexShrink: 0, paddingRight: '2px' }}>Prev</span>
                                    {ribbonSections.previous.map(function(modInfo) {
                                        var isModActive = modInfo.serial === selectedModule;
                                        var modPct = stbCalcCompletionPct(deptTasks, dayCompletions, modInfo.serial, selectedDept);
                                        var dotColor = modPct === 100 ? '#16a34a' : modPct > 0 ? '#f59e0b' : '#9ca3af';
                                        var tileStyle = isModActive
                                            ? { backgroundColor: selectedDeptObj ? (selectedDeptObj.color || '#6366f1') : '#6366f1', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, flexShrink: 0, opacity: 1 }
                                            : { padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 400, border: '1px dashed #d1d5db', flexShrink: 0, opacity: 0.75 };
                                        return (
                                            <button key={'prev-' + modInfo.serial} onClick={function() { handleSelectModule(modInfo.serial); }} style={tileStyle} className={'flex items-center gap-1 transition-all ' + (isModActive ? '' : 'text-gray-500 dark:text-gray-400 dark:border-gray-600')}>
                                                {!isModActive && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />}
                                                {modInfo.serial}
                                            </button>
                                        );
                                    })}
                                    <span style={{ width: '1px', height: '20px', backgroundColor: '#e5e7eb', flexShrink: 0, margin: '0 2px' }} />
                                </React.Fragment>
                            )}

                            {/* Scheduled section */}
                            {deptModules.length > 0 && (
                                <React.Fragment>
                                    <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: selectedDeptObj ? (selectedDeptObj.color || '#6366f1') : '#6366f1', letterSpacing: '0.05em', flexShrink: 0, paddingRight: '2px' }}>Sched</span>
                                    {deptModules.map(function(modInfo) {
                                        var isModActive = modInfo.serial === selectedModule;
                                        var modPct = stbCalcCompletionPct(deptTasks, dayCompletions, modInfo.serial, selectedDept);
                                        var deptColor = selectedDeptObj ? (selectedDeptObj.color || '#6366f1') : '#6366f1';
                                        var dotColor = modPct === 100 ? '#16a34a' : modPct > 0 ? '#f59e0b' : '#9ca3af';
                                        var tileStyle = isModActive
                                            ? { backgroundColor: deptColor, color: '#fff', padding: '5px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, flexShrink: 0 }
                                            : { padding: '5px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, border: '1px solid #d1d5db', flexShrink: 0 };
                                        return (
                                            <button key={'sched-' + modInfo.serial} onClick={function() { handleSelectModule(modInfo.serial); }} style={tileStyle} className={'flex items-center gap-1.5 transition-all ' + (isModActive ? '' : 'text-gray-600 dark:text-gray-300 dark:border-gray-600')}>
                                                {!isModActive && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />}
                                                {modInfo.serial}
                                            </button>
                                        );
                                    })}
                                </React.Fragment>
                            )}

                            {/* Upcoming section */}
                            {ribbonSections.upcoming.length > 0 && (
                                <React.Fragment>
                                    <span style={{ width: '1px', height: '20px', backgroundColor: '#e5e7eb', flexShrink: 0, margin: '0 2px' }} />
                                    <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', letterSpacing: '0.05em', flexShrink: 0, paddingRight: '2px' }}>Next</span>
                                    {ribbonSections.upcoming.map(function(modInfo) {
                                        var isModActive = modInfo.serial === selectedModule;
                                        var modPct = stbCalcCompletionPct(deptTasks, dayCompletions, modInfo.serial, selectedDept);
                                        var dotColor = modPct === 100 ? '#16a34a' : modPct > 0 ? '#f59e0b' : '#9ca3af';
                                        var tileStyle = isModActive
                                            ? { backgroundColor: selectedDeptObj ? (selectedDeptObj.color || '#6366f1') : '#6366f1', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, flexShrink: 0, opacity: 1 }
                                            : { padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 400, border: '1px dashed #d1d5db', flexShrink: 0, opacity: 0.75 };
                                        return (
                                            <button key={'next-' + modInfo.serial} onClick={function() { handleSelectModule(modInfo.serial); }} style={tileStyle} className={'flex items-center gap-1 transition-all ' + (isModActive ? '' : 'text-gray-500 dark:text-gray-400 dark:border-gray-600')}>
                                                {!isModActive && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />}
                                                {modInfo.serial}
                                            </button>
                                        );
                                    })}
                                </React.Fragment>
                            )}
                        </div>
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

            {/* Mark All bulk action bar — fixed between header and task list */}
            {selectedModule && deptTasks.length > 0 && (
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" style={{ flexShrink: 0 }}>
                    {!bulkConfirm ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', whiteSpace: 'nowrap', marginRight: '2px' }}>Mark All:</span>
                            <button onClick={function() { handleMarkAllClick('not_started'); }}
                                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', minHeight: '30px' }}
                                className="flex-1 font-semibold bg-transparent border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">--</button>
                            <button onClick={function() { handleMarkAllClick('wip'); }}
                                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', minHeight: '30px' }}
                                className="flex-1 font-semibold bg-transparent border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all">WIP</button>
                            <button onClick={function() { handleMarkAllClick('complete'); }}
                                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', minHeight: '30px' }}
                                className="flex-1 font-semibold bg-transparent border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-all">Complete</button>
                            <button onClick={function() { handleMarkAllClick('stopped'); }}
                                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', minHeight: '30px' }}
                                className="flex-1 font-semibold bg-transparent border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all">Stop</button>
                            <button onClick={function() { handleMarkAllClick('na'); }}
                                style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', minHeight: '30px' }}
                                className="flex-1 font-semibold italic bg-transparent border border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">N/A</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                Mark all {deptTasks.filter(function(t) { return t.id !== TRAVELER_SIGNED_ID && t.id !== NON_CONFORMANCE_ID; }).length} tasks as <strong>{(STB_STATUSES[bulkConfirm.status] || {}).label || bulkConfirm.status}</strong>?
                            </span>
                            <button onClick={handleBulkConfirm}
                                style={{ padding: '5px 16px', fontSize: '12px', borderRadius: '6px', fontWeight: 700 }}
                                className="bg-blue-600 text-white hover:bg-blue-700 transition-all">Confirm</button>
                            <button onClick={function() { if (bulkTimerRef.current) clearTimeout(bulkTimerRef.current); setBulkConfirm(null); }}
                                style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px' }}
                                className="text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">Cancel</button>
                        </div>
                    )}
                </div>
            )}

            {/* Task list - scrollable */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                {!selectedModule && (
                    <STBEmpty message="Select a department and module to view tasks" />
                )}
                {selectedModule && deptTasks.length === 0 && (
                    <STBEmpty message="No tasks configured for this department" />
                )}
                {selectedModule && deptTasks.filter(function(t) { return t.id !== TRAVELER_SIGNED_ID && t.id !== NON_CONFORMANCE_ID; }).map(function(task) {
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

                {/* Traveler Sign-off section */}
                {selectedModule && deptTasks.length > 0 && (function() {
                    var travKey = selectedModule + '|' + selectedDept + '|' + TRAVELER_SIGNED_ID;
                    var ncKey = selectedModule + '|' + selectedDept + '|' + NON_CONFORMANCE_ID;
                    var travelerSigned = (dayCompletions[travKey] || 'not_started') === 'complete';
                    var ncFlagged = (dayCompletions[ncKey] || 'not_started') === 'complete';
                    return (
                        <div className="traveler-signoff" style={{ borderTop: '2px solid #e5e7eb', margin: '12px 0 8px', paddingTop: '10px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                                Traveler Sign-off
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                    onClick={handleTravelerToggle}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '8px', border: '1.5px solid',
                                        borderColor: !travelerSigned ? '#ef4444' : '#e5e7eb',
                                        background: !travelerSigned ? '#fef2f2' : '#fff',
                                        color: !travelerSigned ? '#ef4444' : '#9ca3af',
                                        fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    }}
                                >
                                    <span style={{ fontSize: '16px' }}>X</span>
                                    <span style={{ fontSize: '12px' }}>Unsigned</span>
                                </button>
                                <button
                                    onClick={handleTravelerToggle}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '8px', border: '1.5px solid',
                                        borderColor: travelerSigned ? '#16a34a' : '#e5e7eb',
                                        background: travelerSigned ? '#f0fdf4' : '#fff',
                                        color: travelerSigned ? '#16a34a' : '#9ca3af',
                                        fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    }}
                                >
                                    <span style={{ fontSize: '16px' }}>&#10003;</span>
                                    <span style={{ fontSize: '12px' }}>Signed</span>
                                </button>
                                <button
                                    onClick={handleNonConformanceToggle}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '8px', border: '1.5px solid',
                                        borderColor: ncFlagged ? '#ea580c' : '#e5e7eb',
                                        background: ncFlagged ? '#fff7ed' : '#fff',
                                        color: ncFlagged ? '#ea580c' : '#9ca3af',
                                        fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    }}
                                >
                                    <span style={{ fontSize: '16px' }}>!</span>
                                    <span style={{ fontSize: '12px' }}>Non-Conformance</span>
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {showModuleInfo && currentModInfo && currentModInfo.module && (
                <ModuleDetailPanel
                    module={currentModInfo.module}
                    onClose={function() { setShowModuleInfo(false); }}
                    departments={lineDepts}
                    assignments={completions}
                    tasks={allTasks}
                />
            )}
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
    var onTasksReordered = props.onTasksReordered;
    var ribbonSettings = props.ribbonSettings || { ribbon_trailing_count: 5, ribbon_upcoming_count: 5 };
    var onRibbonSettingsChange = props.onRibbonSettingsChange;

    var adminScrollRef = useRef(null);
    var adminScrollPos = useRef(0);

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
    var [taskError, setTaskError] = useState('');
    var draggingTaskRef = useRef(null);
    var dragOverTaskRef = useRef(null);

    // Department drag-reorder state
    var [orderedDepts, setOrderedDepts] = useState([]);
    var [deptOrderSaving, setDeptOrderSaving] = useState(false);
    var [deptOrderSaved, setDeptOrderSaved] = useState(false);
    var draggingDeptRef = useRef(null);
    var dragOverDeptRef = useRef(null);

    // Summary Column Order state
    var [summaryDepts, setSummaryDepts] = useState([]);
    var [summaryAbbrevs, setSummaryAbbrevs] = useState({});
    var [summarySaved, setSummarySaved] = useState(false);
    var [summarySaving, setSummarySaving] = useState(false);
    var draggingSummaryRef = useRef(null);
    var dragOverSummaryRef = useRef(null);

    // Init orderedDepts from lineDepts (syncs on every lineDepts change)
    useEffect(function() {
        if (lineDepts && lineDepts.length > 0) {
            setOrderedDepts(lineDepts.slice());
        }
    }, [lineDepts]);

    // Department drag-and-drop handlers
    function handleDeptDragStart(e, dept) {
        draggingDeptRef.current = dept;
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDeptDragOver(e, dept) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        dragOverDeptRef.current = dept;
    }

    function handleDeptDrop(e, targetDept) {
        e.preventDefault();
        var dragging = draggingDeptRef.current;
        if (!dragging || dragging.id === targetDept.id) return;

        var reordered = orderedDepts.slice();
        var fromIdx = reordered.findIndex(function(d) { return d.id === dragging.id; });
        var toIdx = reordered.findIndex(function(d) { return d.id === targetDept.id; });
        reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, dragging);

        // Assign new display_order values
        var updated = reordered.map(function(d, i) { return Object.assign({}, d, { display_order: i + 1 }); });

        // Optimistic local update
        setOrderedDepts(updated);
        setDeptOrderSaving(true);
        setDeptOrderSaved(false);

        // Persist to Supabase
        var client = window.supabaseClient || (window.MODA_SUPABASE && window.MODA_SUPABASE.getClient ? window.MODA_SUPABASE.getClient() : null);
        if (client) {
            Promise.all(
                updated.map(function(d) {
                    return client.from('station_departments').update({ display_order: d.display_order }).eq('id', d.id);
                })
            ).then(function() {
                setDeptOrderSaving(false);
                setDeptOrderSaved(true);
                setTimeout(function() { setDeptOrderSaved(false); }, 1500);
                if (onRefresh) onRefresh();
            }).catch(function(err) {
                console.error('[AdminConfig] Failed to save dept order:', err);
                setDeptOrderSaving(false);
                setError('Failed to save department order');
                // Rollback
                setOrderedDepts(lineDepts ? lineDepts.slice() : []);
            });
        }

        draggingDeptRef.current = null;
        dragOverDeptRef.current = null;
    }

    function handleDeptDragEnd() {
        draggingDeptRef.current = null;
        dragOverDeptRef.current = null;
    }

    // Init summary depts when lineDepts loads
    useEffect(function() {
        if (lineDepts && lineDepts.length > 0 && summaryDepts.length === 0) {
            var sorted = lineDepts.slice().sort(function(a, b) { return (a.summary_order != null ? a.summary_order : 999) - (b.summary_order != null ? b.summary_order : 999); });
            setSummaryDepts(sorted);
            var abbrevMap = {};
            for (var i = 0; i < sorted.length; i++) {
                abbrevMap[sorted[i].id] = sorted[i].abbreviation || '';
            }
            setSummaryAbbrevs(abbrevMap);
        }
    }, [lineDepts]);

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
        setTaskError('');
        var SB = window.MODA_STATION_BOARD;
        if (!SB) { setError('Data layer not loaded'); setSaving(false); return; }
        var taskName = newTaskName.trim();
        SB.addTask({ department_id: selectedDeptForTasks, task_name: taskName })
            .then(function(newTask) {
                setNewTaskName(''); setSaving(false);
                if (onTaskAdded && newTask) { onTaskAdded(newTask); }
                else if (onRefresh) { onRefresh(); }
            })
            .catch(function(err) {
                setSaving(false);
                if (err.message && err.message.indexOf('already exists') !== -1) {
                    setTaskError('Task name already exists in this department');
                } else {
                    setError(err.message);
                }
            });
    }

    function handleRemoveTask(taskId) {
        var SB = window.MODA_STATION_BOARD;
        if (!SB) return;
        SB.removeTask(taskId).then(function() {
            if (onTaskRemoved) { onTaskRemoved(taskId); }
            else if (onRefresh) { onRefresh(); }
        }).catch(function(err) { setError(err.message); });
    }

    // Drag-to-reorder handlers (useRef to avoid re-renders/scroll jumps)
    function handleTaskDragStart(e, task) {
        draggingTaskRef.current = task;
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleTaskDragOver(e, task) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        dragOverTaskRef.current = task;
    }

    function handleTaskDrop(e, targetTask) {
        e.preventDefault();
        var dragging = draggingTaskRef.current;
        if (!dragging || dragging.id === targetTask.id) return;

        var currentDeptTasks = deptTasks.slice();
        var fromIdx = currentDeptTasks.findIndex(function(t) { return t.id === dragging.id; });
        var toIdx = currentDeptTasks.findIndex(function(t) { return t.id === targetTask.id; });
        currentDeptTasks.splice(fromIdx, 1);
        currentDeptTasks.splice(toIdx, 0, dragging);

        var updated = currentDeptTasks.map(function(t, i) { return Object.assign({}, t, { display_order: i + 1 }); });

        // Optimistic update — avoids full loadData/setLoading cycle
        if (onTasksReordered) {
            onTasksReordered(updated, selectedDeptForTasks);
        }

        // Persist to Supabase silently — no onRefresh
        var client = window.supabaseClient;
        if (client) {
            Promise.all(
                updated.map(function(t) {
                    return client.from('station_tasks').update({ display_order: t.display_order }).eq('id', t.id);
                })
            ).catch(function(err) {
                console.error('Failed to save task order:', err);
            });
        }

        draggingTaskRef.current = null;
        dragOverTaskRef.current = null;
    }

    function handleTaskDragEnd() {
        draggingTaskRef.current = null;
        dragOverTaskRef.current = null;
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

    // Restore scroll position after re-renders
    useEffect(function() {
        if (adminScrollRef.current) {
            adminScrollRef.current.scrollTop = adminScrollPos.current;
        }
    });

    return (
        <div ref={adminScrollRef} onScroll={function(e) { adminScrollPos.current = e.target.scrollTop; }} className="px-3 py-4 space-y-3 max-w-lg mx-auto overflow-y-auto" style={{ maxHeight: '100%' }}>
            {error && <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 text-xs">{error}</div>}

            {/* Department Manager */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button onClick={function() { handleTogglePanel('departments'); }} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 min-h-[48px]">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">Department Manager</span>
                    <span className="text-gray-400">{openPanel === 'departments' ? '▼' : '▶'}</span>
                </button>
                {openPanel === 'departments' && (
                    <div className="p-3 space-y-2 border-t border-gray-200 dark:border-gray-700">
                        {deptOrderSaving && <div className="text-xs text-blue-600 font-medium">Saving order...</div>}
                        {deptOrderSaved && <div className="text-xs text-green-600 font-medium">Order saved ✓</div>}
                        {orderedDepts.map(function(dept) {
                            return (
                                <div
                                    key={dept.id}
                                    draggable
                                    onDragStart={function(e) { handleDeptDragStart(e, dept); }}
                                    onDragOver={function(e) { handleDeptDragOver(e, dept); }}
                                    onDrop={function(e) { handleDeptDrop(e, dept); }}
                                    onDragEnd={handleDeptDragEnd}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 cursor-grab active:cursor-grabbing"
                                >
                                    <span className="text-gray-400 select-none" style={{ fontSize: '14px', lineHeight: 1, cursor: 'grab' }} title="Drag to reorder">⠿</span>
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
                            <button type="button" onClick={handleAddDept} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium min-h-[44px] disabled:opacity-50">Add</button>
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
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={function(e) { handleTaskDragStart(e, task); }}
                                    onDragOver={function(e) { handleTaskDragOver(e, task); }}
                                    onDrop={function(e) { handleTaskDrop(e, task); }}
                                    onDragEnd={handleTaskDragEnd}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '4px', cursor: 'grab' }}
                                >
                                    <span style={{ color: '#aaa', fontSize: '16px', cursor: 'grab', flexShrink: 0 }}>{"\u2807\u2807"}</span>
                                    <span style={{ flex: 1, fontSize: '14px' }}>{task.task_name}</span>
                                    <button type="button" onClick={function() { handleRemoveTask(task.id); }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Remove</button>
                                </div>
                            );
                        })}
                        {selectedDeptForTasks && (
                            <div>
                                <div className="flex gap-2 pt-2">
                                    <input
                                        type="text"
                                        value={newTaskName}
                                        onChange={function(e) { setNewTaskName(e.target.value); setTaskError(''); }}
                                        placeholder="New task name"
                                        className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm min-h-[44px]"
                                    />
                                    <button type="button" onClick={handleAddTask} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium min-h-[44px] disabled:opacity-50">Add</button>
                                </div>
                                {taskError && <div className="text-red-500 text-xs mt-1 px-1">{taskError}</div>}
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

            {/* Daily Board Settings */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button onClick={function() { handleTogglePanel('dailyBoardSettings'); }} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 min-h-[48px]">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">Daily Board Settings</span>
                    <span className="text-gray-400">{openPanel === 'dailyBoardSettings' ? '\u25BC' : '\u25B6'}</span>
                </button>
                {openPanel === 'dailyBoardSettings' && (
                    <div className="p-3 space-y-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-400 mb-1">Configure how many modules show before and after the scheduled set in the Daily Board ribbon.</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <label style={{ fontSize: '13px', color: '#374151', flex: 1 }}>Previous (trailing) count</label>
                            <input
                                type="number"
                                min="0"
                                max="20"
                                value={ribbonSettings.ribbon_trailing_count}
                                onChange={function(e) {
                                    var val = parseInt(e.target.value) || 0;
                                    if (onRibbonSettingsChange) onRibbonSettingsChange(function(prev) { return Object.assign({}, prev, { ribbon_trailing_count: val }); });
                                }}
                                style={{ width: '60px', padding: '6px 10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #d1d5db', textAlign: 'center' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <label style={{ fontSize: '13px', color: '#374151', flex: 1 }}>Upcoming count</label>
                            <input
                                type="number"
                                min="0"
                                max="20"
                                value={ribbonSettings.ribbon_upcoming_count}
                                onChange={function(e) {
                                    var val = parseInt(e.target.value) || 0;
                                    if (onRibbonSettingsChange) onRibbonSettingsChange(function(prev) { return Object.assign({}, prev, { ribbon_upcoming_count: val }); });
                                }}
                                style={{ width: '60px', padding: '6px 10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #d1d5db', textAlign: 'center' }}
                            />
                        </div>
                        <button
                            onClick={function() {
                                var client = window.MODA_SUPABASE && window.MODA_SUPABASE.client ? window.MODA_SUPABASE.client : window.supabaseClient;
                                if (!client) { setError('Supabase client not available'); return; }
                                Promise.all([
                                    client.from('app_settings').upsert({ key: 'ribbon_trailing_count', value: String(ribbonSettings.ribbon_trailing_count), updated_at: new Date().toISOString() }, { onConflict: 'key' }),
                                    client.from('app_settings').upsert({ key: 'ribbon_upcoming_count', value: String(ribbonSettings.ribbon_upcoming_count), updated_at: new Date().toISOString() }, { onConflict: 'key' })
                                ]).then(function() {
                                    setError('');
                                    // Brief success indicator
                                    var btn = document.getElementById('ribbon-save-btn');
                                    if (btn) { btn.textContent = 'Saved'; setTimeout(function() { btn.textContent = 'Save'; }, 1500); }
                                }).catch(function(err) {
                                    setError(err.message || 'Failed to save ribbon settings');
                                });
                            }}
                            id="ribbon-save-btn"
                            style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', minHeight: '40px' }}
                        >
                            Save
                        </button>
                    </div>
                )}
            </div>

            {/* Summary Column Order */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button onClick={function() { handleTogglePanel('summaryOrder'); }} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 min-h-[48px]">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">Summary Column Order</span>
                    <span className="text-gray-400">{openPanel === 'summaryOrder' ? '\u25BC' : '\u25B6'}</span>
                </button>
                {openPanel === 'summaryOrder' && (
                    <div className="p-3 space-y-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-400 mb-2">Drag to reorder departments as they appear left-to-right in the Weekly Summary grid.</p>
                        {summaryDepts.map(function(dept) {
                            return (
                                <div
                                    key={dept.id}
                                    draggable
                                    onDragStart={function(e) { draggingSummaryRef.current = dept; e.dataTransfer.effectAllowed = 'move'; }}
                                    onDragOver={function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; dragOverSummaryRef.current = dept; }}
                                    onDrop={function(e) {
                                        e.preventDefault();
                                        var dragging = draggingSummaryRef.current;
                                        if (!dragging || dragging.id === dept.id) return;
                                        setSummaryDepts(function(prev) {
                                            var arr = prev.slice();
                                            var fromIdx = arr.findIndex(function(d) { return d.id === dragging.id; });
                                            var toIdx = arr.findIndex(function(d) { return d.id === dept.id; });
                                            arr.splice(fromIdx, 1);
                                            arr.splice(toIdx, 0, dragging);
                                            return arr;
                                        });
                                        draggingSummaryRef.current = null;
                                        dragOverSummaryRef.current = null;
                                    }}
                                    onDragEnd={function() { draggingSummaryRef.current = null; dragOverSummaryRef.current = null; }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '4px', cursor: 'grab' }}
                                >
                                    <span style={{ color: '#aaa', fontSize: '16px', cursor: 'grab', flexShrink: 0 }}>{"\u2807\u2807"}</span>
                                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color || '#6366f1' }} />
                                    <span style={{ flex: 1, fontSize: '13px', color: '#374151' }}>{dept.name}</span>
                                    <input
                                        type="text"
                                        maxLength={10}
                                        value={summaryAbbrevs[dept.id] || ''}
                                        onChange={function(e) {
                                            var val = e.target.value;
                                            var id = dept.id;
                                            setSummaryAbbrevs(function(prev) { var n = Object.assign({}, prev); n[id] = val; return n; });
                                        }}
                                        placeholder="Abbrev"
                                        style={{ width: '90px', padding: '4px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                                    />
                                </div>
                            );
                        })}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '8px' }}>
                            <button
                                onClick={function() {
                                    setSummarySaving(true);
                                    var client = window.supabaseClient;
                                    if (!client) { setError('Supabase client not available'); setSummarySaving(false); return; }
                                    Promise.all(
                                        summaryDepts.map(function(d, i) {
                                            return client.from('station_departments').update({ summary_order: i + 1, abbreviation: summaryAbbrevs[d.id] || null }).eq('id', d.id);
                                        })
                                    ).then(function() {
                                        setSummarySaving(false);
                                        setSummarySaved(true);
                                        setTimeout(function() { setSummarySaved(false); }, 2000);
                                        if (onRefresh) onRefresh();
                                    }).catch(function(err) {
                                        setSummarySaving(false);
                                        setError(err.message || 'Failed to save order');
                                    });
                                }}
                                disabled={summarySaving}
                                style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 500, borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', minHeight: '40px', opacity: summarySaving ? 0.5 : 1 }}
                            >
                                {summarySaving ? 'Saving...' : 'Save Order'}
                            </button>
                            {summarySaved && (
                                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500 }}>Saved</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB: WEEKLY SUMMARY — Completion grid by dept with green heat scale
// ═══════════════════════════════════════════════════════════════════════════

function summaryGetPctColor(pct) {
    if (pct === 0)   return { bg: '#ffffff', text: '#bbb',    border: 'rgba(0,0,0,0.12)' };
    if (pct < 25)    return { bg: '#EAF3DE', text: '#3B6D11', border: 'rgba(0,0,0,0.09)' };
    if (pct < 50)    return { bg: '#C0DD97', text: '#27500A', border: 'rgba(0,0,0,0.09)' };
    if (pct < 75)    return { bg: '#97C459', text: '#173404', border: 'rgba(0,0,0,0.09)' };
    if (pct < 100)   return { bg: '#639922', text: '#EAF3DE', border: 'rgba(0,0,0,0.09)' };
    return           { bg: '#27500A', text: '#C0DD97', border: 'rgba(39,80,10,0.3)' };
}

function WeeklySummaryTab(props) {
    var weekSchedule = props.weekSchedule;
    var completions = props.completions;
    var allTasks = props.allTasks;
    var lineDepts = props.lineDepts;
    var modules = props.modules;
    var shifts = props.shifts;

    var selectedWeek = weekSchedule ? weekSchedule.week_start : null;
    var weekAssignments = (weekSchedule && weekSchedule.assignments) ? weekSchedule.assignments : [];

    // Export modal state
    var [showExportModal, setShowExportModal] = useState(false);
    var [exportRange, setExportRange] = useState('current');
    var [exportWeekRange, setExportWeekRange] = useState('current');

    var EXPORT_OPTIONS = [
        { value: 'prev', label: 'Previous Week' },
        { value: 'current', label: 'Current Week' },
        { value: 'next', label: 'Next Week' },
        { value: 'curr+next', label: 'Current + Next Week' },
        { value: 'all3', label: 'Previous + Current + Next Week' },
    ];

    var weekDays = useMemo(function() { return stbWeekDates(selectedWeek); }, [selectedWeek]);

    // Master build sequence (sorted by buildSequence ascending — one shared ordered list)
    var masterSeq = useMemo(function() {
        if (!modules || modules.length === 0) return [];
        return modules.slice().sort(function(a, b) {
            return (a.buildSequence ?? a.build_sequence ?? 0) - (b.buildSequence ?? b.build_sequence ?? 0);
        });
    }, [modules]);

    // Base index: position of the week's starting serial in master sequence
    var baseIdx = useMemo(function() {
        if (!weekSchedule || !weekSchedule.starting_serial || masterSeq.length === 0) return -1;
        var ss = (weekSchedule.starting_serial || '').trim();
        for (var i = 0; i < masterSeq.length; i++) {
            if ((masterSeq[i].serialNumber || '').trim() === ss) return i;
        }
        return -1;
    }, [weekSchedule, masterSeq]);

    // Active production dates (only days that have scheduled shifts)
    var activeDates = useMemo(function() {
        return stbGetActiveDates(weekDays, shifts);
    }, [weekDays, shifts]);

    var modulesPerDay = (weekSchedule && weekSchedule.line_balance) || 5;

    // Build day → module serials for reference dept (stagger=0) from master sequence
    var dayModules = useMemo(function() {
        var result = {};
        for (var i = 0; i < weekDays.length; i++) {
            var date = weekDays[i].date;
            var prodDayOffset = activeDates.indexOf(date);
            if (prodDayOffset < 0 || baseIdx < 0 || masterSeq.length === 0) {
                result[date] = [];
                continue;
            }
            var mods = stbDeptModulesForDay(masterSeq, baseIdx, prodDayOffset, modulesPerDay, 0);
            result[date] = mods.map(function(m) { return m.serialNumber || ''; });
        }
        return result;
    }, [weekDays, activeDates, masterSeq, baseIdx, modulesPerDay]);

    // Module lookup by serial (from modules prop + fallback from assignments)
    var moduleMap = useMemo(function() {
        var map = {};
        if (modules) {
            for (var i = 0; i < modules.length; i++) {
                var m = modules[i];
                if (m.serialNumber) map[m.serialNumber] = m;
            }
        }
        // Fallback: build minimal module info from assignments themselves
        for (var j = 0; j < weekAssignments.length; j++) {
            var a = weekAssignments[j];
            if (a.module_serial && !map[a.module_serial]) {
                map[a.module_serial] = { serialNumber: a.module_serial, buildSequence: a.build_sequence || '' };
            }
        }
        return map;
    }, [modules, weekAssignments]);

    // Completion % for a module+dept
    function calcPct(moduleSerial, deptId) {
        var deptTasks = allTasks ? allTasks.filter(function(t) {
            return t.department_id === deptId &&
                   t.id !== TRAVELER_SIGNED_ID &&
                   t.id !== NON_CONFORMANCE_ID;
        }) : [];
        if (deptTasks.length === 0) return 0;
        var modComps = completions ? completions.filter(function(c) {
            return c.module_serial === moduleSerial && c.department_id === deptId &&
                   c.task_id !== TRAVELER_SIGNED_ID && c.task_id !== NON_CONFORMANCE_ID;
        }) : [];
        var naCount = modComps.filter(function(c) { return c.status === 'na'; }).length;
        var completeCount = modComps.filter(function(c) { return c.status === 'complete'; }).length;
        var denominator = deptTasks.length - naCount;
        return denominator > 0 ? Math.round((completeCount / denominator) * 100) : 0;
    }

    // Dept header labels
    function deptLabel(dept) {
        if (dept.abbreviation) return dept.abbreviation;
        return dept.name.length > 8 ? dept.name.substring(0, 8) : dept.name;
    }

    if (!selectedWeek) {
        return React.createElement(STBEmpty, { message: 'No week scheduled.' });
    }

    var weekLabel = stbWeekLabel(selectedWeek);

    // Build rows: [{date, dayIndex, label, dayNum, moduleSerial, moduleIdx}]
    var rows = [];
    for (var di = 0; di < weekDays.length; di++) {
        var day = weekDays[di];
        var mods = dayModules[day.date] || [];
        for (var mi = 0; mi < mods.length; mi++) {
            rows.push({ date: day.date, dayIndex: day.dayIndex, label: day.label, dayNum: day.dayNum, moduleSerial: mods[mi], moduleIdx: mi, dayModCount: mods.length });
        }
        if (mods.length === 0) {
            rows.push({ date: day.date, dayIndex: day.dayIndex, label: day.label, dayNum: day.dayNum, moduleSerial: null, moduleIdx: 0, dayModCount: 0 });
        }
    }

    var depts = (lineDepts || []).slice().sort(function(a, b) { return (a.display_order != null ? a.display_order : 999) - (b.display_order != null ? b.display_order : 999); });

    var cellBorder = '1px solid #e5e7eb';
    var shift1Bg = 'rgba(24,95,165,0.025)';
    var shift2Bg = 'rgba(133,79,11,0.03)';

    // Multi-week export: compute additional weeks' data when exporting
    var exportWeeks = useMemo(function() {
        if (exportWeekRange === 'current' || !selectedWeek) return null;
        // Compute which weeks to render for export (replaces the main table)
        var offsets = [];
        if (exportWeekRange === 'prev') offsets = [-1];
        else if (exportWeekRange === 'next') offsets = [1];
        else if (exportWeekRange === 'curr+next') offsets = [0, 1];
        else if (exportWeekRange === 'all3') offsets = [-1, 0, 1];
        else return null;

        // Find reference dept for export (same logic as dayModules)
        var refDeptId = null;
        if (lineDepts && lineDepts.length > 0) {
            var sDepts = lineDepts.slice().sort(function(a, b) { return (a.display_order != null ? a.display_order : 999) - (b.display_order != null ? b.display_order : 999); });
            var rDept = sDepts.find(function(d) { return (d.stagger_offset || 0) === 0; }) || sDepts[0];
            if (rDept) refDeptId = rDept.id;
        }

        return offsets.map(function(offset) {
            var ws = stbShiftWeek(selectedWeek, offset);
            var wDays = stbWeekDates(ws);
            var wLabel = stbWeekLabel(ws);
            var wRows = [];
            for (var di = 0; di < wDays.length; di++) {
                var d = wDays[di];
                var seen = {};
                var dayMods = [];
                for (var j = 0; j < weekAssignments.length; j++) {
                    var a = weekAssignments[j];
                    var aDate = (a.target_date || '').split('T')[0];
                    if (aDate !== d.date) continue;
                    if (refDeptId && a.department_id !== refDeptId) continue;
                    if (!seen[a.module_serial]) {
                        seen[a.module_serial] = true;
                        dayMods.push(a.module_serial);
                    }
                }
                for (var mi = 0; mi < dayMods.length; mi++) {
                    wRows.push({ date: d.date, dayIndex: d.dayIndex, label: d.label, dayNum: d.dayNum, moduleSerial: dayMods[mi], moduleIdx: mi, dayModCount: dayMods.length });
                }
                if (dayMods.length === 0) {
                    wRows.push({ date: d.date, dayIndex: d.dayIndex, label: d.label, dayNum: d.dayNum, moduleSerial: null, moduleIdx: 0, dayModCount: 0 });
                }
            }
            return { weekStart: ws, weekLabel: wLabel, rows: wRows, weekDays: wDays };
        });
    }, [exportWeekRange, selectedWeek, weekAssignments, lineDepts]);

    // Helper to render a week table
    function renderWeekTable(wRows, wLabel, wDepts) {
        return (
            <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#374151' }}>{wLabel}</div>
                <table style={{ borderCollapse: 'collapse', minWidth: '100%', marginBottom: '8px' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '140px', minWidth: '140px', padding: '6px 8px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#374151', background: '#f9fafb', border: cellBorder, borderRight: '2px solid #e5e7eb' }}>Day</th>
                            <th style={{ width: '32px', minWidth: '32px', padding: '4px', textAlign: 'center', fontSize: '10px', fontWeight: 600, color: '#9ca3af', background: '#f9fafb', border: cellBorder }}>#</th>
                            {wDepts.map(function(dept) {
                                return <th key={dept.id} style={{ padding: '4px 6px', textAlign: 'center', fontSize: '10px', fontWeight: 600, color: '#374151', border: cellBorder, minWidth: '76px' }}>{deptLabel(dept)}</th>;
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {wRows.map(function(row, rowIdx) {
                            var isShift1 = SHIFT1_DAYS.includes(row.dayIndex);
                            var rowBg = isShift1 ? shift1Bg : shift2Bg;
                            var isFirstOfDay = row.moduleIdx === 0;
                            var isShiftDivider = row.dayIndex === 4 && row.moduleIdx === 0;
                            var shiftDividerStyle = isShiftDivider ? { borderTop: '3px solid #d1d5db' } : {};
                            var mod = row.moduleSerial ? moduleMap[row.moduleSerial] : null;
                            var buildSeq = mod ? (mod.buildSequence || '') : '';
                            var serialNumber = row.moduleSerial || '';
                            return (
                                <tr key={row.date + '|' + row.moduleIdx} style={Object.assign({ background: rowBg }, shiftDividerStyle)}>
                                    {isFirstOfDay && (
                                        <td rowSpan={row.dayModCount || 1} style={{
                                            width: '140px', minWidth: '140px',
                                            padding: '6px 8px',
                                            verticalAlign: 'top',
                                            background: '#f9fafb',
                                            borderRight: '2px solid #e5e7eb',
                                            border: cellBorder,
                                        }}>
                                            <div style={{
                                                background: isShift1 ? 'rgba(24,95,165,0.07)' : 'rgba(133,79,11,0.07)',
                                                border: isShift1 ? '1px solid rgba(24,95,165,0.2)' : '1px solid rgba(133,79,11,0.2)',
                                                borderRadius: '8px',
                                                padding: '8px 10px',
                                            }}>
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                                                    {row.label}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>
                                                    {stbParseDate(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </div>
                                                <div style={{
                                                    fontSize: '9px', fontWeight: 600, marginTop: '4px',
                                                    color: isShift1 ? '#185FA5' : '#854F0B',
                                                    textTransform: 'uppercase', letterSpacing: '0.3px'
                                                }}>
                                                    Shift {isShift1 ? '1' : '2'}
                                                </div>
                                                <div style={{
                                                    marginTop: '6px',
                                                    display: 'inline-block',
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    color: isShift1 ? '#185FA5' : '#854F0B',
                                                    background: isShift1 ? 'rgba(24,95,165,0.1)' : 'rgba(133,79,11,0.1)',
                                                    borderRadius: '10px',
                                                    padding: '2px 8px',
                                                }}>
                                                    {row.dayModCount} mod{row.dayModCount !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                        </td>
                                    )}
                                    <td style={{ width: '32px', padding: '2px 4px', textAlign: 'center', fontSize: '11px', color: '#9ca3af', background: '#f9fafb', border: cellBorder }}>
                                        {row.moduleSerial ? (row.moduleIdx + 1) : ''}
                                    </td>
                                    {wDepts.map(function(dept) {
                                        if (!row.moduleSerial) return <td key={dept.id} style={{ border: cellBorder, padding: '4px' }} />;
                                        var prodDayOffset = activeDates.indexOf(row.date);
                                        var deptMods = (prodDayOffset >= 0 && baseIdx >= 0)
                                            ? stbDeptModulesForDay(masterSeq, baseIdx, prodDayOffset, modulesPerDay, dept.stagger_offset || 0)
                                            : [];
                                        var deptMod = (row.moduleIdx < deptMods.length) ? deptMods[row.moduleIdx] : null;
                                        if (!deptMod) {
                                            return <td key={dept.id} style={{ border: cellBorder, padding: '4px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                <div style={{ color: '#d1d5db', fontSize: '11px' }}>--</div>
                                            </td>;
                                        }
                                        var deptSerial = deptMod.serialNumber || '';
                                        var deptBuildSeq = deptMod.buildSequence || '';
                                        var pct = calcPct(deptSerial, dept.id);
                                        var colors = summaryGetPctColor(pct);
                                        return (
                                            <td key={dept.id} style={{ border: cellBorder, padding: '2px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                <div className="module-tile" style={{ borderRadius: '6px', padding: '5px 4px', margin: '2px auto', width: '64px', textAlign: 'center', background: colors.bg, border: '1px solid ' + colors.border, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                                                    <div className="mt-seq" style={{ fontSize: '9px', opacity: 0.75, color: colors.text }}>({deptBuildSeq})</div>
                                                    <div className="mt-serial" style={{ fontSize: '10px', fontWeight: 500, color: colors.text }}>{deptSerial}</div>
                                                    <div className="mt-pct" style={{ fontSize: '11px', fontWeight: 500, marginTop: '1px', color: colors.text }}>{pct}%</div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div style={{ padding: '16px', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Print-specific CSS */}
            <style dangerouslySetInnerHTML={{ __html: '\
@media print {\
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }\
  body * { visibility: hidden; }\
  .wsb-print-area, .wsb-print-area * { visibility: visible; }\
  .wsb-print-area { position: absolute; left: 0; top: 0; width: 100%; }\
  .wsb-no-print { display: none !important; }\
  .wsb-print-header { display: block !important; margin-bottom: 12px; }\
  @page { size: A3 landscape; margin: 10mm; }\
  .wsb-print-area table { font-size: 8px; width: 100%; }\
  .wsb-print-area .module-tile { width: 48px; padding: 3px 2px; }\
  .wsb-print-area .mt-serial { font-size: 8px; }\
  .wsb-print-area .mt-pct { font-size: 9px; }\
  .wsb-print-area .mt-seq { font-size: 7px; }\
}\
' }} />

            <div className="wsb-print-area">
                {/* Print-only header */}
                <div className="wsb-print-header" style={{ display: 'none' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{'Weekly Production Summary \u2014 ' + (exportWeeks && exportWeeks.length > 0 ? exportWeeks.map(function(w) { return w.weekLabel; }).join(' + ') : weekLabel)}</h2>
                    <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>{'Generated ' + new Date().toLocaleDateString()}</p>
                </div>

                {/* Header */}
                <div style={{ marginBottom: '12px' }} className="wsb-no-print">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                            <span style={{ fontSize: '16px', fontWeight: 700 }}>Weekly Summary</span>
                            <span style={{ fontSize: '13px', marginLeft: '8px', color: '#6b7280' }}>{weekLabel}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px' }}>
                            <span style={{ display: 'inline-block', width: '14px', height: '14px', background: '#ffffff', border: '1px solid #ddd', borderRadius: '3px' }} />
                            <span style={{ color: '#888' }}>0%</span>
                            <span style={{ display: 'inline-block', width: '14px', height: '14px', background: '#97C459', border: '1px solid rgba(0,0,0,0.09)', borderRadius: '3px' }} />
                            <span style={{ color: '#888' }}>~50%</span>
                            <span style={{ display: 'inline-block', width: '14px', height: '14px', background: '#27500A', border: '1px solid rgba(39,80,10,0.3)', borderRadius: '3px' }} />
                            <span style={{ color: '#888' }}>100%</span>
                            <button
                                className="wsb-no-print"
                                onClick={function() { setShowExportModal(true); }}
                                style={{
                                    padding: '6px 14px', fontSize: '12px', fontWeight: '500',
                                    borderRadius: '6px', border: '1.5px solid #6366f1',
                                    color: '#6366f1', background: 'transparent', cursor: 'pointer',
                                    marginLeft: '8px',
                                }}
                            >
                                Export PDF
                            </button>
                        </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                        <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#185FA5', borderRadius: '2px', marginRight: '4px' }} />
                        <span style={{ marginRight: '12px' }}>Shift 1</span>
                        <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#854F0B', borderRadius: '2px', marginRight: '4px' }} />
                        <span>Shift 2</span>
                    </div>
                </div>

                {/* Table wrapper — hidden when multi-week export is active */}
                <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', display: (exportWeeks && exportWeeks.length > 0) ? 'none' : undefined }}>
                    <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ width: '140px', minWidth: '140px', padding: '6px 8px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#374151', background: '#f9fafb', border: cellBorder, borderRight: '2px solid #e5e7eb' }}>Day</th>
                                <th style={{ width: '32px', minWidth: '32px', padding: '4px', textAlign: 'center', fontSize: '10px', fontWeight: 600, color: '#9ca3af', background: '#f9fafb', border: cellBorder }}>#</th>
                                {depts.map(function(dept) {
                                    return (
                                        <th key={dept.id} style={{ padding: '4px 6px', textAlign: 'center', fontSize: '10px', fontWeight: 600, color: '#374151', border: cellBorder, minWidth: '76px' }}>{deptLabel(dept)}</th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(function(row, rowIdx) {
                                var isShift1 = SHIFT1_DAYS.includes(row.dayIndex);
                                var rowBg = isShift1 ? shift1Bg : shift2Bg;
                                var isFirstOfDay = row.moduleIdx === 0;
                                var isShiftDivider = row.dayIndex === 4 && row.moduleIdx === 0;
                                var shiftDividerStyle = isShiftDivider ? { borderTop: '3px solid #d1d5db' } : {};

                                var mod = row.moduleSerial ? moduleMap[row.moduleSerial] : null;
                                var buildSeq = mod ? (mod.buildSequence || '') : '';
                                var serialNumber = row.moduleSerial || '';

                                return (
                                    <tr key={row.date + '|' + row.moduleIdx} style={Object.assign({ background: rowBg }, shiftDividerStyle)}>
                                        {/* Day cell - rowSpan */}
                                        {isFirstOfDay && (
                                            <td rowSpan={row.dayModCount || 1} style={{
                                                width: '140px', minWidth: '140px',
                                                padding: '6px 8px',
                                                verticalAlign: 'top',
                                                background: '#f9fafb',
                                                borderRight: '2px solid #e5e7eb',
                                                border: cellBorder,
                                            }}>
                                                <div style={{
                                                    background: isShift1 ? 'rgba(24,95,165,0.07)' : 'rgba(133,79,11,0.07)',
                                                    border: isShift1 ? '1px solid rgba(24,95,165,0.2)' : '1px solid rgba(133,79,11,0.2)',
                                                    borderRadius: '8px',
                                                    padding: '8px 10px',
                                                }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                                                        {row.label}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>
                                                        {stbParseDate(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '9px', fontWeight: 600, marginTop: '4px',
                                                        color: isShift1 ? '#185FA5' : '#854F0B',
                                                        textTransform: 'uppercase', letterSpacing: '0.3px'
                                                    }}>
                                                        Shift {isShift1 ? '1' : '2'}
                                                    </div>
                                                    <div style={{
                                                        marginTop: '6px',
                                                        display: 'inline-block',
                                                        fontSize: '10px',
                                                        fontWeight: 600,
                                                        color: isShift1 ? '#185FA5' : '#854F0B',
                                                        background: isShift1 ? 'rgba(24,95,165,0.1)' : 'rgba(133,79,11,0.1)',
                                                        borderRadius: '10px',
                                                        padding: '2px 8px',
                                                    }}>
                                                        {row.dayModCount} mod{row.dayModCount !== 1 ? 's' : ''}
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        {/* # cell */}
                                        <td style={{ width: '32px', padding: '2px 4px', textAlign: 'center', fontSize: '11px', color: '#9ca3af', background: '#f9fafb', border: cellBorder }}>
                                            {row.moduleSerial ? (row.moduleIdx + 1) : ''}
                                        </td>
                                        {/* Dept cells */}
                                        {depts.map(function(dept) {
                                            if (!row.moduleSerial) {
                                                return <td key={dept.id} style={{ border: cellBorder, padding: '4px' }} />;
                                            }
                                            var prodDayOffset = activeDates.indexOf(row.date);
                                            var deptMods = (prodDayOffset >= 0 && baseIdx >= 0)
                                                ? stbDeptModulesForDay(masterSeq, baseIdx, prodDayOffset, modulesPerDay, dept.stagger_offset || 0)
                                                : [];
                                            var deptMod = (row.moduleIdx < deptMods.length) ? deptMods[row.moduleIdx] : null;
                                            if (!deptMod) {
                                                return <td key={dept.id} style={{ border: cellBorder, padding: '4px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <div style={{ color: '#d1d5db', fontSize: '11px' }}>--</div>
                                                </td>;
                                            }
                                            var deptSerial = deptMod.serialNumber || '';
                                            var deptBuildSeq = deptMod.buildSequence || '';
                                            var pct = calcPct(deptSerial, dept.id);
                                            var colors = summaryGetPctColor(pct);
                                            return (
                                                <td key={dept.id} style={{ border: cellBorder, padding: '2px', textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <div className="module-tile" style={{
                                                        borderRadius: '6px',
                                                        padding: '5px 4px',
                                                        margin: '2px auto',
                                                        width: '64px',
                                                        textAlign: 'center',
                                                        background: colors.bg,
                                                        border: '1px solid ' + colors.border,
                                                        WebkitPrintColorAdjust: 'exact',
                                                        printColorAdjust: 'exact',
                                                    }}>
                                                        <div className="mt-seq" style={{ fontSize: '9px', opacity: 0.75, color: colors.text }}>({deptBuildSeq})</div>
                                                        <div className="mt-serial" style={{ fontSize: '10px', fontWeight: 500, color: colors.text }}>{deptSerial}</div>
                                                        <div className="mt-pct" style={{ fontSize: '11px', fontWeight: 500, marginTop: '1px', color: colors.text }}>{pct}%</div>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Multi-week export: rendered only when exportWeekRange !== 'current' */}
                {exportWeeks && exportWeeks.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                        {exportWeeks.map(function(ew) {
                            return <div key={ew.weekStart}>{renderWeekTable(ew.rows, ew.weekLabel, depts)}</div>;
                        })}
                    </div>
                )}
            </div>

            {/* Export PDF Modal */}
            {showExportModal && (
                <div onClick={function() { setShowExportModal(false); }} style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div onClick={function(e) { e.stopPropagation(); }} style={{
                        background: '#fff', borderRadius: '12px', padding: '28px 32px',
                        minWidth: '320px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)'
                    }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600' }}>Export Weekly Summary PDF</h3>
                        <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#666' }}>Select date range to include:</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                            {EXPORT_OPTIONS.map(function(opt) {
                                return (
                                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="exportRange"
                                            value={opt.value}
                                            checked={exportRange === opt.value}
                                            onChange={function() { setExportRange(opt.value); }}
                                        />
                                        {opt.label}
                                    </label>
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={function() { setShowExportModal(false); }} style={{
                                padding: '8px 16px', borderRadius: '6px', border: '1px solid #e5e7eb',
                                background: '#fff', cursor: 'pointer', fontSize: '13px'
                            }}>Cancel</button>
                            <button onClick={function() {
                                setShowExportModal(false);
                                setExportWeekRange(exportRange);
                                setTimeout(function() {
                                    window.print();
                                    setTimeout(function() { setExportWeekRange('current'); }, 1000);
                                }, 300);
                            }} style={{
                                padding: '8px 16px', borderRadius: '6px', border: 'none',
                                background: '#6366f1', color: '#fff', cursor: 'pointer',
                                fontSize: '13px', fontWeight: '500'
                            }}>Export PDF</button>
                        </div>
                    </div>
                </div>
            )}
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
    var [ribbonSettings, setRibbonSettings] = useState({ ribbon_trailing_count: 5, ribbon_upcoming_count: 5 });

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

        var computedWeekStart = stbGetCurrentWeekStart();

        // First try to find the active week from DB, fall back to computed
        var schedulePromise = SB.getActiveOrCurrentWeekSchedule
            ? SB.getActiveOrCurrentWeekSchedule(computedWeekStart)
            : (SB.getWeeklySchedule ? SB.getWeeklySchedule(computedWeekStart) : Promise.resolve(null));

        // Load ribbon settings from app_settings table
        var client = window.MODA_SUPABASE && window.MODA_SUPABASE.client ? window.MODA_SUPABASE.client : window.supabaseClient;
        if (client) {
            client.from('app_settings').select('key, value').in('key', ['ribbon_trailing_count', 'ribbon_upcoming_count']).then(function(res) {
                if (res.data && res.data.length > 0) {
                    var settings = {};
                    res.data.forEach(function(row) { settings[row.key] = parseInt(row.value) || 5; });
                    setRibbonSettings(function(prev) { return Object.assign({}, prev, settings); });
                }
            }).catch(function(err) { console.warn('[StationTaskBoard] Failed to load ribbon settings:', err); });
        }

        var promises = [
            SUP ? SUP.getCurrentSupervisor() : Promise.resolve(null),
            schedulePromise,
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
                console.log('[StationTaskBoard] Using week_start from DB:', ws, '(computed was:', computedWeekStart, ')');
                console.log('[StationTaskBoard] Schedule loaded, fetching assignments for ws:', ws);
                SB.getDayAssignments(ws).then(function(assignments) {
                    console.log('[StationTaskBoard] Assignments loaded:', assignments ? assignments.length : 0);
                    if (assignments && assignments.length > 0) {
                        var dateCounts = {};
                        assignments.forEach(function(a) { dateCounts[a.target_date] = (dateCounts[a.target_date] || 0) + 1; });
                        console.log('[StationTaskBoard] Assignments by target_date:', JSON.stringify(dateCounts));
                        console.log('[StationTaskBoard] First 3 assignments:', JSON.stringify(assignments.slice(0,3).map(function(a){ return {serial: a.module_serial, target_date: a.target_date, dept: a.department_id}; })));
                    }
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
                console.warn('[StationTaskBoard] No weekly schedule found for', computedWeekStart);
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
        { id: 'summary', label: 'Summary', visible: true },
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
                        ribbonSettings={ribbonSettings}
                    />
                )}
                {activeTab === 'summary' && (
                    <WeeklySummaryTab
                        weekSchedule={weekSchedule}
                        completions={completions}
                        allTasks={allTasks}
                        lineDepts={lineDepts}
                        modules={allModules}
                        shifts={shifts}
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
                        ribbonSettings={ribbonSettings}
                        onRibbonSettingsChange={setRibbonSettings}
                        onTaskAdded={function(task) { setAllTasks(function(prev) { return prev.concat([task]); }); }}
                        onTaskRemoved={function(taskId) { setAllTasks(function(prev) { return prev.filter(function(t) { return t.id !== taskId; }); }); }}
                        onTasksReordered={function(reorderedTasks, deptId) {
                            setAllTasks(function(prev) {
                                var other = prev.filter(function(t) { return t.department_id !== deptId; });
                                return other.concat(reorderedTasks);
                            });
                        }}
                    />
                )}
            </div>
        </div>
    );
}

// Export
window.StationTaskBoard = StationTaskBoard;
