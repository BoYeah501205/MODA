// ============================================================================
// STATION TASK BOARD v2
// Production board with 4 tabs: Daily Board | Week Setup | Admin | Report
// Report tab is handled by StationBoardReport.jsx (separate component).
//
// Requires: supabase-station-board.js (window.MODA_STATION_BOARD)
// Props: { currentUser, modules, projectId }
// ============================================================================

// ─── Status config ─────────────────────────────────────────────────────────
const STB_STATUSES = {
    not_started: { label: '\u2014',  bg: 'bg-gray-100 dark:bg-gray-800',        text: 'text-gray-400',                                ring: '' },
    wip:         { label: 'WIP',     bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300',          ring: 'ring-1 ring-yellow-400' },
    complete:    { label: 'Done',    bg: 'bg-green-100 dark:bg-green-900/40',   text: 'text-green-700 dark:text-green-300',            ring: 'ring-1 ring-green-500' },
    stopped:     { label: 'Stop',    bg: 'bg-red-100 dark:bg-red-900/40',       text: 'text-red-700 dark:text-red-300',                ring: 'ring-1 ring-red-500' },
};
const STB_CYCLE = ['not_started', 'wip', 'complete', 'stopped'];

// ─── Helpers ───────────────────────────────────────────────────────────────
function stbCycle(s) {
    const i = STB_CYCLE.indexOf(s || 'not_started');
    return STB_CYCLE[(i + 1) % STB_CYCLE.length];
}

function stbWeekDates(ws) {
    if (!ws) return [];
    const [y, m, d] = ws.split('-').map(Number);
    const mon = new Date(y, m - 1, d);
    return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label, i) => {
        const dt = new Date(mon);
        dt.setDate(mon.getDate() + i);
        return {
            date: dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0'),
            label: label,
            dayNum: dt.getDate(),
        };
    });
}

function stbWeekLabel(ws) {
    if (!ws) return '';
    const [y, m, d] = ws.split('-').map(Number);
    const mon = new Date(y, m - 1, d);
    const sun = new Date(y, m - 1, d + 6);
    const f = function(dt) { return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
    return f(mon) + ' \u2013 ' + f(sun) + ', ' + y;
}

function stbShiftWeek(ws, delta) {
    const [y, m, d] = ws.split('-').map(Number);
    const dt = new Date(y, m - 1, d + delta * 7);
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
}

function stbToday() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ─── StatusButton ──────────────────────────────────────────────────────────
const STBStatusButton = ({ status, onClick, disabled }) => {
    const s = STB_STATUSES[status] || STB_STATUSES.not_started;
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={'w-16 h-8 rounded text-xs font-bold transition ' + s.bg + ' ' + s.text + ' ' + s.ring + ' ' + (disabled ? 'opacity-50 cursor-wait' : 'hover:opacity-80 cursor-pointer')}
        >
            {disabled ? '...' : s.label}
        </button>
    );
};

// ─── ModuleTaskRow ─────────────────────────────────────────────────────────
const ModuleTaskRow = ({ moduleId, tasks, completionMap, onStatusChange, saving }) => {
    return (
        <div className="flex flex-wrap gap-2 py-2 px-3 border-t border-gray-100 dark:border-gray-700">
            {tasks.map(function(task) {
                const key = moduleId + '|' + task.id;
                const current = completionMap[key] ? completionMap[key].status : 'not_started';
                return (
                    <div key={task.id} className="flex flex-col items-center gap-1 min-w-[70px]">
                        <span className="text-xs text-gray-500 dark:text-gray-400 text-center leading-tight truncate max-w-[80px]" title={task.task_name}>
                            {task.task_name}
                        </span>
                        <STBStatusButton
                            status={current}
                            onClick={function() { onStatusChange(moduleId, task.id, stbCycle(current)); }}
                            disabled={!!saving[key]}
                        />
                    </div>
                );
            })}
        </div>
    );
};

