// ModuleImportModal - Uses global React and window.MODA_MODULE_IMPORT

function ModuleImportModal({ projectId, onClose, onImportComplete }) {
    const { useState } = React;
    // Get import functions from global
    const { analyzeModuleImport, executeModuleImport, parseModuleCSV } = window.MODA_MODULE_IMPORT || {};
    
    const [step, setStep] = useState('upload');
    const [csvFile, setCsvFile] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [forceOverwrite, setForceOverwrite] = useState(false);
    const [sequenceOnlyMode, setSequenceOnlyMode] = useState(false); // Only update build sequences
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState(null);
    const [expandedUpdates, setExpandedUpdates] = useState(new Set());

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.name.endsWith('.csv')) {
                setError('Please select a CSV file');
                return;
            }
            setCsvFile(file);
            setError(null);
        }
    };

    const handleAnalyze = async () => {
        if (!csvFile) return;

        setImporting(true);
        setError(null);

        try {
            const text = await csvFile.text();
            const { modules, errors } = parseModuleCSV(text);

            if (errors.length > 0) {
                setError(`CSV parsing errors:\n${errors.map(e => `Row ${e.row}: ${e.error}`).join('\n')}`);
                setImporting(false);
                return;
            }

            const analysisResult = await analyzeModuleImport(projectId, modules);
            setAnalysis(analysisResult);
            setStep('verify');
        } catch (err) {
            setError(err.message);
        } finally {
            setImporting(false);
        }
    };

    const handleImport = async () => {
        if (!csvFile || !analysis) return;

        setImporting(true);
        setError(null);

        try {
            const text = await csvFile.text();
            const { modules } = parseModuleCSV(text);

            // Pass sequenceOnlyMode to the import function
            const result = await executeModuleImport(projectId, modules, forceOverwrite, sequenceOnlyMode);

            if (result.errors.length > 0) {
                setError(`Import completed with errors:\n${result.errors.map(e => `${e.serial_number}: ${e.error}`).join('\n')}`);
            }

            onImportComplete({
                inserted: result.inserted,
                updated: result.updated,
                errors: result.errors,
                sequenceOnlyMode: sequenceOnlyMode
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setImporting(false);
        }
    };

    const toggleUpdateExpanded = (serialNumber) => {
        const newExpanded = new Set(expandedUpdates);
        if (newExpanded.has(serialNumber)) {
            newExpanded.delete(serialNumber);
        } else {
            newExpanded.add(serialNumber);
        }
        setExpandedUpdates(newExpanded);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Import Modules from CSV</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {step === 'upload' && (
                        <div className="import-upload-step">
                            <div className="import-instructions">
                                <h3>CSV Format Requirements</h3>
                                <p>Your CSV file must include the following columns:</p>
                                <ul>
                                    <li><strong>Serial Number</strong> (required) - Unique identifier for each module</li>
                                    <li><strong>Build Sequence</strong> (optional) - Numeric build order</li>
                                    <li><strong>BLM ID</strong> (optional) - Building/Level/Module identifier</li>
                                    <li><strong>Unit Type</strong> (optional) - Module type (Studio, 1BR, etc.)</li>
                                </ul>
                                <p className="import-note">
                                    <strong>Smart Import:</strong> Existing modules will only have empty fields updated. 
                                    Check "Force Overwrite" to replace all data.
                                </p>
                                <p className="import-note" style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '4px' }}>
                                    <strong>Update Sequences Only:</strong> Check this option to ONLY update Build Sequence numbers 
                                    without changing any other module data. Useful for correcting sequence errors.
                                </p>
                            </div>

                            <div className="file-upload-area">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileSelect}
                                    id="csv-file-input"
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="csv-file-input" className="file-upload-label">
                                    <div className="icon-upload"></div>
                                    <span>{csvFile ? csvFile.name : 'Choose CSV File'}</span>
                                </label>
                            </div>

                            {error && (
                                <div className="alert alert-error" style={{ whiteSpace: 'pre-wrap' }}>
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'verify' && analysis && (
                        <div className="import-verify-step">
                            <div className="import-summary">
                                <div className="summary-card summary-new">
                                    <div className="summary-icon icon-add"></div>
                                    <div className="summary-content">
                                        <div className="summary-count">{analysis.new_modules.length}</div>
                                        <div className="summary-label">New Modules</div>
                                    </div>
                                </div>

                                <div className="summary-card summary-update">
                                    <div className="summary-icon icon-edit"></div>
                                    <div className="summary-content">
                                        <div className="summary-count">{analysis.updates.length}</div>
                                        <div className="summary-label">Updates</div>
                                    </div>
                                </div>

                                <div className="summary-card summary-error">
                                    <div className="summary-icon icon-warning"></div>
                                    <div className="summary-content">
                                        <div className="summary-count">
                                            {analysis.duplicates_in_csv.length + analysis.errors.length}
                                        </div>
                                        <div className="summary-label">Issues</div>
                                    </div>
                                </div>
                            </div>

                            {analysis.duplicates_in_csv.length > 0 && (
                                <div className="alert alert-warning">
                                    <strong>Duplicate Serial Numbers in CSV:</strong>
                                    <ul>
                                        {analysis.duplicates_in_csv.map(dup => (
                                            <li key={dup.serial_number}>
                                                {dup.serial_number} (appears {dup.count} times)
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {analysis.errors.length > 0 && (
                                <div className="alert alert-error">
                                    <strong>CSV Errors:</strong>
                                    <ul>
                                        {analysis.errors.map((err, idx) => (
                                            <li key={idx}>Row {err.row}: {err.error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {analysis.updates.length > 0 && (
                                <div className="import-updates-section">
                                    <h3>Modules to Update ({analysis.updates.length})</h3>
                                    <div className="import-option">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={sequenceOnlyMode}
                                                onChange={(e) => {
                                                    setSequenceOnlyMode(e.target.checked);
                                                    if (e.target.checked) setForceOverwrite(false);
                                                }}
                                            />
                                            <span style={{ fontWeight: sequenceOnlyMode ? 'bold' : 'normal', color: sequenceOnlyMode ? '#b45309' : 'inherit' }}>
                                                Update Build Sequences Only (ignore all other fields)
                                            </span>
                                        </label>
                                    </div>
                                    {!sequenceOnlyMode && (
                                        <div className="import-option">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={forceOverwrite}
                                                    onChange={(e) => setForceOverwrite(e.target.checked)}
                                                />
                                                <span>Force Overwrite (replace existing data instead of filling blanks)</span>
                                            </label>
                                        </div>
                                    )}

                                    <div className="updates-list">
                                        {analysis.updates.slice(0, 10).map((update) => (
                                            <div key={update.existing.serial_number} className="update-item">
                                                <div 
                                                    className="update-header"
                                                    onClick={() => toggleUpdateExpanded(update.existing.serial_number)}
                                                >
                                                    <span className="update-serial">{update.existing.serial_number}</span>
                                                    <span className="update-changes-count">
                                                        {Object.keys(update.changes).length} field(s) will change
                                                    </span>
                                                    <span className={`update-toggle ${expandedUpdates.has(update.existing.serial_number) ? 'expanded' : ''}`}>
                                                        ▼
                                                    </span>
                                                </div>

                                                {expandedUpdates.has(update.existing.serial_number) && (
                                                    <div className="update-details">
                                                        <table className="changes-table">
                                                            <thead>
                                                                <tr>
                                                                    <th>Field</th>
                                                                    <th>Current</th>
                                                                    <th>New</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {Object.entries(update.changes).map(([field, change]) => (
                                                                    <tr key={field}>
                                                                        <td className="field-name">{field.replace(/_/g, ' ')}</td>
                                                                        <td className="old-value">{change.old || '(empty)'}</td>
                                                                        <td className="new-value">{change.new}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {analysis.updates.length > 10 && (
                                            <div className="updates-more">
                                                + {analysis.updates.length - 10} more updates...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="alert alert-error" style={{ whiteSpace: 'pre-wrap' }}>
                                    {error}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    {step === 'upload' && (
                        <>
                            <button className="btn btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button 
                                className="btn btn-primary" 
                                onClick={handleAnalyze}
                                disabled={!csvFile || importing}
                            >
                                {importing ? 'Analyzing...' : 'Analyze CSV'}
                            </button>
                        </>
                    )}

                    {step === 'verify' && (
                        <>
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => {
                                    setStep('upload');
                                    setAnalysis(null);
                                    setError(null);
                                }}
                            >
                                Back
                            </button>
                            <button 
                                className="btn btn-primary" 
                                onClick={handleImport}
                                disabled={importing || (analysis.duplicates_in_csv.length > 0)}
                            >
                                {importing ? 'Importing...' : `Import ${analysis.new_modules.length + analysis.updates.length} Modules`}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Expose globally for use in App.jsx
window.ModuleImportModal = ModuleImportModal;
