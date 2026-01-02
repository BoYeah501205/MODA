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
        // Get all employees
        async getAll() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('employees')
                .select('*')
                .order('name', { ascending: true });
            
            if (error) throw error;
            return data || [];
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
            return data;
        },

        // Create new employee
        async create(employeeData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('employees')
                .insert({
                    name: employeeData.name,
                    department: employeeData.department,
                    role: employeeData.role,
                    email: employeeData.email,
                    phone: employeeData.phone
                })
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Employees] Created:', data.id);
            return data;
        },

        // Update employee
        async update(employeeId, updates) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('employees')
                .update(updates)
                .eq('id', employeeId)
                .select()
                .single();
            
            if (error) throw error;
            console.log('[Employees] Updated:', employeeId);
            return data;
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
                const { data, error } = await client
                    .from('station_staggers')
                    .select('*')
                    .eq('is_current', true)
                    .single();
                
                if (error) {
                    if (error.code === 'PGRST116') return null; // No rows
                    throw error;
                }
                
                return data?.staggers || null;
            } catch (error) {
                console.error('[StationStaggers] Error fetching:', error.message);
                return null;
            }
        },

        async save(staggers) {
            const client = getClient();
            if (!client) throw new Error('Supabase not available');
            
            // Upsert the current staggers
            const { data, error } = await client
                .from('station_staggers')
                .upsert({ 
                    id: 'current',
                    is_current: true,
                    staggers: staggers,
                    updated_at: new Date().toISOString()
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
    // EXPOSE GLOBAL API
    // ============================================================================

    window.MODA_SUPABASE_DATA = {
        isAvailable,
        projects: ProjectsAPI,
        modules: ModulesAPI,
        employees: EmployeesAPI,
        migration: MigrationAPI,
        weeklySchedules: WeeklySchedulesAPI,
        productionWeeks: ProductionWeeksAPI,
        stationStaggers: StationStaggersAPI,
        staggerChangeLog: StaggerChangeLogAPI
    };

    console.log('[Supabase Data] Module loaded');
})();
