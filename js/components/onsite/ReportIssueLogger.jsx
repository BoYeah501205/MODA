/**
 * ReportIssueLogger Component
 * 
 * Simplified issue logger for use within the DailyReportWizard.
 * Mobile-optimized with category/subcategory selection.
 */

const { useState, useEffect } = React;

function ReportIssueLogger({
    modules = [],
    initialData = null,
    onSubmit,
    onClose
}) {
    // Form state
    const [selectedModule, setSelectedModule] = useState(initialData?.module_id || null);
    const [category, setCategory] = useState(initialData?.category || '');
    const [subcategory, setSubcategory] = useState(initialData?.subcategory || '');
    const [severity, setSeverity] = useState(initialData?.severity || 'minor');
    const [description, setDescription] = useState(initialData?.description || '');
    const [actionTaken, setActionTaken] = useState(initialData?.action_taken || '');
    const [photos, setPhotos] = useState(initialData?.photos || []);

    // Get constants
    const ISSUE_CATEGORIES = window.MODA_DAILY_REPORTS?.ISSUE_CATEGORIES || {};
    const SEVERITY_LEVELS = window.MODA_DAILY_REPORTS?.SEVERITY_LEVELS || [];

    // Get subcategories for selected category
    const subcategories = category ? (ISSUE_CATEGORIES[category]?.subcategories || []) : [];

    // Reset subcategory when category changes
    useEffect(() => {
        if (!subcategories.find(s => s.id === subcategory)) {
            setSubcategory('');
        }
    }, [category]);

    // Validation
    const isValid = category && description.trim().length >= 10;

    // Handle submit
    const handleSubmit = () => {
        if (!isValid) return;

        onSubmit({
            module_id: selectedModule,
            category,
            subcategory: subcategory || null,
            severity,
            description: description.trim(),
            action_taken: actionTaken.trim() || null,
            photos
        });
    };

    return (
        <div className="issue-logger-overlay" onClick={onClose}>
            <div className="issue-logger-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="issue-logger-header">
                    <h3>{initialData ? 'Edit Issue' : 'Log Issue'}</h3>
                    <button type="button" onClick={onClose} className="close-btn">
                        <span className="icon-close"></span>
                    </button>
                </div>

                <div className="issue-logger-content">
                    {/* Module Selection (Optional) */}
                    <div className="form-group">
                        <label>Module (Optional)</label>
                        <select
                            value={selectedModule || ''}
                            onChange={(e) => setSelectedModule(e.target.value || null)}
                            className="form-select"
                        >
                            <option value="">General / Site Issue</option>
                            {modules.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.blm_id || m.unit_type || 'N/A'} - {m.serial_number}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Category Selection */}
                    <div className="form-group">
                        <label>Category *</label>
                        <div className="category-grid">
                            {Object.entries(ISSUE_CATEGORIES).map(([key, cat]) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={`category-btn ${category === key ? 'selected' : ''}`}
                                    onClick={() => setCategory(key)}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Subcategory Selection */}
                    {subcategories.length > 0 && (
                        <div className="form-group">
                            <label>Subcategory</label>
                            <div className="subcategory-grid">
                                {subcategories.map(sub => (
                                    <button
                                        key={sub.id}
                                        type="button"
                                        className={`subcategory-btn ${subcategory === sub.id ? 'selected' : ''}`}
                                        onClick={() => setSubcategory(sub.id)}
                                    >
                                        {sub.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Severity Selection */}
                    <div className="form-group">
                        <label>Severity *</label>
                        <div className="severity-selector">
                            {SEVERITY_LEVELS.map(level => (
                                <button
                                    key={level.id}
                                    type="button"
                                    className={`severity-btn ${severity === level.id ? 'selected' : ''}`}
                                    style={{ '--severity-color': level.color }}
                                    onClick={() => setSeverity(level.id)}
                                >
                                    <span className="severity-label">{level.label}</span>
                                    <span className="severity-desc">{level.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label>Description * (min 10 characters)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the issue in detail..."
                            className="form-textarea"
                            rows={3}
                        />
                        <span className="char-count">{description.length} characters</span>
                    </div>

                    {/* Action Taken */}
                    <div className="form-group">
                        <label>Action Taken</label>
                        <textarea
                            value={actionTaken}
                            onChange={(e) => setActionTaken(e.target.value)}
                            placeholder="What action was taken to address this issue?"
                            className="form-textarea"
                            rows={2}
                        />
                    </div>

                    {/* Photos */}
                    <div className="form-group">
                        <label>Photos</label>
                        {window.PhotoCapture && (
                            <PhotoCapture
                                photos={photos}
                                onPhotosChange={setPhotos}
                                maxPhotos={5}
                            />
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="issue-logger-footer">
                    <button type="button" onClick={onClose} className="btn-secondary">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!isValid}
                        className="btn-primary"
                    >
                        {initialData ? 'Update Issue' : 'Add Issue'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Make component available globally
window.ReportIssueLogger = ReportIssueLogger;
