/**
 * ModuleGrid.jsx
 * Container component with toolbar, filter bar, bulk action bar, and module table
 */

const { useState, useCallback, useMemo } = React;

function ModuleGrid({
  modules,
  projectId,
  onModuleUpdate,
  onModuleDelete,
  onModulesChange,
  onShowSetOrder,
  onShowAddModule,
  onExport
}) {
  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    building: null,
    level: null,
    unitType: null,
    tag: null,
    hasSequence: null
  });
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({ column: 'build_sequence', direction: 'asc' });
  
  // Modal states
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showTagEdit, setShowTagEdit] = useState(null); // module object
  
  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      building: null,
      level: null,
      unitType: null,
      tag: null,
      hasSequence: null
    });
  }, []);

  // Apply filters and sorting
  const filteredAndSortedModules = useMemo(() => {
    let result = [...modules];

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(m => 
        m.serial_number?.toLowerCase().includes(searchLower) ||
        m.blm_id?.toLowerCase().includes(searchLower) ||
        m.notes?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.building) {
      result = result.filter(m => m.building === parseInt(filters.building, 10));
    }

    if (filters.level) {
      result = result.filter(m => m.level === parseInt(filters.level, 10));
    }

    if (filters.unitType) {
      result = result.filter(m => m.unit_type === filters.unitType);
    }

    if (filters.tag) {
      result = result.filter(m => (m.difficulty_tags || []).includes(filters.tag));
    }

    if (filters.hasSequence !== null) {
      result = result.filter(m => 
        filters.hasSequence ? m.build_sequence != null : m.build_sequence == null
      );
    }

    // Apply sorting
    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.column];
        let bVal = b[sortConfig.column];

        // Handle nulls
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        // Numeric comparison for sequence/building/level
        if (['build_sequence', 'set_sequence', 'building', 'level'].includes(sortConfig.column)) {
          aVal = Number(aVal);
          bVal = Number(bVal);
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // String comparison
        const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [modules, filters, sortConfig]);

  // Handle bulk edit apply
  const handleBulkEditApply = useCallback(async (updates) => {
    const API = window.SequenceBuilderAPI;
    
    if (updates._tagMode) {
      // Tag update with mode
      const mode = updates._tagMode;
      delete updates._tagMode;
      await API.bulkUpdateModuleTags(selectedIds, updates.difficulty_tags, mode);
    } else {
      // Regular field update
      const moduleUpdates = selectedIds.map(id => ({ id, updates }));
      await API.updateModulesBatch(moduleUpdates);
    }

    // Refresh modules
    const refreshed = await API.fetchProjectModules(projectId);
    onModulesChange(refreshed);
    
    setShowBulkEdit(false);
    setSelectedIds([]);
  }, [selectedIds, projectId, onModulesChange]);

  // Handle tag edit save
  const handleTagEditSave = useCallback(async (moduleId, tags) => {
    const API = window.SequenceBuilderAPI;
    await API.updateModuleTags(moduleId, tags);
    
    // Refresh modules
    const refreshed = await API.fetchProjectModules(projectId);
    onModulesChange(refreshed);
    
    setShowTagEdit(null);
  }, [projectId, onModulesChange]);

  // Handle delete selected
  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.length === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.length} module${selectedIds.length !== 1 ? 's' : ''}?`
    );
    
    if (!confirmed) return;

    const API = window.SequenceBuilderAPI;
    await API.deleteModulesBatch(selectedIds);
    
    // Refresh modules
    const refreshed = await API.fetchProjectModules(projectId);
    onModulesChange(refreshed);
    
    setSelectedIds([]);
  }, [selectedIds, projectId, onModulesChange]);

  // Handle auto-sequence
  const handleAutoSequence = useCallback(async () => {
    const API = window.SequenceBuilderAPI;
    await API.autoGenerateSequences(projectId, 'blm_id', 'asc');
    
    // Refresh modules
    const refreshed = await API.fetchProjectModules(projectId);
    onModulesChange(refreshed);
  }, [projectId, onModulesChange]);

  // Stats
  const stats = useMemo(() => ({
    total: modules.length,
    filtered: filteredAndSortedModules.length,
    selected: selectedIds.length,
    withSequence: modules.filter(m => m.build_sequence != null).length
  }), [modules, filteredAndSortedModules, selectedIds]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onShowAddModule}
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Module
          </button>
          
          <button
            onClick={handleAutoSequence}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Auto-Sequence
          </button>
          
          <button
            onClick={onShowSetOrder}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Set Order
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onExport('csv')}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Export CSV
          </button>
          
          <span className="text-sm text-gray-500">
            {stats.withSequence}/{stats.total} sequenced
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      {window.FilterBar && (
        <window.FilterBar
          modules={modules}
          filters={filters}
          onFilterChange={setFilters}
          onClearFilters={clearFilters}
        />
      )}

      {/* Bulk Action Bar - shows when items selected */}
      {selectedIds.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800">
            {selectedIds.length} module{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkEdit(true)}
              className="px-3 py-1.5 text-sm font-medium text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded"
            >
              Bulk Edit
            </button>
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Results info */}
      {filters.search || filters.building || filters.level || filters.unitType || filters.tag || filters.hasSequence !== null ? (
        <div className="mb-2 text-sm text-gray-500">
          Showing {stats.filtered} of {stats.total} modules
        </div>
      ) : null}

      {/* Module Table */}
      <div className="flex-1 overflow-auto">
        {window.ModuleTable && (
          <window.ModuleTable
            modules={filteredAndSortedModules}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onModuleUpdate={onModuleUpdate}
            onModuleDelete={onModuleDelete}
            onTagEdit={(module) => setShowTagEdit(module)}
            onReorder={onModulesChange}
            sortConfig={sortConfig}
            onSort={setSortConfig}
          />
        )}
      </div>

      {/* Bulk Edit Modal */}
      {showBulkEdit && window.BulkEditModal && (
        <window.BulkEditModal
          selectedModules={modules.filter(m => selectedIds.includes(m.id))}
          onApply={handleBulkEditApply}
          onClose={() => setShowBulkEdit(false)}
        />
      )}

      {/* Tag Edit Modal */}
      {showTagEdit && window.TagEditModal && (
        <window.TagEditModal
          module={showTagEdit}
          onSave={handleTagEditSave}
          onClose={() => setShowTagEdit(null)}
        />
      )}
    </div>
  );
}

// Expose to window for script tag usage
window.ModuleGrid = ModuleGrid;
