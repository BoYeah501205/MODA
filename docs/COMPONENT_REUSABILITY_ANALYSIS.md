# MODA Component Reusability Analysis

> **Analysis Date:** January 2025  
> **Purpose:** Identify code duplication and opportunities for shared components

---

## Executive Summary

The codebase has significant duplication across 50+ components. Creating a shared component library would:
- Reduce code by ~30%
- Improve consistency
- Accelerate future development
- Simplify maintenance

---

## 1. Modal Dialog Pattern

### Current State: 61 Modal Implementations

Found across 19 files with similar patterns:

| File | Modal Count | Pattern |
|------|-------------|---------|
| DrawingsModule.jsx | 8 | Backdrop + centered card |
| PeopleModule.jsx | 7 | Backdrop + centered card |
| WeeklyBoard.jsx | 7 | Backdrop + centered card |
| App.jsx | 6 | Backdrop + centered card |
| ProjectSequencing.jsx | 6 | Backdrop + centered card |

### Duplicated Pattern

```jsx
// This pattern appears 61+ times across the codebase
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-bold">Modal Title</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">×</button>
        </div>
        {/* Content */}
        <div className="p-6">
            {children}
        </div>
        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-2">
            <button onClick={onClose}>Cancel</button>
            <button onClick={onSave}>Save</button>
        </div>
    </div>
</div>
```

### Recommended: Shared Modal Component

```jsx
// js/components/ui/Modal.jsx
const Modal = React.memo(({ 
    isOpen, 
    onClose, 
    title, 
    size = 'md', // sm, md, lg, xl, full
    children,
    footer,
    closeOnBackdrop = true,
    showCloseButton = true
}) => {
    if (!isOpen) return null;
    
    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
        full: 'max-w-[95vw]'
    };
    
    // Handle escape key
    React.useEffect(() => {
        const handleEscape = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);
    
    return (
        <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={closeOnBackdrop ? onClose : undefined}
        >
            <div 
                className={`bg-white rounded-lg shadow-xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-hidden flex flex-col`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                    {showCloseButton && (
                        <button 
                            onClick={onClose} 
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 text-2xl leading-none"
                        >
                            ×
                        </button>
                    )}
                </div>
                
                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {children}
                </div>
                
                {/* Footer */}
                {footer && (
                    <div className="p-4 border-t shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
});

window.Modal = Modal;
```

---

## 2. Status Badge Pattern

### Current State: 36 Badge Implementations

Found across 11 files:

| File | Badge Count | Types |
|------|-------------|-------|
| App.jsx | 11 | Status, Stage, Difficulty |
| WeeklyBoard.jsx | 7 | Status, Progress |
| OnSiteTab.jsx | 4 | Status |
| EquipmentModule.jsx | 3 | Status, Condition |
| TravelersPanel.jsx | 3 | Status |

### Duplicated Pattern

```jsx
// Appears 36+ times with slight variations
<span className={`px-2 py-1 text-xs rounded ${
    status === 'active' ? 'bg-green-100 text-green-800' :
    status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
    'bg-gray-100 text-gray-800'
}`}>
    {status}
</span>
```

### Recommended: Shared StatusBadge Component

```jsx
// js/components/ui/StatusBadge.jsx
const STATUS_VARIANTS = {
    // General statuses
    active: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    complete: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    error: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    warning: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    info: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200' },
    neutral: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
    
    // Production statuses
    scheduled: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
    inProgress: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
    
    // Priority levels
    low: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    high: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' }
};

const StatusBadge = React.memo(({ 
    status, 
    label, 
    variant, 
    size = 'sm',
    showBorder = false,
    className = ''
}) => {
    const variantKey = variant || status?.toLowerCase()?.replace(/\s+/g, '') || 'neutral';
    const colors = STATUS_VARIANTS[variantKey] || STATUS_VARIANTS.neutral;
    
    const sizeClasses = {
        xs: 'px-1.5 py-0.5 text-xs',
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm'
    };
    
    return (
        <span className={`
            inline-flex items-center rounded font-medium
            ${colors.bg} ${colors.text}
            ${showBorder ? `border ${colors.border}` : ''}
            ${sizeClasses[size]}
            ${className}
        `}>
            {label || status}
        </span>
    );
});

window.StatusBadge = StatusBadge;
```

---

## 3. Difficulty Badge Pattern

### Current State: 116 Difficulty References

Found across 8 files with duplicated color/label mappings:

| File | References | Issue |
|------|------------|-------|
| App.jsx | 54 | Defines difficultyColors, difficultyLabels |
| HeatMapMatrix.jsx | 22 | Redefines same mappings |
| WeeklyBoard.jsx | 21 | Redefines same mappings |
| WeeklyHeatMapReport.jsx | 9 | Redefines same mappings |
| TravelerDetailModal.jsx | 6 | Redefines same mappings |

### Duplicated Definitions

