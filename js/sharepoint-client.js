/**
 * SharePoint Client for MODA
 * 
 * Handles file operations with SharePoint via Supabase Edge Function.
 * Used for large drawing files that exceed Supabase Storage limits.
 */

(function() {
    'use strict';

    // Supabase Edge Function URL for SharePoint operations
    const getEdgeFunctionUrl = () => {
        const supabaseUrl = window.MODA_SUPABASE?.client?.supabaseUrl || 'https://syreuphexagezawjyjgt.supabase.co';
        return `${supabaseUrl}/functions/v1/sharepoint`;
    };

    // Get auth headers for Supabase Edge Function
    const getHeaders = () => {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add Supabase anon key if available
        if (window.MODA_SUPABASE?.client?.supabaseKey) {
            headers['apikey'] = window.MODA_SUPABASE.client.supabaseKey;
            headers['Authorization'] = `Bearer ${window.MODA_SUPABASE.client.supabaseKey}`;
        }
        
        return headers;
    };

    // Call the SharePoint edge function
    async function callSharePoint(action, params = {}) {
        console.log('[SharePoint] Calling action:', action);
        
        const response = await fetch(getEdgeFunctionUrl(), {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ action, ...params })
        });

        let data;
        try {
            data = await response.json();
        } catch (e) {
            const text = await response.text();
            console.error('[SharePoint] Failed to parse response:', text);
            throw new Error(`SharePoint response parse error: ${response.status} - ${text.substring(0, 200)}`);
        }
        
        if (!response.ok || data.error) {
            console.error('[SharePoint] Error response:', data);
            throw new Error(data.error || `SharePoint operation failed: ${response.status}`);
        }
        
        console.log('[SharePoint] Success:', action);
        return data;
    }

    // Convert file to base64
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1]; // Remove data URL prefix
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Build folder path for a drawing
    function buildFolderPath(projectName, categoryName, disciplineName, moduleFolderName = null) {
        // Sanitize folder names (remove special characters)
        const sanitize = (name) => name.replace(/[<>:"/\\|?*]/g, '-').trim();
        
        const parts = ['MODA Drawings'];
        if (projectName) parts.push(sanitize(projectName));
        if (categoryName) parts.push(sanitize(categoryName));
        if (disciplineName) parts.push(sanitize(disciplineName));
        // For Module Packages, add a subfolder per module
        if (moduleFolderName) parts.push(sanitize(moduleFolderName));
        
        return parts.join('/');
    }

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    const SharePointClient = {
        /**
         * Test SharePoint connection
         */
        async testConnection() {
            return await callSharePoint('test');
        },

        /**
         * List files in a folder
         * @param {string} folderPath - Path to folder (e.g., "MODA Drawings/Project Name/Permit Drawings")
         */
        async listFiles(folderPath) {
            const result = await callSharePoint('list', { folderPath });
            return result.value || [];
        },

        /**
         * Upload a file to SharePoint using chunked upload
         * @param {File} file - File object to upload
         * @param {string} projectName - Project name
         * @param {string} categoryName - Category name (e.g., "Permit Drawings")
         * @param {string} disciplineName - Discipline name (e.g., "Electrical Submittal")
         * @param {function} onProgress - Optional progress callback
         * @param {object} options - Optional: { moduleFolderName, versionedFileName }
         */
        async uploadFile(file, projectName, categoryName, disciplineName, onProgress, options = {}) {
            const { moduleFolderName, versionedFileName } = options;
            const folderPath = buildFolderPath(projectName, categoryName, disciplineName, moduleFolderName);
            const uploadFileName = versionedFileName || file.name;
            
            // Ensure folder structure exists (including module subfolder if specified)
            await this.ensureFolderExists(projectName, categoryName, disciplineName, moduleFolderName);
            
            if (onProgress) onProgress({ status: 'preparing', percent: 5 });
            
            // For small files (< 1MB), use simple upload with smaller chunks
            // For larger files, use upload session
            const fileSizeMB = file.size / (1024 * 1024);
            
            if (fileSizeMB < 1) {
                // Small file - use simple upload but with smaller base64 chunk
                if (onProgress) onProgress({ status: 'uploading', percent: 20 });
                
                const fileContent = await fileToBase64(file);
                
                const result = await callSharePoint('upload', {
                    folderPath,
                    fileName: uploadFileName,
                    fileContent
                });
                
                if (onProgress) onProgress({ status: 'complete', percent: 100 });
                
                return {
                    id: result.id,
                    name: result.name,
                    size: result.size,
                    webUrl: result.webUrl,
                    downloadUrl: result['@microsoft.graph.downloadUrl']
                };
            }
            
            // Large file - use chunked upload session
            console.log('[SharePoint] Using chunked upload for large file:', file.name, fileSizeMB.toFixed(2), 'MB');
            
            // Step 1: Create upload session via Edge Function
            if (onProgress) onProgress({ status: 'creating session', percent: 10 });
            
            const sessionResult = await callSharePoint('createUploadSession', {
                folderPath,
                fileName: uploadFileName
            });
            
            const uploadUrl = sessionResult.uploadUrl;
            if (!uploadUrl) {
                throw new Error('Failed to create upload session');
            }
            
            // Step 2: Upload file in chunks directly to SharePoint (bypassing Edge Function)
            // Using 10MB chunks for optimal speed (SharePoint supports up to 60MB)
            const chunkSize = 10 * 1024 * 1024; // 10MB chunks for faster uploads
            const totalSize = file.size;
            let offset = 0;
            let result;
            const startTime = Date.now();
            
            while (offset < totalSize) {
                const end = Math.min(offset + chunkSize, totalSize);
                const chunk = file.slice(offset, end);
                const chunkBuffer = await chunk.arrayBuffer();
                
                const percent = Math.round(10 + (end / totalSize) * 85);
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = offset > 0 ? (offset / elapsed / 1024 / 1024).toFixed(1) : 0;
                
                if (onProgress) onProgress({ 
                    status: 'uploading', 
                    percent, 
                    uploaded: end, 
                    total: totalSize,
                    speed: `${speed} MB/s`
                });
                
                console.log(`[SharePoint] Uploading chunk ${offset}-${end-1}/${totalSize} (${speed} MB/s)`);
                
                const chunkResponse = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Length': chunkBuffer.byteLength.toString(),
                        'Content-Range': `bytes ${offset}-${end - 1}/${totalSize}`
                    },
                    body: chunkBuffer
                });
                
                if (!chunkResponse.ok && chunkResponse.status !== 202) {
                    const errorText = await chunkResponse.text();
                    throw new Error(`Chunk upload failed: ${chunkResponse.status} - ${errorText}`);
                }
                
                // Last chunk returns the file metadata
                if (end >= totalSize) {
                    result = await chunkResponse.json();
                }
                
                offset = end;
            }
            
            const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`[SharePoint] Upload complete in ${totalTime}s`);
            
            if (onProgress) onProgress({ status: 'complete', percent: 100 });
            
            console.log('[SharePoint] Chunked upload complete:', result?.name);
            
            return {
                id: result.id,
                name: result.name,
                size: result.size,
                webUrl: result.webUrl,
                downloadUrl: result['@microsoft.graph.downloadUrl']
            };
        },

        /**
         * Get download URL for a file (forces download)
         * @param {string} fileId - SharePoint file ID
         */
        async getDownloadUrl(fileId) {
            const result = await callSharePoint('download', { fileId });
            return result.downloadUrl;
        },

        /**
         * Get web view URL for a file (opens in browser for viewing)
         * @param {string} fileId - SharePoint file ID
         */
        async getViewUrl(fileId) {
            const result = await callSharePoint('getViewUrl', { fileId });
            return result.webUrl;
        },
        
        /**
         * Get preview URL for a file (opens inline in browser, not download)
         * Uses SharePoint's preview endpoint which displays PDFs in browser
         * @param {string} fileId - SharePoint file ID
         */
        async getPreviewUrl(fileId) {
            console.log('[SharePoint] Getting preview URL for fileId:', fileId);
            const result = await callSharePoint('preview', { fileId });
            console.log('[SharePoint] Preview result:', result);
            return result.previewUrl;
        },

        /**
         * Delete a file from SharePoint
         * @param {string} fileId - SharePoint file ID
         */
        async deleteFile(fileId) {
            return await callSharePoint('delete', { fileId });
        },

        /**
         * Create a folder in SharePoint
         * @param {string} parentPath - Parent folder path
         * @param {string} folderName - New folder name
         */
        async createFolder(parentPath, folderName) {
            return await callSharePoint('createFolder', { parentPath, folderName });
        },

        /**
         * Ensure the full folder structure exists for a drawing
         * @param {string} projectName - Project name
         * @param {string} categoryName - Category name
         * @param {string} disciplineName - Discipline name
         * @param {string} moduleFolderName - Optional module subfolder name (for Module Packages)
         */
        async ensureFolderExists(projectName, categoryName, disciplineName, moduleFolderName = null) {
            const sanitize = (name) => name.replace(/[<>:"/\\|?*]/g, '-').trim();
            
            // Create each level of the folder structure
            try {
                await this.createFolder('', 'MODA Drawings');
            } catch (e) { /* Folder may already exist */ }
            
            if (projectName) {
                try {
                    await this.createFolder('MODA Drawings', sanitize(projectName));
                } catch (e) { /* Folder may already exist */ }
            }
            
            if (projectName && categoryName) {
                try {
                    await this.createFolder(`MODA Drawings/${sanitize(projectName)}`, sanitize(categoryName));
                } catch (e) { /* Folder may already exist */ }
            }
            
            if (projectName && categoryName && disciplineName) {
                try {
                    await this.createFolder(
                        `MODA Drawings/${sanitize(projectName)}/${sanitize(categoryName)}`, 
                        sanitize(disciplineName)
                    );
                } catch (e) { /* Folder may already exist */ }
            }
            
            // Create module subfolder if specified (for Module Packages versioning)
            if (projectName && categoryName && disciplineName && moduleFolderName) {
                try {
                    await this.createFolder(
                        `MODA Drawings/${sanitize(projectName)}/${sanitize(categoryName)}/${sanitize(disciplineName)}`, 
                        sanitize(moduleFolderName)
                    );
                } catch (e) { /* Folder may already exist */ }
            }
        },

        /**
         * Get files for a specific drawing location
         * @param {string} projectName - Project name
         * @param {string} categoryName - Category name
         * @param {string} disciplineName - Discipline name
         */
        async getDrawingFiles(projectName, categoryName, disciplineName) {
            const folderPath = buildFolderPath(projectName, categoryName, disciplineName);
            return await this.listFiles(folderPath);
        },

        /**
         * Check if SharePoint integration is available
         */
        isAvailable() {
            // Check if Supabase is available (needed for edge function auth)
            return window.MODA_SUPABASE?.isInitialized === true;
        },

        /**
         * Get the folder path for a drawing
         */
        buildFolderPath,

        /**
         * Sync files from SharePoint to MODA database
         * Scans a discipline folder and creates database records for files not already tracked
         * @param {string} projectId - Project UUID
         * @param {string} projectName - Project name (for folder path)
         * @param {string} categoryName - Category name (e.g., "Permit Drawings")
         * @param {string} disciplineId - Discipline ID for database
         * @param {string} disciplineName - Discipline name (for folder path)
         * @returns {object} { synced: number, skipped: number, errors: array }
         */
        async syncFromSharePoint(projectId, projectName, categoryName, disciplineId, disciplineName) {
            console.log('[SharePoint] Syncing files from:', projectName, categoryName, disciplineName);
            
            const results = { synced: 0, skipped: 0, errors: [] };
            
            try {
                // Get files from SharePoint
                const folderPath = buildFolderPath(projectName, categoryName, disciplineName);
                const spFiles = await this.listFiles(folderPath);
                
                if (!spFiles || spFiles.length === 0) {
                    console.log('[SharePoint] No files found in folder');
                    return results;
                }
                
                console.log('[SharePoint] Found', spFiles.length, 'files in SharePoint');
                
                // Get existing drawings from database
                const existingDrawings = await window.MODA_SUPABASE_DRAWINGS.drawings.getByProjectAndDiscipline(
                    projectId, 
                    disciplineId
                );
                const existingNames = new Set(existingDrawings.map(d => d.name.toLowerCase()));
                
                // Process each file
                for (const spFile of spFiles) {
                    // Skip folders
                    if (spFile.folder) {
                        continue;
                    }
                    
                    const fileName = spFile.name;
                    
                    // Skip if already exists in database
                    if (existingNames.has(fileName.toLowerCase())) {
                        console.log('[SharePoint] Skipping (exists):', fileName);
                        results.skipped++;
                        continue;
                    }
                    
                    try {
                        // Create drawing record in database
                        const drawingData = {
                            project_id: projectId,
                            discipline: disciplineId,
                            name: fileName,
                            file_type: fileName.split('.').pop()?.toLowerCase() || 'unknown',
                            storage_type: 'sharepoint',
                            storage_path: `${folderPath}/${fileName}`,
                            sharepoint_id: spFile.id,
                            sharepoint_url: spFile.webUrl,
                            file_size: spFile.size || 0,
                            uploaded_by: 'SharePoint Sync',
                            created_at: spFile.createdDateTime || new Date().toISOString(),
                            updated_at: spFile.lastModifiedDateTime || new Date().toISOString()
                        };
                        
                        const { error } = await window.MODA_SUPABASE.client
                            .from('drawings')
                            .insert(drawingData);
                        
                        if (error) {
                            console.error('[SharePoint] Error inserting:', fileName, error);
                            results.errors.push({ file: fileName, error: error.message });
                        } else {
                            console.log('[SharePoint] Synced:', fileName);
                            results.synced++;
                        }
                    } catch (err) {
                        console.error('[SharePoint] Error processing:', fileName, err);
                        results.errors.push({ file: fileName, error: err.message });
                    }
                }
                
                console.log('[SharePoint] Sync complete:', results);
                return results;
                
            } catch (err) {
                console.error('[SharePoint] Sync error:', err);
                results.errors.push({ file: 'folder', error: err.message });
                return results;
            }
        }
    };

    // Export to window
    window.MODA_SHAREPOINT = SharePointClient;

    if (window.MODA_DEBUG) console.log('[SharePoint Client] Module initialized');
})();
