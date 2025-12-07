// ============================================================================
// Projects Context - Manages project and module data
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../utils/api';

const ProjectsContext = createContext(null);

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
}

export function ProjectsProvider({ children }) {
  // Projects state
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('autovol_projects');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [trashedProjects, setTrashedProjects] = useState(() => {
    const saved = localStorage.getItem('autovol_trash_projects');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Sync to localStorage whenever projects change
  useEffect(() => {
    localStorage.setItem('autovol_projects', JSON.stringify(projects));
  }, [projects]);
  
  useEffect(() => {
    localStorage.setItem('autovol_trash_projects', JSON.stringify(trashedProjects));
  }, [trashedProjects]);
  
  // Initial load - try backend first, fall back to localStorage
  useEffect(() => {
    async function loadData() {
      try {
        const backendAvailable = await apiClient.checkBackend();
        if (backendAvailable) {
          const data = await apiClient.sync.exportFromBackend();
          if (data.projects && data.projects.length > 0) {
            setProjects(data.projects);
            setTrashedProjects(data.trashedProjects || []);
            console.log('[Projects] Loaded from backend:', data.projects.length);
          }
        }
      } catch (err) {
        console.warn('[Projects] Backend load failed, using localStorage:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);
  
  // Auto-sync to backend when projects change
  useEffect(() => {
    const syncTimeout = setTimeout(async () => {
      try {
        const backendAvailable = await apiClient.checkBackend();
        if (backendAvailable && projects.length > 0) {
          await apiClient.sync.importFromLocalStorage();
          console.log('[Projects] Auto-synced to backend');
        }
      } catch (err) {
        console.warn('[Projects] Auto-sync failed:', err.message);
      }
    }, 2000);
    
    return () => clearTimeout(syncTimeout);
  }, [projects]);
  
  // CRUD Operations
  const addProject = useCallback((project) => {
    const newProject = {
      ...project,
      id: project.id || `project-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      modules: project.modules || []
    };
    setProjects(prev => [...prev, newProject]);
    return newProject;
  }, []);
  
  const updateProject = useCallback((projectId, updates) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId 
        ? { ...p, ...updates, updatedAt: new Date().toISOString() }
        : p
    ));
  }, []);
  
  const deleteProject = useCallback((projectId) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      setTrashedProjects(prev => [...prev, { ...project, deletedAt: Date.now() }]);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    }
  }, [projects]);
  
  const restoreProject = useCallback((projectId) => {
    const project = trashedProjects.find(p => p.id === projectId);
    if (project) {
      const { deletedAt, ...restored } = project;
      setProjects(prev => [...prev, restored]);
      setTrashedProjects(prev => prev.filter(p => p.id !== projectId));
    }
  }, [trashedProjects]);
  
  // Module operations
  const updateModule = useCallback((projectId, moduleId, updates) => {
    setProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      return {
        ...project,
        updatedAt: new Date().toISOString(),
        modules: (project.modules || []).map(mod =>
          mod.id === moduleId ? { ...mod, ...updates } : mod
        )
      };
    }));
  }, []);
  
  const updateModuleProgress = useCallback((moduleId, projectId, stationId, progress) => {
    setProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      return {
        ...project,
        modules: (project.modules || []).map(mod => {
          if (mod.id !== moduleId) return mod;
          const now = Date.now();
          return {
            ...mod,
            stageProgress: {
              ...mod.stageProgress,
              [stationId]: progress
            },
            stationCompletedAt: progress === 100 ? {
              ...mod.stationCompletedAt,
              [stationId]: now
            } : mod.stationCompletedAt
          };
        })
      };
    }));
  }, []);
  
  // Computed values
  const activeProjects = projects.filter(p => p.status === 'Active');
  const allModules = projects.flatMap(p => 
    (p.modules || []).map(m => ({ ...m, projectId: p.id, projectName: p.name }))
  );
  
  const value = {
    // State
    projects,
    setProjects,
    trashedProjects,
    setTrashedProjects,
    loading,
    error,
    
    // Computed
    activeProjects,
    allModules,
    
    // Operations
    addProject,
    updateProject,
    deleteProject,
    restoreProject,
    updateModule,
    updateModuleProgress
  };
  
  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}
