/**
 * SetupDialog.jsx
 * Initial setup dialog for configuring buildings, levels, and module generation
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
  // Building configuration state
  const [numBuildings, setNumBuildings] = useState(1);
  const [buildingConfigs, setBuildingConfigs] = useState([
    { building: 1, levels: 4, modulesPerLevel: 10 }
  ]);
  
  // Serial number configuration
  const [serialPrefix, setSerialPrefix] = useState('');
  const [startingSerial, setStartingSerial] = useState(1);
  
  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate total modules
  const totalModules = buildingConfigs.reduce((sum, config) => {
    return sum + (config.levels * config.modulesPerLevel);
  }, 0);

  // Handle building count change
  const handleBuildingCountChange = useCallback((count) => {
    const newCount = Math.max(1, Math.min(10, parseInt(count) || 1));
    setNumBuildings(newCount);
    
    // Adjust building configs array
    const newConfigs = [...buildingConfigs];
    while (newConfigs.length < newCount) {
      newConfigs.push({
        building: newConfigs.length + 1,
        levels: 4,
        modulesPerLevel: 10
      });
    }
    while (newConfigs.length > newCount) {
      newConfigs.pop();
    }
    setBuildingConfigs(newConfigs);
  }, [buildingConfigs]);

  // Handle individual building config change
  const handleConfigChange = useCallback((index, field, value) => {
    const newConfigs = [...buildingConfigs];
    newConfigs[index] = {
      ...newConfigs[index],
      [field]: Math.max(1, parseInt(value) || 1)
    };
    setBuildingConfigs(newConfigs);
  }, [buildingConfigs]);

  // Apply same config to all buildings
  const applyToAll = useCallback(() => {
    if (buildingConfigs.length === 0) return;
    const template = buildingConfigs[0];
    const newConfigs = buildingConfigs.map((config, index) => ({
      ...config,
      levels: template.levels,
      modulesPerLevel: template.modulesPerLevel
    }));
    setBuildingConfigs(newConfigs);
  }, [buildingConfigs]);

  // Handle generate
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      await onGenerate({
        buildingConfigs,
        serialPrefix: serialPrefix.trim(),
        startingSerial
      });
    } catch (err) {
      setError(err.message || 'Failed to generate modules');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
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

          {/* Building Count */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Buildings
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleBuildingCountChange(numBuildings - 1)}
                disabled={numBuildings <= 1}
                className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                -
              </button>
              <input
                type="number"
                value={numBuildings}
                onChange={(e) => handleBuildingCountChange(e.target.value)}
                min="1"
                max="10"
                className="w-20 text-center border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={() => handleBuildingCountChange(numBuildings + 1)}
                disabled={numBuildings >= 10}
                className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          </div>

          {/* Building Configurations */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Building Configuration
              </label>
              {numBuildings > 1 && (
                <button
                  onClick={applyToAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Apply Building 1 settings to all
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {buildingConfigs.map((config, index) => (
                <div 
                  key={config.building}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm font-medium text-gray-700 w-24">
                    Building {config.building}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Levels:</label>
                    <input
                      type="number"
                      value={config.levels}
                      onChange={(e) => handleConfigChange(index, 'levels', e.target.value)}
                      min="1"
                      max="20"
                      className="w-16 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Modules/Level:</label>
                    <input
                      type="number"
                      value={config.modulesPerLevel}
                      onChange={(e) => handleConfigChange(index, 'modulesPerLevel', e.target.value)}
                      min="1"
                      max="100"
                      className="w-16 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <span className="text-sm text-gray-500 ml-auto">
                    = {config.levels * config.modulesPerLevel} modules
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-4"
          >
            <svg 
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Advanced Options
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number Prefix (optional)
                </label>
                <input
                  type="text"
                  value={serialPrefix}
                  onChange={(e) => setSerialPrefix(e.target.value)}
                  placeholder="e.g., MOD, PRJ-001"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Preview: {serialPrefix ? `${serialPrefix}-001` : '001'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Starting Serial Number
                </label>
                <input
                  type="number"
                  value={startingSerial}
                  onChange={(e) => setStartingSerial(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

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
                'Generate Modules'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Expose to window for script tag usage
window.SetupDialog = SetupDialog;
