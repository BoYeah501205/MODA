// On-Site Tab - Main Container
// Standalone prototype for field operations management

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// Helper to check if Supabase On-Site APIs are available
function isSupabaseOnSiteAvailable() {
    return window.MODA_SUPABASE_DATA?.isAvailable?.() && 
           window.MODA_SUPABASE_DATA?.setSchedules;
}

// Helper for safe JSON parsing
function safeParseJSON(str, fallback = []) {
    if (!str || str === 'undefined' || str === 'null') return fallback;
    try { return JSON.parse(str); } catch (e) { return fallback; }
}

// ============================================================================
// DATA HOOKS - With Supabase Sync
// ============================================================================

// Hook for managing set schedules
function useSetSchedule() {
    const [schedules, setSchedules] = useState(() => {
        return safeParseJSON(localStorage.getItem('autovol_set_schedules'), []);
    });
    const [isLoading, setIsLoading] = useState(true);
    const [supabaseAvailable, setSupabaseAvailable] = useState(false);

    // Load from Supabase on mount
    useEffect(() => {
        let mounted = true;
        const loadData = async () => {
            if (isSupabaseOnSiteAvailable()) {
                try {
                    const data = await window.MODA_SUPABASE_DATA.setSchedules.getAll();
                    if (mounted && data && data.length > 0) {
                        setSchedules(data);
                        setSupabaseAvailable(true);
                        localStorage.setItem('autovol_set_schedules', JSON.stringify(data));
                    } else if (mounted) {
                        setSupabaseAvailable(true);
                    }
                } catch (err) {
                    console.warn('[SetSchedule] Supabase load failed:', err.message);
                }
            }
            if (mounted) setIsLoading(false);
        };
        setTimeout(loadData, 100);
        return () => { mounted = false; };
    }, []);

    // Save to localStorage as backup
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem('autovol_set_schedules', JSON.stringify(schedules));
        }
    }, [schedules, isLoading]);

    const addSchedule = useCallback(async (scheduleData) => {
        const newSchedule = {
            id: `SET-${Date.now()}`,
            ...scheduleData,
            status: 'Scheduled',
            modules: (scheduleData.modules || []).map(m => ({
                ...m,
                setStatus: 'Pending',
                setTime: null,
                setBy: null,
                fieldNotes: '',
                photos: [],
                issues: []
            })),
            actualStartTime: null,
            actualEndTime: null,
            weather: null,
            createdAt: new Date().toISOString(),
            updatedAt: null
        };
        setSchedules(prev => [...prev, newSchedule]);
        
        if (supabaseAvailable && isSupabaseOnSiteAvailable()) {
            try {
                await window.MODA_SUPABASE_DATA.setSchedules.create(newSchedule);
            } catch (err) {
                console.error('[SetSchedule] Supabase create failed:', err.message);
            }
        }
        return newSchedule;
    }, [supabaseAvailable]);

    const updateSchedule = useCallback(async (id, updates) => {
        const updatedData = { ...updates, updatedAt: new Date().toISOString() };
        setSchedules(prev => prev.map(s => 
            s.id === id ? { ...s, ...updatedData } : s
        ));
        
        if (supabaseAvailable && isSupabaseOnSiteAvailable()) {
            try {
                await window.MODA_SUPABASE_DATA.setSchedules.update(id, updatedData);
            } catch (err) {
                console.error('[SetSchedule] Supabase update failed:', err.message);
            }
        }
    }, [supabaseAvailable]);

    const deleteSchedule = useCallback(async (id) => {
        setSchedules(prev => prev.filter(s => s.id !== id));
        
        if (supabaseAvailable && isSupabaseOnSiteAvailable()) {
            try {
                await window.MODA_SUPABASE_DATA.setSchedules.delete(id);
            } catch (err) {
                console.error('[SetSchedule] Supabase delete failed:', err.message);
            }
        }
    }, [supabaseAvailable]);

    const startSet = useCallback((id) => {
        updateSchedule(id, { 
            status: 'In Progress', 
            actualStartTime: new Date().toISOString() 
        });
    }, [updateSchedule]);

    const completeSet = useCallback((id) => {
        updateSchedule(id, { 
            status: 'Complete', 
            actualEndTime: new Date().toISOString() 
        });
    }, [updateSchedule]);

    const updateModuleStatus = useCallback((scheduleId, moduleId, status, userData) => {
        setSchedules(prev => {
            const updated = prev.map(s => {
                if (s.id !== scheduleId) return s;
                const updatedSchedule = {
                    ...s,
                    modules: s.modules.map(m => 
                        m.moduleId === moduleId 
                            ? { 
                                ...m, 
                                setStatus: status, 
                                setTime: new Date().toISOString(),
                                setBy: userData?.name || 'Field Crew'
                            } 
                            : m
                    ),
                    updatedAt: new Date().toISOString()
                };
                // Sync to Supabase
                if (supabaseAvailable && isSupabaseOnSiteAvailable()) {
                    window.MODA_SUPABASE_DATA.setSchedules.update(scheduleId, { modules: updatedSchedule.modules })
                        .catch(err => console.error('[SetSchedule] Module status sync failed:', err.message));
                }
                return updatedSchedule;
            });
            return updated;
        });
    }, [supabaseAvailable]);

    const addModulePhoto = useCallback((scheduleId, moduleId, photoData) => {
        setSchedules(prev => prev.map(s => {
            if (s.id !== scheduleId) return s;
            return {
                ...s,
                modules: s.modules.map(m => 
                    m.moduleId === moduleId 
                        ? { ...m, photos: [...(m.photos || []), photoData] }
                        : m
                ),
                updatedAt: new Date().toISOString()
            };
        }));
    }, []);

    const getScheduleById = useCallback((id) => schedules.find(s => s.id === id), [schedules]);
    
    const getTodaysSets = useCallback(() => {
        const today = new Date().toISOString().split('T')[0];
        return schedules.filter(s => s.scheduledDate === today);
    }, [schedules]);

    const getUpcomingSets = useCallback((days = 7) => {
        const today = new Date();
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + days);
        
        return schedules.filter(s => {
            const setDate = new Date(s.scheduledDate);
            return setDate >= today && setDate <= futureDate && s.status !== 'Complete';
        }).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    }, [schedules]);

    const getActiveSets = useCallback(() => schedules.filter(s => s.status === 'In Progress'), [schedules]);

    return {
        schedules,
        isLoading,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        startSet,
        completeSet,
        updateModuleStatus,
        addModulePhoto,
        getScheduleById,
        getTodaysSets,
        getUpcomingSets,
        getActiveSets
    };
}

// Hook for managing set issues
function useSetIssues() {
    const [issues, setIssues] = useState(() => {
        return safeParseJSON(localStorage.getItem('autovol_set_issues'), []);
    });
    const [isLoading, setIsLoading] = useState(true);
    const [supabaseAvailable, setSupabaseAvailable] = useState(false);

    // Load from Supabase on mount
    useEffect(() => {
        let mounted = true;
        const loadData = async () => {
            if (isSupabaseOnSiteAvailable() && window.MODA_SUPABASE_DATA?.setIssues) {
                try {
                    const data = await window.MODA_SUPABASE_DATA.setIssues.getAll();
                    if (mounted && data && data.length > 0) {
                        setIssues(data);
                        setSupabaseAvailable(true);
                        localStorage.setItem('autovol_set_issues', JSON.stringify(data));
                    } else if (mounted) {
                        setSupabaseAvailable(true);
                    }
                } catch (err) {
                    console.warn('[SetIssues] Supabase load failed:', err.message);
                }
            }
            if (mounted) setIsLoading(false);
        };
        setTimeout(loadData, 100);
        return () => { mounted = false; };
    }, []);

    // Save to localStorage as backup
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem('autovol_set_issues', JSON.stringify(issues));
        }
    }, [issues, isLoading]);

    const addIssue = useCallback(async (issueData) => {
        const newIssue = {
            id: `ISS-${Date.now()}`,
            ...issueData,
            status: 'Open',
            resolution: null,
            resolvedBy: null,
            resolvedAt: null,
            reportedAt: new Date().toISOString()
        };
        setIssues(prev => [newIssue, ...prev]);
        
        if (supabaseAvailable && window.MODA_SUPABASE_DATA?.setIssues) {
            try {
                await window.MODA_SUPABASE_DATA.setIssues.create(newIssue);
            } catch (err) {
                console.error('[SetIssues] Supabase create failed:', err.message);
            }
        }
        return newIssue;
    }, [supabaseAvailable]);

    const updateIssue = useCallback(async (id, updates) => {
        setIssues(prev => prev.map(i => 
            i.id === id ? { ...i, ...updates } : i
        ));
        
        if (supabaseAvailable && window.MODA_SUPABASE_DATA?.setIssues) {
            try {
                await window.MODA_SUPABASE_DATA.setIssues.update(id, updates);
            } catch (err) {
                console.error('[SetIssues] Supabase update failed:', err.message);
            }
        }
    }, [supabaseAvailable]);

    const resolveIssue = useCallback((id, resolution, resolvedBy) => {
        updateIssue(id, {
            status: 'Resolved',
            resolution,
            resolvedBy,
            resolvedAt: new Date().toISOString()
        });
    }, [updateIssue]);

    const getIssuesBySet = useCallback((setId) => issues.filter(i => i.setId === setId), [issues]);
    const getIssuesByModule = useCallback((moduleId) => issues.filter(i => i.moduleId === moduleId), [issues]);
    const getOpenIssues = useCallback(() => issues.filter(i => i.status === 'Open'), [issues]);

    return {
        issues,
        isLoading,
        addIssue,
        updateIssue,
        resolveIssue,
        getIssuesBySet,
        getIssuesByModule,
        getOpenIssues
    };
}

