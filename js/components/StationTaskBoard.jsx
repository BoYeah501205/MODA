// ============================================================================
// STATION TASK BOARD
// Weekly production board tracking module completion per department task.
// Replaces the weekly station board with per-module, per-task check-off.
//
// Sub-tabs:
//   • Board       — check off tasks per module per department
//   • Goals       — set weekly module completion targets per department
//   • Task Editor — admin: add/edit/remove departments and tasks
// ============================================================================

// ─── Status config ──────────────────────────────────────────────────────────
const TASK_STATUSES = {
    not_started: { label: '—',        bg: 'bg-gray-100 dark:bg-gray-800',  text: 'text-gray-400',                ring: '' },
    wip:         { label: 'WIP',      bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', ring: 'ring-1 ring-yellow-400' },
    complete:    { label: 'Complete', bg: 'bg-green-100 dark:bg-green-900/40',   text: 'text-green-700 dark:text-green-300',   ring: 'ring-1 ring-green-500' },
    stopped:     { label: 'Stopped',  bg: 'bg-red-100 dark:bg-red-900/40',       text: 'text-red-700 dark:text-red-300',       ring: 'ring-1 ring-red-500' },
};

const STATUS_CYCLE = ['not_started', 'wip', 'complete', 'stopped'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getWeekLabel(weekStart) {
    if (!weekStart) return '';
    const [y, m, d] = weekStart.split('-').map(Number);
    const mon = new Date(y, m - 1, d);
    const sun = new Date(y, m - 1, d + 6);
    const fmt = dt => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(mon)} – ${fmt(sun)}, ${y}`;
}

function cycleStatus(current) {
    const idx = STATUS_CYCLE.indexOf(current || 'not_started');
    return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

// ─── Hook: all board data for a given week ────────────────────────────────────
const useStationBoardData = (weekStart) => {
    const { useState, useEffect, useCallback, useRef } = React;
    const [departments, setDepartments] = useState([]);
    const [tasks, setTasks]             = useState([]);
    const [goals, setGoals]             = useState([]);
    const [completions, setCompletions] = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState(null);
    const unsubRef = useRef(null);

    const sb = () => window.MODA_STATION_BOARD;

    const load = useCallback(async () => {
        if (!sb()) return;
        setLoading(true);
        setError(null);
        try {
            const [depts, allTasks, wGoals, comps] = await Promise.all([
                sb().getDepartments(),
                sb().getAllTasks(),
                sb().getWeeklyGoals(weekStart),
                sb().getCompletions(weekStart),
            ]);
            setDepartments(depts);
            setTasks(allTasks);
            setGoals(wGoals);
            setCompletions(comps);
        } catch (e) {
            console.error('[StationBoard] Load error', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [weekStart]);

    useEffect(() => {
        load();
        // Real-time updates
        if (sb()) {
            unsubRef.current = sb().subscribeToCompletions(weekStart, () => load());
        }
        return () => { if (unsubRef.current) unsubRef.current(); };
    }, [load]);

    // Derived: completions indexed by "moduleId|taskId"
    const completionMap = {};
    completions.forEach(c => {
        completionMap[`${c.module_id}|${c.task_id}`] = c;
    });

    // Goals indexed by dept id
    const goalsMap = {};
    goals.forEach(g => { goalsMap[g.department_id] = g.target_modules; });

    return { departments, tasks, goals, goalsMap, completions, completionMap, loading, error, reload: load };
};

// ─── StatusButton ─────────────────────────────────────────────────────────────
const StatusButton = ({ status, onClick, disabled }) => {
    const cfg = TASK_STATUSES[status || 'not_started'];
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`px-2 py-1 rounded text-xs font-medium transition-all min-w-[72px] ${cfg.bg} ${cfg.text} ${cfg.ring} ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}`}
        >
            {cfg.label}
        </button>
    );
};

// ─── DeptBadge ────────────────────────────────────────────────────────────────
const DeptBadge = ({ name, color }) => (
    <span
        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
        style={{ backgroundColor: color + '22', color, border: `1px solid ${color}55` }}
    >
        {name}
    </span>
);

// ─── ModuleRow ────────────────────────────────────────────────────────────────
const ModuleRow = ({ module, departments, tasks, completionMap, weekStart, onStatusChange, saving }) => {
    const { useState } = React;
    const [expanded, setExpanded] = useState(false);

    // Count completed tasks for this module
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => completionMap[`${module.id}|${t.id}`]?.status === 'complete').length;
    const wipTasks       = tasks.filter(t => completionMap[`${module.id}|${t.id}`]?.status === 'wip').length;
    const stoppedTasks   = tasks.filter(t => completionMap[`${module.id}|${t.id}`]?.status === 'stopped').length;
    const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-2 overflow-hidden">
            {/* Header row */}
            <button
                className="w-full flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-left transition-colors"
                onClick={() => setExpanded(e => !e)}
            >
                <span className="text-gray-400 text-sm w-4">{expanded ? '▼' : '▶'}</span>
                <span className="font-mono font-semibold text-sm text-gray-900 dark:text-gray-100 min-w-[90px]">{module.id}</span>
                {module.project_name && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[160px]">{module.project_name}</span>
                )}
                <div className="flex-1" />
                {/* Mini status bar */}
                <div className="flex items-center gap-2 text-xs">
                    {stoppedTasks > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                            {stoppedTasks} stopped
                        </span>
                    )}
                    {wipTasks > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                            {wipTasks} WIP
                        </span>
                    )}
                    <span className="text-gray-500 dark:text-gray-400">{completedTasks}/{totalTasks}</span>
                    {/* Progress bar */}
                    <div className="w-20 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#16a34a' : pct > 0 ? '#0d9488' : '#d1d5db' }}
                        />
                    </div>
                    <span className="w-8 text-right text-gray-500">{pct}%</span>
                </div>
            </button>

            {/* Expanded tasks grouped by department */}
            {expanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    {departments.map(dept => {
                        const deptTasks = tasks.filter(t => t.department_id === dept.id);
                        if (deptTasks.length === 0) return null;
                        return (
                            <div key={dept.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                                <div className="px-4 py-2 flex items-center gap-2">
                                    <DeptBadge name={dept.name} color={dept.color} />
                                </div>
                                <div className="px-4 pb-3 flex flex-wrap gap-2">
                                    {deptTasks.map(task => {
                                        const key = `${module.id}|${task.id}`;
                                        const currentStatus = completionMap[key]?.status || 'not_started';
                                        const isSaving = saving[key];
                                        return (
                                            <div key={task.id} className="flex flex-col items-center gap-1 min-w-[80px]">
                                                <span className="text-xs text-gray-600 dark:text-gray-400 text-center leading-tight">{task.task_name}</span>
                                                <StatusButton
                                                    status={currentStatus}
                                                    onClick={() => onStatusChange(module.id, task.id, cycleStatus(currentStatus))}
                                                    disabled={!!isSaving}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ─── BoardTab ─────────────────────────────────────────────────────────────────
const BoardTab = ({ weekStart, departments, tasks, completionMap, reload }) => {
    const { useState, useEffect, useCallback } = React;
    const [modules, setModules]   = useState([]);
    const [modLoading, setModLoading] = useState(true);
    const [saving, setSaving]     = useState({});
    const [search, setSearch]     = useState('');
    const [deptFilter, setDeptFilter] = useState('all');

    // Load active modules from existing MODA data layer
    useEffect(() => {
        const loadModules = async () => {
            setModLoading(true);
            try {
                // Use existing MODA_SUPABASE_DATA pattern if available
                if (window.MODA_SUPABASE_DATA?.modules?.getAll) {
                    const mods = await window.MODA_SUPABASE_DATA.modules.getAll();
                    setModules(mods.filter(m => m.status !== 'complete' && m.status !== 'shipped'));
                } else {
                    // Fallback: query directly
                    const sb = window.MODA_SUPABASE?.client;
                    if (sb) {
                        const { data } = await sb
                            .from('modules')
                            .select('id, build_sequence, status, project_id, projects(name)')
                            .not('status', 'in', '("complete","shipped")')
                            .order('build_sequence');
                        setModules((data || []).map(m => ({
                            ...m,
                            project_name: m.projects?.name,
                        })));
                    }
                }
            } catch (e) {
                console.error('[StationBoard] Module load error', e);
            } finally {
                setModLoading(false);
            }
        };
        loadModules();
    }, []);

    const handleStatusChange = useCallback(async (moduleId, taskId, newStatus) => {
        const key = `${moduleId}|${taskId}`;
        setSaving(s => ({ ...s, [key]: true }));
        try {
            await window.MODA_STATION_BOARD.upsertCompletion({
                moduleId,
                taskId,
                weekStartDate: weekStart,
                status: newStatus,
            });
            reload();
        } catch (e) {
            console.error('[StationBoard] Save error', e);
            alert('Save failed: ' + e.message);
        } finally {
            setSaving(s => { const n = { ...s }; delete n[key]; return n; });
        }
    }, [weekStart, reload]);

    // Filter tasks by dept
    const visibleTasks = deptFilter === 'all'
        ? tasks
        : tasks.filter(t => t.department_id === deptFilter);

    const visibleDepts = deptFilter === 'all'
        ? departments
        : departments.filter(d => d.id === deptFilter);

    // Filter modules by search
    const filteredModules = modules.filter(m =>
        !search || m.id.toLowerCase().includes(search.toLowerCase()) ||
        (m.project_name || '').toLowerCase().includes(search.toLowerCase())
    );

    if (modLoading) {
        return <div className="flex items-center justify-center py-16 text-gray-400">Loading modules…</div>;
    }

    return (
        <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
                <input
                    type="text"
                    placeholder="Search module ID or project…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-56"
                />
                <select
                    value={deptFilter}
                    onChange={e => setDeptFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                    <option value="all">All departments</option>
                    {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
                <span className="ml-auto text-sm text-gray-500 self-center">{filteredModules.length} modules</span>
            </div>

            {filteredModules.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No active modules found.</div>
            ) : (
                filteredModules.map(mod => (
                    <ModuleRow
                        key={mod.id}
                        module={mod}
                        departments={visibleDepts}
                        tasks={visibleTasks}
                        completionMap={completionMap}
                        weekStart={weekStart}
                        onStatusChange={handleStatusChange}
                        saving={saving}
                    />
                ))
            )}
        </div>
    );
};

// ─── GoalsTab ─────────────────────────────────────────────────────────────────
const GoalsTab = ({ weekStart, departments, goalsMap, reload }) => {
    const { useState } = React;
    const [editing, setEditing] = useState({});
    const [saving, setSaving]   = useState({});

    const handleSave = async (deptId, value) => {
        setSaving(s => ({ ...s, [deptId]: true }));
        try {
            await window.MODA_STATION_BOARD.upsertWeeklyGoal({
                departmentId: deptId,
                weekStartDate: weekStart,
                targetModules: parseInt(value) || 0,
            });
            setEditing(e => { const n = { ...e }; delete n[deptId]; return n; });
            reload();
        } catch (e) {
            alert('Save failed: ' + e.message);
        } finally {
            setSaving(s => { const n = { ...s }; delete n[deptId]; return n; });
        }
    };

    return (
        <div className="max-w-xl">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Set the target number of modules each department should complete this week.
            </p>
            <div className="space-y-2">
                {departments.map(dept => {
                    const current = goalsMap[dept.id] ?? '';
                    const editVal = editing[dept.id];
                    const isEditing = editVal !== undefined;
                    return (
                        <div key={dept.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <DeptBadge name={dept.name} color={dept.color} />
                            <div className="flex-1" />
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        value={editVal}
                                        onChange={e => setEditing(ed => ({ ...ed, [dept.id]: e.target.value }))}
                                        className="w-20 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => handleSave(dept.id, editVal)}
                                        disabled={saving[dept.id]}
                                        className="px-3 py-1 text-xs rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                                    >
                                        {saving[dept.id] ? 'Saving…' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => setEditing(e => { const n = { ...e }; delete n[dept.id]; return n; })}
                                        className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 w-12 text-right">
                                        {current !== '' ? current : <span className="text-gray-400 font-normal">—</span>}
                                    </span>
                                    <span className="text-xs text-gray-400">modules / week</span>
                                    <button
                                        onClick={() => setEditing(e => ({ ...e, [dept.id]: current === '' ? '' : String(current) }))}
                                        className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        Edit
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─── TaskEditorTab ────────────────────────────────────────────────────────────
const TaskEditorTab = ({ departments, tasks, reload }) => {
    const { useState } = React;
    const [selectedDept, setSelectedDept] = useState(departments[0]?.id || '');
    const [newTaskName, setNewTaskName]    = useState('');
    const [newDeptName, setNewDeptName]    = useState('');
    const [newDeptColor, setNewDeptColor]  = useState('#0d9488');
    const [saving, setSaving]              = useState(false);

    const sb = () => window.MODA_STATION_BOARD;

    const deptTasks = tasks.filter(t => t.department_id === selectedDept);

    const addTask = async () => {
        if (!newTaskName.trim() || !selectedDept) return;
        setSaving(true);
        try {
            await sb().upsertTask({
                departmentId: selectedDept,
                taskName: newTaskName.trim(),
                displayOrder: deptTasks.length + 1,
            });
            setNewTaskName('');
            reload();
        } catch (e) { alert('Error: ' + e.message); }
        finally { setSaving(false); }
    };

    const removeTask = async (taskId) => {
        if (!confirm('Remove this task? Existing completion records will be retained.')) return;
        try {
            await sb().deleteTask(taskId);
            reload();
        } catch (e) { alert('Error: ' + e.message); }
    };

    const addDept = async () => {
        if (!newDeptName.trim()) return;
        setSaving(true);
        try {
            const d = await sb().upsertDepartment({
                name: newDeptName.trim(),
                displayOrder: departments.length + 1,
                color: newDeptColor,
            });
            setNewDeptName('');
            setSelectedDept(d.id);
            reload();
        } catch (e) { alert('Error: ' + e.message); }
        finally { setSaving(false); }
    };

    const removeDept = async (deptId) => {
        if (!confirm('Remove this department and all its tasks? Completion records will be retained.')) return;
        try {
            await sb().deleteDepartment(deptId);
            reload();
        } catch (e) { alert('Error: ' + e.message); }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Dept list */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Departments</h3>
                <div className="space-y-1 mb-4">
                    {departments.map(d => (
                        <div
                            key={d.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors ${selectedDept === d.id ? 'bg-teal-50 dark:bg-teal-900/30 ring-1 ring-teal-400' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            onClick={() => setSelectedDept(d.id)}
                        >
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{d.name}</span>
                            <button
                                onClick={e => { e.stopPropagation(); removeDept(d.id); }}
                                className="text-gray-300 hover:text-red-500 text-xs px-1"
                                title="Remove department"
                            >✕</button>
                        </div>
                    ))}
                </div>
                {/* Add dept */}
                <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                    <input
                        type="text"
                        placeholder="New department name"
                        value={newDeptName}
                        onChange={e => setNewDeptName(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        onKeyDown={e => e.key === 'Enter' && addDept()}
                    />
                    <div className="flex items-center gap-2">
                        <input type="color" value={newDeptColor} onChange={e => setNewDeptColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
                        <button
                            onClick={addDept}
                            disabled={saving || !newDeptName.trim()}
                            className="flex-1 px-2 py-1.5 text-xs rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                        >
                            + Add Department
                        </button>
                    </div>
                </div>
            </div>

            {/* Tasks for selected dept */}
            <div className="md:col-span-2">
                {selectedDept ? (
                    <>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Tasks — {departments.find(d => d.id === selectedDept)?.name}
                        </h3>
                        <div className="space-y-1 mb-4">
                            {deptTasks.length === 0 && (
                                <p className="text-sm text-gray-400 italic">No tasks yet.</p>
                            )}
                            {deptTasks.map((t, i) => (
                                <div key={t.id} className="flex items-center gap-2 px-3 py-2 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                                    <span className="text-sm text-gray-800 dark:text-gray-200 flex-1">{t.task_name}</span>
                                    <button
                                        onClick={() => removeTask(t.id)}
                                        className="text-gray-300 hover:text-red-500 text-xs px-1"
                                        title="Remove task"
                                    >✕</button>
                                </div>
                            ))}
                        </div>
                        {/* Add task */}
                        <div className="flex gap-2 border-t border-gray-200 dark:border-gray-700 pt-3">
                            <input
                                type="text"
                                placeholder="New task name"
                                value={newTaskName}
                                onChange={e => setNewTaskName(e.target.value)}
                                className="flex-1 px-3 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                onKeyDown={e => e.key === 'Enter' && addTask()}
                            />
                            <button
                                onClick={addTask}
                                disabled={saving || !newTaskName.trim()}
                                className="px-4 py-1.5 text-sm rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                            >
                                + Add
                            </button>
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-gray-400 italic">Select a department to manage its tasks.</p>
                )}
            </div>
        </div>
    );
};

// ─── Week Picker ──────────────────────────────────────────────────────────────
const WeekPicker = ({ value, onChange }) => {
    const sb = () => window.MODA_STATION_BOARD;
    const curr = sb()?.weekStart() || value;

    const shift = (weeks) => {
        if (!value) return;
        const [y, m, d] = value.split('-').map(Number);
        const dt = new Date(y, m - 1, d + weeks * 7);
        const ny = dt.getFullYear();
        const nm = String(dt.getMonth() + 1).padStart(2, '0');
        const nd = String(dt.getDate()).padStart(2, '0');
        onChange(`${ny}-${nm}-${nd}`);
    };

    return (
        <div className="flex items-center gap-2">
            <button onClick={() => shift(-1)} className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">◀</button>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 min-w-[200px] text-center">{getWeekLabel(value)}</span>
            <button onClick={() => shift(1)} className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">▶</button>
            {value !== curr && (
                <button onClick={() => onChange(curr)} className="px-2 py-1 text-xs rounded bg-teal-600 text-white hover:bg-teal-700">Today</button>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const StationTaskBoard = ({ currentUser }) => {
    const { useState } = React;

    const sb = () => window.MODA_STATION_BOARD;
    const initialWeek = sb()?.weekStart() || '';

    const [activeTab, setActiveTab] = useState('board');
    const [weekStart, setWeekStart] = useState(initialWeek);

    const { departments, tasks, goalsMap, completionMap, loading, error, reload } =
        useStationBoardData(weekStart);

    const isAdmin = currentUser?.dashboard_role === 'admin' ||
                    currentUser?.email === 'trevor@autovol.com' ||
                    currentUser?.email === 'stephanie@autovol.com';

    const tabs = [
        { id: 'board',  label: 'Production Board' },
        { id: 'goals',  label: 'Weekly Goals' },
        ...(isAdmin ? [{ id: 'tasks', label: 'Task Editor' }] : []),
    ];

    if (!sb()) {
        return (
            <div className="p-6 text-center text-red-500">
                Station board data layer not loaded. Add supabase-station-board.js to index.html.
            </div>
        );
    }

    return (
        <div className="p-4 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Station Task Board</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Module completion tracking by department</p>
                </div>
                <div className="flex-1" />
                <WeekPicker value={weekStart} onChange={setWeekStart} />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-5">
                {tabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                            activeTab === t.id
                                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full" />
                    <span className="ml-3 text-gray-500">Loading…</span>
                </div>
            ) : error ? (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                    Error loading data: {error}
                    <button onClick={reload} className="ml-3 underline">Retry</button>
                </div>
            ) : (
                <>
                    {activeTab === 'board' && (
                        <BoardTab
                            weekStart={weekStart}
                            departments={departments}
                            tasks={tasks}
                            completionMap={completionMap}
                            reload={reload}
                        />
                    )}
                    {activeTab === 'goals' && (
                        <GoalsTab
                            weekStart={weekStart}
                            departments={departments}
                            goalsMap={goalsMap}
                            reload={reload}
                        />
                    )}
                    {activeTab === 'tasks' && isAdmin && (
                        <TaskEditorTab
                            departments={departments}
                            tasks={tasks}
                            reload={reload}
                        />
                    )}
                </>
            )}
        </div>
    );
};

// Export for MODA App.jsx
window.StationTaskBoard = StationTaskBoard;
