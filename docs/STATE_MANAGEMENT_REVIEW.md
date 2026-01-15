# MODA State Management Review

> **Analysis Date:** January 2025  
> **Purpose:** Evaluate current state patterns and recommend multi-user architecture

---

## Executive Summary

MODA uses a **hybrid state management approach** with three distinct layers:
1. **MODA_STATE** - Custom pub/sub for global data (projects, employees, modules)
2. **React useState** - Component-local state (610 usages across 50 files)
3. **Supabase** - Remote persistence with real-time sync

This hybrid approach has grown organically and needs consolidation for multi-user deployment.

---

## 1. Current State Architecture

### Layer 1: MODA_STATE (Global Pub/Sub)

**Location:** `js/stateManager.js`

```javascript
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
```

**Usage:** Only 17 references across 2 files (dataLayer.js, stateManager.js)

**Problem:** MODA_STATE exists but is **underutilized**. Most components use local useState instead.

### Layer 2: React useState (Component Local)

**Distribution across components:**

| Component | useState Calls | State Complexity |
|-----------|----------------|------------------|
| App.jsx | 89 | 🔴 Very High |
| WeeklyBoard.jsx | 42 | 🔴 High |
| OnSiteTab.jsx | 42 | 🔴 High |
| DrawingsModule.jsx | 31 | 🟡 Medium |
| TransportModule.jsx | 29 | 🟡 Medium |
| YardMapV2.jsx | 29 | 🟡 Medium |
| EquipmentModule.jsx | 28 | 🟡 Medium |
| PeopleModule.jsx | 25 | 🟡 Medium |

**Total:** 610 useState calls across 50 files

### Layer 3: Supabase (Remote Persistence)

**Integration files:**
- `supabase-client.js` - Connection and auth
- `supabase-data.js` - Projects, modules, employees CRUD
- `supabase-onsite.js` - On-site data
- `supabase-heat-map.js` - Heat map configuration
- `supabase-activity-log.js` - Activity logging
- `supabase-yard-map.js` - Yard positions
- `supabase-issues.js` - Engineering issues
- `supabase-drawings.js` - Drawing files
- `supabase-drawing-sheets.js` - Drawing sheets

**Pattern:** Each file exposes APIs via `window.MODA_SUPABASE_DATA.*`

---

## 2. Data Flow Analysis

### Current Flow (Problematic)

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT DATA FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Action                                                     │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────┐                                               │
│  │  Component   │ ─── useState ───┐                             │
│  │  (e.g. App)  │                 │                             │
│  └──────────────┘                 │                             │
│       │                           │                             │
│       │ props                     │                             │
│       ▼                           ▼                             │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │ Child Comp   │         │ localStorage │ ◄── Fallback        │
│  └──────────────┘         └──────────────┘                      │
│       │                           │                             │
│       │ props                     │                             │
│       ▼                           ▼                             │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │ Grandchild   │         │   Supabase   │ ◄── Source of Truth │
│  └──────────────┘         └──────────────┘                      │
│                                                                  │
│  PROBLEMS:                                                       │
│  • Props drilled 4+ levels deep                                 │
│  • State duplicated in localStorage AND Supabase                │
│  • No single source of truth in React                           │
│  • Components don't know when remote data changes               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Props Drilling Examples

**projects + setProjects passed through:**
```
App.jsx
  └── Dashboard
        └── ProductionDashboard
              └── WeeklyBoardTab
                    └── ModuleCard (needs project context)
```

**auth object passed through:**
```
App.jsx
  └── Dashboard (auth)
        └── Every single tab component (auth)
              └── Every modal (auth)
```

---

## 3. State Categories

### Global State (Should be in Context)

| State | Current Location | Consumers | Recommendation |
|-------|------------------|-----------|----------------|
| `projects` | App.jsx useState | 15+ components | ProjectContext |
| `employees` | App.jsx useState | 8+ components | EmployeeContext |
| `auth` | useAuth hook | All components | AuthContext (exists) |
| `currentUser` | MODA_STATE | 10+ components | AuthContext |
| `productionStages` | constants.js | 12+ components | Keep as constant |
| `staggerConfig` | useProductionWeeks | 5+ components | ProductionContext |

### Module-Local State (Keep as useState)

| State | Component | Purpose |
|-------|-----------|---------|
| `selectedTab` | Dashboard | UI navigation |
| `searchTerm` | Various | Filter input |
| `isModalOpen` | Various | Modal visibility |
| `formData` | Various | Form inputs |
| `sortField` | Tables | Sort state |

### Derived State (Should use useMemo)

| Computation | Current | Recommendation |
|-------------|---------|----------------|
| Filtered modules | Inline in render | useMemo |
| Active projects | Inline in render | useMemo |
| Department stats | Inline in render | useMemo |
| Week calculations | Inline in render | useMemo |

