/**
 * SetOrderModal.jsx
 * Modal for configuring stack/set order - groups modules by set for crane placement
 * 
 * Stack Mode: Assign set sequences at the stack level, applied across all levels
 * Individual Mode: Assign set sequences per module (default)
 */

const { useState, useEffect, useCallback, useMemo } = React;

// localStorage key for persisting mode preference
const STACK_MODE_KEY = 'moda_setorder_stackmode';

function SetOrderModal({
  modules,
  onSave,
  onClose
}) {
  // Stack Mode toggle - persisted in localStorage
  const [stackMode, setStackMode] = useState(() => {
    try {
      return localStorage.getItem(STACK_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  
  // Group modules by building and level for set assignment
  const [setAssignments, setSetAssignments] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('blm_id');

  // Persist stack mode preference
  useEffect(() => {
    try {
      localStorage.setItem(STACK_MODE_KEY, stackMode ? 'true' : 'false');
    } catch {
      // Ignore localStorage errors
    }
  }, [stackMode]);

  // Initialize set assignments from modules
  useEffect(() => {
    const assignments = {};
    modules.forEach(module => {
      assignments[module.id] = module.set_sequence || null;
    });
    setSetAssignments(assignments);
  }, [modules]);

  // Group modules by building and level (Individual Mode)
  const groupedModules = useMemo(() => {
    const groups = {};
    
    modules.forEach(module => {
      const building = module.building || 1;
      const level = module.level || 1;
      const key = `B${building}L${level}`;
      
      if (!groups[key]) {
        groups[key] = {
          building,
          level,
          key,
          modules: []
        };
      }
      groups[key].modules.push(module);
    });

    // Sort modules within each group
    Object.values(groups).forEach(group => {
      group.modules.sort((a, b) => {
        const aVal = a[sortBy] || '';
        const bVal = b[sortBy] || '';
        return String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      });
    });

    // Sort groups by building then level
    return Object.values(groups).sort((a, b) => {
      if (a.building !== b.building) return a.building - b.building;
      return a.level - b.level;
    });
  }, [modules, sortBy]);

  // Group modules by building and stack (Stack Mode)
  const stackGroupedModules = useMemo(() => {
    const buildingGroups = {};
    
    modules.forEach(module => {
      const building = module.building || 1;
      const stack = module.stack || 1;
      const stackKey = `B${building}M${String(stack).padStart(2, '0')}`;
      
      if (!buildingGroups[building]) {
        buildingGroups[building] = {
          building,
          stacks: {}
        };
      }
      
      if (!buildingGroups[building].stacks[stackKey]) {
        buildingGroups[building].stacks[stackKey] = {
          building,
          stack,
          stackKey,
          modules: [],
          levels: new Set()
        };
      }
      
      buildingGroups[building].stacks[stackKey].modules.push(module);
      buildingGroups[building].stacks[stackKey].levels.add(module.level || 1);
    });

    // Convert to array and sort
    const result = [];
    Object.values(buildingGroups)
      .sort((a, b) => a.building - b.building)
      .forEach(buildingGroup => {
        const stacks = Object.values(buildingGroup.stacks)
          .sort((a, b) => a.stack - b.stack)
          .map(stackGroup => ({
            ...stackGroup,
            levelCount: stackGroup.levels.size,
            levels: Array.from(stackGroup.levels).sort((a, b) => a - b),
            // Calculate build sequence range
            buildSeqMin: Math.min(...stackGroup.modules.map(m => m.build_sequence || 999)),
            buildSeqMax: Math.max(...stackGroup.modules.map(m => m.build_sequence || 0))
          }));
        
        result.push({
          building: buildingGroup.building,
          stacks
        });
      });
    
    return result;
  }, [modules]);

  // Handle individual set assignment change
  const handleSetChange = useCallback((moduleId, value) => {
    const numValue = value === '' ? null : Math.max(1, parseInt(value) || 1);
    setSetAssignments(prev => ({
      ...prev,
      [moduleId]: numValue
    }));
    setIsDirty(true);
  }, []);

  // Handle stack-level set assignment change (applies to all modules in that building+stack)
  const handleStackSetChange = useCallback((stackKey, value) => {
    const numValue = value === '' ? null : Math.max(1, parseInt(value) || 1);
    
    // Find all modules in this stack
    const stackModules = modules.filter(m => {
      const building = m.building || 1;
      const stack = m.stack || 1;
      const key = `B${building}M${String(stack).padStart(2, '0')}`;
      return key === stackKey;
    });
    
    // Update all modules in the stack
    setSetAssignments(prev => {
      const newAssignments = { ...prev };
      stackModules.forEach(m => {
        newAssignments[m.id] = numValue;
      });
      return newAssignments;
    });
    setIsDirty(true);
  }, [modules]);

  // Get the current set value for a stack (returns the value if all modules have same, otherwise null)
  const getStackSetValue = useCallback((stackKey) => {
    const stackModules = modules.filter(m => {
      const building = m.building || 1;
      const stack = m.stack || 1;
      const key = `B${building}M${String(stack).padStart(2, '0')}`;
      return key === stackKey;
    });
    
    if (stackModules.length === 0) return null;
    
    const firstValue = setAssignments[stackModules[0].id];
    const allSame = stackModules.every(m => setAssignments[m.id] === firstValue);
    
    return allSame ? firstValue : null;
  }, [modules, setAssignments]);

  // Auto-assign set numbers for a group (level) - Individual Mode
  const autoAssignGroup = useCallback((groupKey, startingSet = 1) => {
    const group = groupedModules.find(g => g.key === groupKey);
    if (!group) return;

    const newAssignments = { ...setAssignments };
    group.modules.forEach((module, index) => {
      newAssignments[module.id] = startingSet + index;
    });
    setSetAssignments(newAssignments);
    setIsDirty(true);
  }, [groupedModules, setAssignments]);

  // Auto-assign set numbers for a building's stacks - Stack Mode
  const autoAssignBuildingStacks = useCallback((building) => {
    const buildingGroup = stackGroupedModules.find(bg => bg.building === building);
    if (!buildingGroup) return;

    const newAssignments = { ...setAssignments };
    let setNumber = 1;
    
    buildingGroup.stacks.forEach(stackGroup => {
      stackGroup.modules.forEach(module => {
        newAssignments[module.id] = setNumber;
      });
      setNumber++;
    });
    
    setSetAssignments(newAssignments);
    setIsDirty(true);
  }, [stackGroupedModules, setAssignments]);

  // Auto-assign all sets sequentially
  const autoAssignAll = useCallback(() => {
    const newAssignments = {};
    
    if (stackMode) {
      // Stack Mode: Assign by stack, each building starts at 1
      stackGroupedModules.forEach(buildingGroup => {
        let setNumber = 1;
        buildingGroup.stacks.forEach(stackGroup => {
          stackGroup.modules.forEach(module => {
            newAssignments[module.id] = setNumber;
          });
          setNumber++;
        });
      });
    } else {
      // Individual Mode: Sequential across all modules
      let setNumber = 1;
      groupedModules.forEach(group => {
        group.modules.forEach(module => {
          newAssignments[module.id] = setNumber++;
        });
      });
    }

    setSetAssignments(newAssignments);
    setIsDirty(true);
  }, [stackMode, stackGroupedModules, groupedModules]);

  // Clear all set assignments
  const clearAll = useCallback(() => {
    const newAssignments = {};
    modules.forEach(module => {
      newAssignments[module.id] = null;
    });
    setSetAssignments(newAssignments);
    setIsDirty(true);
  }, [modules]);

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Convert to array of updates
      const updates = Object.entries(setAssignments).map(([id, set_sequence]) => ({
        id,
        set_sequence
      }));

      await onSave(updates);
    } catch (err) {
      setError(err.message || 'Failed to save set order');
      setIsSaving(false);
    }
  };

  // Get stats
  const stats = useMemo(() => {
    const assigned = Object.values(setAssignments).filter(v => v != null).length;
    const total = modules.length;
    const maxSet = Math.max(0, ...Object.values(setAssignments).filter(v => v != null));
    return { assigned, total, maxSet };
  }, [setAssignments, modules]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Set Order Configuration</h2>
            <p className="text-sm text-gray-500 mt-1">
              Assign set numbers for crane placement sequence
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Sort by - only in Individual Mode */}
            {!stackMode && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="blm_id">BLM ID</option>
                  <option value="serial_number">Serial #</option>
                  <option value="build_sequence">Build Seq</option>
                </select>
              </div>
            )}
            
            {/* Stack Mode Toggle */}
            <button
              onClick={() => setStackMode(!stackMode)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                stackMode 
                  ? 'bg-purple-100 border-purple-300 text-purple-700' 
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Stack Mode
              {stackMode && (
                <span className="ml-1 text-xs bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded">ON</span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={autoAssignAll}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
            >
              Auto-Assign All
            </button>
            <button
              onClick={clearAll}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {modules.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No modules to configure
            </div>
          ) : stackMode ? (
            /* Stack Mode View */
            <div className="space-y-6">
              {stackGroupedModules.map(buildingGroup => (
                <div key={`building-${buildingGroup.building}`} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Building Header */}
                  <div className="px-4 py-3 bg-purple-50 border-b border-purple-200 flex items-center justify-between">
                    <h3 className="font-medium text-purple-900">
                      Building {buildingGroup.building}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-purple-600">
                        {buildingGroup.stacks.length} stacks
                      </span>
                      <button
                        onClick={() => autoAssignBuildingStacks(buildingGroup.building)}
                        className="text-sm text-purple-600 hover:text-purple-800"
                      >
                        Auto-assign
                      </button>
                    </div>
                  </div>

                  {/* Stack Table */}
                  <table className="w-full">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Stack</th>
                        <th className="px-4 py-2 text-left font-medium">Levels</th>
                        <th className="px-4 py-2 text-left font-medium">Build Seq</th>
                        <th className="px-4 py-2 text-center font-medium w-24">Set #</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {buildingGroup.stacks.map(stackGroup => (
                        <tr key={stackGroup.stackKey} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">
                            <span className="font-medium text-gray-900">{stackGroup.stackKey}</span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {stackGroup.levelCount} level{stackGroup.levelCount !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {stackGroup.buildSeqMin === stackGroup.buildSeqMax 
                              ? stackGroup.buildSeqMin 
                              : `${stackGroup.buildSeqMin}–${stackGroup.buildSeqMax}`}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="number"
                              value={getStackSetValue(stackGroup.stackKey) || ''}
                              onChange={(e) => handleStackSetChange(stackGroup.stackKey, e.target.value)}
                              min="1"
                              placeholder="-"
                              className="w-16 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            /* Individual Mode View */
            <div className="space-y-6">
              {groupedModules.map(group => (
                <div key={group.key} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Group Header */}
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">
                      Building {group.building}, Level {group.level}
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {group.modules.length} modules
                      </span>
                      <button
                        onClick={() => autoAssignGroup(group.key)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Auto-assign
                      </button>
                    </div>
                  </div>

                  {/* Module Table */}
                  <table className="w-full">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Serial #</th>
                        <th className="px-4 py-2 text-left font-medium">BLM</th>
                        <th className="px-4 py-2 text-left font-medium">Unit Type</th>
                        <th className="px-4 py-2 text-left font-medium">Build Seq</th>
                        <th className="px-4 py-2 text-center font-medium w-24">Set #</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {group.modules.map(module => (
                        <tr key={module.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {module.serial_number || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {module.blm_id || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {module.unit_type || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {module.build_sequence || '-'}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="number"
                              value={setAssignments[module.id] || ''}
                              onChange={(e) => handleSetChange(module.id, e.target.value)}
                              min="1"
                              placeholder="-"
                              className="w-16 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{stats.assigned}</span> of {stats.total} modules assigned
            {stats.maxSet > 0 && (
              <span className="ml-3">
                Max set: <span className="font-medium">{stats.maxSet}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Set Order'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Expose to window for script tag usage
window.SetOrderModal = SetOrderModal;
