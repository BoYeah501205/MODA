// useFirestoreSync Hook
// Syncs React state with Firestore in real-time
// Falls back to localStorage if Firebase unavailable

(function() {
    'use strict';

    if (!window.React) {
        console.error('[useFirestoreSync] React not loaded');
        return;
    }

    const { useState, useEffect, useCallback, useRef } = React;

    // ============================================================================
    // PROJECTS SYNC HOOK
    // ============================================================================

    function useProjects() {
        const [projects, setProjects] = useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);
        const [synced, setSynced] = useState(false);
        const unsubscribeRef = useRef(null);

        // Check if Firestore is available
        const isFirestoreAvailable = window.MODA_FIREBASE_DATA?.isAvailable();

        // Load projects on mount
        useEffect(() => {
            loadProjects();
            return () => {
                if (unsubscribeRef.current) {
                    unsubscribeRef.current();
                }
            };
        }, []);

        const loadProjects = async () => {
            setLoading(true);
            setError(null);

            try {
                if (isFirestoreAvailable) {
                    // Load from Firestore with real-time sync
                    console.log('[Projects] Loading from Firestore...');
                    
                    unsubscribeRef.current = window.MODA_FIREBASE_DATA.projects.onSnapshot((firestoreProjects) => {
                        console.log('[Projects] Firestore sync:', firestoreProjects.length, 'projects');
                        setProjects(firestoreProjects);
                        setSynced(true);
                        setLoading(false);
                    });
                } else {
                    // Fallback to localStorage
                    console.log('[Projects] Firebase unavailable, using localStorage');
                    try {
                        const saved = localStorage.getItem('autovol_projects');
                        const localProjects = (saved && saved !== 'undefined' && saved !== 'null') ? JSON.parse(saved) : [];
                        setProjects(localProjects);
                    } catch (e) {
                        console.error('[Projects] Error parsing localStorage:', e);
                        setProjects([]);
                    }
                    setSynced(false);
                    setLoading(false);
                }
            } catch (err) {
                console.error('[Projects] Load error:', err);
                setError(err.message);
                // Fallback to localStorage on error
                try {
                    const saved = localStorage.getItem('autovol_projects');
                    const localProjects = (saved && saved !== 'undefined' && saved !== 'null') ? JSON.parse(saved) : [];
                    setProjects(localProjects);
                } catch (e) {
                    console.error('[Projects] Error parsing localStorage fallback:', e);
                    setProjects([]);
                }
                setSynced(false);
                setLoading(false);
            }
        };

        // Add project
        const addProject = useCallback(async (projectData) => {
            try {
                if (isFirestoreAvailable) {
                    const newProject = await window.MODA_FIREBASE_DATA.projects.create(projectData);
                    console.log('[Projects] Created in Firestore:', newProject.id);
                    // Real-time listener will update state automatically
                    return newProject;
                } else {
                    // localStorage fallback
                    const newProject = { ...projectData, id: `project-${Date.now()}` };
                    const updated = [...projects, newProject];
                    setProjects(updated);
                    localStorage.setItem('autovol_projects', JSON.stringify(updated));
                    return newProject;
                }
            } catch (err) {
                console.error('[Projects] Add error:', err);
                throw err;
            }
        }, [projects, isFirestoreAvailable]);

        // Update project
        const updateProject = useCallback(async (projectId, updates) => {
            try {
                if (isFirestoreAvailable) {
                    await window.MODA_FIREBASE_DATA.projects.update(projectId, updates);
                    console.log('[Projects] Updated in Firestore:', projectId);
                    // Real-time listener will update state automatically
                } else {
                    // localStorage fallback
                    const updated = projects.map(p => p.id === projectId ? { ...p, ...updates } : p);
                    setProjects(updated);
                    localStorage.setItem('autovol_projects', JSON.stringify(updated));
                }
            } catch (err) {
                console.error('[Projects] Update error:', err);
                throw err;
            }
        }, [projects, isFirestoreAvailable]);

        // Delete project
        const deleteProject = useCallback(async (projectId) => {
            try {
                if (isFirestoreAvailable) {
                    await window.MODA_FIREBASE_DATA.projects.delete(projectId);
                    console.log('[Projects] Deleted from Firestore:', projectId);
                    // Real-time listener will update state automatically
                } else {
                    // localStorage fallback
                    const updated = projects.filter(p => p.id !== projectId);
                    setProjects(updated);
                    localStorage.setItem('autovol_projects', JSON.stringify(updated));
                }
            } catch (err) {
                console.error('[Projects] Delete error:', err);
                throw err;
            }
        }, [projects, isFirestoreAvailable]);

        return {
            projects,
            setProjects, // For backward compatibility with existing code
            addProject,
            updateProject,
            deleteProject,
            loading,
            error,
            synced // true if synced with Firestore, false if using localStorage
        };
    }

    // ============================================================================
    // EMPLOYEES SYNC HOOK
    // ============================================================================

    function useEmployees() {
        const [employees, setEmployees] = useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);
        const [synced, setSynced] = useState(false);
        const unsubscribeRef = useRef(null);

        const isFirestoreAvailable = window.MODA_FIREBASE_DATA?.isAvailable();

        useEffect(() => {
            loadEmployees();
            return () => {
                if (unsubscribeRef.current) {
                    unsubscribeRef.current();
                }
            };
        }, []);

        const loadEmployees = async () => {
            setLoading(true);
            setError(null);

            try {
                if (isFirestoreAvailable) {
                    console.log('[Employees] Loading from Firestore...');
                    
                    unsubscribeRef.current = window.MODA_FIREBASE_DATA.employees.onSnapshot((firestoreEmployees) => {
                        console.log('[Employees] Firestore sync:', firestoreEmployees.length, 'employees');
                        setEmployees(firestoreEmployees);
                        setSynced(true);
                        setLoading(false);
                    });
                } else {
                    console.log('[Employees] Firebase unavailable, using localStorage');
                    try {
                        const saved = localStorage.getItem('autovol_employees');
                        const localEmployees = (saved && saved !== 'undefined' && saved !== 'null') ? JSON.parse(saved) : [];
                        setEmployees(localEmployees);
                    } catch (e) {
                        console.error('[Employees] Error parsing localStorage:', e);
                        setEmployees([]);
                    }
                    setSynced(false);
                    setLoading(false);
                }
            } catch (err) {
                console.error('[Employees] Load error:', err);
                setError(err.message);
                try {
                    const saved = localStorage.getItem('autovol_employees');
                    const localEmployees = (saved && saved !== 'undefined' && saved !== 'null') ? JSON.parse(saved) : [];
                    setEmployees(localEmployees);
                } catch (e) {
                    console.error('[Employees] Error parsing localStorage fallback:', e);
                    setEmployees([]);
                }
                setSynced(false);
                setLoading(false);
            }
        };

        const addEmployee = useCallback(async (employeeData) => {
            try {
                if (isFirestoreAvailable) {
                    const newEmployee = await window.MODA_FIREBASE_DATA.employees.create(employeeData);
                    console.log('[Employees] Created in Firestore:', newEmployee.id);
                    return newEmployee;
                } else {
                    const newEmployee = { ...employeeData, id: `employee-${Date.now()}` };
                    const updated = [...employees, newEmployee];
                    setEmployees(updated);
                    localStorage.setItem('autovol_employees', JSON.stringify(updated));
                    return newEmployee;
                }
            } catch (err) {
                console.error('[Employees] Add error:', err);
                throw err;
            }
        }, [employees, isFirestoreAvailable]);

        const updateEmployee = useCallback(async (employeeId, updates) => {
            try {
                if (isFirestoreAvailable) {
                    await window.MODA_FIREBASE_DATA.employees.update(employeeId, updates);
                    console.log('[Employees] Updated in Firestore:', employeeId);
                } else {
                    const updated = employees.map(e => e.id === employeeId ? { ...e, ...updates } : e);
                    setEmployees(updated);
                    localStorage.setItem('autovol_employees', JSON.stringify(updated));
                }
            } catch (err) {
                console.error('[Employees] Update error:', err);
                throw err;
            }
        }, [employees, isFirestoreAvailable]);

        const deleteEmployee = useCallback(async (employeeId) => {
            try {
                if (isFirestoreAvailable) {
                    await window.MODA_FIREBASE_DATA.employees.delete(employeeId);
                    console.log('[Employees] Deleted from Firestore:', employeeId);
                } else {
                    const updated = employees.filter(e => e.id !== employeeId);
                    setEmployees(updated);
                    localStorage.setItem('autovol_employees', JSON.stringify(updated));
                }
            } catch (err) {
                console.error('[Employees] Delete error:', err);
                throw err;
            }
        }, [employees, isFirestoreAvailable]);

        return {
            employees,
            setEmployees, // For backward compatibility
            addEmployee,
            updateEmployee,
            deleteEmployee,
            loading,
            error,
            synced
        };
    }

    // ============================================================================
    // EXPORT HOOKS
    // ============================================================================

    window.FirestoreHooks = {
        useProjects,
        useEmployees
    };

    console.log('[useFirestoreSync] Hooks initialized');
})();
