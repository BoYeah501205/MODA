// ============================================================================
// MODA Activity Log - Supabase Data Access Layer
// Handles logging and querying user activity
// ============================================================================

(function() {
    'use strict';

    // Action types
    const ACTION_TYPES = {
        // Authentication
        LOGIN: 'login',
        LOGOUT: 'logout',
        LOGIN_FAILED: 'login_failed',
        PASSWORD_RESET: 'password_reset',
        PASSWORD_CHANGE: 'password_change',
        
        // CRUD operations
        CREATE: 'create',
        READ: 'read',
        UPDATE: 'update',
        DELETE: 'delete',
        
        // Bulk operations
        IMPORT: 'import',
        EXPORT: 'export',
        BULK_UPDATE: 'bulk_update',
        
        // Navigation (optional, low priority)
        VIEW: 'view',
        NAVIGATE: 'navigate'
    };

    // Action categories
    const ACTION_CATEGORIES = {
        AUTH: 'auth',
        PROJECT: 'project',
        MODULE: 'module',
        EMPLOYEE: 'employee',
        USER: 'user',
        PERMISSION: 'permission',
        ROLE: 'role',
        DEVIATION: 'deviation',
        TRANSPORT: 'transport',
        EQUIPMENT: 'equipment',
        SCHEDULE: 'schedule',
        SYSTEM: 'system'
    };

    // Severity levels
    const SEVERITY = {
        INFO: 'info',
        WARNING: 'warning',
        CRITICAL: 'critical'
    };

    // Determine severity based on action
    function getSeverity(actionType, actionCategory) {
        // Critical: deletions, permission changes, auth failures
        if (actionType === ACTION_TYPES.DELETE) return SEVERITY.CRITICAL;
        if (actionCategory === ACTION_CATEGORIES.PERMISSION) return SEVERITY.CRITICAL;
        if (actionCategory === ACTION_CATEGORIES.ROLE) return SEVERITY.CRITICAL;
        if (actionType === ACTION_TYPES.LOGIN_FAILED) return SEVERITY.WARNING;
        if (actionType === ACTION_TYPES.BULK_UPDATE) return SEVERITY.WARNING;
        
        return SEVERITY.INFO;
    }

    // Get current user info from global state (NOT from hook - hooks can't be called outside components)
    function getCurrentUserInfo() {
        // Try to get user from global window state set by auth system
        const user = window.MODA_CURRENT_USER || window.currentUser || null;
        
        if (!user) {
            // Try localStorage as fallback
            try {
                const session = localStorage.getItem('autovol_session');
                if (session) {
                    const parsed = JSON.parse(session);
                    return {
                        userId: parsed.id || parsed.uid || null,
                        userEmail: parsed.email || 'unknown',
                        userName: parsed.name || parsed.displayName || parsed.email?.split('@')[0] || 'Unknown'
                    };
                }
            } catch (e) { /* ignore */ }
            return { userId: null, userEmail: 'anonymous', userName: 'Anonymous' };
        }
        
        return {
            userId: user.id || user.uid || null,
            userEmail: user.email || 'unknown',
            userName: user.name || user.displayName || user.email?.split('@')[0] || 'Unknown'
        };
    }

    // Queue for batching low-priority logs
    let logQueue = [];
    let flushTimeout = null;
    const FLUSH_INTERVAL = 5000; // 5 seconds
    const MAX_QUEUE_SIZE = 10;

    // Flush queued logs to database
    async function flushLogQueue() {
        if (logQueue.length === 0) return;
        
        const logsToInsert = [...logQueue];
        logQueue = [];
        
        try {
            const supabase = window.supabaseClient;
            if (!supabase) {
                console.warn('[ActivityLog] Supabase not available, logs discarded');
                return;
            }
            
            const { error } = await supabase
                .from('activity_logs')
                .insert(logsToInsert);
            
            if (error) {
                console.error('[ActivityLog] Batch insert error:', error);
            }
        } catch (err) {
            console.error('[ActivityLog] Flush error:', err);
        }
    }

    // Schedule flush
    function scheduleFlush() {
        if (flushTimeout) return;
        flushTimeout = setTimeout(() => {
            flushTimeout = null;
            flushLogQueue();
        }, FLUSH_INTERVAL);
    }

    // Main logging function
    async function logActivity(options) {
        const {
            actionType,
            actionCategory,
            entityType = null,
            entityId = null,
            entityName = null,
            details = {},
            severity = null,
            immediate = false // If true, log immediately instead of batching
        } = options;

        const userInfo = getCurrentUserInfo();
        const computedSeverity = severity || getSeverity(actionType, actionCategory);
        
        const logEntry = {
            user_id: userInfo.userId,
            user_email: userInfo.userEmail,
            user_name: userInfo.userName,
            action_type: actionType,
            action_category: actionCategory,
            entity_type: entityType,
            entity_id: entityId,
            entity_name: entityName,
            details: details,
            severity: computedSeverity,
            created_at: new Date().toISOString()
        };

        // Critical/warning logs or immediate flag = log immediately
        if (immediate || computedSeverity !== SEVERITY.INFO) {
            try {
                const supabase = window.supabaseClient;
                if (!supabase) {
                    console.warn('[ActivityLog] Supabase not available');
                    return null;
                }
                
                const { data, error } = await supabase
                    .from('activity_logs')
                    .insert([logEntry])
                    .select()
                    .single();
                
                if (error) {
                    console.error('[ActivityLog] Insert error:', error);
                    return null;
                }
                
                return data?.id;
            } catch (err) {
                console.error('[ActivityLog] Error:', err);
                return null;
            }
        }
        
        // Low priority = batch
        logQueue.push(logEntry);
        if (logQueue.length >= MAX_QUEUE_SIZE) {
            flushLogQueue();
        } else {
            scheduleFlush();
        }
        
        return 'queued';
    }

    // ========================================================================
    // CONVENIENCE METHODS
    // ========================================================================

    // Auth events
    async function logLogin(userEmail, userName, userId = null) {
        return logActivity({
            actionType: ACTION_TYPES.LOGIN,
            actionCategory: ACTION_CATEGORIES.AUTH,
            details: { method: 'email' },
            immediate: true
        });
    }

    async function logLogout() {
        return logActivity({
            actionType: ACTION_TYPES.LOGOUT,
            actionCategory: ACTION_CATEGORIES.AUTH,
            immediate: true
        });
    }

    async function logLoginFailed(email, reason = 'invalid_credentials') {
        return logActivity({
            actionType: ACTION_TYPES.LOGIN_FAILED,
            actionCategory: ACTION_CATEGORIES.AUTH,
            details: { email, reason },
            severity: SEVERITY.WARNING,
            immediate: true
        });
    }

    // CRUD operations
    async function logCreate(category, entityType, entityId, entityName, details = {}) {
        return logActivity({
            actionType: ACTION_TYPES.CREATE,
            actionCategory: category,
            entityType,
            entityId,
            entityName,
            details,
            immediate: true
        });
    }

    async function logUpdate(category, entityType, entityId, entityName, previousValue, newValue) {
        return logActivity({
            actionType: ACTION_TYPES.UPDATE,
            actionCategory: category,
            entityType,
            entityId,
            entityName,
            details: { previous: previousValue, new: newValue },
            immediate: true
        });
    }

    async function logDelete(category, entityType, entityId, entityName, deletedData = {}) {
        return logActivity({
            actionType: ACTION_TYPES.DELETE,
            actionCategory: category,
            entityType,
            entityId,
            entityName,
            details: { deleted: deletedData },
            severity: SEVERITY.CRITICAL,
            immediate: true
        });
    }

    // Bulk operations
    async function logImport(category, entityType, count, details = {}) {
        return logActivity({
            actionType: ACTION_TYPES.IMPORT,
            actionCategory: category,
            entityType,
            entityName: `${count} ${entityType}s imported`,
            details: { count, ...details },
            immediate: true
        });
    }

    async function logExport(category, entityType, count, format = 'csv') {
        return logActivity({
            actionType: ACTION_TYPES.EXPORT,
            actionCategory: category,
            entityType,
            entityName: `${count} ${entityType}s exported`,
            details: { count, format },
            immediate: true
        });
    }

    // Permission changes
    async function logPermissionChange(userId, userEmail, previousRole, newRole) {
        return logActivity({
            actionType: ACTION_TYPES.UPDATE,
            actionCategory: ACTION_CATEGORIES.PERMISSION,
            entityType: 'user',
            entityId: userId,
            entityName: userEmail,
            details: { previous: { role: previousRole }, new: { role: newRole } },
            severity: SEVERITY.CRITICAL,
            immediate: true
        });
    }

    // ========================================================================
    // QUERY METHODS
    // ========================================================================

    async function getActivityLogs(options = {}) {
        const {
            userId = null,
            userEmail = null,
            actionType = null,
            actionCategory = null,
            entityType = null,
            entityId = null,
            severity = null,
            startDate = null,
            endDate = null,
            limit = 100,
            offset = 0,
            orderBy = 'created_at',
            orderDirection = 'desc'
        } = options;

        try {
            const supabase = window.supabaseClient;
            if (!supabase) {
                console.warn('[ActivityLog] Supabase not available');
                return { data: [], count: 0, error: 'Supabase not available' };
            }

            let query = supabase
                .from('activity_logs')
                .select('*', { count: 'exact' });

            // Apply filters
            if (userId) query = query.eq('user_id', userId);
            if (userEmail) query = query.ilike('user_email', `%${userEmail}%`);
            if (actionType) query = query.eq('action_type', actionType);
            if (actionCategory) query = query.eq('action_category', actionCategory);
            if (entityType) query = query.eq('entity_type', entityType);
            if (entityId) query = query.eq('entity_id', entityId);
            if (severity) query = query.eq('severity', severity);
            if (startDate) query = query.gte('created_at', startDate);
            if (endDate) query = query.lte('created_at', endDate);

            // Apply ordering and pagination
            query = query
                .order(orderBy, { ascending: orderDirection === 'asc' })
                .range(offset, offset + limit - 1);

            const { data, count, error } = await query;

            if (error) {
                console.error('[ActivityLog] Query error:', error);
                return { data: [], count: 0, error: error.message };
            }

            return { data: data || [], count: count || 0, error: null };
        } catch (err) {
            console.error('[ActivityLog] Query error:', err);
            return { data: [], count: 0, error: err.message };
        }
    }

    // Get activity for a specific entity (e.g., project history)
    async function getEntityHistory(entityType, entityId, limit = 50) {
        return getActivityLogs({
            entityType,
            entityId,
            limit,
            orderBy: 'created_at',
            orderDirection: 'desc'
        });
    }

    // Get activity for a specific user
    async function getUserActivity(userId, limit = 50) {
        return getActivityLogs({
            userId,
            limit,
            orderBy: 'created_at',
            orderDirection: 'desc'
        });
    }

    // Get recent activity (for dashboard)
    async function getRecentActivity(limit = 20) {
        return getActivityLogs({
            limit,
            orderBy: 'created_at',
            orderDirection: 'desc'
        });
    }

    // Get activity stats
    async function getActivityStats(days = 30) {
        try {
            const supabase = window.supabaseClient;
            if (!supabase) return { data: [], error: 'Supabase not available' };

            const { data, error } = await supabase
                .from('activity_stats')
                .select('*')
                .gte('day', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

            return { data: data || [], error: error?.message || null };
        } catch (err) {
            return { data: [], error: err.message };
        }
    }

    // ========================================================================
    // CLEANUP
    // ========================================================================

    async function archiveOldLogs() {
        try {
            const supabase = window.supabaseClient;
            if (!supabase) return { success: false, error: 'Supabase not available' };

            const { data, error } = await supabase.rpc('archive_old_activity_logs');

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, archivedCount: data };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
        if (logQueue.length > 0) {
            // Use sendBeacon for reliable delivery on page close
            const supabase = window.supabaseClient;
            if (supabase && navigator.sendBeacon) {
                // Note: sendBeacon with Supabase requires custom endpoint
                // For now, just try to flush synchronously
                flushLogQueue();
            }
        }
    });

    // ========================================================================
    // EXPORT
    // ========================================================================

    window.ActivityLog = {
        // Constants
        ACTION_TYPES,
        ACTION_CATEGORIES,
        SEVERITY,
        
        // Main logging
        log: logActivity,
        
        // Convenience methods
        logLogin,
        logLogout,
        logLoginFailed,
        logCreate,
        logUpdate,
        logDelete,
        logImport,
        logExport,
        logPermissionChange,
        
        // Query methods
        getLogs: getActivityLogs,
        getEntityHistory,
        getUserActivity,
        getRecentActivity,
        getStats: getActivityStats,
        
        // Maintenance
        archiveOldLogs,
        flushQueue: flushLogQueue
    };

    console.log('[ActivityLog] Module loaded');
})();
