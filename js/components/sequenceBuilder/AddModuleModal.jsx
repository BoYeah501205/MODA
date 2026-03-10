/**
 * AddModuleModal.jsx
 * Modal for adding a new module manually
 */

const { useState, useCallback } = React;

function AddModuleModal({
  projectId,
  existingModules,
  onAdd,
  onClose
}) {
  const [formData, setFormData] = useState({
    serial_number: '',
    blm_id: '',
    unit_type: '',
    building: 1,
    level: 1,
    build_sequence: '',
    notes: ''
  });
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);

  // Unit type options
  const unitTypes = [
    'Studio', '1BR', '1BR+Den', '2BR', '2BR+Den', '3BR',
    'Corridor', 'Stair', 'Elevator', 'Mechanical', 'Common', 'Other'
  ];

  // Handle form field change
  const handleChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  }, []);

  // Auto-generate BLM from building/level
  const generateBLM = useCallback(() => {
    const { building, level } = formData;
    // Find next available module number for this building/level
    const existingBLMs = existingModules
      .filter(m => m.building === building && m.level === level)
      .map(m => {
        const match = m.blm_id?.match(/M(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      });
    
    const nextModule = existingBLMs.length > 0 ? Math.max(...existingBLMs) + 1 : 1;
    const blm = `B${building}L${level}M${String(nextModule).padStart(2, '0')}`;
    
    setFormData(prev => ({ ...prev, blm_id: blm }));
  }, [formData.building, formData.level, existingModules]);

  // Validate form
  const validate = useCallback(() => {
    if (!formData.serial_number.trim()) {
      return 'Serial number is required';
    }
    
    // Check for duplicate serial
    if (existingModules.some(m => m.serial_number === formData.serial_number.trim())) {
      return 'Serial number already exists';
    }
    
    // Check for duplicate BLM if provided
    if (formData.blm_id && existingModules.some(m => m.blm_id === formData.blm_id)) {
      return 'BLM ID already exists';
    }
    
    // Validate BLM format if provided
    if (formData.blm_id && !/^B\d+L\d+M\d+$/i.test(formData.blm_id)) {
      return 'BLM must follow format: B1L2M01';
    }
    
    return null;
  }, [formData, existingModules]);

  // Handle add
  const handleAdd = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      const moduleData = {
        project_id: projectId,
        serial_number: formData.serial_number.trim(),
        blm_id: formData.blm_id.trim() || null,
        unit_type: formData.unit_type || null,
        building: parseInt(formData.building, 10) || 1,
        level: parseInt(formData.level, 10) || 1,
        build_sequence: formData.build_sequence ? parseInt(formData.build_sequence, 10) : null,
        set_sequence: null,
        difficulty_tags: [],
        notes: formData.notes.trim() || null
      };

      await onAdd(moduleData);
    } catch (err) {
      setError(err.message || 'Failed to add module');
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Add Module</h2>
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
          {/* Serial Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Serial Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.serial_number}
              onChange={(e) => handleChange('serial_number', e.target.value)}
              placeholder="e.g., 001 or MOD-001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Building & Level */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Building
              </label>
              <input
                type="number"
                value={formData.building}
                onChange={(e) => handleChange('building', e.target.value)}
                min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Level
              </label>
              <input
                type="number"
                value={formData.level}
                onChange={(e) => handleChange('level', e.target.value)}
                min="1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* BLM ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              BLM ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.blm_id}
                onChange={(e) => handleChange('blm_id', e.target.value.toUpperCase())}
                placeholder="e.g., B1L2M01"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={generateBLM}
                className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg border border-blue-200"
              >
                Auto
              </button>
            </div>
          </div>

          {/* Unit Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Type
            </label>
            <select
              value={formData.unit_type}
              onChange={(e) => handleChange('unit_type', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select...</option>
              {unitTypes.map(ut => (
                <option key={ut} value={ut}>{ut}</option>
              ))}
            </select>
          </div>

          {/* Build Sequence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Build Sequence
            </label>
            <input
              type="number"
              value={formData.build_sequence}
              onChange={(e) => handleChange('build_sequence', e.target.value)}
              min="1"
              placeholder="Optional - assign later"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

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
            onClick={handleAdd}
            disabled={isAdding}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isAdding ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Adding...
              </>
            ) : (
              'Add Module'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Expose to window for script tag usage
window.AddModuleModal = AddModuleModal;
