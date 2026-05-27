(function () {
    'use strict';

    if (window.MODA_SUPERVISORS) {
        console.log('[Supervisors] Already initialized');
        return;
    }

    function getClient() {
        const c = window.MODA_SUPABASE?.client;
        if (!c) throw new Error('[Supervisors] Supabase client not ready');
        return c;
    }

    function getUser() {
        return window.MODA_SUPABASE?.currentUser;
    }

    async function getSupervisors(activeOnly = true) {
        let q = getClient()
            .from('supervisor_profiles')
            .select(`*, departments:department_supervisors(department_id, is_primary, department:station_departments(id, name, color, display_order))`)
            .order('full_name');
        if (activeOnly) q = q.eq('is_active', true);
        const { data, error } = await q;
        if (error) throw error;
        return data;
    }

    async function getSupervisorByEmail(email) {
        const { data, error } = await getClient()
            .from('supervisor_profiles')
            .select(`*, departments:department_supervisors(department_id, is_primary, department:station_departments(id, name, color, display_order, stagger_offset))`)
            .eq('email', email)
            .maybeSingle();
        if (error) throw error;
        return data;
    }

    async function getCurrentSupervisor() {
        const user = getUser();
        if (!user?.email) return null;
        return getSupervisorByEmail(user.email);
    }

    async function upsertSupervisor({ id, email, fullName, phone, shiftAssignment, role, isActive, avatarColor, notes }) {
        const row = {
            email,
            full_name: fullName,
            phone: phone || null,
            shift_assignment: shiftAssignment || 1,
            role: role || 'supervisor',
            is_active: isActive !== undefined ? isActive : true,
            avatar_color: avatarColor || '#0D9488',
            notes: notes || null,
            updated_at: new Date().toISOString(),
        };
        if (id) row.id = id;
        const { data, error } = await getClient()
            .from('supervisor_profiles')
            .upsert(row, { onConflict: 'id' })
            .select().single();
        if (error) throw error;
        return data;
    }

    async function deleteSupervisor(id) {
        const { error } = await getClient()
            .from('supervisor_profiles')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
    }

    async function getSupervisorDepartments(supervisorId) {
        const { data, error } = await getClient()
            .from('department_supervisors')
            .select('*, department:station_departments(id, name, color, display_order, stagger_offset)')
            .eq('supervisor_id', supervisorId)
            .order('department(display_order)');
        if (error) throw error;
        return data;
    }

    async function setDepartmentAssignments(supervisorId, departmentIds) {
        const sb = getClient();
        await sb.from('department_supervisors').delete().eq('supervisor_id', supervisorId);
        if (!departmentIds || departmentIds.length === 0) return [];
        const rows = departmentIds.map((deptId, i) => ({
            supervisor_id: supervisorId,
            department_id: deptId,
            is_primary: i === 0,
        }));
        const { data, error } = await sb.from('department_supervisors').insert(rows).select();
        if (error) throw error;
        return data;
    }

    async function assignDepartment(supervisorId, departmentId, isPrimary = false) {
        const { data, error } = await getClient()
            .from('department_supervisors')
            .upsert({ supervisor_id: supervisorId, department_id: departmentId, is_primary: isPrimary }, { onConflict: 'supervisor_id,department_id' })
            .select().single();
        if (error) throw error;
        return data;
    }

    async function unassignDepartment(supervisorId, departmentId) {
        const { error } = await getClient()
            .from('department_supervisors')
            .delete()
            .eq('supervisor_id', supervisorId)
            .eq('department_id', departmentId);
        if (error) throw error;
    }

    async function getHandoffReport(weekStart) {
        const { data, error } = await getClient()
            .from('station_handoff_reports')
            .select('*')
            .eq('week_start', weekStart)
            .maybeSingle();
        if (error) throw error;
        return data;
    }

    async function generateHandoffReport(weekStart) {
        const sb = window.MODA_STATION_BOARD;
        if (!sb) throw new Error('MODA_STATION_BOARD not loaded');
        const [depts, allTasks, completions, assignments] = await Promise.all([
            sb.getLineDepartments(), sb.getAllTasks(),
            sb.getCompletions(weekStart), sb.getDayAssignments(weekStart),
        ]);
        const shift1Days = ['monday','tuesday','wednesday','thursday'];
        const weekDates = sb.weekDates(weekStart);
        const dayNames = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
        const shift1Dates = weekDates.filter((_, i) => shift1Days.includes(dayNames[i]));
        const shift1Assignments = assignments.filter(a => shift1Dates.includes(a.target_date));
        const allModules = [...new Set(shift1Assignments.map(a => a.module_serial))];
        const flags = [];
        const deptSummaries = [];
        depts.forEach(dept => {
            const deptTasks = allTasks.filter(t => t.department_id === dept.id);
            const deptAssign = shift1Assignments.filter(a => a.department_id === dept.id);
            const deptModules = [...new Set(deptAssign.map(a => a.module_serial))];
            const deptComps = completions.filter(c => c.department_id === dept.id);
            let complete = 0, wip = 0, stopped = 0, incomplete = 0;
            deptModules.forEach(serial => {
                const mComps = deptComps.filter(c => c.module_serial === serial);
                const compMap = {};
                mComps.forEach(c => { compMap[c.task_id] = c.status; });
                const naTasks = deptTasks.filter(t => compMap[t.id] === 'n/a' || compMap[t.id] === 'N/A').length;
                const completeTasks = deptTasks.filter(t => compMap[t.id] === 'complete').length;
                const totalActive = deptTasks.length - naTasks;
                const pct = totalActive > 0 ? Math.round((completeTasks / totalActive) * 100) : 100;
                const anyStopped = deptTasks.some(t => compMap[t.id] === 'stopped');
                const anyWip = deptTasks.some(t => compMap[t.id] === 'wip');
                if (pct === 100) { complete++; }
                else if (anyStopped) { stopped++; flags.push({ department_id: dept.id, module_serial: serial, flag_type: 'stopped', completion_pct: pct, week_start: weekStart }); }
                else if (anyWip) { wip++; flags.push({ department_id: dept.id, module_serial: serial, flag_type: 'wip', completion_pct: pct, week_start: weekStart }); }
                else { incomplete++; flags.push({ department_id: dept.id, module_serial: serial, flag_type: pct === 0 ? 'not_started' : 'incomplete', completion_pct: pct, week_start: weekStart }); }
            });
            deptSummaries.push({ departmentId: dept.id, departmentName: dept.name, color: dept.color, totalModules: deptModules.length, complete, wip, stopped, incomplete });
        });
        const user = window.MODA_SUPABASE?.currentUser;
        const { data: report, error: rErr } = await getClient()
            .from('station_handoff_reports')
            .upsert({ week_start: weekStart, generated_at: new Date().toISOString(), generated_by: user?.email, total_modules: allModules.length, complete_modules: deptSummaries.reduce((s,d)=>s+d.complete,0), wip_modules: deptSummaries.reduce((s,d)=>s+d.wip,0), stopped_modules: deptSummaries.reduce((s,d)=>s+d.stopped,0), incomplete_modules: deptSummaries.reduce((s,d)=>s+d.incomplete,0), report_data: { deptSummaries, flags, shift1Dates } }, { onConflict: 'week_start' })
            .select().single();
        if (rErr) throw rErr;
        if (flags.length > 0) {
            await getClient().from('station_handoff_flags').delete().eq('week_start', weekStart);
            await getClient().from('station_handoff_flags').insert(flags);
        }
        await getClient().from('station_weekly_schedule').update({ shift1_complete: true, shift1_completed_at: new Date().toISOString(), shift1_completed_by: user?.email }).eq('week_start', weekStart);
        return { report, flags, deptSummaries };
    }

    async function getHandoffFlags(weekStart, resolvedOnly = false) {
        let q = getClient().from('station_handoff_flags').select('*, department:station_departments(name, color)').eq('week_start', weekStart);
        if (!resolvedOnly) q = q.eq('resolved', false);
        const { data, error } = await q.order('completion_pct');
        if (error) throw error;
        return data;
    }

    async function resolveFlag(flagId, resolvedBy) {
        const { data, error } = await getClient().from('station_handoff_flags').update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: resolvedBy || getUser()?.email }).eq('id', flagId).select().single();
        if (error) throw error;
        return data;
    }

    async function completeShift2(weekStart) {
        const user = getUser();
        const { data, error } = await getClient().from('station_weekly_schedule').update({ shift2_complete: true, shift2_completed_at: new Date().toISOString(), shift2_completed_by: user?.email, status: 'complete', completed_at: new Date().toISOString() }).eq('week_start', weekStart).select().single();
        if (error) throw error;
        return data;
    }

    function isAdmin(supervisorProfile) {
        const user = getUser();
        return supervisorProfile?.role === 'admin' || user?.dashboard_role === 'admin' || user?.email === 'trevor@autovol.com' || user?.email === 'stephanie@autovol.com';
    }

    function canEditDepartment(supervisorProfile, departmentId) {
        if (isAdmin(supervisorProfile)) return true;
        return supervisorProfile?.departments?.some(d => d.department_id === departmentId);
    }

    window.MODA_SUPERVISORS = {
        getSupervisors, getSupervisorByEmail, getCurrentSupervisor,
        upsertSupervisor, deleteSupervisor,
        getSupervisorDepartments, setDepartmentAssignments, assignDepartment, unassignDepartment,
        getHandoffReport, generateHandoffReport, getHandoffFlags, resolveFlag, completeShift2,
        isAdmin, canEditDepartment,
    };

    console.log('[Supervisors] Data layer ready');
})();
