/**
 * MODA - Module Drawings Viewer Component
 * 
 * Displays shop drawing packages for a specific module.
 * Accessed via QR code scan: /drawings/module/{serialNumber}
 */

const { useState, useEffect } = React;

const ModuleDrawingsViewer = ({ serialNumber, onClose, auth }) => {
    // State
    const [moduleInfo, setModuleInfo] = useState(null);
    const [drawings, setDrawings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasDrawings, setHasDrawings] = useState(false);
    
    // Check if module drawings API is available
    const isAvailable = () => window.MODA_MODULE_DRAWINGS?.isAvailable?.();
    
    // Load module info and drawings
    useEffect(() => {
        const loadData = async () => {
            if (!serialNumber) {
                setError('No serial number provided');
                setIsLoading(false);
                return;
            }
            
            if (!isAvailable()) {
                setError('Module drawings system not available');
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            setError(null);
            
            try {
                // Load module info
                const info = await window.MODA_MODULE_DRAWINGS.getModuleInfo(serialNumber);
                
                if (!info) {
                    setError(`Module "${serialNumber}" not found`);
                    setIsLoading(false);
                    return;
                }
                
                setModuleInfo(info);
                
                // Check if module has drawings
                const hasDraws = await window.MODA_MODULE_DRAWINGS.hasDrawings(serialNumber);
                setHasDrawings(hasDraws);
                
                if (!hasDraws) {
                    setIsLoading(false);
                    return;
                }
                
                // Load drawings
                const drawingsList = await window.MODA_MODULE_DRAWINGS.getBySerialNumber(serialNumber);
                setDrawings(drawingsList);
                
            } catch (err) {
                console.error('[ModuleDrawingsViewer] Error loading data:', err);
                setError(err.message || 'Failed to load module drawings');
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
    }, [serialNumber]);
    
    // Handle view drawing
    const handleView = async (version) => {
        try {
            const url = await window.MODA_MODULE_DRAWINGS.getViewUrl(
                version.storage_path,
                version.sharepoint_file_id
            );
            if (url) {
                window.open(url, '_blank');
            }
        } catch (err) {
            console.error('[ModuleDrawingsViewer] Error viewing drawing:', err);
            alert('Failed to open drawing: ' + err.message);
        }
    };
    
    // Handle download drawing
    const handleDownload = async (version) => {
        try {
            const url = await window.MODA_MODULE_DRAWINGS.getDownloadUrl(
                version.storage_path,
                version.sharepoint_file_id
            );
            if (url) {
                window.open(url, '_blank');
            }
        } catch (err) {
            console.error('[ModuleDrawingsViewer] Error downloading drawing:', err);
            alert('Failed to download drawing: ' + err.message);
        }
    };
    
    // Get latest version for a drawing
    const getLatestVersion = (drawing) => {
        return window.MODA_MODULE_DRAWINGS.utils.getLatestVersion(drawing.versions);
    };
    
    // Format file size
    const formatFileSize = (bytes) => {
        return window.MODA_MODULE_DRAWINGS.utils.formatFileSize(bytes);
    };
    
    // Format date
    const formatDate = (dateString) => {
        return window.MODA_MODULE_DRAWINGS.utils.formatDate(dateString);
    };
    
    // Render loading state
    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md">
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="text-gray-600">Loading module drawings...</p>
                    </div>
                </div>
            </div>
        );
    }
    
    // Render error state
    if (error) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md">
                    <div className="flex items-start gap-4 mb-6">
                        <span className="icon-alert-circle w-8 h-8 text-red-600 flex-shrink-0"></span>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
                            <p className="text-gray-600">{error}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }
    
    // Render no drawings state
    if (!hasDrawings) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md">
                    <div className="text-center">
                        <span className="icon-file w-16 h-16 mx-auto mb-4 text-gray-300" style={{ display: 'block' }}></span>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">No Shop Drawings Found</h2>
                        <p className="text-gray-600 mb-4">
                            No shop drawing package exists for module <strong>{serialNumber}</strong>.
                        </p>
                        {moduleInfo && (
                            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                                <h3 className="font-medium text-gray-900 mb-2">Module Information</h3>
                                <div className="space-y-1 text-sm text-gray-600">
                                    <div><strong>Serial:</strong> {moduleInfo.serial_number}</div>
                                    {moduleInfo.blm_id && <div><strong>BLM:</strong> {moduleInfo.blm_id}</div>}
                                    {(moduleInfo.hitch_blm || moduleInfo.rear_blm) && (
                                        <div>
                                            <strong>Units:</strong> {moduleInfo.hitch_blm || '-'} / {moduleInfo.rear_blm || '-'}
                                        </div>
                                    )}
                                    <div><strong>Project:</strong> {moduleInfo.project_name}</div>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    // Render drawings list
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Shop Drawing Package</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Module {serialNumber}
                            {moduleInfo?.blm_id && ` - ${moduleInfo.blm_id}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    >
                        <span className="icon-x w-6 h-6"></span>
                    </button>
                </div>
                
                {/* Module Info Card */}
                {moduleInfo && (
                    <div className="p-6 bg-gray-50 border-b border-gray-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Serial Number</div>
                                <div className="font-medium text-gray-900">{moduleInfo.serial_number}</div>
                            </div>
                            {moduleInfo.blm_id && (
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">BLM ID</div>
                                    <div className="font-medium text-gray-900">{moduleInfo.blm_id}</div>
                                </div>
                            )}
                            {(moduleInfo.hitch_blm || moduleInfo.rear_blm) && (
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Units</div>
                                    <div className="font-medium text-gray-900">
                                        {moduleInfo.hitch_blm || '-'} / {moduleInfo.rear_blm || '-'}
                                    </div>
                                </div>
                            )}
                            <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Project</div>
                                <div className="font-medium text-gray-900">{moduleInfo.project_name}</div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Drawings List */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Drawings ({drawings.length})
                        </h3>
                    </div>
                    
                    {drawings.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No drawings found
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {drawings.map(drawing => {
                                const latestVersion = getLatestVersion(drawing);
                                
                                return (
                                    <div 
                                        key={drawing.id}
                                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="icon-file w-5 h-5 text-gray-400 flex-shrink-0"></span>
                                                    <h4 className="font-medium text-gray-900 truncate">
                                                        {drawing.name}
                                                    </h4>
                                                    {latestVersion && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                            v{latestVersion.version}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {drawing.description && (
                                                    <p className="text-sm text-gray-600 mb-2">{drawing.description}</p>
                                                )}
                                                
                                                {latestVersion && (
                                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        <span>{formatFileSize(latestVersion.file_size)}</span>
                                                        <span>•</span>
                                                        <span>Updated {formatDate(latestVersion.uploaded_at)}</span>
                                                        {latestVersion.uploaded_by && (
                                                            <>
                                                                <span>•</span>
                                                                <span>by {latestVersion.uploaded_by}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {latestVersion && (
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleView(latestVersion)}
                                                        className="px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                                                        title="View in Browser"
                                                    >
                                                        <span className="icon-eye w-4 h-4"></span>
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownload(latestVersion)}
                                                        className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                                                        title="Download"
                                                    >
                                                        <span className="icon-download w-4 h-4"></span>
                                                        Download
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Show all versions if more than one */}
                                        {drawing.versions.length > 1 && (
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                <details className="text-sm">
                                                    <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium">
                                                        {drawing.versions.length} version{drawing.versions.length !== 1 ? 's' : ''}
                                                    </summary>
                                                    <div className="mt-2 space-y-2">
                                                        {drawing.versions.map(version => (
                                                            <div 
                                                                key={version.id}
                                                                className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                                                            >
                                                                <div className="flex-1">
                                                                    <div className="font-medium text-gray-900">
                                                                        Version {version.version}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {formatDate(version.uploaded_at)}
                                                                        {version.notes && ` - ${version.notes}`}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => handleView(version)}
                                                                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition"
                                                                        title="View"
                                                                    >
                                                                        <span className="icon-eye w-4 h-4"></span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDownload(version)}
                                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                                                                        title="Download"
                                                                    >
                                                                        <span className="icon-download w-4 h-4"></span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </details>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
