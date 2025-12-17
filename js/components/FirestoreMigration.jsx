// Firestore Migration Panel
// Admin tool to migrate localStorage data to Firestore

function FirestoreMigrationPanel({ onClose }) {
    const [status, setStatus] = React.useState('idle'); // idle, migrating, success, error
    const [results, setResults] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [localData, setLocalData] = React.useState(null);

    // Check localStorage data on mount
    React.useEffect(() => {
        let projects = [];
        let employees = [];
        try {
            const savedProjects = localStorage.getItem('autovol_projects');
            if (savedProjects && savedProjects !== 'undefined' && savedProjects !== 'null') {
                projects = JSON.parse(savedProjects);
            }
            const savedEmployees = localStorage.getItem('autovol_employees');
            if (savedEmployees && savedEmployees !== 'undefined' && savedEmployees !== 'null') {
                employees = JSON.parse(savedEmployees);
            }
        } catch (e) {
            console.error('[FirestoreMigration] Error parsing localStorage:', e);
        }
        
        setLocalData({
            projects: projects.length,
            employees: employees.length
        });
    }, []);

    const handleMigrate = async () => {
        setStatus('migrating');
        setError(null);
        
        try {
            if (!window.MODA_FIREBASE_DATA) {
                throw new Error('Firebase Data Layer not initialized');
            }

            console.log('[Migration] Starting full migration...');
            const migrationResults = await window.MODA_FIREBASE_DATA.migration.importAll();
            
            setResults(migrationResults);
            setStatus('success');
            console.log('[Migration] Complete:', migrationResults);
        } catch (err) {
            console.error('[Migration] Error:', err);
            setError(err.message);
            setStatus('error');
        }
    };

    const handleMigrateProjects = async () => {
        setStatus('migrating');
        setError(null);
        
        try {
            const result = await window.MODA_FIREBASE_DATA.migration.importProjectsFromLocalStorage();
            setResults({ projects: result });
            setStatus('success');
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    const handleMigrateEmployees = async () => {
        setStatus('migrating');
        setError(null);
        
        try {
            const result = await window.MODA_FIREBASE_DATA.migration.importEmployeesFromLocalStorage();
            setResults({ employees: result });
            setStatus('success');
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-autovol-navy">
                        🔄 Firestore Migration Tool
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                        ×
                    </button>
                </div>

                {/* Current Data Status */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-blue-900 mb-2">📊 Current localStorage Data</h3>
                    {localData && (
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-blue-700 font-medium">Projects:</span>
                                <span className="ml-2 font-bold">{localData.projects}</span>
                            </div>
                            <div>
                                <span className="text-blue-700 font-medium">Employees:</span>
                                <span className="ml-2 font-bold">{localData.employees}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Warning */}
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-2">
                        <span className="text-xl">⚠️</span>
                        <div className="text-sm text-amber-800">
                            <p className="font-semibold mb-1">Important Notes:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>This will copy data from localStorage to Firestore</li>
                                <li>Existing Firestore data will NOT be deleted</li>
                                <li>Duplicates may occur if you run this multiple times</li>
                                <li>localStorage data will remain as backup</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Migration Buttons */}
                {status === 'idle' && (
                    <div className="space-y-3">
                        <button
                            onClick={handleMigrate}
                            disabled={!localData || (localData.projects === 0 && localData.employees === 0)}
                            className="w-full py-3 px-4 bg-autovol-teal text-white rounded-lg font-semibold hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            🚀 Migrate All Data to Firestore
                        </button>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleMigrateProjects}
                                disabled={!localData || localData.projects === 0}
                                className="py-2 px-4 border-2 border-autovol-teal text-autovol-teal rounded-lg font-semibold hover:bg-teal-50 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                📋 Projects Only
                            </button>
                            <button
                                onClick={handleMigrateEmployees}
                                disabled={!localData || localData.employees === 0}
                                className="py-2 px-4 border-2 border-autovol-teal text-autovol-teal rounded-lg font-semibold hover:bg-teal-50 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                                👥 Employees Only
                            </button>
                        </div>
                    </div>
                )}

                {/* Migrating Status */}
                {status === 'migrating' && (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-autovol-teal border-t-transparent mb-4"></div>
                        <p className="text-lg font-semibold text-gray-700">Migrating data to Firestore...</p>
                        <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
                    </div>
                )}

                {/* Success Status */}
                {status === 'success' && results && (
                    <div className="bg-green-50 border border-green-300 rounded-lg p-6">
                        <div className="text-center mb-4">
                            <div className="text-5xl mb-2">✅</div>
                            <h3 className="text-xl font-bold text-green-900">Migration Complete!</h3>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                            {results.projects && (
                                <div className="flex justify-between items-center p-2 bg-white rounded">
                                    <span className="font-medium">Projects:</span>
                                    <span className="font-bold text-green-700">
                                        {results.projects.imported} imported
                                    </span>
                                </div>
                            )}
                            {results.employees && (
                                <div className="flex justify-between items-center p-2 bg-white rounded">
                                    <span className="font-medium">Employees:</span>
                                    <span className="font-bold text-green-700">
                                        {results.employees.imported} imported
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
                            <p className="font-semibold mb-1">✨ What's Next?</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Your data is now in Firestore cloud storage</li>
                                <li>It will persist across all deployments</li>
                                <li>All users will see the same data</li>
                                <li>Refresh the page to see Firestore-synced data</li>
                            </ul>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full mt-4 py-3 px-4 bg-autovol-teal text-white rounded-lg font-semibold hover:bg-teal-600"
                        >
                            🔄 Refresh Page
                        </button>
                    </div>
                )}

                {/* Error Status */}
                {status === 'error' && (
                    <div className="bg-red-50 border border-red-300 rounded-lg p-6">
                        <div className="text-center mb-4">
                            <div className="text-5xl mb-2">❌</div>
                            <h3 className="text-xl font-bold text-red-900">Migration Failed</h3>
                        </div>
                        
                        <div className="bg-white p-3 rounded text-sm text-red-800 font-mono mb-4">
                            {error}
                        </div>

                        <button
                            onClick={() => setStatus('idle')}
                            className="w-full py-2 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Close Button */}
                {(status === 'idle' || status === 'error') && (
                    <button
                        onClick={onClose}
                        className="w-full mt-4 py-2 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}

// Export for use in Admin panel
window.FirestoreMigrationPanel = FirestoreMigrationPanel;
