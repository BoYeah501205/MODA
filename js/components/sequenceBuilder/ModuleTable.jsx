/**
 * ModuleTable.jsx
 * The actual table component displaying module rows with sorting, selection, inline editing
 * Includes drag-and-drop reordering with auto-renumbering
 */

const { useState, useCallback, useMemo, useRef } = React;

function ModuleTable({
  modules,
  selectedIds,
  onSelectionChange,
  onModuleUpdate,
  onModuleDelete,
  onTagEdit,
  onReorder,
  sortConfig,
  onSort
}) {
  const [editingCell, setEditingCell] = useState(null); // { moduleId, field }
  const [editValue, setEditValue] = useState('');
  
  // Drag-and-drop state
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const dragCounter = useRef(0);

  // Difficulty tags lookup (matches sequenceBuilderConstants.js)
  const tagInfo = {
    'ext-sidewall': { name: 'Ext Sidewall', color: '#ef4444' },
    'stair': { name: 'Stair', color: '#f97316' },
    'three-hr': { name: '3HR-Wall', color: '#eab308' },
    'two-hr': { name: '2HR-Wall', color: '#a3e635' },
    'short': { name: 'Short', color: '#22c55e' },
    'dbl-studio': { name: 'Dbl Studio', color: '#3b82f6' },
    'common': { name: 'Common Area', color: '#06b6d4' },
    'tile': { name: 'Tile', color: '#ec4899' },
    'sawbox': { name: 'Sawbox', color: '#8b5cf6' },
  };

  // Drag-and-drop handlers
  const handleDragStart = useCallback((e, moduleId) => {
    setDraggedId(moduleId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', moduleId);
    // Add visual feedback
    e.currentTarget.style.opacity = '0.5';
  }, []);

  const handleDragEnd = useCallback((e) => {
    setDraggedId(null);
    setDragOverId(null);
    dragCounter.current = 0;
    e.currentTarget.style.opacity = '1';
  }, []);

  const handleDragEnter = useCallback((e, moduleId) => {
    e.preventDefault();
    dragCounter.current++;
    if (moduleId !== draggedId) {
      setDragOverId(moduleId);
    }
  }, [draggedId]);

  const handleDragLeave = useCallback((e) => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverId(null);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault();
    setDragOverId(null);
    dragCounter.current = 0;
    
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    // Find indices
    const draggedIndex = modules.findIndex(m => m.id === draggedId);
    const targetIndex = modules.findIndex(m => m.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    // Create new order
    const newModules = [...modules];
    const [draggedModule] = newModules.splice(draggedIndex, 1);
    newModules.splice(targetIndex, 0, draggedModule);

    // Auto-renumber sequentially (integers only)
    const reorderedModules = newModules.map((m, idx) => ({
      ...m,
      build_sequence: idx + 1
    }));

    // Call onReorder with the new order
    if (onReorder) {
      onReorder(reorderedModules);
    }

    setDraggedId(null);
  }, [draggedId, modules, onReorder]);

  // Column definitions
  const columns = [
    { id: 'checkbox', label: '', width: 40, sortable: false },
    { id: 'build_sequence', label: 'Seq #', width: 70, sortable: true, editable: true },
    { id: 'set_sequence', label: 'Set #', width: 70, sortable: true, editable: true },
    { id: 'serial_number', label: 'Serial #', width: 120, sortable: true, editable: true },
    { id: 'blm_id', label: 'BLM', width: 100, sortable: true, editable: true },
    { id: 'unit_type', label: 'Unit Type', width: 120, sortable: true, editable: true },
    { id: 'building', label: 'Bldg', width: 60, sortable: true, editable: true },
    { id: 'level', label: 'Lvl', width: 50, sortable: true, editable: true },
    { id: 'difficulty_tags', label: 'Difficulty Tags', width: 200, sortable: false },
    { id: 'notes', label: 'Notes', width: 150, sortable: false, editable: true },
    { id: 'actions', label: '', width: 60, sortable: false },
  ];

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === modules.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(modules.map(m => m.id));
    }
  }, [modules, selectedIds, onSelectionChange]);

  // Handle row selection
  const handleRowSelect = useCallback((moduleId, event) => {
    if (event.shiftKey && selectedIds.length > 0) {
      // Shift-click: select range
      const lastSelected = selectedIds[selectedIds.length - 1];
      const lastIndex = modules.findIndex(m => m.id === lastSelected);
      const currentIndex = modules.findIndex(m => m.id === moduleId);
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      const rangeIds = modules.slice(start, end + 1).map(m => m.id);
      const newSelection = [...new Set([...selectedIds, ...rangeIds])];
      onSelectionChange(newSelection);
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd-click: toggle single
      if (selectedIds.includes(moduleId)) {
        onSelectionChange(selectedIds.filter(id => id !== moduleId));
      } else {
        onSelectionChange([...selectedIds, moduleId]);
      }
    } else {
      // Regular click: toggle single
      if (selectedIds.includes(moduleId)) {
        onSelectionChange(selectedIds.filter(id => id !== moduleId));
      } else {
        onSelectionChange([...selectedIds, moduleId]);
      }
    }
  }, [modules, selectedIds, onSelectionChange]);

  // Handle sort click
  const handleSortClick = useCallback((columnId) => {
    const column = columns.find(c => c.id === columnId);
    if (!column?.sortable) return;

    let direction = 'asc';
    if (sortConfig.column === columnId) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }

    onSort({ column: direction ? columnId : null, direction });
  }, [sortConfig, onSort, columns]);

  // Handle cell double-click to edit
  const handleCellDoubleClick = useCallback((moduleId, field, currentValue) => {
    const column = columns.find(c => c.id === field);
    if (!column?.editable) return;

    setEditingCell({ moduleId, field });
    setEditValue(currentValue ?? '');
  }, [columns]);

  // Handle edit save
  const handleEditSave = useCallback(async () => {
    if (!editingCell) return;

    const { moduleId, field } = editingCell;
    let value = editValue;

    // Type conversion
    if (field === 'build_sequence' || field === 'set_sequence' || field === 'building' || field === 'level') {
      value = value === '' ? null : parseInt(value, 10);
      if (value !== null && isNaN(value)) {
        setEditingCell(null);
        return;
      }
    }

    try {
      await onModuleUpdate(moduleId, { [field]: value });
    } catch (err) {
      console.error('Failed to update module:', err);
    }

    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, onModuleUpdate]);

  // Handle edit cancel
  const handleEditCancel = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
  }, []);

  // Handle key down in edit mode
  const handleEditKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  }, [handleEditSave, handleEditCancel]);

  // Render sort indicator
  const renderSortIndicator = (columnId) => {
    if (sortConfig.column !== columnId) {
      return <span className="text-gray-300 ml-1">↕</span>;
    }
    return (
      <span className="text-blue-600 ml-1">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // Render cell content
  const renderCell = (module, column) => {
    const isEditing = editingCell?.moduleId === module.id && editingCell?.field === column.id;

    if (column.id === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={selectedIds.includes(module.id)}
          onChange={(e) => handleRowSelect(module.id, e)}
          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
      );
    }

    if (column.id === 'difficulty_tags') {
      const tags = module.difficulty_tags || [];
      return (
        <div className="flex flex-wrap gap-1">
          {tags.length === 0 ? (
            <button
              onClick={() => onTagEdit(module)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              + Add tags
            </button>
          ) : (
            <>
              {tags.slice(0, 3).map(tagId => {
                const tag = tagInfo[tagId];
                if (!tag) return null;
                return (
                  <span
                    key={tagId}
                    className="px-1.5 py-0.5 text-xs rounded"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                  >
                    {tag.name}
                  </span>
                );
              })}
              {tags.length > 3 && (
                <span className="text-xs text-gray-500">+{tags.length - 3}</span>
              )}
              <button
                onClick={() => onTagEdit(module)}
                className="text-xs text-gray-400 hover:text-gray-600 ml-1"
              >
                Edit
              </button>
            </>
          )}
        </div>
      );
    }

    if (column.id === 'actions') {
      return (
        <button
          onClick={() => onModuleDelete(module.id)}
          className="p-1 text-gray-400 hover:text-red-600 rounded"
          title="Delete module"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      );
    }

    // Editable cell
    if (isEditing) {
      return (
        <input
          type={column.id.includes('sequence') || column.id === 'building' || column.id === 'level' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleEditSave}
          onKeyDown={handleEditKeyDown}
          autoFocus
          className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      );
    }

    const value = module[column.id];
    const displayValue = value ?? '-';

    if (column.editable) {
      return (
        <span
          onDoubleClick={() => handleCellDoubleClick(module.id, column.id, value)}
          className="cursor-text hover:bg-gray-100 px-1 py-0.5 rounded -mx-1"
          title="Double-click to edit"
        >
          {displayValue}
        </span>
      );
    }

    return displayValue;
  };

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="w-full">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            {columns.map(column => (
              <th
                key={column.id}
                className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 ${
                  column.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''
                }`}
                style={{ width: column.width, minWidth: column.width }}
                onClick={() => column.sortable && handleSortClick(column.id)}
              >
                {column.id === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={modules.length > 0 && selectedIds.length === modules.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                ) : (
                  <span className="flex items-center">
                    {column.label}
                    {column.sortable && renderSortIndicator(column.id)}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {modules.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                No modules found
              </td>
            </tr>
          ) : (
            modules.map((module, index) => (
              <tr
                key={module.id}
                draggable
                onDragStart={(e) => handleDragStart(e, module.id)}
                onDragEnd={handleDragEnd}
                onDragEnter={(e) => handleDragEnter(e, module.id)}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, module.id)}
                className={`hover:bg-gray-50 cursor-grab active:cursor-grabbing transition-all ${
                  selectedIds.includes(module.id) ? 'bg-blue-50' : ''
                } ${draggedId === module.id ? 'opacity-50' : ''} ${
                  dragOverId === module.id ? 'border-t-2 border-blue-500' : ''
                }`}
              >
                {columns.map(column => (
                  <td
                    key={column.id}
                    className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap"
                    style={{ width: column.width, minWidth: column.width }}
                  >
                    {renderCell(module, column)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// Expose to window for script tag usage
window.ModuleTable = ModuleTable;
