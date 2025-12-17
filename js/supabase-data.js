/**
 * Supabase Data Layer for MODA
 * 
 * Handles PostgreSQL operations for projects, modules, and employees.
 * Provides localStorage fallback for offline functionality.
 * Supports real-time subscriptions via Supabase Realtime.
 */

(function() {
    'use strict';

    // Check if Supabase client is available
    if (!window.MODA_SUPABASE) {
        console.warn('[Supabase Data] Supabase client not initialized, using localStorage only');
        window.MODA_SUPABASE_DATA = {
            isAvailable: () => false,
            projects: null,
            modules: null,
            employees: null
        };
        return;
    }

    const getClient = () => window.MODA_SUPABASE.client;
    const isAvailable = () => window.MODA_SUPABASE.isInitialized && getClient();

    // ============================================================================
    // PROJECTS API
    // ============================================================================

    const ProjectsAPI = {
        // Get all projects
        async getAll() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        },

        // Get single project by ID
        async getById(projectId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .maybeSingle();
            
            if (error) throw error;
            return data;
        },

        // Create new project
        async create(projectData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('projects')
                .insert({
                    name: projectData.name,
                    status: projectData.status || 'Planning',
                    location: projectData.location || '',
                    modules: projectData.modules || [],
                    client: projectData.client || '',
                    start_date: projectData.startDate || null,
                    end_date: projectData.endDate || null
                })
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Projects] Created:', data.id);
            return data;
        },

        // Update existing project
        async update(projectId, updates) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('projects')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', projectId)
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Projects] Updated:', projectId);
            return data;
        },

        // Delete project
        async delete(projectId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { error } = await getClient()
                .from('projects')
                .delete()
                .eq('id', projectId);
            
            if (error) throw error;
            console.log('[Projects] Deleted:', projectId);
            return true;
        },

        // Subscribe to real-time changes
        onSnapshot(callback) {
            if (!isAvailable()) {
                console.warn('[Projects] Supabase not available for real-time');
                return () => {};
            }

            // Initial load
            this.getAll().then(projects => callback(projects)).catch(console.error);

            // Subscribe to changes
            const subscription = getClient()
                .channel('projects-changes')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'projects' },
                    async (payload) => {
                        console.log('[Projects] Real-time update:', payload.eventType);
                        const projects = await this.getAll();
                        callback(projects);
                    }
                )
                .subscribe();

            // Return unsubscribe function
            return () => {
                subscription.unsubscribe();
            };
        }
    };

    // ============================================================================
    // MODULES API
    // ============================================================================

    const ModulesAPI = {
        // Get all modules for a project
        async getByProject(projectId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('modules')
                .select('*')
                .eq('project_id', projectId)
                .order('build_sequence', { ascending: true });
            
            if (error) throw error;
            return data || [];
        },

        // Get single module by ID
        async getById(moduleId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('modules')
                .select('*')
                .eq('id', moduleId)
                .maybeSingle();
            
            if (error) throw error;
            return data;
        },

        // Create new module
        async create(moduleData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('modules')
                .insert({
                    project_id: moduleData.projectId,
                    serial_number: moduleData.serialNumber,
                    blm_id: moduleData.blmId,
                    unit_type: moduleData.unitType,
                    build_sequence: moduleData.buildSequence || 0,
                    stage_progress: moduleData.stageProgress || {},
                    difficulties: moduleData.difficulties || {}
                })
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Modules] Created:', data.id);
            return data;
        },

        // Update module
        async update(moduleId, updates) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('modules')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', moduleId)
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Modules] Updated:', moduleId);
            return data;
        },

        // Delete module
        async delete(moduleId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { error } = await getClient()
                .from('modules')
                .delete()
                .eq('id', moduleId);
            
            if (error) throw error;
            console.log('[Modules] Deleted:', moduleId);
            return true;
        },

        // Bulk create modules
        async bulkCreate(modules) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('modules')
                .insert(modules.map(m => ({
                    project_id: m.projectId,
                    serial_number: m.serialNumber,
                    blm_id: m.blmId,
                    unit_type: m.unitType,
                    build_sequence: m.buildSequence || 0,
                    stage_progress: m.stageProgress || {},
                    difficulties: m.difficulties || {}
                })))
                .select();
            
            if (error) throw error;
            console.log('[Modules] Bulk created:', data.length);
            return data;
        }
    };

    // ============================================================================
    // EMPLOYEES API
    // ============================================================================

    const EmployeesAPI = {
        // Convert DB row to frontend format (snake_case to camelCase)
        _toFrontend(row) {
            if (!row) return null;
            // Compute full name from parts (since we removed the generated column)
            const nameParts = [
                row.prefix,
                row.first_name,
                row.middle_name,
                row.last_name,
                row.suffix
            ].filter(Boolean);
            const computedName = nameParts.join(' ').trim();
            
            return {
                id: row.id,
                prefix: row.prefix || '',
                firstName: row.first_name || '',
                middleName: row.middle_name || '',
                lastName: row.last_name || '',
                suffix: row.suffix || '',
                name: computedName,
                jobTitle: row.job_title || '',
                department: row.department || '',
                shift: row.shift || 'Shift-A',
                hireDate: row.hire_date || '',
                email: row.email || '',
                phone: row.phone || '',
                permissions: row.permissions || 'No Access',
                accessStatus: row.access_status || 'none',
                supabaseUserId: row.supabase_user_id || null,
                isActive: row.is_active !== false,
                inactiveReason: row.inactive_reason || null,
                inactiveNotes: row.inactive_notes || null,
                inactiveDate: row.inactive_date || null,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        },

        // Convert frontend format to DB format (camelCase to snake_case)
        _toDatabase(data) {
            const dbData = {};
            if (data.prefix !== undefined) dbData.prefix = data.prefix || null;
            if (data.firstName !== undefined) dbData.first_name = data.firstName;
            if (data.middleName !== undefined) dbData.middle_name = data.middleName || null;
            if (data.lastName !== undefined) dbData.last_name = data.lastName;
            if (data.suffix !== undefined) dbData.suffix = data.suffix || null;
            if (data.jobTitle !== undefined) dbData.job_title = data.jobTitle || null;
            if (data.department !== undefined) dbData.department = data.department || null;
            if (data.shift !== undefined) dbData.shift = data.shift || 'Shift-A';
            if (data.hireDate !== undefined) dbData.hire_date = data.hireDate || null;
            if (data.email !== undefined) dbData.email = data.email || null;
            if (data.phone !== undefined) dbData.phone = data.phone || null;
            if (data.permissions !== undefined) dbData.permissions = data.permissions || 'No Access';
            if (data.accessStatus !== undefined) dbData.access_status = data.accessStatus || 'none';
            if (data.supabaseUserId !== undefined) dbData.supabase_user_id = data.supabaseUserId || null;
            if (data.isActive !== undefined) dbData.is_active = data.isActive;
            if (data.inactiveReason !== undefined) dbData.inactive_reason = data.inactiveReason || null;
            if (data.inactiveNotes !== undefined) dbData.inactive_notes = data.inactiveNotes || null;
            if (data.inactiveDate !== undefined) dbData.inactive_date = data.inactiveDate || null;
            return dbData;
        },

        // Get all employees (both active and inactive for filtering)
        async getAll() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('employees')
                .select('*')
                .order('last_name', { ascending: true });
            
            if (error) throw error;
            return (data || []).map(row => this._toFrontend(row));
        },

        // Get single employee by ID
        async getById(employeeId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('employees')
                .select('*')
                .eq('id', employeeId)
                .maybeSingle();
            
            if (error) throw error;
            return this._toFrontend(data);
        },

        // Get employee by email
        async getByEmail(email) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('employees')
                .select('*')
                .eq('email', email)
                .maybeSingle();
            
            if (error) throw error;
            return this._toFrontend(data);
        },

        // Check if user exists in Supabase Auth by email
        async checkUserExists(email) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            try {
                const { data, error } = await getClient()
                    .rpc('check_user_exists', { check_email: email });
                
                if (error) {
                    console.error('[Employees] checkUserExists error:', error);
                    return null;
                }
                
                return data && data.length > 0 ? data[0] : null;
            } catch (err) {
                console.error('[Employees] checkUserExists exception:', err);
                return null;
            }
        },

        // Link employee to existing Supabase user
        async linkToUser(email) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            try {
                const { data, error } = await getClient()
                    .rpc('link_employee_to_user', { employee_email: email });
                
                if (error) {
                    console.error('[Employees] linkToUser error:', error);
                    return null;
                }
                
                return data; // Returns user_id if linked, null if not found
            } catch (err) {
                console.error('[Employees] linkToUser exception:', err);
                return null;
            }
        },

        // Create new employee
        async create(employeeData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const dbData = this._toDatabase(employeeData);
            
            const { data, error } = await getClient()
                .from('employees')
                .insert(dbData)
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Employees] Created:', data.id);
            return this._toFrontend(data);
        },

        // Update employee
        async update(employeeId, updates) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const dbData = this._toDatabase(updates);
            
            const { data, error } = await getClient()
                .from('employees')
                .update(dbData)
                .eq('id', employeeId)
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Employees] Updated:', employeeId);
            return this._toFrontend(data);
        },

        // Delete employee (soft delete - sets is_active to false)
        async delete(employeeId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { error } = await getClient()
                .from('employees')
                .update({ is_active: false })
                .eq('id', employeeId);
            
            if (error) throw error;
            console.log('[Employees] Soft deleted:', employeeId);
            return true;
        },

        // Hard delete employee (permanent)
        async hardDelete(employeeId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { error } = await getClient()
                .from('employees')
                .delete()
                .eq('id', employeeId);
            
            if (error) throw error;
            console.log('[Employees] Hard deleted:', employeeId);
            return true;
        },

        // Subscribe to real-time changes
        onSnapshot(callback) {
            if (!isAvailable()) {
                console.warn('[Employees] Supabase not available for real-time');
                return () => {};
            }

            // Initial load
            this.getAll().then(employees => callback(employees)).catch(console.error);

            // Subscribe to changes
            const subscription = getClient()
                .channel('employees-changes')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'employees' },
                    async (payload) => {
                        console.log('[Employees] Real-time update:', payload.eventType);
                        const employees = await this.getAll();
                        callback(employees);
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    };

    // ============================================================================
    // WEEKLY SCHEDULES API
    // ============================================================================

    const WeeklySchedulesAPI = {
        // Get current schedule (there should only be one with schedule_type='current')
        async getCurrent() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('weekly_schedules')
                .select('*')
                .eq('schedule_type', 'current')
                .maybeSingle();  // Use maybeSingle to avoid 406 when no rows exist
            
            if (error) throw error;
            return data;  // Returns null if no rows found (expected for first load)
        },

        // Get completed weeks history
        async getCompleted(limit = 50) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('weekly_schedules')
                .select('*')
                .eq('schedule_type', 'completed')
                .order('completed_at', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return data || [];
        },

        // Create or update current schedule
        async saveCurrent(scheduleData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Check if current schedule exists
            const existing = await this.getCurrent();
            
            const payload = {
                schedule_type: 'current',
                shift1: scheduleData.shift1 || { monday: 5, tuesday: 5, wednesday: 5, thursday: 5 },
                shift2: scheduleData.shift2 || { friday: 0, saturday: 0, sunday: 0 },
                created_by: window.MODA_SUPABASE?.currentUser?.id
            };
            
            if (existing) {
                // Update existing
                const { data, error } = await getClient()
                    .from('weekly_schedules')
                    .update(payload)
                    .eq('id', existing.id)
                    .select()
                    .single();
                
                if (error) throw error;
                console.log('[WeeklySchedules] Updated current schedule');
                return data;
            } else {
                // Create new
                const { data, error } = await getClient()
                    .from('weekly_schedules')
                    .insert(payload)
                    .select()
                    .single();
                
                if (error) throw error;
                console.log('[WeeklySchedules] Created current schedule');
                return data;
            }
        },

        // Complete a week (creates historical record)
        async completeWeek(weekData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('weekly_schedules')
                .insert({
                    schedule_type: 'completed',
                    week_id: weekData.weekId,
                    shift1: weekData.shift1,
                    shift2: weekData.shift2,
                    line_balance: weekData.lineBalance,
                    completed_at: new Date().toISOString(),
                    schedule_snapshot: weekData.scheduleSnapshot,
                    created_by: window.MODA_SUPABASE?.currentUser?.id
                })
                .select()
                .single();
            
            if (error) throw error;
            console.log('[WeeklySchedules] Completed week:', weekData.weekId);
            return data;
        },

        // Delete a completed week record
        async deleteCompleted(scheduleId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { error } = await getClient()
                .from('weekly_schedules')
                .delete()
                .eq('id', scheduleId);
            
            if (error) throw error;
            console.log('[WeeklySchedules] Deleted:', scheduleId);
            return true;
        },

        // Check if current user can edit schedules
        canEdit() {
            const userEmail = window.MODA_SUPABASE?.userProfile?.email || 
                              window.MODA_SUPABASE?.currentUser?.email || '';
            return userEmail.toLowerCase() === 'trevor@autovol.com';
        },

        // Subscribe to real-time changes
        onSnapshot(callback) {
            if (!isAvailable()) {
                console.warn('[WeeklySchedules] Supabase not available for real-time');
                return () => {};
            }

            // Initial load
            Promise.all([this.getCurrent(), this.getCompleted()])
                .then(([current, completed]) => callback({ current, completed }))
                .catch(console.error);

            // Subscribe to changes
            const subscription = getClient()
                .channel('weekly-schedules-changes')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'weekly_schedules' },
                    async (payload) => {
                        console.log('[WeeklySchedules] Real-time update:', payload.eventType);
                        const [current, completed] = await Promise.all([
                            this.getCurrent(),
                            this.getCompleted()
                        ]);
                        callback({ current, completed });
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    };

    // ============================================================================
    // DATA MIGRATION UTILITIES
    // ============================================================================

    const MigrationAPI = {
        // Import data from localStorage to Supabase
        async importFromLocalStorage() {
            if (!isAvailable()) throw new Error('Supabase not available');

            const results = { projects: 0, employees: 0, errors: [] };

            try {
                // Import projects
                const localProjects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
                for (const project of localProjects) {
                    try {
                        await ProjectsAPI.create({
                            name: project.name,
                            status: project.status,
                            location: project.location,
                            modules: project.modules || [],
                            client: project.client,
                            startDate: project.startDate,
                            endDate: project.endDate
                        });
                        results.projects++;
                    } catch (err) {
                        results.errors.push(`Project ${project.name}: ${err.message}`);
                    }
                }

                // Import employees
                const localEmployees = JSON.parse(localStorage.getItem('autovol_employees') || '[]');
                for (const employee of localEmployees) {
                    try {
                        await EmployeesAPI.create({
                            name: employee.name,
                            department: employee.department,
                            role: employee.role,
                            email: employee.email,
                            phone: employee.phone
                        });
                        results.employees++;
                    } catch (err) {
                        results.errors.push(`Employee ${employee.name}: ${err.message}`);
                    }
                }

                console.log('[Migration] Import complete:', results);
                return results;

            } catch (error) {
                console.error('[Migration] Import error:', error);
                throw error;
            }
        },

        // Export data from Supabase to localStorage (backup)
        async exportToLocalStorage() {
            if (!isAvailable()) throw new Error('Supabase not available');

            try {
                const projects = await ProjectsAPI.getAll();
                const employees = await EmployeesAPI.getAll();

                localStorage.setItem('autovol_projects_backup', JSON.stringify(projects));
                localStorage.setItem('autovol_employees_backup', JSON.stringify(employees));

                console.log('[Migration] Export complete');
                return { projects: projects.length, employees: employees.length };

            } catch (error) {
                console.error('[Migration] Export error:', error);
                throw error;
            }
        }
    };

    // ============================================================================
    // EXPOSE GLOBAL API
    // ============================================================================

    window.MODA_SUPABASE_DATA = {
        isAvailable,
        projects: ProjectsAPI,
        modules: ModulesAPI,
        employees: EmployeesAPI,
        weeklySchedules: WeeklySchedulesAPI,
        migration: MigrationAPI
    };

    console.log('[Supabase Data] Module loaded');
})();
