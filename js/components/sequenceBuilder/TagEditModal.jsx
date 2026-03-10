/**
 * TagEditModal.jsx
 * Modal for editing difficulty tags on a single module
 */

const { useState, useCallback } = React;

function TagEditModal({
  module,
  onSave,
  onClose
}) {
  const [selectedTags, setSelectedTags] = useState(module.difficulty_tags || []);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Difficulty tags with colors
  const difficultyTags = [
    { id: 'ext_sidewall', name: 'Ext Sidewall', color: '#ef4444', description: 'External sidewall module' },
    { id: 'stair', name: 'Stair', color: '#f97316', description: 'Contains stairwell' },
    { id: '3hr_wall', name: '3HR-Wall', color: '#eab308', description: '3-hour fire rated wall' },
    { id: 'short', name: 'Short', color: '#22c55e', description: 'Shorter than standard height' },
    { id: 'dbl_studio', name: 'Dbl Studio', color: '#3b82f6', description: 'Double studio unit' },
    { id: 'sawbox', name: 'Sawbox', color: '#8b5cf6', description: 'Sawbox configuration' },
    { id: 'ada', name: 'ADA', color: '#06b6d4', description: 'ADA accessible unit' },
    { id: 'corner', name: 'Corner', color: '#ec4899', description: 'Corner module' },
    { id: 'penthouse', name: 'Penthouse', color: '#14b8a6', description: 'Penthouse level' },
    { id: 'mep_heavy', name: 'MEP Heavy', color: '#f59e0b', description: 'Heavy MEP requirements' },
  ];

  // Toggle tag selection
  const toggleTag = useCallback((tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  }, []);

  // Clear all tags
  const clearAll = useCallback(() => {
    setSelectedTags([]);
  }, []);

  // Handle save
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await onSave(module.id, selectedTags);
    } catch (err) {
      setError(err.message || 'Failed to save tags');
      setIsSaving(false);
    }
  };

  // Check if tags changed
  const hasChanges = JSON.stringify(selectedTags.sort()) !== JSON.stringify((module.difficulty_tags || []).sort());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Difficulty Tags</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {module.serial_number} {module.blm_id && `(${module.blm_id})`}
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">
              Select Tags
            </label>
            {selectedTags.length > 0 && (
              <button
                onClick={clearAll}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="space-y-2">
            {difficultyTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                  selectedTags.includes(tag.id)
                    ? 'border-transparent bg-opacity-20'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                style={selectedTags.includes(tag.id) ? { 
                  backgroundColor: `${tag.color}20`,
                  borderColor: tag.color 
                } : {}}
              >
                {/* Checkbox indicator */}
                <div 
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedTags.includes(tag.id) ? 'border-current' : 'border-gray-300'
                  }`}
                  style={selectedTags.includes(tag.id) ? { borderColor: tag.color, color: tag.color } : {}}
                >
                  {selectedTags.includes(tag.id) && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Tag color dot */}
                <span 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />

                {/* Tag info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{tag.name}</div>
                  <div className="text-xs text-gray-500 truncate">{tag.description}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Selected count */}
          <div className="mt-4 text-sm text-gray-500">
            {selectedTags.length === 0 
              ? 'No tags selected'
              : `${selectedTags.length} tag${selectedTags.length !== 1 ? 's' : ''} selected`
            }
          </div>

          {/* Error display */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
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
              'Save Tags'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Expose to window for script tag usage
window.TagEditModal = TagEditModal;