// Hook for managing Daily Site Reports
function useDailySiteReports() {
    const [reports, setReports] = useState(() => {
        return safeParseJSON(localStorage.getItem('autovol_daily_site_reports'), []);
    });
    const [isLoading, setIsLoading] = useState(true);
    const [supabaseAvailable, setSupabaseAvailable] = useState(false);

    // Load from Supabase on mount
    useEffect(() => {
        let mounted = true;
        const loadData = async () => {
            if (isSupabaseOnSiteAvailable() && window.MODA_SUPABASE_DATA?.dailySiteReports) {
                try {
                    const data = await window.MODA_SUPABASE_DATA.dailySiteReports.getAll();
                    if (mounted && data && data.length > 0) {
                        setReports(data);
                        setSupabaseAvailable(true);
                        localStorage.setItem('autovol_daily_site_reports', JSON.stringify(data));
                    } else if (mounted) {
                        setSupabaseAvailable(true);
                    }
                } catch (err) {
                    console.warn('[DailySiteReports] Supabase load failed:', err.message);
                }
            }
            if (mounted) setIsLoading(false);
        };
        setTimeout(loadData, 100);
        return () => { mounted = false; };
    }, []);

    // Save to localStorage as backup
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem('autovol_daily_site_reports', JSON.stringify(reports));
        }
    }, [reports, isLoading]);

    // Create a new daily report (or get existing for date)
    const createOrGetReport = useCallback(async (projectId, date) => {
        const dateStr = date || new Date().toISOString().split('T')[0];
        const existing = reports.find(r => r.projectId === projectId && r.date === dateStr);
        if (existing) return existing;

        const newReport = {
            id: `RPT-${Date.now()}`,
            date: dateStr,
            projectId,
            reportType: 'set-day', // set-day, weather-day, non-work
            
            // Header - Auto-filled where possible
            autovolRep: '',
            generalContractor: '',
            
            // Weather (editable)
            weather: {
                tempAM: null,
                tempPM: null,
                precipitation: 'none',
                wind: 'Light',
                isWeatherDay: false,
                notes: ''
            },
            
            // Progress Tracking
            progress: {
                unitsSetToday: 0,
                unitsSetTotal: 0,
                unitsRemaining: 0
            },
            
            // Timeline
            timeline: {
                startDate: null,
                projectedFinish: null,
                actualFinish: null,
                weatherDaysTotal: 0
            },
            
            // Content
            globalItems: [],
            modulesSetToday: [],
            issues: [],
            generalNotes: '',
            
            // Crew
            crew: [],
            
            // Photos
            photos: [],
            
            // Metadata
            status: 'draft', // draft, generated, sent
            createdAt: new Date().toISOString(),
            generatedAt: null,
            sentAt: null,
            sentTo: []
        };
        
        setReports(prev => [...prev, newReport]);
        
        // Sync to Supabase
        if (supabaseAvailable && window.MODA_SUPABASE_DATA?.dailySiteReports) {
            try {
                await window.MODA_SUPABASE_DATA.dailySiteReports.create(newReport);
            } catch (err) {
                console.error('[DailySiteReports] Supabase create failed:', err.message);
            }
        }
        return newReport;
    }, [reports, supabaseAvailable]);

    const updateReport = useCallback(async (id, updates) => {
        const updatedData = { ...updates, updatedAt: new Date().toISOString() };
        setReports(prev => prev.map(r => 
            r.id === id ? { ...r, ...updatedData } : r
        ));
        
        // Sync to Supabase
        if (supabaseAvailable && window.MODA_SUPABASE_DATA?.dailySiteReports) {
            try {
                await window.MODA_SUPABASE_DATA.dailySiteReports.update(id, updatedData);
            } catch (err) {
                console.error('[DailySiteReports] Supabase update failed:', err.message);
            }
        }
    }, [supabaseAvailable]);

    const addGlobalItem = (reportId, item) => {
        setReports(prev => prev.map(r => {
            if (r.id !== reportId) return r;
            return {
                ...r,
                globalItems: [...r.globalItems, {
                    id: `GI-${Date.now()}`,
                    text: item.text,
                    priority: item.priority || 'fyi',
                    createdAt: new Date().toISOString()
                }]
            };
        }));
    };

    const updateGlobalItem = (reportId, itemId, updates) => {
        setReports(prev => prev.map(r => {
            if (r.id !== reportId) return r;
            return {
                ...r,
                globalItems: r.globalItems.map(gi => 
                    gi.id === itemId ? { ...gi, ...updates } : gi
                )
            };
        }));
    };

    const removeGlobalItem = (reportId, itemId) => {
        setReports(prev => prev.map(r => {
            if (r.id !== reportId) return r;
            return {
                ...r,
                globalItems: r.globalItems.filter(gi => gi.id !== itemId)
            };
        }));
    };

    const logModuleSet = (reportId, moduleData) => {
        setReports(prev => prev.map(r => {
            if (r.id !== reportId) return r;
            const existing = r.modulesSetToday.find(m => m.moduleId === moduleData.moduleId);
            if (existing) return r; // Already logged
            
            return {
                ...r,
                modulesSetToday: [...r.modulesSetToday, {
                    ...moduleData,
                    setTime: new Date().toISOString(),
                    loggedAt: new Date().toISOString()
                }],
                progress: {
                    ...r.progress,
                    unitsSetToday: r.progress.unitsSetToday + (moduleData.isSawbox ? 2 : 1)
                }
            };
        }));
    };

    const addIssueToReport = (reportId, issueData) => {
        setReports(prev => prev.map(r => {
            if (r.id !== reportId) return r;
            return {
                ...r,
                issues: [...r.issues, {
                    id: `ISS-${Date.now()}`,
                    ...issueData,
                    photos: issueData.photos || [],
                    loggedAt: new Date().toISOString()
                }]
            };
        }));
    };

    const addPhotoToReport = (reportId, photoData) => {
        setReports(prev => prev.map(r => {
            if (r.id !== reportId) return r;
            return {
                ...r,
                photos: [...r.photos, {
                    id: `PHOTO-${Date.now()}`,
                    ...photoData,
                    capturedAt: new Date().toISOString()
                }]
            };
        }));
    };

    const generateReport = (reportId) => {
        updateReport(reportId, {
            status: 'generated',
            generatedAt: new Date().toISOString()
        });
    };

    const markReportSent = (reportId, recipients) => {
        updateReport(reportId, {
            status: 'sent',
            sentAt: new Date().toISOString(),
            sentTo: recipients
        });
    };

    const getReportByDate = (projectId, date) => {
        return reports.find(r => r.projectId === projectId && r.date === date);
    };

    const getReportsForProject = (projectId) => {
        return reports.filter(r => r.projectId === projectId)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const getRecentReports = (days = 7) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return reports.filter(r => new Date(r.date) >= cutoff)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    // Calculate weather days for a project
    const getWeatherDaysCount = (projectId) => {
        return reports.filter(r => 
            r.projectId === projectId && r.weather?.isWeatherDay
        ).length;
    };

    return {
        reports,
        createOrGetReport,
        updateReport,
        addGlobalItem,
        updateGlobalItem,
        removeGlobalItem,
        logModuleSet,
        addIssueToReport,
        addPhotoToReport,
        generateReport,
        markReportSent,
        getReportByDate,
        getReportsForProject,
        getRecentReports,
        getWeatherDaysCount
    };
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Issue Categories - Use CSS icon classes (no emojis)
const ISSUE_CATEGORIES = [
    { id: 'quality-defect', label: 'Quality Defect', iconClass: 'icon-quality-issue', description: 'Damage, defects found during set' },
    { id: 'question', label: 'Question', iconClass: 'icon-question', description: 'Needs clarification or decision' },
    { id: 'site-issue', label: 'Site-Issue', iconClass: 'icon-site-issue', description: 'Site conditions, access, GC coordination' },
    { id: 'drawing-issue', label: 'Drawing Issue', iconClass: 'icon-drawing-issue', description: 'Discrepancy with plans/specs' },
    { id: 'other', label: 'Other', iconClass: 'icon-other', description: 'Free-text fill-in for edge cases', allowCustom: true }
];

// Global Items Priority Levels - Use CSS icon classes
const GLOBAL_ITEM_PRIORITIES = [
    { id: 'attention', label: 'Attention', color: '#DC2626', bgColor: '#FEE2E2', iconClass: 'icon-attention' },
    { id: 'fyi', label: 'FYI', color: '#2563EB', bgColor: '#DBEAFE', iconClass: 'icon-info' },
    { id: 'resolved', label: 'Resolved', color: '#16A34A', bgColor: '#DCFCE7', iconClass: 'icon-check' }
];

const SEVERITY_LEVELS = [
    { id: 'critical', label: 'Critical', color: '#DC2626', bgColor: '#FEE2E2', description: 'Stops work, safety issue' },
    { id: 'major', label: 'Major', color: '#EA580C', bgColor: '#FFEDD5', description: 'Needs fix before close-out' },
    { id: 'minor', label: 'Minor', color: '#16A34A', bgColor: '#DCFCE7', description: 'Cosmetic, can address later' }
];

const TRADES = [
    'Drywall', 'Electrical', 'Plumbing', 'HVAC', 'Framing', 
    'Roofing', 'Exterior', 'Flooring', 'Cabinets', 'Windows/Doors',
    'Insulation', 'Paint', 'Structural', 'Other'
];

// Wind levels for weather reporting
const WIND_LEVELS = ['Light', 'Moderate', 'High', 'Other'];

// Report types
const REPORT_TYPES = [
    { id: 'set-day', label: 'Set Day', description: 'Normal work day with module sets' },
    { id: 'weather-day', label: 'Weather Day', description: 'No sets due to weather, may have site activity' },
    { id: 'non-work', label: 'Non-Work Day', description: 'Weekend, holiday, no activity' }
];

// ============================================================================
// MAIN ON-SITE TAB COMPONENT
// ============================================================================

function OnSiteTab({ projects = [], employees = [], currentUser = null, modules = [] }) {
    const [activeSubTab, setActiveSubTab] = useState('dashboard');
    
    // localStorage-based hooks (always called to satisfy React's rules of hooks)
    const scheduleHook = useSetSchedule();
    const issueHook = useSetIssues();
    const reportHook = useDailySiteReports();
    
    // Modal states
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showNewIssueLogger, setShowNewIssueLogger] = useState(false);
    const [issueContext, setIssueContext] = useState(null);
    const [selectedSet, setSelectedSet] = useState(null);
    const [selectedModule, setSelectedModule] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [activeReportId, setActiveReportId] = useState(null);

    
    const subTabs = [
        { id: 'dashboard', label: 'Sets Dashboard', iconClass: 'icon-dashboard' },
        { id: 'daily-report', label: 'Daily Report', iconClass: 'icon-report' },
        { id: 'schedule', label: 'Schedule Set', iconClass: 'icon-calendar' },
        { id: 'site-reports', label: 'Site Reports', iconClass: 'icon-history' }
    ];

    const openIssueLogger = (setData, moduleData) => {
        setIssueContext({ set: setData, module: moduleData });
        // Use new IssueLogger component if available and we have a report
        if (window.IssueLogger && activeReportId) {
            setShowNewIssueLogger(true);
        } else {
            setShowIssueModal(true);
        }
    };

    const handleIssueSubmit = (issueData) => {
        issueHook.addIssue(issueData);
        setShowIssueModal(false);
        setShowNewIssueLogger(false);
        setIssueContext(null);
    };
    
    // Get all modules from projects for the IssueLogger
    const allModules = useMemo(() => {
        if (modules && modules.length > 0) return modules;
        // Flatten modules from all projects
        return projects.flatMap(p => (p.modules || []).map(m => ({ ...m, projectId: p.id, projectName: p.name })));
    }, [projects, modules]);

    return (
        <div className="onsite-container">
            {/* Sub-Tab Navigation */}
            <div className="onsite-subtab-nav">
                {subTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`onsite-subtab-btn ${activeSubTab === tab.id ? 'active' : ''}`}
                    >
                        <span className={`subtab-icon ${tab.iconClass}`} style={{ width: '18px', height: '18px', display: 'inline-block' }}></span>
                        <span className="subtab-label">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Sub-Tab Content */}
            <div className="onsite-content">
                {activeSubTab === 'dashboard' && (
                    <OnSiteDashboard
                        scheduleHook={scheduleHook}
                        issueHook={issueHook}
                        onStartSet={(set) => {
                            scheduleHook.startSet(set.id);
                            setSelectedSet(set);
                        }}
                        onViewSet={(set) => setSelectedSet(set)}
                        onLogIssue={openIssueLogger}
                        selectedSet={selectedSet}
                        setSelectedSet={setSelectedSet}
                        onScheduleNew={() => setShowScheduleModal(true)}
                    />
                )}

                {activeSubTab === 'daily-report' && (
                    <DailyReportTab
                        projects={projects}
                        employees={employees}
                        currentUser={currentUser}
                        reportHook={reportHook}
                        scheduleHook={scheduleHook}
                        issueHook={issueHook}
                        selectedProject={selectedProject}
                        setSelectedProject={setSelectedProject}
                    />
                )}

                {activeSubTab === 'schedule' && (
                    <SetScheduleTab
                        scheduleHook={scheduleHook}
                        projects={projects}
                        employees={employees}
                        onScheduleNew={() => setShowScheduleModal(true)}
                        onViewSet={(set) => {
                            setSelectedSet(set);
                            setActiveSubTab('dashboard');
                        }}
                    />
                )}

                {activeSubTab === 'site-reports' && (
                    <SiteReportsPlaceholder />
                )}
            </div>

            {/* Schedule Set Modal */}
            {showScheduleModal && (
                <ScheduleSetModal
                    projects={projects}
                    employees={employees}
                    onSave={(data) => {
                        scheduleHook.addSchedule(data);
                        setShowScheduleModal(false);
                    }}
                    onClose={() => setShowScheduleModal(false)}
                />
            )}

            {/* Issue Logger Modal (Legacy) */}
            {showIssueModal && issueContext && (
                <IssueLoggerModal
                    setData={issueContext.set}
                    moduleData={issueContext.module}
                    onSubmit={handleIssueSubmit}
                    onClose={() => {
                        setShowIssueModal(false);
                        setIssueContext(null);
                    }}
                />
            )}

            {/* New Issue Logger (3-step wizard with Supabase) */}
            {showNewIssueLogger && activeReportId && window.IssueLogger && (
                <window.IssueLogger
                    reportId={activeReportId}
                    modules={allModules}
                    initialModule={issueContext?.module || null}
                    onSubmit={handleIssueSubmit}
                    onClose={() => {
                        setShowNewIssueLogger(false);
                        setIssueContext(null);
                    }}
                />
            )}
        </div>
    );
}

