// Reports Sub-Tab
// View and export set documentation and field reports

const { useState, useMemo } = React;

// ============================================================================
// REPORTS TAB
// ============================================================================

function ReportsTab({ scheduleHook, issueHook, projects }) {
    const [activeReport, setActiveReport] = useState('set-reports');
    const [selectedSet, setSelectedSet] = useState(null);
    const [filterProject, setFilterProject] = useState('all');
    const [filterDateRange, setFilterDateRange] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const reportTypes = [
        { id: 'set-reports', label: 'Set Reports', icon: '📋' },
        { id: 'issue-summary', label: 'Issue Summary', icon: '⚠️' },
        { id: 'module-profiles', label: 'Module Profiles', icon: '📦' }
    ];

    // Filter completed sets for reports
    const completedSets = useMemo(() => {
        return scheduleHook.schedules
            .filter(s => s.status === 'Complete')
            .filter(s => {
                if (filterProject !== 'all' && s.projectId !== filterProject) return false;
                if (filterDateRange !== 'all') {
                    const setDate = new Date(s.scheduledDate);
                    const today = new Date();
                    if (filterDateRange === 'week') {
                        const weekAgo = new Date(today);
                        weekAgo.setDate(today.getDate() - 7);
                        if (setDate < weekAgo) return false;
                    } else if (filterDateRange === 'month') {
                        const monthAgo = new Date(today);
                        monthAgo.setMonth(today.getMonth() - 1);
                        if (setDate < monthAgo) return false;
                    }
                }
                if (searchTerm) {
                    const search = searchTerm.toLowerCase();
                    if (!s.projectName.toLowerCase().includes(search) &&
                        !s.modules.some(m => m.serialNumber.toLowerCase().includes(search))) {
                        return false;
                    }
                }
                return true;
            })
            .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
    }, [scheduleHook.schedules, filterProject, filterDateRange, searchTerm]);

    // Get all issues
    const allIssues = issueHook.issues;
    const openIssues = allIssues.filter(i => i.status === 'Open');

    // Get unique projects
    const projectsWithSets = useMemo(() => {
        const projectIds = [...new Set(scheduleHook.schedules.map(s => s.projectId))];
        return projects.filter(p => projectIds.includes(p.id));
    }, [scheduleHook.schedules, projects]);

    return (
        <div className="reports-tab">
            {/* Header */}
            <div className="reports-header">
                <h2>Reports</h2>
            </div>

            {/* Report Type Tabs */}
            <div className="report-type-tabs">
                {reportTypes.map(type => (
                    <button
                        key={type.id}
                        onClick={() => setActiveReport(type.id)}
                        className={`report-type-btn ${activeReport === type.id ? 'active' : ''}`}
                    >
                        <span className="type-icon">{type.icon}</span>
                        <span className="type-label">{type.label}</span>
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="reports-filters">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search projects or modules..."
                    className="search-input"
                />
                <select
                    value={filterProject}
                    onChange={(e) => setFilterProject(e.target.value)}
                    className="filter-select"
                >
                    <option value="all">All Projects</option>
                    {projectsWithSets.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <select
                    value={filterDateRange}
                    onChange={(e) => setFilterDateRange(e.target.value)}
                    className="filter-select"
                >
                    <option value="all">All Time</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                </select>
            </div>

            {/* Report Content */}
            <div className="reports-content">
                {activeReport === 'set-reports' && (
                    <SetReportsView
                        sets={completedSets}
                        issueHook={issueHook}
                        onSelectSet={setSelectedSet}
                    />
                )}

                {activeReport === 'issue-summary' && (
                    <IssueSummaryView
                        issues={allIssues}
                        openIssues={openIssues}
                        schedules={scheduleHook.schedules}
                    />
                )}

                {activeReport === 'module-profiles' && (
                    <ModuleProfilesView
                        schedules={scheduleHook.schedules}
                        issueHook={issueHook}
                        searchTerm={searchTerm}
                    />
                )}
            </div>

            {/* Set Report Detail Modal */}
            {selectedSet && (
                <SetReportModal
                    set={selectedSet}
                    issues={issueHook.getIssuesBySet(selectedSet.id)}
                    onClose={() => setSelectedSet(null)}
                    onExport={() => exportSetReport(selectedSet, issueHook.getIssuesBySet(selectedSet.id))}
                />
            )}
        </div>
    );
}

// ============================================================================
// SET REPORTS VIEW
// ============================================================================

function SetReportsView({ sets, issueHook, onSelectSet }) {
    if (sets.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>No completed sets to report on</p>
            </div>
        );
    }

    return (
        <div className="set-reports-list">
            {sets.map(set => {
                const setIssues = issueHook.getIssuesBySet(set.id);
                const openIssues = setIssues.filter(i => i.status === 'Open');
                const modulesSet = set.modules.filter(m => m.setStatus === 'Set').length;
                const totalPhotos = set.modules.reduce((acc, m) => acc + (m.photos?.length || 0), 0);

                return (
                    <div 
                        key={set.id} 
                        className="set-report-card"
                        onClick={() => onSelectSet(set)}
                    >
                        <div className="report-card-header">
                            <div className="report-project">{set.projectName}</div>
                            <div className="report-date">
                                {new Date(set.scheduledDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </div>
                        </div>

                        <div className="report-stats">
                            <div className="report-stat">
                                <span className="stat-value">{modulesSet}</span>
                                <span className="stat-label">Modules Set</span>
                            </div>
                            <div className="report-stat">
                                <span className="stat-value">{totalPhotos}</span>
                                <span className="stat-label">Photos</span>
                            </div>
                            <div className={`report-stat ${openIssues.length > 0 ? 'warning' : ''}`}>
                                <span className="stat-value">{setIssues.length}</span>
                                <span className="stat-label">Issues</span>
                            </div>
                        </div>

                        {set.actualStartTime && set.actualEndTime && (
                            <div className="report-duration">
                                Duration: {calculateDuration(set.actualStartTime, set.actualEndTime)}
                            </div>
                        )}

                        <div className="report-card-footer">
                            <span className="view-link">View Full Report →</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ============================================================================
// ISSUE SUMMARY VIEW
// ============================================================================

function IssueSummaryView({ issues, openIssues, schedules }) {
    const [filterSeverity, setFilterSeverity] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    // Filter issues
    const filteredIssues = issues.filter(issue => {
        if (filterSeverity !== 'all' && issue.severity !== filterSeverity) return false;
        if (filterStatus !== 'all' && issue.status.toLowerCase() !== filterStatus) return false;
        return true;
    });

    // Group by severity
    const bySeverity = {
        critical: issues.filter(i => i.severity === 'critical'),
        major: issues.filter(i => i.severity === 'major'),
        minor: issues.filter(i => i.severity === 'minor')
    };

    // Group by trade
    const byTrade = issues.reduce((acc, issue) => {
        const trade = issue.trade || 'Unspecified';
        if (!acc[trade]) acc[trade] = [];
        acc[trade].push(issue);
        return acc;
    }, {});

    return (
        <div className="issue-summary">
            {/* Summary Stats */}
            <div className="issue-stats-grid">
                <div className="issue-stat-card total">
                    <div className="stat-number">{issues.length}</div>
                    <div className="stat-label">Total Issues</div>
                </div>
                <div className="issue-stat-card open">
                    <div className="stat-number">{openIssues.length}</div>
                    <div className="stat-label">Open</div>
                </div>
                <div className="issue-stat-card critical">
                    <div className="stat-number">{bySeverity.critical.length}</div>
                    <div className="stat-label">Critical</div>
                </div>
                <div className="issue-stat-card major">
                    <div className="stat-number">{bySeverity.major.length}</div>
                    <div className="stat-label">Major</div>
                </div>
            </div>

            {/* By Trade Chart */}
            <div className="issue-breakdown">
                <h3>Issues by Trade</h3>
                <div className="trade-bars">
                    {Object.entries(byTrade)
                        .sort((a, b) => b[1].length - a[1].length)
                        .slice(0, 8)
                        .map(([trade, tradeIssues]) => (
                            <div key={trade} className="trade-bar-row">
                                <span className="trade-name">{trade}</span>
                                <div className="trade-bar">
                                    <div 
                                        className="trade-bar-fill"
                                        style={{ width: `${(tradeIssues.length / issues.length) * 100}%` }}
                                    />
                                </div>
                                <span className="trade-count">{tradeIssues.length}</span>
                            </div>
                        ))}
                </div>
            </div>

            {/* Filters */}
            <div className="issue-list-filters">
                <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="filter-select"
                >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical</option>
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="filter-select"
                >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                </select>
            </div>

            {/* Issue List */}
            <div className="issue-list-full">
                {filteredIssues.length === 0 ? (
                    <div className="empty-state small">
                        <p>No issues match the filters</p>
                    </div>
                ) : (
                    filteredIssues.map(issue => (
                        <div key={issue.id} className={`issue-list-item ${issue.severity}`}>
                            <div className={`severity-indicator ${issue.severity}`}></div>
                            <div className="issue-main">
                                <div className="issue-header">
                                    <span className="issue-type">{issue.issueType}</span>
                                    <span className={`issue-status ${issue.status.toLowerCase()}`}>
                                        {issue.status}
                                    </span>
                                </div>
                                <div className="issue-desc">{issue.description}</div>
                                <div className="issue-meta">
                                    <span>Module: {issue.serialNumber}</span>
                                    <span>Project: {issue.projectName}</span>
                                    {issue.trade && <span>Trade: {issue.trade}</span>}
                                    <span>{new Date(issue.reportedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            {issue.photos?.length > 0 && (
                                <div className="issue-photos-count">
                                    📷 {issue.photos.length}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Export Button */}
            <div className="export-section">
                <button 
                    onClick={() => exportIssueSummary(filteredIssues)}
                    className="btn-secondary"
                >
                    📥 Export to Excel
                </button>
            </div>
        </div>
    );
}

// ============================================================================
// MODULE PROFILES VIEW
// ============================================================================

function ModuleProfilesView({ schedules, issueHook, searchTerm }) {
    const [selectedModule, setSelectedModule] = useState(null);

    // Get all modules from all sets
    const allModules = useMemo(() => {
        const modules = [];
        schedules.forEach(set => {
            set.modules.forEach(module => {
                modules.push({
                    ...module,
                    setId: set.id,
                    projectId: set.projectId,
                    projectName: set.projectName,
                    setDate: set.scheduledDate,
                    setStatus: set.status
                });
            });
        });
        return modules;
    }, [schedules]);

    // Filter modules
    const filteredModules = allModules.filter(m => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return m.serialNumber.toLowerCase().includes(search) ||
               m.hitchBLM?.toLowerCase().includes(search) ||
               m.projectName.toLowerCase().includes(search);
    });

    // Group by project
    const byProject = filteredModules.reduce((acc, module) => {
        if (!acc[module.projectName]) acc[module.projectName] = [];
        acc[module.projectName].push(module);
        return acc;
    }, {});

    return (
        <div className="module-profiles">
            {Object.keys(byProject).length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📦</div>
                    <p>No modules found</p>
                </div>
            ) : (
                Object.entries(byProject).map(([projectName, modules]) => (
                    <div key={projectName} className="project-modules-section">
                        <h3 className="project-section-header">
                            {projectName}
                            <span className="module-count">{modules.length} modules</span>
                        </h3>
                        <div className="modules-grid">
                            {modules.map(module => {
                                const moduleIssues = issueHook.getIssuesByModule(module.moduleId);
                                const openIssues = moduleIssues.filter(i => i.status === 'Open');

                                return (
                                    <div 
                                        key={`${module.setId}-${module.moduleId}`}
                                        className={`module-profile-card ${module.setStatus === 'Set' ? 'set' : ''}`}
                                        onClick={() => setSelectedModule(module)}
                                    >
                                        <div className="module-serial">{module.serialNumber}</div>
                                        {module.hitchBLM && (
                                            <div className="module-blm">{module.hitchBLM}</div>
                                        )}
                                        <div className="module-set-date">
                                            {new Date(module.setDate).toLocaleDateString()}
                                        </div>
                                        <div className="module-indicators">
                                            {module.photos?.length > 0 && (
                                                <span className="indicator">📷 {module.photos.length}</span>
                                            )}
                                            {moduleIssues.length > 0 && (
                                                <span className={`indicator ${openIssues.length > 0 ? 'warning' : ''}`}>
                                                    ⚠️ {moduleIssues.length}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}

            {/* Module Profile Modal */}
            {selectedModule && (
                <ModuleProfileModal
                    module={selectedModule}
                    issues={issueHook.getIssuesByModule(selectedModule.moduleId)}
                    onClose={() => setSelectedModule(null)}
                />
            )}
        </div>
    );
}

// ============================================================================
// SET REPORT MODAL
// ============================================================================

function SetReportModal({ set, issues, onClose, onExport }) {
    const modulesSet = set.modules.filter(m => m.setStatus === 'Set').length;
    const totalPhotos = set.modules.reduce((acc, m) => acc + (m.photos?.length || 0), 0);
    const openIssues = issues.filter(i => i.status === 'Open');

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content report-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Set Report</h2>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>

                <div className="modal-body">
                    {/* Report Header */}
                    <div className="report-header-section">
                        <h3>{set.projectName}</h3>
                        <div className="report-date-time">
                            <span>{new Date(set.scheduledDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            })}</span>
                            {set.actualStartTime && (
                                <span>
                                    {new Date(set.actualStartTime).toLocaleTimeString()} - 
                                    {set.actualEndTime ? new Date(set.actualEndTime).toLocaleTimeString() : 'In Progress'}
                                </span>
                            )}
                        </div>
                        {set.siteAddress && (
                            <div className="report-address">📍 {set.siteAddress}</div>
                        )}
                    </div>

                    {/* Summary Stats */}
                    <div className="report-summary-stats">
                        <div className="summary-stat">
                            <span className="stat-value">{modulesSet}/{set.modules.length}</span>
                            <span className="stat-label">Modules Set</span>
                        </div>
                        <div className="summary-stat">
                            <span className="stat-value">{totalPhotos}</span>
                            <span className="stat-label">Photos</span>
                        </div>
                        <div className={`summary-stat ${openIssues.length > 0 ? 'warning' : ''}`}>
                            <span className="stat-value">{issues.length}</span>
                            <span className="stat-label">Issues</span>
                        </div>
                        {set.actualStartTime && set.actualEndTime && (
                            <div className="summary-stat">
                                <span className="stat-value">
                                    {calculateDuration(set.actualStartTime, set.actualEndTime)}
                                </span>
                                <span className="stat-label">Duration</span>
                            </div>
                        )}
                    </div>

                    {/* Crew */}
                    {set.crew?.length > 0 && (
                        <div className="report-section">
                            <h4>Crew</h4>
                            <div className="crew-list">
                                {set.crew.map(member => (
                                    <span key={member.employeeId} className="crew-badge">
                                        {member.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Crane Info */}
                    {set.crane?.company && (
                        <div className="report-section">
                            <h4>Crane</h4>
                            <div className="crane-info">
                                <span>{set.crane.company}</span>
                                {set.crane.operator && <span>Operator: {set.crane.operator}</span>}
                                {set.crane.phone && <span>📞 {set.crane.phone}</span>}
                            </div>
                        </div>
                    )}

                    {/* Modules */}
                    <div className="report-section">
                        <h4>Modules</h4>
                        <div className="report-modules-list">
                            {set.modules.map(module => {
                                const moduleIssues = issues.filter(i => i.moduleId === module.moduleId);
                                return (
                                    <div key={module.moduleId} className={`report-module-item ${module.setStatus?.toLowerCase()}`}>
                                        <div className="module-status-icon">
                                            {module.setStatus === 'Set' ? '✅' : '⬜'}
                                        </div>
                                        <div className="module-info">
                                            <span className="serial">{module.serialNumber}</span>
                                            {module.hitchBLM && <span className="blm">{module.hitchBLM}</span>}
                                        </div>
                                        <div className="module-meta">
                                            {module.photos?.length > 0 && <span>📷 {module.photos.length}</span>}
                                            {moduleIssues.length > 0 && <span>⚠️ {moduleIssues.length}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Issues */}
                    {issues.length > 0 && (
                        <div className="report-section">
                            <h4>Issues ({issues.length})</h4>
                            <div className="report-issues-list">
                                {issues.map(issue => (
                                    <div key={issue.id} className={`report-issue-item ${issue.severity}`}>
                                        <div className="issue-header">
                                            <span className={`severity-badge ${issue.severity}`}>
                                                {issue.severity}
                                            </span>
                                            <span className="issue-type">{issue.issueType}</span>
                                            <span className={`status-badge ${issue.status.toLowerCase()}`}>
                                                {issue.status}
                                            </span>
                                        </div>
                                        <div className="issue-module">Module: {issue.serialNumber}</div>
                                        <div className="issue-desc">{issue.description}</div>
                                        {issue.trade && <div className="issue-trade">Trade: {issue.trade}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {set.preSetNotes && (
                        <div className="report-section">
                            <h4>Notes</h4>
                            <p className="report-notes">{set.preSetNotes}</p>
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <button onClick={onExport} className="btn-secondary">
                        📥 Export PDF
                    </button>
                    <button onClick={onClose} className="btn-primary">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// MODULE PROFILE MODAL
// ============================================================================

function ModuleProfileModal({ module, issues, onClose }) {
    const openIssues = issues.filter(i => i.status === 'Open');

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content module-profile-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Module Profile</h2>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>

                <div className="modal-body">
                    {/* Module Header */}
                    <div className="profile-header">
                        <div className="profile-serial">{module.serialNumber}</div>
                        {module.hitchBLM && <div className="profile-blm">{module.hitchBLM}</div>}
                        <div className="profile-project">{module.projectName}</div>
                    </div>

                    {/* Set Info */}
                    <div className="profile-section">
                        <h4>Set Information</h4>
                        <div className="profile-grid">
                            <div className="profile-item">
                                <span className="label">Set Date</span>
                                <span className="value">
                                    {new Date(module.setDate).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="profile-item">
                                <span className="label">Status</span>
                                <span className={`value status ${module.setStatus?.toLowerCase()}`}>
                                    {module.setStatus || 'Pending'}
                                </span>
                            </div>
                            {module.setTime && (
                                <div className="profile-item">
                                    <span className="label">Set Time</span>
                                    <span className="value">
                                        {new Date(module.setTime).toLocaleTimeString()}
                                    </span>
                                </div>
                            )}
                            {module.setBy && (
                                <div className="profile-item">
                                    <span className="label">Set By</span>
                                    <span className="value">{module.setBy}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Unit Info */}
                    {(module.hitchUnit || module.hitchRoom) && (
                        <div className="profile-section">
                            <h4>Unit Details</h4>
                            <div className="profile-grid">
                                {module.hitchUnit && (
                                    <div className="profile-item">
                                        <span className="label">Unit</span>
                                        <span className="value">{module.hitchUnit}</span>
                                    </div>
                                )}
                                {module.hitchRoom && (
                                    <div className="profile-item">
                                        <span className="label">Room</span>
                                        <span className="value">{module.hitchRoom}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Production Notes */}
                    {module.productionNotes?.length > 0 && (
                        <div className="profile-section">
                            <h4>Production Notes</h4>
                            <div className="notes-list">
                                {module.productionNotes.map((note, idx) => (
                                    <div key={idx} className="note-item">
                                        <p>{note.note}</p>
                                        <span className="note-meta">{note.author} • {note.date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Photos */}
                    {module.photos?.length > 0 && (
                        <div className="profile-section">
                            <h4>Photos ({module.photos.length})</h4>
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
                        <div className="profile-section">
                            <h4>Issues ({issues.length})</h4>
                            {openIssues.length > 0 && (
                                <div className="open-issues-warning">
                                    ⚠️ {openIssues.length} open issue{openIssues.length > 1 ? 's' : ''}
                                </div>
                            )}
                            <div className="issues-list">
                                {issues.map(issue => (
                                    <div key={issue.id} className={`issue-card ${issue.severity}`}>
                                        <div className="issue-header">
                                            <span className={`severity-badge ${issue.severity}`}>
                                                {issue.severity}
                                            </span>
                                            <span className="issue-type">{issue.issueType}</span>
                                            <span className={`status-badge ${issue.status.toLowerCase()}`}>
                                                {issue.status}
                                            </span>
                                        </div>
                                        <p className="issue-desc">{issue.description}</p>
                                        {issue.trade && <span className="issue-trade">{issue.trade}</span>}
                                        <span className="issue-date">
                                            {new Date(issue.reportedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Field Notes */}
                    {module.fieldNotes && (
                        <div className="profile-section">
                            <h4>Field Notes</h4>
                            <p className="field-notes">{module.fieldNotes}</p>
                        </div>
                    )}
                </div>

                <div className="modal-actions">
                    <button onClick={onClose} className="btn-primary">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHrs > 0) {
        return `${diffHrs}h ${diffMins}m`;
    }
    return `${diffMins}m`;
}

function exportSetReport(set, issues) {
    // Create printable report
    const reportWindow = window.open('', '_blank');
    const modulesSet = set.modules.filter(m => m.setStatus === 'Set').length;
    
    reportWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Set Report - ${set.projectName}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
                h1 { color: #1e3a5f; border-bottom: 2px solid #C8102E; padding-bottom: 10px; }
                h2 { color: #1e3a5f; margin-top: 30px; }
                .header-info { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                .stats { display: flex; gap: 30px; margin: 20px 0; }
                .stat { text-align: center; }
                .stat-value { font-size: 24px; font-weight: bold; color: #1e3a5f; }
                .stat-label { font-size: 12px; color: #666; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background: #1e3a5f; color: white; }
                .issue { background: #fff3cd; padding: 10px; margin: 10px 0; border-left: 4px solid #ffc107; }
                .issue.critical { background: #f8d7da; border-color: #dc3545; }
                .issue.major { background: #ffe5d0; border-color: #fd7e14; }
                @media print { body { padding: 20px; } }
            </style>
        </head>
        <body>
            <h1>Set Report</h1>
            <div class="header-info">
                <strong>${set.projectName}</strong><br>
                Date: ${new Date(set.scheduledDate).toLocaleDateString()}<br>
                ${set.siteAddress ? `Location: ${set.siteAddress}` : ''}
            </div>
            
            <div class="stats">
                <div class="stat">
                    <div class="stat-value">${modulesSet}/${set.modules.length}</div>
                    <div class="stat-label">Modules Set</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${issues.length}</div>
                    <div class="stat-label">Issues</div>
                </div>
            </div>
            
            <h2>Modules</h2>
            <table>
                <tr>
                    <th>Serial #</th>
                    <th>BLM ID</th>
                    <th>Status</th>
                </tr>
                ${set.modules.map(m => `
                    <tr>
                        <td>${m.serialNumber}</td>
                        <td>${m.hitchBLM || '-'}</td>
                        <td>${m.setStatus || 'Pending'}</td>
                    </tr>
                `).join('')}
            </table>
            
            ${issues.length > 0 ? `
                <h2>Issues</h2>
                ${issues.map(i => `
                    <div class="issue ${i.severity}">
                        <strong>${i.issueType}</strong> - ${i.severity.toUpperCase()}<br>
                        Module: ${i.serialNumber}<br>
                        ${i.description}
                    </div>
                `).join('')}
            ` : ''}
            
            <script>window.print();</script>
        </body>
        </html>
    `);
}

function exportIssueSummary(issues) {
    if (typeof XLSX === 'undefined') {
        alert('Excel export not available');
        return;
    }

    const data = issues.map(i => ({
        'Issue ID': i.id,
        'Project': i.projectName,
        'Module': i.serialNumber,
        'Type': i.issueType,
        'Severity': i.severity,
        'Trade': i.trade || '',
        'Description': i.description,
        'Status': i.status,
        'Reported By': i.reportedBy,
        'Reported Date': new Date(i.reportedAt).toLocaleDateString(),
        'Photos': i.photos?.length || 0
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Issues');
    XLSX.writeFile(wb, `OnSite_Issues_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Export
window.ReportsTab = ReportsTab;
