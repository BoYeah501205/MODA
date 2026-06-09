(function () {
    'use strict';

    if (window.MODA_STATION_BOARD) {
        console.log('[StationBoard] Already initialized');
        return;
    }

    function getClient() {
        const c = window.MODA_SUPABASE?.client;
        if (!c) throw new Error('[StationBoard] Supabase client not ready');
        return c;
    }

    function getUser() {
        return window.MODA_SUPABASE?.currentUser;
    }

    function weekStart(date) {
        const d = date ? parseDate(date.slice(0, 10)) : new Date();
        const day = d.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const mon = new Date(d);
        mon.setDate(d.getDate() + diff);
        return fmtDate(mon);
    }

    function parseDate(str) {
        const [y, m, dd] = str.split('-').map(Number);
        return new Date(y, m - 1, dd);
    }

    function fmtDate(dt) {
        const y = dt.getFullYear();
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function weekDates(ws) {
        const start = parseDate(ws);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return fmtDate(d);
        });
    }

    async function getDepartments() {
        const { data, error } = await getClient()
            .from('station_departments')
            .select('*')
            .eq('is_active', true)
            .order('display_order');
        if (error) throw error;
        return data;
    }

    async function getLineDepartments() {
        const depts = await getDepartments();
        const subDeptParentIds = new Set(depts.filter(d => d.parent_id).map(d => d.parent_id));
        return depts.filter(d => !subDeptParentIds.has(d.id));
    }

    async function upsertDepartment({ id, name, parentId, displayOrder, color, staggerOffset }) {
        const row = {
            name,
            parent_id: parentId || null,
            display_order: displayOrder ?? 0,
            color: color ?? '#0d9488',
            stagger_offset: staggerOffset ?? 0,
            is_active: true,
        };
        if (id) row.id = id;
        const { data, error } = await getClient()
            .from('station_departments')
            .upsert(row, { onConflict: 'id' })
            .select().single();
        if (error) throw error;
        return data;
    }

    async function deleteDepartment(id) {
        const { error } = await getClient()
            .from('station_departments')
            .update({ is_active: false })
            .eq('id', id);
        if (error) throw error;
    }

    async function updateStagger(departmentId, staggerOffset) {
        const { data, error } = await getClient()
            .from('station_departments')
            .update({ stagger_offset: staggerOffset })
            .eq('id', departmentId)
            .select().single();
        if (error) throw error;
        return data;
    }

    async function getTasks(departmentId) {
        const q = getClient()
            .from('station_tasks')
            .select('*, department:station_departments(id, name, color, display_order)')
            .eq('is_active', true)
            .order('display_order');
        if (departmentId) q.eq('department_id', departmentId);
        const { data, error } = await q;
        if (error) throw error;
        return data;
    }

    async function getAllTasks() { return getTasks(null); }

    async function upsertTask({ id, departmentId, taskName, displayOrder }) {
        if (id) {
            const row = { department_id: departmentId, task_name: taskName, display_order: displayOrder ?? 0, is_active: true };
            row.id = id;
            const { data, error } = await getClient()
                .from('station_tasks')
                .upsert(row, { onConflict: 'id' })
                .select().single();
            if (error) throw error;
            return data;
        }
        const row = { department_id: departmentId, task_name: taskName, display_order: displayOrder ?? 0, is_active: true };
        const { data, error } = await getClient()
            .from('station_tasks')
            .insert(row)
            .select().single();
        if (error && error.code === '23505') {
            throw new Error('A task with this name already exists in this department');
        }
        if (error) throw error;
        return data;
    }

    async function deleteTask(id) {
        var { error } = await getClient()
            .from('station_tasks')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }

    async function getShifts() {
        const { data, error } = await getClient()
            .from('station_shifts')
            .select('*')
            .eq('is_active', true)
            .order('display_order');
        if (error) throw error;
        return data;
    }

    async function upsertShift({ id, name, days, displayOrder }) {
        const row = { name, days, display_order: displayOrder ?? 0, is_active: true };
        if (id) row.id = id;
        const { data, error } = await getClient()
            .from('station_shifts')
            .upsert(row, { onConflict: 'id' })
            .select().single();
        if (error) throw error;
        return data;
    }

    async function getWeeklySchedule(ws) {
        const { data, error } = await getClient()
            .from('station_weekly_schedule')
            .select('*')
            .eq('week_start', ws || weekStart())
            .maybeSingle();
        if (error) throw error;
        return data;
    }

    async function getActiveOrCurrentWeekSchedule(fallbackWeekStart) {
        // Try to find the most recently updated week that has assignments
        const { data, error } = await getClient()
            .from('station_weekly_schedule')
            .select('*')
            .order('week_start', { ascending: false })
            .limit(4);

        if (error || !data || data.length === 0) {
            return getWeeklySchedule(fallbackWeekStart);
        }

        // Prefer any week that has assignments, prioritizing most recent
        for (var i = 0; i < data.length; i++) {
            const ws = data[i].week_start;
            const { data: assignments } = await getClient()
                .from('station_day_assignments')
                .select('week_start')
                .eq('week_start', ws)
                .limit(1);
            if (assignments && assignments.length > 0) {
                return data[i];
            }
        }

        // No week with assignments found — fall back
        return getWeeklySchedule(fallbackWeekStart);
    }

    async function upsertWeeklySchedule({ weekStartDate, startingSerial, lineBalance }) {
        const ws = weekStartDate || weekStart();
        const user = getUser();
        const { data, error } = await getClient()
            .from('station_weekly_schedule')
            .upsert({
                week_start: ws,
                starting_serial: startingSerial,
                line_balance: lineBalance || 5,
                created_by: user?.email,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'week_start' })
            .select().single();
        if (error) throw error;
        return data;
    }

    async function completeWeek(ws) {
        const { data, error } = await getClient()
            .from('station_weekly_schedule')
            .update({ status: 'complete', completed_at: new Date().toISOString() })
            .eq('week_start', ws || weekStart())
            .select().single();
        if (error) throw error;
        return data;
    }

    async function getDailyTargets(ws) {
        const { data, error } = await getClient()
            .from('station_daily_targets')
            .select('*, department:station_departments(name, color, display_order)')
            .eq('week_start', ws || weekStart());
        if (error) throw error;
        return data;
    }

    async function upsertDailyTarget({ weekStartDate, departmentId, targetDate, moduleCount }) {
        const ws = weekStartDate || weekStart();
        const { data, error } = await getClient()
            .from('station_daily_targets')
            .upsert({
                week_start: ws,
                department_id: departmentId,
                target_date: targetDate,
                module_count: moduleCount ?? 5,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'week_start,department_id,target_date' })
            .select().single();
        if (error) throw error;
        return data;
    }

    async function getDayAssignments(ws, targetDate) {
        const q = getClient()
            .from('station_day_assignments')
            .select('*, department:station_departments(id, name, color, stagger_offset, display_order)')
            .eq('week_start', ws || weekStart())
            .order('display_order');
        if (targetDate) q.eq('target_date', targetDate);
        const { data, error } = await q;
        if (error) throw error;
        return data;
    }

    async function bulkSetAssignments(assignments) {
        const rows = assignments.map((a, i) => ({
            week_start: a.weekStart,
            department_id: a.departmentId,
            target_date: a.targetDate,
            module_serial: a.moduleSerial,
            build_sequence: a.buildSequence ?? null,
            display_order: a.displayOrder ?? i,
        }));
        const { data, error } = await getClient()
            .from('station_day_assignments')
            .upsert(rows, { onConflict: 'week_start,department_id,target_date,module_serial' })
            .select();
        if (error) throw error;
        return data;
    }

    async function deleteAssignment(id) {
        const { error } = await getClient().from('station_day_assignments').delete().eq('id', id);
        if (error) throw error;
    }

    async function clearDayAssignments(ws, departmentId, targetDate) {
        const q = getClient().from('station_day_assignments').delete().eq('week_start', ws).eq('department_id', departmentId);
        if (targetDate) q.eq('target_date', targetDate);
        const { error } = await q;
        if (error) throw error;
    }

    async function generateWeekAssignments({ weekStartDate, startingSerial, lineBalance, modules, departments, shifts, dailyOverrides = {} }) {
        const ws = weekStartDate || weekStart();
        console.log('[GenerateWeek] Starting with ws:', ws, 'type:', typeof ws);
        console.log('[GenerateWeek] startingSerial:', startingSerial);
        console.log('[GenerateWeek] lineBalance:', lineBalance, 'depts:', departments.length, 'shifts:', shifts.length);
        const dates = weekDates(ws);
        const dayNameMap = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const dateDayMap = {};
        dates.forEach(d => { const dt = parseDate(d); dateDayMap[d] = dayNameMap[dt.getDay()]; });
        let sortedMods = [...modules].sort((a, b) => (a.buildSequence ?? a.build_sequence ?? 0) - (b.buildSequence ?? b.build_sequence ?? 0));
        console.log('[GenerateWeek] modules count:', sortedMods.length);
        let startIdx = sortedMods.findIndex(function(m) {
            var sn = (m.serialNumber || '').toString().trim();
            return sn === startingSerial.trim();
        });
        console.log('[GenerateWeek] startIdx from props:', startIdx);
        // If serial not found in passed modules, try fetching from Supabase directly
        if (startIdx === -1 && window.MODA_SUPABASE_DATA?.projects?.getAll) {
            console.log('[GenerateWeek] Serial not in props, trying Supabase fallback...');
            try {
                const allProjects = await window.MODA_SUPABASE_DATA.projects.getAll();
                const allMods = allProjects.flatMap(function(p) { return p.modules || []; });
                const sortedAll = allMods.sort(function(a, b) { return (a.buildSequence || 0) - (b.buildSequence || 0); });
                const idx = sortedAll.findIndex(function(m) { return (m.serialNumber || '').toString().trim() === startingSerial.trim(); });
                console.log('[GenerateWeek] Supabase fallback: found', allMods.length, 'modules, idx:', idx);
                if (idx !== -1) {
                    sortedMods = sortedAll;
                    startIdx = idx;
                }
            } catch (e) {
                console.error('[GenerateWeek] Supabase fallback error:', e.message);
            }
        }
        if (startIdx === -1) throw new Error(`Starting module ${startingSerial} not found`);
        console.log('[GenerateWeek] Final startIdx:', startIdx);
        const allShiftDays = new Set(shifts.flatMap(s => s.days));
        console.log('[GenerateWeek] allShiftDays:', [...allShiftDays]);
        const activeDates = dates.filter(d => allShiftDays.has(dateDayMap[d]));
        console.log('[GenerateWeek] activeDates:', activeDates);
        const assignments = [];
        departments.forEach(dept => {
            const stagger = dept.stagger_offset ?? 0;
            const deptStartIdx = startIdx + stagger;
            activeDates.forEach(date => {
                const overrideKey = `${dept.id}|${date}`;
                const count = dailyOverrides[overrideKey] ?? lineBalance;
                const dayOffset = activeDates.indexOf(date);
                const dayStartIdx = deptStartIdx + (dayOffset * count);
                for (let i = 0; i < count; i++) {
                    const modIdx = dayStartIdx + i;
                    if (modIdx >= 0 && modIdx < sortedMods.length) {
                        const mod = sortedMods[modIdx];
                        assignments.push({ weekStart: ws, departmentId: dept.id, targetDate: date, moduleSerial: mod.serialNumber || mod.id, buildSequence: mod.buildSequence ?? mod.build_sequence, displayOrder: i });
                    }
                }
            });
        });
        console.log('[GenerateWeek] assignments to insert:', assignments.length);
        if (assignments.length > 0) {
            // Ensure weekly schedule record exists (FK constraint on station_day_assignments)
            var existingSchedule = await getWeeklySchedule(ws);
            console.log('[GenerateWeek] existingSchedule:', existingSchedule ? 'yes' : 'no');
            if (!existingSchedule) {
                await upsertWeeklySchedule({
                    weekStartDate: ws,
                    startingSerial: startingSerial,
                    lineBalance: lineBalance || 5,
                });
                console.log('[GenerateWeek] Created weekly schedule record');
            }
            try {
                await bulkSetAssignments(assignments);
                console.log('[GenerateWeek] Assignments saved successfully:', assignments.length);
            } catch (e) {
                console.error('[GenerateWeek] bulkSetAssignments failed:', e.message, e);
                throw e;
            }
        } else {
            console.warn('[GenerateWeek] No assignments generated — check shifts/departments/dailyOverrides');
        }
        return { totalAssignments: assignments.length, assignments: assignments };
    }

    async function getCompletions(ws, targetDate) {
        const q = getClient()
            .from('station_task_completions')
            .select('*, task:station_tasks(task_name, display_order, department_id)')
            .eq('week_start', ws || weekStart());
        if (targetDate) q.eq('target_date', targetDate);
        const { data, error } = await q;
        if (error) throw error;
        return data;
    }

    async function upsertCompletion({ weekStartDate, targetDate, departmentId, moduleSerial, taskId, status, notes }) {
        const ws = weekStartDate || weekStart();
        const user = getUser();
        const { data, error } = await getClient()
            .from('station_task_completions')
            .upsert({
                week_start: ws,
                target_date: targetDate,
                department_id: departmentId,
                module_serial: moduleSerial,
                task_id: taskId,
                status: status || 'not_started',
                notes: notes || null,
                updated_by: user?.email,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'week_start,target_date,department_id,module_serial,task_id' })
            .select().single();
        if (error) throw error;
        return data;
    }

    async function getWeeklyReport(ws) {
        const weekStr = ws || weekStart();
        const [depts, allTasks, completions, assignments] = await Promise.all([
            getLineDepartments(), getAllTasks(), getCompletions(weekStr), getDayAssignments(weekStr),
        ]);
        return depts.map(dept => {
            const deptTasks = allTasks.filter(t => t.department_id === dept.id);
            const deptAssignments = assignments.filter(a => a.department_id === dept.id);
            const assignedModules = [...new Set(deptAssignments.map(a => a.module_serial))];
            const deptCompletions = completions.filter(c => c.department_id === dept.id);
            const completedModules = new Set();
            const wipModules = new Set();
            const stoppedModules = new Set();
            assignedModules.forEach(serial => {
                const mComps = deptCompletions.filter(c => c.module_serial === serial);
                const compMap = {};
                mComps.forEach(c => { compMap[c.task_id] = c.status; });
                const allComplete = deptTasks.every(t => compMap[t.id] === 'complete');
                const anyStopped = deptTasks.some(t => compMap[t.id] === 'stopped');
                const anyWip = deptTasks.some(t => compMap[t.id] === 'wip');
                if (anyStopped) stoppedModules.add(serial);
                else if (allComplete) completedModules.add(serial);
                else if (anyWip) wipModules.add(serial);
            });
            return {
                departmentId: dept.id, departmentName: dept.name, color: dept.color,
                displayOrder: dept.display_order, totalAssigned: assignedModules.length,
                completedModules: completedModules.size, wipModules: wipModules.size,
                stoppedModules: stoppedModules.size, taskCount: deptTasks.length,
                completionPct: assignedModules.length > 0 ? Math.round((completedModules.size / assignedModules.length) * 100) : null,
            };
        });
    }

    function subscribeToCompletions(ws, callback) {
        var channelName = 'sb_completions_' + ws;
        try {
            var existing = getClient().getChannels().find(function(c) { return c.topic === 'realtime:' + channelName; });
            if (existing) getClient().removeChannel(existing);
        } catch(e) {}
        var channel = getClient()
            .channel(channelName)
            .on('postgres_changes', {
                event: '*', schema: 'public',
                table: 'station_task_completions',
                filter: 'week_start=eq.' + ws,
            }, callback)
            .subscribe();
        return function() { getClient().removeChannel(channel); };
    }

    // Aliases for admin tab compatibility
    async function addDepartment(opts) {
        return upsertDepartment({ name: opts.name, color: opts.color, displayOrder: opts.display_order || 999 });
    }
    async function deactivateDepartment(id) { return deleteDepartment(id); }
    async function reorderDepartments(deptOrders) {
        // deptOrders = [{id, display_order}, ...]
        const client = getClient();
        await Promise.all(deptOrders.map(function(d) {
            return client.from('station_departments').update({ display_order: d.display_order }).eq('id', d.id);
        }));
    }
    async function removeTask(taskId) { return deleteTask(taskId); }
    async function addTask(opts) {
        return upsertTask({
            departmentId: opts.department_id || opts.departmentId,
            taskName: opts.task_name || opts.taskName,
            displayOrder: opts.display_order || opts.displayOrder || 999,
        });
    }

    async function getModuleStatusRollup(projectModuleSerials) {
        if (!projectModuleSerials || projectModuleSerials.length === 0) return [];
        const { data, error } = await getClient()
            .from('station_task_completions')
            .select('module_serial, status, department_id, task_id')
            .in('module_serial', projectModuleSerials);
        if (error) {
            console.error('[StationBoard] getModuleStatusRollup error:', error);
            return [];
        }
        return data || [];
    }

    async function getCompletionsByModule(moduleSerial) {
        if (!moduleSerial) return [];
        const { data, error } = await getClient()
            .from('station_task_completions')
            .select('*')
            .eq('module_serial', moduleSerial);
        if (error) {
            console.error('[StationBoard] getCompletionsByModule error:', error);
            return [];
        }
        return data || [];
    }

    window.MODA_STATION_BOARD = {
        weekStart, weekDates, parseDate, fmtDate,
        getDepartments, getLineDepartments, upsertDepartment, deleteDepartment, updateStagger,
        addDepartment, deactivateDepartment, reorderDepartments,
        getTasks, getAllTasks, upsertTask, deleteTask, addTask, removeTask,
        getShifts, upsertShift,
        getWeeklySchedule, getActiveOrCurrentWeekSchedule, upsertWeeklySchedule, completeWeek,
        getDailyTargets, upsertDailyTarget,
        getDayAssignments, bulkSetAssignments, deleteAssignment, clearDayAssignments, generateWeekAssignments,
        getCompletions, upsertCompletion,
        getWeeklyReport,
        subscribeToCompletions,
        getModuleStatusRollup, getCompletionsByModule,
    };

    console.log('[StationBoard] Data layer v2 ready');
})();