// ─── DepartmentRow ─────────────────────────────────────────────────────────
const DepartmentRow = ({ dept, modules, deptTasks, completionMap, onStatusChange, saving }) => {
    const { useState } = React;
    const [expanded, setExpanded] = useState(false);
    const [expandedModules, setExpandedModules] = useState({});

    const totalChecks = modules.length * deptTasks.length;
    const completedChecks = modules.reduce(function(sum, mod) {
        return sum + deptTasks.filter(function(t) {
            const key = mod.serialNumber + '|' + t.id;
            return completionMap[key] && completionMap[key].status === 'complete';
        }).length;
    }, 0);
    const pct = totalChecks > 0 ? Math.round((completedChecks / totalChecks) * 100) : 0;

    const toggleModule = function(modId) {
        setExpandedModules(function(prev) {
            var next = {};
            for (var k in prev) next[k] = prev[k];
            next[modId] = !prev[modId];
            return next;
        });
    };

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-2 overflow-hidden">
            <button
                onClick={function() { setExpanded(function(e) { return !e; }); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition"
            >
                <span className="text-gray-400 text-sm w-4">{expanded ? '\u25BC' : '\u25B6'}</span>
                <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: dept.color || '#0d9488' }}
                />
                <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{dept.name}</span>
                <span className="text-xs text-gray-400 ml-1">({modules.length} modules, {deptTasks.length} tasks)</span>
                <div className="flex-1" />
                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                            width: pct + '%',
                            backgroundColor: pct === 100 ? '#16a34a' : pct > 0 ? '#0d9488' : '#d1d5db',
                        }}
                    />
                </div>
                <span className="text-xs font-mono text-gray-500 w-10 text-right">{pct}%</span>
            </button>

            {expanded && (
                <div className="bg-gray-50 dark:bg-gray-850">
                    {modules.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-400 italic">No modules assigned</div>
                    ) : (
                        modules.map(function(mod) {
                            var modKey = mod.serialNumber || mod.id;
                            return (
                                <div key={modKey} className="border-t border-gray-200 dark:border-gray-700">
                                    <button
                                        onClick={function() { toggleModule(modKey); }}
                                        className="w-full flex items-center gap-3 px-6 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                    >
                                        <span className="text-gray-400 text-xs">{expandedModules[modKey] ? '\u25BE' : '\u25B8'}</span>
                                        <span className="font-mono text-sm font-bold text-gray-800 dark:text-gray-200">{mod.serialNumber}</span>
                                        <span className="text-xs text-gray-400">#{mod.buildSequence}</span>
                                        <div className="flex-1" />
                                        <div className="flex gap-1">
                                            {deptTasks.map(function(t) {
                                                var key = modKey + '|' + t.id;
                                                var st = completionMap[key] ? completionMap[key].status : 'not_started';
                                                var dotColor = st === 'complete' ? 'bg-green-500' : st === 'wip' ? 'bg-yellow-400' : st === 'stopped' ? 'bg-red-500' : 'bg-gray-300';
                                                return <span key={t.id} className={'w-2 h-2 rounded-full ' + dotColor} title={t.task_name + ': ' + st} />;
                                            })}
                                        </div>
                                    </button>
                                    {expandedModules[modKey] && (
                                        <ModuleTaskRow
                                            moduleId={modKey}
                                            tasks={deptTasks}
                                            completionMap={completionMap}
                                            onStatusChange={onStatusChange}
                                            saving={saving}
                                        />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

// ─── TAB 1: DailyBoard ────────────────────────────────────────────────────
const STBDailyBoard = ({ weekStart, modules, departments, allTasks, completionMap, onStatusChange, saving }) => {
    const { useState, useMemo } = React;
    const days = useMemo(function() { return stbWeekDates(weekStart); }, [weekStart]);
    const today = stbToday();
    const [selectedDay, setSelectedDay] = useState(today);
    const shiftDays = days.filter(function(_, i) { return i < 5; });

    var tasksByDept = useMemo(function() {
        var map = {};
        departments.forEach(function(d) { map[d.id] = []; });
        allTasks.forEach(function(t) {
            if (map[t.department_id]) map[t.department_id].push(t);
        });
        return map;
    }, [departments, allTasks]);

    return (
        <div className="space-y-3">
            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 pb-1">
                {shiftDays.map(function(day) {
                    return (
                        <button
                            key={day.date}
                            onClick={function() { setSelectedDay(day.date); }}
                            className={'px-4 py-2 text-sm font-medium rounded-t transition ' + (
                                selectedDay === day.date
                                    ? 'bg-teal-600 text-white'
                                    : day.date === today
                                        ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
                                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                            )}
                        >
                            {day.label} {day.dayNum}
                        </button>
                    );
                })}
            </div>

            {departments.map(function(dept) {
                return (
                    <DepartmentRow
                        key={dept.id}
                        dept={dept}
                        modules={modules}
                        deptTasks={tasksByDept[dept.id] || []}
                        completionMap={completionMap}
                        onStatusChange={onStatusChange}
                        saving={saving}
                    />
                );
            })}

            {departments.length === 0 && (
                <div className="text-center py-12 text-gray-400">No departments configured. Go to Admin tab to add departments.</div>
            )}
        </div>
    );
};

// ─── TAB 2: WeekSetup ─────────────────────────────────────────────────────
const STBWeekSetup = ({ weekStart, setWeekStart, modules, departments, goals, onReload }) => {
    const { useState, useMemo } = React;
    const [lineBalance, setLineBalance] = useState(5);
    const [startSerial, setStartSerial] = useState('');
    const [generating, setGenerating] = useState(false);
    const [editingTargets, setEditingTargets] = useState({});
    const sb = function() { return window.MODA_STATION_BOARD; };

    var goalsMap = useMemo(function() {
        var m = {};
        (goals || []).forEach(function(g) { m[g.department_id] = g.target_modules; });
        return m;
    }, [goals]);

    var handleTargetChange = async function(deptId, value) {
        try {
            await sb().upsertWeeklyGoal({
                departmentId: deptId,
                weekStartDate: weekStart,
                targetModules: parseInt(value) || 0,
            });
            onReload();
        } catch (e) {
            console.error('[WeekSetup] Target save error:', e);
            alert('Failed to save target: ' + e.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">Week Schedule</h3>
                <div className="flex items-center gap-3 mb-4">
                    <button onClick={function() { setWeekStart(stbShiftWeek(weekStart, -1)); }} className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">{'\u25C0'}</button>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 min-w-[200px] text-center">{stbWeekLabel(weekStart)}</span>
                    <button onClick={function() { setWeekStart(stbShiftWeek(weekStart, 1)); }} className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">{'\u25B6'}</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Starting Module Serial</label>
                        <input
                            type="text"
                            value={startSerial}
                            onChange={function(e) { setStartSerial(e.target.value); }}
                            placeholder="e.g. 22-0295"
                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Line Balance (modules/day)</label>
                        <input
                            type="number"
                            value={lineBalance}
                            onChange={function(e) { setLineBalance(parseInt(e.target.value) || 5); }}
                            min={1}
                            max={20}
                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button
                            disabled={generating}
                            onClick={async function() {
                                setGenerating(true);
                                try {
                                    alert('Week generation requires day-assignment support in the data layer. Coming soon.');
                                } catch (e) {
                                    alert('Error: ' + e.message);
                                } finally {
                                    setGenerating(false);
                                }
                            }}
                            className="px-4 py-2 text-sm font-medium rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                        >
                            {generating ? 'Generating...' : 'Generate Week'}
                        </button>
                    </div>
                </div>
                <div className="text-xs text-gray-400">
                    {modules.length} modules loaded from project. Line balance: {lineBalance} modules/dept/day.
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">Weekly Department Targets</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">Department</th>
                                <th className="text-center py-2 px-3 text-gray-600 dark:text-gray-400 font-medium">Weekly Target</th>
                            </tr>
                        </thead>
                        <tbody>
                            {departments.map(function(dept) {
                                return (
                                    <tr key={dept.id} className="border-b border-gray-100 dark:border-gray-700">
                                        <td className="py-2 px-3">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dept.color || '#0d9488' }} />
                                                <span className="text-gray-800 dark:text-gray-200">{dept.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                            <input
                                                type="number"
                                                value={editingTargets[dept.id] !== undefined ? editingTargets[dept.id] : (goalsMap[dept.id] || '')}
                                                onChange={function(e) { setEditingTargets(function(prev) { var n = {}; for (var k in prev) n[k] = prev[k]; n[dept.id] = e.target.value; return n; }); }}
                                                onBlur={function(e) {
                                                    handleTargetChange(dept.id, e.target.value);
                                                    setEditingTargets(function(prev) { var n = {}; for (var k in prev) { if (k !== dept.id) n[k] = prev[k]; } return n; });
                                                }}
                                                min={0}
                                                className="w-20 px-2 py-1 text-sm text-center rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ─── TAB 3: AdminTab ───────────────────────────────────────────────────────
const STBAdminTab = ({ departments, allTasks, onReload }) => {
    const { useState } = React;
    const sb = function() { return window.MODA_STATION_BOARD; };

    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptColor, setNewDeptColor] = useState('#0d9488');
    const [savingDept, setSavingDept] = useState(false);
    const [selectedDeptId, setSelectedDeptId] = useState(departments[0] ? departments[0].id : '');
    const [newTaskName, setNewTaskName] = useState('');
    const [savingTask, setSavingTask] = useState(false);

    var selectedDeptTasks = allTasks
        .filter(function(t) { return t.department_id === selectedDeptId; })
        .sort(function(a, b) { return a.display_order - b.display_order; });

    var addDepartment = async function() {
        if (!newDeptName.trim()) return;
        setSavingDept(true);
        try {
            await sb().upsertDepartment({
                name: newDeptName.trim(),
                displayOrder: departments.length,
                color: newDeptColor,
            });
            setNewDeptName('');
            onReload();
        } catch (e) {
            alert('Error adding department: ' + e.message);
        } finally {
            setSavingDept(false);
        }
    };

    var moveDept = async function(dept, direction) {
        var idx = departments.findIndex(function(d) { return d.id === dept.id; });
        var swapIdx = idx + direction;
        if (swapIdx < 0 || swapIdx >= departments.length) return;
        var other = departments[swapIdx];
        try {
            await Promise.all([
                sb().upsertDepartment({ id: dept.id, name: dept.name, displayOrder: swapIdx, color: dept.color }),
                sb().upsertDepartment({ id: other.id, name: other.name, displayOrder: idx, color: other.color }),
            ]);
            onReload();
        } catch (e) {
            alert('Error reordering: ' + e.message);
        }
    };

    var addTask = async function() {
        if (!newTaskName.trim() || !selectedDeptId) return;
        setSavingTask(true);
        try {
            await sb().upsertTask({
                departmentId: selectedDeptId,
                taskName: newTaskName.trim(),
                displayOrder: selectedDeptTasks.length,
            });
            setNewTaskName('');
            onReload();
        } catch (e) {
            alert('Error adding task: ' + e.message);
        } finally {
            setSavingTask(false);
        }
    };

    var removeTask = async function(taskId) {
        if (!confirm('Remove this task? (Soft-delete, can be restored)')) return;
        try {
            await sb().deleteTask(taskId);
            onReload();
        } catch (e) {
            alert('Error removing task: ' + e.message);
        }
    };

    var moveTask = async function(task, direction) {
        var idx = selectedDeptTasks.findIndex(function(t) { return t.id === task.id; });
        var swapIdx = idx + direction;
        if (swapIdx < 0 || swapIdx >= selectedDeptTasks.length) return;
        var other = selectedDeptTasks[swapIdx];
        try {
            await Promise.all([
                sb().upsertTask({ id: task.id, departmentId: task.department_id, taskName: task.task_name, displayOrder: swapIdx }),
                sb().upsertTask({ id: other.id, departmentId: other.department_id, taskName: other.task_name, displayOrder: idx }),
            ]);
            onReload();
        } catch (e) {
            alert('Error reordering task: ' + e.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">Departments &amp; Order</h3>
                <div className="space-y-2 mb-4">
                    {departments.map(function(dept, idx) {
                        return (
                            <div key={dept.id} className="flex items-center gap-3 py-2 px-3 rounded border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-850">
                                <span className="text-xs text-gray-400 w-6 text-center">{idx + 1}</span>
                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color || '#0d9488' }} />
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">{dept.name}</span>
                                <div className="flex gap-1">
                                    <button onClick={function() { moveDept(dept, -1); }} disabled={idx === 0} className="px-1.5 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-200 disabled:opacity-30">{'\u25B2'}</button>
                                    <button onClick={function() { moveDept(dept, 1); }} disabled={idx === departments.length - 1} className="px-1.5 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-200 disabled:opacity-30">{'\u25BC'}</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">New Department</label>
                        <input
                            type="text"
                            value={newDeptName}
                            onChange={function(e) { setNewDeptName(e.target.value); }}
                            placeholder="Department name"
                            className="w-full px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                            onKeyDown={function(e) { if (e.key === 'Enter') addDepartment(); }}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Color</label>
                        <input
                            type="color"
                            value={newDeptColor}
                            onChange={function(e) { setNewDeptColor(e.target.value); }}
                            className="w-10 h-9 rounded border border-gray-300 cursor-pointer"
                        />
                    </div>
                    <button
                        onClick={addDepartment}
                        disabled={savingDept || !newDeptName.trim()}
                        className="px-4 py-2 text-sm font-medium rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                        Add
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">Task Lists</h3>
                <select
                    value={selectedDeptId}
                    onChange={function(e) { setSelectedDeptId(e.target.value); }}
                    className="w-full max-w-xs px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 mb-4"
                >
                    <option value="">Select department...</option>
                    {departments.map(function(d) { return <option key={d.id} value={d.id}>{d.name}</option>; })}
                </select>

                {selectedDeptId && (
                    <div>
                        <div className="space-y-1 mb-4">
                            {selectedDeptTasks.map(function(task, idx) {
                                return (
                                    <div key={task.id} className="flex items-center gap-2 py-1.5 px-3 rounded border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-850">
                                        <span className="text-xs text-gray-400 w-6 text-center">{idx + 1}</span>
                                        <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{task.task_name}</span>
                                        <div className="flex gap-1">
                                            <button onClick={function() { moveTask(task, -1); }} disabled={idx === 0} className="px-1.5 py-0.5 text-xs rounded border border-gray-300 hover:bg-gray-200 disabled:opacity-30">{'\u25B2'}</button>
                                            <button onClick={function() { moveTask(task, 1); }} disabled={idx === selectedDeptTasks.length - 1} className="px-1.5 py-0.5 text-xs rounded border border-gray-300 hover:bg-gray-200 disabled:opacity-30">{'\u25BC'}</button>
                                            <button onClick={function() { removeTask(task.id); }} className="px-1.5 py-0.5 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50">X</button>
                                        </div>
                                    </div>
                                );
                            })}
                            {selectedDeptTasks.length === 0 && (
                                <div className="text-sm text-gray-400 italic py-2">No tasks for this department.</div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newTaskName}
                                onChange={function(e) { setNewTaskName(e.target.value); }}
                                placeholder="New task name"
                                className="flex-1 px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                                onKeyDown={function(e) { if (e.key === 'Enter') addTask(); }}
                            />
                            <button
                                onClick={addTask}
                                disabled={savingTask || !newTaskName.trim()}
                                className="px-4 py-2 text-sm font-medium rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                            >
                                Add Task
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4">Shift Configuration</h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 py-2 px-3 rounded border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-850">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 w-24">Shift 1</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Mon &ndash; Thu</span>
                    </div>
                    <div className="flex items-center gap-3 py-2 px-3 rounded border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-850">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 w-24">Shift 2</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Fri &ndash; Sun</span>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">Shift editing requires the station_shifts table. Coming soon.</p>
            </div>
        </div>
    );
};

// ─── Main Component ────────────────────────────────────────────────────────
const StationTaskBoard = ({ currentUser, modules: rawModules, projectId }) => {
    const { useState, useEffect, useCallback, useMemo, useRef } = React;
    const sb = function() { return window.MODA_STATION_BOARD; };
    const initialWeek = sb() ? sb().weekStart() : '';

    const [activeTab, setActiveTab] = useState('daily');
    const [weekStart, setWeekStart] = useState(initialWeek);
    const [departments, setDepartments] = useState([]);
    const [allTasks, setAllTasks] = useState([]);
    const [completions, setCompletions] = useState([]);
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState({});
    const unsubRef = useRef(null);

    // Normalize modules from JSONB to consistent shape
    const modules = useMemo(function() {
        return (rawModules || []).map(function(m) {
            return {
                id: m.id,
                serialNumber: m.serialNumber || m.id,
                buildSequence: m.buildSequence,
                status: m.status,
                projectName: m.projectName || '',
            };
        });
    }, [rawModules]);

    const isAdmin = currentUser && (
        currentUser.dashboard_role === 'admin' ||
        currentUser.email === 'trevor@autovol.com' ||
        currentUser.email === 'stephanie@autovol.com'
    );

    // Build completion map: { 'moduleSerialNumber|taskId': { status, ... } }
    const completionMap = useMemo(function() {
        var map = {};
        completions.forEach(function(c) {
            map[c.module_id + '|' + c.task_id] = c;
        });
        return map;
    }, [completions]);

    // Load all data
    var loadData = useCallback(async function() {
        if (!sb()) return;
        setLoading(true);
        setError(null);
        try {
            var results = await Promise.all([
                sb().getDepartments(),
                sb().getAllTasks(),
                sb().getCompletions(weekStart),
                sb().getWeeklyGoals(weekStart),
            ]);
            setDepartments(results[0] || []);
            setAllTasks(results[1] || []);
            setCompletions(results[2] || []);
            setGoals(results[3] || []);
        } catch (e) {
            console.error('[StationTaskBoard] Load error:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [weekStart]);

    useEffect(function() { loadData(); }, [loadData]);

    // Real-time subscription
    useEffect(function() {
        if (!sb()) return;
        if (unsubRef.current) unsubRef.current();
        unsubRef.current = sb().subscribeToCompletions(weekStart, function() {
            sb().getCompletions(weekStart).then(function(c) { setCompletions(c || []); }).catch(function() {});
        });
        return function() { if (unsubRef.current) unsubRef.current(); };
    }, [weekStart]);

    // Status change handler
    var handleStatusChange = useCallback(async function(moduleId, taskId, newStatus) {
        var key = moduleId + '|' + taskId;
        setSaving(function(s) { var n = {}; for (var k in s) n[k] = s[k]; n[key] = true; return n; });
        try {
            await sb().upsertCompletion({
                moduleId: moduleId,
                taskId: taskId,
                weekStartDate: weekStart,
                status: newStatus,
            });
            // Optimistic update
            setCompletions(function(prev) {
                var idx = prev.findIndex(function(c) { return c.module_id === moduleId && c.task_id === taskId; });
                if (idx >= 0) {
                    var updated = prev.slice();
                    updated[idx] = Object.assign({}, updated[idx], { status: newStatus });
                    return updated;
                }
                return prev.concat([{ module_id: moduleId, task_id: taskId, status: newStatus }]);
            });
        } catch (e) {
            console.error('[StationTaskBoard] Save error:', e);
            alert('Save failed: ' + e.message);
        } finally {
            setSaving(function(s) { var n = {}; for (var k in s) { if (k !== key) n[k] = s[k]; } return n; });
        }
    }, [weekStart]);

    var tabs = [
        { id: 'daily', label: 'Daily Board' },
        { id: 'setup', label: 'Week Setup' },
    ];
    if (isAdmin) tabs.push({ id: 'admin', label: 'Admin' });

    if (!sb()) {
        return (
            <div className="p-6 text-center text-red-500">
                Station board data layer not loaded. Add supabase-station-board.js to index.html.
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="flex flex-wrap items-center gap-4 mb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Station Task Board</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{stbWeekLabel(weekStart)} &mdash; {modules.length} modules</p>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                    <button onClick={function() { setWeekStart(stbShiftWeek(weekStart, -1)); }} className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">{'\u25C0'}</button>
                    {weekStart !== initialWeek && (
                        <button onClick={function() { setWeekStart(initialWeek); }} className="px-2 py-1 text-xs rounded bg-teal-600 text-white hover:bg-teal-700">Today</button>
                    )}
                    <button onClick={function() { setWeekStart(stbShiftWeek(weekStart, 1)); }} className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">{'\u25B6'}</button>
                </div>
            </div>

            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-4">
                {tabs.map(function(t) {
                    return (
                        <button
                            key={t.id}
                            onClick={function() { setActiveTab(t.id); }}
                            className={'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ' + (
                                activeTab === t.id
                                    ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            )}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full" />
                    <span className="ml-3 text-gray-500">Loading...</span>
                </div>
            ) : error ? (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                    Error: {error}
                    <button onClick={loadData} className="ml-3 underline">Retry</button>
                </div>
            ) : (
                <div>
                    {activeTab === 'daily' && (
                        <STBDailyBoard
                            weekStart={weekStart}
                            modules={modules}
                            departments={departments}
                            allTasks={allTasks}
                            completionMap={completionMap}
                            onStatusChange={handleStatusChange}
                            saving={saving}
                        />
                    )}
                    {activeTab === 'setup' && (
                        <STBWeekSetup
                            weekStart={weekStart}
                            setWeekStart={setWeekStart}
                            modules={modules}
                            departments={departments}
                            goals={goals}
                            onReload={loadData}
                        />
                    )}
                    {activeTab === 'admin' && isAdmin && (
                        <STBAdminTab
                            departments={departments}
                            allTasks={allTasks}
                            onReload={loadData}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

// Export for MODA App.jsx
window.StationTaskBoard = StationTaskBoard;
