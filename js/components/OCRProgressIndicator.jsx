/**
 * MODA OCR Progress Indicator
 * 
 * Floating indicator in bottom-right corner that shows OCR progress.
 * Persists across navigation, supports multiple jobs, cancel capability.
 */

const { useState, useEffect, useCallback } = React;

const OCRProgressIndicator = () => {
    const [state, setState] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [completedJobs, setCompletedJobs] = useState([]);
    
    // Subscribe to OCR manager state
    useEffect(() => {
        if (!window.MODA_OCR_MANAGER) {
            console.warn('[OCRProgressIndicator] OCR Manager not available');
            return;
        }
        
        const unsubscribe = window.MODA_OCR_MANAGER.subscribe((newState) => {
            setState(newState);
        });
        
        // Listen for job completions
        const handleJobComplete = (event) => {
            const job = event.detail;
            setCompletedJobs(prev => [...prev, job]);
            
            // Auto-clear completed jobs after 10 seconds
            setTimeout(() => {
                setCompletedJobs(prev => prev.filter(j => j.id !== job.id));
            }, 10000);
        };
        
        window.addEventListener('ocr-job-complete', handleJobComplete);
        
        return () => {
            unsubscribe();
            window.removeEventListener('ocr-job-complete', handleJobComplete);
        };
    }, []);
    
    // Handle cancel
    const handleCancel = useCallback((jobId) => {
        if (window.MODA_OCR_MANAGER) {
            window.MODA_OCR_MANAGER.cancelJob(jobId);
        }
    }, []);
    
    // Handle cancel all
    const handleCancelAll = useCallback(() => {
        if (window.MODA_OCR_MANAGER && confirm('Cancel all OCR jobs?')) {
            window.MODA_OCR_MANAGER.cancelAll();
        }
    }, []);
    
    // Don't render if no jobs
    if (!state || (!state.isProcessing && state.jobCount === 0 && completedJobs.length === 0)) {
        return null;
    }
    
    const { currentJob, queuedJobs, totalFiles, completedFiles, errorFiles } = state;
    const progressPercent = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0;
    
    return (
        <div className="fixed bottom-4 right-4 z-50">
            {/* Collapsed View - Small Pill */}
            {!isExpanded && (
                <button
                    onClick={() => setIsExpanded(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all"
                >
                    {state.isProcessing ? (
                        <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                            <span className="font-medium">OCR: {completedFiles}/{totalFiles}</span>
                            {errorFiles > 0 && (
                                <span className="px-1.5 py-0.5 bg-red-500 text-xs rounded-full">{errorFiles} ⚠</span>
                            )}
                        </>
                    ) : completedJobs.length > 0 ? (
                        <>
                            <span className="icon-check w-4 h-4"></span>
                            <span className="font-medium">OCR Complete</span>
                        </>
                    ) : (
                        <>
                            <span className="icon-clock w-4 h-4"></span>
                            <span className="font-medium">{queuedJobs.length} queued</span>
                        </>
                    )}
                </button>
            )}
            
            {/* Expanded View - Detail Panel */}
            {isExpanded && (
                <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-80 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 py-3 bg-purple-600 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="icon-cpu w-5 h-5"></span>
                            <span className="font-semibold">OCR Processing</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {state.isProcessing && (
                                <button
                                    onClick={handleCancelAll}
                                    className="p-1 hover:bg-purple-500 rounded"
                                    title="Cancel all"
                                >
                                    <span className="icon-x w-4 h-4"></span>
                                </button>
                            )}
                            <button
                                onClick={() => setIsExpanded(false)}
                                className="p-1 hover:bg-purple-500 rounded"
                            >
                                <span className="icon-chevron-down w-4 h-4"></span>
                            </button>
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    {state.isProcessing && (
                        <div className="px-4 py-2 bg-gray-50 border-b">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>Overall Progress</span>
                                <span>{completedFiles}/{totalFiles} files ({progressPercent}%)</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-purple-600 transition-all duration-300"
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                    
                    {/* Current Job */}
                    {currentJob && (
                        <div className="px-4 py-3 border-b">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-900">{currentJob.projectName}</span>
                                <button
                                    onClick={() => handleCancel(currentJob.id)}
                                    className="text-xs text-red-600 hover:text-red-800"
                                >
                                    Cancel
                                </button>
                            </div>
                            <div className="text-xs text-gray-600 mb-1">{currentJob.stage}</div>
                            <div className="text-xs text-gray-500 truncate" title={currentJob.currentFile}>
                                {currentJob.currentFile}
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs">
                                <span className="text-green-600">✓ {currentJob.completedCount}</span>
                                {currentJob.errors.length > 0 && (
                                    <span className="text-red-600">⚠ {currentJob.errors.length}</span>
                                )}
                                <span className="text-gray-400">/ {currentJob.totalFiles}</span>
                            </div>
                        </div>
                    )}
                    
                    {/* Queued Jobs */}
                    {queuedJobs.length > 0 && (
                        <div className="px-4 py-2 bg-gray-50">
                            <div className="text-xs font-medium text-gray-500 mb-2">QUEUED ({queuedJobs.length})</div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {queuedJobs.map(job => (
                                    <div key={job.id} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-700 truncate flex-1">{job.projectName}</span>
                                        <span className="text-gray-500 ml-2">{job.totalFiles} files</span>
                                        <button
                                            onClick={() => handleCancel(job.id)}
                                            className="ml-2 text-red-500 hover:text-red-700"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Completed Jobs Summary */}
                    {completedJobs.length > 0 && (
                        <div className="px-4 py-3 bg-green-50 border-t">
                            <div className="text-xs font-medium text-green-700 mb-2">RECENTLY COMPLETED</div>
                            {completedJobs.map(job => (
                                <div key={job.id} className="text-xs mb-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900">{job.projectName}</span>
                                        <span className="text-green-600">✓ {job.completedCount}/{job.totalFiles}</span>
                                    </div>
                                    {job.errors.length > 0 && (
                                        <div className="mt-1 text-red-600">
                                            {job.errors.length} error(s):
                                            <ul className="ml-2">
                                                {job.errors.slice(0, 3).map((err, i) => (
                                                    <li key={i} className="truncate" title={err.error}>
                                                        • {err.fileName}: {err.error}
                                                    </li>
                                                ))}
                                                {job.errors.length > 3 && (
                                                    <li>... and {job.errors.length - 3} more</li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {/* Empty State */}
                    {!state.isProcessing && queuedJobs.length === 0 && completedJobs.length === 0 && (
                        <div className="px-4 py-6 text-center text-gray-500 text-sm">
                            No active OCR jobs
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Export for use
window.OCRProgressIndicator = OCRProgressIndicator;
