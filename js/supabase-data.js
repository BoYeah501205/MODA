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
            
            if (error) {
                // Add detailed error info for debugging quota issues
                console.error('[Supabase Projects] Error details:', {
                    message: error.message,
                    code: error.code,
                    hint: error.hint,
                    details: error.details,
                    status: error.status
                });
                throw error;
            }
            return data || [];
        },

        // Get single project by ID
        async getById(projectId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
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
                    customer: projectData.customer || '',
                    address: projectData.address || '',
                    city: projectData.city || '',
                    state: projectData.state || '',
                    country: projectData.country || 'US',
                    zip_code: projectData.zipCode || '',
                    abbreviation: projectData.abbreviation || '',
                    description: projectData.description || '',
                    project_number: projectData.project_number || null,
                    start_date: projectData.startDate || null,
                    end_date: projectData.endDate || null
                })
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Projects] Created:', data.id);
            // Log activity
            if (window.ActivityLog) {
                window.ActivityLog.logCreate('project', 'project', data.id, data.name, { status: data.status });
            }
            return data;
        },

        // Update existing project
        async update(projectId, updates) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Map frontend field names to database column names
            const dbUpdates = {
                updated_at: new Date().toISOString()
            };
            
            // Only include fields that have values and map to correct column names
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.status !== undefined) dbUpdates.status = updates.status;
            if (updates.location !== undefined) dbUpdates.location = updates.location;
            if (updates.modules !== undefined) dbUpdates.modules = updates.modules;
            if (updates.client !== undefined) dbUpdates.client = updates.client;
            if (updates.customer !== undefined) dbUpdates.customer = updates.customer;
            if (updates.address !== undefined) dbUpdates.address = updates.address;
            if (updates.city !== undefined) dbUpdates.city = updates.city;
            if (updates.state !== undefined) dbUpdates.state = updates.state;
            if (updates.country !== undefined) dbUpdates.country = updates.country;
            if (updates.zipCode !== undefined) dbUpdates.zip_code = updates.zipCode;
            if (updates.zip_code !== undefined) dbUpdates.zip_code = updates.zip_code;
            if (updates.abbreviation !== undefined) dbUpdates.abbreviation = updates.abbreviation;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.project_number !== undefined) dbUpdates.project_number = updates.project_number;
            if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
            if (updates.start_date !== undefined) dbUpdates.start_date = updates.start_date;
            if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
            if (updates.end_date !== undefined) dbUpdates.end_date = updates.end_date;
            
            console.log('[Projects] Updating with:', dbUpdates);
            
            const { data, error } = await getClient()
                .from('projects')
                .update(dbUpdates)
                .eq('id', projectId)
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Projects] Updated:', projectId);
            // Log activity
            if (window.ActivityLog) {
                window.ActivityLog.logUpdate('project', 'project', projectId, data.name, null, updates);
            }
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
            // Log activity
            if (window.ActivityLog) {
                window.ActivityLog.logDelete('project', 'project', projectId, `Project ${projectId}`, {});
            }
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
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
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
            // Log activity
            if (window.ActivityLog) {
                window.ActivityLog.logCreate('module', 'module', data.id, data.serial_number, { projectId: data.project_id });
            }
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
            // Log activity
            if (window.ActivityLog) {
                window.ActivityLog.logUpdate('module', 'module', moduleId, data.serial_number, null, updates);
            }
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
            // Log activity
            if (window.ActivityLog) {
                window.ActivityLog.logDelete('module', 'module', moduleId, `Module ${moduleId}`, {});
            }
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

    // Map Supabase snake_case to camelCase for UI compatibility
    const mapEmployeeFromDb = (row) => ({
        id: row.id,
        prefix: row.prefix || '',
        firstName: row.first_name || '',
        middleName: row.middle_name || '',
        lastName: row.last_name || '',
        suffix: row.suffix || '',
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || '',
        department: row.department || '',
        jobTitle: row.job_title || '',
        shift: row.shift || '',
        permissions: row.permissions || 'No Access',
        accessStatus: row.access_status || 'none',
        supabaseUserId: row.supabase_user_id || null,
        isActive: row.is_active !== false,
        inactiveReason: row.inactive_reason || null,
        inactiveNotes: row.inactive_notes || null,
        inactiveDate: row.inactive_date || null,
        invitedAt: row.invited_at || null,
        birthDate: row.birth_date || null,
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null
    });

    // Map camelCase to snake_case for Supabase inserts/updates
    const mapEmployeeToDb = (data) => {
        const mapped = {};
        if (data.prefix !== undefined) mapped.prefix = data.prefix;
        if (data.firstName !== undefined) mapped.first_name = data.firstName;
        if (data.middleName !== undefined) mapped.middle_name = data.middleName;
        if (data.lastName !== undefined) mapped.last_name = data.lastName;
        if (data.suffix !== undefined) mapped.suffix = data.suffix;
        if (data.name !== undefined) mapped.name = data.name;
        if (data.email !== undefined) mapped.email = data.email;
        if (data.phone !== undefined) mapped.phone = data.phone;
        if (data.department !== undefined) mapped.department = data.department;
        if (data.jobTitle !== undefined) mapped.job_title = data.jobTitle;
        if (data.shift !== undefined) mapped.shift = data.shift;
        if (data.permissions !== undefined) mapped.permissions = data.permissions;
        if (data.accessStatus !== undefined) mapped.access_status = data.accessStatus;
        if (data.supabaseUserId !== undefined) mapped.supabase_user_id = data.supabaseUserId;
        if (data.isActive !== undefined) mapped.is_active = data.isActive;
        if (data.inactiveReason !== undefined) mapped.inactive_reason = data.inactiveReason;
        if (data.inactiveNotes !== undefined) mapped.inactive_notes = data.inactiveNotes;
        if (data.inactiveDate !== undefined) mapped.inactive_date = data.inactiveDate;
        if (data.invitedAt !== undefined) mapped.invited_at = data.invitedAt;
        if (data.birthDate !== undefined) mapped.birth_date = data.birthDate;
        return mapped;
    };

    const EmployeesAPI = {
        // Get all employees
        async getAll() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('employees')
                .select('*')
                .order('last_name', { ascending: true });
            
            if (error) throw error;
            return (data || []).map(mapEmployeeFromDb);
        },

        // Get single employee by ID
        async getById(employeeId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('employees')
                .select('*')
                .eq('id', employeeId)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data ? mapEmployeeFromDb(data) : null;
        },

        // Create new employee
        async create(employeeData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const dbData = mapEmployeeToDb(employeeData);
            const { data, error } = await getClient()
                .from('employees')
                .insert(dbData)
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Employees] Created:', data.id);
            const mapped = mapEmployeeFromDb(data);
            // Log activity
            if (window.ActivityLog) {
                window.ActivityLog.logCreate('employee', 'employee', data.id, mapped.name || `${mapped.firstName} ${mapped.lastName}`, { department: mapped.department });
            }
            return mapped;
        },

        // Update employee
        async update(employeeId, updates) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const dbUpdates = mapEmployeeToDb(updates);
            const { data, error } = await getClient()
                .from('employees')
                .update(dbUpdates)
                .eq('id', employeeId)
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Employees] Updated:', employeeId);
            const mapped = mapEmployeeFromDb(data);
            // Log activity
            if (window.ActivityLog) {
                window.ActivityLog.logUpdate('employee', 'employee', employeeId, mapped.name || `${mapped.firstName} ${mapped.lastName}`, null, updates);
            }
            return mapped;
        },

        // Delete employee
        async delete(employeeId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { error } = await getClient()
                .from('employees')
                .delete()
                .eq('id', employeeId);
            
            if (error) throw error;
            console.log('[Employees] Deleted:', employeeId);
            // Log activity
            if (window.ActivityLog) {
                window.ActivityLog.logDelete('employee', 'employee', employeeId, `Employee ${employeeId}`, {});
            }
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
    // DEPARTMENTS API
    // ============================================================================

    const DepartmentsAPI = {
        // Get all departments
        async getAll() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('departments')
                .select('*')
                .order('name', { ascending: true });
            
            if (error) throw error;
            return data || [];
        },

        // Get single department by ID
        async getById(departmentId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('departments')
                .select('*')
                .eq('id', departmentId)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },

        // Create new department
        async create(departmentData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('departments')
                .insert({
                    name: departmentData.name,
                    supervisor: departmentData.supervisor || null,
                    linked_station_id: departmentData.linkedStationId || null,
                    employee_count: departmentData.employeeCount || 0
                })
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Departments] Created:', data.id);
            return data;
        },

        // Update department
        async update(departmentId, updates) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const dbUpdates = {};
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.supervisor !== undefined) dbUpdates.supervisor = updates.supervisor;
            if (updates.linkedStationId !== undefined) dbUpdates.linked_station_id = updates.linkedStationId;
            if (updates.employeeCount !== undefined) dbUpdates.employee_count = updates.employeeCount;
            
            const { data, error } = await getClient()
                .from('departments')
                .update(dbUpdates)
                .eq('id', departmentId)
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Departments] Updated:', departmentId);
            return data;
        },

        // Delete department
        async delete(departmentId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { error } = await getClient()
                .from('departments')
                .delete()
                .eq('id', departmentId);
            
            if (error) throw error;
            console.log('[Departments] Deleted:', departmentId);
            return true;
        },

        // Subscribe to real-time changes
        onSnapshot(callback) {
            if (!isAvailable()) {
                console.warn('[Departments] Supabase not available for real-time');
                return () => {};
            }

            // Initial load
            this.getAll().then(departments => callback(departments)).catch(console.error);

            // Subscribe to changes
            const subscription = getClient()
                .channel('departments-changes')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'departments' },
                    async (payload) => {
                        console.log('[Departments] Real-time update:', payload.eventType);
                        const departments = await this.getAll();
                        callback(departments);
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
    // WEEKLY SCHEDULES API
    // ============================================================================

    const WeeklySchedulesAPI = {
        // Authorized editors for schedule setup
        AUTHORIZED_EDITORS: ['trevor@autovol.com', 'stephanie@autovol.com'],
        
        // Check if current user can edit schedules
        canEdit() {
            const userProfile = window.MODA_SUPABASE?.userProfile;
            const currentUser = window.MODA_SUPABASE?.currentUser;
            
            const userEmail = userProfile?.email || currentUser?.email || '';
            const userRole = userProfile?.dashboard_role || '';
            
            console.log('[WeeklySchedules] canEdit check - email:', userEmail, 'role:', userRole);
            
            // Admin role can always edit
            if (userRole === 'admin') {
                console.log('[WeeklySchedules] Admin role detected - edit allowed');
                return true;
            }
            
            // Check authorized editors list
            const isAuthorized = this.AUTHORIZED_EDITORS.includes(userEmail.toLowerCase());
            console.log('[WeeklySchedules] Authorized editor check:', isAuthorized);
            return isAuthorized;
        },
        
        // Get current week's schedule setup
        async getCurrent() {
            if (!isAvailable()) return null;
            
            try {
                const { data, error } = await getClient()
                    .from('weekly_schedules')
                    .select('*')
                    .eq('is_current', true)
                    .single();
                
                if (error && error.code !== 'PGRST116') throw error;
                return data;
            } catch (err) {
                console.error('[WeeklySchedules] Error getting current:', err);
                return null;
            }
        },
        
        // Save current week's schedule setup
        async saveCurrent(scheduleData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            if (!this.canEdit()) throw new Error('Not authorized to edit schedules');
            
            try {
                // Upsert the current schedule
                const { data, error } = await getClient()
                    .from('weekly_schedules')
                    .upsert({
                        is_current: true,
                        shift1: scheduleData.shift1,
                        shift2: scheduleData.shift2,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'is_current' })
                    .select()
                    .single();
                
                if (error) throw error;
                console.log('[WeeklySchedules] Saved current schedule');
                return data;
            } catch (err) {
                console.error('[WeeklySchedules] Error saving current:', err);
                throw err;
            }
        },
        
        // Get completed weeks history
        async getCompleted() {
            if (!isAvailable()) return [];
            
            try {
                const { data, error } = await getClient()
                    .from('completed_weeks')
                    .select('*')
                    .order('week_id', { ascending: false });
                
                if (error) throw error;
                return data || [];
            } catch (err) {
                console.error('[WeeklySchedules] Error getting completed weeks:', err);
                return [];
            }
        },
        
        // Save a completed week
        async saveCompleted(weekData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            if (!this.canEdit()) throw new Error('Not authorized to edit schedules');
            
            try {
                const { data, error } = await getClient()
                    .from('completed_weeks')
                    .upsert({
                        week_id: weekData.weekId,
                        shift1: weekData.shift1,
                        shift2: weekData.shift2,
                        modules_completed: weekData.modulesCompleted || 0,
                        notes: weekData.notes || '',
                        completed_at: weekData.completedAt || new Date().toISOString()
                    }, { onConflict: 'week_id' })
                    .select()
                    .single();
                
                if (error) throw error;
                console.log('[WeeklySchedules] Saved completed week:', weekData.weekId);
                return data;
            } catch (err) {
                console.error('[WeeklySchedules] Error saving completed week:', err);
                throw err;
            }
        },
        
        // Delete a completed week
        async deleteCompleted(weekId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            if (!this.canEdit()) throw new Error('Not authorized to edit schedules');
            
            try {
                const { error } = await getClient()
                    .from('completed_weeks')
                    .delete()
                    .eq('week_id', weekId);
                
                if (error) throw error;
                console.log('[WeeklySchedules] Deleted completed week:', weekId);
                return true;
            } catch (err) {
                console.error('[WeeklySchedules] Error deleting completed week:', err);
                throw err;
            }
        },
        
        // Subscribe to real-time changes
        onSnapshot(callback) {
            if (!isAvailable()) {
                console.warn('[WeeklySchedules] Supabase not available for real-time');
                return () => {};
            }
            
            const subscription = getClient()
                .channel('weekly-schedules-changes')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'weekly_schedules' },
                    async () => {
                        console.log('[WeeklySchedules] Real-time update');
                        const current = await this.getCurrent();
                        callback({ type: 'current', data: current });
                    }
                )
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'completed_weeks' },
                    async () => {
                        console.log('[WeeklySchedules] Completed weeks update');
                        const completed = await this.getCompleted();
                        callback({ type: 'completed', data: completed });
                    }
                )
                .subscribe();
            
            return () => {
                subscription.unsubscribe();
            };
        }
    };

    // ============================================================================
    // PRODUCTION WEEKS API
    // ============================================================================

    const ProductionWeeksAPI = {
        async getAll() {
            const client = getClient();
            if (!client) return [];
            
            try {
                const { data, error } = await client
                    .from('production_weeks')
                    .select('*')
                    .order('start_date', { ascending: true });
                
                if (error) throw error;
                
                // Map database fields to UI fields
                return (data || []).map(week => ({
                    id: week.id,
                    weekId: week.week_id,
                    weekNumber: week.week_number,
                    year: week.year,
                    quarter: week.quarter,
                    weekStart: week.start_date,
                    weekEnd: week.end_date,
                    plannedModules: week.planned_modules,
                    startingModule: week.starting_module,
                    status: week.status,
                    createdAt: week.created_at
                }));
            } catch (error) {
                console.error('[ProductionWeeks] Error fetching weeks:', error.message);
                return [];
            }
        },

        async create(weekData) {
            const client = getClient();
            if (!client) throw new Error('Supabase not available');
            
            const dbData = {
                id: weekData.id || weekData.weekId,
                week_id: weekData.weekId || weekData.id,
                week_number: weekData.weekNumber,
                year: weekData.year,
                quarter: weekData.quarter,
                start_date: weekData.weekStart,
                end_date: weekData.weekEnd,
                planned_modules: weekData.plannedModules || 20,
                starting_module: weekData.startingModule || null,
                status: weekData.status || 'Planned'
            };
            
            const { data, error } = await client
                .from('production_weeks')
                .insert(dbData)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },

        async update(weekId, updates) {
            const client = getClient();
            if (!client) throw new Error('Supabase not available');
            
            const dbUpdates = {};
            if (updates.weekStart !== undefined) dbUpdates.start_date = updates.weekStart;
            if (updates.weekEnd !== undefined) dbUpdates.end_date = updates.weekEnd;
            if (updates.plannedModules !== undefined) dbUpdates.planned_modules = updates.plannedModules;
            if (updates.startingModule !== undefined) dbUpdates.starting_module = updates.startingModule;
            if (updates.status !== undefined) dbUpdates.status = updates.status;
            if (updates.weekNumber !== undefined) dbUpdates.week_number = updates.weekNumber;
            if (updates.year !== undefined) dbUpdates.year = updates.year;
            if (updates.quarter !== undefined) dbUpdates.quarter = updates.quarter;
            
            const { data, error } = await client
                .from('production_weeks')
                .update(dbUpdates)
                .eq('id', weekId)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        },

        async delete(weekId) {
            const client = getClient();
            if (!client) throw new Error('Supabase not available');
            
            const { error } = await client
                .from('production_weeks')
                .delete()
                .eq('id', weekId);
            
            if (error) throw error;
            return true;
        }
    };

    // ============================================================================
    // STATION STAGGERS API
    // ============================================================================

    const StationStaggersAPI = {
        async get() {
            const client = getClient();
            if (!client) return null;
            
            try {
                // Table uses 'config' column for staggers data
                // Get the most recent config entry
                const { data, error } = await client
                    .from('station_staggers')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(1);
                
                if (error) throw error;
                
                // Return the config from the first (most recent) row
                if (data && data.length > 0 && data[0].config) {
                    return data[0].config;
                }
                return null;
            } catch (error) {
                return null;
            }
        },

        async save(staggers, description = 'Updated staggers', changedBy = null) {
            const client = getClient();
            if (!client) throw new Error('Supabase not available');
            
            // Insert new config row (table uses 'config' column)
            const { data, error } = await client
                .from('station_staggers')
                .insert({ 
                    config: staggers,
                    description: description,
                    changed_by: changedBy
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        }
    };

    // ============================================================================
    // STAGGER CHANGE LOG API
    // ============================================================================

    const StaggerChangeLogAPI = {
        async getAll() {
            const client = getClient();
            if (!client) return [];
            
            try {
                const { data, error } = await client
                    .from('stagger_change_log')
                    .select('*')
                    .order('timestamp', { ascending: false });
                
                if (error) throw error;
                return data || [];
            } catch (error) {
                console.error('[StaggerChangeLog] Error fetching:', error.message);
                return [];
            }
        },

        async add(logEntry) {
            const client = getClient();
            if (!client) throw new Error('Supabase not available');
            
            const { data, error } = await client
                .from('stagger_change_log')
                .insert({
                    id: logEntry.id,
                    timestamp: logEntry.timestamp,
                    description: logEntry.description,
                    changed_by: logEntry.changedBy,
                    changes: logEntry.changes,
                    staggers_snapshot: logEntry.staggersSnapshot
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        }
    };

    // ============================================================================
    // DASHBOARD ROLES API
    // ============================================================================

    const DashboardRolesAPI = {
        // Get all roles
        async getAll() {
            const client = getClient();
            if (!client) return [];
            
            try {
                const { data, error } = await client
                    .from('dashboard_roles')
                    .select('*')
                    .order('name', { ascending: true });
                
                if (error) throw error;
                
                // Transform from DB format to app format
                return (data || []).map(role => ({
                    id: role.id,
                    name: role.name,
                    description: role.description,
                    tabs: role.tabs || [],
                    editableTabs: role.editable_tabs || [],
                    capabilities: role.capabilities || {},
                    tabPermissions: role.tab_permissions || {},
                    isDefault: role.is_default || false,
                    isProtected: role.is_protected || false
                }));
            } catch (error) {
                console.error('[DashboardRoles] Error fetching:', error.message);
                return [];
            }
        },

        // Get single role by ID
        async getById(roleId) {
            const client = getClient();
            if (!client) return null;
            
            try {
                const { data, error } = await client
                    .from('dashboard_roles')
                    .select('*')
                    .eq('id', roleId)
                    .single();
                
                if (error) throw error;
                
                return {
                    id: data.id,
                    name: data.name,
                    description: data.description,
                    tabs: data.tabs || [],
                    editableTabs: data.editable_tabs || [],
                    capabilities: data.capabilities || {},
                    tabPermissions: data.tab_permissions || {},
                    isDefault: data.is_default || false,
                    isProtected: data.is_protected || false
                };
            } catch (error) {
                console.error('[DashboardRoles] Error fetching role:', error.message);
                return null;
            }
        },

        // Create new role
        async create(roleData) {
            const client = getClient();
            if (!client) throw new Error('Supabase not available');
            
            const { data, error } = await client
                .from('dashboard_roles')
                .insert({
                    id: roleData.id,
                    name: roleData.name,
                    description: roleData.description || '',
                    tabs: roleData.tabs || [],
                    editable_tabs: roleData.editableTabs || [],
                    capabilities: roleData.capabilities || {},
                    tab_permissions: roleData.tabPermissions || {},
                    is_default: roleData.isDefault || false,
                    is_protected: roleData.isProtected || false
                })
                .select()
                .single();
            
            if (error) throw error;
            console.log('[DashboardRoles] Created:', data.id);
            return data;
        },

        // Update existing role
        async update(roleId, updates) {
            const client = getClient();
            if (!client) throw new Error('Supabase not available');
            
            const dbUpdates = {};
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.tabs !== undefined) dbUpdates.tabs = updates.tabs;
            if (updates.editableTabs !== undefined) dbUpdates.editable_tabs = updates.editableTabs;
            if (updates.capabilities !== undefined) dbUpdates.capabilities = updates.capabilities;
            if (updates.tabPermissions !== undefined) dbUpdates.tab_permissions = updates.tabPermissions;
            if (updates.isDefault !== undefined) dbUpdates.is_default = updates.isDefault;
            
            const { data, error } = await client
                .from('dashboard_roles')
                .update(dbUpdates)
                .eq('id', roleId)
                .select()
                .single();
            
            if (error) throw error;
            console.log('[DashboardRoles] Updated:', roleId);
            return data;
        },

        // Delete role
        async delete(roleId) {
            const client = getClient();
            if (!client) throw new Error('Supabase not available');
            
            const { error } = await client
                .from('dashboard_roles')
                .delete()
                .eq('id', roleId);
            
            if (error) throw error;
            console.log('[DashboardRoles] Deleted:', roleId);
            return true;
        },

        // Set a role as default (unsets others)
        async setDefault(roleId) {
            const client = getClient();
            if (!client) throw new Error('Supabase not available');
            
            // First unset all defaults
            await client
                .from('dashboard_roles')
                .update({ is_default: false })
                .neq('id', roleId);
            
            // Then set the new default
            const { error } = await client
                .from('dashboard_roles')
                .update({ is_default: true })
                .eq('id', roleId);
            
            if (error) throw error;
            console.log('[DashboardRoles] Set default:', roleId);
            return true;
        },

        // Subscribe to real-time updates
        onSnapshot(callback) {
            const client = getClient();
            if (!client) return () => {};
            
            const subscription = client
                .channel('dashboard_roles_changes')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'dashboard_roles' },
                    async () => {
                        // Refetch all roles on any change
                        const roles = await DashboardRolesAPI.getAll();
                        callback(roles);
                    }
                )
                .subscribe();
            
            // Return unsubscribe function
            return () => {
                client.removeChannel(subscription);
            };
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
        departments: DepartmentsAPI,
        migration: MigrationAPI,
        weeklySchedules: WeeklySchedulesAPI,
        productionWeeks: ProductionWeeksAPI,
        stationStaggers: StationStaggersAPI,
        staggerChangeLog: StaggerChangeLogAPI,
        dashboardRoles: DashboardRolesAPI
    };

    console.log('[Supabase Data] Module loaded');
})();
