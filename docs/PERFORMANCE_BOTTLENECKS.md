# MODA Performance Bottleneck Analysis

> **Analysis Date:** January 2025  
> **Focus:** React rendering optimization, list virtualization, blocking operations

---

## Executive Summary

| Category | Issues Found | Priority |
|----------|--------------|----------|
| Missing React.memo | 20+ list item components | High |
| Large list rendering | 5 components need virtualization | High |
| Blocking localStorage | 8 synchronous write patterns | Medium |
| Heavy render computations | 12 inline calculations | Medium |
| Oversized components | 7 components > 1000 lines | High |

---

## 1. Missing Memoization

### Components Needing React.memo

These components render frequently in lists and should be wrapped with `React.memo`:

| Component | Location | Render Frequency | Impact |
|-----------|----------|------------------|--------|
| Module cards | WeeklyBoard.jsx | 20-100x per view | 🔴 High |
| Employee rows | PeopleModule.jsx | 50-200x per view | 🔴 High |
| Project cards | ProjectsModule.jsx | 10-50x per view | 🟡 Medium |
| Stage progress cells | WeeklyBoard.jsx | 22x per module | 🔴 High |
| Difficulty badges | Multiple | 6x per module | 🟡 Medium |
| Training matrix cells | TrainingMatrix.jsx | stations × employees | 🔴 High |
| Equipment rows | EquipmentModule.jsx | 50-100x per view | 🟡 Medium |
| Transport cards | TransportModule.jsx | 20-50x per view | 🟡 Medium |

### Current useMemo/useCallback Usage

```
Files with memoization (176 total usages):
─────────────────────────────────────────
WeeklyBoard.jsx          32 usages  ✅ Good coverage
OnSiteTab.jsx            21 usages  ✅ Good coverage
AuthModule.jsx           20 usages  ✅ Good coverage
DrawingsModule.jsx       17 usages  ✅ Good coverage
QAModule.jsx              9 usages  🟡 Moderate
App.jsx                   5 usages  🔴 LOW - needs more
ProjectSequencing.jsx     5 usages  🟡 Moderate
```

### Recommended Fixes

```jsx
// BEFORE: Inline component in map
{modules.map(module => (
    <div key={module.id} className="module-card">
        {/* ... */}
    </div>
))}

// AFTER: Memoized component
const ModuleCard = React.memo(({ module, onSelect, onEdit }) => (
    <div className="module-card">
        {/* ... */}
    </div>
));

// Usage
{modules.map(module => (
    <ModuleCard 
        key={module.id} 
        module={module}
        onSelect={handleSelect}
        onEdit={handleEdit}
    />
))}
```

---

## 2. Large List Rendering

### Components Needing Virtualization

| Component | List Type | Typical Size | Current Approach | Recommendation |
|-----------|-----------|--------------|------------------|----------------|
| WeeklyBoard | Module grid | 20-100 items | Full render | react-window |
| PeopleModule | Employee table | 50-200 rows | Full render | react-window |
| ActivityLogViewer | Log entries | 100+ entries | Full render | react-window |
| ProjectDetail | Module list | 50-150 items | Full render | react-window |
| TrainingMatrix | Grid cells | stations × employees | Full render | Custom virtualization |

### Implementation Example

```jsx
// Install: npm install react-window
import { FixedSizeList } from 'react-window';

// BEFORE: Full list render
<div className="employee-list">
    {employees.map(emp => (
        <EmployeeRow key={emp.id} employee={emp} />
    ))}
</div>

// AFTER: Virtualized list
<FixedSizeList
    height={600}
    itemCount={employees.length}
    itemSize={60}
    width="100%"
>
    {({ index, style }) => (
        <EmployeeRow 
            key={employees[index].id}
            employee={employees[index]}
            style={style}
        />
    )}
</FixedSizeList>
```

### Estimated Performance Gains

| Component | Current Render | With Virtualization | Improvement |
|-----------|----------------|---------------------|-------------|
| 100 modules | ~100 DOM nodes | ~15 DOM nodes | 85% reduction |
| 200 employees | ~200 DOM nodes | ~20 DOM nodes | 90% reduction |
| 500 log entries | ~500 DOM nodes | ~25 DOM nodes | 95% reduction |

---

## 3. Blocking localStorage Operations

### Current Pattern (Synchronous)

