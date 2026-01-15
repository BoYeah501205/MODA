# MODA Architecture Analysis Findings

> **Analysis Date:** January 2025  
> **Purpose:** Multi-user readiness assessment and architectural improvement recommendations  
> **Scope:** Component hierarchy, data flow, performance, security, reusability

---

## Executive Summary

MODA has grown into a substantial application with **50+ React components** and **~600 useState calls** across the codebase. The architecture shows signs of organic growth that now requires consolidation before multi-site deployment.

### Key Findings

| Area | Status | Priority |
|------|--------|----------|
| Component Size | 🔴 Critical | High - App.jsx and WeeklyBoard.jsx exceed 4,500 lines each |
| Performance Optimization | 🟡 Moderate | Medium - 176 useMemo/useCallback usages, but gaps in critical paths |
| State Management | 🟡 Moderate | Medium - Hybrid MODA_STATE + useState, needs consolidation |
| Security/Permissions | 🟢 Good | Low - Solid RBAC foundation with 14 roles defined |
| Data Layer | 🟡 Moderate | Medium - Dual localStorage/Supabase needs cleanup |
| Mobile Support | 🟢 Good | Low - Foundation complete, Phase 2 pending |

---

## 1. Component Hierarchy Analysis

### Top-Level Architecture

```
index.html
├── Feature Flags (js/config/featureFlags.js)
├── Core Layer (js/core/moda-core.js)
│   ├── MODA_CONSTANTS
│   ├── MODA_STORAGE (batched localStorage)
│   └── MODA_UTILS
├── State Manager (js/stateManager.js)
│   └── MODA_STATE (pub/sub pattern)
├── Data Layer (js/dataLayer.js)
│   └── Unified module management
├── Supabase Integration (9 files)
│   ├── supabase-client.js
│   ├── supabase-data.js
│   ├── supabase-onsite.js
│   ├── supabase-heat-map.js
│   ├── supabase-activity-log.js
│   ├── supabase-yard-map.js
│   ├── supabase-issues.js
│   ├── supabase-drawings.js
│   └── supabase-drawing-sheets.js
├── Auth System (js/components/auth/)
│   ├── AuthConstants.jsx
│   ├── AuthModule.jsx (useAuth hook)
│   ├── LoginPage.jsx
│   ├── RoleManager.jsx
│   ├── CustomPermissionsEditor.jsx
│   └── UserPermissionsManager.jsx
└── App.jsx (main dashboard)
    ├── Dashboard component
    │   ├── Navigation (tabs)
    │   ├── ProductionDashboard
    │   │   ├── WeeklyBoardTab
    │   │   ├── ScheduleSetupTab
    │   │   ├── StaggerConfigTab
    │   │   └── ReportsHub
    │   ├── ProjectsModule
    │   │   └── ProjectDetail
    │   ├── PeopleModule
    │   ├── QAModule
    │   │   ├── QADashboard
    │   │   ├── TravelersPanel
    │   │   ├── InspectionsPanel
    │   │   ├── DeviationsPanel
    │   │   └── TestingPanel
    │   ├── TransportModule
    │   │   └── YardMapV2
    │   ├── EquipmentModule
    │   ├── EngineeringModule
    │   ├── DrawingsModule
    │   │   ├── SheetBrowser
    │   │   └── ModuleDrawingsViewer
    │   ├── OnSiteTab
    │   ├── AutomationModule
    │   ├── TrackerModule
    │   └── TrainingMatrix
    └── Modals (inline in App.jsx)
        ├── ModuleDetailModal
        ├── ReportIssueModal
        ├── NewProjectModal
        └── EditProjectModal
```

### Component Size Analysis

| Component | Lines | useState Calls | Recommendation |
|-----------|-------|----------------|----------------|
| `App.jsx` | ~4,630 | 89 | 🔴 **Split into 8-10 smaller components** |
| `WeeklyBoard.jsx` | ~4,500 | 42 | 🔴 **Split into 5-6 smaller components** |
| `DrawingsModule.jsx` | ~2,000 | 31 | 🟡 Consider splitting |
| `EquipmentModule.jsx` | ~1,800 | 28 | 🟡 Consider splitting |
| `PeopleModule.jsx` | ~1,500 | 25 | 🟡 Consider splitting |
| `TransportModule.jsx` | ~1,400 | 29 | 🟡 Consider splitting |
| `OnSiteTab.jsx` | ~1,200 | 42 | 🟡 Consider splitting |

