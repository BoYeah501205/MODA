/**
 * MODA Station Board — Supabase Data Layer
 * Handles all reads/writes for station_departments, station_tasks,
 * station_weekly_goals, and station_task_completions tables.
 *
 * Add to index.html after supabase-client.js:
 *   <script src="./js/supabase-station-board.js"></script>
 *
 * Usage via window.MODA_STATION_BOARD:
 *   const depts  = await MODA_STATION_BOARD.getDepartments();
 *   const tasks  = await MODA_STATION_BOARD.getTasks(deptId);
 *   await MODA_STATION_BOARD.upsertCompletion({ moduleId, taskId, weekStart, status });
 */

(function () {
    'use strict';

    if (window.MODA_STATION_BOARD) {
        console.log('[StationBoard] Already initialized');
        return;
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    function getClient() {
        const client = window.MODA_SUPABASE?.client;
        if (!client) throw new Error('[StationBoard] Supabase client not ready');
        return client;
    }

    function getCurrentUser() {
        return window.MODA_SUPABASE?.currentUser;
    }

    // Returns the Monday of the week containing `date` as YYYY-MM-DD
    function weekStart(date) {
        const d = date ? new Date(date) : new Date();
        const day = d.getDay(); // 0 = Sun
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const mon = new Date(d.setDate(diff));
        const y = mon.getFullYear();
        const m = String(mon.getMonth() + 1).padStart(2, '0');
        const dd = String(mon.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
    }

    // ── Departments ──────────────────────────────────────────────────────────

    async function getDepartments() {
        const sb = getClient();
        const { data, error } = await sb
            .from('station_departments')
            .select('*')
            .order('display_order');
        if (error) throw error;
        return data;
    }

    async function upsertDepartment({ id, name, displayOrder, color }) {
        const sb = getClient();
        const row = {
            name,
            display_order: displayOrder ?? 0,
            color: color ?? '#0d9488',
        };
        if (id) row.id = id;
        const { data, error } = await sb
            .from('station_departments')
            .upsert(row, { onConflict: 'id' })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async function deleteDepartment(id) {
        const sb = getClient();
        const { error } = await sb.from('station_departments').delete().eq('id', id);
        if (error) throw error;
    }

    // ── Tasks ────────────────────────────────────────────────────────────────

    async function getTasks(departmentId) {
        const sb = getClient();
        const query = sb
            .from('station_tasks')
            .select('*, department:station_departments(name, color)')
            .eq('is_active', true)
            .order('display_order');
        if (departmentId) query.eq('department_id', departmentId);
        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    async function getAllTasks() {
        return getTasks(null);
    }

    async function upsertTask({ id, departmentId, taskName, displayOrder }) {
        const sb = getClient();
        const row = {
            department_id: departmentId,
            task_name: taskName,
            display_order: displayOrder ?? 0,
            is_active: true,
        };
        if (id) row.id = id;
        const { data, error } = await sb
            .from('station_tasks')
            .upsert(row, { onConflict: 'id' })
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async function deleteTask(id) {
        const sb = getClient();
        // Soft-delete
        const { error } = await sb
            .from('station_tasks')
            .update({ is_active: false })
            .eq('id', id);
        if (error) throw error;
    }

    // ── Weekly Goals ─────────────────────────────────────────────────────────

    async function getWeeklyGoals(weekStartDate) {
        const sb = getClient();
        const ws = weekStartDate || weekStart();
        const { data, error } = await sb
            .from('station_weekly_goals')
            .select('*, department:station_departments(name, color, display_order)')
            .eq('week_start', ws)
            .order('department(display_order)');
        if (error) throw error;
        return data;
    }

    async function upsertWeeklyGoal({ departmentId, weekStartDate, targetModules }) {
        const sb = getClient();
        const user = getCurrentUser();
        const ws = weekStartDate || weekStart();
        const { data, error } = await sb
            .from('station_weekly_goals')
            .upsert(
                {
                    department_id: departmentId,
                    week_start: ws,
                    target_modules: targetModules,
                    created_by: user?.email,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'department_id,week_start' }
            )
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ── Task Completions ─────────────────────────────────────────────────────

    /**
     * Get all completions for a given week.
     * Returns array of { id, module_id, task_id, status, week_start, notes, updated_by, updated_at, task: {...} }
     */
    async function getCompletions(weekStartDate) {
        const sb = getClient();
        const ws = weekStartDate || weekStart();
        const { data, error } = await sb
            .from('station_task_completions')
            .select('*, task:station_tasks(task_name, display_order, department_id, department:station_departments(name, color, display_order))')
            .eq('week_start', ws)
            .order('updated_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    /**
     * Get completions for a specific module this week.
     */
    async function getModuleCompletions(moduleId, weekStartDate) {
        const sb = getClient();
        const ws = weekStartDate || weekStart();
        const { data, error } = await sb
            .from('station_task_completions')
            .select('*, task:station_tasks(task_name, display_order, department_id, department:station_departments(name, color, display_order))')
            .eq('module_id', moduleId)
            .eq('week_start', ws);
        if (error) throw error;
        return data;
    }

    /**
     * Upsert a single task completion.
     * status: 'complete' | 'wip' | 'stopped' | 'not_started'
     */
    async function upsertCompletion({ moduleId, taskId, weekStartDate, status, notes }) {
        const sb = getClient();
        const user = getCurrentUser();
        const ws = weekStartDate || weekStart();
        const { data, error } = await sb
            .from('station_task_completions')
            .upsert(
                {
                    module_id: moduleId,
                    task_id: taskId,
                    week_start: ws,
                    status: status || 'not_started',
                    notes: notes || null,
                    updated_by: user?.email,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'module_id,task_id,week_start' }
            )
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    /**
     * Bulk upsert completions (for full module save).
     */
    async function bulkUpsertCompletions(completions) {
        const sb = getClient();
        const user = getCurrentUser();
        const ws = weekStart();
        const rows = completions.map(c => ({
            module_id: c.moduleId,
            task_id: c.taskId,
            week_start: c.weekStart || ws,
            status: c.status || 'not_started',
            notes: c.notes || null,
            updated_by: user?.email,
            updated_at: new Date().toISOString(),
        }));
        const { data, error } = await sb
            .from('station_task_completions')
            .upsert(rows, { onConflict: 'module_id,task_id,week_start' })
            .select();
        if (error) throw error;
        return data;
    }

    // ── Report Aggregations ──────────────────────────────────────────────────

    /**
     * Returns per-department completion stats for a given week.
     * [{
     *   departmentId, departmentName, color,
     *   totalTasks, completedTasks, wipTasks, stoppedTasks,
     *   completionPct, goal
     * }]
     */
    async function getWeeklyReport(weekStartDate) {
        const ws = weekStartDate || weekStart();
        const [depts, allTasks, completions, goals] = await Promise.all([
            getDepartments(),
            getAllTasks(),
            getCompletions(ws),
            getWeeklyGoals(ws),
        ]);

        const goalsMap = {};
        goals.forEach(g => { goalsMap[g.department_id] = g.target_modules; });

        // Build per-dept stats
        return depts.map(dept => {
            const deptTasks = allTasks.filter(t => t.department_id === dept.id);
            const deptCompletions = completions.filter(
                c => c.task?.department_id === dept.id
            );

            // Count unique modules that have any completion for this dept
            const moduleIds = [...new Set(deptCompletions.map(c => c.module_id))];
            const completedModules = new Set();
            const wipModules = new Set();
            const stoppedModules = new Set();

            // A module is "complete" for a dept if ALL active tasks are complete
            moduleIds.forEach(mid => {
                const mComps = deptCompletions.filter(c => c.module_id === mid);
                const compMap = {};
                mComps.forEach(c => { compMap[c.task_id] = c.status; });

                const allComplete = deptTasks.every(
                    t => compMap[t.id] === 'complete'
                );
                const anyStopped = deptTasks.some(
                    t => compMap[t.id] === 'stopped'
                );
                const anyWip = deptTasks.some(
                    t => compMap[t.id] === 'wip'
                );

                if (anyStopped) stoppedModules.add(mid);
                else if (allComplete) completedModules.add(mid);
                else if (anyWip) wipModules.add(mid);
            });

            const goal = goalsMap[dept.id] || 0;
            const completedCount = completedModules.size;

            return {
                departmentId: dept.id,
                departmentName: dept.name,
                color: dept.color,
                displayOrder: dept.display_order,
                totalModules: moduleIds.length,
                completedModules: completedCount,
                wipModules: wipModules.size,
                stoppedModules: stoppedModules.size,
                goalModules: goal,
                completionPct: goal > 0 ? Math.min(100, Math.round((completedCount / goal) * 100)) : null,
                taskCount: deptTasks.length,
            };
        });
    }

    // ── Real-time subscriptions ──────────────────────────────────────────────

    function subscribeToCompletions(weekStartDate, callback) {
        const sb = getClient();
        const ws = weekStartDate || weekStart();
        const channel = sb
            .channel(`station_completions_${ws}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'station_task_completions',
                    filter: `week_start=eq.${ws}`,
                },
                payload => callback(payload)
            )
            .subscribe();
        return () => sb.removeChannel(channel);
    }

    // ── Public API ───────────────────────────────────────────────────────────

    window.MODA_STATION_BOARD = {
        weekStart,
        // Departments
        getDepartments,
        upsertDepartment,
        deleteDepartment,
        // Tasks
        getTasks,
        getAllTasks,
        upsertTask,
        deleteTask,
        // Goals
        getWeeklyGoals,
        upsertWeeklyGoal,
        // Completions
        getCompletions,
        getModuleCompletions,
        upsertCompletion,
        bulkUpsertCompletions,
        // Reports
        getWeeklyReport,
        // Real-time
        subscribeToCompletions,
    };

    console.log('[StationBoard] Data layer ready');
})();
