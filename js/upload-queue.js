/**
 * Global Upload Queue Manager for MODA
 * 
 * Allows background uploads while user navigates the app.
 * Provides a persistent floating progress indicator.
 */

(function() {
    'use strict';

    // Queue state
    const state = {
        queue: [],           // Array of upload tasks
        isProcessing: false,
        currentUpload: null,
        completedCount: 0,
        failedCount: 0,
        listeners: new Set()
    };

    // Upload task structure:
    // {
    //     id: string,
    //     file: File,
    //     projectId: string,
    //     projectName: string,
    //     categoryName: string,
    //     disciplineName: string,
    //     createdBy: string,
    //     status: 'queued' | 'uploading' | 'complete' | 'failed',
    //     progress: { percent, uploaded, totalBytes, speed, status },
    //     error: string | null,
    //     startTime: number,
    //     endTime: number
    // }

    /**
     * Add files to the upload queue
     */
    function addToQueue(files, options) {
        const { projectId, projectName, categoryName, disciplineName, createdBy } = options;
        
        const tasks = Array.from(files).map((file, index) => ({
            id: `upload-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            projectId,
            projectName,
            categoryName,
            disciplineName,
            createdBy,
            status: 'queued',
            progress: { percent: 0, status: 'queued' },
            error: null,
            startTime: null,
            endTime: null
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
            const task = state.queue.find(t => t.status === 'queued');
            if (!task) break;

            state.currentUpload = task;
            task.status = 'uploading';
            task.startTime = Date.now();
            task.progress = { percent: 0, status: 'preparing' };
            notifyListeners();

            try {
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

            // Remove completed/failed tasks after a delay
            setTimeout(() => {
                const index = state.queue.findIndex(t => t.id === task.id);
                if (index > -1 && (task.status === 'complete' || task.status === 'failed')) {
                    state.queue.splice(index, 1);
                    notifyListeners();
                }
            }, task.status === 'complete' ? 3000 : 10000);
        }

        state.isProcessing = false;
        notifyListeners();
    }

    /**
     * Upload a single file
     */
    async function uploadFile(task) {
        const { file, projectId, projectName, categoryName, disciplineName, createdBy } = task;

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

            // Create drawing record in Supabase
            if (window.MODA_SUPABASE_DRAWINGS?.isAvailable?.()) {
                const drawing = await window.MODA_SUPABASE_DRAWINGS.drawings.create({
                    projectId,
                    discipline: disciplineName,
                    name: file.name,
                    createdBy
                });

                // Create version record
                await window.MODA_SUPABASE_DRAWINGS.versions.create({
                    drawingId: drawing.id,
                    versionNumber: 1,
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
                        action: 'upload',
                        drawing_id: drawing.id,
                        project_id: projectId,
                        user_name: createdBy,
                        details: JSON.stringify({ name: file.name, size: file.size }),
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
            currentUpload: state.currentUpload,
            completedCount: state.completedCount,
            failedCount: state.failedCount,
            pendingCount: state.queue.filter(t => t.status === 'queued').length,
            totalInQueue: state.queue.length
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

    // Expose globally
    window.MODA_UPLOAD_QUEUE = {
        addToQueue,
        cancelUpload,
        cancelAll,
        getState,
        subscribe,
        clearHistory
    };

    console.log('[UploadQueue] Global upload queue manager initialized');
})();