### Embedded Components in App.jsx (Should Be Extracted)

The following components are defined inside `App.jsx` and should be extracted:

1. **`ProductionDashboard`** (~500 lines) - Production floor management
2. **`ReportIssueModal`** (~260 lines) - Issue submission form
3. **`ModuleDetailModal`** (~400 lines) - Module detail view/edit
4. **`NewProjectModal`** (~200 lines) - Project creation form
5. **`EditProjectModal`** (~300 lines) - Project editing form
6. **`StaggerConfigTab`** (~200 lines) - Station stagger configuration
7. **`ProjectDetail`** (~600 lines) - Project detail view with modules
8. **`useProductionWeeks`** (~250 lines) - Custom hook for week management

---

## 2. Data Flow Patterns

### Current State Management Approaches

```
┌─────────────────────────────────────────────────────────────────┐
│                     STATE MANAGEMENT LAYERS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │ MODA_STATE   │    │  useState    │    │  Supabase    │       │
│  │ (pub/sub)    │    │  (local)     │    │  (remote)    │       │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              localStorage (fallback/cache)            │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Issues

1. **Dual State Sources**: `MODA_STATE` and component `useState` operate independently
   - `MODA_STATE` manages: projects, employees, equipment, users, unifiedModules
   - Component `useState` manages: UI state, local edits, modal visibility
   - **Problem**: No clear boundary between global and local state

2. **Props Drilling**: Deep prop passing through component hierarchy
   - `projects` and `setProjects` passed through 4+ levels
   - `auth` object passed to nearly every component
   - **Solution**: Consider React Context for auth and projects

3. **Window Global Pattern**: Components exposed via `window.*`
   - 29 `window.*` assignments in App.jsx alone
   - Used for cross-component communication
   - **Problem**: Bypasses React's data flow, makes testing difficult

### Recommended State Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    RECOMMENDED ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              React Context Providers                  │       │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │       │
│  │  │ AuthContext │  │ProjectContext│  │ UIContext   │   │       │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │       │
│  └──────────────────────────────────────────────────────┘       │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────┐       │
│  │           Supabase (Source of Truth)                  │       │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │       │
│  │  │  Projects   │  │  Modules    │  │  Employees  │   │       │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │       │
│  └──────────────────────────────────────────────────────┘       │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────┐       │
│  │         localStorage (Offline Cache Only)             │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Performance Bottleneck Analysis

### Memoization Usage

| Pattern | Count | Assessment |
|---------|-------|------------|
| `useMemo` | 98 | Good coverage in reports |
| `useCallback` | 52 | Moderate - more needed in lists |
| `React.memo` | 26 | 🔴 **Low - critical components not memoized** |

### Components Missing React.memo

These frequently-rendered components should be wrapped:

1. **Module cards** in WeeklyBoard - rendered 20+ times per view
2. **Employee rows** in PeopleModule - rendered per employee
3. **Project cards** in ProjectsModule - rendered per project
4. **Stage progress bars** - rendered per module per stage

### Large List Rendering Issues

| Component | List Size | Virtualization | Status |
|-----------|-----------|----------------|--------|
| WeeklyBoard module grid | 20-100 modules | ❌ None | 🔴 Needs virtualization |
| PeopleModule employee list | 50-200 employees | ❌ None | 🟡 Consider virtualization |
| ProjectDetail module list | 50-150 modules | ❌ None | 🟡 Consider virtualization |
| ActivityLogViewer | 100+ entries | ❌ None | 🟡 Consider virtualization |

### localStorage Blocking Operations

```javascript
// Current pattern in MODA_STORAGE (synchronous)
set: function(key, value) {
    localStorage.setItem(key, JSON.stringify(value));  // BLOCKING
}

