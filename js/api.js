// ============================================================================
// MODA API Client
// Frontend API layer for communicating with backend
// Falls back to localStorage when backend is unavailable
// ============================================================================

const MODA_API = (function() {
    'use strict';
    
    // Backend disabled - using Supabase instead
    // Set to false to skip local backend checks
    const USE_LOCAL_BACKEND = false;
    
    // Dynamically determine backend URL based on how frontend is accessed
    // If accessing via IP, backend should also be accessed via same IP
    const getApiBase = () => {
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:3001/api';
        }
        // Use same hostname (IP) for backend, just different port
        return `http://${hostname}:3001/api`;
    };
    
    const API_BASE = getApiBase();
    let isBackendAvailable = false; // Default to false since we use Supabase
    
    // ===== Private Helpers =====
    
    async function checkBackend() {
        // Skip backend check if using Supabase
        if (!USE_LOCAL_BACKEND) {
            isBackendAvailable = false;
            return false;
        }
        
        if (isBackendAvailable !== null) return isBackendAvailable;
        
        try {
            const response = await fetch(`${API_BASE}/health`, { 
                method: 'GET',
                timeout: 2000 
            });
            isBackendAvailable = response.ok;
        } catch (err) {
            isBackendAvailable = false;
        }
        
        console.log(`[API] Backend ${isBackendAvailable ? 'available' : 'not available'} - using ${isBackendAvailable ? 'API' : 'localStorage'}`);
        return isBackendAvailable;
    }
    
    async function request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }
        
        const response = await fetch(url, config);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        
        return response.json();
    }
    
    // ===== Public API =====
    
    return {
        
        // Check if backend is available
        isAvailable: async function() {
            return checkBackend();
        },
        
        // Force re-check backend availability
        recheckBackend: function() {
            isBackendAvailable = null;
            return checkBackend();
        },
        
        // ===== Projects =====
        
        projects: {
            list: async function(includeDeleted = false) {
                if (!await checkBackend()) {
                    // Fallback to localStorage
                    const saved = localStorage.getItem('autovol_projects');
                    return saved ? JSON.parse(saved) : [];
                }
                return request(`/projects?includeDeleted=${includeDeleted}`);
            },
            
            get: async function(id) {
                if (!await checkBackend()) {
                    const projects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
                    return projects.find(p => p.id === id);
                }
                return request(`/projects/${id}`);
            },
            
            create: async function(project) {
                if (!await checkBackend()) {
                    const projects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
                    projects.push(project);
                    localStorage.setItem('autovol_projects', JSON.stringify(projects));
                    return { id: project.id };
                }
                return request('/projects', { method: 'POST', body: project });
            },
            
            update: async function(id, updates) {
                if (!await checkBackend()) {
                    const projects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
                    const index = projects.findIndex(p => p.id === id);
                    if (index !== -1) {
                        projects[index] = { ...projects[index], ...updates };
                        localStorage.setItem('autovol_projects', JSON.stringify(projects));
                    }
                    return { message: 'Updated' };
                }
                return request(`/projects/${id}`, { method: 'PUT', body: updates });
            },
            
            delete: async function(id) {
                if (!await checkBackend()) {
                    const projects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
                    const project = projects.find(p => p.id === id);
                    if (project) {
                        // Move to trash
                        const trash = JSON.parse(localStorage.getItem('autovol_trash_projects') || '[]');
                        trash.push({ ...project, deletedAt: Date.now() });
                        localStorage.setItem('autovol_trash_projects', JSON.stringify(trash));
                        // Remove from active
                        localStorage.setItem('autovol_projects', JSON.stringify(projects.filter(p => p.id !== id)));
                    }
                    return { message: 'Deleted' };
                }
                return request(`/projects/${id}`, { method: 'DELETE' });
            },
            
            restore: async function(id) {
                if (!await checkBackend()) {
                    const trash = JSON.parse(localStorage.getItem('autovol_trash_projects') || '[]');
                    const project = trash.find(p => p.id === id);
                    if (project) {
                        delete project.deletedAt;
                        const projects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
                        projects.push(project);
                        localStorage.setItem('autovol_projects', JSON.stringify(projects));
                        localStorage.setItem('autovol_trash_projects', JSON.stringify(trash.filter(p => p.id !== id)));
                    }
                    return { message: 'Restored' };
                }
                return request(`/projects/${id}/restore`, { method: 'POST' });
            }
        },
        
        // ===== Modules =====
        
        modules: {
            list: async function(filters = {}) {
                if (!await checkBackend()) {
                    const projects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
                    let modules = projects.flatMap(p => (p.modules || []).map(m => ({ ...m, projectId: p.id, projectName: p.name })));
                    
                    if (filters.projectId) modules = modules.filter(m => m.projectId === filters.projectId);
                    if (filters.status) modules = modules.filter(m => m.status === filters.status);
                    
                    return modules;
                }
                
                const params = new URLSearchParams(filters).toString();
                return request(`/modules${params ? '?' + params : ''}`);
            },
            
            get: async function(id) {
                if (!await checkBackend()) {
                    const projects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
                    for (const p of projects) {
                        const mod = (p.modules || []).find(m => m.id === id);
                        if (mod) return { ...mod, projectId: p.id, projectName: p.name };
                    }
                    return null;
                }
                return request(`/modules/${id}`);
            },
            
            create: async function(module) {
                if (!await checkBackend()) {
                    const projects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
                    const project = projects.find(p => p.id === module.projectId);
                    if (project) {
                        if (!project.modules) project.modules = [];
                        project.modules.push(module);
                        localStorage.setItem('autovol_projects', JSON.stringify(projects));
                    }
                    return { id: module.id };
                }
                return request('/modules', { method: 'POST', body: module });
            },
            
            update: async function(id, updates) {
                if (!await checkBackend()) {
                    const projects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
                    for (const p of projects) {
                        const index = (p.modules || []).findIndex(m => m.id === id);
                        if (index !== -1) {
                            p.modules[index] = { ...p.modules[index], ...updates };
                            localStorage.setItem('autovol_projects', JSON.stringify(projects));
                            break;
                        }
                    }
                    return { message: 'Updated' };
                }
                return request(`/modules/${id}`, { method: 'PUT', body: updates });
            },
            
            updateProgress: async function(id, stageId, progress) {
                if (!await checkBackend()) {
                    const projects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
                    for (const p of projects) {
                        const mod = (p.modules || []).find(m => m.id === id);
                        if (mod) {
                            if (!mod.stageProgress) mod.stageProgress = {};
                            mod.stageProgress[stageId] = progress;
                            localStorage.setItem('autovol_projects', JSON.stringify(projects));
                            break;
                        }
                    }
                    return { message: 'Updated' };
                }
                return request(`/modules/${id}/progress`, { method: 'PUT', body: { stageId, progress } });
            },
            
            delete: async function(id) {
                if (!await checkBackend()) {
                    const projects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
                    for (const p of projects) {
                        const index = (p.modules || []).findIndex(m => m.id === id);
                        if (index !== -1) {
                            p.modules.splice(index, 1);
                            localStorage.setItem('autovol_projects', JSON.stringify(projects));
                            break;
                        }
                    }
                    return { message: 'Deleted' };
                }
                return request(`/modules/${id}`, { method: 'DELETE' });
            }
        },
        
        // ===== Employees =====
        
        employees: {
            list: async function(filters = {}) {
                if (!await checkBackend()) {
                    const saved = localStorage.getItem('autovol_employees');
                    let employees = saved ? JSON.parse(saved) : [];
                    
                    if (filters.department) employees = employees.filter(e => e.department === filters.department);
                    if (filters.status) employees = employees.filter(e => e.status === filters.status);
                    
                    return employees;
                }
                
                const params = new URLSearchParams(filters).toString();
                return request(`/employees${params ? '?' + params : ''}`);
            },
            
            get: async function(id) {
                if (!await checkBackend()) {
                    const employees = JSON.parse(localStorage.getItem('autovol_employees') || '[]');
                    return employees.find(e => e.id === id);
                }
                return request(`/employees/${id}`);
            },
            
            create: async function(employee) {
                if (!await checkBackend()) {
                    const employees = JSON.parse(localStorage.getItem('autovol_employees') || '[]');
                    employees.push(employee);
                    localStorage.setItem('autovol_employees', JSON.stringify(employees));
                    return { id: employee.id };
                }
                return request('/employees', { method: 'POST', body: employee });
            },
            
            update: async function(id, updates) {
                if (!await checkBackend()) {
                    const employees = JSON.parse(localStorage.getItem('autovol_employees') || '[]');
                    const index = employees.findIndex(e => e.id === id);
                    if (index !== -1) {
                        employees[index] = { ...employees[index], ...updates };
                        localStorage.setItem('autovol_employees', JSON.stringify(employees));
                    }
                    return { message: 'Updated' };
                }
                return request(`/employees/${id}`, { method: 'PUT', body: updates });
            },
            
            delete: async function(id) {
                if (!await checkBackend()) {
                    const employees = JSON.parse(localStorage.getItem('autovol_employees') || '[]');
                    const employee = employees.find(e => e.id === id);
                    if (employee) {
                        const trash = JSON.parse(localStorage.getItem('autovol_trash_employees') || '[]');
                        trash.push({ ...employee, deletedAt: Date.now() });
                        localStorage.setItem('autovol_trash_employees', JSON.stringify(trash));
                        localStorage.setItem('autovol_employees', JSON.stringify(employees.filter(e => e.id !== id)));
                    }
                    return { message: 'Deleted' };
                }
                return request(`/employees/${id}`, { method: 'DELETE' });
            }
        },
        
        // ===== Sync =====
        
        sync: {
            // Import localStorage data to backend
            importFromLocalStorage: async function() {
                if (!await checkBackend()) {
                    throw new Error('Backend not available');
                }
                
                const data = {
                    projects: JSON.parse(localStorage.getItem('autovol_projects') || '[]'),
                    trashedProjects: JSON.parse(localStorage.getItem('autovol_trash_projects') || '[]'),
                    employees: JSON.parse(localStorage.getItem('autovol_employees') || '[]'),
                    trashedEmployees: JSON.parse(localStorage.getItem('autovol_trash_employees') || '[]'),
                    departments: JSON.parse(localStorage.getItem('autovol_departments') || '[]')
                };
                
                return request('/sync/import', { method: 'POST', body: data });
            },
            
            // Export backend data (can be used to sync to localStorage)
            exportFromBackend: async function() {
                if (!await checkBackend()) {
                    throw new Error('Backend not available');
                }
                return request('/sync/export');
            },
            
            // Sync backend data to localStorage
            syncToLocalStorage: async function() {
                const data = await this.exportFromBackend();
                
                localStorage.setItem('autovol_projects', JSON.stringify(data.projects || []));
                localStorage.setItem('autovol_trash_projects', JSON.stringify(data.trashedProjects || []));
                localStorage.setItem('autovol_employees', JSON.stringify(data.employees || []));
                localStorage.setItem('autovol_trash_employees', JSON.stringify(data.trashedEmployees || []));
                localStorage.setItem('autovol_departments', JSON.stringify(data.departments || []));
                
                return { message: 'Synced to localStorage', data };
            },
            
            // Get database stats
            stats: async function() {
                if (!await checkBackend()) {
                    return {
                        projects: JSON.parse(localStorage.getItem('autovol_projects') || '[]').length,
                        employees: JSON.parse(localStorage.getItem('autovol_employees') || '[]').length,
                        backend: false
                    };
                }
                const stats = await request('/sync/stats');
                return { ...stats, backend: true };
            }
        }
    };
})();

