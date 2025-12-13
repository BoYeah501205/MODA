// ============================================================================
// QA INSPECTION MODAL - Quick inspection entry from Weekly Board
// Opens when QA role clicks "Log QA Inspection" on module card
// Temporary prompt until full traveler linkage is implemented
// ============================================================================

function QAInspectionModal({ module, station, onClose, onSave, currentUser }) {
    const [formData, setFormData] = React.useState({
        inspectionType: 'general',
        result: 'PASS',
        notes: '',
        department: ''
    });
    
    const inspectionTypes = [
        { id: 'general', label: 'General Inspection' },
        { id: 'stop-station', label: 'Stop Station Approval' },
        { id: 'deviation', label: 'Log Deviation/NC' }
    ];
    
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            moduleId: module.id,
            moduleName: module.name || module.serialNumber,
            projectId: module.projectId,
            station: station?.name || station,
            inspector: currentUser?.name || 'QA Inspector',
            timestamp: new Date().toISOString()
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="p-4 border-b" style={{ backgroundColor: 'var(--autovol-teal)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Log QA Inspection</h3>
                            <p className="text-sm text-teal-100">
                                {module?.name || module?.serialNumber} at {station?.name || station}
                            </p>
                        </div>
                        <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">&times;</button>
                    </div>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Module Info */}
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-gray-500">Module:</span>
                                <span className="ml-2 font-medium">{module?.name || module?.serialNumber}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Station:</span>
                                <span className="ml-2 font-medium">{station?.name || station}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Project:</span>
                                <span className="ml-2 font-medium">{module?.projectName || '-'}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Inspection Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Inspection Type</label>
                        <div className="space-y-2">
                            {inspectionTypes.map(type => (
                                <label key={type.id} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="inspectionType"
                                        value={type.id}
                                        checked={formData.inspectionType === type.id}
                                        onChange={(e) => setFormData({...formData, inspectionType: e.target.value})}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm">{type.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    
                    {/* Result (for general inspection) */}
                    {formData.inspectionType !== 'deviation' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Result</label>
                            <div className="flex gap-2">
                                {['PASS', 'NC', 'N/A'].map(result => (
                                    <button
                                        key={result}
                                        type="button"
                                        onClick={() => setFormData({...formData, result})}
                                        className={`flex-1 py-2 rounded-lg font-medium text-sm transition ${
                                            formData.result === result
                                                ? result === 'PASS' ? 'bg-green-500 text-white'
                                                : result === 'NC' ? 'bg-red-500 text-white'
                                                : 'bg-gray-500 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {result}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {formData.inspectionType === 'deviation' ? 'Deviation Description *' : 'Notes'}
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            rows="3"
                            placeholder={formData.inspectionType === 'deviation' 
                                ? 'Describe the non-conformance...' 
                                : 'Optional inspection notes...'}
                            required={formData.inspectionType === 'deviation'}
                        />
                    </div>
                    
                    {/* Info Note */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                        <strong>Note:</strong> This is a temporary inspection log. Full traveler integration 
                        will link inspections directly to the QA Traveler system.
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 rounded-lg text-white"
                            style={{ backgroundColor: 'var(--autovol-teal)' }}
                        >
                            Log Inspection
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

window.QAInspectionModal = QAInspectionModal;
