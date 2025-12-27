/**
 * Automation Module for MODA
 * 
 * Parses daily automation stats emails from Dominic Manzano
 * and stores data for long-term tracking and analysis.
 * 
 * Features:
 * - Drag & drop email parsing (.msg, .eml, .txt)
 * - Wall Line and Floor Line metrics extraction
 * - Downtime issue categorization
 * - Historical data view with trends
 * - Supabase storage with localStorage fallback
 */

(function() {
    'use strict';
    
    console.log('[AutomationModule] Script starting...');

    const { useState, useEffect, useCallback } = React;

    // ============================================================================
    // SVG ICONS (matching MODA's icon pattern)
    // ============================================================================
    
    const UploadIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
    );

    const CheckCircleIcon = ({ size = 20 }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
    );

    const AlertCircleIcon = ({ size = 20 }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
    );

    const CalendarIcon = ({ size = 24 }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
    );

    const TrendingUpIcon = ({ size = 20 }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
        </svg>
    );

    const TrendingDownIcon = ({ size = 20 }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/>
            <polyline points="17 18 23 18 23 12"/>
        </svg>
    );

    const TrashIcon = ({ size = 16 }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
    );

    const ChartIcon = ({ size = 20 }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
    );

    const RefreshIcon = ({ size = 16 }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
    );

    // ============================================================================
    // DATA STORAGE (Supabase + localStorage fallback)
    // ============================================================================

    const STORAGE_KEY = 'moda_automation_reports';

    const AutomationDataAPI = {
        // Check if Supabase is available
        isSupabaseAvailable() {
            return window.MODA_SUPABASE?.isInitialized && window.MODA_SUPABASE?.client;
        },

        // Get all reports from localStorage
        getLocalReports() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                return stored ? JSON.parse(stored) : [];
            } catch (e) {
                console.error('[AutomationData] Error reading localStorage:', e);
                return [];
            }
        },

        // Save reports to localStorage
        saveLocalReports(reports) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
            } catch (e) {
                console.error('[AutomationData] Error saving to localStorage:', e);
            }
        },

        // Get all reports (Supabase with localStorage fallback)
        async getAll() {
            if (this.isSupabaseAvailable()) {
                try {
                    const { data, error } = await window.MODA_SUPABASE.client
                        .from('automation_daily_reports')
                        .select('*, automation_line_data (*, automation_downtime_issues (*))')
                        .order('report_date', { ascending: false });

                    if (error) throw error;
                    
                    // Transform to flat structure for display
                    const reports = (data || []).map(report => this.transformFromSupabase(report));
                    
                    // Sync to localStorage as backup
                    this.saveLocalReports(reports);
                    
                    return reports;
                } catch (e) {
                    console.warn('[AutomationData] Supabase fetch failed, using localStorage:', e.message);
                    return this.getLocalReports();
                }
            }
            return this.getLocalReports();
        },

        // Transform Supabase nested data to flat structure
        transformFromSupabase(report) {
            const wallData = report.automation_line_data?.find(l => l.line_type === 'Wall') || {};
            const floorData = report.automation_line_data?.find(l => l.line_type === 'Floor') || {};

            return {
                id: report.id,
                date: report.report_date,
                createdAt: report.created_at,
                createdBy: report.created_by,
                wallLine: {
                    modulesFinished: wallData.modules_finished,
                    scheduleVariance: wallData.schedule_variance,
                    scheduleStatus: wallData.schedule_status,
                    totalDowntime: wallData.total_downtime_minutes,
                    issues: (wallData.automation_downtime_issues || []).map(i => ({
                        category: i.category,
                        duration: i.duration_minutes
                    }))
                },
                floorLine: {
                    modulesFinished: floorData.modules_finished,
                    scheduleVariance: floorData.schedule_variance,
                    scheduleStatus: floorData.schedule_status,
                    totalDowntime: floorData.total_downtime_minutes,
                    issues: (floorData.automation_downtime_issues || []).map(i => ({
                        category: i.category,
                        duration: i.duration_minutes
                    }))
                }
            };
        },

        // Save a new report
        async save(parsedData, userName) {
            const report = {
                id: crypto.randomUUID(),
                date: parsedData.date,
                createdAt: new Date().toISOString(),
                createdBy: userName || 'Unknown',
                wallLine: parsedData.wallLine,
                floorLine: parsedData.floorLine
            };

            if (this.isSupabaseAvailable()) {
                try {
                    // Insert main report
                    const { data: reportData, error: reportError } = await window.MODA_SUPABASE.client
                        .from('automation_daily_reports')
                        .insert({
                            id: report.id,
                            report_date: report.date,
                            created_by: report.createdBy
                        })
                        .select()
                        .single();

                    if (reportError) throw reportError;

                    // Insert Wall Line data
                    if (parsedData.wallLine.modulesFinished !== null) {
                        const { data: wallData, error: wallError } = await window.MODA_SUPABASE.client
                            .from('automation_line_data')
                            .insert({
                                report_id: reportData.id,
                                line_type: 'Wall',
                                modules_finished: parsedData.wallLine.modulesFinished,
                                schedule_variance: parsedData.wallLine.scheduleVariance,
                                schedule_status: parsedData.wallLine.scheduleStatus,
                                total_downtime_minutes: parsedData.wallLine.totalDowntime
                            })
                            .select()
                            .single();

                        if (wallError) throw wallError;

                        // Insert Wall Line issues
                        if (parsedData.wallLine.issues?.length > 0) {
                            const wallIssues = parsedData.wallLine.issues.map(issue => ({
                                line_data_id: wallData.id,
                                category: issue.category,
                                duration_minutes: issue.duration
                            }));
                            await window.MODA_SUPABASE.client
                                .from('automation_downtime_issues')
                                .insert(wallIssues);
                        }
                    }

                    // Insert Floor Line data
                    if (parsedData.floorLine.modulesFinished !== null) {
                        const { data: floorData, error: floorError } = await window.MODA_SUPABASE.client
                            .from('automation_line_data')
                            .insert({
                                report_id: reportData.id,
                                line_type: 'Floor',
                                modules_finished: parsedData.floorLine.modulesFinished,
                                schedule_variance: parsedData.floorLine.scheduleVariance,
                                schedule_status: parsedData.floorLine.scheduleStatus,
                                total_downtime_minutes: parsedData.floorLine.totalDowntime
                            })
                            .select()
                            .single();

                        if (floorError) throw floorError;

                        // Insert Floor Line issues
                        if (parsedData.floorLine.issues?.length > 0) {
                            const floorIssues = parsedData.floorLine.issues.map(issue => ({
                                line_data_id: floorData.id,
                                category: issue.category,
                                duration_minutes: issue.duration
                            }));
                            await window.MODA_SUPABASE.client
                                .from('automation_downtime_issues')
                                .insert(floorIssues);
                        }
                    }

                    console.log('[AutomationData] Saved to Supabase:', reportData.id);
                } catch (e) {
                    console.warn('[AutomationData] Supabase save failed, saving to localStorage:', e.message);
                }
            }

            // Always save to localStorage as backup
            const localReports = this.getLocalReports();
            localReports.unshift(report);
            this.saveLocalReports(localReports);

            return report;
        },

        // Delete a report
        async delete(reportId) {
            if (this.isSupabaseAvailable()) {
                try {
                    // Cascade delete handled by database foreign keys
                    const { error } = await window.MODA_SUPABASE.client
                        .from('automation_daily_reports')
                        .delete()
                        .eq('id', reportId);

                    if (error) throw error;
                    console.log('[AutomationData] Deleted from Supabase:', reportId);
                } catch (e) {
                    console.warn('[AutomationData] Supabase delete failed:', e.message);
                }
            }

            // Always remove from localStorage
            const localReports = this.getLocalReports();
            const filtered = localReports.filter(r => r.id !== reportId);
            this.saveLocalReports(filtered);
        },

        // Check if a report for this date already exists
        async checkDuplicate(dateStr) {
            const reports = await this.getAll();
            return reports.find(r => r.date === dateStr);
        }
    };

    // ============================================================================
    // EMAIL PARSER
    // ============================================================================

    const parseEmailText = (text) => {
        try {
            // Extract the most recent report (first occurrence in the email thread)
            const reports = text.split(/From: Dominic Manzano/);
            const latestReport = reports[1] || reports[0];

            // Extract date from subject or email metadata
            const dateMatch = latestReport.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
            const reportDate = dateMatch ? dateMatch[1] : new Date().toLocaleDateString();

            // Parse Wall Line data
            const wallFinishedMatch = latestReport.match(/Wall Line Finished:\s*([\d.]+)\s*Modules/);
            const wallScheduleMatch = latestReport.match(/Wall Line is:\s*([\d.]+)\s*Modules\s*(AHEAD|BEHIND|ON)\s*(?:OF\s*)?Schedule/i);
            const wallDowntimeMatch = latestReport.match(/Wall Line: Total downtime:\s*([\d.]+)\s*(hours?|minutes?)/i);

            // Parse Floor Line data
            const floorFinishedMatch = latestReport.match(/Floor Line Finished:\s*([\d.]+)\s*Modules/);
            const floorScheduleMatch = latestReport.match(/Floor Line is:\s*([\d.]+)\s*Modules\s*(AHEAD|BEHIND|ON)\s*(?:OF\s*)?Schedule/i);
            const floorDowntimeMatch = latestReport.match(/Floor Line: Total downtime:\s*([\d.]+)\s*(hours?|minutes?)/i);

            // Parse Wall Line issues
            const wallIssues = [];
            const wallIssueSection = latestReport.match(/Wall Line: Total downtime:.*?(?=Floor Line:|$)/s);
            if (wallIssueSection) {
                const issueMatches = wallIssueSection[0].matchAll(/\*\s*([\d.]+)\s*(hours?|minutes?)\s*down\s*(?:from\s*)?(.+?)(?=\n|$)/gi);
                for (const match of issueMatches) {
                    const duration = parseFloat(match[1]);
                    const unit = match[2].toLowerCase();
                    const category = match[3].trim();
                    wallIssues.push({
                        duration: unit.includes('hour') ? duration * 60 : duration,
                        category: category.replace(/\r/g, '')
                    });
                }
            }

            // Parse Floor Line issues
            const floorIssues = [];
            const floorIssueSection = latestReport.match(/Floor Line: Total downtime:.*?(?=Dominic Manzano|From:|$)/s);
            if (floorIssueSection) {
                const issueMatches = floorIssueSection[0].matchAll(/\*\s*([\d.]+)\s*(hours?|minutes?)\s*down\s*(?:from\s*)?(.+?)(?=\n|$)/gi);
                for (const match of issueMatches) {
                    const duration = parseFloat(match[1]);
                    const unit = match[2].toLowerCase();
                    const category = match[3].trim();
                    floorIssues.push({
                        duration: unit.includes('hour') ? duration * 60 : duration,
                        category: category.replace(/\r/g, '')
                    });
                }
            }

            // Convert downtime to minutes
            const parseDowntime = (value, unit) => {
                if (!value) return 0;
                const num = parseFloat(value);
                return unit.toLowerCase().includes('hour') ? num * 60 : num;
            };

            return {
                date: reportDate,
                wallLine: {
                    modulesFinished: wallFinishedMatch ? parseFloat(wallFinishedMatch[1]) : null,
                    scheduleVariance: wallScheduleMatch ? parseFloat(wallScheduleMatch[1]) : null,
                    scheduleStatus: wallScheduleMatch ? wallScheduleMatch[2].toUpperCase() : null,
                    totalDowntime: wallDowntimeMatch ? parseDowntime(wallDowntimeMatch[1], wallDowntimeMatch[2]) : null,
                    issues: wallIssues
                },
                floorLine: {
                    modulesFinished: floorFinishedMatch ? parseFloat(floorFinishedMatch[1]) : null,
                    scheduleVariance: floorScheduleMatch ? parseFloat(floorScheduleMatch[1]) : null,
                    scheduleStatus: floorScheduleMatch ? floorScheduleMatch[2].toUpperCase() : null,
                    totalDowntime: floorDowntimeMatch ? parseDowntime(floorDowntimeMatch[1], floorDowntimeMatch[2]) : null,
                    issues: floorIssues
                }
            };
        } catch (err) {
            throw new Error('Failed to parse email content: ' + err.message);
        }
    };

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    const formatDowntime = (minutes) => {
        if (minutes === null || minutes === undefined) return 'N/A';
        if (minutes >= 60) {
            const hours = (minutes / 60).toFixed(2);
            return `${hours} hrs`;
        }
        return `${minutes.toFixed(1)} min`;
    };

    const getStatusColor = (status) => {
        if (!status) return '#6B7280';
        if (status === 'AHEAD') return '#10B981';
        if (status === 'BEHIND') return '#EF4444';
        return '#F59E0B';
    };

    const getStatusIcon = (status) => {
        if (!status) return null;
        if (status === 'AHEAD') return <TrendingUpIcon size={16} />;
        if (status === 'BEHIND') return <TrendingDownIcon size={16} />;
        return null;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    // ============================================================================
    // MAIN COMPONENT
    // ============================================================================

    const AutomationModule = ({ auth }) => {
        const [activeView, setActiveView] = useState('upload'); // 'upload' or 'history'
        const [dragActive, setDragActive] = useState(false);
        const [parsedData, setParsedData] = useState(null);
        const [error, setError] = useState(null);
        const [processing, setProcessing] = useState(false);
        const [saving, setSaving] = useState(false);
        const [reports, setReports] = useState([]);
        const [loading, setLoading] = useState(true);
        const [successMessage, setSuccessMessage] = useState(null);

        // Check if user can edit (Admin or Production Management)
        const canEdit = auth?.dashboardRole === 'admin' || 
                       auth?.dashboardRole === 'production_management' ||
                       auth?.dashboardRole === 'production';

        // Load reports on mount
        useEffect(() => {
            loadReports();
        }, []);

        const loadReports = async () => {
            setLoading(true);
            try {
                const data = await AutomationDataAPI.getAll();
                setReports(data);
            } catch (e) {
                console.error('[AutomationModule] Failed to load reports:', e);
            } finally {
                setLoading(false);
            }
        };

        const handleDrag = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.type === 'dragenter' || e.type === 'dragover') {
                setDragActive(true);
            } else if (e.type === 'dragleave') {
                setDragActive(false);
            }
        };

        const handleDrop = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            setError(null);
            setProcessing(true);

            const files = [...e.dataTransfer.files];
            
            if (files.length === 0) {
                setError('No file detected');
                setProcessing(false);
                return;
            }

            const file = files[0];
            
            if (!file.name.endsWith('.msg') && !file.name.endsWith('.eml') && !file.type.includes('text')) {
                setError('Please upload a .msg, .eml, or text file');
                setProcessing(false);
                return;
            }

            try {
                const text = await file.text();
                const data = parseEmailText(text);
                setParsedData(data);
                setError(null);
            } catch (err) {
                setError(err.message);
                setParsedData(null);
            } finally {
                setProcessing(false);
            }
        };

        const handleFileInput = async (e) => {
            setError(null);
            setProcessing(true);
            
            const file = e.target.files[0];
            if (!file) {
                setProcessing(false);
                return;
            }

            try {
                const text = await file.text();
                const data = parseEmailText(text);
                setParsedData(data);
                setError(null);
            } catch (err) {
                setError(err.message);
                setParsedData(null);
            } finally {
                setProcessing(false);
            }
        };

        const handleSave = async () => {
            if (!parsedData || !canEdit) return;

            setSaving(true);
            setError(null);

            try {
                // Check for duplicate
                const existing = await AutomationDataAPI.checkDuplicate(parsedData.date);
                if (existing) {
                    setError(`A report for ${parsedData.date} already exists. Delete it first to upload a new one.`);
                    setSaving(false);
                    return;
                }

                await AutomationDataAPI.save(parsedData, auth?.name || auth?.email);
                setSuccessMessage('Report saved successfully!');
                setParsedData(null);
                await loadReports();
                
                // Clear success message after 3 seconds
                setTimeout(() => setSuccessMessage(null), 3000);
            } catch (err) {
                setError('Failed to save report: ' + err.message);
            } finally {
                setSaving(false);
            }
        };

        const handleDelete = async (reportId) => {
            if (!canEdit) return;
            if (!confirm('Are you sure you want to delete this report?')) return;

            try {
                await AutomationDataAPI.delete(reportId);
                await loadReports();
            } catch (err) {
                setError('Failed to delete report: ' + err.message);
            }
        };

        // ============================================================================
        // RENDER
        // ============================================================================

        return (
            <div className="automation-module">
                {/* Header with view toggle */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                            Automation Stats
                        </h1>
                        <p className="text-gray-600 text-sm mt-1">
                            Track Wall Line and Floor Line production metrics
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveView('upload')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                activeView === 'upload' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <UploadIcon />
                                Upload
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveView('history')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                activeView === 'history' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <ChartIcon size={16} />
                                History ({reports.length})
                            </span>
                        </button>
                    </div>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
                        <CheckCircleIcon size={20} />
                        {successMessage}
                    </div>
                )}

                {/* Error Display */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
                        <AlertCircleIcon size={20} />
                        {error}
                        <button 
                            onClick={() => setError(null)}
                            className="ml-auto text-red-700 hover:text-red-900"
                        >
                            &times;
                        </button>
                    </div>
                )}

                {/* Upload View */}
                {activeView === 'upload' && (
                    <div>
                        {/* Permission notice */}
                        {!canEdit && (
                            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
                                <strong>View Only:</strong> You can view automation data but need Admin or Production Management role to upload new reports.
                            </div>
                        )}

                        {/* Drop Zone */}
                        {canEdit && !parsedData && (
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                                    dragActive 
                                        ? 'border-blue-500 bg-blue-50' 
                                        : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                                }`}
                            >
                                <input
                                    type="file"
                                    id="automation-file-upload"
                                    accept=".msg,.eml,.txt"
                                    onChange={handleFileInput}
                                    className="hidden"
                                />
                                <label htmlFor="automation-file-upload" className="cursor-pointer block">
                                    <div className={`mx-auto mb-4 ${dragActive ? 'text-blue-500' : 'text-gray-400'}`}>
                                        <UploadIcon />
                                    </div>
                                    <p className="text-lg font-medium text-gray-700 mb-2">
                                        {processing ? 'Processing...' : 'Drop email file here or click to browse'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Supports .msg, .eml, or .txt files from Dominic's daily stats emails
                                    </p>
                                </label>
                            </div>
                        )}

                        {/* Parsed Data Preview */}
                        {parsedData && (
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                {/* Date Card */}
                                <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
                                    <div className="text-blue-600">
                                        <CalendarIcon size={32} />
                                    </div>
                                    <div>
                                        <div className="text-sm text-gray-500">Report Date</div>
                                        <div className="text-xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                                            {parsedData.date}
                                        </div>
                                    </div>
                                </div>

                                {/* Wall Line & Floor Line Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    {/* Wall Line Card */}
                                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                                        <h3 className="text-lg font-bold text-blue-800 mb-4">Wall Line</h3>
                                        
                                        <div className="mb-4">
                                            <div className="text-sm text-blue-600">Modules Finished</div>
                                            <div className="text-3xl font-bold text-blue-900">
                                                {parsedData.wallLine.modulesFinished ?? 'N/A'}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-white/60 rounded-lg p-3">
                                                <div className="text-xs text-blue-600">Schedule</div>
                                                <div 
                                                    className="text-lg font-semibold flex items-center gap-1"
                                                    style={{ color: getStatusColor(parsedData.wallLine.scheduleStatus) }}
                                                >
                                                    {parsedData.wallLine.scheduleVariance ?? 'N/A'}
                                                    {parsedData.wallLine.scheduleStatus && (
                                                        <span className="text-sm ml-1">
                                                            {parsedData.wallLine.scheduleStatus}
                                                        </span>
                                                    )}
                                                    {getStatusIcon(parsedData.wallLine.scheduleStatus)}
                                                </div>
                                            </div>
                                            <div className="bg-white/60 rounded-lg p-3">
                                                <div className="text-xs text-blue-600">Downtime</div>
                                                <div className="text-lg font-semibold text-red-600">
                                                    {formatDowntime(parsedData.wallLine.totalDowntime)}
                                                </div>
                                            </div>
                                        </div>

                                        {parsedData.wallLine.issues.length > 0 && (
                                            <div className="mt-4">
                                                <div className="text-sm font-semibold text-blue-700 mb-2">
                                                    Issues ({parsedData.wallLine.issues.length})
                                                </div>
                                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                                    {parsedData.wallLine.issues.map((issue, idx) => (
                                                        <div key={idx} className="bg-white/50 rounded p-2 text-sm">
                                                            <div className="font-medium text-blue-900">{issue.category}</div>
                                                            <div className="text-red-600 text-xs">{formatDowntime(issue.duration)}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Floor Line Card */}
                                    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5">
                                        <h3 className="text-lg font-bold text-orange-800 mb-4">Floor Line</h3>
                                        
                                        <div className="mb-4">
                                            <div className="text-sm text-orange-600">Modules Finished</div>
                                            <div className="text-3xl font-bold text-orange-900">
                                                {parsedData.floorLine.modulesFinished ?? 'N/A'}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-white/60 rounded-lg p-3">
                                                <div className="text-xs text-orange-600">Schedule</div>
                                                <div 
                                                    className="text-lg font-semibold flex items-center gap-1"
                                                    style={{ color: getStatusColor(parsedData.floorLine.scheduleStatus) }}
                                                >
                                                    {parsedData.floorLine.scheduleVariance ?? 'N/A'}
                                                    {parsedData.floorLine.scheduleStatus && (
                                                        <span className="text-sm ml-1">
                                                            {parsedData.floorLine.scheduleStatus}
                                                        </span>
                                                    )}
                                                    {getStatusIcon(parsedData.floorLine.scheduleStatus)}
                                                </div>
                                            </div>
                                            <div className="bg-white/60 rounded-lg p-3">
                                                <div className="text-xs text-orange-600">Downtime</div>
                                                <div className="text-lg font-semibold text-red-600">
                                                    {formatDowntime(parsedData.floorLine.totalDowntime)}
                                                </div>
                                            </div>
                                        </div>

                                        {parsedData.floorLine.issues.length > 0 && (
                                            <div className="mt-4">
                                                <div className="text-sm font-semibold text-orange-700 mb-2">
                                                    Issues ({parsedData.floorLine.issues.length})
                                                </div>
                                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                                    {parsedData.floorLine.issues.map((issue, idx) => (
                                                        <div key={idx} className="bg-white/50 rounded p-2 text-sm">
                                                            <div className="font-medium text-orange-900">{issue.category}</div>
                                                            <div className="text-red-600 text-xs">{formatDowntime(issue.duration)}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => {
                                            setParsedData(null);
                                            setError(null);
                                        }}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Clear
                                    </button>
                                    {canEdit && (
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                        >
                                            {saving ? 'Saving...' : 'Save to MODA'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* History View */}
                {activeView === 'history' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-700">
                                Historical Reports
                            </h2>
                            <button
                                onClick={loadReports}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                                <RefreshIcon size={14} />
                                Refresh
                            </button>
                        </div>

                        {loading ? (
                            <div className="text-center py-12 text-gray-500">
                                Loading reports...
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                                <ChartIcon size={48} />
                                <p className="text-gray-500 mt-4">No reports yet</p>
                                <p className="text-gray-400 text-sm">Upload an email to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {reports.map((report) => (
                                    <div 
                                        key={report.id} 
                                        className="bg-white rounded-lg shadow border border-gray-200 p-4"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="font-bold text-lg" style={{ color: 'var(--autovol-navy)' }}>
                                                    {formatDate(report.date)}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Uploaded by {report.createdBy}
                                                </div>
                                            </div>
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleDelete(report.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                                                    title="Delete report"
                                                >
                                                    <TrashIcon size={16} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Wall Line Summary */}
                                            <div className="bg-blue-50 rounded-lg p-3">
                                                <div className="text-sm font-semibold text-blue-800 mb-2">Wall Line</div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <div>
                                                        <div className="text-xs text-blue-600">Modules</div>
                                                        <div className="font-bold text-blue-900">
                                                            {report.wallLine?.modulesFinished ?? 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-blue-600">Schedule</div>
                                                        <div 
                                                            className="font-bold flex items-center gap-1"
                                                            style={{ color: getStatusColor(report.wallLine?.scheduleStatus) }}
                                                        >
                                                            {report.wallLine?.scheduleVariance ?? '-'}
                                                            {getStatusIcon(report.wallLine?.scheduleStatus)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-blue-600">Downtime</div>
                                                        <div className="font-bold text-red-600">
                                                            {formatDowntime(report.wallLine?.totalDowntime)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Floor Line Summary */}
                                            <div className="bg-orange-50 rounded-lg p-3">
                                                <div className="text-sm font-semibold text-orange-800 mb-2">Floor Line</div>
                                                <div className="grid grid-cols-3 gap-2 text-sm">
                                                    <div>
                                                        <div className="text-xs text-orange-600">Modules</div>
                                                        <div className="font-bold text-orange-900">
                                                            {report.floorLine?.modulesFinished ?? 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-orange-600">Schedule</div>
                                                        <div 
                                                            className="font-bold flex items-center gap-1"
                                                            style={{ color: getStatusColor(report.floorLine?.scheduleStatus) }}
                                                        >
                                                            {report.floorLine?.scheduleVariance ?? '-'}
                                                            {getStatusIcon(report.floorLine?.scheduleStatus)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-orange-600">Downtime</div>
                                                        <div className="font-bold text-red-600">
                                                            {formatDowntime(report.floorLine?.totalDowntime)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Export to window
    window.AutomationModule = AutomationModule;
    console.log('[AutomationModule] Exported to window.AutomationModule');

})();
