/**
 * SharePoint Attachments Client for MODA
 * 
 * Handles photo/file uploads for various MODA modules:
 * - RFI (Request for Information)
 * - On-Site Reports
 * - Issue Reports
 * - QA Deviations/Inspections
 * 
 * Extends the base SharePoint client with module-specific folder structures.
 */

(function() {
    'use strict';

    // ============================================================================
    // FOLDER STRUCTURE CONFIGURATION
    // ============================================================================
    
    /**
     * SharePoint folder structure for MODA attachments:
     * 
     * MODA Files/
     * ├── {Project Name}/
     * │   ├── RFI/
     * │   │   └── {RFI-2025-001}/
     * │   │       ├── photo1.jpg
     * │   │       └── document.pdf
     * │   ├── On-Site Reports/
     * │   │   └── {Report Date - Set ID}/
     * │   │       ├── Module Photos/
     * │   │       │   └── {Serial Number}/
     * │   │       └── General/
     * │   ├── Issue Reports/
     * │   │   └── {Issue ID}/
     * │   │       └── photos...
     * │   └── QA/
     * │       ├── Inspections/
     * │       │   └── {Module Serial}/
     * │       └── Deviations/
     * │           └── {Deviation ID}/
     */

    const ROOT_FOLDER = 'MODA Files';

    // Module type identifiers
    const MODULE_TYPES = {
        RFI: 'RFI',
        ONSITE_REPORT: 'On-Site Reports',
        ISSUE_REPORT: 'Issue Reports',
        QA_INSPECTION: 'QA/Inspections',
        QA_DEVIATION: 'QA/Deviations'
    };

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    /**
     * Sanitize folder/file names for SharePoint
     */
    function sanitizeName(name) {
        if (!name) return 'Unknown';
        return String(name)
            .replace(/[<>:"/\\|?*]/g, '-')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 100); // SharePoint has path length limits
    }

    /**
     * Generate a unique filename with timestamp
     */
    function generateFileName(originalName, prefix = '') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const ext = originalName ? originalName.split('.').pop() : 'jpg';
        const baseName = originalName ? originalName.replace(/\.[^/.]+$/, '') : 'file';
        const sanitized = sanitizeName(baseName);
        return prefix 
            ? `${prefix}_${timestamp}_${sanitized}.${ext}`
            : `${timestamp}_${sanitized}.${ext}`;
    }

    /**
     * Convert base64 data URL to File object
     */
    function base64ToFile(base64, fileName, mimeType = 'image/jpeg') {
        // Handle data URL format
        let base64Data = base64;
        if (base64.includes(',')) {
            const parts = base64.split(',');
            base64Data = parts[1];
            // Extract mime type from data URL if present
            const mimeMatch = parts[0].match(/data:([^;]+)/);
            if (mimeMatch) {
                mimeType = mimeMatch[1];
            }
        }

        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        return new File([blob], fileName, { type: mimeType });
    }

    /**
     * Get file extension from base64 data URL
     */
    function getExtensionFromBase64(base64) {
        if (!base64 || !base64.includes(',')) return 'jpg';
        const mimeMatch = base64.match(/data:image\/([^;]+)/);
        if (mimeMatch) {
            const mime = mimeMatch[1];
            if (mime === 'jpeg') return 'jpg';
            return mime;
        }
        return 'jpg';
    }

    // ============================================================================
    // FOLDER PATH BUILDERS
    // ============================================================================

    /**
     * Build folder path for RFI attachments
     */
    function buildRFIPath(projectName, rfiId) {
        return [
            ROOT_FOLDER,
            sanitizeName(projectName),
            MODULE_TYPES.RFI,
            sanitizeName(rfiId)
        ].join('/');
    }

    /**
     * Build folder path for On-Site Report photos
     */
    function buildOnSiteReportPath(projectName, reportDate, setId, moduleSerial = null) {
        const datePart = new Date(reportDate).toISOString().split('T')[0];
        const reportFolder = `${datePart}_${sanitizeName(setId)}`;
        
        const basePath = [
            ROOT_FOLDER,
            sanitizeName(projectName),
            MODULE_TYPES.ONSITE_REPORT,
            reportFolder
        ];

        if (moduleSerial) {
            basePath.push('Module Photos', sanitizeName(moduleSerial));
        } else {
            basePath.push('General');
        }

        return basePath.join('/');
    }

    /**
     * Build folder path for Issue Report photos
     */
    function buildIssueReportPath(projectName, issueId) {
        return [
            ROOT_FOLDER,
            sanitizeName(projectName),
            MODULE_TYPES.ISSUE_REPORT,
            sanitizeName(issueId)
        ].join('/');
    }

    /**
     * Build folder path for QA Inspection photos
     */
    function buildQAInspectionPath(projectName, moduleSerial) {
        return [
            ROOT_FOLDER,
            sanitizeName(projectName),
            MODULE_TYPES.QA_INSPECTION,
            sanitizeName(moduleSerial)
        ].join('/');
    }

    /**
     * Build folder path for QA Deviation photos
     */
    function buildQADeviationPath(projectName, deviationId) {
        return [
            ROOT_FOLDER,
            sanitizeName(projectName),
            MODULE_TYPES.QA_DEVIATION,
            sanitizeName(deviationId)
        ].join('/');
    }

    // ============================================================================
    // CORE UPLOAD FUNCTIONS
    // ============================================================================

    /**
     * Ensure folder structure exists in SharePoint
     */
    async function ensureFolderStructure(folderPath) {
        if (!window.MODA_SHAREPOINT?.isAvailable?.()) {
            throw new Error('SharePoint client not available');
        }

        const parts = folderPath.split('/');
        let currentPath = '';

        for (const part of parts) {
            const parentPath = currentPath;
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            
            try {
                await window.MODA_SHAREPOINT.createFolder(parentPath, part);
            } catch (e) {
                // Folder may already exist - that's OK
                console.log(`[SharePoint Attachments] Folder exists or created: ${currentPath}`);
            }
        }
    }

    /**
     * Upload a single file to SharePoint
     * @param {File|string} fileOrBase64 - File object or base64 string
     * @param {string} folderPath - Destination folder path
     * @param {string} fileName - Optional custom filename
     * @param {function} onProgress - Optional progress callback
     * @returns {Promise<object>} - SharePoint file metadata
     */
    async function uploadFile(fileOrBase64, folderPath, fileName = null, onProgress = null) {
        if (!window.MODA_SHAREPOINT?.isAvailable?.()) {
            throw new Error('SharePoint client not available');
        }

        // Convert base64 to File if needed
        let file;
        if (typeof fileOrBase64 === 'string') {
            const ext = getExtensionFromBase64(fileOrBase64);
            const name = fileName || `photo_${Date.now()}.${ext}`;
            file = base64ToFile(fileOrBase64, name);
        } else {
            file = fileOrBase64;
        }

        const uploadFileName = fileName || generateFileName(file.name);

        // Ensure folder exists
        await ensureFolderStructure(folderPath);

        // Upload using base SharePoint client
        // We need to use the raw upload since the base client is designed for drawings
        const fileContent = await fileToBase64(file);
        
        const response = await callSharePointDirect('upload', {
            folderPath,
            fileName: uploadFileName,
            fileContent
        });

        return {
            id: response.id,
            name: response.name,
            size: response.size,
            webUrl: response.webUrl,
            downloadUrl: response['@microsoft.graph.downloadUrl'],
            folderPath
        };
    }

    /**
     * Convert File to base64 (without data URL prefix)
     */
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Direct call to SharePoint edge function
     */
    async function callSharePointDirect(action, params = {}) {
        const supabaseUrl = window.MODA_SUPABASE?.client?.supabaseUrl || 'https://syreuphexagezawjyjgt.supabase.co';
        const url = `${supabaseUrl}/functions/v1/sharepoint`;
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (window.MODA_SUPABASE?.client?.supabaseKey) {
            headers['apikey'] = window.MODA_SUPABASE.client.supabaseKey;
            headers['Authorization'] = `Bearer ${window.MODA_SUPABASE.client.supabaseKey}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ action, ...params })
        });

        const data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.error || `SharePoint operation failed: ${response.status}`);
        }

        return data;
    }

    /**
     * Upload multiple photos/files
     * @param {Array<File|string>} files - Array of File objects or base64 strings
     * @param {string} folderPath - Destination folder path
     * @param {function} onProgress - Progress callback (index, total, result)
     * @returns {Promise<Array<object>>} - Array of SharePoint file metadata
     */
    async function uploadMultiple(files, folderPath, onProgress = null) {
        const results = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const result = await uploadFile(file, folderPath);
                results.push(result);
                
                if (onProgress) {
                    onProgress(i + 1, files.length, result);
                }
            } catch (error) {
                console.error(`[SharePoint Attachments] Error uploading file ${i + 1}:`, error);
                results.push({ error: error.message, index: i });
            }
        }

        return results;
    }

    // ============================================================================
    // MODULE-SPECIFIC UPLOAD FUNCTIONS
    // ============================================================================

    /**
     * Upload RFI attachments
     * @param {string} projectName - Project name
     * @param {string} rfiId - RFI identifier (e.g., "RFI-2025-001")
     * @param {Array<File|string>} files - Files or base64 strings to upload
     * @param {function} onProgress - Optional progress callback
     */
    async function uploadRFIAttachments(projectName, rfiId, files, onProgress = null) {
        const folderPath = buildRFIPath(projectName, rfiId);
        console.log(`[SharePoint Attachments] Uploading ${files.length} RFI attachments to: ${folderPath}`);
        return await uploadMultiple(files, folderPath, onProgress);
    }

    /**
     * Upload On-Site Report photos
     * @param {string} projectName - Project name
     * @param {string} reportDate - Report date (ISO string or Date)
     * @param {string} setId - Set identifier
     * @param {Array<File|string>} photos - Photos to upload
     * @param {string} moduleSerial - Optional module serial for module-specific photos
     * @param {function} onProgress - Optional progress callback
     */
    async function uploadOnSitePhotos(projectName, reportDate, setId, photos, moduleSerial = null, onProgress = null) {
        const folderPath = buildOnSiteReportPath(projectName, reportDate, setId, moduleSerial);
        console.log(`[SharePoint Attachments] Uploading ${photos.length} On-Site photos to: ${folderPath}`);
        return await uploadMultiple(photos, folderPath, onProgress);
    }

    /**
     * Upload Issue Report photos
     * @param {string} projectName - Project name
     * @param {string} issueId - Issue identifier
     * @param {Array<File|string>} photos - Photos to upload
     * @param {function} onProgress - Optional progress callback
     */
    async function uploadIssuePhotos(projectName, issueId, photos, onProgress = null) {
        const folderPath = buildIssueReportPath(projectName, issueId);
        console.log(`[SharePoint Attachments] Uploading ${photos.length} Issue photos to: ${folderPath}`);
        return await uploadMultiple(photos, folderPath, onProgress);
    }

    /**
     * Upload QA Inspection photos
     * @param {string} projectName - Project name
     * @param {string} moduleSerial - Module serial number
     * @param {Array<File|string>} photos - Photos to upload
     * @param {function} onProgress - Optional progress callback
     */
    async function uploadQAInspectionPhotos(projectName, moduleSerial, photos, onProgress = null) {
        const folderPath = buildQAInspectionPath(projectName, moduleSerial);
        console.log(`[SharePoint Attachments] Uploading ${photos.length} QA Inspection photos to: ${folderPath}`);
        return await uploadMultiple(photos, folderPath, onProgress);
    }

    /**
     * Upload QA Deviation photos
     * @param {string} projectName - Project name
     * @param {string} deviationId - Deviation identifier
     * @param {Array<File|string>} photos - Photos to upload
     * @param {function} onProgress - Optional progress callback
     */
    async function uploadQADeviationPhotos(projectName, deviationId, photos, onProgress = null) {
        const folderPath = buildQADeviationPath(projectName, deviationId);
        console.log(`[SharePoint Attachments] Uploading ${photos.length} QA Deviation photos to: ${folderPath}`);
        return await uploadMultiple(photos, folderPath, onProgress);
    }

    // ============================================================================
    // RETRIEVAL FUNCTIONS
    // ============================================================================

    /**
     * List files in a folder
     */
    async function listFiles(folderPath) {
        try {
            const result = await callSharePointDirect('list', { folderPath });
            return result.value || [];
        } catch (error) {
            console.error(`[SharePoint Attachments] Error listing files:`, error);
            return [];
        }
    }

    /**
     * Get download URL for a file
     */
    async function getDownloadUrl(fileId) {
        const result = await callSharePointDirect('download', { fileId });
        return result.downloadUrl;
    }

    /**
     * Get preview URL for a file (opens in browser)
     */
    async function getPreviewUrl(fileId) {
        const result = await callSharePointDirect('preview', { fileId });
        return result.previewUrl;
    }

    /**
     * Delete a file
     */
    async function deleteFile(fileId) {
        return await callSharePointDirect('delete', { fileId });
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    /**
     * Check if SharePoint attachments are available
     */
    function isAvailable() {
        return window.MODA_SUPABASE?.isInitialized === true;
    }

    /**
     * Test SharePoint connection
     */
    async function testConnection() {
        try {
            const result = await callSharePointDirect('test');
            return { success: true, ...result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // ============================================================================
    // PUBLIC API
    // ============================================================================

    const SharePointAttachments = {
        // Configuration
        ROOT_FOLDER,
        MODULE_TYPES,

        // Path builders (for reference/debugging)
        buildRFIPath,
        buildOnSiteReportPath,
        buildIssueReportPath,
        buildQAInspectionPath,
        buildQADeviationPath,

        // Core functions
        uploadFile,
        uploadMultiple,
        ensureFolderStructure,

        // Module-specific uploads
        uploadRFIAttachments,
        uploadOnSitePhotos,
        uploadIssuePhotos,
        uploadQAInspectionPhotos,
        uploadQADeviationPhotos,

        // Retrieval
        listFiles,
        getDownloadUrl,
        getPreviewUrl,
        deleteFile,

        // Utilities
        isAvailable,
        testConnection,
        sanitizeName,
        generateFileName,
        base64ToFile
    };

    // Export to window
    window.MODA_SHAREPOINT_ATTACHMENTS = SharePointAttachments;

    console.log('[SharePoint Attachments] Module initialized');
})();
