/**
 * DailyReportWizard Component
 * 
 * Mobile-first wizard for creating daily set reports.
 * 
 * Steps:
 * 1. Report Setup - Select project, date, fetch weather
 * 2. Module Status - Mark which modules were set, set sequence
 * 3. Issues - Log any issues found (uses IssueLogger)
 * 4. Photos - Add general photos
 * 5. Review & Submit
 */

const { useState, useEffect, useMemo, useCallback } = React;

function DailyReportWizard({ 
    projects = [],
    onClose,
    onSubmit,
    initialProjectId = null,
    initialDate = null
}) {
    // Wizard state
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Report data
    const [reportId, setReportId] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [reportDate, setReportDate] = useState(initialDate || window.MODA_DAILY_REPORTS?.getYesterday() || '');
    const [existingReport, setExistingReport] = useState(null);

    // Weather data
    const [weatherData, setWeatherData] = useState(null);
    const [weatherSource, setWeatherSource] = useState('api');
    const [manualWeather, setManualWeather] = useState({
        temperature_high: '',
        temperature_low: '',
        conditions: '',
        wind_speed: '',
        wind_direction: '',
        precipitation: '',
        notes: ''
    });
    const [isFetchingWeather, setIsFetchingWeather] = useState(false);

    // Module data
    const [projectModules, setProjectModules] = useState([]);
    const [reportModules, setReportModules] = useState([]);
    const [moduleSearch, setModuleSearch] = useState('');

    // Issues
    const [issues, setIssues] = useState([]);
    const [showIssueLogger, setShowIssueLogger] = useState(false);
    const [editingIssue, setEditingIssue] = useState(null);

    // Photos
    const [generalPhotos, setGeneralPhotos] = useState([]);

    // General notes
    const [generalNotes, setGeneralNotes] = useState('');

    // Steps configuration
    const steps = [
        { id: 1, label: 'Setup', icon: 'icon-settings' },
        { id: 2, label: 'Modules', icon: 'icon-module' },
        { id: 3, label: 'Issues', icon: 'icon-warning' },
        { id: 4, label: 'Photos', icon: 'icon-camera' },
        { id: 5, label: 'Review', icon: 'icon-check' }
    ];

    // Initialize with project if provided
    useEffect(() => {
        if (initialProjectId && projects.length > 0) {
            const project = projects.find(p => p.id === initialProjectId);
            if (project) {
                setSelectedProject(project);
            }
        }
    }, [initialProjectId, projects]);

    // Check for existing report when project/date changes
    useEffect(() => {
        if (selectedProject && reportDate) {
            checkExistingReport();
        }
    }, [selectedProject, reportDate]);

    // Fetch project modules when project selected
    useEffect(() => {
        if (selectedProject) {
            fetchProjectModules();
        }
    }, [selectedProject]);

    // Check if report already exists for this project/date
    const checkExistingReport = async () => {
        if (!window.MODA_DAILY_REPORTS) return;

        try {
            const existing = await window.MODA_DAILY_REPORTS.getReportByDate(
                selectedProject.id,
                reportDate
            );

            if (existing) {
                setExistingReport(existing);
                // Load existing report data
                const fullReport = await window.MODA_DAILY_REPORTS.getReport(existing.id);
                if (fullReport) {
                    setReportId(fullReport.id);
                    setWeatherData(fullReport.weather_conditions);
                    setWeatherSource(fullReport.weather_source);
                    setGeneralNotes(fullReport.general_notes || '');
                    
                    // Load modules
                    if (fullReport.report_modules) {
                        setReportModules(fullReport.report_modules.map(rm => ({
                            ...rm,
                            module: rm.modules
                        })));
                    }

                    // Load issues
                    if (fullReport.report_issues) {
                        setIssues(fullReport.report_issues);
                    }

                    // Load photos
                    if (fullReport.report_photos) {
                        setGeneralPhotos(fullReport.report_photos.filter(p => !p.module_id && !p.issue_id));
                    }
                }
            } else {
                setExistingReport(null);
                setReportId(null);
            }
        } catch (err) {
            console.error('Error checking existing report:', err);
        }
    };

    // Fetch modules for selected project
    const fetchProjectModules = async () => {
        if (!selectedProject) return;

        setIsLoading(true);
        try {
            // Try Supabase first
            if (window.MODA_SUPABASE?.client) {
                const { data, error } = await window.MODA_SUPABASE.client
                    .from('modules')
                    .select('*')
                    .eq('project_id', selectedProject.id)
                    .order('serial_number');

                if (!error && data) {
                    setProjectModules(data);
                    return;
                }
            }

            // Fallback to project's embedded modules
            if (selectedProject.modules) {
                setProjectModules(selectedProject.modules);
            }
        } catch (err) {
            console.error('Error fetching modules:', err);
            setError('Failed to load project modules');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch weather for project location
    const fetchWeather = async () => {
        if (!selectedProject) return;

        setIsFetchingWeather(true);
        try {
            // Get coordinates from project location or use default
            // For now, using Phoenix, AZ as default (Autovol location)
            const lat = selectedProject.latitude || 33.4484;
            const lon = selectedProject.longitude || -112.0740;

            const weather = await window.MODA_DAILY_REPORTS.fetchWeather(lat, lon, reportDate);
            
            if (weather) {
                setWeatherData(weather);
                setWeatherSource('api');
            } else {
                setError('Could not fetch weather data. Please enter manually.');
                setWeatherSource('manual');
            }
        } catch (err) {
            console.error('Error fetching weather:', err);
            setWeatherSource('manual');
        } finally {
            setIsFetchingWeather(false);
        }
    };

    // Create or update report
    const saveReport = async () => {
        if (!selectedProject || !reportDate) return null;

        setIsSaving(true);
        setError(null);

        try {
            const weatherToSave = weatherSource === 'api' ? weatherData : manualWeather;

            if (reportId) {
                // Update existing
                await window.MODA_DAILY_REPORTS.updateReport(reportId, {
                    weather_source: weatherSource,
                    weather_conditions: weatherToSave,
                    general_notes: generalNotes
                });
                return reportId;
            } else {
                // Create new
                const report = await window.MODA_DAILY_REPORTS.createReport(
                    selectedProject.id,
                    reportDate,
                    {
                        weatherSource,
                        weatherConditions: weatherToSave,
                        generalNotes,
                        sharepointFolderPath: window.MODA_DAILY_REPORTS.generateSharePointPath(
                            selectedProject.name,
                            reportDate
                        )
                    }
                );
                setReportId(report.id);
                return report.id;
            }
        } catch (err) {
            console.error('Error saving report:', err);
            setError(err.message || 'Failed to save report');
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    // Toggle module in report
    const toggleModuleInReport = (module) => {
        const existing = reportModules.find(rm => rm.module_id === module.id);
        
        if (existing) {
            setReportModules(reportModules.filter(rm => rm.module_id !== module.id));
        } else {
            setReportModules([...reportModules, {
                module_id: module.id,
                module: module,
                set_status: 'not_set',
                set_sequence: reportModules.length + 1,
                set_time: null,
                set_by: '',
                notes: ''
            }]);
        }
    };

    // Update module status
    const updateModuleStatus = (moduleId, updates) => {
        setReportModules(reportModules.map(rm => 
            rm.module_id === moduleId ? { ...rm, ...updates } : rm
        ));
    };

    // Reorder modules (for set sequence)
    const reorderModules = (fromIndex, toIndex) => {
        const updated = [...reportModules];
        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, moved);
        
        // Update sequence numbers
        updated.forEach((rm, idx) => {
            rm.set_sequence = idx + 1;
        });
        
        setReportModules(updated);
    };

    // Add issue
    const handleAddIssue = (issueData) => {
        const newIssue = {
            ...issueData,
            id: `temp_${Date.now()}`,
            status: 'open',
            reported_at: new Date().toISOString()
        };
        setIssues([...issues, newIssue]);
        setShowIssueLogger(false);
    };

    // Update issue
    const handleUpdateIssue = (issueId, updates) => {
        setIssues(issues.map(i => i.id === issueId ? { ...i, ...updates } : i));
    };

    // Delete issue
    const handleDeleteIssue = (issueId) => {
        if (confirm('Delete this issue?')) {
            setIssues(issues.filter(i => i.id !== issueId));
        }
    };

    // Filter modules by search
    const filteredModules = useMemo(() => {
        if (!moduleSearch) return projectModules;
        
        const search = moduleSearch.toLowerCase();
        return projectModules.filter(m => {
            const serial = (m.serial_number || '').toLowerCase();
            const blm = (m.blm_id || '').toLowerCase();
            const unit = (m.unit_type || '').toLowerCase();
            return serial.includes(search) || blm.includes(search) || unit.includes(search);
        });
    }, [projectModules, moduleSearch]);

    // Calculate summary stats
    const summary = useMemo(() => {
        const modulesSet = reportModules.filter(rm => rm.set_status === 'set').length;
        const modulesPartial = reportModules.filter(rm => rm.set_status === 'partial').length;
        const modulesNotSet = reportModules.filter(rm => rm.set_status === 'not_set').length;
        const criticalIssues = issues.filter(i => i.severity === 'critical').length;
        const majorIssues = issues.filter(i => i.severity === 'major').length;
        const minorIssues = issues.filter(i => i.severity === 'minor').length;

        return {
            totalModules: reportModules.length,
            modulesSet,
            modulesPartial,
            modulesNotSet,
            totalIssues: issues.length,
            criticalIssues,
            majorIssues,
            minorIssues,
            totalPhotos: generalPhotos.length
        };
    }, [reportModules, issues, generalPhotos]);

    // Validation for each step
    const canProceed = useMemo(() => {
        switch (currentStep) {
            case 1:
                return selectedProject && reportDate;
            case 2:
                return reportModules.length > 0;
            case 3:
                return true; // Issues are optional
            case 4:
                return true; // Photos are optional
            case 5:
                return true;
            default:
                return false;
        }
    }, [currentStep, selectedProject, reportDate, reportModules]);

    // Handle step navigation
    const goToStep = async (step) => {
        if (step > currentStep && !canProceed) return;

        // Save progress when leaving certain steps
        if (currentStep === 1 && step > 1) {
            const savedId = await saveReport();
            if (!savedId) return;
        }

        setCurrentStep(step);
    };

    // Handle final submit
    const handleSubmit = async () => {
        setIsSaving(true);
        setError(null);

        try {
            // Ensure report is saved
            let currentReportId = reportId;
            if (!currentReportId) {
                currentReportId = await saveReport();
                if (!currentReportId) throw new Error('Failed to save report');
            }

            // Save modules
            for (const rm of reportModules) {
                if (rm.id && !rm.id.startsWith('temp_')) {
                    await window.MODA_DAILY_REPORTS.updateReportModule(rm.id, {
                        set_status: rm.set_status,
                        set_time: rm.set_time,
                        set_sequence: rm.set_sequence,
                        set_by: rm.set_by,
                        notes: rm.notes
                    });
                } else {
                    await window.MODA_DAILY_REPORTS.addModuleToReport(currentReportId, rm.module_id, {
                        setStatus: rm.set_status,
                        setTime: rm.set_time,
                        setSequence: rm.set_sequence,
                        setBy: rm.set_by,
                        notes: rm.notes
                    });
                }
            }

            // Save issues
            for (const issue of issues) {
                if (issue.id && !issue.id.startsWith('temp_')) {
                    await window.MODA_DAILY_REPORTS.updateIssue(issue.id, {
                        category: issue.category,
                        subcategory: issue.subcategory,
                        severity: issue.severity,
                        description: issue.description,
                        action_taken: issue.action_taken
                    });
                } else {
                    await window.MODA_DAILY_REPORTS.createIssue(currentReportId, {
                        moduleId: issue.module_id,
                        category: issue.category,
                        subcategory: issue.subcategory,
                        severity: issue.severity,
                        description: issue.description,
                        actionTaken: issue.action_taken
                    });
                }
            }

            // Save photos
            for (const photo of generalPhotos) {
                if (!photo.id || photo.id.startsWith('temp_')) {
                    await window.MODA_DAILY_REPORTS.addPhoto(currentReportId, {
                        photoType: 'general',
                        localData: photo.data || photo.local_data,
                        caption: photo.caption,
                        fileName: photo.file_name
                    });
                }
            }

            // Update general notes
            await window.MODA_DAILY_REPORTS.updateReport(currentReportId, {
                general_notes: generalNotes
            });

            // Call onSubmit callback
            if (onSubmit) {
                onSubmit(currentReportId);
            }

            onClose();
        } catch (err) {
            console.error('Error submitting report:', err);
            setError(err.message || 'Failed to submit report');
        } finally {
            setIsSaving(false);
        }
    };

    // Get weather display
    const getWeatherDisplay = () => {
        const data = weatherSource === 'api' ? weatherData : manualWeather;
        if (!data) return null;

        return (
            <div className="weather-display">
                <div className="weather-temp">
                    <span className="temp-high">{data.temperature_high || '--'}°</span>
                    <span className="temp-separator">/</span>
                    <span className="temp-low">{data.temperature_low || '--'}°</span>
                </div>
                <div className="weather-conditions">{data.conditions || 'Unknown'}</div>
                {data.wind_speed && (
                    <div className="weather-wind">
                        Wind: {data.wind_speed} mph {data.wind_direction || ''}
                    </div>
                )}
            </div>
        );
    };

    // Render step content
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return renderSetupStep();
            case 2:
                return renderModulesStep();
            case 3:
                return renderIssuesStep();
            case 4:
                return renderPhotosStep();
            case 5:
                return renderReviewStep();
            default:
                return null;
        }
    };

    // Step 1: Setup
    const renderSetupStep = () => (
        <div className="wizard-step setup-step">
            <h3>Report Setup</h3>

            {/* Project Selection */}
            <div className="form-group">
                <label>Project</label>
                <select
                    value={selectedProject?.id || ''}
                    onChange={(e) => {
                        const project = projects.find(p => p.id === e.target.value);
                        setSelectedProject(project);
                        setReportModules([]);
                        setIssues([]);
                    }}
                    className="form-select"
                >
                    <option value="">Select Project...</option>
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            {/* Date Selection */}
            <div className="form-group">
                <label>Report Date</label>
                <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="form-input"
                    max={new Date().toISOString().split('T')[0]}
                />
                <p className="form-hint">Typically yesterday's date</p>
            </div>

            {existingReport && (
                <div className="existing-report-notice">
                    <span className="icon-info"></span>
                    <span>A report already exists for this date. You are editing the existing report.</span>
                </div>
            )}

            {/* Weather Section */}
            <div className="form-group weather-section">
                <label>Weather Conditions</label>
                
                <div className="weather-source-toggle">
                    <button
                        type="button"
                        className={`toggle-btn ${weatherSource === 'api' ? 'active' : ''}`}
                        onClick={() => setWeatherSource('api')}
                    >
                        Auto-fetch
                    </button>
                    <button
                        type="button"
                        className={`toggle-btn ${weatherSource === 'manual' ? 'active' : ''}`}
                        onClick={() => setWeatherSource('manual')}
                    >
                        Manual Entry
                    </button>
                </div>

                {weatherSource === 'api' ? (
                    <div className="weather-api-section">
                        {weatherData ? (
                            getWeatherDisplay()
                        ) : (
                            <button
                                type="button"
                                onClick={fetchWeather}
                                disabled={!selectedProject || isFetchingWeather}
                                className="btn-secondary fetch-weather-btn"
                            >
                                {isFetchingWeather ? 'Fetching...' : 'Fetch Weather'}
                            </button>
                        )}
                        {weatherData && (
                            <button
                                type="button"
                                onClick={fetchWeather}
                                className="btn-link refresh-weather"
                            >
                                Refresh
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="weather-manual-section">
                        <div className="weather-grid">
                            <div className="weather-field">
                                <label>High Temp (°F)</label>
                                <input
                                    type="number"
                                    value={manualWeather.temperature_high}
                                    onChange={(e) => setManualWeather({
                                        ...manualWeather,
                                        temperature_high: e.target.value
                                    })}
                                    className="form-input"
                                />
                            </div>
                            <div className="weather-field">
                                <label>Low Temp (°F)</label>
                                <input
                                    type="number"
                                    value={manualWeather.temperature_low}
                                    onChange={(e) => setManualWeather({
                                        ...manualWeather,
                                        temperature_low: e.target.value
                                    })}
                                    className="form-input"
                                />
                            </div>
                            <div className="weather-field">
                                <label>Conditions</label>
                                <select
                                    value={manualWeather.conditions}
                                    onChange={(e) => setManualWeather({
                                        ...manualWeather,
                                        conditions: e.target.value
                                    })}
                                    className="form-select"
                                >
                                    <option value="">Select...</option>
                                    <option value="Clear">Clear</option>
                                    <option value="Partly Cloudy">Partly Cloudy</option>
                                    <option value="Cloudy">Cloudy</option>
                                    <option value="Light Rain">Light Rain</option>
                                    <option value="Rain">Rain</option>
                                    <option value="Heavy Rain">Heavy Rain</option>
                                    <option value="Windy">Windy</option>
                                    <option value="Hot">Hot</option>
                                </select>
                            </div>
                            <div className="weather-field">
                                <label>Wind (mph)</label>
                                <input
                                    type="number"
                                    value={manualWeather.wind_speed}
                                    onChange={(e) => setManualWeather({
                                        ...manualWeather,
                                        wind_speed: e.target.value
                                    })}
                                    className="form-input"
                                />
                            </div>
                        </div>
                        <div className="weather-field full-width">
                            <label>Weather Notes</label>
                            <input
                                type="text"
                                value={manualWeather.notes}
                                onChange={(e) => setManualWeather({
                                    ...manualWeather,
                                    notes: e.target.value
                                })}
                                placeholder="e.g., Morning fog cleared by 9am"
                                className="form-input"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // Step 2: Modules
    const renderModulesStep = () => (
        <div className="wizard-step modules-step">
            <h3>Module Set Status</h3>
            <p className="step-description">
                Select modules that were scheduled for this day and update their set status.
            </p>

            {/* Module Search */}
            <div className="module-search">
                <input
                    type="text"
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                    placeholder="Search modules..."
                    className="search-input"
                />
            </div>

            {/* Available Modules */}
            <div className="modules-section">
                <h4>Available Modules ({filteredModules.length})</h4>
                <div className="module-list available-modules">
                    {filteredModules.map(module => {
                        const isSelected = reportModules.some(rm => rm.module_id === module.id);
                        return (
                            <button
                                key={module.id}
                                type="button"
                                className={`module-chip ${isSelected ? 'selected' : ''}`}
                                onClick={() => toggleModuleInReport(module)}
                            >
                                <span className="module-blm">{module.blm_id || module.unit_type || 'N/A'}</span>
                                <span className="module-serial">{module.serial_number}</span>
                                {isSelected && <span className="check-icon">✓</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Modules with Status */}
            {reportModules.length > 0 && (
                <div className="modules-section">
                    <h4>Selected Modules ({reportModules.length})</h4>
                    <p className="section-hint">Drag to reorder set sequence</p>
                    
                    <div className="selected-modules-list">
                        {reportModules.map((rm, index) => (
                            <div key={rm.module_id} className="selected-module-card">
                                <div className="module-sequence">{rm.set_sequence}</div>
                                
                                <div className="module-info">
                                    <div className="module-primary">
                                        {rm.module?.blm_id || rm.module?.unit_type || 'N/A'}
                                    </div>
                                    <div className="module-secondary">
                                        SN: {rm.module?.serial_number}
                                    </div>
                                </div>

                                <div className="module-status-selector">
                                    {window.MODA_DAILY_REPORTS?.SET_STATUSES.map(status => (
                                        <button
                                            key={status.id}
                                            type="button"
                                            className={`status-btn ${rm.set_status === status.id ? 'active' : ''}`}
                                            style={{
                                                '--status-color': status.color
                                            }}
                                            onClick={() => updateModuleStatus(rm.module_id, { 
                                                set_status: status.id,
                                                set_time: status.id === 'set' ? new Date().toISOString() : rm.set_time
                                            })}
                                        >
                                            {status.label}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    className="remove-module-btn"
                                    onClick={() => toggleModuleInReport(rm.module)}
                                    aria-label="Remove module"
                                >
                                    <span className="icon-close"></span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {reportModules.length === 0 && (
                <div className="empty-state">
                    <p>Select modules from the list above</p>
                </div>
            )}
        </div>
    );

    // Step 3: Issues
    const renderIssuesStep = () => (
        <div className="wizard-step issues-step">
            <h3>Issues Found</h3>
            <p className="step-description">
                Log any issues discovered during the set. Issues can be linked to specific modules.
            </p>

            <button
                type="button"
                className="btn-primary add-issue-btn"
                onClick={() => {
                    setEditingIssue(null);
                    setShowIssueLogger(true);
                }}
            >
                <span className="icon-plus"></span>
                Add Issue
            </button>

            {issues.length > 0 ? (
                <div className="issues-list">
                    {issues.map(issue => {
                        const module = reportModules.find(rm => rm.module_id === issue.module_id)?.module;
                        const categoryInfo = window.MODA_DAILY_REPORTS?.ISSUE_CATEGORIES[issue.category];
                        
                        return (
                            <div key={issue.id} className={`issue-card severity-${issue.severity}`}>
                                <div className="issue-header">
                                    <span className={`severity-badge ${issue.severity}`}>
                                        {issue.severity}
                                    </span>
                                    <span className="issue-category">
                                        {categoryInfo?.label || issue.category}
                                    </span>
                                    {module && (
                                        <span className="issue-module">
                                            {module.blm_id || module.serial_number}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="issue-description">{issue.description}</div>
                                
                                {issue.action_taken && (
                                    <div className="issue-action">
                                        <strong>Action:</strong> {issue.action_taken}
                                    </div>
                                )}

                                <div className="issue-actions">
                                    <button
                                        type="button"
                                        className="btn-link"
                                        onClick={() => {
                                            setEditingIssue(issue);
                                            setShowIssueLogger(true);
                                        }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-link danger"
                                        onClick={() => handleDeleteIssue(issue.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-state">
                    <p>No issues logged yet</p>
                    <p className="hint">If no issues were found, you can proceed to the next step</p>
                </div>
            )}

            {/* Issue Logger Modal */}
            {showIssueLogger && (
                <ReportIssueLogger
                    modules={reportModules.map(rm => rm.module)}
                    initialData={editingIssue}
                    onSubmit={(data) => {
                        if (editingIssue) {
                            handleUpdateIssue(editingIssue.id, data);
                        } else {
                            handleAddIssue(data);
                        }
                        setShowIssueLogger(false);
                    }}
                    onClose={() => setShowIssueLogger(false)}
                />
            )}
        </div>
    );

    // Step 4: Photos
    const renderPhotosStep = () => (
        <div className="wizard-step photos-step">
            <h3>General Photos</h3>
            <p className="step-description">
                Add general site photos not specific to any module or issue.
            </p>

            {window.PhotoCapture && (
                <PhotoCapture
                    photos={generalPhotos.map(p => p.data || p.local_data)}
                    onPhotosChange={(photos) => {
                        setGeneralPhotos(photos.map((data, idx) => ({
                            id: `temp_${Date.now()}_${idx}`,
                            data,
                            photo_type: 'general',
                            file_name: `general_${idx + 1}.jpg`
                        })));
                    }}
                    maxPhotos={10}
                />
            )}

            <div className="form-group">
                <label>General Notes</label>
                <textarea
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="Any additional notes about the day's activities..."
                    className="form-textarea"
                    rows={4}
                />
            </div>
        </div>
    );

    // Step 5: Review
    const renderReviewStep = () => (
        <div className="wizard-step review-step">
            <h3>Review Report</h3>

            {/* Report Header */}
            <div className="review-header">
                <h4>{selectedProject?.name}</h4>
                <div className="review-date">
                    {new Date(reportDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </div>
            </div>

            {/* Weather Summary */}
            <div className="review-section">
                <h5>Weather</h5>
                {getWeatherDisplay() || <p className="no-data">No weather data</p>}
            </div>

            {/* Module Summary */}
            <div className="review-section">
                <h5>Modules</h5>
                <div className="summary-stats">
                    <div className="stat-item">
                        <span className="stat-value">{summary.modulesSet}</span>
                        <span className="stat-label">Set</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{summary.modulesPartial}</span>
                        <span className="stat-label">Partial</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-value">{summary.modulesNotSet}</span>
                        <span className="stat-label">Not Set</span>
                    </div>
                </div>

                <div className="module-summary-list">
                    {reportModules.map(rm => (
                        <div key={rm.module_id} className={`module-summary-item status-${rm.set_status}`}>
                            <span className="module-name">
                                {rm.module?.blm_id || rm.module?.serial_number}
                            </span>
                            <span className={`status-badge ${rm.set_status}`}>
                                {rm.set_status.replace('_', ' ')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Issues Summary */}
            <div className="review-section">
                <h5>Issues ({summary.totalIssues})</h5>
                {summary.totalIssues > 0 ? (
                    <>
                        <div className="summary-stats">
                            <div className="stat-item critical">
                                <span className="stat-value">{summary.criticalIssues}</span>
                                <span className="stat-label">Critical</span>
                            </div>
                            <div className="stat-item major">
                                <span className="stat-value">{summary.majorIssues}</span>
                                <span className="stat-label">Major</span>
                            </div>
                            <div className="stat-item minor">
                                <span className="stat-value">{summary.minorIssues}</span>
                                <span className="stat-label">Minor</span>
                            </div>
                        </div>

                        <div className="issues-summary-list">
                            {issues.map(issue => (
                                <div key={issue.id} className={`issue-summary-item severity-${issue.severity}`}>
                                    <span className={`severity-dot ${issue.severity}`}></span>
                                    <span className="issue-desc">{issue.description.substring(0, 50)}...</span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="no-data">No issues reported</p>
                )}
            </div>

            {/* Photos Summary */}
            <div className="review-section">
                <h5>Photos ({summary.totalPhotos})</h5>
                {summary.totalPhotos > 0 ? (
                    <div className="photo-thumbnails">
                        {generalPhotos.slice(0, 4).map((photo, idx) => (
                            <img
                                key={idx}
                                src={photo.data || photo.local_data}
                                alt={`Photo ${idx + 1}`}
                                className="photo-thumb"
                            />
                        ))}
                        {generalPhotos.length > 4 && (
                            <div className="photo-more">+{generalPhotos.length - 4}</div>
                        )}
                    </div>
                ) : (
                    <p className="no-data">No photos added</p>
                )}
            </div>

            {/* General Notes */}
            {generalNotes && (
                <div className="review-section">
                    <h5>Notes</h5>
                    <p className="notes-text">{generalNotes}</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="daily-report-wizard-overlay">
            <div className="daily-report-wizard">
                {/* Header */}
                <div className="wizard-header">
                    <h2>Daily Set Report</h2>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="close-btn"
                        aria-label="Close"
                    >
                        <span className="icon-close"></span>
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="wizard-progress">
                    {steps.map((step, index) => (
                        <button
                            key={step.id}
                            type="button"
                            className={`progress-step ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
                            onClick={() => goToStep(step.id)}
                            disabled={step.id > currentStep && !canProceed}
                        >
                            <div className="step-indicator">
                                {currentStep > step.id ? (
                                    <span className="check-mark">✓</span>
                                ) : (
                                    <span className="step-number">{step.id}</span>
                                )}
                            </div>
                            <span className="step-label">{step.label}</span>
                        </button>
                    ))}
                </div>

                {/* Error Display */}
                {error && (
                    <div className="wizard-error">
                        <span className="icon-warning"></span>
                        {error}
                        <button type="button" onClick={() => setError(null)} className="dismiss-btn">
                            <span className="icon-close"></span>
                        </button>
                    </div>
                )}

                {/* Step Content */}
                <div className="wizard-content">
                    {isLoading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading...</p>
                        </div>
                    ) : (
                        renderStepContent()
                    )}
                </div>

                {/* Footer Navigation */}
                <div className="wizard-footer">
                    <button
                        type="button"
                        onClick={() => goToStep(currentStep - 1)}
                        disabled={currentStep === 1 || isSaving}
                        className="btn-secondary"
                    >
                        Back
                    </button>

                    <div className="step-indicator-mobile">
                        Step {currentStep} of {steps.length}
                    </div>

                    {currentStep < steps.length ? (
                        <button
                            type="button"
                            onClick={() => goToStep(currentStep + 1)}
                            disabled={!canProceed || isSaving}
                            className="btn-primary"
                        >
                            {isSaving ? 'Saving...' : 'Next'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className="btn-primary submit-btn"
                        >
                            {isSaving ? 'Submitting...' : 'Save Report'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Make component available globally
window.DailyReportWizard = DailyReportWizard;
