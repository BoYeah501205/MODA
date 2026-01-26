/**
 * MODA OCR Job Manager
 * 
 * Global singleton that manages background OCR processing:
 * - Queue multiple batches
 * - Track progress across navigation
 * - Cancel jobs
 * - Collect errors for end-of-batch summary
 * 
 * Cost estimate: ~$0.015 per page (Claude Vision)
 * Average PDF: ~15 pages = ~$0.23 per PDF
 */

window.MODA_OCR_MANAGER = (function() {
    // Job queue and state
    let jobQueue = [];
    let currentJob = null;
    let isProcessing = false;
    let listeners = new Set();
    
    // Job status constants
    const STATUS = {
        QUEUED: 'queued',
        PROCESSING: 'processing',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        ERROR: 'error'
    };
    
    // Notify all listeners of state change
    const notifyListeners = () => {
        const state = getState();
        listeners.forEach(callback => {
            try {
                callback(state);
            } catch (e) {
                console.error('[OCR Manager] Listener error:', e);
            }
        });
    };
    
    // Get current state for UI
    const getState = () => {
        const allJobs = currentJob ? [currentJob, ...jobQueue] : [...jobQueue];
        const totalFiles = allJobs.reduce((sum, job) => sum + job.files.length, 0);
        const completedFiles = allJobs.reduce((sum, job) => sum + job.completedCount, 0);
        const errorFiles = allJobs.reduce((sum, job) => sum + job.errors.length, 0);
        
        return {
            isProcessing,
            currentJob: currentJob ? {
                id: currentJob.id,
                projectName: currentJob.projectName,
                currentFile: currentJob.currentFile,
                currentFileIndex: currentJob.currentFileIndex,
                totalFiles: currentJob.files.length,
                completedCount: currentJob.completedCount,
                errors: currentJob.errors,
                status: currentJob.status,
                stage: currentJob.stage
            } : null,
            queuedJobs: jobQueue.map(job => ({
                id: job.id,
                projectName: job.projectName,
                totalFiles: job.files.length,
                status: job.status
            })),
            totalFiles,
            completedFiles,
            errorFiles,
            jobCount: allJobs.length
        };
    };
    
    // Estimate cost for a batch
    const estimateCost = (files) => {
        // Estimate: 15 pages average per PDF, $0.015 per page
        const avgPagesPerPdf = 15;
        const costPerPage = 0.015;
        const totalPages = files.length * avgPagesPerPdf;
        const estimatedCost = totalPages * costPerPage;
        
        return {
            fileCount: files.length,
            estimatedPages: totalPages,
            estimatedCost: estimatedCost.toFixed(2),
            costPerFile: (avgPagesPerPdf * costPerPage).toFixed(2)
        };
    };
    
    // Create a new job
    const createJob = (projectId, projectName, files) => {
        const job = {
            id: `ocr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            projectId,
            projectName,
            files: files.map(f => ({
                id: f.id,
                name: f.name,
                versions: f.versions,
                status: STATUS.QUEUED,
                error: null,
                sheetsExtracted: 0
            })),
            status: STATUS.QUEUED,
            currentFile: null,
            currentFileIndex: 0,
            completedCount: 0,
            errors: [],
            stage: 'Queued',
            createdAt: new Date(),
            cancelRequested: false
        };
        
        return job;
    };
    
    // Add job to queue
    const queueJob = (projectId, projectName, files) => {
        const job = createJob(projectId, projectName, files);
        jobQueue.push(job);
        console.log(`[OCR Manager] Queued job ${job.id} with ${files.length} files`);
        
        notifyListeners();
        
        // Start processing if not already running
        if (!isProcessing) {
            processNextJob();
        }
        
        return job.id;
    };
    
    // Process next job in queue
    const processNextJob = async () => {
        if (jobQueue.length === 0) {
            isProcessing = false;
            currentJob = null;
            notifyListeners();
            return;
        }
        
        isProcessing = true;
        currentJob = jobQueue.shift();
        currentJob.status = STATUS.PROCESSING;
        notifyListeners();
        
        console.log(`[OCR Manager] Starting job ${currentJob.id}`);
        
        // Process each file in the job
        for (let i = 0; i < currentJob.files.length; i++) {
            // Check for cancellation
            if (currentJob.cancelRequested) {
                console.log(`[OCR Manager] Job ${currentJob.id} cancelled`);
                currentJob.status = STATUS.CANCELLED;
                currentJob.stage = 'Cancelled';
                break;
            }
            
            const file = currentJob.files[i];
            currentJob.currentFileIndex = i;
            currentJob.currentFile = file.name;
            currentJob.stage = `Processing ${i + 1}/${currentJob.files.length}`;
            file.status = STATUS.PROCESSING;
            notifyListeners();
            
            try {
                const result = await processFile(file, currentJob);
                file.status = STATUS.COMPLETED;
                file.sheetsExtracted = result.processed_sheets || 0;
                currentJob.completedCount++;
            } catch (error) {
                console.error(`[OCR Manager] Error processing ${file.name}:`, error);
                file.status = STATUS.ERROR;
                file.error = error.message || 'Unknown error';
                currentJob.errors.push({
                    fileName: file.name,
                    fileId: file.id,
                    error: file.error
                });
            }
            
            notifyListeners();
        }
        
        // Job complete
        if (currentJob.status !== STATUS.CANCELLED) {
            currentJob.status = STATUS.COMPLETED;
            currentJob.stage = 'Complete';
        }
        
        // Log summary
        console.log(`[OCR Manager] Job ${currentJob.id} finished:`, {
            completed: currentJob.completedCount,
            errors: currentJob.errors.length,
            status: currentJob.status
        });
        
        // Store completed job info for potential review
        const completedJobSummary = {
            id: currentJob.id,
            projectName: currentJob.projectName,
            completedCount: currentJob.completedCount,
            totalFiles: currentJob.files.length,
            errors: currentJob.errors,
            status: currentJob.status,
            completedAt: new Date()
        };
        
        // Emit completion event
        window.dispatchEvent(new CustomEvent('ocr-job-complete', { 
            detail: completedJobSummary 
        }));
        
        notifyListeners();
        
        // Process next job
        setTimeout(() => processNextJob(), 500);
    };
    
    // Process a single file
    const processFile = async (file, job) => {
        const latestVersion = file.versions?.[0];
        let pdfDownloadUrl = null;
        
        // Get SharePoint download URL if needed
        if (latestVersion?.storage_path?.startsWith('sharepoint:') || latestVersion?.storage_type === 'sharepoint') {
            const sharePointFileId = latestVersion.sharepoint_file_id || latestVersion.storage_path?.replace('sharepoint:', '');
            
            job.stage = `Getting SharePoint URL for ${file.name}...`;
            notifyListeners();
            
            const spResponse = await fetch('https://syreuphexagezawjyjgt.supabase.co/functions/v1/sharepoint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.MODA_SUPABASE.client.supabaseKey}`,
                },
                body: JSON.stringify({
                    action: 'download',
                    fileId: sharePointFileId
                })
            });
            
            if (!spResponse.ok) {
                throw new Error('Failed to get SharePoint download URL');
            }
            
            const spData = await spResponse.json();
            pdfDownloadUrl = spData.downloadUrl;
        }
        
        job.stage = `Sending ${file.name} to Claude Vision...`;
        notifyListeners();
        
        // Call OCR Edge Function
        const response = await fetch('https://syreuphexagezawjyjgt.supabase.co/functions/v1/process-drawing-sheets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.MODA_SUPABASE.client.supabaseKey}`,
            },
            body: JSON.stringify({
                drawingFileId: file.id,
                action: 'split_and_ocr',
                pdfDownloadUrl: pdfDownloadUrl
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorMessage;
            } catch (e) {}
            throw new Error(errorMessage);
        }
        
        return await response.json();
    };
    
    // Cancel a job
    const cancelJob = (jobId) => {
        // Check if it's the current job
        if (currentJob && currentJob.id === jobId) {
            currentJob.cancelRequested = true;
            console.log(`[OCR Manager] Cancel requested for current job ${jobId}`);
            notifyListeners();
            return true;
        }
        
        // Check queue
        const queueIndex = jobQueue.findIndex(j => j.id === jobId);
        if (queueIndex >= 0) {
            const removed = jobQueue.splice(queueIndex, 1)[0];
            removed.status = STATUS.CANCELLED;
            console.log(`[OCR Manager] Removed queued job ${jobId}`);
            notifyListeners();
            return true;
        }
        
        return false;
    };
    
    // Cancel all jobs
    const cancelAll = () => {
        if (currentJob) {
            currentJob.cancelRequested = true;
        }
        jobQueue.forEach(job => {
            job.status = STATUS.CANCELLED;
        });
        jobQueue = [];
        console.log('[OCR Manager] All jobs cancelled');
        notifyListeners();
    };
    
    // Subscribe to state changes
    const subscribe = (callback) => {
        listeners.add(callback);
        // Immediately call with current state
        callback(getState());
        
        // Return unsubscribe function
        return () => listeners.delete(callback);
    };
    
    // Public API
    return {
        STATUS,
        estimateCost,
        queueJob,
        cancelJob,
        cancelAll,
        getState,
        subscribe
    };
})();

if (window.MODA_DEBUG) console.log('[OCR Manager] Initialized');
