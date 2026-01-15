// ============================================================================
// MODA PROJECT CONTEXT
// Centralized state management for projects to eliminate props drilling
// ============================================================================

const ProjectContext = React.createContext(null);

// Custom hook to use project context
function useProjects() {
    const context = React.useContext(ProjectContext);
    if (!context) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
}

// Project Provider Component
function ProjectProvider({ children, initialProjects = [] }) {
    const { useState, useEffect, useCallback, useMemo } = React;
    
    // Core project state
    const [projects, setProjects] = useState(initialProjects);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastSync, setLastSync] = useState(null);
    
    // Load projects from Supabase on mount
    useEffect(() => {
        let mounted = true;
        
        const loadProjects = async () => {
            // Check if Supabase is available
            if (window.MODA_SUPABASE_DATA?.isAvailable?.() && window.MODA_SUPABASE_DATA?.projects) {
                try {
                    console.log('[ProjectContext] Loading from Supabase...');
                    const supabaseProjects = await window.MODA_SUPABASE_DATA.projects.getAll();
                    
                    if (mounted && supabaseProjects) {
                        setProjects(supabaseProjects);
                        setLastSync(new Date());
                        // Cache to localStorage for offline fallback
                        localStorage.setItem('autovol_projects', JSON.stringify(supabaseProjects));
                    }
                } catch (err) {
                    console.error('[ProjectContext] Supabase load failed:', err);
                    setError(err.message);
                    // Fallback to localStorage
                    loadFromLocalStorage();
                }
            } else {
                console.log('[ProjectContext] Supabase not available, using localStorage');
                loadFromLocalStorage();
            }
            
            if (mounted) {
                setLoading(false);
            }
        };
        
        const loadFromLocalStorage = () => {
            try {
                const saved = localStorage.getItem('autovol_projects');
                if (saved && saved !== 'undefined' && saved !== 'null') {
                    setProjects(JSON.parse(saved));
                }
            } catch (e) {
                console.error('[ProjectContext] localStorage parse error:', e);
            }
        };
        
        // Small delay to ensure Supabase client is initialized
        const timer = setTimeout(loadProjects, 100);
        
        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, []);
    
    // Save to Supabase and localStorage when projects change
    useEffect(() => {
        if (loading) return;
        
        // Always save to localStorage as fallback
        localStorage.setItem('autovol_projects', JSON.stringify(projects));
        
        // Sync to Supabase if available (debounced)
        const syncTimer = setTimeout(async () => {
            if (window.MODA_SUPABASE_DATA?.isAvailable?.() && window.MODA_SUPABASE_DATA?.projects) {
                try {
                    // Note: Full sync would be handled by individual CRUD operations
                    // This is just for tracking sync status
                    setLastSync(new Date());
                } catch (err) {
                    console.error('[ProjectContext] Sync error:', err);
                }
            }
        }, 500);
        
        return () => clearTimeout(syncTimer);
    }, [projects, loading]);
    
    // CRUD Operations
    const addProject = useCallback(async (projectData) => {
        const newProject = {
            id: projectData.id || `proj-${Date.now()}`,
            name: projectData.name || 'New Project',
            status: projectData.status || 'Planning',
            modules: projectData.modules || [],
            created_at: new Date().toISOString(),
            ...projectData
        };
        
        // Optimistic update
        setProjects(prev => [...prev, newProject]);
        
        // Sync to Supabase
        if (window.MODA_SUPABASE_DATA?.projects?.create) {
            try {
                const created = await window.MODA_SUPABASE_DATA.projects.create(newProject);
                // Update with server-generated ID if different
                if (created?.id && created.id !== newProject.id) {
                    setProjects(prev => prev.map(p => 
                        p.id === newProject.id ? { ...p, id: created.id } : p
                    ));
                }
            } catch (err) {
                console.error('[ProjectContext] Create failed:', err);
                setError(err.message);
            }
        }
        
        // Log activity
        if (window.ActivityLog) {
            window.ActivityLog.logCreate('project', 'project', newProject.id, newProject.name, { status: newProject.status });
        }
        
        return newProject;
    }, []);
    
    const updateProject = useCallback(async (projectId, updates) => {
        // Optimistic update
        setProjects(prev => prev.map(p => 
            p.id === projectId ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
        ));
        
        // Sync to Supabase
        if (window.MODA_SUPABASE_DATA?.projects?.update) {
            try {
                await window.MODA_SUPABASE_DATA.projects.update(projectId, updates);
            } catch (err) {
                console.error('[ProjectContext] Update failed:', err);
                setError(err.message);
            }
        }
        
        // Log activity
        if (window.ActivityLog) {
            const project = projects.find(p => p.id === projectId);
            window.ActivityLog.logUpdate('project', 'project', projectId, project?.name, updates);
        }
    }, [projects]);
    
    const deleteProject = useCallback(async (projectId) => {
        const project = projects.find(p => p.id === projectId);
        
        // Optimistic update
        setProjects(prev => prev.filter(p => p.id !== projectId));
        
        // Sync to Supabase
        if (window.MODA_SUPABASE_DATA?.projects?.delete) {
            try {
                await window.MODA_SUPABASE_DATA.projects.delete(projectId);
            } catch (err) {
                console.error('[ProjectContext] Delete failed:', err);
                setError(err.message);
                // Rollback on failure
                if (project) {
                    setProjects(prev => [...prev, project]);
                }
            }
        }
        
        // Log activity
        if (window.ActivityLog && project) {
            window.ActivityLog.logDelete('project', 'project', projectId, project.name);
        }
    }, [projects]);
    
    // Module operations within projects
    const updateModuleProgress = useCallback((projectId, moduleId, stationId, progress) => {
        setProjects(prev => prev.map(project => {
            if (project.id !== projectId) return project;
            
            return {
                ...project,
                modules: (project.modules || []).map(module => {
                    if (module.id !== moduleId) return module;
                    
                    const updatedProgress = { ...module.stageProgress };
                    const wasComplete = updatedProgress[stationId] === 100;
                    updatedProgress[stationId] = progress;
                    
                    // Track completion timestamps
                    let stationCompletedAt = module.stationCompletedAt || {};
                    if (progress === 100 && !wasComplete) {
                        stationCompletedAt = { ...stationCompletedAt, [stationId]: Date.now() };
                    } else if (progress < 100 && wasComplete) {
                        stationCompletedAt = { ...stationCompletedAt };
                        delete stationCompletedAt[stationId];
                    }
                    
                    return { ...module, stageProgress: updatedProgress, stationCompletedAt };
                })
            };
        }));
    }, []);
    
    // Computed values
    const activeProjects = useMemo(() => 
        projects.filter(p => p.status === 'Active'),
    [projects]);
    
    const projectCount = useMemo(() => ({
        total: projects.length,
        active: projects.filter(p => p.status === 'Active').length,
        planning: projects.filter(p => p.status === 'Planning').length,
        complete: projects.filter(p => p.status === 'Complete').length
    }), [projects]);
    
    // Get project by ID
    const getProject = useCallback((projectId) => 
        projects.find(p => p.id === projectId),
    [projects]);
    
    // Context value
    const value = useMemo(() => ({
        // State
        projects,
        setProjects,
        loading,
        error,
        lastSync,
        
        // CRUD
        addProject,
        updateProject,
        deleteProject,
        
        // Module operations
        updateModuleProgress,
        
        // Computed
        activeProjects,
        projectCount,
        
        // Utilities
        getProject
    }), [
        projects, loading, error, lastSync,
        addProject, updateProject, deleteProject,
        updateModuleProgress, activeProjects, projectCount, getProject
    ]);
    
    return React.createElement(ProjectContext.Provider, { value }, children);
}

// Export to window for global access
window.ProjectContext = ProjectContext;
window.ProjectProvider = ProjectProvider;
window.useProjects = useProjects;
