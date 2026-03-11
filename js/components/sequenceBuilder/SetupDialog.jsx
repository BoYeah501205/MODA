/**
 * SetupDialog.jsx
 * Initial setup dialog for configuring buildings, levels, and module generation
 * 
 * Building cards with:
 * - Building Name (text)
 * - Number of Stacks (module stacks per level)
 * - Starting Level / Ending Level
 * - Level Build Order toggle (Top→Bottom or Bottom→Top)
 * - Define Set Order button
 * - Remove button
 */

const { useState, useCallback } = React;

function SetupDialog({ 
  projectId,
  projectName,
  onGenerate,
  onImportExisting,
  onClose,
  existingModuleCount = 0
}) {
  // Building cards state - start with one building
  const [buildings, setBuildings] = useState([
    {
      id: 1,
      name: 'A',
      stacks: 25,
      startLevel: 2,
      endLevel: 6,
      levelOrder: 'topToBottom' // 'topToBottom' or 'bottomToTop'
    }
  ]);
  
  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [setOrderBuilding, setSetOrderBuilding] = useState(null); // building to show SetOrderModal for

  // Calculate total modules
  const totalModules = buildings.reduce((sum, bldg) => {
    const levelCount = Math.abs(bldg.endLevel - bldg.startLevel) + 1;
    return sum + (levelCount * bldg.stacks);
  }, 0);

  // Add a new building card
  const handleAddBuilding = useCallback(() => {
    const nextId = Math.max(...buildings.map(b => b.id)) + 1;
    // Auto-increment building name (A, B, C... or 1, 2, 3...)
    const lastBldg = buildings[buildings.length - 1];
    let nextName = '';
    if (/^[A-Z]$/i.test(lastBldg.name)) {
      nextName = String.fromCharCode(lastBldg.name.toUpperCase().charCodeAt(0) + 1);
    } else if (/^\d+$/.test(lastBldg.name)) {
      nextName = String(parseInt(lastBldg.name) + 1);
    } else {
      nextName = String(nextId);
    }
    
    setBuildings([...buildings, {
      id: nextId,
      name: nextName,
      stacks: lastBldg.stacks,
      startLevel: lastBldg.startLevel,
      endLevel: lastBldg.endLevel,
      levelOrder: lastBldg.levelOrder
    }]);
  }, [buildings]);

  // Remove a building card (minimum 1 must remain)
  const handleRemoveBuilding = useCallback((buildingId) => {
    if (buildings.length <= 1) return;
    setBuildings(buildings.filter(b => b.id !== buildingId));
  }, [buildings]);

  // Update a building field
  const handleBuildingChange = useCallback((buildingId, field, value) => {
    setBuildings(buildings.map(b => {
      if (b.id !== buildingId) return b;
      
      // Validate numeric fields
      if (['stacks', 'startLevel', 'endLevel'].includes(field)) {
        const numVal = parseInt(value) || 1;
        return { ...b, [field]: Math.max(1, numVal) };
      }
      
      return { ...b, [field]: value };
    }));
  }, [buildings]);

  // Handle generate - creates module grid data
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Validate buildings
      for (const bldg of buildings) {
        if (!bldg.name.trim()) {
          throw new Error('All buildings must have a name');
        }
        if (bldg.stacks < 1) {
          throw new Error('Number of stacks must be at least 1');
        }
        if (bldg.startLevel < 1 || bldg.endLevel < 1) {
          throw new Error('Levels must be at least 1');
        }
      }
      
      // Generate modules
      const modules = [];
      let sequenceNum = 1;
      
      buildings.forEach((bldg, bldgIndex) => {
        const buildingNum = bldgIndex + 1;
        const levelCount = Math.abs(bldg.endLevel - bldg.startLevel) + 1;
        
        // Determine level order
        let levels = [];
        if (bldg.startLevel <= bldg.endLevel) {
          for (let l = bldg.startLevel; l <= bldg.endLevel; l++) {
            levels.push(l);
          }
        } else {
          for (let l = bldg.startLevel; l >= bldg.endLevel; l--) {
            levels.push(l);
          }
        }
        
        // Apply level build order
        if (bldg.levelOrder === 'topToBottom') {
          levels.sort((a, b) => b - a); // Highest first
        } else {
          levels.sort((a, b) => a - b); // Lowest first
        }
        
        // Generate modules: iterate stacks, then levels within each stack
        for (let stack = 1; stack <= bldg.stacks; stack++) {
          for (const level of levels) {
            const stackPadded = String(stack).padStart(2, '0');
            const blmId = `B${buildingNum}L${level}M${stackPadded}`;
            
            modules.push({
              id: crypto.randomUUID(),
              project_id: projectId,
              blm_id: blmId,
              hitch_blm: blmId,
              rear_blm: blmId, // Same as hitch (not sawbox by default)
              serial_number: '', // Left blank
              building: buildingNum,
              building_name: bldg.name,
              level: level,
              stack: stack,
              unit_type: '',
              build_sequence: sequenceNum,
              set_sequence: null,
              difficulty_tags: [],
              notes: ''
            });
            
            sequenceNum++;
          }
        }
      });
      
      await onGenerate({
        buildings,
        modules
      });
    } catch (err) {
      setError(err.message || 'Failed to generate modules');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Setup Production Sequence</h2>
            <p className="text-sm text-gray-500 mt-1">{projectName}</p>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Existing modules warning */}
          {existingModuleCount > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    This project has {existingModuleCount} existing modules
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    You can import them or generate new modules (existing will be preserved).
                  </p>
                  <button
                    onClick={onImportExisting}
                    className="mt-2 text-sm font-medium text-amber-700 hover:text-amber-900 underline"
                  >
                    Import existing modules
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Buildings Section */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Buildings</h3>
            
            <div className="space-y-4">
              {buildings.map((bldg, index) => (
                <div 
                  key={bldg.id}
                  className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  {/* Building card header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-600">Building Name:</label>
                      <input
                        type="text"
                        value={bldg.name}
                        onChange={(e) => handleBuildingChange(bldg.id, 'name', e.target.value)}
                        placeholder="A, B, 1..."
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    {buildings.length > 1 && (
                      <button
                        onClick={() => handleRemoveBuilding(bldg.id)}
                        className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Remove
                      </button>
                    )}
                  </div>
                  
                  {/* Building config fields */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Number of Stacks</label>
                      <input
                        type="number"
                        value={bldg.stacks}
                        onChange={(e) => handleBuildingChange(bldg.id, 'stacks', e.target.value)}
                        min="1"
                        max="100"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Starting Level</label>
                      <input
                        type="number"
                        value={bldg.startLevel}
                        onChange={(e) => handleBuildingChange(bldg.id, 'startLevel', e.target.value)}
                        min="1"
                        max="20"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Ending Level</label>
                      <input
                        type="number"
                        value={bldg.endLevel}
                        onChange={(e) => handleBuildingChange(bldg.id, 'endLevel', e.target.value)}
                        min="1"
                        max="20"
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Level Build Order</label>
                      <select
                        value={bldg.levelOrder}
                        onChange={(e) => handleBuildingChange(bldg.id, 'levelOrder', e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="topToBottom">Top → Bottom</option>
                        <option value="bottomToTop">Bottom → Top</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Building actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-500">
                      {Math.abs(bldg.endLevel - bldg.startLevel) + 1} levels × {bldg.stacks} stacks = {(Math.abs(bldg.endLevel - bldg.startLevel) + 1) * bldg.stacks} modules
                    </span>
                    <button
                      onClick={() => setSetOrderBuilding(bldg)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      Define Set Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Add Building button */}
            <button
              onClick={handleAddBuilding}
              className="mt-3 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Building
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold text-gray-900">{totalModules}</span> modules will be generated
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || totalModules === 0}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  Generate Module Grid
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Set Order Modal */}
      {setOrderBuilding && window.SetOrderModal && (
        <window.SetOrderModal
          building={setOrderBuilding}
          onClose={() => setSetOrderBuilding(null)}
          onSave={(setOrder) => {
            // Store set order for this building (can be used during generation)
            handleBuildingChange(setOrderBuilding.id, 'setOrder', setOrder);
            setSetOrderBuilding(null);
          }}
        />
      )}
    </div>
  );
}

// Expose to window for script tag usage
window.SetupDialog = SetupDialog;
