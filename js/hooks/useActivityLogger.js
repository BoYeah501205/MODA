// ============================================================================
// MODA Activity Logger React Hook
// Provides easy-to-use activity logging within React components
// ============================================================================

(function() {
    'use strict';

    const { useCallback, useEffect, useRef } = React;

    /**
     * Hook for logging user activity in React components
     * Automatically captures user context from auth
     * 
     * @param {Object} options - Configuration options
     * @param {string} options.category - Default category for logs from this component
     * @param {string} options.entityType - Default entity type
     * @returns {Object} Logger methods
     */
    function useActivityLogger(options = {}) {
        const { category = null, entityType = null } = options;
        const mountedRef = useRef(true);

        useEffect(() => {
            mountedRef.current = true;
            return () => {
                mountedRef.current = false;
            };
        }, []);

        // Generic log function
        const log = useCallback(async (logOptions) => {
            if (!window.ActivityLog) {
                console.warn('[useActivityLogger] ActivityLog module not loaded');
                return null;
            }

            const finalOptions = {
                actionCategory: category,
                entityType: entityType,
                ...logOptions
            };

            return window.ActivityLog.log(finalOptions);
        }, [category, entityType]);

        // Log create action
        const logCreate = useCallback(async (entityId, entityName, details = {}) => {
            if (!window.ActivityLog) return null;
            return window.ActivityLog.logCreate(
                category,
                entityType,
                entityId,
                entityName,
                details
            );
        }, [category, entityType]);

        // Log update action with before/after values
        const logUpdate = useCallback(async (entityId, entityName, previousValue, newValue) => {
            if (!window.ActivityLog) return null;
            return window.ActivityLog.logUpdate(
                category,
                entityType,
                entityId,
                entityName,
                previousValue,
                newValue
            );
        }, [category, entityType]);

        // Log delete action
        const logDelete = useCallback(async (entityId, entityName, deletedData = {}) => {
            if (!window.ActivityLog) return null;
            return window.ActivityLog.logDelete(
                category,
                entityType,
                entityId,
                entityName,
                deletedData
            );
        }, [category, entityType]);

        // Log view/read action (batched, low priority)
        const logView = useCallback(async (entityId, entityName) => {
            if (!window.ActivityLog) return null;
            return window.ActivityLog.log({
                actionType: window.ActivityLog.ACTION_TYPES.VIEW,
                actionCategory: category,
                entityType: entityType,
                entityId,
                entityName,
                immediate: false // Batch these
            });
        }, [category, entityType]);

        // Log import action
        const logImport = useCallback(async (count, details = {}) => {
            if (!window.ActivityLog) return null;
            return window.ActivityLog.logImport(category, entityType, count, details);
        }, [category, entityType]);

        // Log export action
        const logExport = useCallback(async (count, format = 'csv') => {
            if (!window.ActivityLog) return null;
            return window.ActivityLog.logExport(category, entityType, count, format);
        }, [category, entityType]);

        return {
            log,
            logCreate,
            logUpdate,
            logDelete,
            logView,
            logImport,
            logExport
        };
    }

    /**
     * Hook for fetching activity logs with pagination and filtering
     * 
     * @param {Object} filters - Query filters
     * @returns {Object} { logs, loading, error, totalCount, refetch, loadMore }
     */
    function useActivityLogs(filters = {}) {
        const { useState, useEffect, useCallback, useRef } = React;
        
        const [logs, setLogs] = useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);
        const [totalCount, setTotalCount] = useState(0);
        const [offset, setOffset] = useState(0);
        const mountedRef = useRef(true);
        
        const limit = filters.limit || 50;

        const fetchLogs = useCallback(async (reset = false) => {
            if (!window.ActivityLog) {
                setError('ActivityLog module not loaded');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            const currentOffset = reset ? 0 : offset;

            try {
                const result = await window.ActivityLog.getLogs({
                    ...filters,
                    limit,
                    offset: currentOffset
                });

                if (!mountedRef.current) return;

                if (result.error) {
                    setError(result.error);
                } else {
                    if (reset) {
                        setLogs(result.data);
                        setOffset(limit);
                    } else {
                        setLogs(prev => [...prev, ...result.data]);
                        setOffset(prev => prev + limit);
                    }
                    setTotalCount(result.count);
                }
            } catch (err) {
                if (mountedRef.current) {
                    setError(err.message);
                }
            } finally {
                if (mountedRef.current) {
                    setLoading(false);
                }
            }
        }, [filters, offset, limit]);

        // Initial fetch and refetch on filter change
        useEffect(() => {
            mountedRef.current = true;
            setOffset(0);
            fetchLogs(true);
            
            return () => {
                mountedRef.current = false;
            };
        }, [JSON.stringify(filters)]);

        const refetch = useCallback(() => {
            setOffset(0);
            fetchLogs(true);
        }, [fetchLogs]);

        const loadMore = useCallback(() => {
            if (!loading && logs.length < totalCount) {
                fetchLogs(false);
            }
        }, [loading, logs.length, totalCount, fetchLogs]);

        const hasMore = logs.length < totalCount;

        return {
            logs,
            loading,
            error,
            totalCount,
            hasMore,
            refetch,
            loadMore
        };
    }

    /**
     * Hook for real-time activity feed (subscribes to new logs)
     * 
     * @param {Object} filters - Optional filters for subscription
     * @returns {Object} { recentLogs, isConnected }
     */
    function useActivityFeed(filters = {}) {
        const { useState, useEffect, useRef } = React;
        
        const [recentLogs, setRecentLogs] = useState([]);
        const [isConnected, setIsConnected] = useState(false);
        const subscriptionRef = useRef(null);
        const MAX_FEED_SIZE = 50;

        useEffect(() => {
            const supabase = window.supabaseClient;
            if (!supabase) {
                console.warn('[useActivityFeed] Supabase not available');
                return;
            }

            // Subscribe to new activity logs
            const channel = supabase
                .channel('activity_logs_feed')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'activity_logs'
                    },
                    (payload) => {
                        const newLog = payload.new;
                        
                        // Apply filters if specified
                        if (filters.actionCategory && newLog.action_category !== filters.actionCategory) return;
                        if (filters.severity && newLog.severity !== filters.severity) return;
                        
                        setRecentLogs(prev => {
                            const updated = [newLog, ...prev];
                            return updated.slice(0, MAX_FEED_SIZE);
                        });
                    }
                )
                .subscribe((status) => {
                    setIsConnected(status === 'SUBSCRIBED');
                });

            subscriptionRef.current = channel;

            return () => {
                if (subscriptionRef.current) {
                    supabase.removeChannel(subscriptionRef.current);
                }
            };
        }, [JSON.stringify(filters)]);

        return {
            recentLogs,
            isConnected
        };
    }

    // Export hooks to window
    window.useActivityLogger = useActivityLogger;
    window.useActivityLogs = useActivityLogs;
    window.useActivityFeed = useActivityFeed;

    if (window.MODA_DEBUG) console.log('[useActivityLogger] Hooks loaded');
})();
