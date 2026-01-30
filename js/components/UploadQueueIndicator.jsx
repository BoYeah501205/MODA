/**
 * UploadQueueIndicator.jsx - Floating Upload Progress Indicator
 * 
 * Persistent indicator that shows upload progress across navigation.
 * Appears in bottom-right corner when uploads are in progress.
 * Handles duplicate detection prompts and error handling.
 */

function UploadQueueIndicator() {
    const { useState, useEffect, useCallback } = React;
    
    const [queueState, setQueueState] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Subscribe to upload queue changes
    useEffect(() => {
        if (!window.MODA_UPLOAD_QUEUE) return;

        const unsubscribe = window.MODA_UPLOAD_QUEUE.subscribe((state) => {
            setQueueState(state);
            // Auto-expand when new uploads start or when action needed
            if ((state.isProcessing && state.totalInQueue > 0) || state.isPaused) {
                setIsMinimized(false);
            }
        });

        // Get initial state
        setQueueState(window.MODA_UPLOAD_QUEUE.getState());

        return unsubscribe;
    }, []);

    // Format file size
    const formatSize = useCallback((bytes) => {
        if (!bytes) return '';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }, []);

    // Handle duplicate action
    const handleDuplicateAction = useCallback((action) => {
        window.MODA_UPLOAD_QUEUE?.resolveAction(action);
    }, []);

    // Don't render if no queue or nothing in queue
    if (!queueState || (queueState.totalInQueue === 0 && queueState.completedCount === 0 && queueState.failedCount === 0)) {
        return null;
    }

    const { queue, isProcessing, isPaused, currentUpload, pendingAction, completedCount, failedCount, skippedCount, pendingCount } = queueState;
    const totalCount = completedCount + failedCount + (skippedCount || 0) + queue.length;

    // Minimized view - just a small badge
    if (isMinimized && !isPaused) {
        return (
            <div 
                className="fixed bottom-4 right-4 z-50 cursor-pointer"
                onClick={() => setIsMinimized(false)}
            >
                <div className={`${isPaused ? 'bg-amber-500' : 'bg-blue-600'} text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg hover:opacity-90 transition`}>
                    {isProcessing ? (
                        <div className="relative">
                            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span className="absolute -top-1 -right-1 bg-white text-blue-600 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {pendingCount + (currentUpload ? 1 : 0)}
                            </span>
                        </div>
                    ) : (
                        <span className="icon-upload w-6 h-6"></span>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div 
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 flex items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    {isProcessing && (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    )}
                    <span className="font-medium text-sm">
                        {isProcessing ? 'Uploading...' : 'Uploads'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                        {completedCount}/{totalCount}
                    </span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                        className="p-1 hover:bg-white/20 rounded"
                        title="Minimize"
                    >
                        <span className="icon-minus w-4 h-4"></span>
                    </button>
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            window.MODA_UPLOAD_QUEUE?.clearHistory();
                        }}
                        className="p-1 hover:bg-white/20 rounded"
                        title="Clear"
                    >
                        <span className="icon-x w-4 h-4"></span>
                    </button>
                </div>
            </div>

            {/* Duplicate File Prompt */}
            {isPaused && pendingAction?.type === 'duplicate' && (
                <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
                    <div className="flex items-start gap-2 mb-2">
                        <span className="icon-alert-triangle w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"></span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-amber-800">Duplicate File Found</p>
                            <p className="text-xs text-amber-700 truncate mt-0.5">
                                {pendingAction.task?.file?.name}
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                        <button
                            onClick={() => handleDuplicateAction('skip')}
                            className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
                        >
                            Skip
                        </button>
                        <button
                            onClick={() => handleDuplicateAction('newVersion')}
                            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                            New Version
                        </button>
                        <button
                            onClick={() => handleDuplicateAction('skipAll')}
                            className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 transition"
                        >
                            Skip All
                        </button>
                        <button
                            onClick={() => handleDuplicateAction('newVersionAll')}
                            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                            Version All
                        </button>
                    </div>
                </div>
            )}

            {/* Current Upload Progress */}
            {currentUpload && currentUpload.status === 'uploading' && (
                <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 truncate flex-1 mr-2">
                            {currentUpload.file.name}
                        </span>
                        <span className="text-xs text-blue-600 font-medium">
                            {currentUpload.progress?.percent || 0}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${currentUpload.progress?.percent || 0}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">
                            {currentUpload.progress?.status === 'preparing' && 'Preparing...'}
                            {currentUpload.progress?.status === 'creating session' && 'Creating session...'}
                            {currentUpload.progress?.status === 'uploading' && 'Uploading...'}
                        </span>
                        {currentUpload.progress?.uploaded && currentUpload.progress?.totalBytes && (
                            <span className="text-xs text-gray-500">
                                {formatSize(currentUpload.progress.uploaded)} / {formatSize(currentUpload.progress.totalBytes)}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Queue Summary */}
            {pendingCount > 0 && (
                <div className="px-4 py-2 bg-gray-50 text-xs text-gray-600">
                    {pendingCount} file{pendingCount > 1 ? 's' : ''} waiting...
                </div>
            )}

            {/* Expanded Queue List */}
            {isExpanded && queue.length > 0 && (
                <div className="max-h-48 overflow-y-auto">
                    {queue.map((task) => (
                        <div 
                            key={task.id}
                            className={`px-4 py-2 border-b border-gray-100 flex items-center gap-2 ${
                                task.status === 'complete' ? 'bg-green-50' :
                                task.status === 'failed' ? 'bg-red-50' :
                                task.status === 'skipped' ? 'bg-gray-50' :
                                task.status === 'duplicate' ? 'bg-amber-50' : ''
                            }`}
                        >
                            {task.status === 'queued' && (
                                <span className="icon-clock w-4 h-4 text-gray-400"></span>
                            )}
                            {task.status === 'uploading' && (
                                <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            )}
                            {task.status === 'complete' && (
                                <span className="icon-check w-4 h-4 text-green-600"></span>
                            )}
                            {task.status === 'failed' && (
                                <span className="icon-x w-4 h-4 text-red-600"></span>
                            )}
                            {task.status === 'skipped' && (
                                <span className="icon-minus w-4 h-4 text-gray-400"></span>
                            )}
                            {task.status === 'duplicate' && (
                                <span className="icon-alert-triangle w-4 h-4 text-amber-500"></span>
                            )}
                            <span className={`text-sm truncate flex-1 ${
                                task.status === 'failed' ? 'text-red-700' :
                                task.status === 'complete' ? 'text-green-700' :
                                task.status === 'skipped' ? 'text-gray-500' :
                                task.status === 'duplicate' ? 'text-amber-700' : 'text-gray-700'
                            }`}>
                                {task.file.name}
                            </span>
                            {task.status === 'queued' && (
                                <button
                                    onClick={() => window.MODA_UPLOAD_QUEUE?.cancelUpload(task.id)}
                                    className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-red-600"
                                    title="Cancel"
                                >
                                    <span className="icon-x w-3 h-3"></span>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Completed/Failed Summary */}
            {(completedCount > 0 || failedCount > 0 || skippedCount > 0) && !isProcessing && queue.length === 0 && (
                <div className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-4 text-sm flex-wrap">
                        {completedCount > 0 && (
                            <span className="text-green-600 flex items-center gap-1">
                                <span className="icon-check w-4 h-4"></span>
                                {completedCount} uploaded
                            </span>
                        )}
                        {skippedCount > 0 && (
                            <span className="text-gray-500 flex items-center gap-1">
                                <span className="icon-minus w-4 h-4"></span>
                                {skippedCount} skipped
                            </span>
                        )}
                        {failedCount > 0 && (
                            <span className="text-red-600 flex items-center gap-1">
                                <span className="icon-x w-4 h-4"></span>
                                {failedCount} failed
                            </span>
                        )}
                    </div>
                    {failedCount > 0 && (
                        <button
                            onClick={() => window.MODA_UPLOAD_QUEUE?.retryFailed()}
                            className="mt-2 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                        >
                            Retry Failed
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// Export globally
window.UploadQueueIndicator = UploadQueueIndicator;