```javascript
// js/core/moda-core.js - MODA_STORAGE
set: function(key, value) {
    localStorage.setItem(key, JSON.stringify(value));  // BLOCKING
}
```

### Batched Pattern (Better - Already Exists)

```javascript
// js/core/moda-core.js - MODA_STORAGE
setBatched: function(key, value) {
    pendingWrites[key] = value;
    if (!batchTimeout) {
        batchTimeout = setTimeout(() => {
            Object.entries(pendingWrites).forEach(([k, v]) => {
                localStorage.setItem(k, JSON.stringify(v));
            });
            pendingWrites = {};
            batchTimeout = null;
        }, MODA_CONSTANTS.STORAGE_BATCH_DELAY); // 500ms
    }
}
```

### Components Using Synchronous Writes

| Component | Write Pattern | Frequency | Fix |
|-----------|---------------|-----------|-----|
| App.jsx | `localStorage.setItem` | On every project change | Use setBatched |
| WeeklyBoard.jsx | `localStorage.setItem` | On schedule changes | Use setBatched |
| PeopleModule.jsx | `localStorage.setItem` | On employee edits | Use setBatched |
| dashboardRoles.js | `localStorage.setItem` | On role changes | Use setBatched |
| TrainingMatrix.jsx | `localStorage.setItem` | On certification updates | Use setBatched |

### Recommended: Web Worker for Large Data

```javascript
// For large data operations (>100KB), use Web Worker
const storageWorker = new Worker('js/workers/storage-worker.js');

storageWorker.postMessage({
    action: 'save',
    key: 'autovol_projects',
    data: largeProjectsArray
});

storageWorker.onmessage = (e) => {
    if (e.data.success) {
        console.log('Data saved in background');
    }
};
```

---

## 4. Heavy Render Computations

### Inline Calculations in Render

These computations happen on every render and should be memoized:

| Location | Computation | Fix |
|----------|-------------|-----|
| WeeklyBoard.jsx | Module filtering/sorting | useMemo |
| WeeklyBoard.jsx | Date calculations | useMemo |
| App.jsx | Project statistics | useMemo |
| PeopleModule.jsx | Employee filtering | useMemo |
| TrainingMatrix.jsx | Certification matrix | useMemo |
| ProjectDetail | Module categorization | useMemo |
| ExecutiveBoard.jsx | Dashboard metrics | useMemo |

### Example Fix

```jsx
// BEFORE: Computed on every render
function ProjectDetail({ project }) {
    const activeModules = project.modules.filter(m => m.status === 'active');
    const completedModules = project.modules.filter(m => m.status === 'complete');
    const totalProgress = project.modules.reduce((sum, m) => sum + getProgress(m), 0);
    // ...
}

// AFTER: Memoized computations
function ProjectDetail({ project }) {
    const { activeModules, completedModules, totalProgress } = useMemo(() => ({
        activeModules: project.modules.filter(m => m.status === 'active'),
        completedModules: project.modules.filter(m => m.status === 'complete'),
        totalProgress: project.modules.reduce((sum, m) => sum + getProgress(m), 0)
    }), [project.modules]);
    // ...
}
```

---

## 5. useEffect Optimization

### Effects Without Proper Dependencies

Found 102 `useEffect(() =>` patterns across 35 files. Common issues:

1. **Missing dependency arrays** - Effect runs on every render
2. **Object dependencies** - New object reference triggers effect
3. **No cleanup** - Memory leaks from subscriptions

### High-Impact Effects to Review

| File | Effect Purpose | Issue |
|------|----------------|-------|
| App.jsx (14 effects) | Data loading, sync | Review dependencies |
| WeeklyBoard.jsx (8 effects) | Schedule sync | Potential over-firing |
| OnSiteTab.jsx (8 effects) | Data loading | Review cleanup |
| AuthModule.jsx (7 effects) | Auth state | Review dependencies |

### Example Fix

```jsx
// BEFORE: Effect fires on every render
useEffect(() => {
    loadData(filters);
}, [filters]); // filters is new object each render!

// AFTER: Stable dependencies
const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
useEffect(() => {
    loadData(filters);
}, [filtersKey]);
```

---

## 6. Component Splitting Recommendations

### Priority 1: App.jsx (~4,630 lines)

