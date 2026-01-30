/**
 * Global Upload Queue Manager for MODA
 * 
 * Allows background uploads while user navigates the app.
 * Provides a persistent floating progress indicator.
 * Supports duplicate detection, error handling, and toast notifications.
 */

(function() {
    'use strict';

    // Queue state
    const state = {
        queue: [],           // Array of upload tasks
        isProcessing: false,
        isPaused: false,     // Paused for user input (duplicate/error)
        currentUpload: null,
        completedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        listeners: new Set(),
        pendingAction: null, // { type: 'duplicate'|'error', task, resolve }
        sessionId: null,     // Current upload session for grouping
        sessionStartTime: null,
        existingDrawings: new Map() // Cache of existing drawings per project/discipline
    };

    // Upload task structure:
    // {
    //     id: string,
    //     file: File,
    //     projectId: string,
    //     projectName: string,
    //     categoryName: string,
    //     disciplineName: string,
    //     disciplineId: string,
    //     createdBy: string,
    //     status: 'queued' | 'uploading' | 'complete' | 'failed' | 'skipped' | 'duplicate',
    //     progress: { percent, uploaded, totalBytes, speed, status },
    //     error: string | null,
    //     existingDrawing: object | null, // If duplicate detected
    //     startTime: number,
    //     endTime: number,
    //     sessionId: string
    // }

    // Bulk action preferences (persist within session)
    let bulkDuplicateAction = null; // 'skip' | 'newVersion' | null

    /**
     * Add files to the upload queue
     */
    function addToQueue(files, options) {
        const { projectId, projectName, categoryName, disciplineName, disciplineId, createdBy, metadata } = options;
        
        // Create or continue session
        if (!state.sessionId || !state.isProcessing) {
            state.sessionId = `session-${Date.now()}`;
            state.sessionStartTime = Date.now();
            bulkDuplicateAction = null; // Reset bulk action for new session
        }
        
        const tasks = Array.from(files).map((file, index) => ({
            id: `upload-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            projectId,
            projectName,
            categoryName,
            disciplineName,
            disciplineId: disciplineId || disciplineName,
            createdBy,
            metadata: metadata || {},
            status: 'queued',
            progress: { percent: 0, status: 'queued' },
            error: null,
            existingDrawing: null,
            startTime: null,
            endTime: null,
            sessionId: state.sessionId
        }));

        state.queue.push(...tasks);
        notifyListeners();

        // Start processing if not already
        if (!state.isProcessing) {
            processQueue();
        }

        return tasks.map(t => t.id);
    }

    /**
     * Process the upload queue
     */
    async function processQueue() {
        if (state.isProcessing) return;
        state.isProcessing = true;

        while (state.queue.length > 0) {
            // Check if paused
            if (state.isPaused) {
                await new Promise(resolve => {
                    const checkPause = setInterval(() => {
                        if (!state.isPaused) {
                            clearInterval(checkPause);
                            resolve();
                        }
                    }, 100);
                });
            }

            const task = state.queue.find(t => t.status === 'queued');
            if (!task) break;

            state.currentUpload = task;
            task.startTime = Date.now();
            
            try {
                // Check for duplicates first
                const duplicateResult = await checkForDuplicate(task);
                
                if (duplicateResult.isDuplicate) {
                    task.existingDrawing = duplicateResult.existingDrawing;
                    
                    // Check bulk action or prompt user
                    let action = bulkDuplicateAction;
                    
                    if (!action) {
                        // Pause and wait for user decision
                        task.status = 'duplicate';
                        task.progress = { percent: 0, status: 'duplicate' };
                        notifyListeners();
                        
                        action = await waitForUserAction('duplicate', task);
                        
                        // Handle bulk actions
                        if (action === 'skipAll') {
                            bulkDuplicateAction = 'skip';
                            action = 'skip';
                        } else if (action === 'newVersionAll') {
                            bulkDuplicateAction = 'newVersion';
                            action = 'newVersion';
                        }
                    }
                    
                    if (action === 'skip') {
                        task.status = 'skipped';
                        task.endTime = Date.now();
                        state.skippedCount++;
                        state.currentUpload = null;
                        notifyListeners();
                        continue;
                    }
                    // If newVersion, continue with upload (will add as new version)
                    task.uploadAsNewVersion = true;
                }
                
                // Proceed with upload
                task.status = 'uploading';
                task.progress = { percent: 0, status: 'preparing' };
                notifyListeners();
                
                await uploadFile(task);
                task.status = 'complete';
                task.endTime = Date.now();
                state.completedCount++;
            } catch (error) {
                console.error('[UploadQueue] Upload failed:', error);
                task.status = 'failed';
                task.error = error.message;
                task.endTime = Date.now();
                state.failedCount++;
            }

            state.currentUpload = null;
            notifyListeners();
        }

        state.isProcessing = false;
        
        // Show completion toast
        showCompletionToast();
        
        // Clear session
        state.sessionId = null;
        state.sessionStartTime = null;
        bulkDuplicateAction = null;
        
        notifyListeners();
    }

    /**
     * Check if file already exists in the discipline
     */
    async function checkForDuplicate(task) {
        if (!window.MODA_SUPABASE_DRAWINGS?.isAvailable?.()) {
            return { isDuplicate: false };
        }
        
        const cacheKey = `${task.projectId}:${task.disciplineId}`;
        
        // Fetch existing drawings if not cached
        if (!state.existingDrawings.has(cacheKey)) {
            try {
                const drawings = await window.MODA_SUPABASE_DRAWINGS.drawings.getByProjectAndDiscipline(
                    task.projectId,
                    task.disciplineId
                );
                state.existingDrawings.set(cacheKey, drawings || []);
            } catch (e) {
                console.warn('[UploadQueue] Could not fetch existing drawings:', e);
                return { isDuplicate: false };
            }
        }
        
        const existingDrawings = state.existingDrawings.get(cacheKey) || [];
        const existingDrawing = existingDrawings.find(d => 
            d.name.toLowerCase() === task.file.name.toLowerCase()
        );
        
        return {
            isDuplicate: !!existingDrawing,
            existingDrawing
        };
    }

    /**
     * Wait for user action on duplicate/error
     */
    function waitForUserAction(type, task) {
        return new Promise(resolve => {
            state.pendingAction = { type, task, resolve };
            state.isPaused = true;
            notifyListeners();
        });
    }

    /**
     * Resolve pending user action
     */
    function resolveAction(action) {
        if (state.pendingAction) {
            state.pendingAction.resolve(action);
            state.pendingAction = null;
            state.isPaused = false;
            notifyListeners();
        }
    }

    /**
     * Show completion toast notification
     */
    function showCompletionToast() {
        const completed = state.completedCount;
        const failed = state.failedCount;
        const skipped = state.skippedCount;
        const total = completed + failed + skipped;
        
        if (total === 0) return;
        
        let message = '';
        let type = 'success';
        
        if (failed > 0 && completed === 0) {
            message = `Upload failed: ${failed} file${failed > 1 ? 's' : ''} could not be uploaded`;
            type = 'error';
        } else if (failed > 0) {
            message = `Upload complete: ${completed} of ${total} files uploaded, ${failed} failed`;
            type = 'warning';
        } else if (skipped > 0) {
            message = `Upload complete: ${completed} files uploaded, ${skipped} skipped`;
            type = 'success';
        } else {
            message = `Upload complete: ${completed} file${completed > 1 ? 's' : ''} uploaded successfully`;
            type = 'success';
        }
        
        // Use MODA toast if available
        if (window.showToast) {
            window.showToast(message, type, {
                duration: 5000,
                action: {
                    label: 'View Drawings',
                    onClick: () => {
                        // Navigate to drawings tab
                        if (window.location.hash !== '#drawings') {
                            window.location.hash = 'drawings';
                        }
                    }
                }
            });
        } else {
            // Fallback alert
            console.log('[UploadQueue]', message);
        }
        
        // Reset counts
        state.completedCount = 0;
        state.failedCount = 0;
        state.skippedCount = 0;
    }

    /**
     * Upload a single file
     */
    async function uploadFile(task) {
        const { file, projectId, projectName, categoryName, disciplineName, disciplineId, createdBy, uploadAsNewVersion, existingDrawing } = task;

        // Check if SharePoint is available
        if (window.MODA_SHAREPOINT?.isAvailable?.()) {
            task.progress = { percent: 0, status: 'creating session' };
            notifyListeners();

            // Ensure folder exists
            await window.MODA_SHAREPOINT.ensureFolderExists(projectName, categoryName, disciplineName);

            // Upload to SharePoint with progress tracking
            const result = await window.MODA_SHAREPOINT.uploadFile(file, {
                projectName,
                categoryName,
                disciplineName,
                onProgress: (progress) => {
                    task.progress = {
                        percent: progress.percent || 0,
                        status: progress.status || 'uploading',
                        uploaded: progress.uploaded,
                        totalBytes: progress.totalBytes,
                        speed: progress.speed
                    };
                    notifyListeners();
                }
            });

            // Create or update drawing record in Supabase
            if (window.MODA_SUPABASE_DRAWINGS?.isAvailable?.()) {
                let drawingId;
                let versionNumber = 1;
                
                if (uploadAsNewVersion && existingDrawing) {
                    // Add as new version to existing drawing
                    drawingId = existingDrawing.id;
                    versionNumber = window.MODA_SUPABASE_DRAWINGS.utils?.getNextVersion?.(existingDrawing.versions || []) || 
                        (existingDrawing.versions?.length || 0) + 1;
                } else {
                    // Create new drawing record
                    const drawing = await window.MODA_SUPABASE_DRAWINGS.drawings.create({
                        projectId,
                        discipline: disciplineId || disciplineName,
                        name: file.name,
                        createdBy
                    });
                    drawingId = drawing.id;
                    
                    // Update cache with new drawing
                    const cacheKey = `${projectId}:${disciplineId || disciplineName}`;
                    if (state.existingDrawings.has(cacheKey)) {
                        state.existingDrawings.get(cacheKey).push(drawing);
                    }
                }

                // Create version record
                await window.MODA_SUPABASE_DRAWINGS.versions.create({
                    drawingId,
                    versionNumber,
                    fileName: file.name,
                    fileSize: file.size,
                    mimeType: file.type || 'application/pdf',
                    storagePath: `sharepoint:${result.webUrl}`,
                    storageType: 'sharepoint',
                    sharepointFileId: result.id,
                    sharepointWebUrl: result.webUrl,
                    sharepointDownloadUrl: result.downloadUrl,
                    uploadedBy: createdBy
                });

                // Log activity
                if (window.MODA_SUPABASE_DRAWINGS.activity?.log) {
                    await window.MODA_SUPABASE_DRAWINGS.activity.log({
                        action: uploadAsNewVersion ? 'new_version' : 'upload',
                        drawing_id: drawingId,
                        project_id: projectId,
                        user_name: createdBy,
                        details: JSON.stringify({ name: file.name, size: file.size, version: versionNumber }),
                        created_at: new Date().toISOString()
                    });
                }
            }

            task.progress = { percent: 100, status: 'complete' };
            notifyListeners();
        } else {
            throw new Error('SharePoint not available');
        }
    }

    /**
     * Cancel a specific upload
     */
    function cancelUpload(taskId) {
        const index = state.queue.findIndex(t => t.id === taskId);
        if (index > -1) {
            const task = state.queue[index];
            if (task.status === 'queued') {
                state.queue.splice(index, 1);
                notifyListeners();
                return true;
            }
        }
        return false;
    }

    /**
     * Cancel all pending uploads
     */
    function cancelAll() {
        state.queue = state.queue.filter(t => t.status === 'uploading');
        notifyListeners();
    }

    /**
     * Get current queue state
     */
    function getState() {
        return {
            queue: [...state.queue],
            isProcessing: state.isProcessing,
            isPaused: state.isPaused,
            currentUpload: state.currentUpload,
            pendingAction: state.pendingAction,
            completedCount: state.completedCount,
            failedCount: state.failedCount,
            skippedCount: state.skippedCount,
            pendingCount: state.queue.filter(t => t.status === 'queued').length,
            totalInQueue: state.queue.length,
            sessionId: state.sessionId
        };
    }

    /**
     * Subscribe to state changes
     */
    function subscribe(callback) {
        state.listeners.add(callback);
        return () => state.listeners.delete(callback);
    }

    /**
     * Notify all listeners of state change
     */
    function notifyListeners() {
        const currentState = getState();
        state.listeners.forEach(callback => {
            try {
                callback(currentState);
            } catch (e) {
                console.error('[UploadQueue] Listener error:', e);
            }
        });
    }

    /**
     * Clear completed/failed history
     */
    function clearHistory() {
        state.completedCount = 0;
        state.failedCount = 0;
        notifyListeners();
    }

    /**
     * Retry failed uploads
     */
    function retryFailed() {
        state.queue.forEach(task => {
            if (task.status === 'failed') {
                task.status = 'queued';
                task.error = null;
                task.progress = { percent: 0, status: 'queued' };
            }
        });
        
        if (!state.isProcessing && state.queue.some(t => t.status === 'queued')) {
            processQueue();
        }
        
        notifyListeners();
    }

    /**
     * Clear the existing drawings cache (call after uploads complete to refresh)
     */
    function clearCache() {
        state.existingDrawings.clear();
    }

    // Beforeunload warning
    window.addEventListener('beforeunload', (e) => {
        if (state.isProcessing || state.queue.some(t => t.status === 'queued' || t.status === 'uploading')) {
            e.preventDefault();
            e.returnValue = 'Uploads are in progress. Are you sure you want to leave?';
            return e.returnValue;
        }
    });

    // Expose globally
    window.MODA_UPLOAD_QUEUE = {
        addToQueue,
        cancelUpload,
        cancelAll,
        getState,
        subscribe,
        clearHistory,
        resolveAction,
        retryFailed,
        clearCache
    };

    console.log('[UploadQueue] Global upload queue manager initialized');
})();
