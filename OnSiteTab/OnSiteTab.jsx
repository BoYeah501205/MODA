// On-Site Tab - Main Container
// Standalone prototype for field operations management

const { useState, useEffect, useMemo, useRef } = React;

// ============================================================================
// DATA HOOKS
// ============================================================================

// Hook for managing set schedules
function useSetSchedule() {
    const [schedules, setSchedules] = useState(() => {
        const saved = localStorage.getItem('autovol_set_schedules');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('autovol_set_schedules', JSON.stringify(schedules));
    }, [schedules]);

    const addSchedule = (scheduleData) => {
        const newSchedule = {
            id: `SET-${Date.now()}`,
            ...scheduleData,
            status: 'Scheduled',
            modules: scheduleData.modules.map(m => ({
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
        return newSchedule;
    };

    const updateSchedule = (id, updates) => {
        setSchedules(prev => prev.map(s => 
            s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
        ));
    };

    const deleteSchedule = (id) => {
        setSchedules(prev => prev.filter(s => s.id !== id));
    };

    const startSet = (id) => {
        updateSchedule(id, { 
            status: 'In Progress', 
            actualStartTime: new Date().toISOString() 
        });
    };

    const completeSet = (id) => {
        updateSchedule(id, { 
            status: 'Complete', 
            actualEndTime: new Date().toISOString() 
        });
    };

    const updateModuleStatus = (scheduleId, moduleId, status, userData) => {
        setSchedules(prev => prev.map(s => {
            if (s.id !== scheduleId) return s;
            return {
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
        }));
    };

    const addModulePhoto = (scheduleId, moduleId, photoData) => {
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
    };

    const getScheduleById = (id) => schedules.find(s => s.id === id);
    
    const getTodaysSets = () => {
        const today = new Date().toISOString().split('T')[0];
        return schedules.filter(s => s.scheduledDate === today);
    };

    const getUpcomingSets = (days = 7) => {
        const today = new Date();
        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + days);
        
        return schedules.filter(s => {
            const setDate = new Date(s.scheduledDate);
            return setDate >= today && setDate <= futureDate && s.status !== 'Complete';
        }).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    };

    const getActiveSets = () => schedules.filter(s => s.status === 'In Progress');

    return {
        schedules,
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
        const saved = localStorage.getItem('autovol_set_issues');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('autovol_set_issues', JSON.stringify(issues));
    }, [issues]);

    const addIssue = (issueData) => {
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
        return newIssue;
    };

    const updateIssue = (id, updates) => {
        setIssues(prev => prev.map(i => 
            i.id === id ? { ...i, ...updates } : i
        ));
    };

    const resolveIssue = (id, resolution, resolvedBy) => {
        updateIssue(id, {
            status: 'Resolved',
            resolution,
            resolvedBy,
            resolvedAt: new Date().toISOString()
        });
    };

    const getIssuesBySet = (setId) => issues.filter(i => i.setId === setId);
    const getIssuesByModule = (moduleId) => issues.filter(i => i.moduleId === moduleId);
    const getOpenIssues = () => issues.filter(i => i.status === 'Open');

    return {
        issues,
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
        const saved = localStorage.getItem('autovol_daily_site_reports');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('autovol_daily_site_reports', JSON.stringify(reports));
    }, [reports]);

    // Create a new daily report (or get existing for date)
    const createOrGetReport = (projectId, date) => {
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
        return newReport;
    };

    const updateReport = (id, updates) => {
        setReports(prev => prev.map(r => 
            r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
        ));
    };

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
    
    // Use Supabase hooks if available, otherwise fall back to localStorage hooks
    const useSupabase = typeof window.useSupabaseOnSite === 'function' && window.MODA_ONSITE;
    
    // localStorage-based hooks (fallback)
    const scheduleHook = useSetSchedule();
    const localIssueHook = useSetIssues();
    const localReportHook = useDailySiteReports();
    
    // Supabase-based hooks (primary when available)
    const supabaseHook = useSupabase ? window.useSupabaseOnSite() : null;
    
    // Unified interface - prefer Supabase when available
    const issueHook = useSupabase ? {
        issues: supabaseHook.issues,
        addIssue: supabaseHook.createIssue,
        updateIssue: supabaseHook.updateIssue,
        resolveIssue: supabaseHook.resolveIssue,
        getIssuesBySet: (setId) => supabaseHook.issues.filter(i => i.set_id === setId),
        getIssuesByModule: supabaseHook.getIssuesByModule,
        getOpenIssues: supabaseHook.getOpenIssues
    } : localIssueHook;
    
    const reportHook = useSupabase ? {
        reports: supabaseHook.reports,
        createOrGetReport: supabaseHook.createOrGetReport,
        updateReport: supabaseHook.updateReport,
        getReportByDate: supabaseHook.getReportByDate,
        getReportsForProject: supabaseHook.getReportsForProject,
        getRecentReports: () => supabaseHook.reports.slice(0, 10),
        addGlobalItem: async (reportId, item) => {
            return supabaseHook.createGlobalIssue({
                report_id: reportId,
                issue_type: 'other',
                priority: item.priority || 'fyi',
                description: item.text
            });
        },
        addIssueToReport: async (reportId, issueData) => {
            return supabaseHook.createIssue({
                report_id: reportId,
                ...issueData
            });
        }
    } : localReportHook;
    
    // Modal states
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [showNewIssueLogger, setShowNewIssueLogger] = useState(false);
    const [issueContext, setIssueContext] = useState(null);
    const [selectedSet, setSelectedSet] = useState(null);
    const [selectedModule, setSelectedModule] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [activeReportId, setActiveReportId] = useState(null);

    // Set active report in Supabase hook when it changes
    useEffect(() => {
        if (supabaseHook && activeReportId) {
            supabaseHook.setActiveReport(activeReportId);
        }
    }, [activeReportId, supabaseHook]);

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

    const handleIssueSubmit = async (issueData) => {
        if (useSupabase) {
            await supabaseHook.createIssue(issueData);
        } else {
            localIssueHook.addIssue(issueData);
        }
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
                        projects={projects}
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

function OnSiteDashboard({ 
    scheduleHook, 
    issueHook, 
    onStartSet, 
    onViewSet, 
    onLogIssue,
    selectedSet,
    setSelectedSet,
    onScheduleNew,
    projects = []
}) {
    // Categorize sets by status
    const activeSets = scheduleHook.schedules.filter(s => s.status === 'In Progress');
    const scheduledSets = scheduleHook.schedules.filter(s => s.status === 'Scheduled');
    const completedSets = scheduleHook.schedules.filter(s => s.status === 'Complete');
    const openIssues = issueHook.getOpenIssues();

    // Group sets by project for display
    const groupByProject = (sets) => {
        const grouped = {};
        sets.forEach(set => {
            const projectName = set.projectName || 'Unknown Project';
            if (!grouped[projectName]) {
                grouped[projectName] = [];
            }
            grouped[projectName].push(set);
        });
        return grouped;
    };

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
    const formatSetDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T12:00:00');
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="dashboard-container sets-dashboard">
            {/* Summary Stats Bar */}
            <div className="sets-summary-bar">
                <div className="summary-stat active">
                    <span className="summary-count">{activeSets.length}</span>
                    <span className="summary-label">Active</span>
                </div>
                <div className="summary-stat scheduled">
                    <span className="summary-count">{scheduledSets.length}</span>
                    <span className="summary-label">Scheduled</span>
                </div>
                <div className="summary-stat completed">
                    <span className="summary-count">{completedSets.length}</span>
                    <span className="summary-label">Completed</span>
                </div>
                {openIssues.length > 0 && (
                    <div className="summary-stat issues">
                        <span className="summary-count">{openIssues.length}</span>
                        <span className="summary-label">Open Issues</span>
                    </div>
                )}
            </div>

            {/* Active Sets Section */}
            <div className="dashboard-section active-sets-section">
                <div className="section-header">
                    <h2>
                        <span className="section-indicator active"></span>
                        Active Sets
                    </h2>
                    <span className="section-count">{activeSets.length}</span>
                </div>
                
                {activeSets.length === 0 ? (
                    <div className="empty-state-inline">
                        <span className="icon-box" style={{ width: '20px', height: '20px', display: 'inline-block', marginRight: '8px', opacity: 0.5 }}></span>
                        No sets currently in progress
                    </div>
                ) : (
                    <div className="set-cards-grid">
                        {activeSets.map(set => (
                            <SetCard
                                key={set.id}
                                set={set}
                                issueCount={issueHook.getIssuesBySet(set.id).filter(i => i.status === 'Open').length}
                                onView={() => onViewSet(set)}
                                isActive
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Scheduled Sets Section */}
            <div className="dashboard-section scheduled-sets-section">
                <div className="section-header">
                    <h2>
                        <span className="section-indicator scheduled"></span>
                        Scheduled Sets
                    </h2>
                    <div className="section-actions">
                        <span className="section-count">{scheduledSets.length}</span>
                        <button onClick={onScheduleNew} className="btn-add-small">
                            + Schedule Set
                        </button>
                    </div>
                </div>
                
                {scheduledSets.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon"><span className="icon-calendar" style={{ width: '48px', height: '48px', display: 'block' }}></span></div>
                        <p>No sets scheduled</p>
                        <p className="empty-hint">Schedule sets from your Projects directory</p>
                        <button onClick={onScheduleNew} className="btn-primary">
                            Schedule a Set
                        </button>
                    </div>
                ) : (
                    <div className="scheduled-sets-list">
                        {Object.entries(groupByProject(scheduledSets)).map(([projectName, sets]) => (
                            <div key={projectName} className="project-sets-group">
                                <div className="project-group-header">
                                    <span className="icon-project" style={{ width: '16px', height: '16px', display: 'inline-block', marginRight: '6px' }}></span>
                                    {projectName}
                                    <span className="project-set-count">{sets.length} set{sets.length !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="set-cards-grid compact">
                                    {sets.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)).map(set => (
                                        <div key={set.id} className="scheduled-set-card" onClick={() => onViewSet(set)}>
                                            <div className="set-date-badge">
                                                <span className="date-day">{new Date(set.scheduledDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                                <span className="date-num">{new Date(set.scheduledDate + 'T12:00:00').getDate()}</span>
                                            </div>
                                            <div className="set-info">
                                                <div className="set-modules">{set.modules.length} modules</div>
                                                <div className="set-time">{set.scheduledTime}</div>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onStartSet(set); }}
                                                className="btn-start-small"
                                            >
                                                Start
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Completed Sets Section */}
            <div className="dashboard-section completed-sets-section">
                <div className="section-header">
                    <h2>
                        <span className="section-indicator completed"></span>
                        Completed Sets
                    </h2>
                    <span className="section-count">{completedSets.length}</span>
                </div>
                
                {completedSets.length === 0 ? (
                    <div className="empty-state-inline">
                        <span className="icon-check" style={{ width: '20px', height: '20px', display: 'inline-block', marginRight: '8px', opacity: 0.5 }}></span>
                        No completed sets yet
                    </div>
                ) : (
                    <div className="completed-sets-list">
                        {completedSets.slice(0, 10).map(set => {
                            const modulesSet = set.modules.filter(m => m.setStatus === 'Set').length;
                            return (
                                <div key={set.id} className="completed-set-item" onClick={() => onViewSet(set)}>
                                    <div className="completed-check">
                                        <span className="icon-check" style={{ width: '16px', height: '16px', display: 'block' }}></span>
                                    </div>
                                    <div className="completed-info">
                                        <div className="completed-project">{set.projectName}</div>
                                        <div className="completed-details">
                                            {modulesSet} modules set • {formatSetDate(set.scheduledDate)}
                                        </div>
                                    </div>
                                    <div className="completed-time">
                                        {set.actualEndTime ? new Date(set.actualEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </div>
                                </div>
                            );
                        })}
                        {completedSets.length > 10 && (
                            <div className="show-more-link">
                                View all {completedSets.length} completed sets
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Open Issues Summary */}
            {openIssues.length > 0 && (
                <div className="dashboard-section issues-section">
                    <div className="section-header">
                        <h2><span className="icon-alert" style={{ width: '20px', height: '20px', display: 'inline-block', marginRight: '8px' }}></span>Open Issues</h2>
                        <span className="section-count warning">{openIssues.length}</span>
                    </div>
                    <div className="issues-list">
                        {openIssues.slice(0, 5).map(issue => (
                            <div key={issue.id} className="issue-item">
                                <div className={`issue-severity ${issue.severity}`}></div>
                                <div className="issue-info">
                                    <div className="issue-title">{issue.issueType}</div>
                                    <div className="issue-details">
                                        Module {issue.serialNumber} • {issue.trade}
                                    </div>
                                </div>
                                <div className="issue-time">
                                    {new Date(issue.reportedAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// SITE REPORTS PLACEHOLDER
// ============================================================================

function SiteReportsPlaceholder() {
    return (
        <div className="site-reports-placeholder">
            <div className="placeholder-content">
                <div className="placeholder-icon">
                    <span className="icon-report" style={{ width: '64px', height: '64px', display: 'block', opacity: 0.4 }}></span>
                </div>
                <h2>Site Reports</h2>
                <p className="placeholder-description">
                    Site Reports are currently being developed offline and will be integrated once the MVP is complete.
                </p>
                <div className="placeholder-features">
                    <h3>Coming Soon:</h3>
                    <ul>
                        <li>Daily Site Reports with weather tracking</li>
                        <li>Module set documentation with photos</li>
                        <li>Issue logging and resolution tracking</li>
                        <li>PDF export and email distribution</li>
                        <li>Historical report archive</li>
                    </ul>
                </div>
                <div className="placeholder-note">
                    <span className="icon-info" style={{ width: '16px', height: '16px', display: 'inline-block', marginRight: '8px' }}></span>
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
// DAILY REPORT TAB - Redesigned Mobile-First Workflow
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
    
    // Module selection state
    const [selectedModules, setSelectedModules] = useState([]);
    const [moduleSearch, setModuleSearch] = useState('');
    
    // Weather state
    const [weatherData, setWeatherData] = useState(null);
    const [weatherSource, setWeatherSource] = useState('auto'); // 'auto' or 'manual'
    const [isFetchingWeather, setIsFetchingWeather] = useState(false);
    const [manualWeather, setManualWeather] = useState({
        tempHigh: '',
        tempLow: '',
        conditions: '',
        wind: 'Light',
        precipitation: 'none'
    });
    
    // Saving state
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [lastSaved, setLastSaved] = useState(null);

    // Get active projects (those with on-site activity)
    const activeProjects = projects.filter(p => p.status === 'Active');
    
    // Get modules for selected project
    const projectModules = useMemo(() => {
        if (!selectedProject) return [];
        return selectedProject.modules || [];
    }, [selectedProject]);
    
    // Filter modules by search
    const filteredModules = useMemo(() => {
        if (!moduleSearch.trim()) return projectModules;
        const search = moduleSearch.toLowerCase();
        return projectModules.filter(m => {
            const serial = (m.serialNumber || m.serial_number || '').toLowerCase();
            const blm = (m.hitchBLM || m.blm_id || '').toLowerCase();
            const unit = (m.hitchUnit || m.unit_type || '').toLowerCase();
            return serial.includes(search) || blm.includes(search) || unit.includes(search);
        });
    }, [projectModules, moduleSearch]);

    // Load or create report when project/date changes
    useEffect(() => {
        if (selectedProject && reportDate) {
            const report = reportHook.createOrGetReport(selectedProject.id, reportDate);
            setActiveReport(report);
            
            // Load previously selected modules if editing existing report
            if (report?.modulesSetToday?.length > 0) {
                setSelectedModules(report.modulesSetToday.map(m => m.moduleId));
            } else {
                setSelectedModules([]);
            }
            
            // Load weather if exists
            if (report?.weather) {
                if (report.weather.source === 'api') {
                    setWeatherData(report.weather);
                    setWeatherSource('auto');
                } else {
                    setManualWeather({
                        tempHigh: report.weather.tempHigh || report.weather.tempPM || '',
                        tempLow: report.weather.tempLow || report.weather.tempAM || '',
                        conditions: report.weather.conditions || '',
                        wind: report.weather.wind || 'Light',
                        precipitation: report.weather.precipitation || 'none'
                    });
                    setWeatherSource('manual');
                }
            }
        }
    }, [selectedProject, reportDate]);
    
    // Auto-fetch weather when project/date selected
    useEffect(() => {
        if (selectedProject && reportDate && !weatherData && weatherSource === 'auto') {
            fetchWeather();
        }
    }, [selectedProject, reportDate]);

    // Fetch weather from API
    const fetchWeather = async () => {
        if (!selectedProject) return;
        
        setIsFetchingWeather(true);
        try {
            // Use Open-Meteo API (free, no key required)
            // Default to Phoenix, AZ coordinates if project doesn't have location
            const lat = selectedProject.latitude || 33.4484;
            const lon = selectedProject.longitude || -112.0740;
            
            // Fetch historical weather for the report date
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code&timezone=America/Phoenix&start_date=${reportDate}&end_date=${reportDate}`
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.daily) {
                    const weather = {
                        tempHigh: Math.round(data.daily.temperature_2m_max?.[0] * 9/5 + 32) || '--', // Convert C to F
                        tempLow: Math.round(data.daily.temperature_2m_min?.[0] * 9/5 + 32) || '--',
                        precipitation: data.daily.precipitation_sum?.[0] > 0 ? `${data.daily.precipitation_sum[0]}mm` : 'none',
                        wind: getWindLevel(data.daily.wind_speed_10m_max?.[0]),
                        conditions: getWeatherCondition(data.daily.weather_code?.[0]),
                        source: 'api'
                    };
                    setWeatherData(weather);
                    setWeatherSource('auto');
                }
            } else {
                console.warn('Weather API returned non-OK status');
                setWeatherSource('manual');
            }
        } catch (err) {
            console.error('Error fetching weather:', err);
            setWeatherSource('manual');
        } finally {
            setIsFetchingWeather(false);
        }
    };
    
    // Convert wind speed to level
    const getWindLevel = (speedKmh) => {
        if (!speedKmh) return 'Light';
        const speedMph = speedKmh * 0.621371;
        if (speedMph < 10) return 'Light';
        if (speedMph < 20) return 'Moderate';
        if (speedMph < 30) return 'High';
        return 'Other';
    };
    
    // Convert weather code to condition string
    const getWeatherCondition = (code) => {
        if (!code) return 'Unknown';
        if (code === 0) return 'Clear';
        if (code <= 3) return 'Partly Cloudy';
        if (code <= 49) return 'Cloudy';
        if (code <= 69) return 'Rain';
        if (code <= 79) return 'Snow';
        if (code <= 99) return 'Thunderstorm';
        return 'Unknown';
    };

    // Toggle module selection
    const toggleModule = (moduleId) => {
        setSelectedModules(prev => {
            if (prev.includes(moduleId)) {
                return prev.filter(id => id !== moduleId);
            } else {
                return [...prev, moduleId];
            }
        });
    };
    
    // Select all visible modules
    const selectAllModules = () => {
        const visibleIds = filteredModules.map(m => m.id);
        setSelectedModules(prev => {
            const newSelection = [...prev];
            visibleIds.forEach(id => {
                if (!newSelection.includes(id)) {
                    newSelection.push(id);
                }
            });
            return newSelection;
        });
    };
    
    // Clear all selections
    const clearAllModules = () => {
        setSelectedModules([]);
    };

    // Calculate progress
    const progress = useMemo(() => {
        const totalModules = projectModules.length;
        const setToday = selectedModules.length;
        // Count sawboxes for unit calculation
        const sawboxCount = projectModules.filter(m => 
            m.difficulty?.includes('Sawbox') || m.isSawbox
        ).length;
        const totalUnits = totalModules + sawboxCount;
        const setTotal = activeReport?.progress?.unitsSetTotal || 0;
        
        return {
            today: setToday,
            total: setTotal,
            remaining: totalUnits - setTotal
        };
    }, [projectModules, selectedModules, activeReport]);

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
        setActiveReport(reportHook.getReportByDate(selectedProject.id, reportDate));
    };

    // Handle general notes update
    const handleNotesUpdate = (notes) => {
        if (!activeReport) return;
        reportHook.updateReport(activeReport.id, { generalNotes: notes });
        setActiveReport(prev => ({ ...prev, generalNotes: notes }));
    };
    
    // Save report to database
    const handleSaveReport = async () => {
        if (!activeReport || !selectedProject) return;
        
        setIsSaving(true);
        setSaveError(null);
        
        try {
            // Get weather data to save
            const weatherToSave = weatherSource === 'auto' ? {
                ...weatherData,
                source: 'api'
            } : {
                tempHigh: manualWeather.tempHigh,
                tempLow: manualWeather.tempLow,
                tempAM: manualWeather.tempLow, // For backward compatibility
                tempPM: manualWeather.tempHigh,
                conditions: manualWeather.conditions,
                wind: manualWeather.wind,
                precipitation: manualWeather.precipitation,
                source: 'manual'
            };
            
            // Build modules set today data
            const modulesSetToday = selectedModules.map((moduleId, index) => {
                const module = projectModules.find(m => m.id === moduleId);
                return {
                    moduleId,
                    serialNumber: module?.serialNumber || module?.serial_number || '',
                    hitchBLM: module?.hitchBLM || module?.blm_id || '',
                    hitchUnit: module?.hitchUnit || module?.unit_type || '',
                    setSequence: index + 1,
                    setTime: new Date().toISOString()
                };
            });
            
            // Update report
            reportHook.updateReport(activeReport.id, {
                weather: weatherToSave,
                modulesSetToday,
                progress: {
                    ...activeReport.progress,
                    unitsSetToday: selectedModules.length
                },
                status: 'draft',
                updatedAt: new Date().toISOString()
            });
            
            // Also save to Supabase if available
            if (window.MODA_DAILY_REPORTS) {
                try {
                    // Check if report exists in Supabase
                    const existingReport = await window.MODA_DAILY_REPORTS.getReportByDate(
                        selectedProject.id,
                        reportDate
                    );
                    
                    if (existingReport) {
                        await window.MODA_DAILY_REPORTS.updateReport(existingReport.id, {
                            weather_source: weatherSource === 'auto' ? 'api' : 'manual',
                            weather_conditions: weatherToSave,
                            general_notes: activeReport.generalNotes
                        });
                        
                        // Update modules
                        for (const moduleData of modulesSetToday) {
                            await window.MODA_DAILY_REPORTS.addModuleToReport(existingReport.id, moduleData.moduleId, {
                                setStatus: 'set',
                                setSequence: moduleData.setSequence,
                                setTime: moduleData.setTime
                            });
                        }
                    } else {
                        // Create new report in Supabase
                        const newReport = await window.MODA_DAILY_REPORTS.createReport(
                            selectedProject.id,
                            reportDate,
                            {
                                weatherSource: weatherSource === 'auto' ? 'api' : 'manual',
                                weatherConditions: weatherToSave,
                                generalNotes: activeReport.generalNotes
                            }
                        );
                        
                        // Add modules
                        for (const moduleData of modulesSetToday) {
                            await window.MODA_DAILY_REPORTS.addModuleToReport(newReport.id, moduleData.moduleId, {
                                setStatus: 'set',
                                setSequence: moduleData.setSequence,
                                setTime: moduleData.setTime
                            });
                        }
                    }
                } catch (supabaseErr) {
                    console.warn('Supabase save failed, data saved locally:', supabaseErr);
                }
            }
            
            setLastSaved(new Date());
            setActiveReport(reportHook.getReportByDate(selectedProject.id, reportDate));
        } catch (err) {
            console.error('Error saving report:', err);
            setSaveError(err.message || 'Failed to save report');
        } finally {
            setIsSaving(false);
        }
    };

    // Generate and preview report
    const handleGenerateReport = () => {
        if (!activeReport) return;
        handleSaveReport().then(() => {
            reportHook.generateReport(activeReport.id);
            setShowPreview(true);
        });
    };
    
    // Export to PDF
    const handleExportPDF = async () => {
        if (!activeReport || !selectedProject) return;
        
        // Use the report-export.js if available
        if (window.MODA_REPORT_EXPORT) {
            try {
                const reportData = {
                    ...activeReport,
                    project: selectedProject,
                    modulesSetToday: selectedModules.map(id => {
                        const m = projectModules.find(mod => mod.id === id);
                        return {
                            moduleId: id,
                            serialNumber: m?.serialNumber || m?.serial_number,
                            hitchBLM: m?.hitchBLM || m?.blm_id,
                            hitchUnit: m?.hitchUnit || m?.unit_type
                        };
                    }),
                    weather: weatherSource === 'auto' ? weatherData : manualWeather
                };
                await window.MODA_REPORT_EXPORT.generatePDF(reportData);
            } catch (err) {
                console.error('PDF export error:', err);
                alert('PDF export failed: ' + err.message);
            }
        } else {
            alert('PDF export module not loaded. Please refresh and try again.');
        }
    };

    // Get current weather display
    const getCurrentWeather = () => {
        if (weatherSource === 'auto' && weatherData) {
            return weatherData;
        }
        return manualWeather;
    };

    return (
        <div className="daily-report-container">
            {/* Project & Date Selection - Compact Header */}
            <div className="report-header-controls">
                <div className="control-group">
                    <label>Project</label>
                    <select 
                        value={selectedProject?.id || ''} 
                        onChange={(e) => {
                            const proj = projects.find(p => p.id === e.target.value);
                            setSelectedProject(proj);
                            setSelectedModules([]);
                            setWeatherData(null);
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
                        onChange={(e) => {
                            setReportDate(e.target.value);
                            setWeatherData(null);
                        }}
                        className="date-input"
                        max={new Date().toISOString().split('T')[0]}
                    />
                </div>
                {lastSaved && (
                    <div className="save-status">
                        <span className="status-badge saved">Saved {lastSaved.toLocaleTimeString()}</span>
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
                    {/* Report Header */}
                    <div className="report-section header-section">
                        <div className="section-title">
                            <h3><span className="icon-report" style={{ width: '18px', height: '18px', display: 'inline-block', marginRight: '8px' }}></span>Daily Set Report</h3>
                            <span className="report-date">{formatDate(reportDate)}</span>
                        </div>
                        <div className="project-name-display">{selectedProject.name}</div>
                    </div>

                    {/* Weather Section - Auto-fetch with Manual Override */}
                    <div className="report-section weather-section">
                        <div className="section-title">
                            <h3><span className="icon-weather" style={{ width: '18px', height: '18px', display: 'inline-block', marginRight: '8px' }}></span>Weather</h3>
                            <div className="weather-source-toggle">
                                <button 
                                    type="button"
                                    className={`toggle-btn ${weatherSource === 'auto' ? 'active' : ''}`}
                                    onClick={() => {
                                        setWeatherSource('auto');
                                        if (!weatherData) fetchWeather();
                                    }}
                                >
                                    Auto
                                </button>
                                <button 
                                    type="button"
                                    className={`toggle-btn ${weatherSource === 'manual' ? 'active' : ''}`}
                                    onClick={() => setWeatherSource('manual')}
                                >
                                    Manual
                                </button>
                            </div>
                        </div>
                        
                        {weatherSource === 'auto' ? (
                            <div className="weather-auto-display">
                                {isFetchingWeather ? (
                                    <div className="weather-loading">
                                        <span className="spinner-small"></span> Fetching weather...
                                    </div>
                                ) : weatherData ? (
                                    <div className="weather-data-grid">
                                        <div className="weather-item">
                                            <span className="weather-label">High</span>
                                            <span className="weather-value">{weatherData.tempHigh}°F</span>
                                        </div>
                                        <div className="weather-item">
                                            <span className="weather-label">Low</span>
                                            <span className="weather-value">{weatherData.tempLow}°F</span>
                                        </div>
                                        <div className="weather-item">
                                            <span className="weather-label">Conditions</span>
                                            <span className="weather-value">{weatherData.conditions}</span>
                                        </div>
                                        <div className="weather-item">
                                            <span className="weather-label">Wind</span>
                                            <span className="weather-value">{weatherData.wind}</span>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={fetchWeather} 
                                            className="btn-link refresh-btn"
                                        >
                                            Refresh
                                        </button>
                                    </div>
                                ) : (
                                    <div className="weather-error">
                                        <p>Could not fetch weather data.</p>
                                        <button 
                                            type="button" 
                                            onClick={() => setWeatherSource('manual')} 
                                            className="btn-link"
                                        >
                                            Enter manually
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="weather-manual-form">
                                <div className="weather-grid">
                                    <div className="weather-field">
                                        <label>High Temp</label>
                                        <div className="temp-input">
                                            <input 
                                                type="number" 
                                                value={manualWeather.tempHigh}
                                                onChange={(e) => setManualWeather(prev => ({ ...prev, tempHigh: e.target.value }))}
                                                placeholder="--"
                                            />
                                            <span>°F</span>
                                        </div>
                                    </div>
                                    <div className="weather-field">
                                        <label>Low Temp</label>
                                        <div className="temp-input">
                                            <input 
                                                type="number" 
                                                value={manualWeather.tempLow}
                                                onChange={(e) => setManualWeather(prev => ({ ...prev, tempLow: e.target.value }))}
                                                placeholder="--"
                                            />
                                            <span>°F</span>
                                        </div>
                                    </div>
                                    <div className="weather-field">
                                        <label>Conditions</label>
                                        <select 
                                            value={manualWeather.conditions}
                                            onChange={(e) => setManualWeather(prev => ({ ...prev, conditions: e.target.value }))}
                                        >
                                            <option value="">Select...</option>
                                            <option value="Clear">Clear</option>
                                            <option value="Partly Cloudy">Partly Cloudy</option>
                                            <option value="Cloudy">Cloudy</option>
                                            <option value="Rain">Rain</option>
                                            <option value="Windy">Windy</option>
                                            <option value="Hot">Hot</option>
                                        </select>
                                    </div>
                                    <div className="weather-field">
                                        <label>Wind</label>
                                        <select 
                                            value={manualWeather.wind}
                                            onChange={(e) => setManualWeather(prev => ({ ...prev, wind: e.target.value }))}
                                        >
                                            {WIND_LEVELS.map(level => (
                                                <option key={level} value={level}>{level}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Module Selection - Mobile-Friendly Grid */}
                    <div className="report-section modules-section">
                        <div className="section-title">
                            <h3><span className="icon-box" style={{ width: '18px', height: '18px', display: 'inline-block', marginRight: '8px' }}></span>Modules Set Today</h3>
                            <span className="module-count">{selectedModules.length} of {projectModules.length}</span>
                        </div>
                        
                        {/* Search and bulk actions */}
                        <div className="module-controls">
                            <input 
                                type="text"
                                value={moduleSearch}
                                onChange={(e) => setModuleSearch(e.target.value)}
                                placeholder="Search modules..."
                                className="module-search-input"
                            />
                            <div className="bulk-actions">
                                <button 
                                    type="button" 
                                    onClick={selectAllModules}
                                    className="btn-link"
                                >
                                    Select All
                                </button>
                                <button 
                                    type="button" 
                                    onClick={clearAllModules}
                                    className="btn-link"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                        
                        {/* Module Grid - Tap to Select */}
                        <div className="module-grid">
                            {filteredModules.length === 0 ? (
                                <div className="empty-modules">
                                    {moduleSearch ? 'No modules match your search' : 'No modules in this project'}
                                </div>
                            ) : (
                                filteredModules.map(module => {
                                    const isSelected = selectedModules.includes(module.id);
                                    const serial = module.serialNumber || module.serial_number || 'N/A';
                                    const blm = module.hitchBLM || module.blm_id || '';
                                    const unit = module.hitchUnit || module.unit_type || '';
                                    
                                    return (
                                        <button
                                            key={module.id}
                                            type="button"
                                            className={`module-card ${isSelected ? 'selected' : ''}`}
                                            onClick={() => toggleModule(module.id)}
                                        >
                                            <div className="module-card-check">
                                                {isSelected && <span className="check-icon">&#10003;</span>}
                                            </div>
                                            <div className="module-card-info">
                                                <div className="module-blm">{blm || unit || 'Module'}</div>
                                                <div className="module-serial">{serial}</div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Progress Summary */}
                    <div className="report-section progress-section">
                        <div className="section-title">
                            <h3><span className="icon-chart" style={{ width: '18px', height: '18px', display: 'inline-block', marginRight: '8px' }}></span>Progress</h3>
                        </div>
                        <div className="progress-grid">
                            <div className="progress-stat">
                                <div className="stat-value">{progress.today}</div>
                                <div className="stat-label">Set Today</div>
                            </div>
                            <div className="progress-stat">
                                <div className="stat-value">{progress.total}</div>
                                <div className="stat-label">Total Set</div>
                            </div>
                            <div className="progress-stat">
                                <div className="stat-value">{progress.remaining}</div>
                                <div className="stat-label">Remaining</div>
                            </div>
                        </div>
                    </div>

                    {/* Global Items Section */}
                    <div className="report-section global-items-section">
                        <div className="section-title">
                            <h3><span className="icon-attention" style={{ width: '18px', height: '18px', display: 'inline-block', marginRight: '8px' }}></span>Highlights / Notes</h3>
                            <button 
                                onClick={() => setShowAddGlobalItem(true)}
                                className="btn-add-small"
                            >
                                + Add
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
                                            <option key={p.id} value={p.id}>{p.label}</option>
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
                                <div className="empty-items">No highlights added</div>
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
                                            <span className={`item-icon ${priority?.iconClass || ''}`} style={{ width: '16px', height: '16px', display: 'inline-block', marginRight: '6px' }}></span>
                                            <span className="item-text">{item.text}</span>
                                            <button 
                                                onClick={() => {
                                                    reportHook.removeGlobalItem(activeReport.id, item.id);
                                                    setActiveReport(reportHook.getReportByDate(selectedProject.id, reportDate));
                                                }}
                                                className="btn-remove"
                                            >
                                                &times;
                                            </button>
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
                            rows={3}
                            className="notes-textarea"
                        />
                    </div>

                    {/* Error Display */}
                    {saveError && (
                        <div className="save-error">
                            <span className="icon-alert" style={{ width: '16px', height: '16px', display: 'inline-block', marginRight: '6px' }}></span>
                            {saveError}
                        </div>
                    )}

                    {/* Actions - Sticky Footer on Mobile */}
                    <div className="report-actions">
                        <button 
                            onClick={handleSaveReport} 
                            disabled={isSaving || selectedModules.length === 0}
                            className="btn-secondary"
                        >
                            {isSaving ? 'Saving...' : 'Save Draft'}
                        </button>
                        <button 
                            onClick={handleGenerateReport} 
                            disabled={isSaving || selectedModules.length === 0}
                            className="btn-primary btn-large"
                        >
                            <span className="icon-report" style={{ width: '16px', height: '16px', display: 'inline-block', marginRight: '6px', filter: 'brightness(0) invert(1)' }}></span>
                            Generate Report
                        </button>
                    </div>
                </div>
            )}

            {/* Report Preview Modal */}
            {showPreview && activeReport && (
                <ReportPreviewModal 
                    report={{
                        ...activeReport,
                        modulesSetToday: selectedModules.map(id => {
                            const m = projectModules.find(mod => mod.id === id);
                            return {
                                moduleId: id,
                                serialNumber: m?.serialNumber || m?.serial_number,
                                hitchBLM: m?.hitchBLM || m?.blm_id,
                                hitchUnit: m?.hitchUnit || m?.unit_type
                            };
                        }),
                        weather: getCurrentWeather(),
                        progress
                    }}
                    project={selectedProject}
                    onClose={() => setShowPreview(false)}
                    onExportPDF={handleExportPDF}
                    onSend={() => {
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
    
    // Get weather display values (handle both old and new format)
    const getWeatherTemp = () => {
        const w = report.weather;
        if (!w) return '--°F / --°F';
        // New format: tempHigh/tempLow
        if (w.tempHigh !== undefined) {
            return `${w.tempLow || '--'}°F (Low) / ${w.tempHigh || '--'}°F (High)`;
        }
        // Old format: tempAM/tempPM
        return `${w.tempAM || '--'}°F (AM) / ${w.tempPM || '--'}°F (PM)`;
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
                        <div className="preview-title">DAILY SET REPORT</div>
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
                            <span>Temp: {getWeatherTemp()}</span>
                            <span>Conditions: {report.weather?.conditions || 'N/A'}</span>
                            <span>Wind: {report.weather?.wind || 'Light'}</span>
                            <span>Precipitation: {report.weather?.precipitation || 'none'}</span>
                            {report.weather?.isWeatherDay && <span className="weather-day-badge">Weather Day</span>}
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="preview-section">
                        <div className="preview-section-title">Progress</div>
                        <div className="preview-progress">
                            <div className="progress-item">
                                <span className="progress-label">Set Today:</span>
                                <span className="progress-value">{report.progress?.today || report.progress?.unitsSetToday || 0}</span>
                            </div>
                            <div className="progress-item">
                                <span className="progress-label">Total Set:</span>
                                <span className="progress-value">{report.progress?.total || report.progress?.unitsSetTotal || 0}</span>
                            </div>
                            <div className="progress-item">
                                <span className="progress-label">Remaining:</span>
                                <span className="progress-value">{report.progress?.remaining || report.progress?.unitsRemaining || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Modules Set Today */}
                    {report.modulesSetToday?.length > 0 && (
                        <div className="preview-section">
                            <div className="preview-section-title">Modules Set Today ({report.modulesSetToday.length})</div>
                            <div className="preview-modules-list">
                                {report.modulesSetToday.map((module, idx) => (
                                    <div key={module.moduleId || idx} className="preview-module-item">
                                        <span className="module-num">{idx + 1}.</span>
                                        <span className="module-blm">{module.hitchBLM || module.hitchUnit || 'Module'}</span>
                                        <span className="module-serial">{module.serialNumber}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Global Items / Highlights */}
                    {report.globalItems?.length > 0 && (
                        <div className="preview-section">
                            <div className="preview-section-title">Highlights</div>
                            <ul className="preview-list">
                                {report.globalItems.map(item => {
                                    const priority = GLOBAL_ITEM_PRIORITIES.find(p => p.id === item.priority);
                                    return (
                                        <li key={item.id}>
                                            <span className={`item-icon ${priority?.iconClass || ''}`} style={{ width: '14px', height: '14px', display: 'inline-block', marginRight: '6px' }}></span>
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
                                            <strong>{issue.serialNumber}</strong> - {category?.label || issue.category}
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
                        Report generated: {report.generatedAt ? new Date(report.generatedAt).toLocaleString() : new Date().toLocaleString()}
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