// Export for use in modules
if (typeof window !== 'undefined') {
    window.MODA_API = MODA_API;
    
    // ===== AUTO-SYNC LAYER =====
    // Disabled - using Supabase instead of local backend
    // Set USE_LOCAL_BACKEND to true to re-enable
    const USE_LOCAL_BACKEND_SYNC = false;
    
    (async function initAutoSync() {
        // Skip if using Supabase
        if (!USE_LOCAL_BACKEND_SYNC) {
            console.log('[MODA] Backend not available - using localStorage only');
            return;
        }
        
        // Check if backend is available on startup
        // Determine API base URL based on how frontend is accessed
        const hostname = window.location.hostname;
        const apiBase = (hostname === 'localhost' || hostname === '127.0.0.1') 
            ? 'http://localhost:3001/api' 
            : `http://${hostname}:3001/api`;
        
        console.log('[MODA] Checking backend at:', apiBase);
        
        try {
            const response = await fetch(`${apiBase}/health`, { method: 'GET' });
            if (response.ok) {
                console.log('[MODA] Backend detected - enabling auto-sync');
                
                // Load data from backend on startup (backend is source of truth)
                try {
                    const data = await MODA_API.sync.exportFromBackend();
                    if (data.projects && data.projects.length > 0) {
                        localStorage.setItem('autovol_projects', JSON.stringify(data.projects));
                        localStorage.setItem('autovol_trash_projects', JSON.stringify(data.trashedProjects || []));
                        localStorage.setItem('autovol_employees', JSON.stringify(data.employees || []));
                        localStorage.setItem('autovol_trash_employees', JSON.stringify(data.trashedEmployees || []));
                        console.log(`[MODA] Loaded ${data.projects.length} projects from backend`);
                        
                        // Trigger page reload to pick up new data (only if data changed)
                        const currentProjects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
                        if (JSON.stringify(currentProjects) !== JSON.stringify(data.projects)) {
                            console.log('[MODA] Data changed, reloading...');
                            // Don't auto-reload, let user see the data
                        }
                    } else {
                        // Backend is empty, push localStorage data to it
                        const localProjects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
                        if (localProjects.length > 0) {
                            console.log('[MODA] Backend empty, syncing localStorage data...');
                            await MODA_API.sync.importFromLocalStorage();
                            console.log('[MODA] Initial sync complete');
                        }
                    }
                } catch (err) {
                    console.warn('[MODA] Initial sync failed:', err.message);
                }
                
                // Set up auto-save: debounced sync when localStorage changes
                let syncTimeout = null;
                const originalSetItem = localStorage.setItem.bind(localStorage);
                
                localStorage.setItem = function(key, value) {
                    originalSetItem(key, value);
                    
                    // Only sync MODA data keys
                    if (key.startsWith('autovol_')) {
                        clearTimeout(syncTimeout);
                        syncTimeout = setTimeout(async () => {
                            try {
                                await MODA_API.sync.importFromLocalStorage();
                                console.log('[MODA] Auto-synced to backend');
                            } catch (err) {
                                console.warn('[MODA] Auto-sync failed:', err.message);
                            }
                        }, 2000); // Debounce 2 seconds
                    }
                };
                
                window.MODA_BACKEND_ENABLED = true;
            } else {
                console.log('[MODA] Backend not available - using localStorage only');
                window.MODA_BACKEND_ENABLED = false;
            }
        } catch (err) {
            console.log('[MODA] Backend not available - using localStorage only');
            window.MODA_BACKEND_ENABLED = false;
        }
    })();
}
