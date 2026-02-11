/**
 * PermitPackageBrowser Component
 * 
 * Displays permit drawing packages with version tracking and compiled current view.
 * Features:
 * - View all package versions (full sets and updates)
 * - View compiled current sheets (latest version of each sheet)
 * - View individual sheet version history
 * - Upload new packages (full or update)
 * - Download individual sheets or compiled package
 */

const { useState, useEffect, useCallback, useMemo } = React;

function PermitPackageBrowser({
    projectId,
    discipline,
    disciplineName,
    onClose,
    auth
}) {
    // State
    const [activeTab, setActiveTab] = useState('current'); // 'current' | 'packages' | 'history'
    const [packages, setPackages] = useState([]);
    const [currentSheets, setCurrentSheets] = useState([]);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [selectedSheet, setSelectedSheet] = useState(null);
    const [sheetHistory, setSheetHistory] = useState([]);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);
    
    // Upload state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadType, setUploadType] = useState('update'); // 'full' | 'update'
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(null);
    
    // Check if permit sheets module is available
    const isAvailable = () => window.MODA_PERMIT_SHEETS?.isAvailable?.();
    
    // Load data
    const loadData = useCallback(async () => {
        if (!isAvailable() || !projectId || !discipline) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            const [pkgs, sheets, statsData] = await Promise.all([
                window.MODA_PERMIT_SHEETS.getPackages(projectId, discipline),
                window.MODA_PERMIT_SHEETS.getCurrentSheets(projectId, discipline),
                window.MODA_PERMIT_SHEETS.getStats(projectId, discipline)
            ]);
            
            setPackages(pkgs);
            setCurrentSheets(sheets);
            setStats(statsData);
        } catch (err) {
            console.error('[PermitPackageBrowser] Error loading data:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, discipline]);
    
    useEffect(() => {
        loadData();
    }, [loadData]);
    
    // Load sheet history when sheet selected
    const loadSheetHistory = useCallback(async (sheetNumber) => {
        if (!isAvailable() || !projectId || !sheetNumber) return;
        
        try {
            const history = await window.MODA_PERMIT_SHEETS.getSheetHistory(projectId, sheetNumber);
            setSheetHistory(history);
        } catch (err) {
            console.error('[PermitPackageBrowser] Error loading sheet history:', err);
        }
    }, [projectId]);
    
    // Handle package selection
    const handleSelectPackage = useCallback(async (pkg) => {
        if (!isAvailable()) return;
        
        try {
            const pkgWithSheets = await window.MODA_PERMIT_SHEETS.getPackageWithSheets(pkg.id);
            setSelectedPackage(pkgWithSheets);
        } catch (err) {
            console.error('[PermitPackageBrowser] Error loading package:', err);
        }
    }, []);
    
    // Handle sheet selection for history view
    const handleSelectSheet = useCallback((sheet) => {
        setSelectedSheet(sheet);
        loadSheetHistory(sheet.sheet_number);
        setActiveTab('history');
    }, [loadSheetHistory]);
    
    // Handle file upload
    const handleUpload = useCallback(async () => {
        if (!isAvailable() || !uploadFile || !projectId) return;
        
        setIsProcessing(true);
        setUploadProgress({ status: 'uploading', percent: 0 });
        
        try {
            // Get next version number
            const nextVersion = await window.MODA_PERMIT_SHEETS.getNextVersion(projectId, discipline);
            
            // Upload file to storage
            const storagePath = `permit-packages/${projectId}/${discipline}/${Date.now()}_${uploadFile.name}`;
            
            const { error: uploadError } = await window.MODA_SUPABASE.client.storage
                .from('drawings')
                .upload(storagePath, uploadFile, {
                    contentType: 'application/pdf'
                });
            
            if (uploadError) throw uploadError;
            
            setUploadProgress({ status: 'creating', percent: 30 });
            
            // Create package record
            const pkg = await window.MODA_PERMIT_SHEETS.createPackage({
                projectId,
                discipline,
                packageName: disciplineName || discipline,
                packageVersion: nextVersion,
                packageType: uploadType,
                storagePath,
                fileSize: uploadFile.size,
                uploadedBy: auth?.currentUser?.name || 'Unknown'
            });
            
            setUploadProgress({ status: 'processing', percent: 50 });
            
            // Process package (split PDF and OCR)
            await window.MODA_PERMIT_SHEETS.processPackage(pkg.id);
            
            setUploadProgress({ status: 'complete', percent: 100 });
            
            // Reload data
            await loadData();
            
            setShowUploadModal(false);
            setUploadFile(null);
            setUploadProgress(null);
            
        } catch (err) {
            console.error('[PermitPackageBrowser] Upload error:', err);
            setError(err.message);
            setUploadProgress(null);
        } finally {
            setIsProcessing(false);
        }
    }, [uploadFile, uploadType, projectId, discipline, disciplineName, auth, loadData]);
    
    // Download sheet
    const handleDownloadSheet = useCallback(async (sheet) => {
        if (!isAvailable()) return;
        
        try {
            await window.MODA_PERMIT_SHEETS.downloadSheet(sheet);
        } catch (err) {
            console.error('[PermitPackageBrowser] Download error:', err);
            setError(err.message);
        }
    }, []);
    
    // Download all current sheets
    const handleDownloadCurrent = useCallback(async () => {
        if (!isAvailable() || !projectId) return;
        
        try {
            await window.MODA_PERMIT_SHEETS.downloadCurrentSheets(projectId, discipline);
        } catch (err) {
            console.error('[PermitPackageBrowser] Download error:', err);
            setError(err.message);
        }
    }, [projectId, discipline]);
    
    // View sheet in new tab
    const handleViewSheet = useCallback((sheet) => {
        if (!isAvailable() || !sheet.storage_path) return;
        
        const url = window.MODA_PERMIT_SHEETS.getSheetUrl(sheet.storage_path);
        if (url) {
            window.open(url, '_blank');
        }
    }, []);
    
    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };
    
    // Render stats summary
    const renderStats = () => {
        if (!stats) return null;
        
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-700">{stats.currentSheets}</div>
                    <div className="text-sm text-blue-600">Current Sheets</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-700">{stats.totalPackages}</div>
                    <div className="text-sm text-green-600">Total Packages</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-amber-700">{stats.updatePackages}</div>
                    <div className="text-sm text-amber-600">Updates</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-700">{stats.sheetsWithUpdates}</div>
                    <div className="text-sm text-purple-600">Sheets Updated</div>
                </div>
            </div>
        );
    };
    
    // Render current sheets tab (compiled package)
    const renderCurrentSheets = () => {
        if (currentSheets.length === 0) {
            return (
                <div className="text-center py-12 text-gray-500">
                    <div className="text-lg mb-2">No sheets found</div>
                    <div className="text-sm">Upload a package to get started</div>
                </div>
            );
        }
        
        return (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-gray-600">
                        Showing latest version of each sheet ({currentSheets.length} sheets)
                    </div>
                    <button
                        onClick={handleDownloadCurrent}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                        Download All
                    </button>
                </div>
                
                <div className="bg-white rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Sheet #</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Title</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Rev</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">From Package</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {currentSheets.map((sheet) => (
                                <tr key={sheet.sheet_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono font-medium text-blue-600">
                                        {sheet.sheet_number}
                                    </td>
                                    <td className="px-4 py-3 text-gray-900">
                                        {sheet.sheet_title || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {sheet.revision ? (
                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                                                {sheet.revision}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {formatDate(sheet.revision_date)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                        {sheet.package_version}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleViewSheet(sheet)}
                                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                title="View"
                                            >
                                                <span className="icon-eye w-4 h-4"></span>
                                            </button>
                                            <button
                                                onClick={() => handleDownloadSheet(sheet)}
                                                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                                                title="Download"
                                            >
                                                <span className="icon-download w-4 h-4"></span>
                                            </button>
                                            <button
                                                onClick={() => handleSelectSheet(sheet)}
                                                className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                                                title="View History"
                                            >
                                                <span className="icon-history w-4 h-4"></span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };
    
    // Render packages tab
    const renderPackages = () => {
        if (packages.length === 0) {
            return (
                <div className="text-center py-12 text-gray-500">
                    <div className="text-lg mb-2">No packages uploaded</div>
                    <div className="text-sm">Upload a full package to get started</div>
                </div>
            );
        }
        
        return (
            <div className="space-y-4">
                {packages.map((pkg) => (
                    <div
                        key={pkg.id}
                        className={`bg-white rounded-lg border p-4 cursor-pointer hover:border-blue-300 transition-colors ${
                            selectedPackage?.id === pkg.id ? 'border-blue-500 ring-2 ring-blue-100' : ''
                        }`}
                        onClick={() => handleSelectPackage(pkg)}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{pkg.package_name}</span>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                        {pkg.package_version}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        pkg.package_type === 'full' 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {pkg.package_type === 'full' ? 'Full Set' : 'Update'}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                    {pkg.total_sheets || '?'} sheets | Uploaded {formatDate(pkg.created_at)}
                                    {pkg.uploaded_by && ` by ${pkg.uploaded_by}`}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {pkg.ocr_status === 'processing' && (
                                    <span className="text-xs text-blue-600">Processing...</span>
                                )}
                                {pkg.ocr_status === 'failed' && (
                                    <span className="text-xs text-red-600">OCR Failed</span>
                                )}
                            </div>
                        </div>
                        
                        {selectedPackage?.id === pkg.id && selectedPackage.sheets && (
                            <div className="mt-4 pt-4 border-t">
                                <div className="text-sm font-medium text-gray-700 mb-2">
                                    Sheets in this package:
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {selectedPackage.sheets.map((sheet) => (
                                        <div
                                            key={sheet.id}
                                            className="p-2 bg-gray-50 rounded text-sm hover:bg-blue-50 cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewSheet(sheet);
                                            }}
                                        >
                                            <div className="font-mono text-blue-600">{sheet.sheet_number}</div>
                                            <div className="text-xs text-gray-500 truncate">{sheet.sheet_title || '-'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };
    
    // Render sheet history tab
    const renderSheetHistory = () => {
        if (!selectedSheet) {
            return (
                <div className="text-center py-12 text-gray-500">
                    <div className="text-lg mb-2">Select a sheet to view history</div>
                    <div className="text-sm">Click the history icon on any sheet in the Current tab</div>
                </div>
            );
        }
        
        return (
            <div>
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => {
                            setSelectedSheet(null);
                            setSheetHistory([]);
                            setActiveTab('current');
                        }}
                        className="text-blue-600 hover:text-blue-700"
                    >
                        Back to Current
                    </button>
                    <div className="text-lg font-medium">
                        History: <span className="font-mono">{selectedSheet.sheet_number}</span>
                    </div>
                </div>
                
                <div className="bg-white rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Version</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Rev</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Package</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {sheetHistory.map((version, idx) => (
                                <tr key={version.sheet_id} className={`hover:bg-gray-50 ${version.is_current ? 'bg-green-50' : ''}`}>
                                    <td className="px-4 py-3 font-mono">
                                        {sheetHistory.length - idx}
                                    </td>
                                    <td className="px-4 py-3">
                                        {version.revision ? (
                                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                                                {version.revision}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {formatDate(version.revision_date)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">
                                        {version.package_version}
                                    </td>
                                    <td className="px-4 py-3">
                                        {version.is_current ? (
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                                Current
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                                Superseded
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleViewSheet(version)}
                                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                title="View"
                                            >
                                                <span className="icon-eye w-4 h-4"></span>
                                            </button>
                                            <button
                                                onClick={() => handleDownloadSheet(version)}
                                                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                                                title="Download"
                                            >
                                                <span className="icon-download w-4 h-4"></span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };
    
    // Render upload modal
    const renderUploadModal = () => {
        if (!showUploadModal) return null;
        
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
                    <div className="p-6 border-b">
                        <h3 className="text-lg font-semibold">Upload Package</h3>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Package Type
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="uploadType"
                                        value="full"
                                        checked={uploadType === 'full'}
                                        onChange={(e) => setUploadType(e.target.value)}
                                        className="text-blue-600"
                                    />
                                    <span>Full Set</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="uploadType"
                                        value="update"
                                        checked={uploadType === 'update'}
                                        onChange={(e) => setUploadType(e.target.value)}
                                        className="text-blue-600"
                                    />
                                    <span>Update Package</span>
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {uploadType === 'full' 
                                    ? 'Complete drawing set - will establish baseline sheets'
                                    : 'Partial update - only contains revised sheets'}
                            </p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                PDF File
                            </label>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                className="w-full text-sm border rounded-lg p-2"
                            />
                        </div>
                        
                        {uploadProgress && (
                            <div className="bg-blue-50 rounded-lg p-4">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-blue-700 capitalize">{uploadProgress.status}...</span>
                                    <span className="text-blue-600">{uploadProgress.percent}%</span>
                                </div>
                                <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-600 transition-all duration-300"
                                        style={{ width: `${uploadProgress.percent}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        
                        {error && (
                            <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">
                                {error}
                            </div>
                        )}
                    </div>
                    
                    <div className="p-6 border-t flex justify-end gap-3">
                        <button
                            onClick={() => {
                                setShowUploadModal(false);
                                setUploadFile(null);
                                setUploadProgress(null);
                                setError(null);
                            }}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            disabled={isProcessing}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={!uploadFile || isProcessing}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isProcessing ? 'Processing...' : 'Upload & Process'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    // Main render
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-50 rounded-xl shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b bg-white rounded-t-xl flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            {disciplineName || discipline}
                        </h2>
                        <p className="text-sm text-gray-500">Permit Drawing Package Browser</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                            Upload Package
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                            <span className="icon-close w-5 h-5"></span>
                        </button>
                    </div>
                </div>
                
                {/* Stats */}
                <div className="p-6 bg-white border-b">
                    {renderStats()}
                </div>
                
                {/* Tabs */}
                <div className="px-6 bg-white border-b">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab('current')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'current'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Current Sheets
                        </button>
                        <button
                            onClick={() => setActiveTab('packages')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'packages'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Package Versions
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'history'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            Sheet History
                        </button>
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'current' && renderCurrentSheets()}
                            {activeTab === 'packages' && renderPackages()}
                            {activeTab === 'history' && renderSheetHistory()}
                        </>
                    )}
                </div>
            </div>
            
            {renderUploadModal()}
        </div>
    );
}

// Export for use
window.PermitPackageBrowser = PermitPackageBrowser;
