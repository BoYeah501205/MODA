/**
 * BulkEditModal.jsx
 * Modal for bulk editing selected modules - change building, level, unit type, tags
 */

const { useState, useCallback } = React;

function BulkEditModal({
  selectedModules,
  onApply,
  onClose
}) {
  const [field, setField] = useState('');
  const [value, setValue] = useState('');
  const [tagMode, setTagMode] = useState('replace'); // replace, add, remove
  const [selectedTags, setSelectedTags] = useState([]);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState(null);

  // Available fields for bulk edit
  const fields = [
    { id: 'building', label: 'Building', type: 'number' },
    { id: 'level', label: 'Level', type: 'number' },
    { id: 'unit_type', label: 'Unit Type', type: 'select' },
    { id: 'difficulty_tags', label: 'Difficulty Tags', type: 'tags' },
    { id: 'notes', label: 'Notes', type: 'text' },
  ];

  // Unit type options
  const unitTypes = [
    'Studio', '1BR', '1BR+Den', '2BR', '2BR+Den', '3BR',
    'Corridor', 'Stair', 'Elevator', 'Mechanical', 'Common', 'Other'
  ];

  // Difficulty tags
  const difficultyTags = [
    { id: 'ext_sidewall', name: 'Ext Sidewall', color: '#ef4444' },
    { id: 'stair', name: 'Stair', color: '#f97316' },
    { id: '3hr_wall', name: '3HR-Wall', color: '#eab308' },
    { id: 'short', name: 'Short', color: '#22c55e' },
    { id: 'dbl_studio', name: 'Dbl Studio', color: '#3b82f6' },
    { id: 'sawbox', name: 'Sawbox', color: '#8b5cf6' },
    { id: 'ada', name: 'ADA', color: '#06b6d4' },
    { id: 'corner', name: 'Corner', color: '#ec4899' },
    { id: 'penthouse', name: 'Penthouse', color: '#14b8a6' },
    { id: 'mep_heavy', name: 'MEP Heavy', color: '#f59e0b' },
  ];

  // Toggle tag selection
  const toggleTag = useCallback((tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  }, []);

  // Handle apply
  const handleApply = async () => {
    if (!field) {
      setError('Please select a field to edit');
      return;
    }

    const selectedField = fields.find(f => f.id === field);
    
    if (selectedField.type === 'tags') {
      if (selectedTags.length === 0) {
        setError('Please select at least one tag');
        return;
      }
    } else if (!value && value !== 0) {
      setError('Please enter a value');
      return;
    }

    setIsApplying(true);
    setError(null);

    try {
      const updates = {};
      
      if (selectedField.type === 'tags') {
        updates.difficulty_tags = selectedTags;
        updates._tagMode = tagMode;
      } else if (selectedField.type === 'number') {
        updates[field] = parseInt(value, 10);
      } else {
        updates[field] = value;
      }

      await onApply(updates);
    } catch (err) {
      setError(err.message || 'Failed to apply changes');
      setIsApplying(false);
    }
  };

  // Get current field config
  const currentField = fields.find(f => f.id === field);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bulk Edit</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {selectedModules.length} module{selectedModules.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Field Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field to Edit
            </label>
            <select
              value={field}
              onChange={(e) => {
                setField(e.target.value);
                setValue('');
                setSelectedTags([]);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a field...</option>
              {fields.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Value Input - varies by field type */}
          {currentField && currentField.type === 'number' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Value
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {currentField && currentField.type === 'text' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Value
              </label>
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {currentField && currentField.type === 'select' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Value
              </label>
              <select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select...</option>
                {unitTypes.map(ut => (
                  <option key={ut} value={ut}>{ut}</option>
                ))}
              </select>
            </div>
          )}

          {currentField && currentField.type === 'tags' && (
            <div>
              {/* Tag Mode */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag Action
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTagMode('replace')}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      tagMode === 'replace' 
                        ? 'bg-blue-50 border-blue-300 text-blue-700' 
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Replace
                  </button>
                  <button
                    onClick={() => setTagMode('add')}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      tagMode === 'add' 
                        ? 'bg-green-50 border-green-300 text-green-700' 
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setTagMode('remove')}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      tagMode === 'remove' 
                        ? 'bg-red-50 border-red-300 text-red-700' 
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Tag Selection */}
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {difficultyTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                      selectedTags.includes(tag.id)
                        ? 'border-transparent text-white'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                    style={selectedTags.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
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
            onClick={handleApply}
            disabled={isApplying || !field}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isApplying ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Applying...
              </>
            ) : (
              'Apply to Selected'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Expose to window for script tag usage
window.BulkEditModal = BulkEditModal;
