// ============================================================================
// QA REPORTS PANEL - Analytics and reporting
// ============================================================================

function QAReportsPanel({ metrics, deviations, testResults, travelers, modules, QA }) {
    const [reportType, setReportType] = React.useState('summary');
    
    // Calculate department-level stats
    const departmentStats = React.useMemo(() => {
        const stats = {};
        (QA.DEPARTMENTS || []).forEach(dept => {
            stats[dept.id] = { name: dept.name, number: dept.number, total: 0, passed: 0, nc: 0, pending: 0 };
        });
        
        Object.values(travelers).forEach(traveler => {
            (traveler.departmentChecklists || []).forEach(dept => {
                if (stats[dept.departmentId]) {
                    (dept.items || []).forEach(item => {
                        stats[dept.departmentId].total++;
                        if (item.conformance === 'PASS') stats[dept.departmentId].passed++;
                        else if (item.conformance === 'NC') stats[dept.departmentId].nc++;
                        else stats[dept.departmentId].pending++;
                    });
                }
            });
        });
        
        return Object.values(stats).sort((a, b) => a.number - b.number);
    }, [travelers, QA.DEPARTMENTS]);
    
    // Deviation stats by category
    const deviationsByPriority = React.useMemo(() => {
        const stats = {};
        (QA.DEVIATION_PRIORITIES || []).forEach(p => {
            stats[p.id] = { ...p, count: 0, open: 0, closed: 0 };
        });
        deviations.forEach(d => {
            if (stats[d.priority]) {
                stats[d.priority].count++;
                if (d.status === 'closed') stats[d.priority].closed++;
                else stats[d.priority].open++;
            }
        });
        return Object.values(stats);
    }, [deviations, QA.DEVIATION_PRIORITIES]);
    
    // Test stats by type
    const testsByType = React.useMemo(() => {
        const stats = {};
        Object.entries(QA.TEST_TYPES || {}).forEach(([key, test]) => {
            stats[key] = { ...test, key, total: 0, passed: 0, failed: 0 };
        });
        testResults.forEach(t => {
            if (stats[t.testType]) {
                stats[t.testType].total++;
                if (t.result === 'PASS') stats[t.testType].passed++;
                else stats[t.testType].failed++;
            }
        });
        return Object.values(stats);
    }, [testResults, QA.TEST_TYPES]);

    return (
        <div className="space-y-6">
            {/* Report Type Selector */}
            <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex gap-2">
                    {[
                        { id: 'summary', label: 'Executive Summary' },
                        { id: 'departments', label: 'By Department' },
                        { id: 'deviations', label: 'Deviation Analysis' },
                        { id: 'testing', label: 'Test Results' }
                    ].map(type => (
                        <button key={type.id} onClick={() => setReportType(type.id)}
                            className={`px-4 py-2 text-sm rounded-lg transition ${
                                reportType === type.id ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            style={reportType === type.id ? { backgroundColor: 'var(--autovol-navy)' } : {}}>
                            {type.label}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Executive Summary */}
            {reportType === 'summary' && (
                <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--autovol-navy)' }}>Key Performance Indicators</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="text-center p-4 rounded-lg bg-green-50">
                                <div className="text-4xl font-bold text-green-600">{metrics.inspectionPassRate}%</div>
                                <div className="text-sm text-gray-600 mt-1">Inspection Pass Rate</div>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-blue-50">
                                <div className="text-4xl font-bold text-blue-600">{metrics.testPassRate}%</div>
                                <div className="text-sm text-gray-600 mt-1">Test Pass Rate</div>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-red-50">
                                <div className="text-4xl font-bold text-red-600">{metrics.openDeviations}</div>
                                <div className="text-sm text-gray-600 mt-1">Open Deviations</div>
                            </div>
                            <div className="text-center p-4 rounded-lg" style={{ backgroundColor: 'var(--autovol-teal-light)' }}>
                                <div className="text-4xl font-bold" style={{ color: 'var(--autovol-teal)' }}>{metrics.modulesWithTravelers}</div>
                                <div className="text-sm text-gray-600 mt-1">Active Travelers</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h4 className="font-semibold mb-4" style={{ color: 'var(--autovol-navy)' }}>Inspection Summary</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Total Inspections</span>
                                    <span className="font-bold">{metrics.totalInspections}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Passed</span>
                                    <span className="font-bold text-green-600">{metrics.passedInspections}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Non-Conformance</span>
                                    <span className="font-bold text-red-600">{metrics.ncInspections}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h4 className="font-semibold mb-4" style={{ color: 'var(--autovol-navy)' }}>Deviation Summary</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Total Deviations</span>
                                    <span className="font-bold">{metrics.totalDeviations}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Open</span>
                                    <span className="font-bold text-red-600">{metrics.openDeviations}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Closed</span>
                                    <span className="font-bold text-green-600">{metrics.closedDeviations}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Critical Open</span>
                                    <span className="font-bold text-red-700">{metrics.criticalDeviations}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Department Report */}
            {reportType === 'departments' && (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="p-4 border-b" style={{ backgroundColor: 'var(--autovol-navy)' }}>
                        <h3 className="text-lg font-semibold text-white">Department Inspection Status</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Department</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Total Items</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Passed</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">NC</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Pending</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Pass Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {departmentStats.map(dept => {
                                    const inspected = dept.passed + dept.nc;
                                    const passRate = inspected > 0 ? Math.round((dept.passed / inspected) * 100) : 0;
                                    return (
                                        <tr key={dept.number} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm">{dept.number}. {dept.name}</td>
                                            <td className="px-4 py-3 text-sm text-center">{dept.total}</td>
                                            <td className="px-4 py-3 text-sm text-center text-green-600 font-medium">{dept.passed}</td>
                                            <td className="px-4 py-3 text-sm text-center text-red-600 font-medium">{dept.nc}</td>
                                            <td className="px-4 py-3 text-sm text-center text-gray-500">{dept.pending}</td>
                                            <td className="px-4 py-3 text-sm text-center">
                                                <span className={`px-2 py-1 rounded ${passRate >= 90 ? 'bg-green-100 text-green-700' : passRate >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                    {passRate}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            {/* Deviation Analysis */}
            {reportType === 'deviations' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--autovol-navy)' }}>Deviations by Priority</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {deviationsByPriority.map(p => (
                                <div key={p.id} className="p-4 rounded-lg border-l-4" style={{ borderColor: p.color, backgroundColor: `${p.color}10` }}>
                                    <div className="text-2xl font-bold" style={{ color: p.color }}>{p.count}</div>
                                    <div className="text-sm font-medium">{p.name}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {p.open} open • {p.closed} closed
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Recent Deviations Table */}
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                        <div className="p-4 border-b">
                            <h4 className="font-semibold" style={{ color: 'var(--autovol-navy)' }}>Recent Deviations</h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">ID</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Module</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Priority</th>
                                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Status</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {deviations.slice(0, 20).map(d => {
                                        const priority = (QA.DEVIATION_PRIORITIES || []).find(p => p.id === d.priority);
                                        return (
                                            <tr key={d.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-xs font-mono">{d.id}</td>
                                                <td className="px-4 py-3 text-sm">{d.moduleName}</td>
                                                <td className="px-4 py-3 text-sm truncate max-w-xs">{d.title || d.item}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="px-2 py-1 text-xs rounded text-white" style={{ backgroundColor: priority?.color || '#9E9E9E' }}>
                                                        {priority?.name || d.priority}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm">{d.status}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500">{new Date(d.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Testing Report */}
            {reportType === 'testing' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--autovol-navy)' }}>Test Results by Type</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {testsByType.map(t => {
                                const passRate = t.total > 0 ? Math.round((t.passed / t.total) * 100) : 0;
                                return (
                                    <div key={t.key} className="p-4 rounded-lg border">
                                        <div className="font-medium mb-2" style={{ color: 'var(--autovol-navy)' }}>{t.name}</div>
                                        <div className="flex items-end gap-2">
                                            <span className="text-3xl font-bold" style={{ color: passRate >= 90 ? '#43A047' : passRate >= 70 ? '#FB8C00' : '#E53935' }}>
                                                {passRate}%
                                            </span>
                                            <span className="text-sm text-gray-500 mb-1">pass rate</span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-2">
                                            {t.total} tests • {t.passed} passed • {t.failed} failed
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

window.QAReportsPanel = QAReportsPanel;
