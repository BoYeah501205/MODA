// ============================================================================
// MODA STORAGE MANAGER - Optimized localStorage Operations
// Implements batching, debouncing, and validation
// ============================================================================

const MODA_STORAGE = (function() {
    'use strict';
    
    // Pending writes queue for batching
    const pendingWrites = new Map();
    let batchTimeout = null;
    
    // ===== PRIVATE METHODS =====
    
    function executeBatchWrite() {
        if (pendingWrites.size === 0) return;
        
        console.log(`[Storage] Batch writing ${pendingWrites.size} items`);
        
        pendingWrites.forEach((value, key) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error(`[Storage] Failed to write ${key}:`, error);
            }
        });
        
        pendingWrites.clear();
        batchTimeout = null;
    }
    
    function scheduleBatchWrite() {
        if (batchTimeout) {
            clearTimeout(batchTimeout);
        }
        
        batchTimeout = setTimeout(
            executeBatchWrite,
            MODA_CONSTANTS.STORAGE_BATCH_DELAY
        );
    }
    
    // ===== PUBLIC API =====
    
    return {
        
        // Get item from localStorage with optional default value
        get: function(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error(`[Storage] Failed to read ${key}:`, error);
                return defaultValue;
            }
        },
        
        // Set item immediately (synchronous)
        set: function(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return { success: true };
            } catch (error) {
                console.error(`[Storage] Failed to write ${key}:`, error);
                return { success: false, error: error.message };
            }
        },
        
        // Queue item for batched write (optimized for frequent updates)
        setBatched: function(key, value) {
            pendingWrites.set(key, value);
            scheduleBatchWrite();
        },
        
        // Force immediate batch write
        flush: function() {
            if (batchTimeout) {
                clearTimeout(batchTimeout);
            }
            executeBatchWrite();
        },
        
        // Remove item
        remove: function(key) {
            try {
                localStorage.removeItem(key);
                pendingWrites.delete(key);
                return { success: true };
            } catch (error) {
                console.error(`[Storage] Failed to remove ${key}:`, error);
                return { success: false, error: error.message };
            }
        },
        
        // Clear all storage
        clear: function() {
            try {
                localStorage.clear();
                pendingWrites.clear();
                if (batchTimeout) {
                    clearTimeout(batchTimeout);
                    batchTimeout = null;
                }
                return { success: true };
            } catch (error) {
                console.error('[Storage] Failed to clear:', error);
                return { success: false, error: error.message };
            }
        },
        
        // Get storage size estimate
        getSize: function() {
            let total = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length + key.length;
                }
            }
            return {
                bytes: total,
                kb: (total / 1024).toFixed(2),
                mb: (total / 1024 / 1024).toFixed(2)
            };
        },
        
        // Check if key exists
        has: function(key) {
            return localStorage.getItem(key) !== null;
        },
        
        // Get all keys
        keys: function() {
            return Object.keys(localStorage);
        },
        
        // Export all data
        exportAll: function() {
            const data = {};
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    try {
                        data[key] = JSON.parse(localStorage[key]);
                    } catch (e) {
                        data[key] = localStorage[key];
                    }
                }
            }
            return data;
        },
        
        // Import data (with validation)
        importAll: function(data, overwrite = false) {
            const results = {
                success: [],
                failed: [],
                skipped: []
            };
            
            for (let key in data) {
                if (data.hasOwnProperty(key)) {
                    if (!overwrite && this.has(key)) {
                        results.skipped.push(key);
                        continue;
                    }
                    
                    const result = this.set(key, data[key]);
                    if (result.success) {
                        results.success.push(key);
                    } else {
                        results.failed.push({ key, error: result.error });
                    }
                }
            }
            
            return results;
        },
        
        // Validate storage quota
        checkQuota: function() {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                return navigator.storage.estimate().then(estimate => {
                    return {
                        usage: estimate.usage,
                        quota: estimate.quota,
                        percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(2)
                    };
                });
            }
            return Promise.resolve(null);
        },
        
        // Auto-cleanup old data
        cleanup: function(retentionDays = MODA_CONSTANTS.TRASH_RETENTION_DAYS) {
            const cutoffDate = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
            let cleaned = 0;
            
            // Clean trash projects
            const trashProjects = this.get(MODA_CONSTANTS.STORAGE_KEYS.TRASH_PROJECTS, []);
            const filteredProjects = trashProjects.filter(p => p.deletedAt > cutoffDate);
            if (filteredProjects.length < trashProjects.length) {
                this.set(MODA_CONSTANTS.STORAGE_KEYS.TRASH_PROJECTS, filteredProjects);
                cleaned += trashProjects.length - filteredProjects.length;
            }
            
            // Clean trash employees
            const trashEmployees = this.get(MODA_CONSTANTS.STORAGE_KEYS.TRASH_EMPLOYEES, []);
            const filteredEmployees = trashEmployees.filter(e => e.deletedAt > cutoffDate);
            if (filteredEmployees.length < trashEmployees.length) {
                this.set(MODA_CONSTANTS.STORAGE_KEYS.TRASH_EMPLOYEES, filteredEmployees);
                cleaned += trashEmployees.length - filteredEmployees.length;
            }
            
            console.log(`[Storage] Cleaned ${cleaned} old items`);
            return { cleaned };
        }
    };
})();

// Flush pending writes before page unload
window.addEventListener('beforeunload', () => {
    MODA_STORAGE.flush();
});

// Periodic cleanup (every hour)
setInterval(() => {
    MODA_STORAGE.cleanup();
}, 60 * 60 * 1000);
