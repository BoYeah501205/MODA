/**
 * Supabase API Functions for MODA On-Site Reports
 * 
 * Provides CRUD operations for:
 * - onsite_reports (daily site reports)
 * - onsite_issues (module-specific issues)
 * - onsite_global_issues (site-wide issues)
 * - onsite_modules_set (modules set tracking)
 */

(function() {
    'use strict';

    // ============================================================================
    // CONSTANTS
    // ============================================================================

    const ISSUE_TYPES = [
        { id: 'quality', label: 'Quality Defect', color: '#DC2626', bgColor: '#FEE2E2', iconClass: 'icon-quality-issue' },
        { id: 'material', label: 'Material Shortage', color: '#D97706', bgColor: '#FEF3C7', iconClass: 'icon-material-issue' },
        { id: 'question', label: 'Question', color: '#2563EB', bgColor: '#DBEAFE', iconClass: 'icon-question' },
        { id: 'site', label: 'Site Issue', color: '#7C3AED', bgColor: '#EDE9FE', iconClass: 'icon-site-issue' },
        { id: 'transit', label: 'Transit Damage', color: '#DB2777', bgColor: '#FCE7F3', iconClass: 'icon-transit-issue' },
        { id: 'drawing', label: 'Drawing Issue', color: '#0891B2', bgColor: '#CFFAFE', iconClass: 'icon-drawing-issue' },
        { id: 'other', label: 'Other', color: '#6B7280', bgColor: '#F3F4F6', iconClass: 'icon-other' }
    ];

    const SEVERITY_LEVELS = [
        { id: 'critical', label: 'Critical', color: '#DC2626', bgColor: '#FEE2E2', description: 'Stops work, safety issue' },
        { id: 'major', label: 'Major', color: '#EA580C', bgColor: '#FFEDD5', description: 'Needs fix before close-out' },
        { id: 'minor', label: 'Minor', color: '#16A34A', bgColor: '#DCFCE7', description: 'Cosmetic, can address later' }
    ];

    const GLOBAL_ITEM_PRIORITIES = [
        { id: 'attention', label: 'Attention', color: '#DC2626', bgColor: '#FEE2E2', iconClass: 'icon-attention' },
        { id: 'fyi', label: 'FYI', color: '#2563EB', bgColor: '#DBEAFE', iconClass: 'icon-info' },
        { id: 'resolved', label: 'Resolved', color: '#16A34A', bgColor: '#DCFCE7', iconClass: 'icon-check' }
    ];

    const PRECIPITATION_OPTIONS = ['none', 'light rain', 'heavy rain', 'snow', 'sleet', 'fog'];
    const WIND_OPTIONS = ['calm', 'light', 'moderate', 'strong', 'high winds'];
    const REPORT_TYPES = [
        { id: 'set-day', label: 'Set Day', description: 'Normal work day with module sets' },
        { id: 'weather-day', label: 'Weather Day', description: 'No sets due to weather' },
        { id: 'non-work', label: 'Non-Work Day', description: 'Weekend, holiday, no activity' }
    ];

    const TRADES = [
        'Drywall', 'Electrical', 'Plumbing', 'HVAC', 'Framing',
        'Roofing', 'Exterior', 'Flooring', 'Cabinets', 'Windows/Doors',
        'Insulation', 'Paint', 'Structural', 'Other'
    ];

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    function getSupabaseClient() {
        if (!window.MODA_SUPABASE?.client) {
            console.error('[Supabase OnSite] Supabase client not initialized');
            return null;
        }
        return window.MODA_SUPABASE.client;
    }

    function getCurrentUserId() {
        return window.MODA_SUPABASE?.currentUser?.id || null;
    }

    function getIssueTypeInfo(typeId) {
        return ISSUE_TYPES.find(t => t.id === typeId) || ISSUE_TYPES[ISSUE_TYPES.length - 1];
    }

    function getSeverityInfo(severityId) {
        return SEVERITY_LEVELS.find(s => s.id === severityId) || SEVERITY_LEVELS[2];
    }

    function getPriorityInfo(priorityId) {
        return GLOBAL_ITEM_PRIORITIES.find(p => p.id === priorityId) || GLOBAL_ITEM_PRIORITIES[1];
    }

    // ============================================================================
    // REPORTS API
    // ============================================================================

    /**
     * Get reports by date range
     */
    async function getReportsByDateRange(startDate, endDate) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { data, error } = await supabase
                .from('onsite_reports')
                .select(`
                    *,
                    project:projects(id, name, location),
                    superintendent:employees(id, first_name, last_name),
                    issues:onsite_issues(count),
                    global_issues:onsite_global_issues(count)
                `)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false });

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('[Supabase OnSite] getReportsByDateRange error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a single report by ID with all related data
     */
    async function getReportById(reportId) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { data, error } = await supabase
                .from('onsite_reports')
                .select(`
                    *,
                    project:projects(id, name, location, client),
                    superintendent:employees(id, first_name, last_name, email, phone),
                    issues:onsite_issues(
                        *,
                        module:modules(id, serial_number, blm_id, unit_type)
                    ),
                    global_issues:onsite_global_issues(*),
                    modules_set:onsite_modules_set(
                        *,
                        module:modules(id, serial_number, blm_id, unit_type)
                    )
                `)
                .eq('id', reportId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('[Supabase OnSite] getReportById error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get report by project and date (check if exists)
     */
    async function getReportByProjectAndDate(projectId, date) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { data, error } = await supabase
                .from('onsite_reports')
                .select('id, date, project_id')
                .eq('project_id', projectId)
                .eq('date', date)
                .maybeSingle();

            if (error) throw error;
            return { success: true, data, exists: !!data };
        } catch (error) {
            console.error('[Supabase OnSite] getReportByProjectAndDate error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create a new daily report
     */
    async function createReport(reportData) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        const userId = getCurrentUserId();
        if (!userId) return { success: false, error: 'User not authenticated' };

        try {
            const { data, error } = await supabase
                .from('onsite_reports')
                .insert({
                    ...reportData,
                    created_by: userId
                })
                .select(`
                    *,
                    project:projects(id, name, location),
                    superintendent:employees(id, first_name, last_name)
                `)
                .single();

            if (error) throw error;
            console.log('[Supabase OnSite] Report created:', data.id);
            return { success: true, data };
        } catch (error) {
            console.error('[Supabase OnSite] createReport error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update an existing report
     */
    async function updateReport(reportId, updates) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { data, error } = await supabase
                .from('onsite_reports')
                .update(updates)
                .eq('id', reportId)
                .select()
                .single();

            if (error) throw error;
            console.log('[Supabase OnSite] Report updated:', reportId);
            return { success: true, data };
        } catch (error) {
            console.error('[Supabase OnSite] updateReport error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a report
     */
    async function deleteReport(reportId) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { error } = await supabase
                .from('onsite_reports')
                .delete()
                .eq('id', reportId);

            if (error) throw error;
            console.log('[Supabase OnSite] Report deleted:', reportId);
            return { success: true };
        } catch (error) {
            console.error('[Supabase OnSite] deleteReport error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get recent reports (last N days)
     */
    async function getRecentReports(days = 30, limit = 50) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString().split('T')[0];

        try {
            const { data, error } = await supabase
                .from('onsite_reports')
                .select(`
                    *,
                    project:projects(id, name, location),
                    superintendent:employees(id, first_name, last_name)
                `)
                .gte('date', startDateStr)
                .order('date', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('[Supabase OnSite] getRecentReports error:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================================================
    // ISSUES API
    // ============================================================================

    /**
     * Get issues by report ID
     */
    async function getIssuesByReport(reportId) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { data, error } = await supabase
                .from('onsite_issues')
                .select(`
                    *,
                    module:modules(id, serial_number, blm_id, unit_type)
                `)
                .eq('report_id', reportId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('[Supabase OnSite] getIssuesByReport error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get a single issue by ID
     */
    async function getIssueById(issueId) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { data, error } = await supabase
                .from('onsite_issues')
                .select(`
                    *,
                    module:modules(id, serial_number, blm_id, unit_type),
                    report:onsite_reports(id, date, project:projects(id, name))
                `)
                .eq('id', issueId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('[Supabase OnSite] getIssueById error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create a new issue
     */
    async function createIssue(issueData) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        const userId = getCurrentUserId();
        if (!userId) return { success: false, error: 'User not authenticated' };

        try {
            const { data, error } = await supabase
                .from('onsite_issues')
                .insert({
                    ...issueData,
                    created_by: userId
                })
                .select(`
                    *,
                    module:modules(id, serial_number, blm_id, unit_type)
                `)
                .single();

            if (error) throw error;
            console.log('[Supabase OnSite] Issue created:', data.id);
            return { success: true, data };
        } catch (error) {
            console.error('[Supabase OnSite] createIssue error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update an existing issue
     */
    async function updateIssue(issueId, updates) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { data, error } = await supabase
                .from('onsite_issues')
                .update(updates)
                .eq('id', issueId)
                .select()
                .single();

            if (error) throw error;
            console.log('[Supabase OnSite] Issue updated:', issueId);
            return { success: true, data };
        } catch (error) {
            console.error('[Supabase OnSite] updateIssue error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Add factory response to an issue
     */
    async function addFactoryResponse(issueId, responseData) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        const userId = getCurrentUserId();
        if (!userId) return { success: false, error: 'User not authenticated' };

        try {
            const { data, error } = await supabase
                .from('onsite_issues')
                .update({
                    factory_response: responseData.factory_response,
                    root_cause: responseData.root_cause || null,
                    remedial_action: responseData.remedial_action || null,
                    responded_by: userId,
                    responded_at: new Date().toISOString(),
                    status: responseData.status || 'in_progress'
                })
                .eq('id', issueId)
                .select()
                .single();

            if (error) throw error;
            console.log('[Supabase OnSite] Factory response added:', issueId);
            return { success: true, data };
        } catch (error) {
            console.error('[Supabase OnSite] addFactoryResponse error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Resolve an issue
     */
    async function resolveIssue(issueId, resolution) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { data, error } = await supabase
                .from('onsite_issues')
                .update({
                    status: 'resolved',
                    remedial_action: resolution,
                    resolved_at: new Date().toISOString()
                })
                .eq('id', issueId)
                .select()
                .single();

            if (error) throw error;
            console.log('[Supabase OnSite] Issue resolved:', issueId);
            return { success: true, data };
        } catch (error) {
            console.error('[Supabase OnSite] resolveIssue error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete an issue
     */
    async function deleteIssue(issueId) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { error } = await supabase
                .from('onsite_issues')
                .delete()
                .eq('id', issueId);

            if (error) throw error;
            console.log('[Supabase OnSite] Issue deleted:', issueId);
            return { success: true };
        } catch (error) {
            console.error('[Supabase OnSite] deleteIssue error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all unresolved issues
     */
    async function getUnresolvedIssues() {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { data, error } = await supabase
                .from('onsite_issues')
                .select(`
                    *,
                    module:modules(id, serial_number, blm_id, unit_type),
                    report:onsite_reports(id, date, project:projects(id, name))
                `)
                .in('status', ['open', 'in_progress'])
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('[Supabase OnSite] getUnresolvedIssues error:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================================================
    // GLOBAL ISSUES API
    // ============================================================================

    /**
     * Get global issues by report ID
     */
    async function getGlobalIssuesByReport(reportId) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { data, error } = await supabase
                .from('onsite_global_issues')
                .select('*')
                .eq('report_id', reportId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('[Supabase OnSite] getGlobalIssuesByReport error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create a global issue
     */
    async function createGlobalIssue(issueData) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        const userId = getCurrentUserId();
        if (!userId) return { success: false, error: 'User not authenticated' };

        try {
            const { data, error } = await supabase
                .from('onsite_global_issues')
                .insert({
                    ...issueData,
                    created_by: userId
                })
                .select()
                .single();

            if (error) throw error;
            console.log('[Supabase OnSite] Global issue created:', data.id);
            return { success: true, data };
        } catch (error) {
            console.error('[Supabase OnSite] createGlobalIssue error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update a global issue
     */
    async function updateGlobalIssue(issueId, updates) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { data, error } = await supabase
                .from('onsite_global_issues')
                .update(updates)
                .eq('id', issueId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('[Supabase OnSite] updateGlobalIssue error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete a global issue
     */
    async function deleteGlobalIssue(issueId) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { error } = await supabase
                .from('onsite_global_issues')
                .delete()
                .eq('id', issueId);

            if (error) throw error;
            console.log('[Supabase OnSite] Global issue deleted:', issueId);
            return { success: true };
        } catch (error) {
            console.error('[Supabase OnSite] deleteGlobalIssue error:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================================================
    // MODULES SET API
    // ============================================================================

    /**
     * Log a module as set
     */
    async function logModuleSet(reportId, moduleId, setData = {}) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { data, error } = await supabase
                .from('onsite_modules_set')
                .insert({
                    report_id: reportId,
                    module_id: moduleId,
                    set_by: setData.set_by || null,
                    notes: setData.notes || null,
                    photos: setData.photos || []
                })
                .select(`
                    *,
                    module:modules(id, serial_number, blm_id, unit_type)
                `)
                .single();

            if (error) throw error;
            console.log('[Supabase OnSite] Module set logged:', moduleId);
            return { success: true, data };
        } catch (error) {
            console.error('[Supabase OnSite] logModuleSet error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get modules set for a report
     */
    async function getModulesSetByReport(reportId) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { data, error } = await supabase
                .from('onsite_modules_set')
                .select(`
                    *,
                    module:modules(id, serial_number, blm_id, unit_type)
                `)
                .eq('report_id', reportId)
                .order('set_time', { ascending: true });

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('[Supabase OnSite] getModulesSetByReport error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Remove a module set entry
     */
    async function removeModuleSet(moduleSetId) {
        const supabase = getSupabaseClient();
        if (!supabase) return { success: false, error: 'Supabase not initialized' };

        try {
            const { error } = await supabase
                .from('onsite_modules_set')
                .delete()
                .eq('id', moduleSetId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('[Supabase OnSite] removeModuleSet error:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================================================
    // EXPORT FUNCTIONS
    // ============================================================================

    /**
     * Generate HTML export of a report
     */
    function generateReportHTML(report) {
        const projectName = report.project?.name || 'Unknown Project';
        const location = report.project?.location || '';
        const superintendent = report.superintendent 
            ? `${report.superintendent.first_name} ${report.superintendent.last_name}`
            : 'Not specified';
        const reportDate = new Date(report.date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let issuesHTML = '';
        if (report.issues && report.issues.length > 0) {
            issuesHTML = report.issues.map(issue => {
                const typeInfo = getIssueTypeInfo(issue.issue_type);
                const severityInfo = getSeverityInfo(issue.severity);
                const moduleName = issue.module?.serial_number || 'Unknown Module';
                
                let photosHTML = '';
                if (issue.photos && issue.photos.length > 0) {
                    photosHTML = `
                        <div class="issue-photos">
                            ${issue.photos.map((photo, idx) => `
                                <img src="${photo}" alt="Issue Photo ${idx + 1}" class="issue-photo" />
                            `).join('')}
                        </div>
                    `;
                }

                return `
                    <div class="issue-card">
                        <div class="issue-header">
                            <span class="issue-type" style="background-color: ${typeInfo.bgColor}; color: ${typeInfo.color};">
                                ${typeInfo.label}
                            </span>
                            <span class="issue-severity" style="background-color: ${severityInfo.bgColor}; color: ${severityInfo.color};">
                                ${severityInfo.label}
                            </span>
                        </div>
                        <div class="issue-module">Module: ${moduleName}</div>
                        <div class="issue-description">${issue.description}</div>
                        ${issue.action_taken ? `<div class="issue-action"><strong>Action Taken:</strong> ${issue.action_taken}</div>` : ''}
                        ${issue.factory_response ? `<div class="issue-response"><strong>Factory Response:</strong> ${issue.factory_response}</div>` : ''}
                        ${photosHTML}
                    </div>
                `;
            }).join('');
        }

        let globalIssuesHTML = '';
        if (report.global_issues && report.global_issues.length > 0) {
            globalIssuesHTML = report.global_issues.map(issue => {
                const priorityInfo = getPriorityInfo(issue.priority);
                return `
                    <div class="global-issue" style="border-left: 4px solid ${priorityInfo.color};">
                        <span class="priority-badge" style="background-color: ${priorityInfo.bgColor}; color: ${priorityInfo.color};">
                            ${priorityInfo.label}
                        </span>
                        <p>${issue.description}</p>
                    </div>
                `;
            }).join('');
        }

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Site Report - ${projectName} - ${report.date}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #1f2937; max-width: 900px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0057B8 0%, #003d82 100%); color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; }
        .header h1 { font-size: 24px; margin-bottom: 8px; }
        .header .subtitle { opacity: 0.9; font-size: 14px; }
        .header .date { font-size: 18px; margin-top: 12px; }
        .section { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .section h2 { font-size: 18px; color: #0057B8; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .info-item { }
        .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-value { font-size: 16px; font-weight: 500; }
        .weather-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .weather-item { text-align: center; padding: 12px; background: #f9fafb; border-radius: 6px; }
        .weather-value { font-size: 20px; font-weight: 600; color: #0057B8; }
        .weather-label { font-size: 12px; color: #6b7280; }
        .progress-bar { height: 24px; background: #e5e7eb; border-radius: 12px; overflow: hidden; margin-top: 8px; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #16a34a 0%, #22c55e 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 12px; }
        .issue-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
        .issue-header { display: flex; gap: 8px; margin-bottom: 12px; }
        .issue-type, .issue-severity { padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; }
        .issue-module { font-size: 14px; color: #6b7280; margin-bottom: 8px; }
        .issue-description { margin-bottom: 12px; }
        .issue-action, .issue-response { font-size: 14px; margin-bottom: 8px; padding: 8px; background: #f9fafb; border-radius: 4px; }
        .issue-photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
        .issue-photo { width: 100%; height: 150px; object-fit: cover; border-radius: 4px; }
        .global-issue { padding: 12px 16px; margin-bottom: 12px; background: #f9fafb; border-radius: 4px; }
        .priority-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }
        .global-issue p { margin-top: 8px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; margin-top: 24px; }
        @media print { body { padding: 0; } .section { break-inside: avoid; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>${projectName}</h1>
        <div class="subtitle">${location}</div>
        <div class="date">${reportDate}</div>
    </div>

    <div class="section">
        <h2>Report Details</h2>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Superintendent</div>
                <div class="info-value">${superintendent}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Report Type</div>
                <div class="info-value">${report.report_type || 'Set Day'}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Weather Conditions</h2>
        <div class="weather-grid">
            <div class="weather-item">
                <div class="weather-value">${report.temp_am || '--'}°F</div>
                <div class="weather-label">Temp AM</div>
            </div>
            <div class="weather-item">
                <div class="weather-value">${report.temp_pm || '--'}°F</div>
                <div class="weather-label">Temp PM</div>
            </div>
            <div class="weather-item">
                <div class="weather-value">${report.precipitation || 'None'}</div>
                <div class="weather-label">Precipitation</div>
            </div>
            <div class="weather-item">
                <div class="weather-value">${report.wind || 'Light'}</div>
                <div class="weather-label">Wind</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Progress</h2>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Units Set Today</div>
                <div class="info-value">${report.units_set_today || 0}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Total Units Set</div>
                <div class="info-value">${report.units_set_total || 0}</div>
            </div>
        </div>
        ${report.units_remaining > 0 ? `
        <div style="margin-top: 16px;">
            <div class="info-label">Progress (${report.units_set_total || 0} of ${(report.units_set_total || 0) + (report.units_remaining || 0)})</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.round(((report.units_set_total || 0) / ((report.units_set_total || 0) + (report.units_remaining || 0))) * 100)}%">
                    ${Math.round(((report.units_set_total || 0) / ((report.units_set_total || 0) + (report.units_remaining || 0))) * 100)}%
                </div>
            </div>
        </div>
        ` : ''}
    </div>

    ${globalIssuesHTML ? `
    <div class="section">
        <h2>Global Items</h2>
        ${globalIssuesHTML}
    </div>
    ` : ''}

    ${issuesHTML ? `
    <div class="section">
        <h2>Module Issues (${report.issues.length})</h2>
        ${issuesHTML}
    </div>
    ` : ''}

    ${report.general_notes ? `
    <div class="section">
        <h2>General Notes</h2>
        <p>${report.general_notes}</p>
    </div>
    ` : ''}

    <div class="footer">
        <p>Generated by MODA On-Site Reporting System</p>
        <p>Autovol Volumetric Modular - ${new Date().toLocaleDateString()}</p>
    </div>
</body>
</html>
        `;
    }

    /**
     * Download report as HTML file
     */
    function downloadReportHTML(report) {
        const html = generateReportHTML(report);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Site-Report-${report.project?.name || 'Report'}-${report.date}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Print report (opens print dialog)
     */
    function printReport(report) {
        const html = generateReportHTML(report);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    }

    // ============================================================================
    // EXPOSE GLOBAL API
    // ============================================================================

    window.MODA_ONSITE = {
        // Constants
        ISSUE_TYPES,
        SEVERITY_LEVELS,
        GLOBAL_ITEM_PRIORITIES,
        PRECIPITATION_OPTIONS,
        WIND_OPTIONS,
        REPORT_TYPES,
        TRADES,

        // Helper functions
        getIssueTypeInfo,
        getSeverityInfo,
        getPriorityInfo,

        // Reports API
        getReportsByDateRange,
        getReportById,
        getReportByProjectAndDate,
        createReport,
        updateReport,
        deleteReport,
        getRecentReports,

        // Issues API
        getIssuesByReport,
        getIssueById,
        createIssue,
        updateIssue,
        addFactoryResponse,
        resolveIssue,
        deleteIssue,
        getUnresolvedIssues,

        // Global Issues API
        getGlobalIssuesByReport,
        createGlobalIssue,
        updateGlobalIssue,
        deleteGlobalIssue,

        // Modules Set API
        logModuleSet,
        getModulesSetByReport,
        removeModuleSet,

        // Export functions
        generateReportHTML,
        downloadReportHTML,
        printReport
    };

    if (window.MODA_DEBUG) console.log('[MODA OnSite] Supabase API loaded');
})();