```jsx
// Defined in multiple files - should be centralized
const difficultyLabels = {
    sidewall: 'Sidewall',
    stair: 'Stair',
    hr3Wall: '3HR Wall',
    short: 'Short',
    doubleStudio: 'Dbl Studio',
    sawbox: 'Sawbox',
    proto: 'Prototype'
};

const difficultyColors = {
    sidewall: 'bg-orange-100 text-orange-800',
    stair: 'bg-purple-100 text-purple-800',
    hr3Wall: 'bg-red-100 text-red-800',
    short: 'bg-yellow-100 text-yellow-800',
    doubleStudio: 'bg-blue-100 text-blue-800',
    sawbox: 'bg-green-100 text-green-800',
    proto: 'bg-pink-100 text-pink-800'
};
```

### Recommended: Centralized Difficulty System

```jsx
// js/components/ui/DifficultyBadge.jsx
const DIFFICULTY_CONFIG = {
    sidewall: { label: 'Sidewall', abbrev: 'SW', bg: 'bg-orange-100', text: 'text-orange-800' },
    stair: { label: 'Stair', abbrev: 'STAIR', bg: 'bg-purple-100', text: 'text-purple-800' },
    hr3Wall: { label: '3HR Wall', abbrev: '3HR', bg: 'bg-red-100', text: 'text-red-800' },
    short: { label: 'Short', abbrev: 'SHORT', bg: 'bg-yellow-100', text: 'text-yellow-800' },
    doubleStudio: { label: 'Dbl Studio', abbrev: 'DBL', bg: 'bg-blue-100', text: 'text-blue-800' },
    sawbox: { label: 'Sawbox', abbrev: 'SAWBOX', bg: 'bg-green-100', text: 'text-green-800' },
    proto: { label: 'Prototype', abbrev: 'PROTO', bg: 'bg-pink-100', text: 'text-pink-800' }
};

const DifficultyBadge = React.memo(({ type, compact = false, className = '' }) => {
    const config = DIFFICULTY_CONFIG[type];
    if (!config) return null;
    
    return (
        <span className={`px-2 py-0.5 text-xs rounded font-medium ${config.bg} ${config.text} ${className}`}>
            {compact ? config.abbrev : config.label}
        </span>
    );
});

// Render all difficulties for a module
const DifficultyBadges = React.memo(({ difficulties, compact = false }) => {
    const activeDifficulties = Object.entries(difficulties || {})
        .filter(([_, active]) => active)
        .map(([type]) => type);
    
    if (activeDifficulties.length === 0) return null;
    
    return (
        <div className="flex flex-wrap gap-1">
            {activeDifficulties.map(type => (
                <DifficultyBadge key={type} type={type} compact={compact} />
            ))}
        </div>
    );
});

window.DifficultyBadge = DifficultyBadge;
window.DifficultyBadges = DifficultyBadges;
window.DIFFICULTY_CONFIG = DIFFICULTY_CONFIG;
```

---

## 4. Progress Bar Pattern

### Current State: Multiple Implementations

Found in App.jsx, DashboardHome.jsx, WeeklyBoard.jsx with slight variations.

### Recommended: Shared ProgressBar Component

```jsx
// js/components/ui/ProgressBar.jsx
const ProgressBar = React.memo(({ 
    value, 
    max = 100, 
    size = 'md',
    showLabel = false,
    color = 'teal',
    className = ''
}) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    
    const sizeClasses = {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3'
    };
    
    const colorClasses = {
        teal: percentage === 100 ? 'bg-green-500' : 'bg-teal-500',
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        red: 'bg-red-500',
        yellow: 'bg-yellow-500'
    };
    
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <div className={`flex-1 bg-gray-200 rounded-full ${sizeClasses[size]} overflow-hidden`}>
                <div 
                    className={`${sizeClasses[size]} rounded-full transition-all duration-300 ${colorClasses[color]}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showLabel && (
                <span className="text-xs text-gray-500 w-10 text-right">{Math.round(percentage)}%</span>
            )}
        </div>
    );
});

