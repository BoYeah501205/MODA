/**
 * SawboxMergeModal.jsx
 * Modal for merging two modules into a sawbox configuration
 * User selects which module is Hitch and which is Rear
 */

const { useState } = React;

function SawboxMergeModal({ modules, onMerge, onClose }) {
  // modules should be exactly 2 modules
  const [module1, module2] = modules;
  
  // State: which module is hitch (the one that stays)
  const [hitchId, setHitchId] = useState(module1?.id);
  
  if (!module1 || !module2) {
    return null;
  }
  
  const rearId = hitchId === module1.id ? module2.id : module1.id;
  const hitchModule = hitchId === module1.id ? module1 : module2;
  const rearModule = hitchId === module1.id ? module2 : module1;

  const handleConfirm = () => {
    onMerge(hitchId, rearId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Merge as Sawbox</h2>
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
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-4">
            Select which module will be the <strong>Hitch</strong> (keeps its row) and which will be the <strong>Rear</strong> (merged in, row removed).
          </p>
          
          {/* Option A */}
          <label 
            className={`block p-4 border rounded-lg mb-3 cursor-pointer transition-colors ${
              hitchId === module1.id 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="hitchSelection"
                checked={hitchId === module1.id}
                onChange={() => setHitchId(module1.id)}
                className="w-4 h-4 text-purple-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium text-gray-900">
                    <span className="text-purple-600">Hitch:</span> {module1.blm_id}
                  </span>
                  <span className="text-gray-500">→</span>
                  <span className="font-medium text-gray-900">
                    <span className="text-gray-500">Rear:</span> {module2.blm_id}
                  </span>
                </div>
                {module1.serial_number && (
                  <div className="text-xs text-gray-500 mt-1">
                    Serial: {module1.serial_number}
                  </div>
                )}
              </div>
            </div>
          </label>
          
          {/* Option B */}
          <label 
            className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
              hitchId === module2.id 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="hitchSelection"
                checked={hitchId === module2.id}
                onChange={() => setHitchId(module2.id)}
                className="w-4 h-4 text-purple-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium text-gray-900">
                    <span className="text-purple-600">Hitch:</span> {module2.blm_id}
                  </span>
                  <span className="text-gray-500">→</span>
                  <span className="font-medium text-gray-900">
                    <span className="text-gray-500">Rear:</span> {module1.blm_id}
                  </span>
                </div>
                {module2.serial_number && (
                  <div className="text-xs text-gray-500 mt-1">
                    Serial: {module2.serial_number}
                  </div>
                )}
              </div>
            </div>
          </label>

          {/* Preview */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-medium text-gray-500 uppercase mb-2">Result Preview</div>
            <div className="text-sm">
              <span className="font-medium text-gray-900">{hitchModule.blm_id}</span>
              <span className="text-gray-500 mx-2">+</span>
              <span className="font-medium text-gray-900">{rearModule.blm_id}</span>
              <span className="text-gray-500 mx-2">=</span>
              <span className="font-semibold text-purple-700">Sawbox Module</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              The rear module row will be removed from the grid.
            </div>
          </div>
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
            onClick={handleConfirm}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700"
          >
            Confirm Merge
          </button>
        </div>
      </div>
    </div>
  );
}

// Expose to window for script tag usage
window.SawboxMergeModal = SawboxMergeModal;
