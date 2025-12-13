// ============================================================================
// TESTING PANEL - Pressure tests, electrical tests, HVAC tests
// ============================================================================

function TestingPanel({ testResults, addTestResult, modules, travelers, QA, canEdit, currentUser }) {
    const [showNewTest, setShowNewTest] = React.useState(false);
    const [filter, setFilter] = React.useState('all');
    const [testTypeFilter, setTestTypeFilter] = React.useState('all');
    
    // Filter test results
    const filteredTests = testResults.filter(t => {
        const matchesResult = filter === 'all' || t.result === filter;
        const matchesType = testTypeFilter === 'all' || t.testType === testTypeFilter;
        return matchesResult && matchesType;
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Get test type info
    const getTestType = (typeId) => QA.TEST_TYPES?.[typeId] || { name: typeId, description: '' };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold" style={{ color: 'var(--autovol-navy)' }}>Testing & Verification</h3>
                {canEdit && (
                    <button onClick={() => setShowNewTest(true)}
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2"
                        style={{ backgroundColor: 'var(--autovol-teal)' }}>
                        <span>+</span> Record Test
                    </button>
                )}
            </div>
            
            {/* Test Type Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(QA.TEST_TYPES || {}).map(([key, test]) => {
                    const count = testResults.filter(t => t.testType === key).length;
                    const passCount = testResults.filter(t => t.testType === key && t.result === 'PASS').length;
                    
                    return (
                        <div key={key} className="bg-white rounded-lg shadow-sm p-4 text-center cursor-pointer hover:shadow-md transition"
                             onClick={() => setTestTypeFilter(testTypeFilter === key ? 'all' : key)}
                             style={{ borderBottom: testTypeFilter === key ? '3px solid var(--autovol-teal)' : '3px solid transparent' }}>
                            <div className="text-2xl font-bold" style={{ color: 'var(--autovol-navy)' }}>{count}</div>
                            <div className="text-xs text-gray-500 truncate">{test.name}</div>
                            {count > 0 && (
                                <div className="text-xs mt-1" style={{ color: passCount === count ? '#43A047' : '#FB8C00' }}>
                                    {passCount}/{count} passed
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4 flex gap-4">
                <div className="flex gap-2">
                    {['all', 'PASS', 'FAIL'].map(status => (
                        <button key={status} onClick={() => setFilter(status)}
                            className={`px-3 py-1 text-sm rounded-full transition ${
                                filter === status 
                                    ? status === 'PASS' ? 'bg-green-500 text-white' 
                                    : status === 'FAIL' ? 'bg-red-500 text-white' 
                                    : 'text-white' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            style={filter === status && status === 'all' ? { backgroundColor: 'var(--autovol-teal)' } : {}}>
                            {status === 'all' ? 'All Results' : status}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Test Results List */}
            <div className="space-y-4">
                {filteredTests.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
                        <span className="icon-construction" style={{ width: '64px', height: '64px', display: 'inline-block', opacity: 0.3 }}></span>
                        <p className="mt-4">No test results recorded</p>
                    </div>
                ) : (
                    filteredTests.map(test => {
                        const testType = getTestType(test.testType);
                        const module = modules.find(m => m.id === test.moduleId);
                        
                        return (
                            <div key={test.id} className="bg-white rounded-lg shadow-sm p-4 border-l-4"
                                 style={{ borderColor: test.result === 'PASS' ? '#43A047' : '#E53935' }}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 text-xs rounded text-white ${test.result === 'PASS' ? 'bg-green-500' : 'bg-red-500'}`}>
                                                {test.result}
                                            </span>
                                            <span className="font-medium" style={{ color: 'var(--autovol-navy)' }}>{testType.name}</span>
                                        </div>
                                        <p className="text-sm text-gray-500">{module?.name || 'Unknown Module'} • Station {test.station}</p>
                                        {test.parameters && (
                                            <p className="text-xs text-gray-400 mt-1">
                                                {test.parameters.pressure && `${test.parameters.pressure} ${test.parameters.unit}`}
                                                {test.parameters.duration && ` for ${test.parameters.duration} min`}
                                            </p>
                                        )}
                                        {test.notes && <p className="text-sm text-gray-600 mt-2">{test.notes}</p>}
                                    </div>
                                    <div className="text-right text-xs text-gray-400">
                                        <div>{test.inspector}</div>
                                        <div>{new Date(test.timestamp).toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            {/* New Test Modal */}
            {showNewTest && (
                <NewTestModal
                    modules={modules}
                    travelers={travelers}
                    QA={QA}
                    currentUser={currentUser}
                    onClose={() => setShowNewTest(false)}
                    onSave={(test) => {
                        addTestResult(test);
                        setShowNewTest(false);
                    }}
                />
            )}
        </div>
    );
}

// New Test Modal
function NewTestModal({ modules, travelers, QA, currentUser, onClose, onSave }) {
    const [formData, setFormData] = React.useState({
        moduleId: '',
        testType: '',
        station: '',
        result: 'PASS',
        parameters: {},
        notes: ''
    });
    
    const [timerRunning, setTimerRunning] = React.useState(false);
    const [timerSeconds, setTimerSeconds] = React.useState(0);
    
    const selectedTestType = QA.TEST_TYPES?.[formData.testType];
    const modulesWithTravelers = modules.filter(m => travelers[`${m.projectId}-${m.id}`]);
    
    // Timer effect
    React.useEffect(() => {
        let interval;
        if (timerRunning) {
            interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timerRunning]);
    
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.moduleId || !formData.testType) return;
        const module = modules.find(m => m.id === parseInt(formData.moduleId));
        onSave({
            ...formData,
            moduleId: parseInt(formData.moduleId),
            moduleName: module?.name,
            projectId: module?.projectId,
            duration: timerSeconds > 0 ? Math.floor(timerSeconds / 60) : formData.parameters?.duration
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b" style={{ backgroundColor: 'var(--autovol-teal)' }}>
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Record Test Result</h3>
                        <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl">&times;</button>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Module *</label>
                        <select value={formData.moduleId} onChange={(e) => setFormData({...formData, moduleId: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg" required>
                            <option value="">Select module...</option>
                            {modulesWithTravelers.map(m => <option key={m.id} value={m.id}>{m.name} - {m.projectName}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Test Type *</label>
                            <select value={formData.testType} onChange={(e) => {
                                const testType = QA.TEST_TYPES?.[e.target.value];
                                setFormData({
                                    ...formData, 
                                    testType: e.target.value,
                                    parameters: testType?.defaultParams || {}
                                });
                            }} className="w-full px-3 py-2 border rounded-lg" required>
                                <option value="">Select...</option>
                                {Object.entries(QA.TEST_TYPES || {}).map(([key, test]) => (
                                    <option key={key} value={key}>{test.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Station</label>
                            <select value={formData.station} onChange={(e) => setFormData({...formData, station: e.target.value})}
                                className="w-full px-3 py-2 border rounded-lg">
                                <option value="">Select...</option>
                                {(QA.PRODUCTION_STATIONS || []).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    {/* Test Parameters */}
                    {selectedTestType?.defaultParams && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="text-sm font-medium text-gray-700 mb-3">Test Parameters</div>
                            <div className="grid grid-cols-3 gap-4">
                                {selectedTestType.defaultParams.pressure && (
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Pressure ({selectedTestType.defaultParams.unit})</label>
                                        <input type="number" value={formData.parameters?.pressure || selectedTestType.defaultParams.pressure}
                                            onChange={(e) => setFormData({...formData, parameters: {...formData.parameters, pressure: e.target.value}})}
                                            className="w-full px-3 py-2 border rounded-lg" />
                                    </div>
                                )}
                                {selectedTestType.defaultParams.duration && (
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Duration (min)</label>
                                        <input type="number" value={formData.parameters?.duration || selectedTestType.defaultParams.duration}
                                            onChange={(e) => setFormData({...formData, parameters: {...formData.parameters, duration: e.target.value}})}
                                            className="w-full px-3 py-2 border rounded-lg" />
                                    </div>
                                )}
                            </div>
                            
                            {/* Timer */}
                            <div className="mt-4 text-center">
                                <div className="text-3xl font-mono font-bold mb-2" style={{ color: 'var(--autovol-navy)' }}>
                                    {formatTime(timerSeconds)}
                                </div>
                                <div className="flex justify-center gap-2">
                                    <button type="button" onClick={() => setTimerRunning(!timerRunning)}
                                        className={`px-4 py-2 rounded-lg text-white ${timerRunning ? 'bg-red-500' : 'bg-green-500'}`}>
                                        {timerRunning ? 'Stop' : 'Start Timer'}
                                    </button>
                                    <button type="button" onClick={() => { setTimerRunning(false); setTimerSeconds(0); }}
                                        className="px-4 py-2 rounded-lg border hover:bg-gray-50">Reset</button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Result */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Result *</label>
                        <div className="flex gap-4">
                            {['PASS', 'FAIL'].map(result => (
                                <button key={result} type="button"
                                    onClick={() => setFormData({...formData, result})}
                                    className={`flex-1 py-3 rounded-lg font-medium transition ${
                                        formData.result === result 
                                            ? result === 'PASS' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {result}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg" rows="2" placeholder="Test observations..." />
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="flex-1 px-4 py-2 rounded-lg text-white" style={{ backgroundColor: 'var(--autovol-teal)' }}>
                            Save Test Result
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

window.TestingPanel = TestingPanel;
window.NewTestModal = NewTestModal;