---

## 4. Recommended Architecture

### Option A: Enhanced Context (Recommended)

**Why:** Minimal migration effort, works with existing patterns, no new dependencies.

```
┌─────────────────────────────────────────────────────────────────┐
│                   RECOMMENDED ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                   Context Providers                   │       │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │       │
│  │  │ AuthContext │  │ProjectContext│  │ UIContext   │   │       │
│  │  │ (exists)    │  │ (new)       │  │ (new)       │   │       │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │       │
│  └──────────────────────────────────────────────────────┘       │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              Custom Hooks Layer                       │       │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │       │
│  │  │useProjects  │  │useEmployees │  │useModules   │   │       │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │       │
│  └──────────────────────────────────────────────────────┘       │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────┐       │
│  │           Supabase (Source of Truth)                  │       │
│  │  • Real-time subscriptions                            │       │
│  │  • Optimistic updates                                 │       │
│  │  • Offline queue                                      │       │
│  └──────────────────────────────────────────────────────┘       │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────┐       │
│  │         localStorage (Offline Cache Only)             │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation: ProjectContext

```jsx
// js/contexts/ProjectContext.jsx
const ProjectContext = React.createContext(null);

function ProjectProvider({ children }) {
    const [projects, setProjects] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    
    // Load from Supabase on mount
    React.useEffect(() => {
        const loadProjects = async () => {
            try {
                if (window.MODA_SUPABASE_DATA?.isAvailable?.()) {
                    const data = await window.MODA_SUPABASE_DATA.projects.getAll();
                    setProjects(data);
                    // Cache to localStorage for offline
                    localStorage.setItem('autovol_projects_cache', JSON.stringify(data));
                } else {
                    // Fallback to cache
                    const cached = localStorage.getItem('autovol_projects_cache');
                    if (cached) setProjects(JSON.parse(cached));
                }
            } catch (err) {
                setError(err);
                // Fallback to cache on error
                const cached = localStorage.getItem('autovol_projects_cache');
                if (cached) setProjects(JSON.parse(cached));
            } finally {
                setLoading(false);
            }
        };
        
        loadProjects();
        
        // Subscribe to real-time updates
        const unsubscribe = window.MODA_SUPABASE_DATA?.projects?.onSnapshot?.(
            (updatedProjects) => setProjects(updatedProjects)
        );
        
        return () => unsubscribe?.();
    }, []);
    
    // CRUD operations with optimistic updates
    const addProject = React.useCallback(async (projectData) => {
        const tempId = `temp-${Date.now()}`;
        const optimisticProject = { ...projectData, id: tempId };
        
        // Optimistic update
        setProjects(prev => [...prev, optimisticProject]);
        
        try {
            const created = await window.MODA_SUPABASE_DATA.projects.create(projectData);
            // Replace temp with real
            setProjects(prev => prev.map(p => p.id === tempId ? created : p));
            return created;
        } catch (err) {
            // Rollback
            setProjects(prev => prev.filter(p => p.id !== tempId));
            throw err;
        }
    }, []);
    
    const updateProject = React.useCallback(async (projectId, updates) => {
        const original = projects.find(p => p.id === projectId);
        
        // Optimistic update
        setProjects(prev => prev.map(p => 
            p.id === projectId ? { ...p, ...updates } : p
        ));
        
        try {
            await window.MODA_SUPABASE_DATA.projects.update(projectId, updates);
        } catch (err) {
            // Rollback
            setProjects(prev => prev.map(p => 
                p.id === projectId ? original : p
            ));
            throw err;
        }
    }, [projects]);
    
    const deleteProject = React.useCallback(async (projectId) => {
        const original = projects.find(p => p.id === projectId);
        
        // Optimistic update
        setProjects(prev => prev.filter(p => p.id !== projectId));
        
        try {
            await window.MODA_SUPABASE_DATA.projects.delete(projectId);
        } catch (err) {
            // Rollback
            setProjects(prev => [...prev, original]);
            throw err;
        }
    }, [projects]);
    
    // Derived data
    const activeProjects = React.useMemo(() => 
        projects.filter(p => p.status === 'Active'),
        [projects]
    );
    
    const value = React.useMemo(() => ({
        projects,
        activeProjects,
        loading,
        error,
        addProject,
        updateProject,
        deleteProject
    }), [projects, activeProjects, loading, error, addProject, updateProject, deleteProject]);
    
    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
}

// Hook for consuming
function useProjects() {
    const context = React.useContext(ProjectContext);
    if (!context) {
        throw new Error('useProjects must be used within ProjectProvider');
    }
    return context;
}

