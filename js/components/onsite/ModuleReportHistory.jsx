/**
 * ModuleReportHistory Component
 * 
 * Displays report history for a specific module.
 * Shows all daily reports, issues, and photos associated with the module.
 * Used in Project Directory module detail view.
 */

const { useState, useEffect } = React;

function ModuleReportHistory({ moduleId, moduleName }) {
    const [isLoading, setIsLoading] = useState(true);
    const [reportHistory, setReportHistory] = useState([]);
    const [issues, setIssues] = useState([]);
    const [photos, setPhotos] = useState([]);
    const [activeTab, setActiveTab] = useState('reports');
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [error, setError] = useState(null);

    // Fetch data on mount
    useEffect(() => {
        if (moduleId) {
            fetchModuleData();
        }
    }, [moduleId]);

    const fetchModuleData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            if (window.MODA_DAILY_REPORTS) {
                // Fetch report history
                const history = await window.MODA_DAILY_REPORTS.getModuleReportHistory(moduleId);
                setReportHistory(history || []);

                // Fetch issues
                const moduleIssues = await window.MODA_DAILY_REPORTS.getIssuesByModule(moduleId);
                setIssues(moduleIssues || []);

                // Fetch photos
                const modulePhotos = await window.MODA_DAILY_REPORTS.getPhotosByModule(moduleId);
                setPhotos(modulePhotos || []);
            }
        } catch (err) {
            console.error('Error fetching module report data:', err);
            setError('Failed to load report history');
        } finally {
            setIsLoading(false);
        }
    };

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'set': return '#16a34a';
            case 'partial': return '#ea580c';
            case 'not_set': return '#6b7280';
            default: return '#6b7280';
        }
    };

    // Get severity color
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return '#dc2626';
            case 'major': return '#ea580c';
            case 'minor': return '#16a34a';
            default: return '#6b7280';
        }
    };

    if (isLoading) {
        return (
            <div className="module-report-history loading">
                <div className="spinner"></div>
                <p>Loading report history...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="module-report-history error">
                <p>{error}</p>
                <button onClick={fetchModuleData} className="btn-link">Retry</button>
            </div>
        );
    }

    const hasData = reportHistory.length > 0 || issues.length > 0 || photos.length > 0;

    if (!hasData) {
        return (
            <div className="module-report-history empty">
                <div className="empty-icon">
                    <span className="icon-document"></span>
                </div>
                <p>No report history for this module</p>
                <p className="hint">Reports will appear here once the module is included in a daily set report.</p>
            </div>
        );
    }

    return (
        <div className="module-report-history">
            {/* Header */}
            <div className="history-header">
                <h4>Report History</h4>
                {moduleName && <span className="module-name">{moduleName}</span>}
            </div>

            {/* Tabs */}
            <div className="history-tabs">
                <button
                    className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reports')}
                >
                    Reports ({reportHistory.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'issues' ? 'active' : ''}`}
                    onClick={() => setActiveTab('issues')}
                >
                    Issues ({issues.length})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('photos')}
                >
                    Photos ({photos.length})
                </button>
            </div>

            {/* Tab Content */}
            <div className="history-content">
                {/* Reports Tab */}
                {activeTab === 'reports' && (
                    <div className="reports-list">
                        {reportHistory.length === 0 ? (
                            <p className="no-data">No reports yet</p>
                        ) : (
                            reportHistory.map((report, idx) => (
                                <div key={idx} className="report-item">
                                    <div className="report-date">
                                        {formatDate(report.report_date)}
                                    </div>
                                    <div className="report-details">
                                        <span 
                                            className="set-status"
                                            style={{ color: getStatusColor(report.set_status) }}
                                        >
                                            {report.set_status?.replace('_', ' ') || 'Unknown'}
                                        </span>
                                        {report.set_sequence && (
                                            <span className="set-sequence">
                                                Set #{report.set_sequence}
                                            </span>
                                        )}
                                        {report.issue_count > 0 && (
                                            <span className="issue-count">
                                                {report.issue_count} issue{report.issue_count !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                        {report.photo_count > 0 && (
                                            <span className="photo-count">
                                                {report.photo_count} photo{report.photo_count !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    {report.notes && (
                                        <div className="report-notes">{report.notes}</div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Issues Tab */}
                {activeTab === 'issues' && (
                    <div className="issues-list">
                        {issues.length === 0 ? (
                            <p className="no-data">No issues reported</p>
                        ) : (
                            issues.map(issue => {
                                const categoryLabel = window.MODA_DAILY_REPORTS?.ISSUE_CATEGORIES[issue.category]?.label || issue.category;
                                
                                return (
                                    <div 
                                        key={issue.id} 
                                        className={`issue-item severity-${issue.severity}`}
                                        onClick={() => setSelectedIssue(issue)}
                                    >
                                        <div className="issue-header">
                                            <span 
                                                className="severity-badge"
                                                style={{ backgroundColor: getSeverityColor(issue.severity) }}
                                            >
                                                {issue.severity}
                                            </span>
                                            <span className="issue-category">{categoryLabel}</span>
                                            <span className={`issue-status ${issue.status}`}>
                                                {issue.status}
                                            </span>
                                        </div>
                                        <div className="issue-description">
                                            {issue.description}
                                        </div>
                                        <div className="issue-meta">
                                            <span>{formatDate(issue.reported_at)}</span>
                                            {issue.report_issue_comments?.length > 0 && (
                                                <span>{issue.report_issue_comments.length} comment{issue.report_issue_comments.length !== 1 ? 's' : ''}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Photos Tab */}
                {activeTab === 'photos' && (
                    <div className="photos-grid">
                        {photos.length === 0 ? (
                            <p className="no-data">No photos</p>
                        ) : (
                            photos.map((photo, idx) => (
                                <div key={photo.id || idx} className="photo-item">
                                    {photo.sharepoint_url ? (
                                        <a 
                                            href={photo.sharepoint_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="photo-link"
                                        >
                                            {photo.thumbnail_url ? (
                                                <img src={photo.thumbnail_url} alt={photo.caption || 'Photo'} />
                                            ) : (
                                                <div className="photo-placeholder">
                                                    <span className="icon-image"></span>
                                                    <span>View</span>
                                                </div>
                                            )}
                                        </a>
                                    ) : photo.local_data ? (
                                        <img src={photo.local_data} alt={photo.caption || 'Photo'} />
                                    ) : (
                                        <div className="photo-placeholder">
                                            <span className="icon-image"></span>
                                        </div>
                                    )}
                                    {photo.caption && (
                                        <div className="photo-caption">{photo.caption}</div>
                                    )}
                                    <div className="photo-date">
                                        {formatDate(photo.daily_reports?.report_date || photo.created_at)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Issue Comments Modal */}
            {selectedIssue && window.IssueCommentsModal && (
                <IssueCommentsModal
                    issue={selectedIssue}
                    onClose={() => setSelectedIssue(null)}
                />
            )}

            <style>{`
                .module-report-history {
                    padding: 16px;
                    background: #f9fafb;
                    border-radius: 8px;
                }

                .module-report-history.loading,
                .module-report-history.error,
                .module-report-history.empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 32px;
                    text-align: center;
                    color: #6b7280;
                }

                .module-report-history .empty-icon {
                    width: 48px;
                    height: 48px;
                    background: #e5e7eb;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 12px;
                }

                .module-report-history .hint {
                    font-size: 13px;
                    color: #9ca3af;
                    margin-top: 4px;
                }

                .history-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;
                }

                .history-header h4 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #111827;
                }

                .history-header .module-name {
                    font-size: 13px;
                    color: #6b7280;
                }

                .history-tabs {
                    display: flex;
                    gap: 4px;
                    margin-bottom: 16px;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 8px;
                }

                .tab-btn {
                    padding: 8px 12px;
                    border: none;
                    background: transparent;
                    font-size: 13px;
                    font-weight: 500;
                    color: #6b7280;
                    cursor: pointer;
                    border-radius: 6px;
                    transition: all 0.2s;
                }

                .tab-btn:hover {
                    background: #e5e7eb;
                }

                .tab-btn.active {
                    background: #0057B8;
                    color: white;
                }

                .history-content {
                    max-height: 400px;
                    overflow-y: auto;
                }

                .no-data {
                    text-align: center;
                    color: #9ca3af;
                    font-size: 14px;
                    padding: 24px;
                }

                /* Reports List */
                .reports-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .report-item {
                    padding: 12px;
                    background: white;
                    border-radius: 6px;
                    border: 1px solid #e5e7eb;
                }

                .report-date {
                    font-size: 14px;
                    font-weight: 600;
                    color: #111827;
                    margin-bottom: 4px;
                }

                .report-details {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    font-size: 12px;
                }

                .set-status {
                    font-weight: 600;
                    text-transform: capitalize;
                }

                .set-sequence,
                .issue-count,
                .photo-count {
                    color: #6b7280;
                }

                .report-notes {
                    margin-top: 8px;
                    font-size: 13px;
                    color: #374151;
                    font-style: italic;
                }

                /* Issues List */
                .issues-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .issue-item {
                    padding: 12px;
                    background: white;
                    border-radius: 6px;
                    border: 1px solid #e5e7eb;
                    border-left: 3px solid #6b7280;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .issue-item:hover {
                    background: #f9fafb;
                }

                .issue-item.severity-critical {
                    border-left-color: #dc2626;
                }

                .issue-item.severity-major {
                    border-left-color: #ea580c;
                }

                .issue-item.severity-minor {
                    border-left-color: #16a34a;
                }

                .issue-header {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-bottom: 6px;
                }

                .severity-badge {
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 600;
                    color: white;
                    text-transform: uppercase;
                }

                .issue-category {
                    font-size: 12px;
                    font-weight: 500;
                    color: #374151;
                }

                .issue-status {
                    font-size: 11px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    background: #e5e7eb;
                    color: #374151;
                }

                .issue-status.open {
                    background: #fee2e2;
                    color: #dc2626;
                }

                .issue-status.resolved {
                    background: #dcfce7;
                    color: #16a34a;
                }

                .issue-description {
                    font-size: 13px;
                    color: #111827;
                    line-height: 1.4;
                    margin-bottom: 6px;
                }

                .issue-meta {
                    display: flex;
                    gap: 12px;
                    font-size: 11px;
                    color: #9ca3af;
                }

                /* Photos Grid */
                .photos-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                }

                .photo-item {
                    position: relative;
                    aspect-ratio: 1;
                    background: white;
                    border-radius: 6px;
                    overflow: hidden;
                    border: 1px solid #e5e7eb;
                }

                .photo-item img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .photo-link {
                    display: block;
                    width: 100%;
                    height: 100%;
                }

                .photo-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: #f3f4f6;
                    color: #6b7280;
                    font-size: 12px;
                }

                .photo-caption {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 4px 6px;
                    background: rgba(0, 0, 0, 0.7);
                    color: white;
                    font-size: 10px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .photo-date {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    padding: 2px 6px;
                    background: rgba(0, 0, 0, 0.6);
                    color: white;
                    font-size: 9px;
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
}

// Make component available globally
window.ModuleReportHistory = ModuleReportHistory;
