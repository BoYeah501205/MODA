/**
 * SerialAssignModal.jsx
 * Modal for auto-assigning serial numbers to modules
 * Format: YY-XXXX (year prefix + 4-digit zero-padded number)
 */

const { useState, useMemo } = React;

function SerialAssignModal({ modules, onAssign, onClose }) {
  const [startingSerial, setStartingSerial] = useState('26-0001');
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Check if any modules already have serials
  const existingSerials = useMemo(() => {
    return modules.filter(m => m.serial_number && m.serial_number.trim() !== '');
  }, [modules]);
  
  const hasExistingSerials = existingSerials.length > 0;
  
  // Validate format
  const isValidFormat = /^\d{2}-\d{1,4}$/.test(startingSerial);
  
  // Preview what serials will be assigned
  const previewSerials = useMemo(() => {
    if (!isValidFormat) return [];
    
    const match = startingSerial.match(/^(\d{2})-(\d+)$/);
    if (!match) return [];
    
    const yearPrefix = match[1];
    const startNum = parseInt(match[2], 10);
    
    // Show first 3 and last 1
    const sorted = [...modules].sort((a, b) => (a.build_sequence || 999) - (b.build_sequence || 999));
    const preview = [];
    
    if (sorted.length <= 4) {
      sorted.forEach((m, idx) => {
        preview.push({
          blm: m.blm_id,
          serial: `${yearPrefix}-${String(startNum + idx).padStart(4, '0')}`
        });
      });
    } else {
      // First 3
      for (let i = 0; i < 3; i++) {
        preview.push({
          blm: sorted[i].blm_id,
          serial: `${yearPrefix}-${String(startNum + i).padStart(4, '0')}`
        });
      }
      // Ellipsis indicator
      preview.push({ blm: '...', serial: '...' });
      // Last one
      const lastIdx = sorted.length - 1;
      preview.push({
        blm: sorted[lastIdx].blm_id,
        serial: `${yearPrefix}-${String(startNum + lastIdx).padStart(4, '0')}`
      });
    }
    
    return preview;
  }, [modules, startingSerial, isValidFormat]);

  const handleAssign = async () => {
    if (!isValidFormat) return;
    
    setIsAssigning(true);
    try {
      await onAssign(startingSerial);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Auto-Assign Serial Numbers</h2>
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
          {/* Warning if existing serials */}
          {hasExistingSerials && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    {existingSerials.length} module{existingSerials.length !== 1 ? 's' : ''} already have serial numbers
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Proceeding will overwrite all existing serial numbers.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Starting Serial Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Starting Serial Number
            </label>
            <input
              type="text"
              value={startingSerial}
              onChange={(e) => setStartingSerial(e.target.value)}
              placeholder="26-0001"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                !isValidFormat && startingSerial ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: YY-XXXX (e.g., 26-0168 for year 2026, starting at 168)
            </p>
            {!isValidFormat && startingSerial && (
              <p className="text-xs text-red-600 mt-1">
                Invalid format. Use YY-XXXX
              </p>
            )}
          </div>
          
          {/* Preview */}
          {isValidFormat && previewSerials.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview ({modules.length} modules)
              </label>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                {previewSerials.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{p.blm}</span>
                    <span className="font-mono text-gray-900">{p.serial}</span>
                  </div>
                ))}
              </div>
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
            onClick={handleAssign}
            disabled={!isValidFormat || isAssigning}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isAssigning ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Assigning...
              </>
            ) : (
              `Assign to ${modules.length} Modules`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Expose to window for script tag usage
window.SerialAssignModal = SerialAssignModal;
