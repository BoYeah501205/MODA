/**
 * useSupabaseOnSite Hook
 * 
 * React hook for managing On-Site reports and issues with Supabase
 * Provides real-time data sync and optimistic updates
 */

(function() {
    'use strict';

    const { useState, useEffect, useCallback, useRef } = React;

    /**
     * Hook for managing daily site reports with Supabase
     */
    function useSupabaseReports(projectId = null) {
        const [reports, setReports] = useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);
        const subscriptionRef = useRef(null);

        // Fetch reports
        const fetchReports = useCallback(async () => {
            if (!window.MODA_ONSITE) {
                console.warn('[useSupabaseReports] MODA_ONSITE not available');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const result = await window.MODA_ONSITE.getRecentReports(30, 100);
                if (result.success) {
                    let data = result.data || [];
                    // Filter by project if specified
                    if (projectId) {
                        data = data.filter(r => r.project_id === projectId);
                    }
                    setReports(data);
                } else {
                    setError(result.error);
                }
            } catch (err) {
                console.error('[useSupabaseReports] Fetch error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }, [projectId]);

        // Set up real-time subscription
        useEffect(() => {
            fetchReports();

            // Subscribe to real-time changes
            const supabase = window.MODA_SUPABASE?.client;
            if (supabase) {
                subscriptionRef.current = supabase
                    .channel('onsite_reports_changes')
                    .on('postgres_changes', 
                        { event: '*', schema: 'public', table: 'onsite_reports' },
                        (payload) => {
                            console.log('[useSupabaseReports] Real-time update:', payload.eventType);
                            fetchReports(); // Refetch on any change
                        }
                    )
                    .subscribe();
            }

            return () => {
                if (subscriptionRef.current) {
                    subscriptionRef.current.unsubscribe();
                }
            };
        }, [fetchReports]);

        // Create or get report for a specific date
        const createOrGetReport = useCallback(async (projectId, date) => {
            const dateStr = date || new Date().toISOString().split('T')[0];
            
            // Check if report exists
            const existing = await window.MODA_ONSITE.getReportByProjectAndDate(projectId, dateStr);
            if (existing.success && existing.exists) {
                return { success: true, data: existing.data, isNew: false };
            }

            // Create new report
            const result = await window.MODA_ONSITE.createReport({
                date: dateStr,
                project_id: projectId,
                report_type: 'set-day'
            });

            if (result.success) {
                setReports(prev => [result.data, ...prev]);
            }

            return { ...result, isNew: true };
        }, []);

        // Update report
        const updateReport = useCallback(async (reportId, updates) => {
            // Optimistic update
            setReports(prev => prev.map(r => 
                r.id === reportId ? { ...r, ...updates } : r
            ));

            const result = await window.MODA_ONSITE.updateReport(reportId, updates);
            
            if (!result.success) {
                // Revert on failure
                fetchReports();
            }

            return result;
        }, [fetchReports]);

        // Delete report
        const deleteReport = useCallback(async (reportId) => {
            // Optimistic update
            setReports(prev => prev.filter(r => r.id !== reportId));

            const result = await window.MODA_ONSITE.deleteReport(reportId);
            
            if (!result.success) {
                fetchReports();
            }

            return result;
        }, [fetchReports]);

        // Get report by date
        const getReportByDate = useCallback((projectId, date) => {
            return reports.find(r => r.project_id === projectId && r.date === date);
        }, [reports]);

        // Get reports for project
        const getReportsForProject = useCallback((projectId) => {
            return reports
                .filter(r => r.project_id === projectId)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
        }, [reports]);

        return {
            reports,
            loading,
            error,
            refetch: fetchReports,
            createOrGetReport,
            updateReport,
            deleteReport,
            getReportByDate,
            getReportsForProject
        };
    }

    /**
     * Hook for managing issues with Supabase
     */
    function useSupabaseIssues(reportId = null) {
        const [issues, setIssues] = useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);
        const subscriptionRef = useRef(null);

        // Fetch issues
        const fetchIssues = useCallback(async () => {
            if (!window.MODA_ONSITE) {
                console.warn('[useSupabaseIssues] MODA_ONSITE not available');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                let result;
                if (reportId) {
                    result = await window.MODA_ONSITE.getIssuesByReport(reportId);
                } else {
                    result = await window.MODA_ONSITE.getUnresolvedIssues();
                }

                if (result.success) {
                    setIssues(result.data || []);
                } else {
                    setError(result.error);
                }
            } catch (err) {
                console.error('[useSupabaseIssues] Fetch error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }, [reportId]);

        // Set up real-time subscription
        useEffect(() => {
            fetchIssues();

            const supabase = window.MODA_SUPABASE?.client;
            if (supabase) {
                subscriptionRef.current = supabase
                    .channel('onsite_issues_changes')
                    .on('postgres_changes',
                        { event: '*', schema: 'public', table: 'onsite_issues' },
                        (payload) => {
                            console.log('[useSupabaseIssues] Real-time update:', payload.eventType);
                            fetchIssues();
                        }
                    )
                    .subscribe();
            }

            return () => {
                if (subscriptionRef.current) {
                    subscriptionRef.current.unsubscribe();
                }
            };
        }, [fetchIssues]);

        // Create issue
        const createIssue = useCallback(async (issueData) => {
            const result = await window.MODA_ONSITE.createIssue(issueData);
            
            if (result.success) {
                setIssues(prev => [result.data, ...prev]);
            }

            return result;
        }, []);

        // Update issue
        const updateIssue = useCallback(async (issueId, updates) => {
            // Optimistic update
            setIssues(prev => prev.map(i => 
                i.id === issueId ? { ...i, ...updates } : i
            ));

            const result = await window.MODA_ONSITE.updateIssue(issueId, updates);
            
            if (!result.success) {
                fetchIssues();
            }

            return result;
        }, [fetchIssues]);

        // Resolve issue
        const resolveIssue = useCallback(async (issueId, resolution) => {
            const result = await window.MODA_ONSITE.resolveIssue(issueId, resolution);
            
            if (result.success) {
                setIssues(prev => prev.map(i => 
                    i.id === issueId ? { ...i, status: 'resolved', resolved_at: new Date().toISOString() } : i
                ));
            }

            return result;
        }, []);

        // Add factory response
        const addFactoryResponse = useCallback(async (issueId, responseData) => {
            const result = await window.MODA_ONSITE.addFactoryResponse(issueId, responseData);
            
            if (result.success) {
                setIssues(prev => prev.map(i => 
                    i.id === issueId ? { ...i, ...result.data } : i
                ));
            }

            return result;
        }, []);

        // Delete issue
        const deleteIssue = useCallback(async (issueId) => {
            setIssues(prev => prev.filter(i => i.id !== issueId));

            const result = await window.MODA_ONSITE.deleteIssue(issueId);
            
            if (!result.success) {
                fetchIssues();
            }

            return result;
        }, [fetchIssues]);

        // Get issues by module
        const getIssuesByModule = useCallback((moduleId) => {
            return issues.filter(i => i.module_id === moduleId);
        }, [issues]);

        // Get open issues
        const getOpenIssues = useCallback(() => {
            return issues.filter(i => i.status === 'open' || i.status === 'in_progress');
        }, [issues]);

        return {
            issues,
            loading,
            error,
            refetch: fetchIssues,
            createIssue,
            updateIssue,
            resolveIssue,
            addFactoryResponse,
            deleteIssue,
            getIssuesByModule,
            getOpenIssues
        };
    }

    /**
     * Hook for managing global issues with Supabase
     */
    function useSupabaseGlobalIssues(reportId) {
        const [globalIssues, setGlobalIssues] = useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);

        // Fetch global issues
        const fetchGlobalIssues = useCallback(async () => {
            if (!window.MODA_ONSITE || !reportId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const result = await window.MODA_ONSITE.getGlobalIssuesByReport(reportId);
                if (result.success) {
                    setGlobalIssues(result.data || []);
                } else {
                    setError(result.error);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }, [reportId]);

        useEffect(() => {
            fetchGlobalIssues();
        }, [fetchGlobalIssues]);

        // Create global issue
        const createGlobalIssue = useCallback(async (issueData) => {
            const result = await window.MODA_ONSITE.createGlobalIssue({
                ...issueData,
                report_id: reportId
            });
            
            if (result.success) {
                setGlobalIssues(prev => [result.data, ...prev]);
            }

            return result;
        }, [reportId]);

        // Update global issue
        const updateGlobalIssue = useCallback(async (issueId, updates) => {
            setGlobalIssues(prev => prev.map(i => 
                i.id === issueId ? { ...i, ...updates } : i
            ));

            const result = await window.MODA_ONSITE.updateGlobalIssue(issueId, updates);
            
            if (!result.success) {
                fetchGlobalIssues();
            }

            return result;
        }, [fetchGlobalIssues]);

        // Delete global issue
        const deleteGlobalIssue = useCallback(async (issueId) => {
            setGlobalIssues(prev => prev.filter(i => i.id !== issueId));

            const result = await window.MODA_ONSITE.deleteGlobalIssue(issueId);
            
            if (!result.success) {
                fetchGlobalIssues();
            }

            return result;
        }, [fetchGlobalIssues]);

        return {
            globalIssues,
            loading,
            error,
            refetch: fetchGlobalIssues,
            createGlobalIssue,
            updateGlobalIssue,
            deleteGlobalIssue
        };
    }

    /**
     * Hook for managing modules set with Supabase
     */
    function useSupabaseModulesSet(reportId) {
        const [modulesSet, setModulesSet] = useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);

        // Fetch modules set
        const fetchModulesSet = useCallback(async () => {
            if (!window.MODA_ONSITE || !reportId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const result = await window.MODA_ONSITE.getModulesSetByReport(reportId);
                if (result.success) {
                    setModulesSet(result.data || []);
                } else {
                    setError(result.error);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }, [reportId]);

        useEffect(() => {
            fetchModulesSet();
        }, [fetchModulesSet]);

        // Log module as set
        const logModuleSet = useCallback(async (moduleId, setData = {}) => {
            const result = await window.MODA_ONSITE.logModuleSet(reportId, moduleId, setData);
            
            if (result.success) {
                setModulesSet(prev => [...prev, result.data]);
            }

            return result;
        }, [reportId]);

        // Remove module set
        const removeModuleSet = useCallback(async (moduleSetId) => {
            setModulesSet(prev => prev.filter(m => m.id !== moduleSetId));

            const result = await window.MODA_ONSITE.removeModuleSet(moduleSetId);
            
            if (!result.success) {
                fetchModulesSet();
            }

            return result;
        }, [fetchModulesSet]);

        // Check if module is set
        const isModuleSet = useCallback((moduleId) => {
            return modulesSet.some(m => m.module_id === moduleId);
        }, [modulesSet]);

        return {
            modulesSet,
            loading,
            error,
            refetch: fetchModulesSet,
            logModuleSet,
            removeModuleSet,
            isModuleSet
        };
    }

    /**
     * Combined hook for full On-Site functionality
     */
    function useSupabaseOnSite(projectId = null) {
        const [activeReportId, setActiveReportId] = useState(null);
        
        const reportsHook = useSupabaseReports(projectId);
        const issuesHook = useSupabaseIssues(activeReportId);
        const globalIssuesHook = useSupabaseGlobalIssues(activeReportId);
        const modulesSetHook = useSupabaseModulesSet(activeReportId);

        // Set active report
        const setActiveReport = useCallback((reportId) => {
            setActiveReportId(reportId);
        }, []);

        // Get active report data
        const activeReport = activeReportId 
            ? reportsHook.reports.find(r => r.id === activeReportId)
            : null;

        // Export report
        const exportReport = useCallback(async (reportId) => {
            const result = await window.MODA_ONSITE.getReportById(reportId);
            if (result.success) {
                window.MODA_ONSITE.downloadReportHTML(result.data);
            }
            return result;
        }, []);

        // Print report
        const printReport = useCallback(async (reportId) => {
            const result = await window.MODA_ONSITE.getReportById(reportId);
            if (result.success) {
                window.MODA_ONSITE.printReport(result.data);
            }
            return result;
        }, []);

        return {
            // Reports
            reports: reportsHook.reports,
            reportsLoading: reportsHook.loading,
            reportsError: reportsHook.error,
            createOrGetReport: reportsHook.createOrGetReport,
            updateReport: reportsHook.updateReport,
            deleteReport: reportsHook.deleteReport,
            getReportByDate: reportsHook.getReportByDate,
            getReportsForProject: reportsHook.getReportsForProject,
            refetchReports: reportsHook.refetch,

            // Active report
            activeReport,
            activeReportId,
            setActiveReport,

            // Issues
            issues: issuesHook.issues,
            issuesLoading: issuesHook.loading,
            createIssue: issuesHook.createIssue,
            updateIssue: issuesHook.updateIssue,
            resolveIssue: issuesHook.resolveIssue,
            addFactoryResponse: issuesHook.addFactoryResponse,
            deleteIssue: issuesHook.deleteIssue,
            getIssuesByModule: issuesHook.getIssuesByModule,
            getOpenIssues: issuesHook.getOpenIssues,
            refetchIssues: issuesHook.refetch,

            // Global Issues
            globalIssues: globalIssuesHook.globalIssues,
            createGlobalIssue: globalIssuesHook.createGlobalIssue,
            updateGlobalIssue: globalIssuesHook.updateGlobalIssue,
            deleteGlobalIssue: globalIssuesHook.deleteGlobalIssue,
            refetchGlobalIssues: globalIssuesHook.refetch,

            // Modules Set
            modulesSet: modulesSetHook.modulesSet,
            logModuleSet: modulesSetHook.logModuleSet,
            removeModuleSet: modulesSetHook.removeModuleSet,
            isModuleSet: modulesSetHook.isModuleSet,
            refetchModulesSet: modulesSetHook.refetch,

            // Export
            exportReport,
            printReport,

            // Constants (from MODA_ONSITE)
            ISSUE_TYPES: window.MODA_ONSITE?.ISSUE_TYPES || [],
            SEVERITY_LEVELS: window.MODA_ONSITE?.SEVERITY_LEVELS || [],
            GLOBAL_ITEM_PRIORITIES: window.MODA_ONSITE?.GLOBAL_ITEM_PRIORITIES || [],
            TRADES: window.MODA_ONSITE?.TRADES || [],
            REPORT_TYPES: window.MODA_ONSITE?.REPORT_TYPES || []
        };
    }

    // Expose hooks globally
    window.useSupabaseReports = useSupabaseReports;
    window.useSupabaseIssues = useSupabaseIssues;
    window.useSupabaseGlobalIssues = useSupabaseGlobalIssues;
    window.useSupabaseModulesSet = useSupabaseModulesSet;
    window.useSupabaseOnSite = useSupabaseOnSite;

    if (window.MODA_DEBUG) console.log('[MODA] Supabase On-Site hooks loaded');
})();