// Batched pattern exists but not universally used
setBatched: function(key, value) {
    // Uses debounce - BETTER
}
```

**Recommendation**: Ensure all writes use `setBatched`, consider Web Workers for large data.

---

## 4. Component Reusability Analysis

### Duplicated UI Patterns

| Pattern | Occurrences | Recommendation |
|---------|-------------|----------------|
| Modal dialogs | 15+ implementations | Create `<Modal>` component |
| Status badges | 10+ implementations | Create `<StatusBadge>` component |
| Progress bars | 8+ implementations | Create `<ProgressBar>` component |
| Difficulty badges | 6+ implementations | Create `<DifficultyBadge>` component |
| Data tables | 12+ implementations | Create `<DataTable>` component |
| Form inputs | 20+ implementations | Create form component library |
| Dropdown menus | 8+ implementations | Create `<Dropdown>` component |

### Shared Logic Candidates for Custom Hooks

1. **`useSupabaseQuery`** - Standardize Supabase data fetching with loading/error states
2. **`useLocalStorageSync`** - Unified localStorage with Supabase sync
3. **`useModuleFilter`** - Module filtering/sorting logic (duplicated in 4+ components)
4. **`useProjectModules`** - Project module loading and caching
5. **`usePermissions`** - Permission checking (currently uses global functions)

### Existing Custom Hooks (Good Foundation)

- `useMobile.js` - Mobile detection (6 hooks)
- `useUrlNavigation.js` - URL-based navigation
- `useSupabaseOnSite.js` - On-site data management
- `useActivityLogger.js` - Activity logging
- `useProductionWeeks` - Production week management (in App.jsx, should extract)
- `useWeeklySchedule` - Weekly schedule management (in WeeklyBoard.jsx)

---

## 5. Security & Permissions Analysis

### Current RBAC Implementation

**Strengths:**
- 14 well-defined roles in `dashboardRoles.js`
- Tab-level permissions with `editableTabs` array
- Capability-based permissions (canEdit, canDelete, canCreate, etc.)
- Protected user support (trevor@autovol.com)
- Custom per-user permission overrides via Supabase

**Role Hierarchy:**
```
admin (full access)
├── production_management (production, projects, schedule)
├── production_supervisor (weekly board only)
├── qa_inspector (QA records)
├── transportation (yard, shipping)
├── supply_chain (inventory, materials)
├── preconstruction (project setup)
├── onsite (field operations)
├── engineering (documentation, issues)
├── maintenance (equipment)
├── executive (read-only overview)
├── department-supervisor (department view)
├── coordinator (cross-department)
├── employee (basic view)
└── no-access (disabled)
```

### Security Gaps

1. **Client-Side Permission Checks Only**
   - Permissions checked in React components
   - No server-side enforcement in Supabase RLS
   - **Risk**: Malicious users could bypass UI restrictions

2. **localStorage Data Exposure**
   - Sensitive data stored unencrypted:
     - `autovol_projects` (module specs, BLM data)
     - `autovol_employees` (personal info)
     - `autovol_users` (email, roles)
   - **Risk**: Data accessible via browser dev tools

3. **Missing Supabase RLS Policies**
   - Need department-level row isolation
   - Need project-level access control
   - Need audit logging at database level

### Recommended RLS Policies

```sql
-- Example: Projects table RLS
CREATE POLICY "Users can view projects in their department"
ON projects FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM project_access WHERE project_id = projects.id
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND (dashboard_role = 'admin' OR is_protected = true)
  )
);

-- Example: Modules table RLS  
CREATE POLICY "Users can edit modules they have access to"
ON modules FOR UPDATE
USING (
  project_id IN (
    SELECT project_id FROM project_access 
    WHERE user_id = auth.uid() AND can_edit = true
  )
);
```

---

## 6. Tight Coupling Issues

### High-Coupling Components

1. **App.jsx ↔ WeeklyBoard.jsx**
   - WeeklyBoard depends on 15+ props from App
   - Shares state management patterns
   - **Solution**: Extract shared state to context

2. **ProductionDashboard ↔ useProductionWeeks**
   - Hook defined in App.jsx, used in ProductionDashboard
   - **Solution**: Extract hook to separate file

3. **Window Global Dependencies**
   - Components check `window.WeeklyBoardComponents`
   - Components check `window.MODA_SUPABASE`
   - **Solution**: Use React Context or module imports

### Circular Dependency Risks

```
App.jsx
  └── imports WeeklyBoard.jsx
        └── uses window.WeeklyBoardComponents (set by WeeklyBoard.jsx)
              └── referenced by App.jsx