window.ProgressBar = ProgressBar;
```

---

## 5. Data Table Pattern

### Current State: 12+ Table Implementations

Each module has its own table implementation with sorting, filtering, and pagination.

### Recommended: Shared DataTable Component

```jsx
// js/components/ui/DataTable.jsx
const DataTable = React.memo(({
    data,
    columns,
    sortable = true,
    searchable = false,
    paginated = false,
    pageSize = 25,
    onRowClick,
    emptyMessage = 'No data available',
    className = ''
}) => {
    const [sortField, setSortField] = React.useState(null);
    const [sortDirection, setSortDirection] = React.useState('asc');
    const [searchTerm, setSearchTerm] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
    
    // Filtering
    const filteredData = React.useMemo(() => {
        if (!searchTerm) return data;
        const term = searchTerm.toLowerCase();
        return data.filter(row => 
            columns.some(col => 
                String(row[col.field] || '').toLowerCase().includes(term)
            )
        );
    }, [data, searchTerm, columns]);
    
    // Sorting
    const sortedData = React.useMemo(() => {
        if (!sortField) return filteredData;
        return [...filteredData].sort((a, b) => {
            const aVal = a[sortField] ?? '';
            const bVal = b[sortField] ?? '';
            const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [filteredData, sortField, sortDirection]);
    
    // Pagination
    const paginatedData = React.useMemo(() => {
        if (!paginated) return sortedData;
        const start = (currentPage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, paginated, currentPage, pageSize]);
    
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };
    
    return (
        <div className={className}>
            {searchable && (
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                    />
                </div>
            )}
            
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map(col => (
                                <th 
                                    key={col.field}
                                    onClick={sortable && col.sortable !== false ? () => handleSort(col.field) : undefined}
                                    className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase ${
                                        sortable && col.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                                    }`}
                                >
                                    <span className="flex items-center gap-1">
                                        {col.header}
                                        {sortField === col.field && (
                                            <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, idx) => (
                                <tr 
                                    key={row.id || idx}
                                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                                    className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                                >
                                    {columns.map(col => (
                                        <td key={col.field} className="px-4 py-3">
                                            {col.render ? col.render(row[col.field], row) : row[col.field]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            
            {paginated && sortedData.length > pageSize && (
                <div className="mt-4 flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
                    </span>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button 
                            onClick={() => setCurrentPage(p => p + 1)}
                            disabled={currentPage * pageSize >= sortedData.length}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
});

window.DataTable = DataTable;
```

---

## 6. Custom Hooks to Extract

### useModuleFilter (Duplicated in 4+ components)

```jsx
// js/hooks/useModuleFilter.js
const useModuleFilter = (modules, initialFilters = {}) => {
    const [filters, setFilters] = React.useState({
        search: '',
        stage: 'all',
        status: 'all',
        building: 'all',
        difficulty: 'all',
        ...initialFilters
    });
    
    const filteredModules = React.useMemo(() => {
        return modules.filter(module => {
            // Search filter
            if (filters.search) {
                const term = filters.search.toLowerCase();
                const searchFields = [
                    module.serialNumber,
                    module.hitchBLM,
                    module.rearBLM,
                    module.hitchUnit
                ].filter(Boolean).join(' ').toLowerCase();
                if (!searchFields.includes(term)) return false;
            }
            
            // Stage filter
            if (filters.stage !== 'all') {
                const currentStage = getCurrentStage(module);
                if (currentStage?.id !== filters.stage) return false;
            }
            
            // Status filter
            if (filters.status !== 'all' && module.status !== filters.status) {
                return false;
            }
            
            // Building filter
            if (filters.building !== 'all') {
                const blm = extractFromBLM(module.hitchBLM || module.serialNumber);
                if (blm.building !== filters.building) return false;
            }
            
            // Difficulty filter
            if (filters.difficulty !== 'all') {
                if (!module.difficulties?.[filters.difficulty]) return false;
            }
            
            return true;
        });
    }, [modules, filters]);
    
    const updateFilter = React.useCallback((key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);
    
    const clearFilters = React.useCallback(() => {
        setFilters({
            search: '',
            stage: 'all',
            status: 'all',
            building: 'all',
            difficulty: 'all'
        });
    }, []);
    
    return { filters, filteredModules, updateFilter, clearFilters };
};

window.useModuleFilter = useModuleFilter;
```

### useSupabaseQuery (Standardize data fetching)

```jsx
// js/hooks/useSupabaseQuery.js
const useSupabaseQuery = (queryFn, dependencies = []) => {
    const [data, setData] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    
    const refetch = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await queryFn();
            setData(result);
        } catch (err) {
            setError(err);
            console.error('[useSupabaseQuery] Error:', err);
        } finally {
            setLoading(false);
        }
    }, [queryFn]);
    
    React.useEffect(() => {
        refetch();
    }, dependencies);
    
    return { data, loading, error, refetch };
};

window.useSupabaseQuery = useSupabaseQuery;
```

---

## 7. Implementation Priority

### Phase 1: Foundation (Week 1)

1. Create `js/components/ui/` directory
2. Implement `Modal.jsx`
3. Implement `StatusBadge.jsx`
4. Implement `DifficultyBadge.jsx`
5. Update `index.html` to load UI components

### Phase 2: Data Components (Week 2)

1. Implement `ProgressBar.jsx`
2. Implement `DataTable.jsx`
3. Extract `useModuleFilter` hook
4. Extract `useSupabaseQuery` hook

### Phase 3: Migration (Week 3-4)

1. Replace modal implementations in App.jsx
2. Replace modal implementations in major modules
3. Replace badge implementations
4. Replace table implementations

### Phase 4: Cleanup (Week 5)

1. Remove duplicated code
2. Update documentation
3. Add component tests

---

## 8. Estimated Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Modal code duplication | 61 implementations | 1 component | 98% reduction |
| Badge code duplication | 36 implementations | 2 components | 94% reduction |
| Difficulty definitions | 8 files | 1 file | 87% reduction |
| Total lines of code | ~25,000 | ~17,500 | 30% reduction |
| New feature development time | Baseline | -40% | Faster iteration |
