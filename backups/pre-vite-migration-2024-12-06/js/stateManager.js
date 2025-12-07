// ============================================================================
// MODA STATE MANAGER - Centralized State Management
// Simple but effective state management without external dependencies
// ============================================================================

const MODA_STATE = (function() {
    'use strict';
    
    // Central state store
    let state = {
        projects: [],
        employees: [],
        departments: [],
        equipment: [],
        users: [],
        currentUser: null,
        unifiedModules: {},
        trashedProjects: [],
        trashedEmployees: []
    };
    
    // Subscribers for state changes
    const subscribers = new Map();
    
    // ===== PRIVATE METHODS =====
    
    function notifySubscribers(key) {
        if (subscribers.has(key)) {
            subscribers.get(key).forEach(callback => {
                try {
                    callback(state[key]);
                } catch (error) {
                    console.error(`[State] Subscriber error for ${key}:`, error);
                }
            });
        }
        
        // Notify wildcard subscribers
        if (subscribers.has('*')) {
            subscribers.get('*').forEach(callback => {
                try {
                    callback(state);
                } catch (error) {
                    console.error('[State] Wildcard subscriber error:', error);
                }
            });
        }
    }
    
    // ===== PUBLIC API =====
    
    return {
        
        // Initialize state from localStorage
        init: function() {
            console.log('[State] Initializing state from storage...');
            
            state.projects = MODA_STORAGE.get(MODA_CONSTANTS.STORAGE_KEYS.PROJECTS, []);
            state.employees = MODA_STORAGE.get(MODA_CONSTANTS.STORAGE_KEYS.EMPLOYEES, []);
            state.departments = MODA_STORAGE.get(MODA_CONSTANTS.STORAGE_KEYS.DEPARTMENTS, []);
            state.equipment = MODA_STORAGE.get(MODA_CONSTANTS.STORAGE_KEYS.EQUIPMENT, []);
            state.users = MODA_STORAGE.get(MODA_CONSTANTS.STORAGE_KEYS.USERS, []);
            state.unifiedModules = MODA_STORAGE.get(MODA_CONSTANTS.STORAGE_KEYS.UNIFIED_MODULES, {});
            state.trashedProjects = MODA_STORAGE.get(MODA_CONSTANTS.STORAGE_KEYS.TRASH_PROJECTS, []);
            state.trashedEmployees = MODA_STORAGE.get(MODA_CONSTANTS.STORAGE_KEYS.TRASH_EMPLOYEES, []);
            
            // Check for logged-in user
            const sessionUser = sessionStorage.getItem('autovol_current_user');
            if (sessionUser) {
                try {
                    state.currentUser = JSON.parse(sessionUser);
                } catch (e) {
                    console.error('[State] Failed to parse session user:', e);
                }
            }
            
            console.log('[State] Initialized:', {
                projects: state.projects.length,
                employees: state.employees.length,
                equipment: state.equipment.length,
                modules: Object.keys(state.unifiedModules).length
            });
        },
        
        // Get state value
        get: function(key) {
            return key ? state[key] : state;
        },
        
        // Set state value (with persistence)
        set: function(key, value, persist = true) {
            state[key] = value;
            
            // Persist to localStorage if needed
            if (persist) {
                const storageKey = this._getStorageKey(key);
                if (storageKey) {
                    MODA_STORAGE.setBatched(storageKey, value);
                }
            }
            
            // Notify subscribers
            notifySubscribers(key);
        },
        
        // Update state value (merge with existing)
        update: function(key, updates, persist = true) {
            if (Array.isArray(state[key])) {
                // For arrays, replace entirely
                this.set(key, updates, persist);
            } else if (typeof state[key] === 'object' && state[key] !== null) {
                // For objects, merge
                state[key] = { ...state[key], ...updates };
                
                if (persist) {
                    const storageKey = this._getStorageKey(key);
                    if (storageKey) {
                        MODA_STORAGE.setBatched(storageKey, state[key]);
                    }
                }
                
                notifySubscribers(key);
            } else {
                this.set(key, updates, persist);
            }
        },
        
        // Subscribe to state changes
        subscribe: function(key, callback) {
            if (!subscribers.has(key)) {
                subscribers.set(key, new Set());
            }
            subscribers.get(key).add(callback);
            
            // Return unsubscribe function
            return () => {
                if (subscribers.has(key)) {
                    subscribers.get(key).delete(callback);
                }
            };
        },
        
        // Unsubscribe from state changes
        unsubscribe: function(key, callback) {
            if (subscribers.has(key)) {
                subscribers.get(key).delete(callback);
            }
        },
        
        // Get storage key for state key
        _getStorageKey: function(stateKey) {
            const mapping = {
                projects: MODA_CONSTANTS.STORAGE_KEYS.PROJECTS,
                employees: MODA_CONSTANTS.STORAGE_KEYS.EMPLOYEES,
                departments: MODA_CONSTANTS.STORAGE_KEYS.DEPARTMENTS,
                equipment: MODA_CONSTANTS.STORAGE_KEYS.EQUIPMENT,
                users: MODA_CONSTANTS.STORAGE_KEYS.USERS,
                unifiedModules: MODA_CONSTANTS.STORAGE_KEYS.UNIFIED_MODULES,
                trashedProjects: MODA_CONSTANTS.STORAGE_KEYS.TRASH_PROJECTS,
                trashedEmployees: MODA_CONSTANTS.STORAGE_KEYS.TRASH_EMPLOYEES
            };
            return mapping[stateKey] || null;
        },
        
        // ===== SPECIALIZED GETTERS =====
        
        getProjectById: function(projectId) {
            return state.projects.find(p => p.id === projectId);
        },
        
        getModuleById: function(moduleId) {
            return state.unifiedModules[moduleId] || null;
        },
        
        getEmployeeById: function(employeeId) {
            return state.employees.find(e => e.id === employeeId);
        },
        
        getUserByEmail: function(email) {
            return state.users.find(u => u.email === email);
        },
        
        // ===== SPECIALIZED SETTERS =====
        
        addProject: function(project) {
            state.projects.push(project);
            this.set('projects', state.projects);
        },
        
        updateProject: function(projectId, updates) {
            const index = state.projects.findIndex(p => p.id === projectId);
            if (index !== -1) {
                state.projects[index] = { ...state.projects[index], ...updates };
                this.set('projects', state.projects);
            }
        },
        
        deleteProject: function(projectId) {
            const project = this.getProjectById(projectId);
            if (project) {
                // Move to trash
                state.trashedProjects.push({
                    ...project,
                    deletedAt: Date.now()
                });
                
                // Remove from active
                state.projects = state.projects.filter(p => p.id !== projectId);
                
                this.set('projects', state.projects);
                this.set('trashedProjects', state.trashedProjects);
            }
        },
        
        addEmployee: function(employee) {
            state.employees.push(employee);
            this.set('employees', state.employees);
        },
        
        updateEmployee: function(employeeId, updates) {
            const index = state.employees.findIndex(e => e.id === employeeId);
            if (index !== -1) {
                state.employees[index] = { ...state.employees[index], ...updates };
                this.set('employees', state.employees);
            }
        },
        
        deleteEmployee: function(employeeId) {
            const employee = this.getEmployeeById(employeeId);
            if (employee) {
                state.trashedEmployees.push({
                    ...employee,
                    deletedAt: Date.now()
                });
                
                state.employees = state.employees.filter(e => e.id !== employeeId);
                
                this.set('employees', state.employees);
                this.set('trashedEmployees', state.trashedEmployees);
            }
        },
        
        // ===== AUTH METHODS =====
        
        login: function(user) {
            state.currentUser = user;
            sessionStorage.setItem('autovol_current_user', JSON.stringify(user));
            notifySubscribers('currentUser');
        },
        
        logout: function() {
            state.currentUser = null;
            sessionStorage.removeItem('autovol_current_user');
            notifySubscribers('currentUser');
        },
        
        // ===== UTILITY METHODS =====
        
        getStats: function() {
            return {
                projects: state.projects.length,
                employees: state.employees.length,
                equipment: state.equipment.length,
                modules: Object.keys(state.unifiedModules).length,
                users: state.users.length
            };
        },
        
        // Export state for debugging
        export: function() {
            return MODA_UTILS.deepClone(state);
        },
        
        // Reset state (for testing)
        reset: function() {
            state = {
                projects: [],
                employees: [],
                departments: [],
                equipment: [],
                users: [],
                currentUser: null,
                unifiedModules: {},
                trashedProjects: [],
                trashedEmployees: []
            };
            notifySubscribers('*');
        }
    };
})();

// Initialize state on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MODA_STATE.init());
} else {
    MODA_STATE.init();
}