```

**Solution**: Use proper ES module imports or React Context.

---

## 7. Recommended Refactoring Priority

### Phase 1: Critical (Week 1-2)

1. **Extract components from App.jsx**
   - Create `js/components/production/ProductionDashboard.jsx`
   - Create `js/components/projects/ProjectDetail.jsx`
   - Create `js/components/modals/ModuleDetailModal.jsx`
   - Create `js/components/modals/ReportIssueModal.jsx`
   - Create `js/hooks/useProductionWeeks.js`

2. **Add React.memo to list items**
   - WeeklyBoard module cards
   - PeopleModule employee rows
   - ProjectsModule project cards

### Phase 2: Important (Week 3-4)

3. **Create shared component library**
   - `js/components/ui/Modal.jsx`
   - `js/components/ui/StatusBadge.jsx`
   - `js/components/ui/ProgressBar.jsx`
   - `js/components/ui/DataTable.jsx`

4. **Consolidate state management**
   - Create `js/contexts/ProjectContext.jsx`
   - Create `js/contexts/AuthContext.jsx`
   - Migrate from window globals to context

### Phase 3: Optimization (Week 5-6)

5. **Add list virtualization**
   - Install `react-window` or `react-virtualized`
   - Apply to WeeklyBoard, PeopleModule, ActivityLog

6. **Implement Supabase RLS**
   - Create migration scripts
   - Add department-level isolation
   - Add audit logging

### Phase 4: Polish (Week 7-8)

7. **Split remaining large components**
   - WeeklyBoard.jsx → 5-6 smaller components
   - DrawingsModule.jsx → 3-4 smaller components

8. **Add comprehensive error boundaries**
   - Wrap major sections
   - Add fallback UI

---

## 8. Multi-User Readiness Checklist

| Requirement | Current Status | Action Needed |
|-------------|----------------|---------------|
| User authentication | ✅ Complete | None |
| Role-based access | ✅ Complete | Add RLS enforcement |
| Department isolation | ❌ Missing | Implement in Supabase |
| Real-time sync | 🟡 Partial | Enable Supabase Realtime |
| Offline support | ✅ Complete | Improve sync conflict resolution |
| Audit logging | 🟡 Partial | Extend to all data changes |
| Performance at scale | 🟡 Partial | Add virtualization, memoization |
| Mobile support | ✅ Foundation | Complete Phase 2 |

---

## Appendix: File Size Reference

```
Component Files by Size:
─────────────────────────
App.jsx                    297,545 bytes  (~4,630 lines)
WeeklyBoard.jsx            288,194 bytes  (~4,500 lines)
DrawingsModule.jsx         130,810 bytes  (~2,000 lines)
EquipmentModule.jsx        120,069 bytes  (~1,800 lines)
PeopleModule.jsx            94,658 bytes  (~1,500 lines)
TransportModule.jsx         90,560 bytes  (~1,400 lines)
ProjectsModule.jsx          57,412 bytes  (~900 lines)
ProjectSequencing.jsx       46,679 bytes  (~730 lines)
YardMap.jsx                 44,563 bytes  (~700 lines)
IssueDetailModal.jsx        42,703 bytes  (~670 lines)
RFIManager.jsx              44,209 bytes  (~690 lines)
ExecutiveBoard.jsx          36,229 bytes  (~570 lines)
TrainingMatrix.jsx          35,534 bytes  (~550 lines)
TrackerModule.jsx           32,850 bytes  (~510 lines)
EngineeringModule.jsx       33,067 bytes  (~520 lines)
```

---

## Next Steps

1. Review this document with stakeholders
2. Prioritize refactoring phases based on timeline
3. Create detailed task breakdown for Phase 1
4. Set up component extraction branch
5. Begin incremental refactoring with test coverage
