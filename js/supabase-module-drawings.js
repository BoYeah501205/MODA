/**
 * Supabase Module Drawings Data Layer for MODA
 * 
 * Handles queries for module shop drawing packages.
 * Used by QR code system and module drawings viewer.
 */

(function() {
    'use strict';

    // Check if Supabase client is available
    if (!window.MODA_SUPABASE) {
        console.warn('[Module Drawings] Supabase client not initialized');
        window.MODA_MODULE_DRAWINGS = {
            isAvailable: () => false
        };
        return;
    }

    const getClient = () => window.MODA_SUPABASE.client;
    const isAvailable = () => window.MODA_SUPABASE.isInitialized && getClient();

    // ============================================================================
    // MODULE DRAWINGS API
    // ============================================================================

    const ModuleDrawingsAPI = {
        /**
         * Get all shop drawings for a module by serial number
         * @param {string} serialNumber - Module serial number (e.g., "25-0962")
         * @returns {Promise<Array>} Array of drawing files with versions
         */
        async getBySerialNumber(serialNumber) {
            if (!isAvailable()) throw new Error('Supabase not available');
            if (!serialNumber) throw new Error('Serial number is required');

            console.log('[Module Drawings] Fetching drawings for:', serialNumber);

            try {
                const { data, error } = await getClient()
                    .rpc('get_module_shop_drawings', { 
                        p_serial_number: serialNumber 
                    });

                if (error) throw error;

                // Group by drawing_id to organize versions
                const drawingsMap = new Map();
                
                (data || []).forEach(row => {
                    if (!drawingsMap.has(row.drawing_id)) {
                        drawingsMap.set(row.drawing_id, {
                            id: row.drawing_id,
                            name: row.drawing_name,
                            description: row.drawing_description,
                            project_id: row.project_id,
                            project_name: row.project_name,
                            module_id: row.module_id,
                            module_serial: row.module_serial,
                            versions: []
                        });
                    }
                    
                    drawingsMap.get(row.drawing_id).versions.push({
                        id: row.version_id,
                        version: row.version_number,
                        file_name: row.file_name,
                        file_size: row.file_size,
                        file_url: row.file_url,
                        storage_path: row.storage_path,
                        storage_type: row.storage_type,
                        sharepoint_file_id: row.sharepoint_file_id,
                        uploaded_at: row.uploaded_at,
                        uploaded_by: row.uploaded_by,
                        notes: row.notes
                    });
                });

                const drawings = Array.from(drawingsMap.values());
                console.log('[Module Drawings] Found', drawings.length, 'drawing(s)');
                return drawings;
            } catch (error) {
                console.error('[Module Drawings] Error fetching drawings:', error);
                throw error;
            }
        },

        /**
         * Check if module has shop drawings
         * @param {string} serialNumber - Module serial number
         * @returns {Promise<boolean>}
         */
        async hasDrawings(serialNumber) {
            if (!isAvailable()) throw new Error('Supabase not available');
            if (!serialNumber) return false;

            try {
                const { data, error } = await getClient()
                    .rpc('module_has_shop_drawings', { 
                        p_serial_number: serialNumber 
                    });

                if (error) throw error;
                return data === true;
            } catch (error) {
                console.error('[Module Drawings] Error checking drawings:', error);
                return false;
            }
        },

        /**
         * Get module information by serial number
         * @param {string} serialNumber - Module serial number
         * @returns {Promise<Object|null>} Module info or null if not found
         */
        async getModuleInfo(serialNumber) {
            if (!isAvailable()) throw new Error('Supabase not available');
            if (!serialNumber) throw new Error('Serial number is required');

            try {
                const { data, error } = await getClient()
                    .rpc('get_module_by_serial', { 
                        p_serial_number: serialNumber 
                    });

                if (error) throw error;
                
                if (!data || data.length === 0) {
                    console.warn('[Module Drawings] Module not found:', serialNumber);
                    return null;
                }

                return data[0];
            } catch (error) {
                console.error('[Module Drawings] Error fetching module info:', error);
                throw error;
            }
        },

        /**
         * Get download URL for a drawing version
         * @param {string} storagePath - Storage path from version record
         * @param {string} sharePointFileId - SharePoint file ID (optional)
         * @returns {Promise<string>} Download URL
         */
        async getDownloadUrl(storagePath, sharePointFileId = null) {
            if (!isAvailable()) throw new Error('Supabase not available');

            // Use the existing drawings API for URL generation
            if (window.MODA_SUPABASE_DRAWINGS?.versions?.getDownloadUrl) {
                return await window.MODA_SUPABASE_DRAWINGS.versions.getDownloadUrl(
                    storagePath, 
                    sharePointFileId
                );
            }

            throw new Error('Drawings API not available');
        },

        /**
         * Get view URL for a drawing version
         * @param {string} storagePath - Storage path from version record
         * @param {string} sharePointFileId - SharePoint file ID (optional)
         * @returns {Promise<string>} View URL
         */
        async getViewUrl(storagePath, sharePointFileId = null) {
            if (!isAvailable()) throw new Error('Supabase not available');

            // Use the existing drawings API for URL generation
            if (window.MODA_SUPABASE_DRAWINGS?.versions?.getViewUrl) {
                return await window.MODA_SUPABASE_DRAWINGS.versions.getViewUrl(
                    storagePath, 
                    sharePointFileId
                );
            }

            throw new Error('Drawings API not available');
        }
    };

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    const Utils = {
        /**
         * Format file size for display
         * @param {number} bytes - File size in bytes
         * @returns {string} Formatted size (e.g., "2.5 MB")
         */
        formatFileSize(bytes) {
            if (!bytes || bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        /**
         * Format date for display
         * @param {string} dateString - ISO date string
         * @returns {string} Formatted date
         */
        formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        /**
         * Get latest version from versions array
         * @param {Array} versions - Array of version objects
         * @returns {Object|null} Latest version
         */
        getLatestVersion(versions) {
            if (!versions || versions.length === 0) return null;
            return versions.sort((a, b) => 
                new Date(b.uploaded_at) - new Date(a.uploaded_at)
            )[0];
        }
    };

    // ============================================================================
    // EXPORT
    // ============================================================================

    window.MODA_MODULE_DRAWINGS = {
        isAvailable,
        ...ModuleDrawingsAPI,
        utils: Utils
    };

    if (window.MODA_DEBUG) console.log('[Module Drawings] Data layer loaded');

})();