window.ProjectContext = ProjectContext;
window.ProjectProvider = ProjectProvider;
window.useProjects = useProjects;
```

### Option B: Zustand (Alternative)

**Why:** Simpler API than Context, built-in devtools, works outside React.

```javascript
// Would require adding zustand dependency
import create from 'zustand';

const useProjectStore = create((set, get) => ({
    projects: [],
    loading: true,
    
    loadProjects: async () => {
        const data = await window.MODA_SUPABASE_DATA.projects.getAll();
        set({ projects: data, loading: false });
    },
    
    addProject: async (projectData) => {
        const created = await window.MODA_SUPABASE_DATA.projects.create(projectData);
        set(state => ({ projects: [...state.projects, created] }));
    },
    
    // Selectors
    getActiveProjects: () => get().projects.filter(p => p.status === 'Active')
}));
```

**Trade-off:** Adds dependency, but simpler code. Not recommended for MODA since Context works fine.

---

## 5. Migration Plan

### Phase 1: Create Contexts (Week 1)

1. Create `js/contexts/` directory
2. Implement `AuthContext.jsx` (wrap existing useAuth)
3. Implement `ProjectContext.jsx`
4. Implement `UIContext.jsx` (theme, navigation state)

### Phase 2: Wrap App (Week 1)

```jsx
// Updated App structure
function App() {
    return (
        <AuthProvider>
            <ProjectProvider>
                <UIProvider>
                    <Dashboard />
                </UIProvider>
            </ProjectProvider>
        </AuthProvider>
    );
}
```

### Phase 3: Migrate Components (Week 2-3)

**Priority order:**
1. App.jsx - Remove projects/setProjects props
2. ProductionDashboard - Use useProjects()
3. WeeklyBoard - Use useProjects()
4. ProjectsModule - Use useProjects()
5. TrackerModule - Use useProjects()

### Phase 4: Remove MODA_STATE (Week 4)

Once Context is fully adopted:
1. Remove `js/stateManager.js`
2. Update `js/dataLayer.js` to use Context
3. Clean up localStorage fallback patterns

---

## 6. Re-render Optimization

### Current Problem Areas

| Component | Re-render Trigger | Impact |
|-----------|-------------------|--------|
| Dashboard | Any project change | 🔴 High - re-renders all tabs |
| WeeklyBoard | Any schedule change | 🔴 High - re-renders all modules |
| PeopleModule | Any employee change | 🟡 Medium |

### Solutions

1. **Split Context by update frequency**
```jsx
// Separate contexts for data vs. actions
const ProjectDataContext = React.createContext(null);  // projects array
const ProjectActionsContext = React.createContext(null);  // CRUD functions

// Components that only need actions don't re-render on data changes
```

2. **Use React.memo on consumers**
```jsx
const ProjectCard = React.memo(({ project }) => {
    // Only re-renders when this specific project changes
});
```

3. **Selector pattern**
```jsx
// Only subscribe to specific project
function useProject(projectId) {
    const { projects } = useProjects();
    return React.useMemo(
        () => projects.find(p => p.id === projectId),
        [projects, projectId]
    );
}
```

---

## 7. Offline Support Strategy

### Current: Dual Write

```javascript
// Current pattern - writes to both
setProjects(newProjects);
localStorage.setItem('autovol_projects', JSON.stringify(newProjects));
await supabase.from('projects').upsert(newProjects);
```

### Recommended: Queue-Based Sync

```javascript
// Offline queue for pending changes
const offlineQueue = {
    pending: [],
    
    add(operation) {
        this.pending.push({
            id: Date.now(),
            ...operation,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('moda_offline_queue', JSON.stringify(this.pending));
    },
    
    async flush() {
        if (!navigator.onLine) return;
        
        for (const op of this.pending) {
            try {
                await this.execute(op);
                this.pending = this.pending.filter(p => p.id !== op.id);
            } catch (err) {
                console.error('Sync failed:', op, err);
                break; // Stop on first failure to maintain order
            }
        }
        
        localStorage.setItem('moda_offline_queue', JSON.stringify(this.pending));
    }
};

// Listen for online event
window.addEventListener('online', () => offlineQueue.flush());
```

---

## 8. Summary Recommendations

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 1 | Create ProjectContext | 2 days | High - eliminates props drilling |
| 2 | Create AuthContext wrapper | 1 day | Medium - cleaner auth access |
| 3 | Add React.memo to list items | 1 day | High - reduces re-renders |
| 4 | Implement offline queue | 2 days | Medium - better offline UX |
| 5 | Remove MODA_STATE | 1 day | Low - cleanup |
| 6 | Add real-time subscriptions | 2 days | High - multi-user sync |

### Do NOT Do

- ❌ Add Redux (overkill for this app)
- ❌ Migrate to TypeScript simultaneously (separate effort)
- ❌ Rewrite all components at once (incremental migration)
