/**
 * Automation Module for MODA
 * Parses daily automation stats emails and stores data for tracking.
 */

(function() {
    'use strict';
    
    console.log('[AutomationModule] Script starting...');

    const { useState, useEffect } = React;

    // Storage key for localStorage
    const STORAGE_KEY = 'moda_automation_reports';

    // ============================================================================
    // DATA API - localStorage with Supabase fallback
    // ============================================================================
    
    const AutomationDataAPI = {
        isSupabaseAvailable() {
            return window.MODA_SUPABASE?.isInitialized && window.MODA_SUPABASE?.client;
        },

        getLocalReports() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                return stored ? JSON.parse(stored) : [];
            } catch (e) {
                console.error('[AutomationData] Error reading localStorage:', e);
                return [];
            }
        },

        saveLocalReports(reports) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
            } catch (e) {
                console.error('[AutomationData] Error saving to localStorage:', e);
            }
        },

        async getAll() {
            // For now, just use localStorage
            return this.getLocalReports();
        },

        async save(parsedData, userName) {
            const report = {
                id: crypto.randomUUID(),
                date: parsedData.date,
                createdAt: new Date().toISOString(),
                createdBy: userName || 'Unknown',
                wallLine: parsedData.wallLine,
                floorLine: parsedData.floorLine
            };

            const reports = this.getLocalReports();
            reports.unshift(report);
            this.saveLocalReports(reports);
            return report;
        },

        async checkDuplicate(date) {
            const reports = this.getLocalReports();
            return reports.find(r => r.date === date);
        },

        async delete(reportId) {
            const reports = this.getLocalReports();
            const filtered = reports.filter(r => r.id !== reportId);
            this.saveLocalReports(filtered);
        }
    };

    // ============================================================================
    // EMAIL PARSER
    // ============================================================================

    function parseEmailText(text) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        
        // Try to find date
        let date = null;
        const datePatterns = [
            /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
            /(\d{4}-\d{2}-\d{2})/,
            /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i
        ];
        
        for (const line of lines) {
            for (const pattern of datePatterns) {
                const match = line.match(pattern);
                if (match) {
                    date = match[1] || match[0];
                    break;
                }
            }
            if (date) break;
        }

        if (!date) {
            date = new Date().toLocaleDateString();
        }

        // Parse Wall Line data
        const wallLine = parseLineData(text, 'Wall');
        const floorLine = parseLineData(text, 'Floor');

        return { date, wallLine, floorLine };
    }

    function parseLineData(text, lineType) {
        const result = {
            modulesFinished: 0,
            scheduleVariance: 0,
            scheduleStatus: 'ON',
            totalDowntime: 0,
            issues: []
        };

        // Look for modules finished
        const modulesPattern = new RegExp(lineType + '[^\\d]*(\\d+\\.?\\d*)\\s*modules?', 'i');
        const modulesMatch = text.match(modulesPattern);
        if (modulesMatch) {
            result.modulesFinished = parseFloat(modulesMatch[1]);
        }

        // Look for schedule status
        if (text.toLowerCase().includes(lineType.toLowerCase()) && text.toLowerCase().includes('ahead')) {
            result.scheduleStatus = 'AHEAD';
        } else if (text.toLowerCase().includes(lineType.toLowerCase()) && text.toLowerCase().includes('behind')) {
            result.scheduleStatus = 'BEHIND';
        }

        // Look for downtime
        const downtimePattern = new RegExp(lineType + '[^\\d]*(\\d+\\.?\\d*)\\s*min', 'i');
        const downtimeMatch = text.match(downtimePattern);
        if (downtimeMatch) {
            result.totalDowntime = parseFloat(downtimeMatch[1]);
        }

        return result;
    }

    // ============================================================================
    // MAIN COMPONENT
    // ============================================================================

    const AutomationModule = ({ auth }) => {
        const [activeView, setActiveView] = useState('upload');
        const [dragActive, setDragActive] = useState(false);
        const [parsedData, setParsedData] = useState(null);
        const [error, setError] = useState(null);
        const [processing, setProcessing] = useState(false);
        const [saving, setSaving] = useState(false);
        const [reports, setReports] = useState([]);
        const [loading, setLoading] = useState(true);
        const [successMessage, setSuccessMessage] = useState(null);

        // Check if user can edit
        const canEdit = auth?.dashboardRole === 'admin' || 
                       auth?.dashboardRole === 'production_management' ||
                       auth?.dashboardRole === 'production';

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

        const processFile = async (file) => {
            if (!file) return;
            
            setError(null);
            setProcessing(true);

            try {
                const text = await file.text();
                const data = parseEmailText(text);
                setParsedData(data);
            } catch (err) {
                setError('Failed to parse file: ' + err.message);
                setParsedData(null);
            } finally {
                setProcessing(false);
            }
        };

        const handleDrop = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);

            // Handle files from drag
            const files = e.dataTransfer?.files;
            const items = e.dataTransfer?.items;

            // Try to get text data first (for Outlook drag)
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (item.kind === 'string' && item.type === 'text/plain') {
                        item.getAsString((text) => {
                            if (text && text.length > 50) {
                                setProcessing(true);
                                try {
                                    const data = parseEmailText(text);
                                    setParsedData(data);
                                } catch (err) {
                                    setError('Failed to parse: ' + err.message);
                                }
                                setProcessing(false);
                            }
                        });
                        return;
                    }
                }
            }

            // Fall back to file handling
            if (files && files.length > 0) {
                await processFile(files[0]);
            }
        };

        const handleFileInput = async (e) => {
            const file = e.target.files?.[0];
            if (file) {
                await processFile(file);
            }
        };

        const handleSave = async () => {
            if (!parsedData || !canEdit) return;

            setSaving(true);
            setError(null);

            try {
                const existing = await AutomationDataAPI.checkDuplicate(parsedData.date);
                if (existing) {
                    setError('A report for ' + parsedData.date + ' already exists.');
                    setSaving(false);
                    return;
                }

                await AutomationDataAPI.save(parsedData, auth?.name || auth?.email);
                setSuccessMessage('Report saved!');
                setParsedData(null);
                await loadReports();
                setTimeout(() => setSuccessMessage(null), 3000);
            } catch (err) {
                setError('Failed to save: ' + err.message);
            } finally {
                setSaving(false);
            }
        };

        const handleDelete = async (reportId) => {
            if (!canEdit) return;
            if (!confirm('Delete this report?')) return;

            try {
                await AutomationDataAPI.delete(reportId);
                await loadReports();
            } catch (err) {
                setError('Failed to delete: ' + err.message);
            }
        };

        const formatDowntime = (minutes) => {
            if (!minutes) return '0 min';
            return minutes + ' min';
        };

        // ============================================================================
        // RENDER
        // ============================================================================

        return (
            <div className="bg-white rounded-lg shadow p-6">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b">
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                            Automation Stats
                        </h2>
                        <p className="text-gray-500 text-sm">
                            Wall Line and Floor Line production metrics
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveView('upload')}
                            className={activeView === 'upload' 
                                ? 'px-3 py-1 text-sm rounded bg-blue-600 text-white' 
                                : 'px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200'}
                        >
                            Upload
                        </button>
                        <button
                            onClick={() => setActiveView('history')}
                            className={activeView === 'history' 
                                ? 'px-3 py-1 text-sm rounded bg-blue-600 text-white' 
                                : 'px-3 py-1 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200'}
                        >
                            History ({reports.length})
                        </button>
                    </div>
                </div>

                {/* Messages */}
                {successMessage && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded mb-4 text-sm">
                        {successMessage}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4 text-sm flex justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">x</button>
                    </div>
                )}

                {/* Upload View */}
                {activeView === 'upload' && (
                    <div>
                        {!canEdit && (
                            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded mb-4 text-sm">
                                View Only: Need Admin or Production Management role to upload.
                            </div>
                        )}

                        {canEdit && !parsedData && (
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('auto-file-input')?.click()}
                                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                                    dragActive 
                                        ? 'border-blue-400 bg-blue-50' 
                                        : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                                }`}
                            >
                                <input
                                    type="file"
                                    id="auto-file-input"
                                    accept=".msg,.eml,.txt"
                                    onChange={handleFileInput}
                                    className="hidden"
                                />
                                <div className="text-gray-400 text-4xl mb-2">
                                    {processing ? '...' : '+'}
                                </div>
                                <p className="text-gray-600 font-medium">
                                    {processing ? 'Processing...' : 'Drop email here or click to browse'}
                                </p>
                                <p className="text-gray-400 text-sm mt-1">
                                    Drag emails directly from Outlook, or upload .msg/.eml/.txt files
                                </p>
                            </div>
                        )}

                        {/* Parsed Data Preview */}
                        {parsedData && (
                            <div className="border rounded-lg p-4 bg-gray-50">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-700">
                                        Parsed Data - {parsedData.date}
                                    </h3>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setParsedData(null)}
                                            className="px-3 py-1 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="px-3 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                                        >
                                            {saving ? 'Saving...' : 'Save Report'}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Wall Line */}
                                    <div className="bg-white rounded p-3 border">
                                        <h4 className="font-medium text-gray-700 mb-2">Wall Line</h4>
                                        <div className="text-sm space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Modules:</span>
                                                <span className="font-medium">{parsedData.wallLine?.modulesFinished || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Status:</span>
                                                <span className={`font-medium ${
                                                    parsedData.wallLine?.scheduleStatus === 'AHEAD' ? 'text-green-600' :
                                                    parsedData.wallLine?.scheduleStatus === 'BEHIND' ? 'text-red-600' : 'text-gray-600'
                                                }`}>
                                                    {parsedData.wallLine?.scheduleStatus || 'ON'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Downtime:</span>
                                                <span className="font-medium text-red-600">
                                                    {formatDowntime(parsedData.wallLine?.totalDowntime)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Floor Line */}
                                    <div className="bg-white rounded p-3 border">
                                        <h4 className="font-medium text-gray-700 mb-2">Floor Line</h4>
                                        <div className="text-sm space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Modules:</span>
                                                <span className="font-medium">{parsedData.floorLine?.modulesFinished || 0}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Status:</span>
                                                <span className={`font-medium ${
                                                    parsedData.floorLine?.scheduleStatus === 'AHEAD' ? 'text-green-600' :
                                                    parsedData.floorLine?.scheduleStatus === 'BEHIND' ? 'text-red-600' : 'text-gray-600'
                                                }`}>
                                                    {parsedData.floorLine?.scheduleStatus || 'ON'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Downtime:</span>
                                                <span className="font-medium text-red-600">
                                                    {formatDowntime(parsedData.floorLine?.totalDowntime)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* History View */}
                {activeView === 'history' && (
                    <div>
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Loading...</div>
                        ) : reports.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                No reports yet. Upload your first automation stats email.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {reports.map(report => (
                                    <div key={report.id} className="border rounded-lg p-4 bg-gray-50">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="font-bold text-gray-700">{report.date}</span>
                                                <span className="text-gray-400 text-sm ml-2">
                                                    by {report.createdBy}
                                                </span>
                                            </div>
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleDelete(report.id)}
                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500">Wall Line:</span>
                                                <span className="ml-2 font-medium">
                                                    {report.wallLine?.modulesFinished || 0} modules
                                                </span>
                                                <span className={`ml-2 ${
                                                    report.wallLine?.scheduleStatus === 'AHEAD' ? 'text-green-600' :
                                                    report.wallLine?.scheduleStatus === 'BEHIND' ? 'text-red-600' : ''
                                                }`}>
                                                    ({report.wallLine?.scheduleStatus || 'ON'})
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Floor Line:</span>
                                                <span className="ml-2 font-medium">
                                                    {report.floorLine?.modulesFinished || 0} modules
                                                </span>
                                                <span className={`ml-2 ${
                                                    report.floorLine?.scheduleStatus === 'AHEAD' ? 'text-green-600' :
                                                    report.floorLine?.scheduleStatus === 'BEHIND' ? 'text-red-600' : ''
                                                }`}>
                                                    ({report.floorLine?.scheduleStatus || 'ON'})
                                                </span>
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
