/**
 * Supabase Issues Data Layer for MODA Engineering Issue Tracker
 * 
 * Handles PostgreSQL operations for engineering issues, comments, and assignments.
 * Provides localStorage fallback for offline functionality.
 * Supports real-time subscriptions via Supabase Realtime.
 */

(function() {
    'use strict';

    // Check if Supabase client is available
    if (!window.MODA_SUPABASE) {
        console.warn('[Supabase Issues] Supabase client not initialized, using localStorage only');
        window.MODA_SUPABASE_ISSUES = {
            isAvailable: () => false,
            issues: null
        };
        return;
    }

    const getClient = () => window.MODA_SUPABASE?.client;
    const isAvailable = () => {
        const initialized = window.MODA_SUPABASE?.isInitialized;
        const client = getClient();
        console.log('[Supabase Issues] isAvailable check - initialized:', initialized, 'client:', !!client);
        return initialized && client;
    };

    // ============================================================================
    // CONSTANTS
    // ============================================================================

    const ISSUE_TYPES = [
        { id: 'shop-drawing', label: 'Shop Drawing', color: '#0057B8' },
        { id: 'design-conflict', label: 'Design Conflict', color: '#7C3AED' },
        { id: 'material-supply', label: 'Material/Supply', color: '#EA580C' },
        { id: 'quality', label: 'Quality Issue', color: '#DC2626' },
        { id: 'engineering-question', label: 'Engineering Question', color: '#0891B2' },
        { id: 'rfi', label: 'RFI Required', color: '#4F46E5' },
        { id: 'other', label: 'Other', color: '#6B7280' }
    ];

    const PRIORITY_LEVELS = [
        { id: 'low', label: 'Low', color: '#10B981', multiplier: 1 },
        { id: 'medium', label: 'Medium', color: '#F59E0B', multiplier: 2 },
        { id: 'high', label: 'High', color: '#EA580C', multiplier: 3 },
        { id: 'critical', label: 'Critical', color: '#DC2626', multiplier: 4 }
    ];

    const ISSUE_STATUSES = [
        { id: 'open', label: 'Open', color: '#DC2626' },
        { id: 'in-progress', label: 'In Progress', color: '#0057B8' },
        { id: 'pending-info', label: 'Pending Info', color: '#F59E0B' },
        { id: 'resolved', label: 'Resolved', color: '#10B981' },
        { id: 'closed', label: 'Closed', color: '#6B7280' }
    ];

    // ============================================================================
    // LOCAL STORAGE HELPERS
    // ============================================================================

    const STORAGE_KEY = 'moda_engineering_issues';
    const COUNTER_KEY = 'moda_issue_counter';

    function loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && stored !== 'undefined' && stored !== 'null') {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('[Issues] Error loading from localStorage:', e);
        }
        return [];
    }

    function saveToLocalStorage(issues) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
        } catch (e) {
            console.error('[Issues] Error saving to localStorage:', e);
        }
    }

    function getNextIssueNumber() {
        const current = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10);
        const next = current + 1;
        localStorage.setItem(COUNTER_KEY, next.toString());
        return next;
    }

    function formatIssueNumber(num) {
        return `ENG-${String(num).padStart(4, '0')}`;
    }

    // ============================================================================
    // ISSUES API
    // ============================================================================

    const IssuesAPI = {
        // Get all issues
        async getAll(filters = {}) {
            if (!isAvailable()) {
                console.log('[Issues] Using localStorage fallback');
                let issues = loadFromLocalStorage();
                
                // Apply filters
                if (filters.status) {
                    issues = issues.filter(i => i.status === filters.status);
                }
                if (filters.priority) {
                    issues = issues.filter(i => i.priority === filters.priority);
                }
                if (filters.issueType) {
                    issues = issues.filter(i => i.issue_type === filters.issueType);
                }
                if (filters.projectId) {
                    issues = issues.filter(i => i.project_id === filters.projectId);
                }
                if (filters.assignedToId) {
                    issues = issues.filter(i => i.assigned_to_id === filters.assignedToId);
                }
                
                return issues.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }

            let query = getClient()
                .from('engineering_issues')
                .select('*')
                .order('created_at', { ascending: false });

            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.priority) {
                query = query.eq('priority', filters.priority);
            }
            if (filters.issueType) {
                query = query.eq('issue_type', filters.issueType);
            }
            if (filters.projectId) {
                query = query.eq('project_id', filters.projectId);
            }
            if (filters.assignedToId) {
                query = query.eq('assigned_to_id', filters.assignedToId);
            }

            console.log('[Issues] Executing Supabase query...');
            const { data, error } = await query;
            
            if (error) {
                console.error('[Issues] Supabase query error:', error);
                throw error;
            }
            
            console.log('[Issues] Supabase query returned', data?.length || 0, 'issues');
            
            // Also save to localStorage as backup
            if (data) {
                saveToLocalStorage(data);
            }
            
            return data || [];
        },

        // Get single issue by ID
        async getById(issueId) {
            if (!isAvailable()) {
                const issues = loadFromLocalStorage();
                return issues.find(i => i.id === issueId) || null;
            }

            const { data, error } = await getClient()
                .from('engineering_issues')
                .select('*')
                .eq('id', issueId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        },

        // Get issues by module BLM ID
        async getByModuleBlmId(blmId) {
            if (!isAvailable()) {
                const issues = loadFromLocalStorage();
                return issues.filter(i => i.blm_id === blmId);
            }

            const { data, error } = await getClient()
                .from('engineering_issues')
                .select('*')
                .eq('blm_id', blmId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        },

        // Create new issue
        async create(issueData) {
            const issueNumber = getNextIssueNumber();
            const now = new Date().toISOString();
            
            // For Supabase, don't include 'id' - let the database generate UUID
            // For localStorage fallback, we'll add it after
            // Note: UUID fields must be null (not empty string) if not provided
            const projectId = issueData.project_id && issueData.project_id !== '' ? issueData.project_id : null;
            const submittedById = issueData.submitted_by_id && issueData.submitted_by_id !== '' ? issueData.submitted_by_id : null;
            const assignedToId = issueData.assigned_to_id && issueData.assigned_to_id !== '' ? issueData.assigned_to_id : null;
            
            const newIssue = {
                issue_number: issueNumber,
                issue_display_id: formatIssueNumber(issueNumber),
                
                // Context
                project_id: projectId,
                project_name: issueData.project_name || '',
                project_abbreviation: issueData.project_abbreviation || '',
                blm_id: issueData.blm_id || '',
                build_seq: issueData.build_seq ? parseInt(issueData.build_seq) : null,
                unit_type: issueData.unit_type || '',
                hitch_front: issueData.hitch_front || '',
                hitch_rear: issueData.hitch_rear || '',
                department: issueData.department || '',
                stage: issueData.stage || '',
                
                // Issue Details
                issue_type: issueData.issue_type || 'other',
                issue_category: issueData.issue_category || '',
                priority: issueData.priority || 'medium',
                title: issueData.title || '',
                description: issueData.description || 'No description provided',
                photo_urls: issueData.photo_urls || [],
                
                // Module Linking
                linked_module_ids: issueData.linked_module_ids || [],
                linked_modules_display: issueData.linked_modules_display || '',
                
                // Assignment & Tracking
                submitted_by: issueData.submitted_by || 'Unknown User',
                submitted_by_id: submittedById,
                assigned_to: issueData.assigned_to || null,
                assigned_to_id: assignedToId,
                status: 'open',
                
                // Activity Log
                comments: [],
                status_history: [{
                    status: 'open',
                    changed_by: issueData.submitted_by || 'System',
                    changed_by_id: submittedById,
                    timestamp: now,
                    note: 'Issue created'
                }],
                
                // Timestamps
                created_at: now,
                updated_at: now,
                resolved_at: null,
                resolved_by: null,
                resolved_by_id: null,
                resolution_notes: null
            };

            if (!isAvailable()) {
                // For localStorage, add a generated id
                const localIssue = {
                    id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    ...newIssue
                };
                const issues = loadFromLocalStorage();
                issues.unshift(localIssue);
                saveToLocalStorage(issues);
                console.log('[Issues] Created (localStorage):', localIssue.issue_display_id);
                return localIssue;
            }

            console.log('[Issues] Inserting to Supabase:', JSON.stringify(newIssue, null, 2));
            
            const { data, error } = await getClient()
                .from('engineering_issues')
                .insert(newIssue)
                .select()
                .single();

            if (error) {
                console.error('[Issues] Supabase insert error:', error.message, error.details, error.hint);
                throw error;
            }
            
            console.log('[Issues] Created:', data.issue_display_id);
            
            // Log activity
            if (window.ActivityLog) {
                window.ActivityLog.logCreate('engineering', 'issue', data.id, data.issue_display_id, {
                    type: data.issue_type,
                    priority: data.priority,
                    blm_id: data.blm_id
                });
            }
            
            return data;
        },

        // Update existing issue
        async update(issueId, updates) {
            const now = new Date().toISOString();
            updates.updated_at = now;

            if (!isAvailable()) {
                const issues = loadFromLocalStorage();
                const index = issues.findIndex(i => i.id === issueId);
                if (index === -1) throw new Error('Issue not found');
                
                issues[index] = { ...issues[index], ...updates };
                saveToLocalStorage(issues);
                console.log('[Issues] Updated (localStorage):', issueId);
                return issues[index];
            }

            const { data, error } = await getClient()
                .from('engineering_issues')
                .update(updates)
                .eq('id', issueId)
                .select()
                .single();

            if (error) throw error;
            
            console.log('[Issues] Updated:', issueId);
            
            // Log activity
            if (window.ActivityLog) {
                window.ActivityLog.logUpdate('engineering', 'issue', issueId, data.issue_display_id, null, updates);
            }
            
            return data;
        },

        // Update issue status
        async updateStatus(issueId, newStatus, userId, userName, note = '') {
            const issue = await this.getById(issueId);
            if (!issue) throw new Error('Issue not found');

            const now = new Date().toISOString();
            const statusEntry = {
                status: newStatus,
                changed_by: userName,
                changed_by_id: userId,
                timestamp: now,
                note: note || `Status changed to ${newStatus}`
            };

            const updates = {
                status: newStatus,
                status_history: [...(issue.status_history || []), statusEntry],
                updated_at: now
            };

            // If resolving/closing, add resolution info
            if (newStatus === 'resolved' || newStatus === 'closed') {
                updates.resolved_at = now;
                updates.resolved_by = userName;
                updates.resolved_by_id = userId;
                if (note) updates.resolution_notes = note;
            }

            return this.update(issueId, updates);
        },

        // Add comment to issue
        async addComment(issueId, commentData) {
            const issue = await this.getById(issueId);
            if (!issue) throw new Error('Issue not found');

            const now = new Date().toISOString();
            const newComment = {
                id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                user_id: commentData.user_id,
                user_name: commentData.user_name,
                message: commentData.message,
                photo_urls: commentData.photo_urls || [],
                timestamp: now
            };

            const updates = {
                comments: [...(issue.comments || []), newComment],
                updated_at: now
            };

            return this.update(issueId, updates);
        },

        // Assign issue to user
        async assignTo(issueId, userId, userName, assignedBy, assignedById) {
            const issue = await this.getById(issueId);
            if (!issue) throw new Error('Issue not found');

            const now = new Date().toISOString();
            const statusEntry = {
                status: issue.status,
                changed_by: assignedBy,
                changed_by_id: assignedById,
                timestamp: now,
                note: `Assigned to ${userName}`
            };

            const updates = {
                assigned_to: userName,
                assigned_to_id: userId,
                status_history: [...(issue.status_history || []), statusEntry],
                updated_at: now
            };

            // Auto-change to in-progress if currently open
            if (issue.status === 'open') {
                updates.status = 'in-progress';
                updates.status_history.push({
                    status: 'in-progress',
                    changed_by: assignedBy,
                    changed_by_id: assignedById,
                    timestamp: now,
                    note: 'Status auto-changed on assignment'
                });
            }

            return this.update(issueId, updates);
        },

        // Delete issue
        async delete(issueId) {
            if (!isAvailable()) {
                const issues = loadFromLocalStorage();
                const filtered = issues.filter(i => i.id !== issueId);
                saveToLocalStorage(filtered);
                console.log('[Issues] Deleted (localStorage):', issueId);
                return true;
            }

            const { error } = await getClient()
                .from('engineering_issues')
                .delete()
                .eq('id', issueId);

            if (error) throw error;
            
            console.log('[Issues] Deleted:', issueId);
            
            // Log activity
            if (window.ActivityLog) {
                window.ActivityLog.logDelete('engineering', 'issue', issueId, `Issue ${issueId}`, {});
            }
            
            return true;
        },

        // Subscribe to real-time changes
        onSnapshot(callback, filters = {}) {
            // Initial load
            this.getAll(filters).then(issues => callback(issues)).catch(console.error);

            if (!isAvailable()) {
                console.warn('[Issues] Supabase not available for real-time');
                return () => {};
            }

            // Subscribe to changes
            const subscription = getClient()
                .channel('engineering-issues-changes')
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'engineering_issues' },
                    async (payload) => {
                        console.log('[Issues] Real-time update:', payload.eventType);
                        const issues = await this.getAll(filters);
                        callback(issues);
                    }
                )
                .subscribe();

            // Return unsubscribe function
            return () => {
                subscription.unsubscribe();
            };
        },

        // Get issue statistics
        async getStats(projectId = null) {
            const filters = projectId ? { projectId } : {};
            const issues = await this.getAll(filters);

            const now = new Date();
            const stats = {
                total: issues.length,
                open: issues.filter(i => i.status === 'open').length,
                inProgress: issues.filter(i => i.status === 'in-progress').length,
                pendingInfo: issues.filter(i => i.status === 'pending-info').length,
                resolved: issues.filter(i => i.status === 'resolved').length,
                closed: issues.filter(i => i.status === 'closed').length,
                
                // Priority breakdown
                critical: issues.filter(i => i.priority === 'critical' && i.status !== 'closed' && i.status !== 'resolved').length,
                high: issues.filter(i => i.priority === 'high' && i.status !== 'closed' && i.status !== 'resolved').length,
                medium: issues.filter(i => i.priority === 'medium' && i.status !== 'closed' && i.status !== 'resolved').length,
                low: issues.filter(i => i.priority === 'low' && i.status !== 'closed' && i.status !== 'resolved').length,
                
                // Type breakdown
                byType: ISSUE_TYPES.reduce((acc, type) => {
                    acc[type.id] = issues.filter(i => i.issue_type === type.id && i.status !== 'closed').length;
                    return acc;
                }, {}),
                
                // Age metrics (for open issues)
                avgAgeHours: 0,
                oldestOpenDays: 0
            };

            // Calculate age metrics
            const openIssues = issues.filter(i => i.status !== 'closed' && i.status !== 'resolved');
            if (openIssues.length > 0) {
                const ages = openIssues.map(i => (now - new Date(i.created_at)) / (1000 * 60 * 60));
                stats.avgAgeHours = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
                stats.oldestOpenDays = Math.round(Math.max(...ages) / 24);
            }

            return stats;
        }
    };

    // ============================================================================
    // EXPORT
    // ============================================================================

    window.MODA_SUPABASE_ISSUES = {
        isAvailable,
        issues: IssuesAPI,
        ISSUE_TYPES,
        PRIORITY_LEVELS,
        ISSUE_STATUSES,
        formatIssueNumber
    };

    if (window.MODA_DEBUG) console.log('[Supabase Issues] Module initialized');

})();
