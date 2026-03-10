/**
 * ProductionSequenceBuilder.jsx
 * Main page component that composes all sequence builder sub-components
 */

const { useState, useEffect, useCallback, useMemo } = React;

function ProductionSequenceBuilder({
  projectId,
  projectName,
  onClose
}) {
  // Data state
  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Workflow state
  const [currentStep, setCurrentStep] = useState('setup');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal states
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showSetOrderModal, setShowSetOrderModal] = useState(false);
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  
  // History for undo/redo (simplified - stores last 10 states)
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Load modules on mount
  useEffect(() => {
    loadModules();
  }, [projectId]);

  // Load modules from Supabase
  const loadModules = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const API = window.SequenceBuilderAPI;
      if (!API) {
        throw new Error('SequenceBuilderAPI not loaded');
      }
      
      const data = await API.fetchProjectModules(projectId);
      setModules(data);
      
      // Determine initial step based on data
      if (data.length === 0) {
        setCurrentStep('setup');
        setShowSetupDialog(true);
      } else if (data.every(m => m.build_sequence == null)) {
        setCurrentStep('sequence');
      } else if (data.every(m => (m.difficulty_tags || []).length === 0)) {
        setCurrentStep('tags');
      } else {
        setCurrentStep('review');
      }
    } catch (err) {
      console.error('Failed to load modules:', err);
      setError(err.message || 'Failed to load modules');
    } finally {
      setIsLoading(false);
    }
  };

  // Save snapshot to history
  const saveToHistory = useCallback((newModules) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.stringify(newModules));
      // Keep only last 10 states
      if (newHistory.length > 10) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 9));
  }, [historyIndex]);

  // Handle modules change
  const handleModulesChange = useCallback((newModules) => {
    saveToHistory(modules);
    setModules(newModules);
    setHasUnsavedChanges(true);
    
    // Update step based on progress
    if (newModules.length > 0 && currentStep === 'setup') {
      setCurrentStep('sequence');
    }
  }, [modules, currentStep, saveToHistory]);

  // Handle module update
  const handleModuleUpdate = useCallback(async (moduleId, updates) => {
    const API = window.SequenceBuilderAPI;
    
    // Ensure integer sequences
    if (updates.build_sequence !== undefined && updates.build_sequence !== null) {
      updates.build_sequence = Math.round(updates.build_sequence);
    }
    if (updates.set_sequence !== undefined && updates.set_sequence !== null) {
      updates.set_sequence = Math.round(updates.set_sequence);
    }
    
    await API.updateModule(moduleId, updates);
    
    // Refresh modules
    const refreshed = await API.fetchProjectModules(projectId);
    handleModulesChange(refreshed);
  }, [projectId, handleModulesChange]);

  // Handle module delete
  const handleModuleDelete = useCallback(async (moduleId) => {
    const confirmed = window.confirm('Are you sure you want to delete this module?');
    if (!confirmed) return;
    
    const API = window.SequenceBuilderAPI;
    await API.deleteModule(moduleId);
    
    // Refresh modules
    const refreshed = await API.fetchProjectModules(projectId);
    handleModulesChange(refreshed);
  }, [projectId, handleModulesChange]);

  // Handle generate from setup dialog
  const handleGenerate = useCallback(async (config) => {
    const API = window.SequenceBuilderAPI;
    await API.generateModulesFromConfig(projectId, config);
    
    // Refresh modules
    const refreshed = await API.fetchProjectModules(projectId);
    handleModulesChange(refreshed);
    
    setShowSetupDialog(false);
    setCurrentStep('sequence');
  }, [projectId, handleModulesChange]);

  // Handle import existing modules
  const handleImportExisting = useCallback(() => {
    setShowSetupDialog(false);
    setCurrentStep('sequence');
  }, []);

  // Handle set order save
  const handleSetOrderSave = useCallback(async (updates) => {
    const API = window.SequenceBuilderAPI;
    await API.updateSetSequences(updates);
    
    // Refresh modules
    const refreshed = await API.fetchProjectModules(projectId);
    handleModulesChange(refreshed);
    
    setShowSetOrderModal(false);
  }, [projectId, handleModulesChange]);

  // Handle add module
  const handleAddModule = useCallback(async (moduleData) => {
    const API = window.SequenceBuilderAPI;
    await API.createModule(moduleData);
    
    // Refresh modules
    const refreshed = await API.fetchProjectModules(projectId);
    handleModulesChange(refreshed);
    
    setShowAddModuleModal(false);
  }, [projectId, handleModulesChange]);

  // Handle export
  const handleExport = useCallback(async (format) => {
    const API = window.SequenceBuilderAPI;
    const result = await API.exportModules(projectId, format);
    
    // Download file
    const blob = new Blob([result.data], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [projectId]);

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    
    try {
      // Validate before saving
      const API = window.SequenceBuilderAPI;
      const validation = API.validateModules(modules);
      
      if (!validation.valid) {
        const errorMessages = validation.errors.slice(0, 3).map(e => e.message).join('\n');
        alert(`Validation errors:\n${errorMessages}`);
        setIsSaving(false);
        return;
      }
      
      // Fix any decimal sequences
      await API.fixDecimalSequences(projectId);
      
      // Refresh to get fixed data
      const refreshed = await API.fetchProjectModules(projectId);
      setModules(refreshed);
      
      // Save build sequence history snapshot
      if (window.MODA_SEQUENCE_HISTORY?.saveSnapshot) {
        try {
          await window.MODA_SEQUENCE_HISTORY.saveSnapshot(
            projectId,
            refreshed,
            'manual_build',
            'Production sequence built in MODA',
            { id: null, name: 'Sequence Builder' }
          );
          console.log('[ProductionSequenceBuilder] Saved sequence history snapshot');
        } catch (historyErr) {
          console.warn('[ProductionSequenceBuilder] Failed to save history snapshot:', historyErr);
        }
      }
      
      setHasUnsavedChanges(false);
      setCurrentStep('review');
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  }, [modules, projectId]);

  // Handle back
  const handleBack = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S to save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && !isSaving) {
          handleSave();
        }
      }
      
      // Escape to close modals or go back
      if (e.key === 'Escape') {
        if (showSetupDialog) setShowSetupDialog(false);
        else if (showSetOrderModal) setShowSetOrderModal(false);
        else if (showAddModuleModal) setShowAddModuleModal(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, isSaving, handleSave, showSetupDialog, showSetOrderModal, showAddModuleModal]);

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-50">
        <div className="text-center">
          <svg className="animate-spin w-12 h-12 text-blue-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-gray-600">Loading sequence builder...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-4 text-center">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadModules}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col z-50">
      {/* Header */}
      {window.SequenceBuilderHeader && (
        <window.SequenceBuilderHeader
          projectName={projectName}
          currentStep={currentStep}
          moduleCount={modules.length}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          onBack={handleBack}
          onSave={handleSave}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-6">
        {modules.length === 0 && !showSetupDialog ? (
          // Empty state
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Modules Yet</h2>
              <p className="text-gray-500 mb-6">Get started by generating modules or importing existing data.</p>
              <button
                onClick={() => setShowSetupDialog(true)}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                Setup Modules
              </button>
            </div>
          </div>
        ) : (
          // Module grid
          window.ModuleGrid && (
            <window.ModuleGrid
              modules={modules}
              projectId={projectId}
              onModuleUpdate={handleModuleUpdate}
              onModuleDelete={handleModuleDelete}
              onModulesChange={handleModulesChange}
              onShowSetOrder={() => setShowSetOrderModal(true)}
              onShowAddModule={() => setShowAddModuleModal(true)}
              onExport={handleExport}
            />
          )
        )}
      </div>

      {/* Setup Dialog */}
      {showSetupDialog && window.SetupDialog && (
        <window.SetupDialog
          projectId={projectId}
          projectName={projectName}
          onGenerate={handleGenerate}
          onImportExisting={handleImportExisting}
          onClose={() => setShowSetupDialog(false)}
          existingModuleCount={modules.length}
        />
      )}

      {/* Set Order Modal */}
      {showSetOrderModal && window.SetOrderModal && (
        <window.SetOrderModal
          modules={modules}
          onSave={handleSetOrderSave}
          onClose={() => setShowSetOrderModal(false)}
        />
      )}

      {/* Add Module Modal */}
      {showAddModuleModal && window.AddModuleModal && (
        <window.AddModuleModal
          projectId={projectId}
          existingModules={modules}
          onAdd={handleAddModule}
          onClose={() => setShowAddModuleModal(false)}
        />
      )}
    </div>
  );
}

// Expose to window for script tag usage
window.ProductionSequenceBuilder = ProductionSequenceBuilder;
