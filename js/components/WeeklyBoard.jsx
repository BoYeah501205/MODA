// ============================================================================
// WEEKLY BOARD COMPONENTS
// Weekly Board and Schedule Setup sub-tabs for Production Dashboard
// ============================================================================

// ===== WEEKLY SCHEDULE MANAGEMENT HOOK =====
// Manages schedule setup (shift assignments) and completed week history
const useWeeklySchedule = () => {
    const { useState, useEffect } = React;
    
    // Current week's schedule setup (per-day module assignments by shift)
    const [scheduleSetup, setScheduleSetup] = useState(() => {
        const saved = localStorage.getItem('autovol_schedule_setup');
        return saved ? JSON.parse(saved) : {
            shift1: { // Mon-Thu
                monday: 5,
                tuesday: 5,
                wednesday: 5,
                thursday: 5
            },
            shift2: { // Fri-Sun (future)
                friday: 0,
                saturday: 0,
                sunday: 0
            }
        };
    });
    
    // Completed weeks history (global, with project indicators)
    const [completedWeeks, setCompletedWeeks] = useState(() => {
        const saved = localStorage.getItem('autovol_completed_weeks');
        return saved ? JSON.parse(saved) : [];
    });
    
    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem('autovol_schedule_setup', JSON.stringify(scheduleSetup));
    }, [scheduleSetup]);
    
    useEffect(() => {
        localStorage.setItem('autovol_completed_weeks', JSON.stringify(completedWeeks));
    }, [completedWeeks]);
    
    // Update shift schedule
    const updateShiftSchedule = (shift, day, value) => {
        setScheduleSetup(prev => ({
            ...prev,
            [shift]: {
                ...prev[shift],
                [day]: parseInt(value) || 0
            }
        }));
    };
    
    // Get total modules for a shift
    const getShiftTotal = (shift) => {
        const shiftData = scheduleSetup[shift] || {};
        return Object.values(shiftData).reduce((sum, val) => sum + (val || 0), 0);
    };
    
    // Get total line balance (all shifts combined)
    const getLineBalance = () => {
        return getShiftTotal('shift1') + getShiftTotal('shift2');
    };
    
    // Complete a week - creates historical record
    const completeWeek = (weekData) => {
        const completedWeek = {
            id: `completed-week-${Date.now()}`,
            ...weekData,
            completedAt: new Date().toISOString(),
            lineBalance: weekData.lineBalance || getLineBalance(),
            scheduleSnapshot: { ...scheduleSetup }
        };
        setCompletedWeeks(prev => [completedWeek, ...prev]);
        return completedWeek;
    };
    
    // Get completed week by ID
    const getCompletedWeek = (weekId) => {
        return completedWeeks.find(w => w.id === weekId);
    };
    
    // Get recent completed weeks (for summary view)
    const getRecentWeeks = (count = 10) => {
        return completedWeeks.slice(0, count);
    };
    
    // Delete a completed week record
    const deleteCompletedWeek = (weekId) => {
        setCompletedWeeks(prev => prev.filter(w => w.id !== weekId));
    };
    
    return {
        scheduleSetup,
        completedWeeks,
        updateShiftSchedule,
        getShiftTotal,
        getLineBalance,
        completeWeek,
        getCompletedWeek,
        getRecentWeeks,
        deleteCompletedWeek
    };
};

