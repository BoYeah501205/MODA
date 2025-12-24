/**
 * IssueLogger Component for MODA On-Site Reports
 * 
 * 3-step wizard for logging module issues quickly:
 * Step 1: Select Module
 * Step 2: Issue Details (type, description, photos)
 * Step 3: Review & Submit
 * 
 * Target: Complete issue logging in <37 seconds
 * Mobile-optimized with 44px minimum touch targets
 */

const { useState, useEffect, useRef } = React;

function IssueLogger({
    reportId,
    modules = [],
    onSubmit,
    onClose,
    initialModule = null
}) {
    // Wizard state
    const [currentStep, setCurrentStep] = useState(initialModule ? 2 : 1);
    const [startTime] = useState(Date.now());
    const [elapsedTime, setElapsedTime] = useState(0);
    
    // Form state
    const [selectedModule, setSelectedModule] = useState(initialModule);
    const [moduleSearch, setModuleSearch] = useState('');
    const [issueType, setIssueType] = useState('');
    const [severity, setSeverity] = useState('minor');
    const [trade, setTrade] = useState('');
    const [description, setDescription] = useState('');
    const [actionTaken, setActionTaken] = useState('');
    const [photos, setPhotos] = useState([]);
    
    // Submission state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Timer effect
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, [startTime]);

    // Format elapsed time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Filter modules based on search
    const filteredModules = modules.filter(m => {
        if (!moduleSearch) return true;
        const search = moduleSearch.toLowerCase();
        const serial = (m.serial_number || m.serialNumber || '').toLowerCase();
        const blm = (m.blm_id || m.hitchBLM || '').toLowerCase();
        const unit = (m.unit_type || m.hitchUnit || '').toLowerCase();
        return serial.includes(search) || blm.includes(search) || unit.includes(search);
    });

    // Get display name for module
    const getModuleDisplayName = (module) => {
        if (!module) return '';
        const serial = module.serial_number || module.serialNumber || 'Unknown';
        const blm = module.blm_id || module.hitchBLM || '';
        const unit = module.unit_type || module.hitchUnit || '';
        return `${blm || unit} - SN# ${serial}`;
    };

    // Validation
    const canProceedToStep2 = selectedModule !== null;
    const canProceedToStep3 = issueType && description.trim().length >= 10;
    const canSubmit = canProceedToStep2 && canProceedToStep3;

    // Handle submit
    const handleSubmit = async () => {
        if (!canSubmit || isSubmitting) return;
        
        setIsSubmitting(true);
        setError(null);

        try {
            const issueData = {
                report_id: reportId,
                module_id: selectedModule.id,
                issue_type: issueType,
                severity: severity,
                trade: trade || null,
                description: description.trim(),
                action_taken: actionTaken.trim() || null,
                photos: photos
            };

            await onSubmit(issueData);
        } catch (err) {
            console.error('Error submitting issue:', err);
            setError(err.message || 'Failed to submit issue');
            setIsSubmitting(false);
        }
    };

    // Get constants from MODA_ONSITE
    const ISSUE_TYPES = window.MODA_ONSITE?.ISSUE_TYPES || [
        { id: 'quality', label: 'Quality Defect', iconClass: 'icon-quality-issue' },
        { id: 'material', label: 'Material Shortage', iconClass: 'icon-material-issue' },
        { id: 'question', label: 'Question', iconClass: 'icon-question' },
        { id: 'site', label: 'Site Issue', iconClass: 'icon-site-issue' },
        { id: 'transit', label: 'Transit Damage', iconClass: 'icon-transit-issue' },
        { id: 'drawing', label: 'Drawing Issue', iconClass: 'icon-drawing-issue' },
        { id: 'other', label: 'Other', iconClass: 'icon-other' }
    ];

    const SEVERITY_LEVELS = window.MODA_ONSITE?.SEVERITY_LEVELS || [
        { id: 'critical', label: 'Critical', color: '#DC2626', description: 'Stops work' },
        { id: 'major', label: 'Major', color: '#EA580C', description: 'Needs fix' },
        { id: 'minor', label: 'Minor', color: '#16A34A', description: 'Cosmetic' }
    ];

    const TRADES = window.MODA_ONSITE?.TRADES || [
        'Drywall', 'Electrical', 'Plumbing', 'HVAC', 'Framing',
        'Roofing', 'Exterior', 'Flooring', 'Cabinets', 'Windows/Doors',
        'Insulation', 'Paint', 'Structural', 'Other'
    ];

    return (
        <div className="issue-logger-overlay">
            <div className="issue-logger-modal">
                {/* Header */}
                <div className="issue-logger-header">
                    <div className="header-left">
                        <h2>Log Issue</h2>
                        <div className={`timer ${elapsedTime > 37 ? 'over-target' : ''}`}>
                            <span className="icon-timer" style={{ width: '16px', height: '16px', display: 'inline-block', marginRight: '4px' }}></span>
                            {formatTime(elapsedTime)}
                            {elapsedTime <= 37 && <span className="target-hint">Target: 0:37</span>}
                        </div>
                    </div>
                    <button onClick={onClose} className="close-btn" type="button">
                        <span className="icon-close" style={{ width: '24px', height: '24px', display: 'block' }}></span>
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="step-progress">
                    {[1, 2, 3].map(step => (
                        <div 
                            key={step}
                            className={`step-item ${currentStep === step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
                        >
                            <div className="step-number">{currentStep > step ? '✓' : step}</div>
                            <div className="step-label">
                                {step === 1 ? 'Module' : step === 2 ? 'Details' : 'Review'}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="step-content">
                    {/* Step 1: Module Selection */}
                    {currentStep === 1 && (
                        <div className="step-panel">
                            <h3>Select Module</h3>
                            
                            {/* Search */}
                            <div className="search-box">
                                <input
                                    type="text"
                                    placeholder="Search by serial, BLM, or unit..."
                                    value={moduleSearch}
                                    onChange={(e) => setModuleSearch(e.target.value)}
                                    className="search-input"
                                    autoFocus
                                />
                            </div>

                            {/* Module List */}
                            <div className="module-list">
                                {filteredModules.length === 0 ? (
                                    <div className="empty-state">
                                        No modules found
                                    </div>
                                ) : (
                                    filteredModules.map(module => (
                                        <button
                                            key={module.id}
                                            onClick={() => setSelectedModule(module)}
                                            className={`module-option ${selectedModule?.id === module.id ? 'selected' : ''}`}
                                            type="button"
                                        >
                                            <div className="module-serial">
                                                {module.serial_number || module.serialNumber}
                                            </div>
                                            <div className="module-details">
                                                {module.blm_id || module.hitchBLM}
                                                {(module.unit_type || module.hitchUnit) && 
                                                    ` • ${module.unit_type || module.hitchUnit}`}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Issue Details */}
                    {currentStep === 2 && (
                        <div className="step-panel">
                            <h3>Issue Details</h3>
                            
                            {/* Selected Module Display */}
                            <div className="selected-module-display">
                                <span className="label">Module:</span>
                                <span className="value">{getModuleDisplayName(selectedModule)}</span>
                                <button 
                                    onClick={() => setCurrentStep(1)} 
                                    className="change-btn"
                                    type="button"
                                >
                                    Change
                                </button>
                            </div>

                            {/* Issue Type */}
                            <div className="form-group">
                                <label className="form-label required">Issue Type</label>
                                <div className="issue-type-grid">
                                    {ISSUE_TYPES.map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setIssueType(type.id)}
                                            className={`issue-type-btn ${issueType === type.id ? 'selected' : ''}`}
                                            type="button"
                                        >
                                            <span 
                                                className={type.iconClass} 
                                                style={{ width: '24px', height: '24px', display: 'block', margin: '0 auto 4px' }}
                                            ></span>
                                            <span className="type-label">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Severity */}
                            <div className="form-group">
                                <label className="form-label">Severity</label>
                                <div className="severity-options">
                                    {SEVERITY_LEVELS.map(level => (
                                        <button
                                            key={level.id}
                                            onClick={() => setSeverity(level.id)}
                                            className={`severity-btn ${severity === level.id ? 'selected' : ''}`}
                                            style={{ 
                                                '--severity-color': level.color,
                                                borderColor: severity === level.id ? level.color : '#e5e7eb'
                                            }}
                                            type="button"
                                        >
                                            <span className="severity-label">{level.label}</span>
                                            <span className="severity-desc">{level.description}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Trade (optional) */}
                            <div className="form-group">
                                <label className="form-label">Trade (optional)</label>
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
                            <div className="form-group">
                                <label className="form-label required">
                                    Description
                                    <span className="char-count">{description.length}/10 min</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe the issue..."
                                    className="form-textarea"
                                    rows={3}
                                />
                            </div>

                            {/* Action Taken (optional) */}
                            <div className="form-group">
                                <label className="form-label">Action Taken (optional)</label>
                                <textarea
                                    value={actionTaken}
                                    onChange={(e) => setActionTaken(e.target.value)}
                                    placeholder="What was done to address this?"
                                    className="form-textarea"
                                    rows={2}
                                />
                            </div>

                            {/* Photos */}
                            <div className="form-group">
                                <label className="form-label">Photos (max 5)</label>
                                {window.PhotoCapture && (
                                    <PhotoCapture
                                        photos={photos}
                                        onPhotosChange={setPhotos}
                                        maxPhotos={5}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {currentStep === 3 && (
                        <div className="step-panel">
                            <h3>Review & Submit</h3>
                            
                            {error && (
                                <div className="error-message">
                                    {error}
                                </div>
                            )}

                            <div className="review-section">
                                <div className="review-item">
                                    <span className="review-label">Module</span>
                                    <span className="review-value">{getModuleDisplayName(selectedModule)}</span>
                                </div>
                                
                                <div className="review-item">
                                    <span className="review-label">Issue Type</span>
                                    <span className="review-value">
                                        {ISSUE_TYPES.find(t => t.id === issueType)?.label || issueType}
                                    </span>
                                </div>
                                
                                <div className="review-item">
                                    <span className="review-label">Severity</span>
                                    <span 
                                        className="review-value severity-badge"
                                        style={{ 
                                            color: SEVERITY_LEVELS.find(s => s.id === severity)?.color 
                                        }}
                                    >
                                        {SEVERITY_LEVELS.find(s => s.id === severity)?.label || severity}
                                    </span>
                                </div>
                                
                                {trade && (
                                    <div className="review-item">
                                        <span className="review-label">Trade</span>
                                        <span className="review-value">{trade}</span>
                                    </div>
                                )}
                                
                                <div className="review-item full-width">
                                    <span className="review-label">Description</span>
                                    <p className="review-text">{description}</p>
                                </div>
                                
                                {actionTaken && (
                                    <div className="review-item full-width">
                                        <span className="review-label">Action Taken</span>
                                        <p className="review-text">{actionTaken}</p>
                                    </div>
                                )}
                                
                                {photos.length > 0 && (
                                    <div className="review-item full-width">
                                        <span className="review-label">Photos ({photos.length})</span>
                                        <div className="review-photos">
                                            {photos.map((photo, idx) => (
                                                <img 
                                                    key={idx} 
                                                    src={photo} 
                                                    alt={`Photo ${idx + 1}`}
                                                    className="review-photo"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Time summary */}
                            <div className={`time-summary ${elapsedTime <= 37 ? 'success' : 'warning'}`}>
                                {elapsedTime <= 37 
                                    ? `Great! Completed in ${formatTime(elapsedTime)}`
                                    : `Time: ${formatTime(elapsedTime)} (target was 0:37)`
                                }
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="issue-logger-footer">
                    {currentStep > 1 && (
                        <button
                            onClick={() => setCurrentStep(currentStep - 1)}
                            className="btn-secondary"
                            type="button"
                            disabled={isSubmitting}
                        >
                            Back
                        </button>
                    )}
                    
                    <div className="footer-spacer"></div>
                    
                    {currentStep < 3 ? (
                        <button
                            onClick={() => setCurrentStep(currentStep + 1)}
                            className="btn-primary"
                            type="button"
                            disabled={currentStep === 1 ? !canProceedToStep2 : !canProceedToStep3}
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            className="btn-submit"
                            type="button"
                            disabled={!canSubmit || isSubmitting}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Issue'}
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                .issue-logger-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 9000;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                }

                .issue-logger-modal {
                    background: white;
                    width: 100%;
                    max-width: 600px;
                    max-height: 95vh;
                    border-radius: 16px 16px 0 0;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                @media (min-width: 640px) {
                    .issue-logger-overlay {
                        align-items: center;
                        padding: 20px;
                    }
                    .issue-logger-modal {
                        border-radius: 16px;
                        max-height: 90vh;
                    }
                }

                .issue-logger-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px;
                    border-bottom: 1px solid #e5e7eb;
                    background: #f9fafb;
                }

                .header-left h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: #111827;
                }

                .timer {
                    display: flex;
                    align-items: center;
                    font-size: 14px;
                    color: #16A34A;
                    font-weight: 500;
                    margin-top: 4px;
                }

                .timer.over-target {
                    color: #DC2626;
                }

                .target-hint {
                    font-size: 11px;
                    color: #9ca3af;
                    margin-left: 8px;
                }

                .close-btn {
                    background: none;
                    border: none;
                    padding: 8px;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: background 0.2s;
                }

                .close-btn:hover {
                    background: #e5e7eb;
                }

                /* Step Progress */
                .step-progress {
                    display: flex;
                    justify-content: center;
                    gap: 40px;
                    padding: 16px 20px;
                    border-bottom: 1px solid #e5e7eb;
                }

                .step-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                }

                .step-number {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: 600;
                    background: #e5e7eb;
                    color: #6b7280;
                    transition: all 0.2s;
                }

                .step-item.active .step-number {
                    background: #0057B8;
                    color: white;
                }

                .step-item.completed .step-number {
                    background: #16A34A;
                    color: white;
                }

                .step-label {
                    font-size: 12px;
                    color: #6b7280;
                }

                .step-item.active .step-label {
                    color: #0057B8;
                    font-weight: 500;
                }

                /* Step Content */
                .step-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                }

                .step-panel h3 {
                    margin: 0 0 16px;
                    font-size: 16px;
                    font-weight: 600;
                    color: #111827;
                }

                /* Module Selection */
                .search-box {
                    margin-bottom: 12px;
                }

                .search-input {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                }

                .search-input:focus {
                    outline: none;
                    border-color: #0057B8;
                }

                .module-list {
                    max-height: 300px;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .module-option {
                    width: 100%;
                    padding: 12px 16px;
                    background: white;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .module-option:hover {
                    border-color: #0057B8;
                    background: #f0f7ff;
                }

                .module-option.selected {
                    border-color: #0057B8;
                    background: #e0f0ff;
                }

                .module-serial {
                    font-size: 15px;
                    font-weight: 600;
                    color: #111827;
                }

                .module-details {
                    font-size: 13px;
                    color: #6b7280;
                    margin-top: 2px;
                }

                /* Selected Module Display */
                .selected-module-display {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 12px 16px;
                    background: #f0f7ff;
                    border: 1px solid #0057B8;
                    border-radius: 8px;
                    margin-bottom: 16px;
                }

                .selected-module-display .label {
                    font-size: 13px;
                    color: #6b7280;
                }

                .selected-module-display .value {
                    flex: 1;
                    font-size: 14px;
                    font-weight: 500;
                    color: #111827;
                }

                .change-btn {
                    padding: 6px 12px;
                    background: white;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .change-btn:hover {
                    background: #f9fafb;
                    border-color: #9ca3af;
                }

                /* Form Groups */
                .form-group {
                    margin-bottom: 16px;
                }

                .form-label {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 13px;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 8px;
                }

                .form-label.required::after {
                    content: '*';
                    color: #DC2626;
                    margin-left: 4px;
                }

                .char-count {
                    font-weight: 400;
                    color: #9ca3af;
                }

                /* Issue Type Grid */
                .issue-type-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 8px;
                }

                @media (max-width: 480px) {
                    .issue-type-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }

                .issue-type-btn {
                    padding: 12px 8px;
                    background: white;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                }

                .issue-type-btn:hover {
                    border-color: #0057B8;
                    background: #f0f7ff;
                }

                .issue-type-btn.selected {
                    border-color: #0057B8;
                    background: #e0f0ff;
                }

                .type-label {
                    font-size: 11px;
                    color: #374151;
                    display: block;
                }

                /* Severity Options */
                .severity-options {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                }

                .severity-btn {
                    padding: 12px;
                    background: white;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                }

                .severity-btn:hover {
                    border-color: var(--severity-color);
                }

                .severity-btn.selected {
                    background: color-mix(in srgb, var(--severity-color) 10%, white);
                }

                .severity-label {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--severity-color);
                }

                .severity-desc {
                    display: block;
                    font-size: 11px;
                    color: #6b7280;
                    margin-top: 2px;
                }

                /* Form Inputs */
                .form-select, .form-textarea {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 14px;
                    transition: border-color 0.2s;
                    font-family: inherit;
                }

                .form-select:focus, .form-textarea:focus {
                    outline: none;
                    border-color: #0057B8;
                }

                .form-textarea {
                    resize: vertical;
                    min-height: 80px;
                }

                /* Review Section */
                .review-section {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                .review-item {
                    padding: 12px;
                    background: #f9fafb;
                    border-radius: 8px;
                }

                .review-item.full-width {
                    grid-column: 1 / -1;
                }

                .review-label {
                    display: block;
                    font-size: 11px;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                }

                .review-value {
                    font-size: 14px;
                    font-weight: 500;
                    color: #111827;
                }

                .review-text {
                    font-size: 14px;
                    color: #374151;
                    margin: 0;
                    line-height: 1.5;
                }

                .review-photos {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    margin-top: 8px;
                }

                .review-photo {
                    width: 60px;
                    height: 60px;
                    object-fit: cover;
                    border-radius: 6px;
                }

                .time-summary {
                    margin-top: 16px;
                    padding: 12px;
                    border-radius: 8px;
                    text-align: center;
                    font-size: 14px;
                    font-weight: 500;
                }

                .time-summary.success {
                    background: #DCFCE7;
                    color: #16A34A;
                }

                .time-summary.warning {
                    background: #FEF3C7;
                    color: #D97706;
                }

                .error-message {
                    padding: 12px;
                    background: #FEE2E2;
                    color: #DC2626;
                    border-radius: 8px;
                    margin-bottom: 16px;
                    font-size: 14px;
                }

                .empty-state {
                    padding: 40px 20px;
                    text-align: center;
                    color: #6b7280;
                }

                /* Footer */
                .issue-logger-footer {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 20px;
                    border-top: 1px solid #e5e7eb;
                    background: #f9fafb;
                }

                .footer-spacer {
                    flex: 1;
                }

                .btn-secondary, .btn-primary, .btn-submit {
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    min-height: 44px;
                }

                .btn-secondary {
                    background: white;
                    border: 2px solid #d1d5db;
                    color: #374151;
                }

                .btn-secondary:hover:not(:disabled) {
                    background: #f9fafb;
                    border-color: #9ca3af;
                }

                .btn-primary {
                    background: #0057B8;
                    border: 2px solid #0057B8;
                    color: white;
                }

                .btn-primary:hover:not(:disabled) {
                    background: #004494;
                    border-color: #004494;
                }

                .btn-submit {
                    background: #16A34A;
                    border: 2px solid #16A34A;
                    color: white;
                }

                .btn-submit:hover:not(:disabled) {
                    background: #15803D;
                    border-color: #15803D;
                }

                .btn-secondary:disabled, .btn-primary:disabled, .btn-submit:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
}

// Make component available globally
window.IssueLogger = IssueLogger;
