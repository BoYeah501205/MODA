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

// ============================================================================
// CONSTANTS
// ============================================================================

const ISSUE_TYPES = [
    { id: 'transport-damage', label: 'Damage During Transport', icon: '🚛' },
    { id: 'set-damage', label: 'Damage During Set', icon: '🏗️' },
    { id: 'factory-existing', label: 'Pre-existing (from factory)', icon: '🏭' },
    { id: 'site-condition', label: 'Site Condition Issue', icon: '📍' },
    { id: 'alignment', label: 'Alignment/Fit Issue', icon: '📐' },
    { id: 'other', label: 'Other', icon: '📋' }
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

// ============================================================================
// MAIN ON-SITE TAB COMPONENT
// ============================================================================

function OnSiteTab({ projects = [], employees = [] }) {
    const [activeSubTab, setActiveSubTab] = useState('dashboard');
    const scheduleHook = useSetSchedule();
    const issueHook = useSetIssues();
    
    // Modal states
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [issueContext, setIssueContext] = useState(null);
    const [selectedSet, setSelectedSet] = useState(null);
    const [selectedModule, setSelectedModule] = useState(null);

    const subTabs = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'schedule', label: 'Set Schedule', icon: '📅' },
        { id: 'reports', label: 'Reports', icon: '📄' }
    ];

    const openIssueLogger = (setData, moduleData) => {
        setIssueContext({ set: setData, module: moduleData });
        setShowIssueModal(true);
    };

    const handleIssueSubmit = (issueData) => {
        issueHook.addIssue(issueData);
        setShowIssueModal(false);
        setIssueContext(null);
    };

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
                        <span className="subtab-icon">{tab.icon}</span>
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

                {activeSubTab === 'reports' && (
                    <ReportsTab
                        scheduleHook={scheduleHook}
                        issueHook={issueHook}
                        projects={projects}
                    />
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

            {/* Issue Logger Modal */}
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
    onScheduleNew 
}) {
    const todaysSets = scheduleHook.getTodaysSets();
    const activeSets = scheduleHook.getActiveSets();
    const upcomingSets = scheduleHook.getUpcomingSets(7);
    const openIssues = issueHook.getOpenIssues();

    // Stats
    const thisWeekSets = scheduleHook.schedules.filter(s => {
        const setDate = new Date(s.scheduledDate);
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);
        return setDate >= weekStart && setDate < weekEnd;
    });

    const completedThisMonth = scheduleHook.schedules.filter(s => {
        const setDate = new Date(s.scheduledDate);
        const today = new Date();
        return setDate.getMonth() === today.getMonth() && 
               setDate.getFullYear() === today.getFullYear() &&
               s.status === 'Complete';
    });

    const modulesSetThisMonth = completedThisMonth.reduce((acc, s) => 
        acc + s.modules.filter(m => m.setStatus === 'Set').length, 0
    );

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

    return (
        <div className="dashboard-container">
            {/* Quick Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                        <div className="stat-value">{thisWeekSets.length}</div>
                        <div className="stat-label">Sets This Week</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📦</div>
                    <div className="stat-content">
                        <div className="stat-value">{modulesSetThisMonth}</div>
                        <div className="stat-label">Modules Set This Month</div>
                    </div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <div className="stat-value">{openIssues.length}</div>
                        <div className="stat-label">Open Issues</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <div className="stat-value">{completedThisMonth.length}</div>
                        <div className="stat-label">Completed This Month</div>
                    </div>
                </div>
            </div>

            {/* Today's Sets */}
            <div className="dashboard-section">
                <div className="section-header">
                    <h2>Today's Sets</h2>
                    <span className="section-count">{todaysSets.length}</span>
                </div>
                
                {todaysSets.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📅</div>
                        <p>No sets scheduled for today</p>
                        <button onClick={onScheduleNew} className="btn-primary">
                            Schedule a Set
                        </button>
                    </div>
                ) : (
                    <div className="set-cards-grid">
                        {todaysSets.map(set => (
                            <SetCard
                                key={set.id}
                                set={set}
                                issueCount={issueHook.getIssuesBySet(set.id).filter(i => i.status === 'Open').length}
                                onStart={() => onStartSet(set)}
                                onView={() => onViewSet(set)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Active Sets */}
            {activeSets.length > 0 && (
                <div className="dashboard-section active-section">
                    <div className="section-header">
                        <h2>🔴 Active Sets</h2>
                        <span className="section-count live">{activeSets.length} In Progress</span>
                    </div>
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
                </div>
            )}

            {/* Upcoming Sets */}
            <div className="dashboard-section">
                <div className="section-header">
                    <h2>Upcoming Sets</h2>
                    <span className="section-count">{upcomingSets.length} next 7 days</span>
                </div>
                
                {upcomingSets.length === 0 ? (
                    <div className="empty-state small">
                        <p>No upcoming sets scheduled</p>
                    </div>
                ) : (
                    <div className="upcoming-list">
                        {upcomingSets.slice(0, 5).map(set => (
                            <div key={set.id} className="upcoming-item" onClick={() => onViewSet(set)}>
                                <div className="upcoming-date">
                                    <span className="day">{new Date(set.scheduledDate).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                    <span className="date">{new Date(set.scheduledDate).getDate()}</span>
                                </div>
                                <div className="upcoming-info">
                                    <div className="upcoming-project">{set.projectName}</div>
                                    <div className="upcoming-details">
                                        {set.modules.length} modules • {set.scheduledTime}
                                    </div>
                                </div>
                                <div className="upcoming-status">
                                    <span className={`status-badge ${set.status.toLowerCase().replace(' ', '-')}`}>
                                        {set.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Open Issues Summary */}
            {openIssues.length > 0 && (
                <div className="dashboard-section issues-section">
                    <div className="section-header">
                        <h2>⚠️ Open Issues</h2>
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
                    <span className="info-icon">📦</span>
                    <span>{totalModules} Modules</span>
                </div>
                <div className="set-info-row">
                    <span className="info-icon">🕐</span>
                    <span>{set.scheduledTime}</span>
                </div>
                {set.crew && set.crew.length > 0 && (
                    <div className="set-info-row">
                        <span className="info-icon">👷</span>
                        <span>{set.crew.map(c => c.name).join(', ')}</span>
                    </div>
                )}
                {issueCount > 0 && (
                    <div className="set-info-row warning">
                        <span className="info-icon">⚠️</span>
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
                    ← Back
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
                        ✓ Complete Set
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
                    {isSet ? '✅' : openIssues.length > 0 ? '⚠️' : '⬜'}
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
                        📷 {module.photos.length}
                    </div>
                )}
            </div>

            {/* Production Notes */}
            {module.productionNotes && module.productionNotes.length > 0 && (
                <div className="production-notes">
                    <div className="notes-header">📋 Production Notes</div>
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
                        ✓ Mark as Set
                    </button>
                )}
                <button onClick={onLogIssue} className="action-btn issue">
                    ⚠ Log Issue
                </button>
                <button onClick={onTakePhoto} className="action-btn photo">
                    📷 Photo
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
            issueType: ISSUE_TYPES.find(t => t.id === issueType)?.label || issueType,
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
                            {ISSUE_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setIssueType(type.id)}
                                    className={`issue-type-btn ${issueType === type.id ? 'selected' : ''}`}
                                >
                                    <span className="type-icon">{type.icon}</span>
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
                                <span className="add-icon">📷</span>
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
                        <span className="capture-icon">📷</span>
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

// Export for use
window.OnSiteTab = OnSiteTab;
window.useSetSchedule = useSetSchedule;
window.useSetIssues = useSetIssues;