Split into:
```
js/components/
├── App.jsx (shell, routing, auth check)
├── Dashboard.jsx (main layout, navigation)
├── production/
│   ├── ProductionDashboard.jsx
│   ├── StaggerConfigTab.jsx
│   └── useProductionWeeks.js
├── projects/
│   ├── ProjectDetail.jsx
│   ├── NewProjectModal.jsx
│   └── EditProjectModal.jsx
└── modals/
    ├── ModuleDetailModal.jsx
    └── ReportIssueModal.jsx
```

### Priority 2: WeeklyBoard.jsx (~4,500 lines)

Split into:
```
js/components/weekly-board/
├── WeeklyBoard.jsx (main container)
├── WeeklyBoardTab.jsx
├── ScheduleSetupTab.jsx
├── ModuleCard.jsx (memoized)
├── StationColumn.jsx
├── WeekSelector.jsx
├── useWeeklySchedule.js
└── weeklyBoardUtils.js
```

### Priority 3: DrawingsModule.jsx (~2,000 lines)

Split into:
```
js/components/drawings/
├── DrawingsModule.jsx (main container)
├── DrawingUploader.jsx
├── DrawingViewer.jsx
├── DrawingSearch.jsx
└── DrawingCard.jsx (memoized)
```

---

## 7. Bundle Size Optimization

### Current Load Pattern

```html
<!-- All scripts loaded synchronously -->
<script type="text/babel" src="./js/components/WeeklyBoard.jsx"></script>
<script type="text/babel" src="./js/components/DrawingsModule.jsx"></script>
<!-- ... 40+ more scripts -->
```

### Recommended: Code Splitting

```jsx
// Lazy load non-critical modules
const DrawingsModule = React.lazy(() => import('./DrawingsModule'));
const EquipmentModule = React.lazy(() => import('./EquipmentModule'));
const TrainingMatrix = React.lazy(() => import('./TrainingMatrix'));

// Usage with Suspense
<React.Suspense fallback={<LoadingSpinner />}>
    {activeTab === 'drawings' && <DrawingsModule />}
</React.Suspense>
```

### Estimated Bundle Savings

| Module | Size | Load Strategy |
|--------|------|---------------|
| WeeklyBoard | ~288KB | Eager (critical) |
| DrawingsModule | ~131KB | Lazy |
| EquipmentModule | ~120KB | Lazy |
| PeopleModule | ~95KB | Lazy |
| TransportModule | ~91KB | Lazy |
| **Total Lazy** | **~437KB** | Deferred |

---

## 8. Quick Wins (Implement First)

### Week 1: Memoization

1. Add `React.memo` to module cards in WeeklyBoard
2. Add `React.memo` to employee rows in PeopleModule
3. Add `useMemo` to filtering/sorting in top 5 components

### Week 2: localStorage Optimization

1. Replace all `localStorage.setItem` with `MODA_STORAGE.setBatched`
2. Add debouncing to high-frequency saves

### Week 3: Effect Cleanup

1. Review all useEffect dependencies in App.jsx
2. Add cleanup functions to subscription effects
3. Stabilize object dependencies with useMemo

### Week 4: Component Extraction

1. Extract ProductionDashboard from App.jsx
2. Extract ModuleDetailModal from App.jsx
3. Create shared ModuleCard component

---

## 9. Performance Monitoring

### Add Performance Markers

```jsx
// Add to critical components
useEffect(() => {
    performance.mark('WeeklyBoard-render-start');
    return () => {
        performance.mark('WeeklyBoard-render-end');
        performance.measure('WeeklyBoard-render', 
            'WeeklyBoard-render-start', 
            'WeeklyBoard-render-end'
        );
    };
}, []);
```

### React DevTools Profiler

1. Install React DevTools browser extension
2. Enable "Highlight updates when components render"
3. Profile WeeklyBoard and PeopleModule
4. Identify components re-rendering unnecessarily

---

## Appendix: Map Usage by Component

Components with highest `.map()` usage (potential render bottlenecks):

```
WeeklyBoard.jsx          87 .map() calls
App.jsx                  56 .map() calls
OnSiteTab.jsx            42 .map() calls
EquipmentModule.jsx      26 .map() calls
TransportModule.jsx      26 .map() calls
PeopleModule.jsx         19 .map() calls
TrainingMatrix.jsx       17 .map() calls
ProjectSequencing.jsx    16 .map() calls
```

Each `.map()` in render creates new component instances. Prioritize memoization for components with high map counts.
