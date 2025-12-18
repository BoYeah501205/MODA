/**
 * Supabase Data Layer for MODA
 * 
 * Handles PostgreSQL operations for projects, modules, and employees.
 * Provides localStorage fallback for offline functionality.
 * Supports real-time subscriptions via Supabase Realtime.
 */

(function() {
    'use strict';

    // Supabase configuration for direct fetch API calls
    const SUPABASE_URL = 'https://syreuphexagezawjyjgt.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5cmV1cGhleGFnZXphd2p5amd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Mzc1MDEsImV4cCI6MjA4MTIxMzUwMX0.-0Th_v-LDCXER9v06-mjfdEUZtRxZZSHHWypmTQXmbs';

    // Helper function to make direct fetch API calls (avoids SDK Promise hanging issues)
    async function supabaseFetch(endpoint, options = {}) {
        // Try to get access token from localStorage (where Supabase stores it)
        let accessToken = null;
        try {
            const storageKey = `sb-syreuphexagezawjyjgt-auth-token`;
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                accessToken = parsed?.access_token;
            }
        } catch (e) {
            console.warn('[supabaseFetch] Could not get token from storage:', e);
        }
        
        const headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
            ...options.headers
        };
        
        console.log('[supabaseFetch] Fetching:', endpoint);
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
            ...options,
            headers
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            console.error('[supabaseFetch] Error:', response.status, error);
            throw new Error(error.message || error.error || 'Supabase request failed');
        }
        
        const data = await response.json();
        console.log('[supabaseFetch] Success:', endpoint, 'rows:', data?.length);
        return data;
    }

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
        // Get all projects (uses direct fetch to avoid SDK Promise hanging)
        async getAll() {
            console.log('[ProjectsAPI.getAll] Starting, isAvailable:', isAvailable());
            if (!isAvailable()) throw new Error('Supabase not available');
            
            try {
                console.log('[ProjectsAPI.getAll] Calling supabaseFetch...');
                // Use direct fetch API to avoid SDK Promise hanging issues
                const data = await supabaseFetch('projects?select=*&order=created_at.desc');
                console.log('[Projects] Fetched', data?.length || 0, 'projects via direct API');
                return data || [];
            } catch (fetchError) {
                console.warn('[Projects] Direct fetch failed, trying SDK:', fetchError.message);
                // Fallback to SDK with timeout
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('SDK timeout')), 5000)
                );
                const sdkPromise = getClient()
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                const { data, error } = await Promise.race([sdkPromise, timeoutPromise]);
                if (error) throw error;
                return data || [];
            }
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
                .limit(1);
            
            if (error) throw error;
            const created = data && data.length > 0 ? data[0] : null;
            console.log('[Projects] Created:', created?.id);
            return created;
        },

        // Update existing project
        async update(projectId, updates) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Extract only the fields we want to update (avoid sending React internal fields)
            const updatePayload = {
                name: updates.name,
                status: updates.status,
                location: updates.location,
                modules: updates.modules || [],
                client: updates.client,
                start_date: updates.startDate || updates.start_date,
                end_date: updates.endDate || updates.end_date,
                updated_at: new Date().toISOString()
            };
            
            // Remove undefined values
            Object.keys(updatePayload).forEach(key => 
                updatePayload[key] === undefined && delete updatePayload[key]
            );
            
            const { data, error } = await getClient()
                .from('projects')
                .update(updatePayload)
                .eq('id', projectId)
                .select()
                .limit(1);
            
            if (error) throw error;
            console.log('[Projects] Updated:', projectId, 'modules:', updatePayload.modules?.length || 0);
            return data && data.length > 0 ? data[0] : null;
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
                shift: row.shift || 'N/A',
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
            if (data.shift !== undefined) dbData.shift = data.shift || 'N/A';
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
            console.log('[EmployeesAPI.getAll] Starting, isAvailable:', isAvailable());
            if (!isAvailable()) throw new Error('Supabase not available');
            
            try {
                console.log('[EmployeesAPI.getAll] Calling supabaseFetch...');
                // Use direct fetch API to avoid SDK Promise hanging issues
                const data = await supabaseFetch('employees?select=*&order=last_name.asc');
                console.log('[Employees] Fetched', data?.length || 0, 'employees via direct API');
                return (data || []).map(row => this._toFrontend(row));
            } catch (fetchError) {
                console.warn('[Employees] Direct fetch failed, trying SDK:', fetchError.message);
                const { data, error } = await getClient()
                    .from('employees')
                    .select('*')
                    .order('last_name', { ascending: true });
                
                if (error) throw error;
                return (data || []).map(row => this._toFrontend(row));
            }
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

        // Create new employee (uses direct fetch to avoid SDK timeout)
        async create(employeeData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const dbData = this._toDatabase(employeeData);
            console.log('[Employees] Creating employee via direct API:', dbData);
            
            try {
                const data = await supabaseFetch('employees?select=*', {
                    method: 'POST',
                    headers: { 'Prefer': 'return=representation' },
                    body: JSON.stringify(dbData)
                });
                
                const created = Array.isArray(data) ? data[0] : data;
                console.log('[Employees] Created:', created?.id);
                return this._toFrontend(created);
            } catch (fetchError) {
                console.error('[Employees] Direct create failed:', fetchError.message);
                throw fetchError;
            }
        },

        // Update employee (uses direct fetch to avoid SDK timeout)
        async update(employeeId, updates) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const dbData = this._toDatabase(updates);
            console.log('[Employees] Updating employee via direct API:', employeeId, dbData);
            
            try {
                const data = await supabaseFetch(`employees?id=eq.${employeeId}&select=*`, {
                    method: 'PATCH',
                    headers: { 'Prefer': 'return=representation' },
                    body: JSON.stringify(dbData)
                });
                
                const updated = Array.isArray(data) ? data[0] : data;
                console.log('[Employees] Updated:', employeeId);
                return this._toFrontend(updated);
            } catch (fetchError) {
                console.error('[Employees] Direct update failed:', fetchError.message);
                throw fetchError;
            }
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
    // DEPARTMENTS API
    // ============================================================================

    const DepartmentsAPI = {
        // Get all departments
        async getAll() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            try {
                // Use direct fetch API to avoid SDK Promise hanging issues
                const data = await supabaseFetch('departments?select=*&order=sort_order.asc');
                console.log('[Departments] Fetched', data?.length || 0, 'departments via direct API');
                return (data || []).map(d => ({
                    id: d.id,
                    name: d.name,
                    supervisor: d.supervisor,
                    employeeCount: d.employee_count || 0
                }));
            } catch (fetchError) {
                console.warn('[Departments] Direct fetch failed, trying SDK:', fetchError.message);
                const { data, error } = await getClient()
                    .from('departments')
                    .select('*')
                    .order('sort_order', { ascending: true });
                
                if (error) throw error;
                return (data || []).map(d => ({
                    id: d.id,
                    name: d.name,
                    supervisor: d.supervisor,
                    employeeCount: d.employee_count || 0
                }));
            }
        },

        // Save department (create or update)
        async save(deptData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const dbData = {
                id: deptData.id,
                name: deptData.name,
                supervisor: deptData.supervisor || null,
                employee_count: deptData.employeeCount || 0
            };
            
            const { data, error } = await getClient()
                .from('departments')
                .upsert(dbData, { onConflict: 'id' })
                .select()
                .limit(1);
            
            if (error) throw error;
            console.log('[Departments] Saved:', deptData.id);
            return data && data.length > 0 ? data[0] : null;
        },

        // Save all departments (bulk upsert)
        async saveAll(departments) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const dbData = departments.map((d, idx) => ({
                id: d.id,
                name: d.name,
                supervisor: d.supervisor || null,
                employee_count: d.employeeCount || 0,
                sort_order: idx
            }));
            
            const { data, error } = await getClient()
                .from('departments')
                .upsert(dbData, { onConflict: 'id' })
                .select();
            
            if (error) throw error;
            console.log('[Departments] Saved all:', departments.length);
            return data || [];
        },

        // Delete department
        async delete(deptId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { error } = await getClient()
                .from('departments')
                .delete()
                .eq('id', deptId);
            
            if (error) throw error;
            return true;
        }
    };

    // ============================================================================
    // TRASHED EMPLOYEES API
    // ============================================================================

    const TrashedEmployeesAPI = {
        // Get all trashed employees
        async getAll() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('trashed_employees')
                .select('*')
                .order('deleted_at', { ascending: false });
            
            if (error) throw error;
            return (data || []).map(row => ({
                id: row.id,
                originalId: row.original_id,
                prefix: row.prefix || '',
                firstName: row.first_name || '',
                middleName: row.middle_name || '',
                lastName: row.last_name || '',
                suffix: row.suffix || '',
                jobTitle: row.job_title || '',
                department: row.department || '',
                shift: row.shift || 'N/A',
                hireDate: row.hire_date || '',
                email: row.email || '',
                phone: row.phone || '',
                permissions: row.permissions || 'No Access',
                accessStatus: row.access_status || 'none',
                deletedAt: row.deleted_at
            }));
        },

        // Move employee to trash
        async trash(employee) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const dbData = {
                original_id: employee.id,
                prefix: employee.prefix || null,
                first_name: employee.firstName,
                middle_name: employee.middleName || null,
                last_name: employee.lastName,
                suffix: employee.suffix || null,
                job_title: employee.jobTitle || null,
                department: employee.department || null,
                shift: employee.shift || 'N/A',
                hire_date: employee.hireDate || null,
                email: employee.email || null,
                phone: employee.phone || null,
                permissions: employee.permissions || 'No Access',
                access_status: employee.accessStatus || 'none',
                deleted_by: window.MODA_SUPABASE?.currentUser?.id || null
            };
            
            const { data, error } = await getClient()
                .from('trashed_employees')
                .insert(dbData)
                .select()
                .limit(1);
            
            if (error) throw error;
            console.log('[TrashedEmployees] Trashed:', employee.id);
            return data && data.length > 0 ? data[0] : null;
        },

        // Restore employee from trash
        async restore(trashedId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Get the trashed employee data
            const { data: trashed, error: fetchError } = await getClient()
                .from('trashed_employees')
                .select('*')
                .eq('id', trashedId)
                .limit(1);
            
            if (fetchError) throw fetchError;
            if (!trashed || trashed.length === 0) throw new Error('Trashed employee not found');
            
            const row = trashed[0];
            
            // Re-create in employees table
            const employeeData = {
                prefix: row.prefix,
                first_name: row.first_name,
                middle_name: row.middle_name,
                last_name: row.last_name,
                suffix: row.suffix,
                job_title: row.job_title,
                department: row.department,
                shift: row.shift,
                hire_date: row.hire_date,
                email: row.email,
                phone: row.phone,
                permissions: row.permissions,
                access_status: row.access_status,
                is_active: true
            };
            
            const { data: restored, error: insertError } = await getClient()
                .from('employees')
                .insert(employeeData)
                .select()
                .limit(1);
            
            if (insertError) throw insertError;
            
            // Delete from trash
            await this.permanentDelete(trashedId);
            
            console.log('[TrashedEmployees] Restored:', trashedId);
            return restored && restored.length > 0 ? restored[0] : null;
        },

        // Permanently delete from trash
        async permanentDelete(trashedId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { error } = await getClient()
                .from('trashed_employees')
                .delete()
                .eq('id', trashedId);
            
            if (error) throw error;
            console.log('[TrashedEmployees] Permanently deleted:', trashedId);
            return true;
        }
    };

    // ============================================================================
    // WEEKLY SCHEDULES API
    // ============================================================================

    const WeeklySchedulesAPI = {
        // Get current schedule (there should only be one with schedule_type='current')
        async getCurrent() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Use limit(1) instead of maybeSingle to handle duplicate rows gracefully
            const { data, error } = await getClient()
                .from('weekly_schedules')
                .select('*')
                .eq('schedule_type', 'current')
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (error) throw error;
            return data && data.length > 0 ? data[0] : null;  // Returns null if no rows found
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
                // Update existing - use limit(1) instead of single() to avoid PGRST116
                const { data, error } = await getClient()
                    .from('weekly_schedules')
                    .update(payload)
                    .eq('id', existing.id)
                    .select()
                    .limit(1);
                
                if (error) throw error;
                console.log('[WeeklySchedules] Updated current schedule');
                return data && data.length > 0 ? data[0] : null;
            } else {
                // Create new - use limit(1) instead of single()
                const { data, error } = await getClient()
                    .from('weekly_schedules')
                    .insert(payload)
                    .select()
                    .limit(1);
                
                if (error) throw error;
                console.log('[WeeklySchedules] Created current schedule');
                return data && data.length > 0 ? data[0] : null;
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
                .limit(1);
            
            if (error) throw error;
            console.log('[WeeklySchedules] Completed week:', weekData.weekId);
            return data && data.length > 0 ? data[0] : null;
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
        // Only trevor@autovol.com and stephanie@autovol.com can modify schedule setup
        canEdit() {
            const userEmail = window.MODA_SUPABASE?.userProfile?.email || 
                              window.MODA_SUPABASE?.currentUser?.email || '';
            const allowedEditors = ['trevor@autovol.com', 'stephanie@autovol.com'];
            return allowedEditors.includes(userEmail.toLowerCase());
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
    // QA MODULE API
    // ============================================================================

    const QAAPI = {
        // Get all travelers for a project
        async getTravelers(projectId = null) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            let query = getClient().from('qa_travelers').select('*');
            if (projectId) query = query.eq('project_id', projectId);
            
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        // Get traveler by module ID
        async getTravelerByModule(moduleId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('qa_travelers')
                .select('*')
                .eq('module_id', moduleId)
                .limit(1);
            
            if (error) throw error;
            return data && data.length > 0 ? data[0] : null;
        },

        // Create or update traveler
        async saveTraveler(travelerData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const existing = await this.getTravelerByModule(travelerData.module_id);
            
            if (existing) {
                const { data, error } = await getClient()
                    .from('qa_travelers')
                    .update({ ...travelerData, updated_at: new Date().toISOString() })
                    .eq('id', existing.id)
                    .select()
                    .limit(1);
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            } else {
                const { data, error } = await getClient()
                    .from('qa_travelers')
                    .insert(travelerData)
                    .select()
                    .limit(1);
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            }
        },

        // Get all deviations
        async getDeviations(projectId = null) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            let query = getClient().from('qa_deviations').select('*');
            if (projectId) query = query.eq('project_id', projectId);
            
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        // Create deviation
        async createDeviation(deviationData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('qa_deviations')
                .insert(deviationData)
                .select()
                .limit(1);
            
            if (error) throw error;
            return data && data.length > 0 ? data[0] : null;
        },

        // Update deviation
        async updateDeviation(deviationId, updates) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('qa_deviations')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', deviationId)
                .select()
                .limit(1);
            
            if (error) throw error;
            return data && data.length > 0 ? data[0] : null;
        },

        // Get all test results
        async getTests(projectId = null) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            let query = getClient().from('qa_tests').select('*');
            if (projectId) query = query.eq('project_id', projectId);
            
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        // Create test result
        async createTest(testData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('qa_tests')
                .insert(testData)
                .select()
                .limit(1);
            
            if (error) throw error;
            return data && data.length > 0 ? data[0] : null;
        }
    };

    // ============================================================================
    // RFI API
    // ============================================================================

    const RFIAPI = {
        // Get all RFIs
        async getAll(projectId = null) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            let query = getClient().from('rfis').select('*');
            if (projectId) query = query.eq('project_id', projectId);
            
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        // Get RFI by ID
        async getById(rfiId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('rfis')
                .select('*')
                .eq('id', rfiId)
                .limit(1);
            
            if (error) throw error;
            return data && data.length > 0 ? data[0] : null;
        },

        // Create RFI
        async create(rfiData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('rfis')
                .insert(rfiData)
                .select()
                .limit(1);
            
            if (error) throw error;
            console.log('[RFIs] Created:', data[0]?.id);
            return data && data.length > 0 ? data[0] : null;
        },

        // Update RFI
        async update(rfiId, updates) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('rfis')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', rfiId)
                .select()
                .limit(1);
            
            if (error) throw error;
            return data && data.length > 0 ? data[0] : null;
        },

        // Delete RFI
        async delete(rfiId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { error } = await getClient()
                .from('rfis')
                .delete()
                .eq('id', rfiId);
            
            if (error) throw error;
            return true;
        }
    };

    // ============================================================================
    // TRANSPORT API
    // ============================================================================

    const TransportAPI = {
        // Yards
        async getYards() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('transport_yards')
                .select('*')
                .order('name', { ascending: true });
            
            if (error) throw error;
            return data || [];
        },

        async saveYard(yardData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            if (yardData.id) {
                const { data, error } = await getClient()
                    .from('transport_yards')
                    .update({ ...yardData, updated_at: new Date().toISOString() })
                    .eq('id', yardData.id)
                    .select()
                    .limit(1);
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            } else {
                const { data, error } = await getClient()
                    .from('transport_yards')
                    .insert(yardData)
                    .select()
                    .limit(1);
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            }
        },

        // Companies
        async getCompanies() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('transport_companies')
                .select('*')
                .order('name', { ascending: true });
            
            if (error) throw error;
            return data || [];
        },

        async saveCompany(companyData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            if (companyData.id) {
                const { data, error } = await getClient()
                    .from('transport_companies')
                    .update({ ...companyData, updated_at: new Date().toISOString() })
                    .eq('id', companyData.id)
                    .select()
                    .limit(1);
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            } else {
                const { data, error } = await getClient()
                    .from('transport_companies')
                    .insert(companyData)
                    .select()
                    .limit(1);
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            }
        },

        // Transport Modules
        async getModules(projectId = null) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            let query = getClient().from('transport_modules').select('*');
            if (projectId) query = query.eq('project_id', projectId);
            
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        async saveModule(moduleData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            if (moduleData.id) {
                const { data, error } = await getClient()
                    .from('transport_modules')
                    .update({ ...moduleData, updated_at: new Date().toISOString() })
                    .eq('id', moduleData.id)
                    .select()
                    .limit(1);
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            } else {
                const { data, error } = await getClient()
                    .from('transport_modules')
                    .insert(moduleData)
                    .select()
                    .limit(1);
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            }
        }
    };

    // ============================================================================
    // EQUIPMENT API
    // ============================================================================

    const EquipmentAPI = {
        // Get all equipment
        async getAll() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('equipment')
                .select('*')
                .order('name', { ascending: true });
            
            if (error) throw error;
            return data || [];
        },

        // Save equipment (create or update)
        async save(equipmentData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            if (equipmentData.id) {
                const { data, error } = await getClient()
                    .from('equipment')
                    .update({ ...equipmentData, updated_at: new Date().toISOString() })
                    .eq('id', equipmentData.id)
                    .select()
                    .limit(1);
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            } else {
                const { data, error } = await getClient()
                    .from('equipment')
                    .insert(equipmentData)
                    .select()
                    .limit(1);
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            }
        },

        // Delete equipment
        async delete(equipmentId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { error } = await getClient()
                .from('equipment')
                .delete()
                .eq('id', equipmentId);
            
            if (error) throw error;
            return true;
        },

        // Get vendors
        async getVendors() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('equipment_vendors')
                .select('*')
                .order('name', { ascending: true });
            
            if (error) throw error;
            return data || [];
        },

        // Save vendor
        async saveVendor(vendorData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            if (vendorData.id) {
                const { data, error } = await getClient()
                    .from('equipment_vendors')
                    .update({ ...vendorData, updated_at: new Date().toISOString() })
                    .eq('id', vendorData.id)
                    .select()
                    .limit(1);
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            } else {
                const { data, error } = await getClient()
                    .from('equipment_vendors')
                    .insert(vendorData)
                    .select()
                    .limit(1);
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            }
        },

        // Get inventory logs
        async getLogs(equipmentId = null) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            let query = getClient().from('equipment_logs').select('*');
            if (equipmentId) query = query.eq('equipment_id', equipmentId);
            
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },

        // Create log entry
        async createLog(logData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('equipment_logs')
                .insert(logData)
                .select()
                .limit(1);
            
            if (error) throw error;
            return data && data.length > 0 ? data[0] : null;
        }
    };

    // ============================================================================
    // TRAINING API
    // ============================================================================

    const TrainingAPI = {
        // Get training progress for all employees
        async getProgress() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('training_progress')
                .select('*')
                .order('updated_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        },

        // Save training progress
        async saveProgress(progressData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Upsert based on employee_id + station_id + skill_id
            const { data, error } = await getClient()
                .from('training_progress')
                .upsert(progressData, { 
                    onConflict: 'employee_id,station_id,skill_id',
                    ignoreDuplicates: false 
                })
                .select()
                .limit(1);
            
            if (error) throw error;
            return data && data.length > 0 ? data[0] : null;
        },

        // Get training stations config
        async getStations() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('training_stations')
                .select('*')
                .order('sort_order', { ascending: true });
            
            if (error) throw error;
            return data || [];
        },

        // Save training station config
        async saveStation(stationData) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            if (stationData.id) {
                const { data, error } = await getClient()
                    .from('training_stations')
                    .update({ ...stationData, updated_at: new Date().toISOString() })
                    .eq('id', stationData.id)
                    .select()
                    .limit(1);
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            } else {
                const { data, error } = await getClient()
                    .from('training_stations')
                    .insert(stationData)
                    .select()
                    .limit(1);
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            }
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
                let localProjects = [];
                try {
                    const savedProjects = localStorage.getItem('autovol_projects');
                    if (savedProjects && savedProjects !== 'undefined' && savedProjects !== 'null') {
                        localProjects = JSON.parse(savedProjects);
                    }
                } catch (e) {
                    console.error('[Migration] Error parsing projects:', e);
                }
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
                let localEmployees = [];
                try {
                    const savedEmployees = localStorage.getItem('autovol_employees');
                    if (savedEmployees && savedEmployees !== 'undefined' && savedEmployees !== 'null') {
                        localEmployees = JSON.parse(savedEmployees);
                    }
                } catch (e) {
                    console.error('[Migration] Error parsing employees:', e);
                }
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
    // STATION STAGGERS API
    // ============================================================================

    const StationStaggersAPI = {
        // Get current staggers configuration
        async get() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('station_staggers')
                .select('*')
                .eq('id', 'current')
                .limit(1);
            
            if (error) throw error;
            return data && data.length > 0 ? data[0].staggers : null;
        },

        // Save staggers configuration
        async save(staggers) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('station_staggers')
                .upsert({
                    id: 'current',
                    staggers: staggers,
                    updated_at: new Date().toISOString(),
                    updated_by: window.MODA_SUPABASE?.currentUser?.id || null
                }, { onConflict: 'id' })
                .select()
                .limit(1);
            
            if (error) throw error;
            console.log('[StationStaggers] Saved configuration');
            return data && data.length > 0 ? data[0] : null;
        }
    };

    // ============================================================================
    // STAGGER CHANGE LOG API
    // ============================================================================

    const StaggerChangeLogAPI = {
        // Get all change log entries
        async getAll() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('stagger_change_log')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return (data || []).map(row => ({
                id: row.id,
                description: row.description,
                changes: row.changes || {},
                staggersSnapshot: row.staggers_snapshot || {},
                changedBy: row.changed_by,
                timestamp: row.created_at
            }));
        },

        // Add a change log entry
        async add(entry) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('stagger_change_log')
                .insert({
                    description: entry.description,
                    changes: entry.changes || {},
                    staggers_snapshot: entry.staggersSnapshot || {},
                    changed_by: entry.changedBy,
                    changed_by_id: window.MODA_SUPABASE?.currentUser?.id || null
                })
                .select()
                .limit(1);
            
            if (error) throw error;
            console.log('[StaggerChangeLog] Added entry:', entry.description);
            return data && data.length > 0 ? data[0] : null;
        }
    };

    // ============================================================================
    // ENGINEERING ISSUES API
    // ============================================================================

    const EngineeringIssuesAPI = {
        // Get all issues
        async getAll() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('engineering_issues')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return (data || []).map(row => ({
                id: row.id,
                moduleId: row.module_id,
                projectId: row.project_id,
                title: row.title,
                description: row.description,
                severity: row.severity,
                status: row.status,
                assignedTo: row.assigned_to,
                reportedBy: row.reported_by,
                resolution: row.resolution,
                resolvedAt: row.resolved_at,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));
        },

        // Create issue
        async create(issue) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('engineering_issues')
                .insert({
                    module_id: issue.moduleId,
                    project_id: issue.projectId,
                    title: issue.title,
                    description: issue.description,
                    severity: issue.severity || 'medium',
                    status: issue.status || 'open',
                    assigned_to: issue.assignedTo,
                    reported_by: issue.reportedBy,
                    reported_by_id: window.MODA_SUPABASE?.currentUser?.id || null
                })
                .select()
                .limit(1);
            
            if (error) throw error;
            console.log('[EngineeringIssues] Created:', issue.title);
            return data && data.length > 0 ? data[0] : null;
        },

        // Update issue
        async update(issueId, updates) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const dbUpdates = {};
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.severity !== undefined) dbUpdates.severity = updates.severity;
            if (updates.status !== undefined) dbUpdates.status = updates.status;
            if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo;
            if (updates.resolution !== undefined) dbUpdates.resolution = updates.resolution;
            if (updates.status === 'resolved') dbUpdates.resolved_at = new Date().toISOString();
            dbUpdates.updated_at = new Date().toISOString();
            
            const { data, error } = await getClient()
                .from('engineering_issues')
                .update(dbUpdates)
                .eq('id', issueId)
                .select()
                .limit(1);
            
            if (error) throw error;
            console.log('[EngineeringIssues] Updated:', issueId);
            return data && data.length > 0 ? data[0] : null;
        },

        // Delete issue
        async delete(issueId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { error } = await getClient()
                .from('engineering_issues')
                .delete()
                .eq('id', issueId);
            
            if (error) throw error;
            console.log('[EngineeringIssues] Deleted:', issueId);
            return true;
        }
    };

    // ============================================================================
    // TRASHED PROJECTS API
    // ============================================================================

    const TrashedProjectsAPI = {
        // Get all trashed projects
        async getAll() {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('trashed_projects')
                .select('*')
                .order('deleted_at', { ascending: false });
            
            if (error) throw error;
            return (data || []).map(row => ({
                id: row.id,
                originalId: row.original_id,
                name: row.name,
                status: row.status,
                location: row.location,
                modules: row.modules || [],
                projectData: row.project_data || {},
                deletedAt: new Date(row.deleted_at).getTime(),
                deletedBy: row.deleted_by_name
            }));
        },

        // Move project to trash
        async trash(project) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { data, error } = await getClient()
                .from('trashed_projects')
                .insert({
                    original_id: project.id,
                    name: project.name,
                    status: project.status,
                    location: project.location,
                    modules: project.modules || [],
                    project_data: project,
                    deleted_by: window.MODA_SUPABASE?.currentUser?.id || null,
                    deleted_by_name: window.MODA_SUPABASE?.currentUser?.name || 'Unknown'
                })
                .select()
                .limit(1);
            
            if (error) throw error;
            console.log('[TrashedProjects] Trashed:', project.name);
            return data && data.length > 0 ? data[0] : null;
        },

        // Restore project from trash (returns project data)
        async restore(trashedId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            // Get the trashed project
            const { data: trashed, error: fetchError } = await getClient()
                .from('trashed_projects')
                .select('*')
                .eq('id', trashedId)
                .limit(1);
            
            if (fetchError) throw fetchError;
            if (!trashed || trashed.length === 0) throw new Error('Trashed project not found');
            
            const projectData = trashed[0].project_data || {
                id: trashed[0].original_id,
                name: trashed[0].name,
                status: trashed[0].status,
                location: trashed[0].location,
                modules: trashed[0].modules
            };
            
            // Delete from trash
            await this.permanentDelete(trashedId);
            
            console.log('[TrashedProjects] Restored:', trashed[0].name);
            return projectData;
        },

        // Permanently delete from trash
        async permanentDelete(trashedId) {
            if (!isAvailable()) throw new Error('Supabase not available');
            
            const { error } = await getClient()
                .from('trashed_projects')
                .delete()
                .eq('id', trashedId);
            
            if (error) throw error;
            console.log('[TrashedProjects] Permanently deleted:', trashedId);
            return true;
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
        trashedEmployees: TrashedEmployeesAPI,
        trashedProjects: TrashedProjectsAPI,
        weeklySchedules: WeeklySchedulesAPI,
        stationStaggers: StationStaggersAPI,
        staggerChangeLog: StaggerChangeLogAPI,
        engineeringIssues: EngineeringIssuesAPI,
        qa: QAAPI,
        rfis: RFIAPI,
        transport: TransportAPI,
        equipment: EquipmentAPI,
        training: TrainingAPI,
        migration: MigrationAPI
    };

    console.log('[Supabase Data] Module loaded');
})();
