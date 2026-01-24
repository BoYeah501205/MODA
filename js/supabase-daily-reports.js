/**
 * Supabase Daily Reports Data Access Layer
 * 
 * Handles all CRUD operations for daily set reports, issues, photos, and comments.
 * Supports offline mode with local storage fallback.
 */

(function() {
    'use strict';

    // ========================================================================
    // CONSTANTS
    // ========================================================================

    const ISSUE_CATEGORIES = {
        quality_defect: {
            label: 'Quality Defect',
            subcategories: [
                { id: 'drywall', label: 'Drywall Damage' },
                { id: 'paint_finish', label: 'Paint/Finish' },
                { id: 'flooring', label: 'Flooring' },
                { id: 'cabinets', label: 'Cabinets' },
                { id: 'trim', label: 'Trim' },
                { id: 'structural', label: 'Structural' }
            ]
        },
        transit_damage: {
            label: 'Transit Damage',
            subcategories: [
                { id: 'exterior', label: 'Exterior Damage' },
                { id: 'interior', label: 'Interior Damage' },
                { id: 'roof', label: 'Roof Damage' },
                { id: 'window_door', label: 'Window/Door' }
            ]
        },
        site_condition: {
            label: 'Site Condition',
            subcategories: [
                { id: 'foundation', label: 'Foundation Issue' },
                { id: 'access', label: 'Access Problem' },
                { id: 'weather_delay', label: 'Weather Delay' },
                { id: 'crane', label: 'Crane Issue' }
            ]
        },
        missing_wrong: {
            label: 'Missing/Wrong',
            subcategories: [
                { id: 'missing_material', label: 'Missing Material' },
                { id: 'wrong_material', label: 'Wrong Material' },
                { id: 'missing_hardware', label: 'Missing Hardware' }
            ]
        },
        drawing_design: {
            label: 'Drawing/Design',
            subcategories: [
                { id: 'dimension_error', label: 'Dimension Error' },
                { id: 'conflict', label: 'Conflict' },
                { id: 'missing_info', label: 'Missing Info' },
                { id: 'rfi_needed', label: 'RFI Needed' }
            ]
        },
        mep: {
            label: 'MEP',
            subcategories: [
                { id: 'electrical', label: 'Electrical' },
                { id: 'plumbing', label: 'Plumbing' },
                { id: 'hvac', label: 'HVAC' },
                { id: 'fire_protection', label: 'Fire Protection' }
            ]
        },
        other: {
            label: 'Other',
            subcategories: []
        }
    };

    const SEVERITY_LEVELS = [
        { id: 'critical', label: 'Critical', color: '#DC2626', description: 'Stops work' },
        { id: 'major', label: 'Major', color: '#EA580C', description: 'Needs immediate fix' },
        { id: 'minor', label: 'Minor', color: '#16A34A', description: 'Cosmetic/minor' }
    ];

    const SET_STATUSES = [
        { id: 'set', label: 'Set', color: '#16A34A' },
        { id: 'partial', label: 'Partial', color: '#EA580C' },
        { id: 'not_set', label: 'Not Set', color: '#6B7280' }
    ];

    const ISSUE_STATUSES = [
        { id: 'open', label: 'Open' },
        { id: 'in_progress', label: 'In Progress' },
        { id: 'resolved', label: 'Resolved' },
        { id: 'deferred', label: 'Deferred' }
    ];

    const PHOTO_TYPES = [
        { id: 'set', label: 'Set Photo' },
        { id: 'issue', label: 'Issue Photo' },
        { id: 'general', label: 'General' },
        { id: 'before', label: 'Before' },
        { id: 'after', label: 'After' }
    ];

    // Local storage keys for offline support
    const STORAGE_KEYS = {
        PENDING_REPORTS: 'moda_pending_daily_reports',
        PENDING_PHOTOS: 'moda_pending_report_photos'
    };

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    function getSupabase() {
        if (!window.MODA_SUPABASE?.client) {
            throw new Error('Supabase client not initialized');
        }
        return window.MODA_SUPABASE.client;
    }

    function getCurrentUser() {
        return window.MODA_SUPABASE?.currentUser || null;
    }

    function formatDate(date) {
        if (!date) return null;
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }

    function getYesterday() {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return formatDate(d);
    }

    // ========================================================================
    // DAILY REPORTS CRUD
    // ========================================================================

    async function createReport(projectId, reportDate = null, options = {}) {
        const supabase = getSupabase();
        const user = getCurrentUser();

        const reportData = {
            project_id: projectId,
            report_date: reportDate || getYesterday(),
            created_by: user?.id || null,
            created_by_name: user?.user_metadata?.name || options.createdByName || 'Unknown',
            status: 'draft',
            weather_source: options.weatherSource || 'manual',
            weather_conditions: options.weatherConditions || {},
            general_notes: options.generalNotes || null,
            sharepoint_folder_path: options.sharepointFolderPath || null
        };

        const { data, error } = await supabase
            .from('daily_reports')
            .insert(reportData)
            .select()
            .single();

        if (error) {
            console.error('Error creating daily report:', error);
            throw error;
        }

        return data;
    }

    async function getReport(reportId) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('daily_reports')
            .select(`
                *,
                projects(id, name, location),
                report_modules(
                    *,
                    modules(id, serial_number, blm_id, unit_type)
                ),
                report_issues(
                    *,
                    modules(id, serial_number, blm_id),
                    report_issue_comments(*)
                ),
                report_photos(*)
            `)
            .eq('id', reportId)
            .single();

        if (error) {
            console.error('Error fetching daily report:', error);
            throw error;
        }

        return data;
    }

    async function getReportsByProject(projectId, options = {}) {
        const supabase = getSupabase();

        let query = supabase
            .from('daily_reports')
            .select(`
                *,
                projects(id, name)
            `)
            .eq('project_id', projectId)
            .order('report_date', { ascending: false });

        if (options.status) {
            query = query.eq('status', options.status);
        }

        if (options.startDate) {
            query = query.gte('report_date', options.startDate);
        }

        if (options.endDate) {
            query = query.lte('report_date', options.endDate);
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching project reports:', error);
            throw error;
        }

        return data || [];
    }

    async function getReportByDate(projectId, reportDate) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('daily_reports')
            .select('*')
            .eq('project_id', projectId)
            .eq('report_date', reportDate)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error fetching report by date:', error);
            throw error;
        }

        return data || null;
    }

    async function updateReport(reportId, updates) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('daily_reports')
            .update(updates)
            .eq('id', reportId)
            .select()
            .single();

        if (error) {
            console.error('Error updating daily report:', error);
            throw error;
        }

        return data;
    }

    async function submitReport(reportId) {
        return updateReport(reportId, {
            status: 'submitted',
            submitted_at: new Date().toISOString()
        });
    }

    async function approveReport(reportId) {
        const user = getCurrentUser();
        return updateReport(reportId, {
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: user?.id || null
        });
    }

    async function deleteReport(reportId) {
        const supabase = getSupabase();

        const { error } = await supabase
            .from('daily_reports')
            .delete()
            .eq('id', reportId);

        if (error) {
            console.error('Error deleting daily report:', error);
            throw error;
        }

        return true;
    }

    // ========================================================================
    // REPORT MODULES CRUD
    // ========================================================================

    async function addModuleToReport(reportId, moduleId, options = {}) {
        const supabase = getSupabase();

        const moduleData = {
            report_id: reportId,
            module_id: moduleId,
            set_status: options.setStatus || 'not_set',
            set_time: options.setTime || null,
            set_sequence: options.setSequence || null,
            set_by: options.setBy || null,
            notes: options.notes || null
        };

        const { data, error } = await supabase
            .from('report_modules')
            .insert(moduleData)
            .select(`
                *,
                modules(id, serial_number, blm_id, unit_type)
            `)
            .single();

        if (error) {
            console.error('Error adding module to report:', error);
            throw error;
        }

        return data;
    }

    async function updateReportModule(reportModuleId, updates) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('report_modules')
            .update(updates)
            .eq('id', reportModuleId)
            .select(`
                *,
                modules(id, serial_number, blm_id, unit_type)
            `)
            .single();

        if (error) {
            console.error('Error updating report module:', error);
            throw error;
        }

        return data;
    }

    async function removeModuleFromReport(reportModuleId) {
        const supabase = getSupabase();

        const { error } = await supabase
            .from('report_modules')
            .delete()
            .eq('id', reportModuleId);

        if (error) {
            console.error('Error removing module from report:', error);
            throw error;
        }

        return true;
    }

    async function bulkAddModulesToReport(reportId, moduleIds) {
        const supabase = getSupabase();

        const moduleData = moduleIds.map((moduleId, index) => ({
            report_id: reportId,
            module_id: moduleId,
            set_status: 'not_set',
            set_sequence: index + 1
        }));

        const { data, error } = await supabase
            .from('report_modules')
            .insert(moduleData)
            .select(`
                *,
                modules(id, serial_number, blm_id, unit_type)
            `);

        if (error) {
            console.error('Error bulk adding modules to report:', error);
            throw error;
        }

        return data;
    }

    // ========================================================================
    // REPORT ISSUES CRUD
    // ========================================================================

    async function createIssue(reportId, issueData) {
        const supabase = getSupabase();
        const user = getCurrentUser();

        const issue = {
            report_id: reportId,
            module_id: issueData.moduleId || null,
            category: issueData.category,
            subcategory: issueData.subcategory || null,
            severity: issueData.severity || 'minor',
            description: issueData.description,
            action_taken: issueData.actionTaken || null,
            status: 'open',
            reported_by: user?.id || null,
            reported_by_name: user?.user_metadata?.name || issueData.reportedByName || 'Unknown'
        };

        const { data, error } = await supabase
            .from('report_issues')
            .insert(issue)
            .select(`
                *,
                modules(id, serial_number, blm_id)
            `)
            .single();

        if (error) {
            console.error('Error creating issue:', error);
            throw error;
        }

        return data;
    }

    async function updateIssue(issueId, updates) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('report_issues')
            .update(updates)
            .eq('id', issueId)
            .select(`
                *,
                modules(id, serial_number, blm_id)
            `)
            .single();

        if (error) {
            console.error('Error updating issue:', error);
            throw error;
        }

        return data;
    }

    async function resolveIssue(issueId, resolutionNotes = null) {
        const user = getCurrentUser();
        return updateIssue(issueId, {
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolved_by: user?.id || null,
            resolution_notes: resolutionNotes
        });
    }

    async function deleteIssue(issueId) {
        const supabase = getSupabase();

        const { error } = await supabase
            .from('report_issues')
            .delete()
            .eq('id', issueId);

        if (error) {
            console.error('Error deleting issue:', error);
            throw error;
        }

        return true;
    }

    async function getIssuesByModule(moduleId) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('report_issues')
            .select(`
                *,
                daily_reports(id, report_date, project_id, projects(name)),
                report_issue_comments(*),
                report_photos(*)
            `)
            .eq('module_id', moduleId)
            .order('reported_at', { ascending: false });

        if (error) {
            console.error('Error fetching module issues:', error);
            throw error;
        }

        return data || [];
    }

    // ========================================================================
    // ISSUE COMMENTS CRUD
    // ========================================================================

    async function addComment(issueId, comment) {
        const supabase = getSupabase();
        const user = getCurrentUser();

        const commentData = {
            issue_id: issueId,
            comment: comment,
            author_id: user?.id || null,
            author_name: user?.user_metadata?.name || 'Unknown'
        };

        const { data, error } = await supabase
            .from('report_issue_comments')
            .insert(commentData)
            .select()
            .single();

        if (error) {
            console.error('Error adding comment:', error);
            throw error;
        }

        return data;
    }

    async function updateComment(commentId, comment) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('report_issue_comments')
            .update({ comment })
            .eq('id', commentId)
            .select()
            .single();

        if (error) {
            console.error('Error updating comment:', error);
            throw error;
        }

        return data;
    }

    async function deleteComment(commentId) {
        const supabase = getSupabase();

        const { error } = await supabase
            .from('report_issue_comments')
            .delete()
            .eq('id', commentId);

        if (error) {
            console.error('Error deleting comment:', error);
            throw error;
        }

        return true;
    }

    async function getCommentsByIssue(issueId) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('report_issue_comments')
            .select('*')
            .eq('issue_id', issueId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching comments:', error);
            throw error;
        }

        return data || [];
    }

    // ========================================================================
    // REPORT PHOTOS CRUD
    // ========================================================================

    async function addPhoto(reportId, photoData) {
        const supabase = getSupabase();
        const user = getCurrentUser();

        const photo = {
            report_id: reportId,
            module_id: photoData.moduleId || null,
            issue_id: photoData.issueId || null,
            photo_type: photoData.photoType || 'general',
            sharepoint_url: photoData.sharepointUrl || null,
            sharepoint_path: photoData.sharepointPath || null,
            thumbnail_url: photoData.thumbnailUrl || null,
            local_data: photoData.localData || null,
            caption: photoData.caption || null,
            file_name: photoData.fileName || null,
            file_size: photoData.fileSize || null,
            uploaded_by: user?.id || null,
            sync_status: photoData.sharepointUrl ? 'synced' : 'pending'
        };

        const { data, error } = await supabase
            .from('report_photos')
            .insert(photo)
            .select()
            .single();

        if (error) {
            console.error('Error adding photo:', error);
            throw error;
        }

        return data;
    }

    async function updatePhoto(photoId, updates) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('report_photos')
            .update(updates)
            .eq('id', photoId)
            .select()
            .single();

        if (error) {
            console.error('Error updating photo:', error);
            throw error;
        }

        return data;
    }

    async function deletePhoto(photoId) {
        const supabase = getSupabase();

        const { error } = await supabase
            .from('report_photos')
            .delete()
            .eq('id', photoId);

        if (error) {
            console.error('Error deleting photo:', error);
            throw error;
        }

        return true;
    }

    async function getPhotosByReport(reportId) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('report_photos')
            .select('*')
            .eq('report_id', reportId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching report photos:', error);
            throw error;
        }

        return data || [];
    }

    async function getPhotosByModule(moduleId) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('report_photos')
            .select(`
                *,
                daily_reports(id, report_date, project_id)
            `)
            .eq('module_id', moduleId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching module photos:', error);
            throw error;
        }

        return data || [];
    }

    async function getPendingPhotos() {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('report_photos')
            .select('*')
            .eq('sync_status', 'pending');

        if (error) {
            console.error('Error fetching pending photos:', error);
            throw error;
        }

        return data || [];
    }

    // ========================================================================
    // DISTRIBUTION LISTS
    // ========================================================================

    async function getDistributionLists(projectId = null) {
        const supabase = getSupabase();

        let query = supabase
            .from('report_distribution_lists')
            .select(`
                *,
                report_distribution_recipients(*)
            `)
            .eq('is_active', true);

        if (projectId) {
            query = query.or(`project_id.eq.${projectId},project_id.is.null`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching distribution lists:', error);
            throw error;
        }

        return data || [];
    }

    async function createDistributionList(name, projectId = null, description = null) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('report_distribution_lists')
            .insert({
                name,
                project_id: projectId,
                description
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating distribution list:', error);
            throw error;
        }

        return data;
    }

    async function addRecipientToList(listId, email, name = null, role = null) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .from('report_distribution_recipients')
            .insert({
                list_id: listId,
                email,
                name,
                role
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding recipient:', error);
            throw error;
        }

        return data;
    }

    async function removeRecipientFromList(recipientId) {
        const supabase = getSupabase();

        const { error } = await supabase
            .from('report_distribution_recipients')
            .delete()
            .eq('id', recipientId);

        if (error) {
            console.error('Error removing recipient:', error);
            throw error;
        }

        return true;
    }

    // ========================================================================
    // REPORT SUMMARY & STATISTICS
    // ========================================================================

    async function getReportSummary(reportId) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .rpc('get_report_summary', { p_report_id: reportId });

        if (error) {
            console.error('Error fetching report summary:', error);
            throw error;
        }

        return data?.[0] || null;
    }

    async function getModuleReportHistory(moduleId) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .rpc('get_module_report_history', { p_module_id: moduleId });

        if (error) {
            console.error('Error fetching module report history:', error);
            throw error;
        }

        return data || [];
    }

    async function getModuleIssues(moduleId) {
        const supabase = getSupabase();

        const { data, error } = await supabase
            .rpc('get_module_issues', { p_module_id: moduleId });

        if (error) {
            console.error('Error fetching module issues:', error);
            throw error;
        }

        return data || [];
    }

    // ========================================================================
    // OFFLINE SUPPORT
    // ========================================================================

    function savePendingReport(reportData) {
        try {
            const pending = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_REPORTS) || '[]');
            reportData.localId = `local_${Date.now()}`;
            reportData.pendingSince = new Date().toISOString();
            pending.push(reportData);
            localStorage.setItem(STORAGE_KEYS.PENDING_REPORTS, JSON.stringify(pending));
            return reportData.localId;
        } catch (error) {
            console.error('Error saving pending report:', error);
            throw error;
        }
    }

    function getPendingReports() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_REPORTS) || '[]');
        } catch (error) {
            console.error('Error getting pending reports:', error);
            return [];
        }
    }

    function removePendingReport(localId) {
        try {
            const pending = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_REPORTS) || '[]');
            const filtered = pending.filter(r => r.localId !== localId);
            localStorage.setItem(STORAGE_KEYS.PENDING_REPORTS, JSON.stringify(filtered));
            return true;
        } catch (error) {
            console.error('Error removing pending report:', error);
            return false;
        }
    }

    async function syncPendingReports() {
        const pending = getPendingReports();
        const results = { synced: [], failed: [] };

        for (const report of pending) {
            try {
                const created = await createReport(
                    report.project_id,
                    report.report_date,
                    report
                );
                removePendingReport(report.localId);
                results.synced.push({ localId: report.localId, serverId: created.id });
            } catch (error) {
                results.failed.push({ localId: report.localId, error: error.message });
            }
        }

        return results;
    }

    // ========================================================================
    // WEATHER API INTEGRATION
    // ========================================================================

    async function fetchWeather(latitude, longitude, date = null) {
        // Using Open-Meteo API (free, no API key required)
        // For historical data, use archive endpoint; for current, use forecast
        const targetDate = date || formatDate(new Date());
        const today = formatDate(new Date());
        
        let url;
        if (targetDate < today) {
            // Historical weather
            url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${targetDate}&end_date=${targetDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant&timezone=auto`;
        } else {
            // Current/forecast weather
            url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant&timezone=auto`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Weather API error: ${response.status}`);
            }

            const data = await response.json();
            const daily = data.daily;
            const index = daily.time.indexOf(targetDate);

            if (index === -1) {
                return null;
            }

            return {
                temperature_high: Math.round(daily.temperature_2m_max[index]),
                temperature_low: Math.round(daily.temperature_2m_min[index]),
                precipitation: daily.precipitation_sum[index],
                wind_speed: Math.round(daily.windspeed_10m_max[index]),
                wind_direction: getWindDirection(daily.winddirection_10m_dominant[index]),
                conditions: getConditionsFromData(daily.precipitation_sum[index]),
                source: 'open-meteo',
                fetched_at: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error fetching weather:', error);
            return null;
        }
    }

    function getWindDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }

    function getConditionsFromData(precipitation) {
        if (precipitation > 10) return 'Heavy Rain';
        if (precipitation > 2) return 'Rain';
        if (precipitation > 0) return 'Light Rain';
        return 'Clear';
    }

    // ========================================================================
    // SHAREPOINT FOLDER PATH GENERATOR
    // ========================================================================

    function generateSharePointPath(projectName, reportDate, moduleBLM = null) {
        // Sanitize project name for folder path
        const sanitizedProject = projectName.replace(/[<>:"/\\|?*]/g, '_').trim();
        const dateStr = reportDate.replace(/-/g, '-'); // YYYY-MM-DD format

        if (moduleBLM) {
            const sanitizedBLM = moduleBLM.replace(/[<>:"/\\|?*]/g, '_').trim();
            return `On-Site/${sanitizedProject}/${dateStr}/Module_${sanitizedBLM}`;
        }

        return `On-Site/${sanitizedProject}/${dateStr}/General`;
    }

    // ========================================================================
    // EXPORT MODULE
    // ========================================================================

    window.MODA_DAILY_REPORTS = {
        // Constants
        ISSUE_CATEGORIES,
        SEVERITY_LEVELS,
        SET_STATUSES,
        ISSUE_STATUSES,
        PHOTO_TYPES,

        // Reports
        createReport,
        getReport,
        getReportsByProject,
        getReportByDate,
        updateReport,
        submitReport,
        approveReport,
        deleteReport,

        // Report Modules
        addModuleToReport,
        updateReportModule,
        removeModuleFromReport,
        bulkAddModulesToReport,

        // Issues
        createIssue,
        updateIssue,
        resolveIssue,
        deleteIssue,
        getIssuesByModule,

        // Comments
        addComment,
        updateComment,
        deleteComment,
        getCommentsByIssue,

        // Photos
        addPhoto,
        updatePhoto,
        deletePhoto,
        getPhotosByReport,
        getPhotosByModule,
        getPendingPhotos,

        // Distribution
        getDistributionLists,
        createDistributionList,
        addRecipientToList,
        removeRecipientFromList,

        // Statistics
        getReportSummary,
        getModuleReportHistory,
        getModuleIssues,

        // Offline
        savePendingReport,
        getPendingReports,
        removePendingReport,
        syncPendingReports,

        // Weather
        fetchWeather,

        // Utilities
        generateSharePointPath,
        formatDate,
        getYesterday
    };

    console.log('MODA Daily Reports module loaded');

})();