// ============================================================================
// DASHBOARD SUB-TAB
// ============================================================================

// Set Stages - similar to Transport stages
const SET_STAGES = [
    { id: 'scheduled', label: 'Scheduled', color: '#3B82F6', description: 'Upcoming sets' },
    { id: 'in-progress', label: 'Active', color: '#C8102E', description: 'Currently setting' },
    { id: 'complete', label: 'Completed', color: '#10B981', description: 'Finished sets' }
];

// Inline styles for Sets Dashboard (Transport Board style)
const setsDashboardStyles = {
    container: { padding: '20px', maxWidth: '1400px', margin: '0 auto' },
    statsBar: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
    statCard: (color) => ({
        padding: '12px 20px',
        background: '#fff',
        borderRadius: '10px',
        borderLeft: `4px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        minWidth: '120px'
    }),
    statValue: { fontSize: '24px', fontWeight: '700', color: '#1E3A5F' },
    statLabel: { fontSize: '12px', color: '#64748b' },
    boardContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        alignItems: 'start'
    },
    stageColumn: {
        background: '#fff',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        minHeight: '400px'
    },
    stageHeader: (color) => ({
        padding: '14px 16px',
        background: color,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    }),
    stageTitle: { fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' },
    stageCount: {
        background: 'rgba(255,255,255,0.25)',
        padding: '3px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '700'
    },
    stageBody: { padding: '12px', maxHeight: '500px', overflowY: 'auto' },
    setCard: (isHovered) => ({
        background: isHovered ? '#e8eaed' : '#F5F6FA',
        borderRadius: '8px',
        padding: '14px',
        marginBottom: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        borderLeft: isHovered ? '3px solid #1E3A5F' : '3px solid transparent',
        transform: isHovered ? 'translateX(3px)' : 'none'
    }),
    setCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' },
    setProject: { fontWeight: '700', fontSize: '14px', color: '#1E3A5F' },
    setDate: { fontSize: '11px', color: '#C8102E', fontWeight: '600' },
    setDetails: { fontSize: '12px', color: '#666', marginBottom: '4px' },
    setModules: { fontSize: '12px', color: '#3B82F6', fontWeight: '600' },
    emptyState: { textAlign: 'center', padding: '40px 20px', color: '#999', fontSize: '13px' },
    actionBtn: {
        padding: '6px 14px',
        background: '#C8102E',
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        marginTop: '8px'
    },
    scheduleBtn: {
        padding: '10px 20px',
        background: '#C8102E',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer'
    }
};

function OnSiteDashboard({ 
    scheduleHook, 
    issueHook, 
    onStartSet, 
    onViewSet, 
    onLogIssue,
    selectedSet,
    setSelectedSet,
    onScheduleNew 
}) {
    const [hoveredCard, setHoveredCard] = useState(null);
    
    // Categorize sets by status
    const scheduledSets = scheduleHook.schedules.filter(s => s.status === 'Scheduled');
    const activeSets = scheduleHook.schedules.filter(s => s.status === 'In Progress');
    const completedSets = scheduleHook.schedules.filter(s => s.status === 'Complete');
    const openIssues = issueHook.getOpenIssues();

    // If a set is selected, show the active set panel
    if (selectedSet) {
        return (
            <ActiveSetPanel
                set={selectedSet}
                scheduleHook={scheduleHook}
                issueHook={issueHook}
                onLogIssue={onLogIssue}
                onBack={() => setSelectedSet(null)}
            />
        );
    }

    // Format date for display
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Set Card Component
    const SetCardItem = ({ set, stageColor, showStartBtn = false }) => {
        const isHovered = hoveredCard === set.id;
        const moduleCount = set.modules?.length || 0;
        
        return (
            <div
                style={setsDashboardStyles.setCard(isHovered)}
                onMouseEnter={() => setHoveredCard(set.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => onViewSet(set)}
            >
                <div style={setsDashboardStyles.setCardHeader}>
                    <span style={setsDashboardStyles.setProject}>{set.projectName || 'Unknown Project'}</span>
                    {set.scheduledDate && (
                        <span style={setsDashboardStyles.setDate}>{formatDate(set.scheduledDate)}</span>
                    )}
                </div>
                <div style={setsDashboardStyles.setDetails}>
                    {set.scheduledTime && `${set.scheduledTime} • `}{moduleCount} module{moduleCount !== 1 ? 's' : ''}
                </div>
                {set.siteAddress && (
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                        {set.siteAddress}
                    </div>
                )}
                {showStartBtn && (
                    <button
                        style={setsDashboardStyles.actionBtn}
                        onClick={(e) => { e.stopPropagation(); onStartSet(set); }}
                    >
                        Start Set
                    </button>
                )}
            </div>
        );
    };

    // Stage Column Component
    const StageColumn = ({ stage, sets, showStartBtn = false }) => (
        <div style={setsDashboardStyles.stageColumn}>
            <div style={setsDashboardStyles.stageHeader(stage.color)}>
                <span style={setsDashboardStyles.stageTitle}>
                    {stage.label}
                </span>
                <span style={setsDashboardStyles.stageCount}>{sets.length}</span>
            </div>
            <div style={setsDashboardStyles.stageBody}>
                {sets.length === 0 ? (
                    <div style={setsDashboardStyles.emptyState}>
                        No {stage.label.toLowerCase()} sets
                        {stage.id === 'scheduled' && (
                            <div style={{ marginTop: '12px' }}>
                                <button style={setsDashboardStyles.scheduleBtn} onClick={onScheduleNew}>
                                    + Schedule Set
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    sets.map(set => (
                        <SetCardItem 
                            key={set.id} 
                            set={set} 
                            stageColor={stage.color}
                            showStartBtn={showStartBtn}
                        />
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div style={setsDashboardStyles.container}>
            {/* Stats Bar */}
            <div style={setsDashboardStyles.statsBar}>
                <div style={setsDashboardStyles.statCard('#3B82F6')}>
                    <div>
                        <div style={setsDashboardStyles.statValue}>{scheduledSets.length}</div>
                        <div style={setsDashboardStyles.statLabel}>Scheduled</div>
                    </div>
                </div>
                <div style={setsDashboardStyles.statCard('#C8102E')}>
                    <div>
                        <div style={setsDashboardStyles.statValue}>{activeSets.length}</div>
                        <div style={setsDashboardStyles.statLabel}>Active</div>
                    </div>
                </div>
                <div style={setsDashboardStyles.statCard('#10B981')}>
                    <div>
                        <div style={setsDashboardStyles.statValue}>{completedSets.length}</div>
                        <div style={setsDashboardStyles.statLabel}>Completed</div>
                    </div>
                </div>
                {openIssues.length > 0 && (
                    <div style={setsDashboardStyles.statCard('#F59E0B')}>
                        <div>
                            <div style={setsDashboardStyles.statValue}>{openIssues.length}</div>
                            <div style={setsDashboardStyles.statLabel}>Open Issues</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Kanban Board */}
            <div style={setsDashboardStyles.boardContainer}>
                <StageColumn 
                    stage={{ id: 'scheduled', label: 'Scheduled', color: '#3B82F6' }} 
                    sets={scheduledSets.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))}
                    showStartBtn={true}
                />
                <StageColumn 
                    stage={{ id: 'in-progress', label: 'Active', color: '#C8102E' }} 
                    sets={activeSets}
                />
                <StageColumn 
                    stage={{ id: 'complete', label: 'Completed', color: '#10B981' }} 
                    sets={completedSets.slice(0, 20)}
                />
            </div>
        </div>
    );
}

// ============================================================================
// SITE REPORTS PLACEHOLDER
// ============================================================================

function SiteReportsPlaceholder() {
    const styles = {
        container: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '40px 20px'
        },
        content: {
            maxWidth: '480px',
            textAlign: 'center',
            background: '#fff',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        },
        icon: {
            fontSize: '48px',
            marginBottom: '20px',
            opacity: 0.4
        },
        title: {
            fontSize: '24px',
            fontWeight: '600',
            color: '#1E3A5F',
            margin: '0 0 12px 0'
        },
        description: {
            fontSize: '15px',
            color: '#64748b',
            lineHeight: 1.6,
            marginBottom: '24px'
        },
        features: {
            background: '#f8fafc',
            borderRadius: '10px',
            padding: '20px',
            textAlign: 'left',
            marginBottom: '20px'
        },
        featureTitle: {
            fontSize: '14px',
            fontWeight: '600',
            color: '#1E3A5F',
            margin: '0 0 12px 0'
        },
        featureList: {
            margin: 0,
            paddingLeft: '20px',
            fontSize: '14px',
            color: '#374151',
            lineHeight: 1.8
        },
        note: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 16px',
            background: '#dbeafe',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#1d4ed8'
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                <div style={styles.icon}>📋</div>
                <h2 style={styles.title}>Site Reports</h2>
                <p style={styles.description}>
                    Site Reports are currently being developed offline and will be integrated once the MVP is complete.
                </p>
                <div style={styles.features}>
                    <h3 style={styles.featureTitle}>Coming Soon:</h3>
                    <ul style={styles.featureList}>
                        <li>Daily Site Reports with weather tracking</li>
                        <li>Module set documentation with photos</li>
                        <li>Issue logging and resolution tracking</li>
                        <li>PDF export and email distribution</li>
                        <li>Historical report archive</li>
                    </ul>
                </div>
                <div style={styles.note}>
                    Use the Daily Report tab for current report creation functionality.
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// SET CARD COMPONENT
// ============================================================================

function SetCard({ set, issueCount, onStart, onView, isActive }) {
    const modulesSet = set.modules.filter(m => m.setStatus === 'Set').length;
    const totalModules = set.modules.length;
    const progress = totalModules > 0 ? (modulesSet / totalModules) * 100 : 0;

    return (
        <div className={`set-card ${isActive ? 'active' : ''} ${set.status.toLowerCase().replace(' ', '-')}`}>
            <div className="set-card-header">
                <div className="set-project">{set.projectName}</div>
                <span className={`status-badge ${set.status.toLowerCase().replace(' ', '-')}`}>
                    {set.status}
                </span>
            </div>
            
            <div className="set-card-body">
                <div className="set-info-row">
                    <span className="info-icon icon-box" style={{ width: '16px', height: '16px' }}></span>
                    <span>{totalModules} Modules</span>
                </div>
                <div className="set-info-row">
                    <span className="info-icon icon-timer" style={{ width: '16px', height: '16px' }}></span>
                    <span>{set.scheduledTime}</span>
                </div>
                {set.crew && set.crew.length > 0 && (
                    <div className="set-info-row">
                        <span className="info-icon icon-people" style={{ width: '16px', height: '16px' }}></span>
                        <span>{set.crew.map(c => c.name).join(', ')}</span>
                    </div>
                )}
                {issueCount > 0 && (
                    <div className="set-info-row warning">
                        <span className="info-icon icon-alert" style={{ width: '16px', height: '16px' }}></span>
                        <span>{issueCount} Open Issues</span>
                    </div>
                )}
            </div>

            {isActive && (
                <div className="set-progress">
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <div className="progress-text">{modulesSet} / {totalModules} Set</div>
                </div>
            )}

            <div className="set-card-actions">
                {set.status === 'Scheduled' && onStart && (
                    <button onClick={onStart} className="btn-primary">
                        Start Set
                    </button>
                )}
                <button onClick={onView} className="btn-secondary">
                    {isActive ? 'Continue' : 'View Details'}
                </button>
            </div>
        </div>
    );
}

// ============================================================================
// ACTIVE SET PANEL (Mobile-Optimized)
// ============================================================================

function ActiveSetPanel({ set, scheduleHook, issueHook, onLogIssue, onBack }) {
    const [selectedModule, setSelectedModule] = useState(null);
    const [showPhotoCapture, setShowPhotoCapture] = useState(false);
    const [photoContext, setPhotoContext] = useState(null);

    const modulesSet = set.modules.filter(m => m.setStatus === 'Set').length;
    const totalModules = set.modules.length;
    const progress = totalModules > 0 ? (modulesSet / totalModules) * 100 : 0;
    const setIssues = issueHook.getIssuesBySet(set.id);

    const handleMarkAsSet = (module) => {
        scheduleHook.updateModuleStatus(set.id, module.moduleId, 'Set', { name: 'Field Crew' });
    };

    const handleTakePhoto = (module) => {
        setPhotoContext(module);
        setShowPhotoCapture(true);
    };

    const handlePhotoCapture = (photoData) => {
        if (photoContext) {
            scheduleHook.addModulePhoto(set.id, photoContext.moduleId, {
                id: `photo-${Date.now()}`,
                url: photoData,
                timestamp: new Date().toISOString(),
                caption: ''
            });
        }
        setShowPhotoCapture(false);
        setPhotoContext(null);
    };

    // Check if all modules are set
    const allModulesSet = set.modules.every(m => m.setStatus === 'Set');

    return (
        <div className="active-set-panel">
            {/* Header */}
            <div className="panel-header">
                <button onClick={onBack} className="back-btn">
                    <span className="icon-chevron-left" style={{ width: '16px', height: '16px', display: 'inline-block', marginRight: '4px' }}></span>Back
                </button>
                <div className="panel-title">
                    <h2>{set.projectName}</h2>
                    <span className={`status-badge ${set.status.toLowerCase().replace(' ', '-')}`}>
                        {set.status}
                    </span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="set-progress-section">
                <div className="progress-header">
                    <span>Set Progress</span>
                    <span className="progress-count">{modulesSet} / {totalModules}</span>
                </div>
                <div className="progress-bar large">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                {set.actualStartTime && (
                    <div className="set-timer">
                        Started: {new Date(set.actualStartTime).toLocaleTimeString()}
                    </div>
                )}
            </div>

            {/* Quick Stats */}
            <div className="panel-stats">
                <div className="panel-stat">
                    <span className="stat-num">{set.modules.filter(m => m.photos?.length > 0).length}</span>
                    <span className="stat-text">Photos</span>
                </div>
                <div className="panel-stat warning">
                    <span className="stat-num">{setIssues.filter(i => i.status === 'Open').length}</span>
                    <span className="stat-text">Issues</span>
                </div>
            </div>

            {/* Module Checklist */}
            <div className="module-checklist">
                <h3>Module Checklist</h3>
                {set.modules.map(module => (
                    <ModuleChecklistItem
                        key={module.moduleId}
                        module={module}
                        issues={issueHook.getIssuesByModule(module.moduleId)}
                        onMarkAsSet={() => handleMarkAsSet(module)}
                        onLogIssue={() => onLogIssue(set, module)}
                        onTakePhoto={() => handleTakePhoto(module)}
                        onViewDetails={() => setSelectedModule(module)}
                    />
                ))}
            </div>

            {/* Complete Set Button */}
            {set.status === 'In Progress' && allModulesSet && (
                <div className="complete-set-section">
                    <button 
                        onClick={() => scheduleHook.completeSet(set.id)}
                        className="btn-complete"
                    >
                        <span className="icon-check" style={{ width: '16px', height: '16px', display: 'inline-block', marginRight: '4px', filter: 'brightness(0) invert(1)' }}></span>Complete Set
                    </button>
                </div>
            )}

            {/* Photo Capture Modal */}
            {showPhotoCapture && (
                <PhotoCaptureModal
                    module={photoContext}
                    onCapture={handlePhotoCapture}
                    onClose={() => {
                        setShowPhotoCapture(false);
                        setPhotoContext(null);
                    }}
                />
            )}

            {/* Module Detail Modal */}
            {selectedModule && (
                <ModuleDetailModal
                    module={selectedModule}
                    set={set}
                    issues={issueHook.getIssuesByModule(selectedModule.moduleId)}
                    onClose={() => setSelectedModule(null)}
                />
            )}
        </div>
    );
}

// ============================================================================
// MODULE CHECKLIST ITEM
// ============================================================================

function ModuleChecklistItem({ module, issues, onMarkAsSet, onLogIssue, onTakePhoto, onViewDetails }) {
    const openIssues = issues.filter(i => i.status === 'Open');
    const isSet = module.setStatus === 'Set';

    return (
        <div className={`module-item ${isSet ? 'set' : ''} ${openIssues.length > 0 ? 'has-issues' : ''}`}>
            <div className="module-item-header" onClick={onViewDetails}>
                <div className="module-status-icon">
                    {isSet 
                        ? <span className="icon-check" style={{ width: '20px', height: '20px', display: 'block' }}></span>
                        : openIssues.length > 0 
                            ? <span className="icon-alert" style={{ width: '20px', height: '20px', display: 'block' }}></span>
                            : <span className="icon-box" style={{ width: '20px', height: '20px', display: 'block', opacity: 0.3 }}></span>
                    }
                </div>
                <div className="module-info">
                    <div className="module-serial">
                        {module.serialNumber}
                        {module.hitchBLM && <span className="module-blm"> • {module.hitchBLM}</span>}
                    </div>
                    <div className="module-details">
                        {module.hitchUnit && <span>{module.hitchUnit}</span>}
                        {module.hitchRoom && <span> • {module.hitchRoom}</span>}
                    </div>
                </div>
                {module.photos?.length > 0 && (
                    <div className="photo-count">
                        <span className="icon-camera" style={{ width: '14px', height: '14px', display: 'inline-block', marginRight: '4px' }}></span>
                        {module.photos.length}
                    </div>
                )}
            </div>

            {/* Production Notes */}
            {module.productionNotes && module.productionNotes.length > 0 && (
                <div className="production-notes">
                    <div className="notes-header"><span className="icon-other" style={{ width: '14px', height: '14px', display: 'inline-block', marginRight: '4px' }}></span>Production Notes</div>
                    {module.productionNotes.map((note, idx) => (
                        <div key={idx} className="note-item">
                            <span className="note-text">{note.note}</span>
                            <span className="note-meta">- {note.author}, {note.date}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Open Issues */}
            {openIssues.length > 0 && (
                <div className="module-issues">
                    {openIssues.map(issue => (
                        <div key={issue.id} className={`issue-badge ${issue.severity}`}>
                            {issue.issueType}
                        </div>
                    ))}
                </div>
            )}

            {/* Action Buttons */}
            <div className="module-actions">
                {!isSet && (
                    <button onClick={onMarkAsSet} className="action-btn set">
                        <span className="icon-check" style={{ width: '14px', height: '14px', display: 'inline-block', marginRight: '4px' }}></span>
                        Mark as Set
                    </button>
                )}
                <button onClick={onLogIssue} className="action-btn issue">
                    <span className="icon-alert" style={{ width: '14px', height: '14px', display: 'inline-block', marginRight: '4px' }}></span>
                    Log Issue
                </button>
                <button onClick={onTakePhoto} className="action-btn photo">
                    <span className="icon-camera" style={{ width: '14px', height: '14px', display: 'inline-block', marginRight: '4px' }}></span>
                    Photo
                </button>
            </div>
        </div>
    );
}

// ============================================================================
// SCHEDULE SET MODAL
// ============================================================================

function ScheduleSetModal({ projects, employees, onSave, onClose }) {
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedModules, setSelectedModules] = useState([]);
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('07:00');
    const [siteAddress, setSiteAddress] = useState('');
    const [craneCompany, setCraneCompany] = useState('');
    const [craneOperator, setCraneOperator] = useState('');
    const [cranePhone, setCranePhone] = useState('');
    const [selectedCrew, setSelectedCrew] = useState([]);
    const [preSetNotes, setPreSetNotes] = useState('');

    // Get active projects
    const activeProjects = projects.filter(p => p.status === 'Active');
    
    // Get modules for selected project that are ready for set (completed Close-Up)
    const project = projects.find(p => p.id === selectedProject);
    const availableModules = project?.modules?.filter(m => {
        const progress = m.stageProgress || {};
        // Check if Close-Up is complete
        return progress['Close-Up']?.status === 'complete';
    }) || [];

    // Update site address when project changes
    useEffect(() => {
        if (project) {
            setSiteAddress(project.location || '');
        }
    }, [selectedProject]);

    const handleModuleToggle = (moduleId) => {
        setSelectedModules(prev => 
            prev.includes(moduleId) 
                ? prev.filter(id => id !== moduleId)
                : [...prev, moduleId]
        );
    };

    const handleSelectAll = () => {
        if (selectedModules.length === availableModules.length) {
            setSelectedModules([]);
        } else {
            setSelectedModules(availableModules.map(m => m.id));
        }
    };

    const handleCrewToggle = (employeeId) => {
        setSelectedCrew(prev => 
            prev.includes(employeeId)
                ? prev.filter(id => id !== employeeId)
                : [...prev, employeeId]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const modules = availableModules
            .filter(m => selectedModules.includes(m.id))
            .map(m => ({
                moduleId: m.id,
                serialNumber: m.serialNumber,
                hitchBLM: m.hitchBLM,
                hitchUnit: m.hitchUnit,
                hitchRoom: m.hitchRoom,
                productionNotes: m.notes || []
            }));

        const crew = employees
            .filter(e => selectedCrew.includes(e.id))
            .map(e => ({
                employeeId: e.id,
                name: `${e.firstName} ${e.lastName}`,
                role: e.role || 'Crew'
            }));

        onSave({
            projectId: selectedProject,
            projectName: project?.name || '',
            siteAddress,
            modules,
            scheduledDate,
            scheduledTime,
            crew,
            crane: {
                company: craneCompany,
                operator: craneOperator,
                phone: cranePhone
            },
            preSetNotes
        });
    };

    const isValid = selectedProject && selectedModules.length > 0 && scheduledDate;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content schedule-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Schedule Module Set</h2>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {/* Project Selection */}
                    <div className="form-section">
                        <label className="form-label">Project *</label>
                        <select
                            value={selectedProject}
                            onChange={(e) => {
                                setSelectedProject(e.target.value);
                                setSelectedModules([]);
                            }}
                            className="form-select"
                            required
                        >
                            <option value="">Select a project...</option>
                            {activeProjects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Module Selection */}
                    {selectedProject && (
                        <div className="form-section">
                            <div className="form-label-row">
                                <label className="form-label">Modules to Set *</label>
                                <button 
                                    type="button" 
                                    onClick={handleSelectAll}
                                    className="select-all-btn"
                                >
                                    {selectedModules.length === availableModules.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            
                            {availableModules.length === 0 ? (
                                <div className="no-modules-msg">
                                    No modules ready for set. Modules must complete Close-Up first.
                                </div>
                            ) : (
                                <div className="module-select-grid">
                                    {availableModules.map(m => (
                                        <label key={m.id} className={`module-select-item ${selectedModules.includes(m.id) ? 'selected' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={selectedModules.includes(m.id)}
                                                onChange={() => handleModuleToggle(m.id)}
                                            />
                                            <span className="module-select-info">
                                                <span className="serial">{m.serialNumber}</span>
                                                <span className="blm">{m.hitchBLM}</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            <div className="selected-count">
                                {selectedModules.length} of {availableModules.length} selected
                            </div>
                        </div>
                    )}

                    {/* Date & Time */}
                    <div className="form-row">
                        <div className="form-section">
                            <label className="form-label">Set Date *</label>
                            <input
                                type="date"
                                value={scheduledDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                        <div className="form-section">
                            <label className="form-label">Start Time</label>
                            <input
                                type="time"
                                value={scheduledTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                className="form-input"
                            />
                        </div>
                    </div>

                    {/* Site Address */}
                    <div className="form-section">
                        <label className="form-label">Site Address</label>
                        <input
                            type="text"
                            value={siteAddress}
                            onChange={(e) => setSiteAddress(e.target.value)}
                            className="form-input"
                            placeholder="123 Main St, City, State"
                        />
                    </div>

                    {/* Crane Info */}
                    <div className="form-section">
                        <label className="form-label">Crane Information</label>
                        <div className="form-row three-col">
                            <input
                                type="text"
                                value={craneCompany}
                                onChange={(e) => setCraneCompany(e.target.value)}
                                className="form-input"
                                placeholder="Crane Company"
                            />
                            <input
                                type="text"
                                value={craneOperator}
                                onChange={(e) => setCraneOperator(e.target.value)}
                                className="form-input"
                                placeholder="Operator Name"
                            />
                            <input
                                type="tel"
                                value={cranePhone}
                                onChange={(e) => setCranePhone(e.target.value)}
                                className="form-input"
                                placeholder="Phone"
                            />
                        </div>
                    </div>

                    {/* Crew Assignment */}
                    {employees.length > 0 && (
                        <div className="form-section">
                            <label className="form-label">Crew Assignment</label>
                            <div className="crew-select-grid">
                                {employees.filter(e => e.active !== false).slice(0, 12).map(emp => (
                                    <label key={emp.id} className={`crew-select-item ${selectedCrew.includes(emp.id) ? 'selected' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedCrew.includes(emp.id)}
                                            onChange={() => handleCrewToggle(emp.id)}
                                        />
                                        <span>{emp.firstName} {emp.lastName}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pre-Set Notes */}
                    <div className="form-section">
                        <label className="form-label">Pre-Set Notes</label>
                        <textarea
                            value={preSetNotes}
                            onChange={(e) => setPreSetNotes(e.target.value)}
                            className="form-textarea"
                            rows={3}
                            placeholder="Any special instructions or notes for the crew..."
                        />
                    </div>

                    {/* Actions */}
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={!isValid} className="btn-primary">
                            Schedule Set
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ============================================================================
// ISSUE LOGGER MODAL
// ============================================================================

function IssueLoggerModal({ setData, moduleData, onSubmit, onClose }) {
    const [issueType, setIssueType] = useState('');
    const [severity, setSeverity] = useState('minor');
    const [trade, setTrade] = useState('');
    const [description, setDescription] = useState('');
    const [photos, setPhotos] = useState([]);

    const handlePhotoAdd = (photoData) => {
        setPhotos(prev => [...prev, {
            id: `photo-${Date.now()}`,
            url: photoData,
            timestamp: new Date().toISOString()
        }]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            setId: setData.id,
            moduleId: moduleData.moduleId,
            serialNumber: moduleData.serialNumber,
            projectId: setData.projectId,
            projectName: setData.projectName,
            issueType: ISSUE_CATEGORIES.find(t => t.id === issueType)?.label || issueType,
            severity,
            trade,
            description,
            photos,
            reportedBy: 'Field Crew' // Would come from auth
        });
    };

    const isValid = issueType && severity && description;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content issue-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Log Issue</h2>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>

                <div className="issue-context">
                    <span className="context-label">Module:</span>
                    <span className="context-value">{moduleData.serialNumber}</span>
                    {moduleData.hitchBLM && (
                        <>
                            <span className="context-label">BLM:</span>
                            <span className="context-value">{moduleData.hitchBLM}</span>
                        </>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {/* Issue Type */}
                    <div className="form-section">
                        <label className="form-label">Issue Type *</label>
                        <div className="issue-type-grid">
                            {ISSUE_CATEGORIES.map(type => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setIssueType(type.id)}
                                    className={`issue-type-btn ${issueType === type.id ? 'selected' : ''}`}
                                >
                                    <span className={`type-icon ${type.iconClass}`} style={{ width: '20px', height: '20px', display: 'block', margin: '0 auto 4px' }}></span>
                                    <span className="type-label">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Severity */}
                    <div className="form-section">
                        <label className="form-label">Severity *</label>
                        <div className="severity-grid">
                            {SEVERITY_LEVELS.map(level => (
                                <button
                                    key={level.id}
                                    type="button"
                                    onClick={() => setSeverity(level.id)}
                                    className={`severity-btn ${severity === level.id ? 'selected' : ''}`}
                                    style={{
                                        '--severity-color': level.color,
                                        '--severity-bg': level.bgColor
                                    }}
                                >
                                    <span className="severity-label">{level.label}</span>
                                    <span className="severity-desc">{level.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Trade */}
                    <div className="form-section">
                        <label className="form-label">Trade/Category</label>
                        <select
                            value={trade}
                            onChange={(e) => setTrade(e.target.value)}
                            className="form-select"
                        >
                            <option value="">Select trade...</option>
                            {TRADES.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div className="form-section">
                        <label className="form-label">Description *</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="form-textarea"
                            rows={4}
                            placeholder="Describe the issue..."
                            required
                        />
                    </div>

                    {/* Photos */}
                    <div className="form-section">
                        <label className="form-label">Photos</label>
                        <div className="photo-grid">
                            {photos.map(photo => (
                                <div key={photo.id} className="photo-thumb">
                                    <img src={photo.url} alt="Issue" />
                                    <button 
                                        type="button"
                                        onClick={() => setPhotos(prev => prev.filter(p => p.id !== photo.id))}
                                        className="photo-remove"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            <label className="photo-add-btn">
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => handlePhotoAdd(ev.target.result);
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    style={{ display: 'none' }}
                                />
                                <span className="add-icon icon-camera" style={{ width: '24px', height: '24px', display: 'block', margin: '0 auto 4px' }}></span>
                                <span>Add Photo</span>
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={!isValid} className="btn-warning">
                            Submit Issue
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ============================================================================
// PHOTO CAPTURE MODAL
// ============================================================================

function PhotoCaptureModal({ module, onCapture, onClose }) {
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => onCapture(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content photo-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Take Photo</h2>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                
                <div className="photo-context">
                    Module: {module.serialNumber}
                </div>

                <div className="photo-capture-area">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="capture-btn"
                    >
                        <span className="capture-icon icon-camera" style={{ width: '32px', height: '32px', display: 'block' }}></span>
                        <span>Open Camera</span>
                    </button>
                </div>

                <div className="modal-actions">
                    <button onClick={onClose} className="btn-secondary">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// MODULE DETAIL MODAL
// ============================================================================

function ModuleDetailModal({ module, set, issues, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content module-detail-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Module Details</h2>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>

                <div className="modal-body">
                    {/* Module Info */}
                    <div className="detail-section">
                        <h3>Module Information</h3>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <span className="detail-label">Serial Number</span>
                                <span className="detail-value">{module.serialNumber}</span>
                            </div>
                            {module.hitchBLM && (
                                <div className="detail-item">
                                    <span className="detail-label">BLM ID</span>
                                    <span className="detail-value">{module.hitchBLM}</span>
                                </div>
                            )}
                            {module.hitchUnit && (
                                <div className="detail-item">
                                    <span className="detail-label">Unit</span>
                                    <span className="detail-value">{module.hitchUnit}</span>
                                </div>
                            )}
                            {module.hitchRoom && (
                                <div className="detail-item">
                                    <span className="detail-label">Room</span>
                                    <span className="detail-value">{module.hitchRoom}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Set Status */}
                    <div className="detail-section">
                        <h3>Set Status</h3>
                        <div className={`set-status-badge ${module.setStatus?.toLowerCase()}`}>
                            {module.setStatus || 'Pending'}
                        </div>
                        {module.setTime && (
                            <div className="set-time">
                                Set at {new Date(module.setTime).toLocaleString()} by {module.setBy}
                            </div>
                        )}
                    </div>

                    {/* Production Notes */}
                    {module.productionNotes && module.productionNotes.length > 0 && (
                        <div className="detail-section">
                            <h3>Production Notes</h3>
                            <div className="notes-list">
                                {module.productionNotes.map((note, idx) => (
                                    <div key={idx} className="note-card">
                                        <p>{note.note}</p>
                                        <span className="note-meta">{note.author} • {note.date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Photos */}
                    {module.photos && module.photos.length > 0 && (
                        <div className="detail-section">
                            <h3>Photos ({module.photos.length})</h3>
                            <div className="photo-gallery">
                                {module.photos.map(photo => (
                                    <div key={photo.id} className="gallery-item">
                                        <img src={photo.url} alt="Module" />
                                        <span className="photo-time">
                                            {new Date(photo.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Issues */}
                    {issues.length > 0 && (
                        <div className="detail-section">
                            <h3>Issues ({issues.length})</h3>
                            <div className="issues-list">
                                {issues.map(issue => (
                                    <div key={issue.id} className={`issue-card ${issue.severity}`}>
                                        <div className="issue-header">
                                            <span className="issue-type">{issue.issueType}</span>
                                            <span className={`issue-status ${issue.status.toLowerCase()}`}>
                                                {issue.status}
                                            </span>
                                        </div>
                                        <p className="issue-desc">{issue.description}</p>
                                        <div className="issue-meta">
                                            {issue.trade && <span>{issue.trade}</span>}
                                            <span>{new Date(issue.reportedAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <button onClick={onClose} className="btn-secondary">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// DAILY REPORT TAB
// ============================================================================

function DailyReportTab({ 
    projects, 
    employees, 
    currentUser, 
    reportHook, 
    scheduleHook, 
    issueHook,
    selectedProject,
    setSelectedProject 
}) {
    const [reportDate, setReportDate] = useState(() => {
        // Default to yesterday (reports are typically for prior day)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    });
    const [activeReport, setActiveReport] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [newGlobalItem, setNewGlobalItem] = useState({ text: '', priority: 'fyi' });
    const [showAddGlobalItem, setShowAddGlobalItem] = useState(false);

    // Get active projects (those with on-site activity)
    const activeProjects = projects.filter(p => p.status === 'Active');

    // Load or create report when project/date changes
    useEffect(() => {
        if (selectedProject && reportDate) {
            const report = reportHook.createOrGetReport(selectedProject.id, reportDate);
            setActiveReport(report);
        }
    }, [selectedProject, reportDate]);

    // Get today's sets for the selected project
    const projectSets = scheduleHook.schedules.filter(s => 
        s.projectId === selectedProject?.id && s.scheduledDate === reportDate
    );

    // Calculate progress from project data
    const calculateProgress = () => {
        if (!selectedProject) return { today: 0, total: 0, remaining: 0 };
        const modules = selectedProject.modules || [];
        const totalModules = modules.length;
        
        // Count sawboxes for unit calculation
        const sawboxCount = modules.filter(m => 
            m.difficulty?.includes('Sawbox') || m.isSawbox
        ).length;
        const totalUnits = totalModules + sawboxCount;
        
        // Count set modules (from report or schedules)
        const setToday = activeReport?.modulesSetToday?.length || 0;
        const setTotal = activeReport?.progress?.unitsSetTotal || 0;
        
        return {
            today: setToday,
            total: setTotal,
            remaining: totalUnits - setTotal
        };
    };

    const progress = calculateProgress();

    // Format date for display
    const formatDate = (dateStr) => {
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
        });
    };

    // Handle adding global item
    const handleAddGlobalItem = () => {
        if (!newGlobalItem.text.trim() || !activeReport) return;
        reportHook.addGlobalItem(activeReport.id, newGlobalItem);
        setNewGlobalItem({ text: '', priority: 'fyi' });
        setShowAddGlobalItem(false);
        // Refresh active report
        setActiveReport(reportHook.getReportByDate(selectedProject.id, reportDate));
    };

    // Handle weather update
    const handleWeatherUpdate = (field, value) => {
        if (!activeReport) return;
        reportHook.updateReport(activeReport.id, {
            weather: { ...activeReport.weather, [field]: value }
        });
        setActiveReport(prev => ({
            ...prev,
            weather: { ...prev.weather, [field]: value }
        }));
    };

    // Handle general notes update
    const handleNotesUpdate = (notes) => {
        if (!activeReport) return;
        reportHook.updateReport(activeReport.id, { generalNotes: notes });
        setActiveReport(prev => ({ ...prev, generalNotes: notes }));
    };

    // Generate report
    const handleGenerateReport = () => {
        if (!activeReport) return;
        reportHook.generateReport(activeReport.id);
        setShowPreview(true);
    };

    return (
        <div className="daily-report-container">
            {/* Project & Date Selection */}
            <div className="report-header-controls">
                <div className="control-group">
                    <label>Project</label>
                    <select 
                        value={selectedProject?.id || ''} 
                        onChange={(e) => {
                            const proj = projects.find(p => p.id === e.target.value);
                            setSelectedProject(proj);
                        }}
                        className="project-select"
                    >
                        <option value="">Select Project...</option>
                        {activeProjects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div className="control-group">
                    <label>Report Date</label>
                    <input 
                        type="date" 
                        value={reportDate} 
                        onChange={(e) => setReportDate(e.target.value)}
                        className="date-input"
                    />
                </div>
                {activeReport && (
                    <div className="report-status">
                        <span className={`status-badge ${activeReport.status}`}>
                            {activeReport.status === 'draft' ? 'Draft' : 
                             activeReport.status === 'generated' ? 'Generated' : 
                             'Sent'}
                        </span>
                    </div>
                )}
            </div>

            {!selectedProject ? (
                <div className="empty-state">
                    <div className="empty-icon"><span className="icon-other" style={{ width: '48px', height: '48px', display: 'block' }}></span></div>
                    <h3>Select a Project</h3>
                    <p>Choose a project to create or edit a daily site report</p>
                </div>
            ) : (
                <div className="report-editor">
                    {/* Report Header Info */}
                    <div className="report-section header-section">
                        <div className="section-title">
                            <h3><span className="icon-report" style={{ width: '18px', height: '18px', display: 'inline-block', marginRight: '8px' }}></span>Daily Site Report</h3>
                            <span className="report-date">{formatDate(reportDate)}</span>
                        </div>
                        
                        <div className="header-grid">
                            <div className="header-field">
                                <label>Job Site (Building)</label>
                                <div className="field-value">{selectedProject.name}</div>
                            </div>
                            <div className="header-field">
                                <label>Autovol Rep</label>
                                <input 
                                    type="text" 
                                    value={activeReport?.autovolRep || currentUser?.name || ''}
                                    onChange={(e) => {
                                        if (activeReport) {
                                            reportHook.updateReport(activeReport.id, { autovolRep: e.target.value });
                                            setActiveReport(prev => ({ ...prev, autovolRep: e.target.value }));
                                        }
                                    }}
                                    placeholder="Enter name..."
                                />
                            </div>
                            <div className="header-field">
                                <label>General Contractor</label>
                                <input 
                                    type="text" 
                                    value={activeReport?.generalContractor || selectedProject.generalContractor || ''}
                                    onChange={(e) => {
                                        if (activeReport) {
                                            reportHook.updateReport(activeReport.id, { generalContractor: e.target.value });
                                            setActiveReport(prev => ({ ...prev, generalContractor: e.target.value }));
                                        }
                                    }}
                                    placeholder="Enter GC..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Weather Section */}
                    <div className="report-section weather-section">
                        <div className="section-title">
                            <h3><span className="icon-weather" style={{ width: '18px', height: '18px', display: 'inline-block', marginRight: '8px' }}></span>Weather</h3>
                            <label className="weather-day-toggle">
                                <input 
                                    type="checkbox" 
                                    checked={activeReport?.weather?.isWeatherDay || false}
                                    onChange={(e) => handleWeatherUpdate('isWeatherDay', e.target.checked)}
                                />
                                <span>Weather Day (No Sets)</span>
                            </label>
                        </div>
                        
                        <div className="weather-grid">
                            <div className="weather-field">
                                <label>Temp AM</label>
                                <div className="temp-input">
                                    <input 
                                        type="number" 
                                        value={activeReport?.weather?.tempAM || ''}
                                        onChange={(e) => handleWeatherUpdate('tempAM', e.target.value)}
                                        placeholder="--"
                                    />
                                    <span>°F</span>
                                </div>
                            </div>
                            <div className="weather-field">
                                <label>Temp PM</label>
                                <div className="temp-input">
                                    <input 
                                        type="number" 
                                        value={activeReport?.weather?.tempPM || ''}
                                        onChange={(e) => handleWeatherUpdate('tempPM', e.target.value)}
                                        placeholder="--"
                                    />
                                    <span>°F</span>
                                </div>
                            </div>
                            <div className="weather-field">
                                <label>Precipitation</label>
                                <input 
                                    type="text" 
                                    value={activeReport?.weather?.precipitation || 'none'}
                                    onChange={(e) => handleWeatherUpdate('precipitation', e.target.value)}
                                    placeholder="none"
                                />
                            </div>
                            <div className="weather-field">
                                <label>Wind</label>
                                <select 
                                    value={activeReport?.weather?.wind || 'Light'}
                                    onChange={(e) => handleWeatherUpdate('wind', e.target.value)}
                                >
                                    {WIND_LEVELS.map(level => (
                                        <option key={level} value={level}>{level}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Progress Section */}
                    <div className="report-section progress-section">
                        <div className="section-title">
                            <h3><span className="icon-box" style={{ width: '18px', height: '18px', display: 'inline-block', marginRight: '8px' }}></span>Progress</h3>
                        </div>
                        <div className="progress-grid">
                            <div className="progress-stat">
                                <div className="stat-value">{progress.today}</div>
                                <div className="stat-label">Units Set Today</div>
                            </div>
                            <div className="progress-stat">
                                <div className="stat-value">{progress.total}</div>
                                <div className="stat-label">Units Set Total</div>
                            </div>
                            <div className="progress-stat">
                                <div className="stat-value">{progress.remaining}</div>
                                <div className="stat-label">Units Remaining</div>
                            </div>
                        </div>
                    </div>

                    {/* Global Items Section */}
                    <div className="report-section global-items-section">
                        <div className="section-title">
                            <h3><span className="icon-attention" style={{ width: '18px', height: '18px', display: 'inline-block', marginRight: '8px' }}></span>Global Items</h3>
                            <button 
                                onClick={() => setShowAddGlobalItem(true)}
                                className="btn-add-small"
                            >
                                + Add Item
                            </button>
                        </div>
                        
                        {showAddGlobalItem && (
                            <div className="add-global-item-form">
                                <textarea 
                                    value={newGlobalItem.text}
                                    onChange={(e) => setNewGlobalItem(prev => ({ ...prev, text: e.target.value }))}
                                    placeholder="Enter highlight or attention item..."
                                    rows={2}
                                />
                                <div className="form-row">
                                    <select 
                                        value={newGlobalItem.priority}
                                        onChange={(e) => setNewGlobalItem(prev => ({ ...prev, priority: e.target.value }))}
                                    >
                                        {GLOBAL_ITEM_PRIORITIES.map(p => (
                                            <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                                        ))}
                                    </select>
                                    <div className="form-actions">
                                        <button onClick={() => setShowAddGlobalItem(false)} className="btn-cancel">Cancel</button>
                                        <button onClick={handleAddGlobalItem} className="btn-primary">Add</button>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="global-items-list">
                            {(activeReport?.globalItems || []).length === 0 ? (
                                <div className="empty-items">No global items added</div>
                            ) : (
                                activeReport.globalItems.map(item => {
                                    const priority = GLOBAL_ITEM_PRIORITIES.find(p => p.id === item.priority);
                                    return (
                                        <div 
                                            key={item.id} 
                                            className="global-item"
                                            style={{ 
                                                backgroundColor: priority?.bgColor,
                                                borderLeftColor: priority?.color 
                                            }}
                                        >
                                            <span className="item-icon">{priority?.icon}</span>
                                            <span className="item-text">{item.text}</span>
                                            <button 
                                                onClick={() => {
                                                    reportHook.removeGlobalItem(activeReport.id, item.id);
                                                    setActiveReport(reportHook.getReportByDate(selectedProject.id, reportDate));
                                                }}
                                                className="btn-remove"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Issues Section */}
                    <div className="report-section issues-section">
                        <div className="section-title">
                            <h3><span className="icon-alert" style={{ width: '18px', height: '18px', display: 'inline-block', marginRight: '8px' }}></span>Issues ({(activeReport?.issues || []).length})</h3>
                        </div>
                        <div className="issues-list">
                            {(activeReport?.issues || []).length === 0 ? (
                                <div className="empty-items">No issues logged for this day</div>
                            ) : (
                                activeReport.issues.map(issue => {
                                    const category = ISSUE_CATEGORIES.find(c => c.id === issue.category);
                                    return (
                                        <div key={issue.id} className="issue-item">
                                            <div className="issue-header">
                                                <span className="issue-category">{category?.icon} {category?.label}</span>
                                                <span className="issue-module">{issue.serialNumber}</span>
                                            </div>
                                            <p className="issue-description">{issue.description}</p>
                                            {issue.photos?.length > 0 && (
                                                <div className="issue-photos">
                                                    {issue.photos.length} photo(s) attached
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* General Notes Section */}
                    <div className="report-section notes-section">
                        <div className="section-title">
                            <h3><span className="icon-other" style={{ width: '18px', height: '18px', display: 'inline-block', marginRight: '8px' }}></span>General Notes</h3>
                        </div>
                        <textarea 
                            value={activeReport?.generalNotes || ''}
                            onChange={(e) => handleNotesUpdate(e.target.value)}
                            placeholder="Enter any additional notes for the day..."
                            rows={4}
                            className="notes-textarea"
                        />
                    </div>

                    {/* Actions */}
                    <div className="report-actions">
                        <button onClick={handleGenerateReport} className="btn-primary btn-large">
                            <span className="icon-report" style={{ width: '16px', height: '16px', display: 'inline-block', marginRight: '6px', filter: 'brightness(0) invert(1)' }}></span>Generate Report
                        </button>
                        <button onClick={() => setShowPreview(true)} className="btn-secondary">
                            Preview
                        </button>
                    </div>
                </div>
            )}

            {/* Report Preview Modal */}
            {showPreview && activeReport && (
                <ReportPreviewModal 
                    report={activeReport}
                    project={selectedProject}
                    onClose={() => setShowPreview(false)}
                    onExportPDF={() => {
                        // TODO: Implement PDF export
                        alert('PDF export coming soon!');
                    }}
                    onSend={() => {
                        // TODO: Implement send functionality
                        alert('Send functionality coming soon!');
                    }}
                />
            )}
        </div>
    );
}

// ============================================================================
// REPORT PREVIEW MODAL
// ============================================================================

function ReportPreviewModal({ report, project, onClose, onExportPDF, onSend }) {
    const formatDate = (dateStr) => {
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content report-preview-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Report Preview</h2>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>

                <div className="modal-body report-preview">
                    {/* Report Header */}
                    <div className="preview-header">
                        <div className="preview-title">DAILY SITE REPORT</div>
                        <div className="preview-meta">
                            <div className="meta-row">
                                <span className="meta-label">Job Site:</span>
                                <span className="meta-value">{project?.name}</span>
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">Date:</span>
                                <span className="meta-value">{formatDate(report.date)}</span>
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">Autovol Rep:</span>
                                <span className="meta-value">{report.autovolRep || 'N/A'}</span>
                            </div>
                            <div className="meta-row">
                                <span className="meta-label">General Contractor:</span>
                                <span className="meta-value">{report.generalContractor || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Weather */}
                    <div className="preview-section">
                        <div className="preview-section-title">Weather</div>
                        <div className="preview-weather">
                            <span>Temp: {report.weather?.tempAM || '--'}°F (AM) / {report.weather?.tempPM || '--'}°F (PM)</span>
                            <span>Precipitation: {report.weather?.precipitation || 'none'}</span>
                            <span>Wind: {report.weather?.wind || 'Light'}</span>
                            {report.weather?.isWeatherDay && <span className="weather-day-badge">Weather Day</span>}
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="preview-section">
                        <div className="preview-section-title">Progress</div>
                        <div className="preview-progress">
                            <div className="progress-item">
                                <span className="progress-label">Units Set Today:</span>
                                <span className="progress-value">{report.progress?.unitsSetToday || 0}</span>
                            </div>
                            <div className="progress-item">
                                <span className="progress-label">Units Set Total:</span>
                                <span className="progress-value">{report.progress?.unitsSetTotal || 0}</span>
                            </div>
                            <div className="progress-item">
                                <span className="progress-label">Units Remaining:</span>
                                <span className="progress-value">{report.progress?.unitsRemaining || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Global Items */}
                    {report.globalItems?.length > 0 && (
                        <div className="preview-section">
                            <div className="preview-section-title">Global Items</div>
                            <ul className="preview-list">
                                {report.globalItems.map(item => {
                                    const priority = GLOBAL_ITEM_PRIORITIES.find(p => p.id === item.priority);
                                    return (
                                        <li key={item.id}>
                                            <span className="item-priority">{priority?.icon}</span>
                                            {item.text}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    {/* Issues */}
                    {report.issues?.length > 0 && (
                        <div className="preview-section">
                            <div className="preview-section-title">Issues ({report.issues.length})</div>
                            {report.issues.map(issue => {
                                const category = ISSUE_CATEGORIES.find(c => c.id === issue.category);
                                return (
                                    <div key={issue.id} className="preview-issue">
                                        <div className="issue-line">
                                            <strong>{issue.serialNumber}</strong> - {category?.label}
                                        </div>
                                        <p>{issue.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* General Notes */}
                    {report.generalNotes && (
                        <div className="preview-section">
                            <div className="preview-section-title">Notes</div>
                            <p className="preview-notes">{report.generalNotes}</p>
                        </div>
                    )}

                    {/* Generated timestamp */}
                    <div className="preview-footer">
                        Report generated: {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : 'Draft'}
                    </div>
                </div>

                <div className="modal-actions">
                    <button onClick={onClose} className="btn-secondary">Close</button>
                    <button onClick={onExportPDF} className="btn-primary"><span className="icon-export" style={{ width: '14px', height: '14px', display: 'inline-block', marginRight: '6px', filter: 'brightness(0) invert(1)' }}></span>Export PDF</button>
                    <button onClick={onSend} className="btn-success"><span className="icon-export" style={{ width: '14px', height: '14px', display: 'inline-block', marginRight: '6px', filter: 'brightness(0) invert(1)' }}></span>Send Report</button>
                </div>
            </div>
        </div>
    );
}

// Export for use
window.OnSiteTab = OnSiteTab;
window.useSetSchedule = useSetSchedule;
window.useSetIssues = useSetIssues;
window.useDailySiteReports = useDailySiteReports;
