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

// ===== PROTOTYPE SCHEDULING SECTION COMPONENT =====
function PrototypeSchedulingSection({ allModules, sortedModules, projects, setProjects }) {
    const { useState, useMemo } = React;
    const [expandedProto, setExpandedProto] = useState(null);
    
    // Get all prototype modules
    const prototypeModules = useMemo(() => {
        return (allModules || []).filter(m => m.isPrototype);
    }, [allModules]);
    
    // Get non-prototype modules for "Insert After" dropdown (sorted by buildSequence)
    const insertTargets = useMemo(() => {
        return sortedModules.filter(m => !m.isPrototype && Number.isInteger(m.buildSequence));
    }, [sortedModules]);
    
    // Calculate the next available decimal slot after a given module
    const getNextDecimalSlot = (afterBuildSeq) => {
        // Find all modules with buildSequence between afterBuildSeq and afterBuildSeq + 1
        const existingDecimals = sortedModules
            .filter(m => m.buildSequence > afterBuildSeq && m.buildSequence < Math.floor(afterBuildSeq) + 1)
            .map(m => m.buildSequence);
        
        if (existingDecimals.length === 0) {
            return afterBuildSeq + 0.1;
        }
        // Find the max and add 0.1
        const maxDecimal = Math.max(...existingDecimals);
        return Math.round((maxDecimal + 0.1) * 100) / 100; // Round to 2 decimal places
    };
    
    // Update a prototype's buildSequence based on "Insert After" selection
    const handleInsertAfter = (protoModule, afterModuleSerial) => {
        if (!afterModuleSerial || !setProjects) return;
        
        const afterModule = sortedModules.find(m => m.serialNumber === afterModuleSerial);
        if (!afterModule) return;
        
        const newBuildSeq = getNextDecimalSlot(afterModule.buildSequence);
        
        // Update the module in projects
        setProjects(prev => prev.map(project => {
            if (project.id !== protoModule.projectId) return project;
            return {
                ...project,
                modules: (project.modules || []).map(m => {
                    if (m.id !== protoModule.id) return m;
                    return { ...m, buildSequence: newBuildSeq, insertedAfter: afterModuleSerial };
                })
            };
        }));
        
        setExpandedProto(null);
    };
    
    // Clear insertion (reset to original project sequence)
    const handleClearInsertion = (protoModule) => {
        if (!setProjects) return;
        
        // Find original position in project
        const project = projects?.find(p => p.id === protoModule.projectId);
        const projectModules = project?.modules || [];
        const protoIndex = projectModules.findIndex(m => m.id === protoModule.id);
        
        // Calculate a high buildSequence to put it at the end (or use original if available)
        const maxSeq = Math.max(...sortedModules.map(m => Math.floor(m.buildSequence || 0)), 0);
        const newBuildSeq = maxSeq + protoIndex + 1;
        
        setProjects(prev => prev.map(project => {
            if (project.id !== protoModule.projectId) return project;
            return {
                ...project,
                modules: (project.modules || []).map(m => {
                    if (m.id !== protoModule.id) return m;
                    const { insertedAfter, ...rest } = m;
                    return { ...rest, buildSequence: newBuildSeq };
                })
            };
        }));
    };
    
    if (prototypeModules.length === 0) {
        return null; // Don't show section if no prototypes
    }
    
    return (
        <div className="bg-white border-2 border-yellow-400 rounded-lg overflow-hidden">
            <div className="bg-yellow-400 text-yellow-900 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">★</span>
                    <span className="font-semibold">Prototype Scheduling</span>
                    <span className="text-sm opacity-75">Insert prototypes into production schedule</span>
                </div>
                <span className="bg-yellow-600 text-white px-2 py-0.5 rounded text-sm font-medium">
                    {prototypeModules.length} prototype{prototypeModules.length !== 1 ? 's' : ''}
                </span>
            </div>
            
            <div className="p-4">
                <div className="text-sm text-gray-600 mb-3">
                    Prototypes use decimal build sequences (e.g., 5.1) to slot between main project modules without disrupting their numbering.
                </div>
                
                <div className="space-y-2">
                    {prototypeModules.map(proto => {
                        const isExpanded = expandedProto === proto.id;
                        const hasInsertion = proto.insertedAfter;
                        const isDecimal = proto.buildSequence && !Number.isInteger(proto.buildSequence);
                        
                        return (
                            <div 
                                key={proto.id}
                                className={`border rounded-lg p-3 ${hasInsertion ? 'border-green-300 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-yellow-500 text-lg">★</span>
                                        <div>
                                            <span className="font-mono font-bold text-gray-800">{proto.serialNumber}</span>
                                            <span className="text-sm text-gray-500 ml-2">({proto.projectName})</span>
                                        </div>
                                        <div className="text-sm">
                                            <span className="text-gray-500">Seq:</span>
                                            <span className={`font-mono ml-1 ${isDecimal ? 'text-green-600 font-bold' : 'text-gray-600'}`}>
                                                #{proto.buildSequence}
                                            </span>
                                        </div>
                                        {hasInsertion && (
                                            <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">
                                                After {proto.insertedAfter}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {hasInsertion && (
                                            <button
                                                onClick={() => handleClearInsertion(proto)}
                                                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded"
                                            >
                                                Clear
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setExpandedProto(isExpanded ? null : proto.id)}
                                            className="px-3 py-1 text-sm bg-yellow-200 hover:bg-yellow-300 text-yellow-800 rounded font-medium"
                                        >
                                            {isExpanded ? 'Cancel' : 'Insert After...'}
                                        </button>
                                    </div>
                                </div>
                                
                                {isExpanded && (
                                    <div className="mt-3 pt-3 border-t border-yellow-200">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Insert this prototype after:
                                        </label>
                                        <select
                                            className="w-full border rounded-lg px-3 py-2"
                                            defaultValue=""
                                            onChange={(e) => handleInsertAfter(proto, e.target.value)}
                                        >
                                            <option value="">Select a module...</option>
                                            {insertTargets.map(m => (
                                                <option key={m.id} value={m.serialNumber}>
                                                    {m.serialNumber} (#{m.buildSequence}) - {m.projectName}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            The prototype will be assigned sequence #{insertTargets.length > 0 ? 
                                                `${insertTargets[0]?.buildSequence}.1` : '?.1'} (decimal) to slot after the selected module.
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

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
    allModules,
    // Prototype scheduling props
    projects,
    setProjects
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
            
            {/* ===== PROTOTYPE SCHEDULING SECTION ===== */}
            <PrototypeSchedulingSection 
                allModules={allModules}
                sortedModules={sortedModules}
                projects={projects}
                setProjects={setProjects}
            />
            
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
    addWeek, // For auto-creating next week
    onModuleClick,
    setProductionTab,
    setProjects, // For updating module progress
    onReportIssue // For opening report issue modal
}) {
    const { useState, useRef, useEffect, useCallback } = React;
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [activePrompt, setActivePrompt] = useState(null); // { module, station, position }
    
    // ===== SELECTION SYSTEM =====
    const [selectedModules, setSelectedModules] = useState(new Set()); // Set of "moduleId-stationId" keys
    const [showBulkMenu, setShowBulkMenu] = useState(null); // { x, y } position for context menu
    const boardRef = useRef(null);
    const longPressTimer = useRef(null);
    
    // Generate unique key for module-station combination (use | as separator since IDs may contain dashes)
    const getSelectionKey = (moduleId, stationId) => `${moduleId}|${stationId}`;
    
    // Check if a module-station is selected
    const isSelected = (moduleId, stationId) => selectedModules.has(getSelectionKey(moduleId, stationId));
    
    // Toggle selection for a module
    const toggleSelection = (moduleId, stationId, isCtrlKey = false) => {
        const key = getSelectionKey(moduleId, stationId);
        setSelectedModules(prev => {
            const newSet = new Set(isCtrlKey ? prev : []);
            if (prev.has(key) && isCtrlKey) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };
    
    // Clear all selections
    const clearSelection = useCallback(() => {
        setSelectedModules(new Set());
        setShowBulkMenu(null);
    }, []);
    
    // Handle Escape key to clear selection
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && selectedModules.size > 0) {
                clearSelection();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedModules.size, clearSelection]);
    
    // Handle click outside to clear selection
    const handleBoardClick = (e) => {
        // Only clear if clicking directly on the board background, not on cards
        if (e.target === e.currentTarget || e.target.closest('[data-board-background]')) {
            clearSelection();
        }
    };
    
    // Handle right-click for bulk menu
    const handleContextMenu = (e, moduleId, stationId) => {
        e.preventDefault();
        e.stopPropagation();
        
        // If right-clicking on unselected module, select it first
        if (!isSelected(moduleId, stationId)) {
            toggleSelection(moduleId, stationId, e.ctrlKey || e.metaKey);
        }
        
        setShowBulkMenu({ x: e.clientX, y: e.clientY });
    };
    
    // Bulk update progress for all selected modules
    const bulkUpdateProgress = (newProgress) => {
        if (!setProjects || selectedModules.size === 0) return;
        
        // Parse selection keys to get moduleId and stationId (using | separator)
        const updates = Array.from(selectedModules).map(key => {
            const separatorIdx = key.indexOf('|');
            const moduleId = key.substring(0, separatorIdx);
            const stationId = key.substring(separatorIdx + 1);
            return { moduleId, stationId };
        });
        
        // Find which project each module belongs to
        // Note: Convert IDs to strings for comparison since selection keys are strings
        setProjects(prevProjects => prevProjects.map(project => {
            const projectModuleIds = (project.modules || []).map(m => String(m.id));
            const relevantUpdates = updates.filter(u => projectModuleIds.includes(String(u.moduleId)));
            
            if (relevantUpdates.length === 0) return project;
            
            return {
                ...project,
                modules: project.modules.map(module => {
                    const moduleUpdates = relevantUpdates.filter(u => String(u.moduleId) === String(module.id));
                    if (moduleUpdates.length === 0) return module;
                    
                    const updatedProgress = { ...module.stageProgress };
                    let stationCompletedAt = { ...module.stationCompletedAt } || {};
                    
                    moduleUpdates.forEach(({ stationId }) => {
                        const wasComplete = updatedProgress[stationId] === 100;
                        updatedProgress[stationId] = newProgress;
                        
                        if (newProgress === 100 && !wasComplete) {
                            stationCompletedAt[stationId] = Date.now();
                        } else if (newProgress < 100 && wasComplete) {
                            delete stationCompletedAt[stationId];
                        }
                    });
                    
                    return { ...module, stageProgress: updatedProgress, stationCompletedAt };
                })
            };
        }));
        
        clearSelection();
    };
    
    // Long press handler for mobile
    const handleTouchStart = (moduleId, stationId) => {
        longPressTimer.current = setTimeout(() => {
            toggleSelection(moduleId, stationId, true);
        }, 500); // 500ms long press
    };
    
    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };
    
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
    // Now includes previous week (5 before) and next week preview (5 after)
    const getModulesForStation = (station) => {
        const startingModule = getStationStartingModule(station.id);
        if (!startingModule) return { previous: [], current: [], next: [] };
        
        const lineBalance = getLineBalance();
        
        // Find the starting module index - try by ID first, then by serial number
        let startIdx = allModules.findIndex(m => m.id === startingModule.id);
        if (startIdx === -1) {
            startIdx = allModules.findIndex(m => m.serialNumber === startingModule.serialNumber);
        }
        if (startIdx === -1) return { previous: [], current: [], next: [] };
        
        // Helper to add status info to modules
        const addStatusInfo = (modules, weekSection) => {
            return modules.map(module => {
                const progress = module.stageProgress || {};
                const stationProgress = progress[station.id] || 0;
                
                let status = 'pending';
                if (stationProgress === 100) status = 'complete';
                else if (stationProgress > 0) status = 'in-progress';
                
                return { ...module, stationProgress, status, weekSection };
            });
        };
        
        // Previous week: 5 modules before starting module (or fewer if at beginning)
        const prevCount = Math.min(5, startIdx); // Can't go negative
        const prevStartIdx = startIdx - prevCount;
        const previousModules = allModules.slice(prevStartIdx, startIdx);
        
        // Current week: line balance modules
        const currentModules = allModules.slice(startIdx, startIdx + lineBalance);
        
        // Next week preview: 5 modules after current week (or fewer if at end)
        const nextStartIdx = startIdx + lineBalance;
        const nextModules = allModules.slice(nextStartIdx, nextStartIdx + 5);
        
        return {
            previous: addStatusInfo(previousModules, 'previous'),
            current: addStatusInfo(currentModules, 'current'),
            next: addStatusInfo(nextModules, 'next')
        };
    };
    
    // Get the last working day date for previous week label
    const getPreviousWeekLastDay = () => {
        if (!currentWeek?.weekStart) return null;
        const weekStart = new Date(currentWeek.weekStart);
        // Go back to previous Thursday (last working day of previous week)
        const prevThursday = new Date(weekStart);
        prevThursday.setDate(weekStart.getDate() - 4); // Monday - 4 = Thursday of prev week
        return prevThursday;
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
    const CARD_HEIGHT = 58; // pixels - compact like Station Board
    
    // Render a module card with progress buttons and menu (Station Board style)
    const renderModuleCard = (module, station, weekSection = 'current') => {
        const currentProgress = module.stationProgress || 0;
        const isComplete = currentProgress === 100;
        const moduleIsSelected = isSelected(module.id, station.id);
        
        // Determine border/background based on week section, selection, and completion
        let borderClass = 'border';
        let bgClass = 'bg-white';
        
        if (moduleIsSelected) {
            borderClass = 'border-2 border-blue-500';
            bgClass = 'bg-blue-50';
        } else if (isComplete) {
            borderClass = 'border border-green-300';
            bgClass = 'bg-green-50';
        } else if (weekSection === 'previous') {
            borderClass = 'border border-red-300';
            bgClass = 'bg-red-50';
        } else if (weekSection === 'next') {
            borderClass = 'border border-gray-200';
            bgClass = 'bg-gray-50';
        } else {
            borderClass = 'border border-gray-200';
        }
        
        // For "next" week modules with no progress, show greyed out "on-deck" style
        const isOnDeck = weekSection === 'next' && currentProgress === 0;
        
        if (isOnDeck) {
            return (
                <div
                    key={`${station.id}-${module.id}`}
                    className="rounded p-1.5 bg-gray-50 border border-gray-200 opacity-50 hover:opacity-100 transition cursor-pointer"
                    style={{ height: `${CARD_HEIGHT}px` }}
                    onClick={() => updateModuleProgress(module.id, module.projectId, station.id, 25)}
                    title="Click to start"
                >
                    <div className="font-mono text-xs font-bold text-gray-500 truncate">
                        {module.serialNumber}
                    </div>
                    <div className="text-xs text-autovol-teal mt-0.5">
                        ▶ Start
                    </div>
                </div>
            );
        }
        
        return (
            <div
                key={`${station.id}-${module.id}`}
                className={`rounded p-1.5 transition-all hover:shadow-md ${bgClass} ${borderClass}`}
                style={{ height: `${CARD_HEIGHT}px` }}
                onContextMenu={(e) => handleContextMenu(e, module.id, station.id)}
                onTouchStart={() => handleTouchStart(module.id, station.id)}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
            >
                {/* Row 1: Serial Number + Menu Button */}
                <div className="flex items-center justify-between">
                    <div 
                        className={`font-mono text-xs font-bold cursor-pointer select-none truncate ${
                            moduleIsSelected ? 'text-blue-600' : isComplete ? 'text-green-800' : 'text-gray-800'
                        } hover:text-blue-500 transition-colors`}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSelection(module.id, station.id, e.ctrlKey || e.metaKey);
                        }}
                        title="Click to select, Ctrl+Click for multi-select"
                    >
                        {moduleIsSelected && <span className="text-blue-500 mr-1">✓</span>}
                        {module.serialNumber}
                    </div>
                    <button
                        onClick={(e) => handleMenuClick(e, module, station)}
                        className="text-gray-400 hover:text-gray-600 text-xs px-0.5"
                        title="More options"
                    >
                        •••
                    </button>
                </div>
                
                {/* Row 2: Progress Buttons (matching Station Board exactly) */}
                <div className="flex gap-0.5 mt-1">
                    {[25, 50, 75, 100].map(pct => (
                        <button
                            key={pct}
                            onClick={(e) => {
                                e.stopPropagation();
                                updateModuleProgress(module.id, module.projectId, station.id, pct);
                            }}
                            className={`flex-1 text-xs py-0.5 rounded transition ${
                                currentProgress >= pct 
                                    ? isComplete 
                                        ? 'bg-green-500 text-white' 
                                        : 'bg-autovol-teal text-white'
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                            title={`Set to ${pct}%`}
                        >
                            {pct === 100 ? '✓' : ''}
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
    
    // Get reference counts from first station (for grid alignment)
    const firstStation = productionStages[0];
    const firstStationModules = firstStation ? getModulesForStation(firstStation) : { previous: [], current: [], next: [] };
    const expectedPrevCount = firstStationModules.previous.length;
    const expectedNextCount = firstStationModules.next.length;
    
    // Render placeholder card for empty slots (compact style)
    const renderPlaceholderCard = (weekSection) => {
        const borderClass = weekSection === 'previous' ? 'border-red-200' : 
                           weekSection === 'next' ? 'border-green-200' : 'border-gray-200';
        const bgClass = weekSection === 'previous' ? 'bg-red-50/50' : 
                       weekSection === 'next' ? 'bg-green-50/30' : 'bg-gray-50';
        return (
            <div 
                className={`rounded p-1.5 ${bgClass} border border-dashed ${borderClass}`}
                style={{ height: `${CARD_HEIGHT}px` }}
            >
                <div className="flex items-center justify-center h-full text-gray-300 text-xs">
                    —
                </div>
            </div>
        );
    };
    
    // Render station column with previous/current/next sections
    const renderStationColumn = (station) => {
        const { previous, current, next } = getModulesForStation(station);
        const startingModule = getStationStartingModule(station.id);
        const hasModules = previous.length > 0 || current.length > 0 || next.length > 0;
        
        return (
            <div key={station.id} className="flex-shrink-0 w-36">
                {/* Station Header - matches Station Board */}
                <div className={`${station.color} text-white px-2 py-2 text-center rounded-t-lg`}>
                    <div className="font-semibold text-xs truncate" title={station.name}>{station.dept}</div>
                    <div className="text-xs opacity-80">Start: {startingModule?.serialNumber?.slice(-4) || '—'}</div>
                </div>
                
                {/* Module Cards Container */}
                <div className="bg-white min-h-80 p-1 space-y-1 border-x border-b border-gray-200">
                    {!hasModules && expectedPrevCount === 0 && expectedNextCount === 0 ? (
                        <div className="text-sm text-gray-400 text-center py-8">
                            No modules
                        </div>
                    ) : (
                        <>
                            {/* Previous Week Section - pad with placeholders if needed */}
                            {expectedPrevCount > 0 && (
                                <>
                                    {Array.from({ length: expectedPrevCount }).map((_, idx) => (
                                        <React.Fragment key={`prev-${idx}`}>
                                            {previous[idx] 
                                                ? renderModuleCard(previous[idx], station, 'previous')
                                                : renderPlaceholderCard('previous')
                                            }
                                        </React.Fragment>
                                    ))}
                                    {/* Divider between previous and current */}
                                    <div className="border-t-2 border-dashed border-red-300 my-1"></div>
                                </>
                            )}
                            
                            {/* Current Week Section */}
                            {current.map(module => renderModuleCard(module, station, 'current'))}
                            
                            {/* Next Week Preview Section - pad with placeholders if needed */}
                            {expectedNextCount > 0 && (
                                <>
                                    {/* Divider between current and next */}
                                    <div className="border-t-2 border-dashed border-green-300 my-1"></div>
                                    {Array.from({ length: expectedNextCount }).map((_, idx) => (
                                        <React.Fragment key={`next-${idx}`}>
                                            {next[idx] 
                                                ? renderModuleCard(next[idx], station, 'next')
                                                : renderPlaceholderCard('next')
                                            }
                                        </React.Fragment>
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    };
    
    // Render date marker column (sticky left side) - aligned with station columns
    const renderDateMarkerColumn = () => {
        // Use the same reference counts as station columns
        const { previous, current, next } = firstStationModules;
        
        return (
            <div className="flex-shrink-0 w-20 sticky left-0 z-10 bg-white" style={{ boxShadow: '4px 0 8px rgba(0,0,0,0.08)' }}>
                {/* Header - matches station header height */}
                <div className="bg-autovol-navy text-white px-2 py-2 text-center rounded-tl-lg">
                    <div className="font-semibold text-xs">Day</div>
                    <div className="text-xs opacity-80">Date</div>
                </div>
                
                {/* Row markers - aligned with module cards */}
                <div className="bg-white min-h-80 p-1 space-y-1 border-l border-b border-gray-200">
                    
                    {/* Previous Week row markers */}
                    {previous.length > 0 && (
                        <>
                            {previous.map((_, idx) => (
                                <div 
                                    key={`prev-${idx}`}
                                    className="rounded border border-red-300 bg-red-50 flex items-center justify-center text-center"
                                    style={{ height: `${CARD_HEIGHT}px` }}
                                >
                                    <div className="text-xs font-bold text-red-600">PREV</div>
                                </div>
                            ))}
                            {/* Divider */}
                            <div className="border-t border-dashed border-red-300 my-0.5"></div>
                        </>
                    )}
                    
                    {/* Current week day markers */}
                    {dayLabels.map((dayInfo, idx) => (
                        <div 
                            key={`${dayInfo.day}-${dayInfo.slotNum}`}
                            className="rounded border border-autovol-teal bg-white flex flex-col items-center justify-center text-center"
                            style={{ height: `${CARD_HEIGHT}px` }}
                        >
                            <div className="text-xs font-bold text-autovol-navy">{dayInfo.label}</div>
                            <div className="text-xs text-gray-500">{dayInfo.monthStr} {dayInfo.dayNum}</div>
                        </div>
                    ))}
                    
                    {/* Next Week row markers */}
                    {next.length > 0 && (
                        <>
                            {/* Divider */}
                            <div className="border-t border-dashed border-green-300 my-0.5"></div>
                            {next.map((_, idx) => (
                                <div 
                                    key={`next-${idx}`}
                                    className="rounded border border-green-300 bg-green-50 flex items-center justify-center text-center"
                                    style={{ height: `${CARD_HEIGHT}px` }}
                                >
                                    <div className="text-xs font-bold text-green-600">NEXT</div>
                                </div>
                            ))}
                        </>
                    )}
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
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 rounded bg-red-50/30 border-red-300"></div>
                    <span>Previous Week</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 rounded bg-green-50/30 border-green-300"></div>
                    <span>Next Week</span>
                </div>
            </div>
            
            {/* Selection Toolbar - appears when modules are selected */}
            {selectedModules.size > 0 && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white rounded-xl shadow-2xl border-2 border-blue-500 p-3 flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{selectedModules.size}</span>
                        </div>
                        <span className="font-medium text-gray-700">selected</span>
                    </div>
                    <div className="h-8 w-px bg-gray-300"></div>
                    <div className="flex items-center gap-0.5">
                        <span className="text-sm text-gray-500 mr-2">Set to:</span>
                        {[25, 50, 75, 100].map(value => (
                            <button
                                key={value}
                                onClick={() => bulkUpdateProgress(value)}
                                className={`flex-1 text-xs py-1.5 px-3 rounded transition ${
                                    value === 100 
                                        ? 'bg-gray-200 hover:bg-green-500 hover:text-white' 
                                        : 'bg-gray-200 hover:bg-autovol-teal hover:text-white'
                                }`}
                                title={`Set all to ${value}%`}
                            >
                                {value === 100 ? '✓' : ''}
                            </button>
                        ))}
                        <button
                            onClick={() => bulkUpdateProgress(0)}
                            className="text-xs py-1.5 px-2 rounded bg-gray-200 hover:bg-red-400 hover:text-white transition ml-1"
                            title="Reset all to 0%"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="h-8 w-px bg-gray-300"></div>
                    <button
                        onClick={clearSelection}
                        className="px-3 py-2 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Clear selection (Esc)"
                    >
                        ✕ Clear
                    </button>
                </div>
            )}
            
            {/* Bulk Context Menu - appears on right-click */}
            {showBulkMenu && (
                <div 
                    className="fixed z-[100] bg-white rounded-lg shadow-2xl border border-gray-200 py-2 min-w-[160px]"
                    style={{ 
                        top: Math.min(showBulkMenu.y, window.innerHeight - 200),
                        left: Math.min(showBulkMenu.x, window.innerWidth - 180)
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="px-3 py-1 text-xs text-gray-500 font-medium border-b mb-1">
                        Bulk Progress ({selectedModules.size} selected)
                    </div>
                    {[0, 25, 50, 75, 100].map(value => (
                        <button
                            key={value}
                            onClick={() => bulkUpdateProgress(value)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between"
                        >
                            <span>Set to {value}%</span>
                            {value === 100 && <span className="text-green-500">✓</span>}
                        </button>
                    ))}
                    <div className="border-t mt-1 pt-1">
                        <button
                            onClick={clearSelection}
                            className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            
            {/* Click overlay to close bulk menu */}
            {showBulkMenu && (
                <div 
                    className="fixed inset-0 z-[99]" 
                    onClick={() => setShowBulkMenu(null)}
                />
            )}
            
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
                    addWeek={addWeek}
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
function WeekCompleteModal({ currentWeek, lineBalance, activeProjects, allModules, onComplete, onClose, addWeek }) {
    const { useState, useMemo, useEffect } = React;
    
    // Form state
    const [modulesProduced, setModulesProduced] = useState(lineBalance);
    const [useAutoProgress, setUseAutoProgress] = useState(true);
    const [manualNextModule, setManualNextModule] = useState('');
    const [createNextWeek, setCreateNextWeek] = useState(true);
    const [nextWeekShift, setNextWeekShift] = useState('shift1'); // shift1 = Mon-Thu, shift2 = Fri-Sun
    const [notes, setNotes] = useState('');
    
    // Calculate current starting module index
    const currentStartIdx = useMemo(() => {
        if (!currentWeek?.startingModule) return -1;
        return allModules.findIndex(m => m.serialNumber === currentWeek.startingModule);
    }, [currentWeek, allModules]);
    
    // Calculate suggested next starting module based on ACTUAL modules produced
    const suggestedNextModule = useMemo(() => {
        if (currentStartIdx === -1) return null;
        const nextIdx = currentStartIdx + modulesProduced;
        return allModules[nextIdx] || null;
    }, [currentStartIdx, modulesProduced, allModules]);
    
    // Calculate variance
    const variance = modulesProduced - lineBalance;
    const varianceText = variance === 0 ? 'On target' : variance > 0 ? `+${variance} ahead` : `${variance} behind`;
    const varianceColor = variance === 0 ? 'text-gray-600' : variance > 0 ? 'text-green-600' : 'text-red-600';
    
    // Determine the next starting module
    const nextStartingModule = useAutoProgress 
        ? suggestedNextModule?.serialNumber 
        : manualNextModule;
    
    // Calculate next week dates
    const getNextWeekDates = () => {
        if (!currentWeek?.weekStart) return { start: '', end: '' };
        const currentStart = new Date(currentWeek.weekStart);
        const nextMonday = new Date(currentStart);
        nextMonday.setDate(currentStart.getDate() + 7);
        const nextSunday = new Date(nextMonday);
        nextSunday.setDate(nextMonday.getDate() + 6);
        return {
            start: nextMonday.toISOString().split('T')[0],
            end: nextSunday.toISOString().split('T')[0]
        };
    };
    
    const nextWeekDates = getNextWeekDates();
    
    // Update manual module when auto-progress changes
    useEffect(() => {
        if (!useAutoProgress && suggestedNextModule) {
            setManualNextModule(suggestedNextModule.serialNumber);
        }
    }, [useAutoProgress, suggestedNextModule]);
    
    const handleComplete = () => {
        // Build week completion data
        const weekData = {
            weekStart: currentWeek.weekStart,
            weekEnd: currentWeek.weekEnd,
            plannedLineBalance: lineBalance,
            actualProduced: modulesProduced,
            variance: variance,
            startingModule: currentWeek.startingModule,
            nextStartingModule: nextStartingModule,
            projectsIncluded: activeProjects.map(p => ({ id: p.id, name: p.name })),
            notes,
            shift: nextWeekShift
        };
        
        // Complete the current week (saves to history)
        onComplete(weekData);
        
        // Auto-create next week if enabled
        if (createNextWeek && nextStartingModule && addWeek) {
            const nextWeekData = {
                weekStart: nextWeekDates.start,
                weekEnd: nextWeekDates.end,
                startingModule: nextStartingModule,
                productionGoal: lineBalance,
                dailyGoal: Math.ceil(lineBalance / 4),
                notes: `Auto-created from week ${currentWeek.weekStart}`
            };
            addWeek(nextWeekData);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
                    <h3 className="text-lg font-bold text-autovol-navy">Complete Week</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
                </div>
                
                <div className="p-6 space-y-5">
                    {/* Week Summary */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Week Summary</div>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Week:</span>
                                <span className="font-medium">{currentWeek?.weekStart} → {currentWeek?.weekEnd}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Starting Module:</span>
                                <span className="font-mono font-medium">{currentWeek?.startingModule}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Planned Line Balance:</span>
                                <span className="font-bold text-autovol-teal">{lineBalance} modules</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Active Projects:</span>
                                <span>{activeProjects.length}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Modules Produced Input */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                        <label className="block text-sm font-bold text-blue-800 mb-2">
                            Modules Produced This Week
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min="0"
                                max={allModules.length}
                                value={modulesProduced}
                                onChange={(e) => setModulesProduced(parseInt(e.target.value) || 0)}
                                className="w-24 text-center text-2xl font-bold border-2 border-blue-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            />
                            <div className="flex-1">
                                <div className={`font-medium ${varianceColor}`}>{varianceText}</div>
                                <div className="text-xs text-gray-500">vs. {lineBalance} planned</div>
                            </div>
                        </div>
                        <p className="text-xs text-blue-600 mt-2">
                            This determines the next week's starting module based on actual production.
                        </p>
                    </div>
                    
                    {/* Next Starting Module */}
                    <div className="border rounded-lg p-4">
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                            Next Week's Starting Module
                        </label>
                        
                        {/* Auto-progress option */}
                        <div className="space-y-3">
                            <label className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer hover:bg-gray-50 transition-colors"
                                style={{ borderColor: useAutoProgress ? '#0d9488' : '#e5e7eb' }}>
                                <input
                                    type="radio"
                                    checked={useAutoProgress}
                                    onChange={() => setUseAutoProgress(true)}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-gray-800">Auto-progress (Recommended)</div>
                                    <div className="text-sm text-gray-500">
                                        Based on {modulesProduced} modules produced:
                                    </div>
                                    {suggestedNextModule ? (
                                        <div className="mt-1 font-mono text-lg font-bold text-autovol-teal">
                                            {suggestedNextModule.serialNumber}
                                        </div>
                                    ) : (
                                        <div className="mt-1 text-sm text-red-500">No more modules available</div>
                                    )}
                                </div>
                            </label>
                            
                            <label className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer hover:bg-gray-50 transition-colors"
                                style={{ borderColor: !useAutoProgress ? '#0d9488' : '#e5e7eb' }}>
                                <input
                                    type="radio"
                                    checked={!useAutoProgress}
                                    onChange={() => setUseAutoProgress(false)}
                                    className="mt-1"
                                />
                                <div className="flex-1">
                                    <div className="font-medium text-gray-800">Choose Different Module</div>
                                    {!useAutoProgress && (
                                        <select
                                            value={manualNextModule}
                                            onChange={(e) => setManualNextModule(e.target.value)}
                                            className="mt-2 w-full border rounded-lg px-3 py-2 text-sm"
                                            onClick={(e) => e.stopPropagation()}
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
                            </label>
                        </div>
                    </div>
                    
                    {/* Auto-create Next Week */}
                    <div className="border rounded-lg p-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={createNextWeek}
                                onChange={(e) => setCreateNextWeek(e.target.checked)}
                                className="w-5 h-5 rounded text-autovol-teal"
                            />
                            <div>
                                <div className="font-medium text-gray-800">Auto-create Next Week Schedule</div>
                                <div className="text-sm text-gray-500">
                                    {nextWeekDates.start} → {nextWeekDates.end}
                                </div>
                            </div>
                        </label>
                        
                        {createNextWeek && (
                            <div className="mt-3 pl-8">
                                <label className="block text-sm text-gray-600 mb-1">Shift Schedule:</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNextWeekShift('shift1')}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                            nextWeekShift === 'shift1' 
                                                ? 'bg-autovol-teal text-white' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        Shift 1 (Mon-Thu)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNextWeekShift('shift2')}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                            nextWeekShift === 'shift2' 
                                                ? 'bg-autovol-teal text-white' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        Shift 2 (Fri-Sun)
                                    </button>
                                </div>
                            </div>
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
                
                <div className="p-4 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleComplete}
                        disabled={!nextStartingModule && createNextWeek}
                        className="px-4 py-2 btn-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {createNextWeek ? 'Complete & Create Next Week' : 'Complete Week'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ===== WEEK HISTORY MODAL =====
function WeekHistoryModal({ completedWeeks, onClose }) {
    // Helper to get variance display
    const getVarianceDisplay = (week) => {
        const variance = week.variance ?? (week.actualProduced - (week.plannedLineBalance || week.lineBalance));
        if (variance === 0 || isNaN(variance)) return { text: 'On target', color: 'text-gray-500', bg: 'bg-gray-100' };
        if (variance > 0) return { text: `+${variance} ahead`, color: 'text-green-600', bg: 'bg-green-100' };
        return { text: `${variance} behind`, color: 'text-red-600', bg: 'bg-red-100' };
    };
    
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
                            {completedWeeks.map(week => {
                                const varianceInfo = getVarianceDisplay(week);
                                return (
                                    <div key={week.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="font-semibold text-gray-800">
                                                    {week.weekStart} → {week.weekEnd}
                                                </div>
                                                
                                                {/* Production Stats */}
                                                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-gray-500">Planned:</span>
                                                        <span className="font-medium">{week.plannedLineBalance || week.lineBalance}</span>
                                                    </div>
                                                    {week.actualProduced !== undefined && (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-gray-500">Actual:</span>
                                                            <span className="font-bold text-autovol-teal">{week.actualProduced}</span>
                                                        </div>
                                                    )}
                                                    {week.actualProduced !== undefined && (
                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${varianceInfo.bg} ${varianceInfo.color}`}>
                                                            {varianceInfo.text}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {/* Module Range */}
                                                <div className="mt-2 text-xs text-gray-500">
                                                    <span className="font-medium">Start:</span> {week.startingModule}
                                                    {week.nextStartingModule && (
                                                        <span className="ml-3">
                                                            <span className="font-medium">→ Next:</span> {week.nextStartingModule}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {/* Projects */}
                                                {week.projectsIncluded && week.projectsIncluded.length > 0 && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Projects: {week.projectsIncluded.map(p => p.name).join(', ')}
                                                    </div>
                                                )}
                                                
                                                {/* Notes */}
                                                {week.notes && (
                                                    <div className="text-sm text-gray-600 mt-2 italic border-l-2 border-gray-200 pl-2">
                                                        "{week.notes}"
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-xs text-gray-400 ml-4">
                                                {new Date(week.completedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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