// ===== SCHEDULE SETUP SUB-TAB COMPONENT =====
function ScheduleSetupTab({ 
    scheduleSetup, 
    updateShiftSchedule, 
    getShiftTotal, 
    getLineBalance,
    // Week configuration props
    weeks,
    currentWeek,
    addWeek,
    updateWeek,
    deleteWeek,
    validateWeek,
    allModules
}) {
    const { useState } = React;
    const shift1Days = ['monday', 'tuesday', 'wednesday', 'thursday'];
    const shift2Days = ['friday', 'saturday', 'sunday'];
    const dayLabels = {
        monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
        friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
    };
    
    // Week configuration state
    const [showAddWeek, setShowAddWeek] = useState(false);
    const [editingWeek, setEditingWeek] = useState(null);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({ 
        weekStart: '', 
        weekEnd: '', 
        productionGoal: 20, 
        dailyGoal: 5, 
        startingModule: '', 
        notes: '' 
    });
    
    const sortedModules = [...(allModules || [])].sort((a, b) => (a.buildSequence || 0) - (b.buildSequence || 0));
    
    const getWeekSunday = (mondayStr) => { 
        const monday = new Date(mondayStr); 
        const sunday = new Date(monday); 
        sunday.setDate(monday.getDate() + 6); 
        return sunday.toISOString().split('T')[0]; 
    };
    
    const getWeekOptions = () => { 
        const options = []; 
        const today = new Date(); 
        const currentMonday = new Date(today); 
        const day = currentMonday.getDay(); 
        currentMonday.setDate(currentMonday.getDate() - day + (day === 0 ? -6 : 1)); 
        for (let i = -2; i <= 4; i++) { 
            const weekMonday = new Date(currentMonday); 
            weekMonday.setDate(currentMonday.getDate() + (i * 7)); 
            const weekSunday = new Date(weekMonday); 
            weekSunday.setDate(weekMonday.getDate() + 6); 
            const label = i === 0 ? 'This Week' : i === 1 ? 'Next Week' : i === -1 ? 'Last Week' : ''; 
            options.push({ 
                value: weekMonday.toISOString().split('T')[0], 
                label: `${weekMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${label ? ` (${label})` : ''}`, 
                isCurrent: i === 0 
            }); 
        } 
        return options; 
    };
    
    const resetForm = () => { 
        setFormData({ weekStart: '', weekEnd: '', productionGoal: 20, dailyGoal: 5, startingModule: '', notes: '' }); 
        setError(''); 
    };
    
    const handleOpenAdd = () => { resetForm(); setEditingWeek(null); setShowAddWeek(true); };
    
    const handleOpenEdit = (week) => { 
        setFormData({ 
            weekStart: week.weekStart, 
            weekEnd: week.weekEnd, 
            productionGoal: week.productionGoal || 20, 
            dailyGoal: week.dailyGoal || 5, 
            startingModule: week.startingModule || '', 
            notes: week.notes || '' 
        }); 
        setEditingWeek(week); 
        setShowAddWeek(true); 
        setError(''); 
    };
    
    const handleWeekSelect = (weekStartValue) => { 
        const weekEnd = getWeekSunday(weekStartValue); 
        setFormData(prev => ({ ...prev, weekStart: weekStartValue, weekEnd: weekEnd, productionGoal: getLineBalance() })); 
    };
    
    const handleSave = () => { 
        if (!formData.weekStart) { setError('Please select a week'); return; } 
        if (!formData.startingModule) { setError('Please select a starting module'); return; } 
        const validation = validateWeek?.(formData, editingWeek?.id); 
        if (validation && !validation.valid) { setError(validation.error); return; } 
        if (editingWeek) { 
            updateWeek?.(editingWeek.id, formData); 
        } else { 
            addWeek?.(formData); 
        } 
        setShowAddWeek(false); 
        resetForm(); 
    };
    
    const handleDelete = (weekId) => { 
        if (confirm('Delete this production week schedule?')) { 
            deleteWeek?.(weekId); 
        } 
    };
    
    const weekOptions = getWeekOptions();
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-autovol-navy">Schedule Setup</h3>
                    <p className="text-sm text-gray-500">Configure weekly production schedule and starting modules</p>
                </div>
                <div className="bg-autovol-teal text-white px-4 py-2 rounded-lg">
                    <span className="text-sm">Line Balance:</span>
                    <span className="ml-2 text-xl font-bold">{getLineBalance()}</span>
                    <span className="text-sm ml-1">modules/week</span>
                </div>
            </div>
            
            {/* ===== WEEK CONFIGURATION SECTION ===== */}
            <div className="bg-white border-2 border-autovol-teal rounded-lg overflow-hidden">
                <div className="bg-autovol-teal text-white px-4 py-3 flex items-center justify-between">
                    <div>
                        <span className="font-semibold">Production Week Schedule</span>
                        <span className="text-sm opacity-75 ml-2">Configure starting module for Weekly Board</span>
                    </div>
                    <button 
                        onClick={handleOpenAdd} 
                        className="px-3 py-1 bg-white text-autovol-teal rounded font-medium text-sm hover:bg-gray-100"
                    >
                        + Add Week
                    </button>
                </div>
                
                <div className="p-4">
                    {/* Current Week Indicator */}
                    {currentWeek && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2 text-green-700 font-medium">
                                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                                Current Week Active
                            </div>
                            <div className="mt-1 text-sm text-green-600">
                                {currentWeek.weekStart} to {currentWeek.weekEnd} • 
                                Starting: <span className="font-mono font-bold">{currentWeek.startingModule || 'Not set'}</span>
                            </div>
                        </div>
                    )}
                    
                    {/* Week List */}
                    {(!weeks || weeks.length === 0) ? (
                        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                            No production weeks configured. Click "+ Add Week" to create one.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {weeks.sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart)).map(week => {
                                const isCurrentWeek = currentWeek?.id === week.id;
                                const isPast = new Date(week.weekEnd) < new Date();
                                return (
                                    <div 
                                        key={week.id} 
                                        className={`border rounded-lg p-3 flex items-center justify-between ${
                                            isCurrentWeek ? 'border-green-400 bg-green-50' : 
                                            isPast ? 'border-gray-200 bg-gray-50 opacity-60' : 
                                            'border-gray-200 bg-white'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-800">
                                                    {week.weekStart} → {week.weekEnd}
                                                </span>
                                                {isCurrentWeek && (
                                                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">Current</span>
                                                )}
                                                {isPast && !isCurrentWeek && (
                                                    <span className="px-2 py-0.5 bg-gray-400 text-white text-xs rounded-full">Past</span>
                                                )}
                                            </div>
                                            <div className="text-sm text-gray-600 mt-1">
                                                Starting: <span className="font-mono">{week.startingModule || 'Not set'}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleOpenEdit(week)} 
                                                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(week.id)} 
                                                className="px-3 py-1 text-sm bg-red-100 text-red-600 hover:bg-red-200 rounded"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Add/Edit Week Modal */}
            {showAddWeek && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="text-lg font-bold text-autovol-navy">
                                {editingWeek ? 'Edit Production Week' : 'Add Production Week'}
                            </h3>
                            <button onClick={() => { setShowAddWeek(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Week</label>
                                <select 
                                    value={formData.weekStart} 
                                    onChange={(e) => handleWeekSelect(e.target.value)} 
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="">Choose a week...</option>
                                    {weekOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Starting Module (AUTO-FC / AUTO-W)
                                </label>
                                <select 
                                    value={formData.startingModule} 
                                    onChange={(e) => setFormData(prev => ({ ...prev, startingModule: e.target.value }))} 
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="">Select starting module...</option>
                                    {sortedModules.map(m => (
                                        <option key={m.id} value={m.serialNumber}>
                                            {m.serialNumber} (#{m.buildSequence}) - {m.projectName || 'Unknown Project'}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    This module will appear at AUTO-FC/AUTO-W. Other stations offset by their stagger.
                                </p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                                <textarea 
                                    value={formData.notes} 
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} 
                                    className="w-full border rounded-lg px-3 py-2 h-20"
                                    placeholder="Any notes about this week..."
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2">
                            <button 
                                onClick={() => { setShowAddWeek(false); resetForm(); }} 
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave} 
                                className="px-4 py-2 btn-primary rounded-lg"
                            >
                                {editingWeek ? 'Save Changes' : 'Add Week'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Shift 1 Table - Mon-Thu */}
            <div className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-autovol-navy text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">Shift #1</span>
                        <span className="text-sm opacity-75">Mon - Thu</span>
                    </div>
                    <div className="bg-white/20 px-3 py-1 rounded">
                        Total: <span className="font-bold">{getShiftTotal('shift1')}</span> modules
                    </div>
                </div>
                <div className="p-4">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Day</th>
                                <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Module Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shift1Days.map(day => (
                                <tr key={day} className="border-b last:border-0">
                                    <td className="py-3 px-3 font-medium text-gray-700">{dayLabels[day]}</td>
                                    <td className="py-3 px-3 text-center">
                                        <input
                                            type="number"
                                            min="0"
                                            max="20"
                                            value={scheduleSetup.shift1[day] || 0}
                                            onChange={(e) => updateShiftSchedule('shift1', day, e.target.value)}
                                            className="w-20 border rounded px-3 py-2 text-center font-mono"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Shift 2 Table - Fri-Sun (Future) */}
            <div className="bg-white border rounded-lg overflow-hidden opacity-60">
                <div className="bg-gray-600 text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">Shift #2</span>
                        <span className="text-sm opacity-75">Fri - Sun</span>
                        <span className="bg-yellow-500 text-yellow-900 text-xs px-2 py-0.5 rounded ml-2">Coming Soon</span>
                    </div>
                    <div className="bg-white/20 px-3 py-1 rounded">
                        Total: <span className="font-bold">{getShiftTotal('shift2')}</span> modules
                    </div>
                </div>
                <div className="p-4">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Day</th>
                                <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Module Qty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shift2Days.map(day => (
                                <tr key={day} className="border-b last:border-0">
                                    <td className="py-3 px-3 font-medium text-gray-400">{dayLabels[day]}</td>
                                    <td className="py-3 px-3 text-center">
                                        <input
                                            type="number"
                                            min="0"
                                            max="20"
                                            value={scheduleSetup.shift2[day] || 0}
                                            onChange={(e) => updateShiftSchedule('shift2', day, e.target.value)}
                                            className="w-20 border rounded px-3 py-2 text-center font-mono bg-gray-100"
                                            disabled
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                <strong>Note:</strong> Days with '0' modules assigned will not display on the Weekly Board.
                The Line Balance represents the total modules we are counting as complete for the week across all stations.
            </div>
        </div>
    );
}

// ===== MODULE CARD PROMPT COMPONENT =====
// Reusable prompt that appears when clicking "..." on a module card
function ModuleCardPrompt({ module, station, position, onClose, onViewDetails, onReportIssue, onShopDrawing }) {
    const { useEffect, useRef } = React;
    const promptRef = useRef(null);
    
    // Close when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (promptRef.current && !promptRef.current.contains(e.target)) {
                onClose();
            }
        };
        const handleEscapeKey = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscapeKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [onClose]);
    
    return (
        <div 
            ref={promptRef}
            className="fixed z-[100] bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[180px]"
            style={{ 
                top: position.top, 
                left: position.left,
                transform: 'translateX(-100%)'
            }}
        >
            <button
                onClick={() => { onViewDetails(module); onClose(); }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
            >
                <span>📋</span> View Module Details
            </button>
            <button
                onClick={() => { onReportIssue(module, station); onClose(); }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
            >
                <span>⚠️</span> Report Issue
            </button>
            <button
                onClick={() => { onShopDrawing(module); onClose(); }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 flex items-center gap-3"
            >
                <span>📐</span> Shop Drawing
            </button>
        </div>
    );
}

// ===== MODULE DETAILS TABLE COMPONENT =====
// Reusable read-only table showing module details (same data as Project->Modules)
function ModuleDetailsTable({ module, onClose }) {
    if (!module) return null;
    
    const specs = module.specs || {};
    const difficulties = specs.difficulties || {};
    const stageProgress = module.stageProgress || {};
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b sticky top-0 bg-white z-10 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-autovol-navy">
                            Module Details
                        </h2>
                        <p className="text-sm text-gray-500">
                            {module.serialNumber} • {module.projectName || 'Unknown Project'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-2xl">×</button>
                </div>
                
                {/* Content */}
                <div className="p-6">
                    {/* Basic Info Table */}
                    <table className="w-full text-sm mb-6">
                        <tbody>
                            <tr className="border-b">
                                <td className="py-2 px-3 font-medium text-gray-600 w-1/4">Serial Number</td>
                                <td className="py-2 px-3 font-mono">{module.serialNumber}</td>
                                <td className="py-2 px-3 font-medium text-gray-600 w-1/4">Build Sequence</td>
                                <td className="py-2 px-3">#{module.buildSequence}</td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-2 px-3 font-medium text-gray-600">BLM Hitch</td>
                                <td className="py-2 px-3 font-mono">{specs.blmHitch || '—'}</td>
                                <td className="py-2 px-3 font-medium text-gray-600">BLM Rear</td>
                                <td className="py-2 px-3 font-mono">{specs.blmRear || '—'}</td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-2 px-3 font-medium text-gray-600">Unit Type</td>
                                <td className="py-2 px-3">{specs.unit || '—'}</td>
                                <td className="py-2 px-3 font-medium text-gray-600">Dimensions</td>
                                <td className="py-2 px-3">
                                    {specs.width && specs.length ? `${specs.width}' x ${specs.length}'` : '—'}
                                </td>
                            </tr>
                            <tr className="border-b">
                                <td className="py-2 px-3 font-medium text-gray-600">Project</td>
                                <td className="py-2 px-3">{module.projectName || '—'}</td>
                                <td className="py-2 px-3 font-medium text-gray-600">Status</td>
                                <td className="py-2 px-3">
                                    <span className={`px-2 py-0.5 rounded text-xs ${
                                        module.status === 'complete' ? 'bg-green-100 text-green-700' :
                                        module.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                        {module.status || 'Pending'}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    
                    {/* Difficulties */}
                    {Object.values(difficulties).some(v => v) && (
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-700 mb-2">Difficulties</h3>
                            <div className="flex flex-wrap gap-2">
                                {difficulties.sidewall && <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">Sidewall</span>}
                                {difficulties.stair && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">Stair</span>}
                                {difficulties.hr3Wall && <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">3HR Wall</span>}
                                {difficulties.short && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Short</span>}
                                {difficulties.doubleStudio && <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Double Studio</span>}
                                {difficulties.sawbox && <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">Sawbox</span>}
                            </div>
                        </div>
                    )}
                    
                    {/* Station Progress */}
                    <div>
                        <h3 className="font-semibold text-gray-700 mb-2">Station Progress</h3>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                            {Object.entries(stageProgress).map(([stationId, progress]) => (
                                <div key={stationId} className="text-center p-2 bg-gray-50 rounded">
                                    <div className="text-xs text-gray-500 truncate">{stationId}</div>
                                    <div className={`font-bold ${progress === 100 ? 'text-green-600' : progress > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                        {progress}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ===== WEEKLY BOARD SUB-TAB COMPONENT =====
function WeeklyBoardTab({ 
    projects, 
    productionStages, 
    staggerConfig, 
    currentWeek,
    scheduleSetup,
    getLineBalance,
    completedWeeks,
    completeWeek,
    onModuleClick,
    setProductionTab,
    setProjects, // For updating module progress
    onReportIssue // For opening report issue modal
}) {
    const { useState, useRef } = React;
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [activePrompt, setActivePrompt] = useState(null); // { module, station, position }
    
    // Get all active projects
    const activeProjects = projects.filter(p => p.status === 'Active');
    
    // Check if we have the required configuration
    const hasWeekConfig = currentWeek && currentWeek.startingModule;
    const lineBalance = getLineBalance();
    
    // Get all modules from all active projects, sorted by build sequence
    const allModules = activeProjects.flatMap(p => 
        (p.modules || []).map(m => ({ ...m, projectId: p.id, projectName: p.name }))
    ).sort((a, b) => (a.buildSequence || 0) - (b.buildSequence || 0));
    
    // Get starting module for a station based on stagger
    // Stagger is subtracted because downstream stations work on earlier modules
    // (modules that have already passed through upstream stations)
    const getStationStartingModule = (stationId) => {
        if (!currentWeek?.startingModule) return null;
        const stagger = staggerConfig[stationId] || 0;
        const startingModule = allModules.find(m => m.serialNumber === currentWeek.startingModule);
        if (!startingModule) return null;
        
        const startBuildSeq = (startingModule.buildSequence || 0) - stagger;
        return allModules.find(m => (m.buildSequence || 0) >= startBuildSeq);
    };
    
    // Get modules for a station column based on stagger and line balance
    const getModulesForStation = (station) => {
        const startingModule = getStationStartingModule(station.id);
        if (!startingModule) return [];
        
        const lineBalance = getLineBalance();
        const startIdx = allModules.findIndex(m => m.id === startingModule.id);
        if (startIdx === -1) return [];
        
        // Get modules for this week based on line balance
        const weekModules = allModules.slice(startIdx, startIdx + lineBalance);
        
        // Add status info for each module
        return weekModules.map(module => {
            const progress = module.stageProgress || {};
            const stationProgress = progress[station.id] || 0;
            
            let status = 'pending';
            if (stationProgress === 100) status = 'complete';
            else if (stationProgress > 0) status = 'in-progress';
            
            return { ...module, stationProgress, status };
        });
    };
    
    // Get recently completed modules (last 5 across all stations)
    const getRecentlyCompleted = () => {
        const completed = [];
        productionStages.forEach(station => {
            allModules.forEach(module => {
                const progress = module.stageProgress || {};
                if (progress[station.id] === 100) {
                    completed.push({
                        ...module,
                        stationId: station.id,
                        stationName: station.name,
                        completedAt: module.stationCompletedAt?.[station.id] || 0
                    });
                }
            });
        });
        return completed
            .sort((a, b) => b.completedAt - a.completedAt)
            .slice(0, 5);
    };
    
    // Update module progress for a specific station (works across all projects)
    const updateModuleProgress = (moduleId, projectId, stationId, newProgress) => {
        if (!setProjects) return;
        
        setProjects(prevProjects => prevProjects.map(project => {
            if (project.id !== projectId) return project;
            
            return {
                ...project,
                modules: project.modules.map(module => {
                    if (module.id !== moduleId) return module;
                    
                    const updatedProgress = { ...module.stageProgress };
                    const wasComplete = updatedProgress[stationId] === 100;
                    updatedProgress[stationId] = newProgress;
                    
                    // Track completion timestamps per station
                    let stationCompletedAt = module.stationCompletedAt || {};
                    if (newProgress === 100 && !wasComplete) {
                        stationCompletedAt = { ...stationCompletedAt, [stationId]: Date.now() };
                    } else if (newProgress < 100 && wasComplete) {
                        stationCompletedAt = { ...stationCompletedAt };
                        delete stationCompletedAt[stationId];
                    }
                    
                    return { ...module, stageProgress: updatedProgress, stationCompletedAt };
                })
            };
        }));
    };
    
    // Handle "..." button click - show prompt menu
    const handleMenuClick = (e, module, station) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setActivePrompt({
            module,
            station,
            position: {
                top: rect.bottom + 8,  // Below the button
                left: rect.right       // Align right edge of menu with right edge of button
            }
        });
    };
    
    // Handle shop drawing click - opens SharePoint link if available
    const handleShopDrawing = (module) => {
        // Find the project this module belongs to
        const project = projects.find(p => p.id === module.projectId);
        if (!project) {
            alert('Error: Could not find project for this module.');
            return;
        }
        
        // Get shop drawing links from project
        const shopDrawingLinks = project.shopDrawingLinks || {};
        
        // Try to find URL by hitchBLM first, then rearBLM
        const blmToCheck = [module.hitchBLM, module.rearBLM].filter(Boolean);
        let foundUrl = null;
        let matchedBlm = null;
        
        for (const blm of blmToCheck) {
            if (shopDrawingLinks[blm]) {
                foundUrl = shopDrawingLinks[blm];
                matchedBlm = blm;
                break;
            }
        }
        
        if (foundUrl) {
            // Open the shop drawing in a new tab
            window.open(foundUrl, '_blank');
        } else {
            // Show not found message
            const blmList = blmToCheck.length > 0 ? blmToCheck.join(', ') : 'No BLM';
            alert(`Shop Drawing Not Found\n\nNo shop drawing link found for module ${module.serialNumber} (BLM: ${blmList}).\n\nTo add shop drawing links, go to Projects → Edit Project → Shop Drawing Links.`);
        }
    };
    
    // Card height for alignment between date markers and module cards
    const CARD_HEIGHT = 140; // pixels
    
    // Render a module card with progress buttons and menu
    const renderModuleCard = (module, station) => {
        const currentProgress = module.stationProgress || 0;
        const isComplete = currentProgress === 100;
        
        return (
            <div
                key={`${station.id}-${module.id}`}
                className={`relative rounded-xl p-4 transition-shadow hover:shadow-lg ${
                    isComplete 
                        ? 'bg-green-50 border-2 border-green-400' 
                        : 'bg-white border border-gray-200 shadow-sm'
                }`}
                style={{ height: `${CARD_HEIGHT}px` }}
            >
                {/* Header row with serial and menu button */}
                <div className="flex items-center justify-between mb-3">
                    <div className="font-mono text-lg font-bold text-gray-800">
                        {module.serialNumber}
                    </div>
                    <button
                        onClick={(e) => handleMenuClick(e, module, station)}
                        className="text-gray-400 hover:text-gray-600 px-1 tracking-wider text-lg"
                        title="More options"
                    >
                        •••
                    </button>
                </div>
                
                {/* Progress indicator bar */}
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
                    <div 
                        className={`h-full transition-all rounded-full ${isComplete ? 'bg-green-500' : 'bg-autovol-teal'}`}
                        style={{ width: `${currentProgress}%` }}
                    />
                </div>
                
                {/* Progress buttons */}
                <div className="flex gap-2 justify-between">
                    {[0, 25, 50, 75, 100].map(value => (
                        <button
                            key={value}
                            onClick={(e) => {
                                e.stopPropagation();
                                updateModuleProgress(module.id, module.projectId, station.id, value);
                            }}
                            className={`w-10 h-10 text-sm font-bold rounded-lg transition-all ${
                                currentProgress === value
                                    ? value === 100 
                                        ? 'bg-green-500 text-white shadow-md' 
                                        : 'bg-autovol-teal text-white shadow-md'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                            title={`Set to ${value}%`}
                        >
                            {value === 100 ? '✓' : value}
                        </button>
                    ))}
                </div>
            </div>
        );
    };
    
    // Get day labels for date markers based on schedule setup
    const getDayLabels = () => {
        const days = [];
        const shift1Days = ['monday', 'tuesday', 'wednesday', 'thursday'];
        const dayNames = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
        
        let moduleNum = 1;
        shift1Days.forEach(day => {
            const count = scheduleSetup?.shift1?.[day] || 0;
            if (count > 0) {
                // Calculate date for this day
                const weekStart = currentWeek?.weekStart ? new Date(currentWeek.weekStart) : new Date();
                const dayOffset = shift1Days.indexOf(day);
                const dayDate = new Date(weekStart);
                dayDate.setDate(dayDate.getDate() + dayOffset);
                const monthStr = dayDate.toLocaleDateString('en-US', { month: 'short' });
                const dayNum = dayDate.getDate();
                
                // Create an entry for each module slot on this day
                for (let i = 0; i < count; i++) {
                    days.push({ 
                        day, 
                        label: dayNames[day], 
                        monthStr,
                        dayNum,
                        slotNum: i + 1,
                        moduleNum: moduleNum++
                    });
                }
            }
        });
        return days;
    };
    
    const dayLabels = getDayLabels();
    
    // Render station column
    const renderStationColumn = (station) => {
        const modules = getModulesForStation(station);
        const startingModule = getStationStartingModule(station.id);
        
        return (
            <div key={station.id} className="flex-shrink-0 w-48">
                {/* Station Header */}
                <div className={`${station.color} text-white text-center py-4 rounded-t-xl`}>
                    <div className="font-bold text-base">{station.dept}</div>
                    <div className="text-xs opacity-80 truncate px-2">{station.name}</div>
                </div>
                
                {/* Starting Module Indicator */}
                <div className="bg-gray-100 text-center py-2 text-sm border-x border-gray-200">
                    <span className="text-gray-500">Start:</span>
                    <span className="font-mono ml-2 text-gray-800 font-semibold">
                        {startingModule?.serialNumber || '—'}
                    </span>
                </div>
                
                {/* Module Cards */}
                <div className="border-x border-b border-gray-200 rounded-b-xl bg-gray-50 p-3 min-h-[300px]" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {modules.length === 0 ? (
                        <div className="text-sm text-gray-400 text-center py-8">
                            No modules
                        </div>
                    ) : (
                        modules.map(module => renderModuleCard(module, station))
                    )}
                </div>
            </div>
        );
    };
    
    // Render date marker column (sticky left side)
    const renderDateMarkerColumn = () => {
        return (
            <div className="flex-shrink-0 w-28 sticky left-0 z-10 bg-white" style={{ boxShadow: '4px 0 12px rgba(0,0,0,0.08)' }}>
                {/* Header */}
                <div className="bg-autovol-navy text-white text-center py-4 rounded-tl-xl">
                    <div className="font-bold text-base">Day</div>
                    <div className="text-xs opacity-80">Date</div>
                </div>
                
                {/* Start spacer */}
                <div className="bg-gray-100 text-center py-2 text-sm border-l border-gray-200">
                    <span className="text-gray-400">—</span>
                </div>
                
                {/* Day markers - one per module slot */}
                <div className="border-l border-b border-gray-200 rounded-bl-xl bg-gray-50 p-3 min-h-[300px]" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {dayLabels.map((dayInfo, idx) => (
                        <div 
                            key={`${dayInfo.day}-${dayInfo.slotNum}`}
                            className="rounded-xl border-2 border-autovol-teal bg-white flex flex-col items-center justify-center text-center"
                            style={{ height: `${CARD_HEIGHT}px` }}
                        >
                            <div className="font-bold text-xl text-autovol-navy">{dayInfo.label}</div>
                            <div className="text-sm text-gray-600">{dayInfo.monthStr} {dayInfo.dayNum}</div>
                            <div className="text-xs text-gray-400 mt-1">#{dayInfo.slotNum}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };
    
    // Show configuration prompt if week not set up
    if (!hasWeekConfig) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-autovol-navy">Weekly Board</h3>
                        <p className="text-sm text-gray-500">
                            Line Balance: {lineBalance} modules/week (from Schedule Setup)
                        </p>
                    </div>
                    <button
                        onClick={() => setShowHistoryModal(true)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                    >
                        📊 Week History
                    </button>
                </div>
                
                {/* Configuration Required Card */}
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-8 text-center">
                    <div className="text-4xl mb-4">📋</div>
                    <h4 className="text-xl font-bold text-amber-800 mb-2">Week Schedule Not Loaded</h4>
                    <p className="text-amber-700 mb-6 max-w-md mx-auto">
                        To populate the Weekly Board, you need to configure a production week with a starting module.
                        This tells the system which modules to display at each station.
                    </p>
                    
                    <div className="space-y-3">
                        {!currentWeek ? (
                            <div className="bg-white rounded-lg p-4 border border-amber-200 max-w-sm mx-auto">
                                <p className="text-sm text-gray-600 mb-3">
                                    <strong>Step 1:</strong> Create a production week schedule
                                </p>
                                <button
                                    onClick={() => setProductionTab?.('schedule-setup')}
                                    className="w-full px-4 py-2 btn-primary rounded-lg font-medium"
                                >
                                    Go to Schedule Setup →
                                </button>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg p-4 border border-amber-200 max-w-sm mx-auto">
                                <p className="text-sm text-gray-600 mb-2">
                                    <strong>Week Found:</strong> {currentWeek.weekStart} to {currentWeek.weekEnd}
                                </p>
                                <p className="text-sm text-red-600 mb-3">
                                    ⚠️ Missing starting module. Please edit the week to add one.
                                </p>
                                <button
                                    onClick={() => setProductionTab?.('schedule-setup')}
                                    className="w-full px-4 py-2 btn-primary rounded-lg font-medium"
                                >
                                    Edit Week Schedule →
                                </button>
                            </div>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-4">
                            Tip: The starting module determines which modules appear at AUTO-FC/AUTO-W.
                            Other stations will show modules based on their stagger offset.
                        </p>
                    </div>
                </div>
                
                {/* Week History Modal */}
                {showHistoryModal && (
                    <WeekHistoryModal
                        completedWeeks={completedWeeks}
                        onClose={() => setShowHistoryModal(false)}
                    />
                )}
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {/* Header with Week Info and Actions */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-autovol-navy">Weekly Board</h3>
                    <p className="text-sm text-gray-500">
                        Week of {currentWeek.weekStart} • Starting: <span className="font-mono">{currentWeek.startingModule}</span> • Line Balance: {lineBalance} modules
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setProductionTab?.('schedule-setup')}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                        title="Change week configuration"
                    >
                        ⚙️ Edit Week
                    </button>
                    <button
                        onClick={() => setShowHistoryModal(true)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                    >
                        📊 Week History
                    </button>
                    <button
                        onClick={() => setShowCompleteModal(true)}
                        className="px-4 py-2 btn-primary rounded-lg text-sm font-medium"
                    >
                        ✓ Week Complete
                    </button>
                </div>
            </div>
            
            {/* Recently Completed Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-700 font-medium text-sm mb-2">
                    <span>Recently Completed (Last 5)</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {getRecentlyCompleted().map((module, idx) => (
                        <div key={idx} className="bg-white border border-green-300 rounded px-2 py-1 text-xs">
                            <span className="font-mono font-bold">{module.serialNumber?.slice(-4)}</span>
                            <span className="text-gray-500 ml-1">@ {module.stationName?.split(' ')[0]}</span>
                        </div>
                    ))}
                    {getRecentlyCompleted().length === 0 && (
                        <span className="text-sm text-gray-500">No recently completed modules</span>
                    )}
                </div>
            </div>
            
            {/* Station Board Grid with Date Markers */}
            <div className="relative">
                {/* Scrollable Station Grid with sticky date column */}
                <div className="overflow-x-auto pb-4">
                    <div className="flex gap-2 min-w-max">
                        {/* Sticky Date Marker Column */}
                        {renderDateMarkerColumn()}
                        
                        {/* Station Columns */}
                        {productionStages.map(station => renderStationColumn(station))}
                    </div>
                </div>
            </div>
            
            {/* Legend */}
            <div className="flex items-center gap-6 text-sm text-gray-600 flex-wrap">
                <span className="font-medium">Status:</span>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border rounded bg-gray-50 border-gray-200"></div>
                    <span>Pending</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border rounded bg-white border-autovol-teal"></div>
                    <span>In Progress</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border rounded bg-green-50 border-green-300"></div>
                    <span>Complete</span>
                </div>
            </div>
            
            {/* Week Complete Modal */}
            {showCompleteModal && (
                <WeekCompleteModal
                    currentWeek={currentWeek}
                    lineBalance={getLineBalance()}
                    activeProjects={activeProjects}
                    allModules={allModules}
                    onComplete={(data) => {
                        completeWeek(data);
                        setShowCompleteModal(false);
                    }}
                    onClose={() => setShowCompleteModal(false)}
                />
            )}
            
            {/* Week History Modal */}
            {showHistoryModal && (
                <WeekHistoryModal
                    completedWeeks={completedWeeks}
                    onClose={() => setShowHistoryModal(false)}
                />
            )}
            
            {/* Module Card Prompt Menu */}
            {activePrompt && (
                <ModuleCardPrompt
                    module={activePrompt.module}
                    station={activePrompt.station}
                    position={activePrompt.position}
                    onClose={() => setActivePrompt(null)}
                    onViewDetails={(module) => {
                        // Use the existing ModuleDetailModal from App.jsx via onModuleClick
                        if (onModuleClick) {
                            onModuleClick(module);
                        }
                    }}
                    onReportIssue={(module, station) => {
                        if (onReportIssue) {
                            onReportIssue(module, station);
                        } else {
                            alert(`Report Issue for ${module.serialNumber} at ${station.name}\n\nThis will open the Report Issue modal.`);
                        }
                    }}
                    onShopDrawing={handleShopDrawing}
                />
            )}
        </div>
    );
}

// ===== WEEK COMPLETE MODAL =====
function WeekCompleteModal({ currentWeek, lineBalance, activeProjects, allModules, onComplete, onClose }) {
    const { useState } = React;
    const [nextStartingModule, setNextStartingModule] = useState('');
    const [autoAdvance, setAutoAdvance] = useState(true);
    const [notes, setNotes] = useState('');
    
    // Calculate suggested next starting module (current + line balance)
    const suggestedNext = React.useMemo(() => {
        if (!currentWeek?.startingModule) return null;
        const currentStart = allModules.find(m => m.serialNumber === currentWeek.startingModule);
        if (!currentStart) return null;
        
        const currentIdx = allModules.findIndex(m => m.id === currentStart.id);
        const nextIdx = currentIdx + lineBalance;
        return allModules[nextIdx] || null;
    }, [currentWeek, allModules, lineBalance]);
    
    React.useEffect(() => {
        if (suggestedNext && autoAdvance) {
            setNextStartingModule(suggestedNext.serialNumber);
        }
    }, [suggestedNext, autoAdvance]);
    
    const handleComplete = () => {
        const weekData = {
            weekStart: currentWeek.weekStart,
            weekEnd: currentWeek.weekEnd,
            lineBalance,
            startingModule: currentWeek.startingModule,
            nextStartingModule: nextStartingModule,
            projectsIncluded: activeProjects.map(p => ({ id: p.id, name: p.name })),
            notes
        };
        onComplete(weekData);
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-bold text-autovol-navy">Complete Week</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
                </div>
                
                <div className="p-6 space-y-4">
                    {/* Week Summary */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm text-gray-600">Week Summary</div>
                        <div className="mt-2 space-y-1">
                            <div className="flex justify-between">
                                <span>Week:</span>
                                <span className="font-medium">{currentWeek?.weekStart} → {currentWeek?.weekEnd}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Line Balance:</span>
                                <span className="font-bold text-autovol-teal">{lineBalance} modules</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Projects:</span>
                                <span>{activeProjects.length} active</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Next Starting Module */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Next Week's Starting Module
                        </label>
                        <div className="flex items-center gap-2 mb-2">
                            <input
                                type="checkbox"
                                checked={autoAdvance}
                                onChange={(e) => setAutoAdvance(e.target.checked)}
                                className="rounded"
                            />
                            <span className="text-sm text-gray-600">
                                Auto-advance to suggested module
                                {suggestedNext && (
                                    <span className="font-mono ml-1 text-autovol-teal">
                                        ({suggestedNext.serialNumber})
                                    </span>
                                )}
                            </span>
                        </div>
                        {!autoAdvance && (
                            <select
                                value={nextStartingModule}
                                onChange={(e) => setNextStartingModule(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2"
                            >
                                <option value="">Select starting module...</option>
                                {allModules.map(m => (
                                    <option key={m.id} value={m.serialNumber}>
                                        {m.serialNumber} (#{m.buildSequence})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    
                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 h-20"
                            placeholder="Any notes about this week's production..."
                        />
                    </div>
                </div>
                
                <div className="p-4 border-t flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleComplete}
                        className="px-4 py-2 btn-primary rounded-lg"
                    >
                        Complete Week
                    </button>
                </div>
            </div>
        </div>
    );
}

// ===== WEEK HISTORY MODAL =====
function WeekHistoryModal({ completedWeeks, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
                    <h3 className="text-lg font-bold text-autovol-navy">Week History</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
                </div>
                
                <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
                    {completedWeeks.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No completed weeks yet. Complete your first week to see history here.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {completedWeeks.map(week => (
                                <div key={week.id} className="border rounded-lg p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-semibold text-gray-800">
                                                {week.weekStart} → {week.weekEnd}
                                            </div>
                                            <div className="text-sm text-gray-600 mt-1">
                                                <span className="font-medium">Line Balance:</span> {week.lineBalance} modules
                                            </div>
                                            {week.projectsIncluded && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Projects: {week.projectsIncluded.map(p => p.name).join(', ')}
                                                </div>
                                            )}
                                            {week.notes && (
                                                <div className="text-sm text-gray-600 mt-2 italic">
                                                    "{week.notes}"
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {new Date(week.completedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Export for use in App.jsx
if (typeof window !== 'undefined') {
    window.WeeklyBoardComponents = {
        useWeeklySchedule,
        ScheduleSetupTab,
        WeeklyBoardTab,
        WeekCompleteModal,
        WeekHistoryModal,
        ModuleCardPrompt,
        ModuleDetailsTable
    };
}
