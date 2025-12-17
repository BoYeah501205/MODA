// ============================================================================
// WEEKLY BOARD COMPONENTS
// Weekly Board and Schedule Setup sub-tabs for Production Dashboard
// ============================================================================

// ===== WEEKLY SCHEDULE MANAGEMENT HOOK =====
// Manages schedule setup (shift assignments) and completed week history
// Uses Supabase for persistence (shared across all users)
// Only trevor@autovol.com and stephanie@autovol.com can edit schedules
const useWeeklySchedule = () => {
    const { useState, useEffect, useCallback, useRef } = React;
    
    const DEFAULT_SCHEDULE = {
        shift1: { monday: 5, tuesday: 5, wednesday: 5, thursday: 5 },
        shift2: { friday: 0, saturday: 0, sunday: 0 }
    };
    
    // Current week's schedule setup (per-day module assignments by shift)
    const [scheduleSetup, setScheduleSetup] = useState(DEFAULT_SCHEDULE);
    
    // Completed weeks history
    const [completedWeeks, setCompletedWeeks] = useState([]);
    
    // Loading and sync state
    const [loading, setLoading] = useState(true);
    const [synced, setSynced] = useState(false);
    
    // Track if we can edit (only trevor@autovol.com)
    const [canEdit, setCanEdit] = useState(false);
    
    // Ref to track if we're saving to prevent loops
    const isSaving = useRef(false);
    // Ref to track if update came from real-time (skip save)
    const isFromRealtime = useRef(false);
    
    // Check Supabase availability
    const isSupabaseAvailable = useCallback(() => {
        return window.MODA_SUPABASE_DATA?.isAvailable?.() && 
               window.MODA_SUPABASE_DATA?.weeklySchedules;
    }, []);
    
    // Load from Supabase on mount
    useEffect(() => {
        const loadFromSupabase = async () => {
            if (!isSupabaseAvailable()) {
                console.log('[WeeklySchedule] Supabase not available, using localStorage fallback');
                // Fallback to localStorage with safe parsing
                try {
                    const savedSetup = localStorage.getItem('autovol_schedule_setup');
                    const savedWeeks = localStorage.getItem('autovol_completed_weeks');
                    if (savedSetup && savedSetup !== 'undefined' && savedSetup !== 'null') {
                        setScheduleSetup(JSON.parse(savedSetup));
                    }
                    if (savedWeeks && savedWeeks !== 'undefined' && savedWeeks !== 'null') {
                        setCompletedWeeks(JSON.parse(savedWeeks));
                    }
                } catch (e) {
                    console.error('[WeeklySchedule] Error parsing localStorage:', e);
                }
                setLoading(false);
                return;
            }
            
            try {
                const api = window.MODA_SUPABASE_DATA.weeklySchedules;
                
                // Check edit permission
                setCanEdit(api.canEdit());
                
                // Load current schedule
                const current = await api.getCurrent();
                if (current) {
                    setScheduleSetup({
                        shift1: current.shift1 || DEFAULT_SCHEDULE.shift1,
                        shift2: current.shift2 || DEFAULT_SCHEDULE.shift2
                    });
                }
                
                // Load completed weeks
                const completed = await api.getCompleted();
                setCompletedWeeks(completed.map(w => ({
                    id: w.id,
                    weekId: w.week_id,
                    shift1: w.shift1,
                    shift2: w.shift2,
                    lineBalance: w.line_balance,
                    completedAt: w.completed_at,
                    scheduleSnapshot: w.schedule_snapshot
                })));
                
                setSynced(true);
                console.log('[WeeklySchedule] Loaded from Supabase');
            } catch (err) {
                console.error('[WeeklySchedule] Load error:', err);
                // Fallback to localStorage with safe parsing
                try {
                    const savedSetup = localStorage.getItem('autovol_schedule_setup');
                    const savedWeeks = localStorage.getItem('autovol_completed_weeks');
                    if (savedSetup && savedSetup !== 'undefined' && savedSetup !== 'null') {
                        setScheduleSetup(JSON.parse(savedSetup));
                    }
                    if (savedWeeks && savedWeeks !== 'undefined' && savedWeeks !== 'null') {
                        setCompletedWeeks(JSON.parse(savedWeeks));
                    }
                } catch (parseErr) {
                    console.error('[WeeklySchedule] Error parsing localStorage fallback:', parseErr);
                }
            } finally {
                setLoading(false);
            }
        };
        
        loadFromSupabase();
        
        // Subscribe to real-time updates
        if (isSupabaseAvailable()) {
            const unsubscribe = window.MODA_SUPABASE_DATA.weeklySchedules.onSnapshot(({ current, completed }) => {
                if (isSaving.current) return; // Skip if we're the one saving
                
                if (current) {
                    isFromRealtime.current = true; // Mark as real-time update to skip save
                    setScheduleSetup({
                        shift1: current.shift1 || DEFAULT_SCHEDULE.shift1,
                        shift2: current.shift2 || DEFAULT_SCHEDULE.shift2
                    });
                }
                
                if (completed) {
                    setCompletedWeeks(completed.map(w => ({
                        id: w.id,
                        weekId: w.week_id,
                        shift1: w.shift1,
                        shift2: w.shift2,
                        lineBalance: w.line_balance,
                        completedAt: w.completed_at,
                        scheduleSnapshot: w.schedule_snapshot
                    })));
                }
            });
            
            return () => unsubscribe?.();
        }
    }, [isSupabaseAvailable]);
    
    // Save to Supabase when schedule changes (debounced)
    useEffect(() => {
        if (loading) return; // Don't save during initial load
        
        // Skip save if this update came from real-time subscription
        if (isFromRealtime.current) {
            isFromRealtime.current = false; // Reset flag
            return;
        }
        
        // Always save to localStorage as backup
        localStorage.setItem('autovol_schedule_setup', JSON.stringify(scheduleSetup));
        
        // Save to Supabase if available and user can edit
        if (isSupabaseAvailable() && canEdit) {
            isSaving.current = true;
            const saveTimeout = setTimeout(async () => {
                try {
                    await window.MODA_SUPABASE_DATA.weeklySchedules.saveCurrent(scheduleSetup);
                    setSynced(true);
                } catch (err) {
                    console.error('[WeeklySchedule] Save error:', err);
                    setSynced(false);
                } finally {
                    isSaving.current = false;
                }
            }, 500); // Debounce 500ms
            
            return () => clearTimeout(saveTimeout);
        }
    }, [scheduleSetup, loading, isSupabaseAvailable, canEdit]);
    
    // Update shift schedule (only if user can edit)
    const updateShiftSchedule = useCallback((shift, day, value) => {
        if (!canEdit) {
            console.warn('[WeeklySchedule] Cannot edit - only trevor@autovol.com or stephanie@autovol.com can modify schedules');
            return;
        }
        setScheduleSetup(prev => ({
            ...prev,
            [shift]: {
                ...prev[shift],
                [day]: parseInt(value) || 0
            }
        }));
    }, [canEdit]);
    
    // Get total modules for a shift
    const getShiftTotal = useCallback((shift) => {
        const shiftData = scheduleSetup[shift] || {};
        return Object.values(shiftData).reduce((sum, val) => sum + (val || 0), 0);
    }, [scheduleSetup]);
    
    // Get total line balance (all shifts combined)
    const getLineBalance = useCallback(() => {
        return getShiftTotal('shift1') + getShiftTotal('shift2');
    }, [getShiftTotal]);
    
    // Complete a week - creates historical record
    const completeWeek = useCallback(async (weekData) => {
        if (!canEdit) {
            console.warn('[WeeklySchedule] Cannot complete week - only trevor@autovol.com or stephanie@autovol.com can modify schedules');
            return null;
        }
        
        const completedWeek = {
            weekId: weekData.weekId || `week-${Date.now()}`,
            shift1: scheduleSetup.shift1,
            shift2: scheduleSetup.shift2,
            lineBalance: weekData.lineBalance || getLineBalance(),
            scheduleSnapshot: { ...scheduleSetup }
        };
        
        if (isSupabaseAvailable()) {
            try {
                const saved = await window.MODA_SUPABASE_DATA.weeklySchedules.completeWeek(completedWeek);
                const formattedWeek = {
                    id: saved.id,
                    ...completedWeek,
                    completedAt: saved.completed_at
                };
                setCompletedWeeks(prev => [formattedWeek, ...prev]);
                return formattedWeek;
            } catch (err) {
                console.error('[WeeklySchedule] Complete week error:', err);
            }
        }
        
        // Fallback to localStorage
        const localWeek = {
            id: `completed-week-${Date.now()}`,
            ...completedWeek,
            completedAt: new Date().toISOString()
        };
        setCompletedWeeks(prev => {
            const updated = [localWeek, ...prev];
            localStorage.setItem('autovol_completed_weeks', JSON.stringify(updated));
            return updated;
        });
        return localWeek;
    }, [canEdit, scheduleSetup, getLineBalance, isSupabaseAvailable]);
    
    // Get completed week by ID
    const getCompletedWeek = useCallback((weekId) => {
        return completedWeeks.find(w => w.id === weekId);
    }, [completedWeeks]);
    
    // Get recent completed weeks (for summary view)
    const getRecentWeeks = useCallback((count = 10) => {
        return completedWeeks.slice(0, count);
    }, [completedWeeks]);
    
    // Delete a completed week record
    const deleteCompletedWeek = useCallback(async (weekId) => {
        if (!canEdit) {
            console.warn('[WeeklySchedule] Cannot delete - only trevor@autovol.com or stephanie@autovol.com can modify schedules');
            return;
        }
        
        if (isSupabaseAvailable()) {
            try {
                await window.MODA_SUPABASE_DATA.weeklySchedules.deleteCompleted(weekId);
            } catch (err) {
                console.error('[WeeklySchedule] Delete error:', err);
            }
        }
        
        setCompletedWeeks(prev => {
            const updated = prev.filter(w => w.id !== weekId);
            localStorage.setItem('autovol_completed_weeks', JSON.stringify(updated));
            return updated;
        });
    }, [canEdit, isSupabaseAvailable]);
    
    return {
        scheduleSetup,
        completedWeeks,
        updateShiftSchedule,
        getShiftTotal,
        getLineBalance,
        completeWeek,
        getCompletedWeek,
        getRecentWeeks,
        deleteCompletedWeek,
        loading,
        synced,
        canEdit
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
    setProjects,
    // Permission props
    canEdit = true // Tab-specific edit permission (false = view-only mode)
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
            {/* View-Only Banner for non-authorized users */}
            {!canEdit && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
                    <span className="text-amber-600 text-xl">&#128274;</span>
                    <div>
                        <div className="font-medium text-amber-800">View-Only Mode</div>
                        <div className="text-sm text-amber-600">Only Trevor or Stephanie can modify the schedule setup. Changes sync to all users automatically.</div>
                    </div>
                </div>
            )}
            
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
                    {canEdit && (
                        <button 
                            onClick={handleOpenAdd} 
                            className="px-3 py-1 bg-white text-autovol-teal rounded font-medium text-sm hover:bg-gray-100"
                        >
                            + Add Week
                        </button>
                    )}
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
                                        {canEdit && (
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
                                        )}
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
                                            className={`w-20 border rounded px-3 py-2 text-center font-mono ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                            disabled={!canEdit}
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
// Added: onLogQAInspection for QA role users
function ModuleCardPrompt({ module, station, position, onClose, onViewDetails, onReportIssue, onShopDrawing, onMoveModule, onLogQAInspection, userRole }) {
    const { useEffect, useRef } = React;
    const promptRef = useRef(null);
    
    // Check if user has QA role (qa or admin)
    // userRole is an object with .id property (e.g., { id: 'qa', name: 'QA', ... })
    const roleId = userRole?.id || userRole;
    const isQARole = roleId === 'qa' || roleId === 'admin';
    
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
            {/* QA Inspection - Only visible to QA role */}
            {isQARole && onLogQAInspection && (
                <>
                    <div className="border-t my-1"></div>
                    <button
                        onClick={() => { onLogQAInspection(module, station); onClose(); }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-teal-50 flex items-center gap-3 text-teal-700"
                    >
                        <span className="icon-qa" style={{ width: '16px', height: '16px', display: 'inline-block' }}></span> Log QA Inspection
                    </button>
                </>
            )}
            {onMoveModule && (
                <>
                    <div className="border-t my-1"></div>
                    <button
                        onClick={() => { onMoveModule(module); }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 flex items-center gap-3 text-blue-700"
                    >
                        <span>↕️</span> Move in Schedule
                    </button>
                </>
            )}
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

// ===== STATION CAPACITY CONFIG =====
// Default capacity per station (modules that can be worked on simultaneously)
const DEFAULT_STATION_CAPACITY = 5;

// ===== WEEKLY BOARD SUB-TAB COMPONENT =====
function WeeklyBoardTab({ 
    projects, 
    productionStages, 
    staggerConfig, 
    currentWeek,
    weeks = [], // All available weeks for selector
    scheduleSetup,
    getLineBalance,
    completedWeeks,
    completeWeek,
    addWeek, // For auto-creating next week
    onModuleClick,
    setProductionTab,
    setProjects, // For updating module progress
    onReportIssue, // For opening report issue modal
    canEdit = true, // Tab-specific edit permission (false = view-only mode)
    stationCapacities = {}, // Optional: custom capacities per station { stationId: number }
    userRole = null, // User's dashboard role (e.g., 'qa', 'admin')
    onLogQAInspection = null // Callback for QA inspection (module, station) => void
}) {
    const { useState, useRef, useEffect, useCallback, useMemo } = React;
    
    // Mobile detection
    const isMobile = window.useIsMobile ? window.useIsMobile(768) : false;
    
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [activePrompt, setActivePrompt] = useState(null); // { module, station, position }
    
    // ===== WEEK SELECTOR =====
    // selectedWeekId: null means "use currentWeek (auto)", otherwise use specific week
    const [selectedWeekId, setSelectedWeekId] = useState(null);
    
    // Determine which week to display
    const displayWeek = useMemo(() => {
        if (selectedWeekId) {
            return weeks.find(w => w.id === selectedWeekId) || currentWeek;
        }
        return currentWeek;
    }, [selectedWeekId, weeks, currentWeek]);
    
    // ===== TOAST NOTIFICATION SYSTEM =====
    const [toasts, setToasts] = useState([]); // Array of { id, message, type, moduleSerial, stationName }
    
    // Add a toast notification
    const addToast = useCallback((message, type = 'success', moduleSerial = '', stationName = '') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, moduleSerial, stationName }]);
        
        // Auto-dismiss after 4 seconds
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);
    
    // Remove a toast manually
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);
    
    // ===== MODULE REORDERING SYSTEM =====
    const [showMoveModal, setShowMoveModal] = useState(null); // { module, currentPosition }
    const [showMoveConfirm, setShowMoveConfirm] = useState(null); // { module, fromPosition, toPosition, applyToAll }
    
    // ===== REORDER MODE (Drag-and-Drop) =====
    const [reorderMode, setReorderMode] = useState(false);
    const [pendingReorders, setPendingReorders] = useState([]); // Array of { moduleId, fromSeq, toSeq }
    const [draggedModule, setDraggedModule] = useState(null);
    const [dragOverTarget, setDragOverTarget] = useState(null); // { moduleId, position: 'before' | 'after' }
    const [showReorderConfirm, setShowReorderConfirm] = useState(false);
    
    // ===== PDF EXPORT =====
    const [showPDFExport, setShowPDFExport] = useState(false);
    const [pdfExportScope, setPdfExportScope] = useState('current'); // 'current', 'all', 'with-prev', 'with-next'
    
    // ===== BOARD VIEW MODE =====
    // 'compact' = serial number only (original), 'detailed' = full module info like Modules On-Board panel
    const [boardViewMode, setBoardViewMode] = useState('compact');
    
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
    
    // Check if we have the required configuration (use displayWeek for board rendering)
    const hasWeekConfig = displayWeek && displayWeek.startingModule;
    const lineBalance = getLineBalance();
    
    // Get all modules from all active projects, sorted by build sequence
    const allModules = activeProjects.flatMap(p => 
        (p.modules || []).map(m => ({ ...m, projectId: p.id, projectName: p.name }))
    ).sort((a, b) => (a.buildSequence || 0) - (b.buildSequence || 0));
    
    // Get starting module for a station based on stagger
    // Stagger is subtracted because downstream stations work on earlier modules
    // (modules that have already passed through upstream stations)
    const getStationStartingModule = (stationId) => {
        if (!displayWeek?.startingModule) return null;
        const stagger = staggerConfig[stationId] || 0;
        const startingModule = allModules.find(m => m.serialNumber === displayWeek.startingModule);
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
    
    // ===== STATION CAPACITY CALCULATION =====
    // Calculate current load and capacity status for each station
    const getStationCapacityInfo = useMemo(() => {
        const capacityInfo = {};
        
        productionStages.forEach(station => {
            const capacity = stationCapacities[station.id] || DEFAULT_STATION_CAPACITY;
            const { current } = getModulesForStation(station);
            
            // Count modules that are in-progress (not complete, not pending)
            const inProgress = current.filter(m => m.status === 'in-progress').length;
            const pending = current.filter(m => m.status === 'pending').length;
            const complete = current.filter(m => m.status === 'complete').length;
            const total = current.length;
            
            // Calculate load percentage (in-progress + pending that should be started)
            const activeLoad = inProgress + Math.min(pending, capacity - inProgress);
            const loadPercent = Math.round((activeLoad / capacity) * 100);
            
            // Determine status: green (under), yellow (at), red (over)
            let status = 'under';
            if (activeLoad >= capacity) status = 'at';
            if (activeLoad > capacity) status = 'over';
            
            capacityInfo[station.id] = {
                capacity,
                inProgress,
                pending,
                complete,
                total,
                activeLoad,
                loadPercent: Math.min(loadPercent, 100), // Cap at 100 for display
                actualPercent: loadPercent, // Keep actual for warnings
                status
            };
        });
        
        return capacityInfo;
    }, [productionStages, stationCapacities, allModules, displayWeek]);
    
    // Get the last working day date for previous week label
    const getPreviousWeekLastDay = () => {
        if (!displayWeek?.weekStart) return null;
        const weekStart = new Date(displayWeek.weekStart);
        // Go back to previous Thursday (last working day of previous week)
        const prevThursday = new Date(weekStart);
        prevThursday.setDate(weekStart.getDate() - 4); // Monday - 4 = Thursday of prev week
        return prevThursday;
    };
    
    // Get recently completed modules (modules that are 100% at ALL stations)
    const getRecentlyCompleted = () => {
        // Filter modules that have 100% progress at ALL production stages
        const fullyCompleted = allModules.filter(module => {
            const progress = module.stageProgress || {};
            // Check if every station has 100% progress
            return productionStages.every(station => progress[station.id] === 100);
        });
        
        // Sort by the most recent station completion timestamp
        return fullyCompleted
            .map(module => {
                // Get the latest completion timestamp across all stations
                const completedAt = module.stationCompletedAt 
                    ? Math.max(...Object.values(module.stationCompletedAt))
                    : 0;
                return { ...module, completedAt };
            })
            .sort((a, b) => b.completedAt - a.completedAt)
            .slice(0, 5);
    };
    
    // Get all modules currently on the board (previous + current + upcoming)
    const getModulesOnBoard = useMemo(() => {
        if (!hasWeekConfig) return [];
        
        const firstStation = productionStages[0];
        if (!firstStation) return [];
        
        const { previous, current, next } = getModulesForStation(firstStation);
        
        // Combine all modules with their section info
        const allOnBoard = [
            ...previous.map(m => ({ ...m, section: 'previous' })),
            ...current.map(m => ({ ...m, section: 'current' })),
            ...next.map(m => ({ ...m, section: 'next' }))
        ];
        
        return allOnBoard;
    }, [hasWeekConfig, productionStages, allModules, displayWeek, staggerConfig, lineBalance]);
    
    // Difficulty indicator colors
    const difficultyColors = {
        sidewall: '#f97316',    // orange
        stair: '#8b5cf6',       // purple
        hr3Wall: '#ef4444',     // red
        short: '#eab308',       // yellow
        doubleStudio: '#6366f1', // indigo
        sawbox: '#ec4899'       // pink
    };
    
    const difficultyLabels = {
        sidewall: 'SW',
        stair: 'STAIR',
        hr3Wall: '3HR',
        short: 'SHORT',
        doubleStudio: 'DBL',
        sawbox: 'SAW'
    };
    
    // Update module progress for a specific station (works across all projects)
    const updateModuleProgress = (moduleId, projectId, stationId, newProgress) => {
        if (!setProjects) return;
        
        // Find module info for toast before updating
        const project = projects.find(p => p.id === projectId);
        const module = project?.modules?.find(m => m.id === moduleId);
        const station = productionStages.find(s => s.id === stationId);
        const wasComplete = module?.stageProgress?.[stationId] === 100;
        
        setProjects(prevProjects => prevProjects.map(proj => {
            if (proj.id !== projectId) return proj;
            
            return {
                ...proj,
                modules: proj.modules.map(mod => {
                    if (mod.id !== moduleId) return mod;
                    
                    const updatedProgress = { ...mod.stageProgress };
                    updatedProgress[stationId] = newProgress;
                    
                    // Track completion timestamps per station
                    let stationCompletedAt = mod.stationCompletedAt || {};
                    if (newProgress === 100 && !wasComplete) {
                        stationCompletedAt = { ...stationCompletedAt, [stationId]: Date.now() };
                    } else if (newProgress < 100 && wasComplete) {
                        stationCompletedAt = { ...stationCompletedAt };
                        delete stationCompletedAt[stationId];
                    }
                    
                    return { ...mod, stageProgress: updatedProgress, stationCompletedAt };
                })
            };
        }));
        
        // Show toast notification for completions
        if (newProgress === 100 && !wasComplete && module && station) {
            addToast(
                `${module.serialNumber} completed at ${station.dept}!`,
                'success',
                module.serialNumber,
                station.dept
            );
        }
    };
    
    // ===== MODULE MOVE FUNCTIONS =====
    // Open move modal for a module
    const openMoveModal = (module) => {
        setShowMoveModal({
            module,
            currentPosition: module.buildSequence || 0
        });
        setActivePrompt(null); // Close the context menu
    };
    
    // Apply module move with confirmation
    const applyModuleMove = (module, newPosition, applyToAll = true) => {
        if (!setProjects) return;
        
        const oldPosition = module.buildSequence || 0;
        
        // Update the module's build sequence
        setProjects(prevProjects => prevProjects.map(project => {
            if (project.id !== module.projectId) return project;
            
            // Get all modules sorted by current sequence
            const modules = [...(project.modules || [])];
            const moduleIndex = modules.findIndex(m => m.id === module.id);
            if (moduleIndex === -1) return project;
            
            // Remove the module from its current position
            const [movedModule] = modules.splice(moduleIndex, 1);
            
            // Find the new index based on the target position
            let newIndex = modules.findIndex(m => (m.buildSequence || 0) >= newPosition);
            if (newIndex === -1) newIndex = modules.length;
            
            // Insert at new position
            modules.splice(newIndex, 0, { ...movedModule, buildSequence: newPosition });
            
            // If applying to all, recalculate all build sequences to be sequential
            if (applyToAll) {
                modules.forEach((m, idx) => {
                    m.buildSequence = idx + 1;
                });
            }
            
            return { ...project, modules };
        }));
        
        // Show success toast
        addToast(
            `${module.serialNumber} moved from #${oldPosition} to #${newPosition}`,
            'success',
            module.serialNumber,
            applyToAll ? 'All stations' : 'This view only'
        );
        
        setShowMoveModal(null);
        setShowMoveConfirm(null);
    };
    
    // ===== DRAG-AND-DROP HANDLERS =====
    const handleDragStart = (e, module) => {
        if (!reorderMode) return;
        setDraggedModule(module);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', module.id);
        // Add visual feedback
        e.target.style.opacity = '0.5';
    };
    
    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDraggedModule(null);
        setDragOverTarget(null);
    };
    
    const handleDragOver = (e, targetModule) => {
        if (!reorderMode || !draggedModule || draggedModule.id === targetModule.id) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Determine if dropping before or after based on mouse position
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position = e.clientY < midY ? 'before' : 'after';
        
        setDragOverTarget({ moduleId: targetModule.id, position });
    };
    
    const handleDragLeave = () => {
        setDragOverTarget(null);
    };
    
    const handleDrop = (e, targetModule) => {
        e.preventDefault();
        if (!reorderMode || !draggedModule || draggedModule.id === targetModule.id) return;
        
        const fromSeq = draggedModule.buildSequence || 0;
        const targetSeq = targetModule.buildSequence || 0;
        const position = dragOverTarget?.position || 'after';
        const toSeq = position === 'before' ? targetSeq : targetSeq + 0.5;
        
        // Add to pending reorders
        setPendingReorders(prev => {
            // Remove any existing reorder for this module
            const filtered = prev.filter(r => r.moduleId !== draggedModule.id);
            return [...filtered, { 
                moduleId: draggedModule.id, 
                moduleSerial: draggedModule.serialNumber,
                fromSeq, 
                toSeq,
                targetSerial: targetModule.serialNumber,
                position
            }];
        });
        
        setDraggedModule(null);
        setDragOverTarget(null);
    };
    
    // Apply all pending reorders
    const applyPendingReorders = (applyToAll = true) => {
        if (!setProjects || pendingReorders.length === 0) return;
        
        setProjects(prevProjects => prevProjects.map(project => {
            // Get modules that have pending reorders
            const projectReorders = pendingReorders.filter(r => 
                project.modules?.some(m => m.id === r.moduleId)
            );
            
            if (projectReorders.length === 0) return project;
            
            // Sort modules by their new sequence (using toSeq for reordered ones)
            let modules = [...(project.modules || [])].map(m => {
                const reorder = projectReorders.find(r => r.moduleId === m.id);
                return {
                    ...m,
                    _sortSeq: reorder ? reorder.toSeq : (m.buildSequence || 0)
                };
            });
            
            modules.sort((a, b) => a._sortSeq - b._sortSeq);
            
            // Reassign sequential build sequences
            if (applyToAll) {
                modules = modules.map((m, idx) => {
                    const { _sortSeq, ...rest } = m;
                    return { ...rest, buildSequence: idx + 1 };
                });
            }
            
            return { ...project, modules };
        }));
        
        // Show success toast
        addToast(
            `Reordered ${pendingReorders.length} module${pendingReorders.length > 1 ? 's' : ''}`,
            'success',
            '',
            applyToAll ? 'Applied to all stations' : 'This view only'
        );
        
        // Reset reorder mode
        setReorderMode(false);
        setPendingReorders([]);
        setShowReorderConfirm(false);
    };
    
    // Cancel reorder mode
    const cancelReorderMode = () => {
        setReorderMode(false);
        setPendingReorders([]);
        setDraggedModule(null);
        setDragOverTarget(null);
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
    
    // Handle PDF export - opens export modal
    const handleExportPDF = () => {
        setShowPDFExport(true);
    };
    
    // Helper to compute day labels for PDF export
    const computeDayLabelsForPDF = () => {
        const days = [];
        const shift1Days = ['monday', 'tuesday', 'wednesday', 'thursday'];
        const dayNames = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
        
        let moduleNum = 1;
        shift1Days.forEach(day => {
            const count = scheduleSetup?.shift1?.[day] || 0;
            if (count > 0) {
                const weekStart = displayWeek?.weekStart ? new Date(displayWeek.weekStart) : new Date();
                const dayOffset = shift1Days.indexOf(day);
                const dayDate = new Date(weekStart);
                dayDate.setDate(dayDate.getDate() + dayOffset);
                const monthStr = dayDate.toLocaleDateString('en-US', { month: 'short' });
                const dayNum = dayDate.getDate();
                
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
    
    // Generate PDF data for export view - respects pdfExportScope
    const getPDFExportData = useMemo(() => {
        if (!hasWeekConfig) return { rows: [], stations: [] };
        
        const firstStation = productionStages?.[0];
        if (!firstStation) return { rows: [], stations: [] };
        
        const firstStationData = getModulesForStation(firstStation);
        if (!firstStationData) return { rows: [], stations: [] };
        
        const { previous = [], current = [], next = [] } = firstStationData;
        
        // Filter rows based on export scope
        let filteredRows = [];
        let prevLength = 0;
        
        if (pdfExportScope === 'current') {
            filteredRows = [...current];
            prevLength = 0;
        } else if (pdfExportScope === 'with-prev') {
            filteredRows = [...previous, ...current];
            prevLength = previous.length;
        } else if (pdfExportScope === 'with-next') {
            filteredRows = [...current, ...next];
            prevLength = 0;
        } else { // 'all'
            filteredRows = [...previous, ...current, ...next];
            prevLength = previous.length;
        }
        
        if (filteredRows.length === 0) return { rows: [], stations: productionStages };
        
        const pdfDayLabels = computeDayLabelsForPDF();
        
        // Build rows with module data for each station
        const rows = filteredRows.map((module, idx) => {
            // Calculate the correct day label index based on scope
            let dayLabelIdx;
            if (pdfExportScope === 'current' || pdfExportScope === 'with-next') {
                dayLabelIdx = idx;
            } else {
                dayLabelIdx = idx - prevLength;
            }
            const dayInfo = pdfDayLabels[dayLabelIdx];
            
            const rowData = {
                dayLabel: module.weekSection === 'previous' ? 'PREV' : 
                          module.weekSection === 'next' ? 'NEXT' : 
                          (dayInfo?.label || ''),
                dateLabel: module.weekSection === 'current' ? 
                          `${dayInfo?.monthStr || ''} ${dayInfo?.dayNum || ''}` : '',
                weekSection: module.weekSection,
                stations: {}
            };
            
            // Get module data for each station - need to find the matching module
            productionStages.forEach(station => {
                const stationData = getModulesForStation(station);
                if (!stationData) return;
                
                // Find the module with matching serial number in this station's data
                const { previous: sPrev = [], current: sCurr = [], next: sNext = [] } = stationData;
                let stationModule;
                
                if (module.weekSection === 'previous') {
                    const prevIdx = previous.findIndex(m => m.serialNumber === module.serialNumber);
                    stationModule = sPrev[prevIdx];
                } else if (module.weekSection === 'next') {
                    const nextIdx = next.findIndex(m => m.serialNumber === module.serialNumber);
                    stationModule = sNext[nextIdx];
                } else {
                    const currIdx = current.findIndex(m => m.serialNumber === module.serialNumber);
                    stationModule = sCurr[currIdx];
                }
                
                if (stationModule) {
                    // stationProgress is the numeric progress for THIS station (set by addStatusInfo)
                    const progress = typeof stationModule.stationProgress === 'number' 
                        ? stationModule.stationProgress 
                        : 0;
                    rowData.stations[station.id] = {
                        serialNumber: stationModule.serialNumber,
                        progress: progress,
                        isComplete: progress === 100,
                        // Include detailed info for detailed view export
                        hitchBLM: stationModule.hitchBLM,
                        rearBLM: stationModule.rearBLM,
                        hitchUnit: stationModule.hitchUnit,
                        rearUnit: stationModule.rearUnit,
                        hitchRoomType: stationModule.hitchRoomType,
                        rearRoomType: stationModule.rearRoomType,
                        difficulties: stationModule.difficulties
                    };
                }
            });
            
            return rowData;
        });
        
        return { rows, stations: productionStages };
    }, [hasWeekConfig, productionStages, projects, displayWeek, scheduleSetup, pdfExportScope]);
    
    // Export to PDF using browser print
    const executePDFExport = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            addToast('Please allow popups to export PDF', 'error');
            return;
        }
        
        const { rows, stations } = getPDFExportData;
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const isDetailed = boardViewMode === 'detailed';
        
        // Get progress color based on percentage
        const getProgressColor = (progress) => {
            if (progress === 0) return '#ffffff';
            if (progress === 25) return '#dcfce7';
            if (progress === 50) return '#bbf7d0';
            if (progress === 75) return '#86efac';
            return '#4ade80'; // 100%
        };
        
        // Render difficulty dots for detailed view
        const renderDifficultyDots = (difficulties) => {
            if (!difficulties) return '';
            const colors = {
                sidewall: '#f97316', stair: '#8b5cf6', hr3Wall: '#ef4444',
                short: '#eab308', doubleStudio: '#6366f1', sawbox: '#ec4899'
            };
            const dots = Object.entries(difficulties)
                .filter(([_, v]) => v)
                .map(([key]) => `<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${colors[key]};margin:0 1px;"></span>`)
                .join('');
            return dots ? `<div style="margin-top:1px;">${dots}</div>` : '';
        };
        
        // Render cell content based on view mode
        const renderCellContent = (data) => {
            if (!data) {
                // Empty cell - match height for alignment
                return `<td class="module-cell ${isDetailed ? 'detailed-cell' : ''}" style="color:#ccc;vertical-align:middle;">—</td>`;
            }
            
            if (isDetailed) {
                return `<td class="module-cell detailed-cell" style="background:${getProgressColor(data.progress)};vertical-align:top;">
                    <div style="font-weight:bold;font-size:7px;border-bottom:1px solid #ddd;padding-bottom:1px;margin-bottom:1px;text-align:center;">
                        ${data.serialNumber?.slice(-7) || '—'}${data.isComplete ? ' <span class="checkmark">✓</span>' : ''}
                    </div>
                    <table style="width:100%;border-collapse:collapse;font-size:5px;line-height:1.2;">
                        <tr>
                            <td style="width:50%;text-align:center;border-right:1px solid #eee;padding:0 1px;vertical-align:top;">
                                <div style="color:#999;font-size:4px;font-weight:bold;">(H)</div>
                                <div style="font-weight:600;font-family:monospace;">${data.hitchBLM || '—'}</div>
                                <div style="color:#555;">${data.hitchUnit || '—'}</div>
                                <div style="color:#777;font-size:4px;">${data.hitchRoomType || '—'}</div>
                            </td>
                            <td style="width:50%;text-align:center;padding:0 1px;vertical-align:top;">
                                <div style="color:#999;font-size:4px;font-weight:bold;">(R)</div>
                                <div style="font-weight:600;font-family:monospace;">${data.rearBLM || '—'}</div>
                                <div style="color:#555;">${data.rearUnit || data.hitchUnit || '—'}</div>
                                <div style="color:#777;font-size:4px;">${data.rearRoomType || '—'}</div>
                            </td>
                        </tr>
                    </table>
                    ${renderDifficultyDots(data.difficulties)}
                </td>`;
            } else {
                return `<td class="module-cell" style="background:${getProgressColor(data.progress)};vertical-align:middle;">
                    ${data.serialNumber?.slice(-7) || '—'}
                    ${data.isComplete ? ' <span class="checkmark">✓</span>' : ''}
                </td>`;
            }
        };
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Weekly Schedule - ${dateStr}</title>
    <style>
        @page {
            size: 17in 11in landscape;
            margin: 0.25in;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            font-size: 9px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color: #1a1a1a;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: ${isDetailed ? '8px 16px' : '12px 20px'};
            border-bottom: 3px solid #1e3a5f;
            margin-bottom: ${isDetailed ? '8px' : '12px'};
        }
        .header-left { font-size: ${isDetailed ? '9px' : '11px'}; color: #555; }
        .header-center { font-size: ${isDetailed ? '12px' : '16px'}; font-weight: bold; color: #1e3a5f; letter-spacing: 0.5px; }
        .header-right { font-size: ${isDetailed ? '9px' : '11px'}; color: #555; font-weight: 500; }
        .view-mode { font-size: 8px; color: #888; margin-left: 8px; }
        table { 
            width: 100%; 
            border-collapse: collapse;
            table-layout: fixed;
        }
        th {
            background: #1e3a5f;
            color: white;
            padding: ${isDetailed ? '4px 2px' : '8px 4px'};
            font-size: ${isDetailed ? '7px' : '9px'};
            font-weight: 600;
            text-align: center;
            border: 1px solid #1e3a5f;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        th.day-col { width: ${isDetailed ? '45px' : '60px'}; }
        td {
            border: 1px solid #ccc;
            padding: ${isDetailed ? '2px 1px' : '4px 2px'};
            text-align: center;
            vertical-align: ${isDetailed ? 'top' : 'middle'};
            height: ${isDetailed ? '58px' : '26px'};
            background: white;
        }
        /* Nested table inside cells should not have borders */
        td table { border: none; }
        td table td { border: none; height: auto; padding: 0; background: transparent; }
        .day-cell {
            font-weight: 600;
            font-size: ${isDetailed ? '7px' : '9px'};
            background: white;
            border-right: 2px solid #1e3a5f;
            vertical-align: middle;
        }
        .day-cell.prev { 
            background: white; 
            color: #888;
            font-style: italic;
        }
        .day-cell.next { 
            background: white; 
            color: #888;
            font-style: italic;
        }
        .module-cell {
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: ${isDetailed ? '6px' : '9px'};
            font-weight: 600;
        }
        .detailed-cell {
            padding: 2px;
        }
        .checkmark { 
            color: #059669; 
            font-weight: bold; 
            font-size: ${isDetailed ? '8px' : '11px'};
        }
        .legend {
            display: flex;
            gap: ${isDetailed ? '12px' : '20px'};
            justify-content: center;
            margin-top: ${isDetailed ? '6px' : '12px'};
            font-size: ${isDetailed ? '7px' : '9px'};
            padding: ${isDetailed ? '4px' : '8px'};
            border-top: 1px solid #ddd;
            flex-wrap: wrap;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: ${isDetailed ? '3px' : '6px'};
        }
        .legend-box {
            width: ${isDetailed ? '12px' : '18px'};
            height: ${isDetailed ? '12px' : '18px'};
            border: 1px solid #999;
        }
        .legend-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }
        .legend-label { font-weight: 500; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">${dateStr}, ${timeStr}</div>
        <div class="header-center">Weekly Production Schedule <span class="view-mode">(${isDetailed ? 'Detailed' : 'Compact'} View)</span></div>
        <div class="header-right">Week of ${displayWeek?.weekStart ? new Date(displayWeek.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : dateStr}</div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th class="day-col">Day</th>
                ${stations.map(s => `<th>${s.dept}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${rows.map(row => `
                <tr>
                    <td class="day-cell ${row.weekSection === 'previous' ? 'prev' : row.weekSection === 'next' ? 'next' : ''}">
                        ${row.dayLabel}${row.dateLabel ? '<br/>' + row.dateLabel : ''}
                    </td>
                    ${stations.map(s => renderCellContent(row.stations[s.id])).join('')}
                </tr>
            `).join('')}
        </tbody>
    </table>
    
    <div class="legend">
        <div class="legend-item"><div class="legend-box" style="background:#ffffff"></div> <span class="legend-label">Not Started</span></div>
        <div class="legend-item"><div class="legend-box" style="background:#dcfce7"></div> <span class="legend-label">25%</span></div>
        <div class="legend-item"><div class="legend-box" style="background:#bbf7d0"></div> <span class="legend-label">50%</span></div>
        <div class="legend-item"><div class="legend-box" style="background:#86efac"></div> <span class="legend-label">75%</span></div>
        <div class="legend-item"><div class="legend-box" style="background:#4ade80"></div> <span class="legend-label">Complete ✓</span></div>
        ${isDetailed ? `
        <span style="margin:0 4px;color:#ccc;">|</span>
        <div class="legend-item"><div class="legend-dot" style="background:#f97316;"></div> <span class="legend-label">SW</span></div>
        <div class="legend-item"><div class="legend-dot" style="background:#8b5cf6;"></div> <span class="legend-label">STAIR</span></div>
        <div class="legend-item"><div class="legend-dot" style="background:#ef4444;"></div> <span class="legend-label">3HR</span></div>
        <div class="legend-item"><div class="legend-dot" style="background:#eab308;"></div> <span class="legend-label">SHORT</span></div>
        <div class="legend-item"><div class="legend-dot" style="background:#6366f1;"></div> <span class="legend-label">DBL</span></div>
        <div class="legend-item"><div class="legend-dot" style="background:#ec4899;"></div> <span class="legend-label">SAW</span></div>
        ` : ''}
    </div>
    
    <script>
        window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
        };
    </script>
</body>
</html>`;
        
        printWindow.document.write(html);
        printWindow.document.close();
        setShowPDFExport(false);
        addToast('PDF export opened - save as PDF from print dialog', 'success');
    };
    
    // Generate detailed report for printing (fits on single 11x17 sheet)
    const executeDetailedReport = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            addToast('Please allow popups to print report', 'error');
            return;
        }
        
        // Get all modules on board
        const modulesOnBoard = getModulesOnBoard;
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const weekDateStr = displayWeek?.weekStart ? new Date(displayWeek.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : dateStr;
        
        // Calculate columns needed - aim for ~6-8 columns to fit on 11x17
        const totalModules = modulesOnBoard.length;
        const columnsNeeded = Math.min(8, Math.max(4, Math.ceil(totalModules / 6)));
        const rowsPerColumn = Math.ceil(totalModules / columnsNeeded);
        
        // Split modules into columns
        const columns = [];
        for (let i = 0; i < columnsNeeded; i++) {
            columns.push(modulesOnBoard.slice(i * rowsPerColumn, (i + 1) * rowsPerColumn));
        }
        
        // Generate module card HTML
        const renderModuleCard = (module) => {
            const difficulties = module.difficulties || {};
            const activeDiffs = Object.entries(difficulties).filter(([_, v]) => v);
            const sectionBorder = module.section === 'previous' ? '#f87171' : 
                                 module.section === 'next' ? '#4ade80' : '#3b82f6';
            
            const diffDots = activeDiffs.map(([key]) => {
                const color = difficultyColors[key];
                return `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${color};margin:0 1px;" title="${difficultyLabels[key]}"></span>`;
            }).join('');
            
            return `
                <div style="border:1px solid #ddd;border-left:3px solid ${sectionBorder};border-radius:3px;padding:3px;margin-bottom:3px;background:white;font-size:7px;">
                    <div style="font-weight:bold;font-family:monospace;font-size:8px;text-align:center;border-bottom:1px solid #eee;padding-bottom:2px;margin-bottom:2px;">
                        ${module.serialNumber?.slice(-7) || 'N/A'}
                    </div>
                    <div style="display:flex;font-size:6px;">
                        <div style="flex:1;text-align:center;border-right:1px solid #eee;padding-right:2px;">
                            <div style="color:#999;font-size:5px;">(H)</div>
                            <div style="font-weight:600;font-family:monospace;">${module.hitchBLM || '—'}</div>
                            <div style="color:#666;">${module.hitchUnit || '—'}</div>
                            <div style="color:#888;">${module.hitchRoomType || '—'}</div>
                        </div>
                        <div style="flex:1;text-align:center;padding-left:2px;">
                            <div style="color:#999;font-size:5px;">(R)</div>
                            <div style="font-weight:600;font-family:monospace;">${module.rearBLM || '—'}</div>
                            <div style="color:#666;">${module.rearUnit || module.hitchUnit || '—'}</div>
                            <div style="color:#888;">${module.rearRoomType || '—'}</div>
                        </div>
                    </div>
                    ${activeDiffs.length > 0 ? `<div style="text-align:center;padding-top:2px;border-top:1px solid #eee;margin-top:2px;">${diffDots}</div>` : ''}
                </div>
            `;
        };
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Weekly Board Report - ${weekDateStr}</title>
    <style>
        @page {
            size: 17in 11in landscape;
            margin: 0.25in;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            font-size: 8px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color: #1a1a1a;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 16px;
            border-bottom: 2px solid #1e3a5f;
            margin-bottom: 8px;
        }
        .header-left { font-size: 9px; color: #555; }
        .header-center { font-size: 14px; font-weight: bold; color: #1e3a5f; }
        .header-right { font-size: 9px; color: #555; }
        .stats {
            display: flex;
            gap: 20px;
            justify-content: center;
            margin-bottom: 8px;
            font-size: 9px;
        }
        .stat { padding: 4px 12px; background: #f3f4f6; border-radius: 4px; }
        .stat-label { color: #666; }
        .stat-value { font-weight: bold; color: #1e3a5f; }
        .columns-container {
            display: flex;
            gap: 8px;
            padding: 0 8px;
        }
        .column {
            flex: 1;
            min-width: 0;
        }
        .column-header {
            background: #1e3a5f;
            color: white;
            padding: 4px;
            text-align: center;
            font-weight: 600;
            font-size: 8px;
            border-radius: 3px 3px 0 0;
            margin-bottom: 4px;
        }
        .legend {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-top: 8px;
            padding: 6px;
            border-top: 1px solid #ddd;
            font-size: 7px;
        }
        .legend-item { display: flex; align-items: center; gap: 4px; }
        .legend-box { width: 10px; height: 10px; border-radius: 2px; }
        .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">${dateStr}, ${timeStr}</div>
        <div class="header-center">Weekly Board - Detailed Module Report</div>
        <div class="header-right">Week of ${weekDateStr}</div>
    </div>
    
    <div class="stats">
        <div class="stat"><span class="stat-label">Total Modules:</span> <span class="stat-value">${totalModules}</span></div>
        <div class="stat"><span class="stat-label">Line Balance:</span> <span class="stat-value">${lineBalance}</span></div>
        <div class="stat"><span class="stat-label">Starting Module:</span> <span class="stat-value">${displayWeek?.startingModule || 'N/A'}</span></div>
    </div>
    
    <div class="columns-container">
        ${columns.map((col, idx) => `
            <div class="column">
                <div class="column-header">Column ${idx + 1}</div>
                ${col.map(m => renderModuleCard(m)).join('')}
            </div>
        `).join('')}
    </div>
    
    <div class="legend">
        <div class="legend-item"><div class="legend-box" style="border-left:3px solid #f87171;background:#fee2e2;"></div> Previous Week</div>
        <div class="legend-item"><div class="legend-box" style="border-left:3px solid #3b82f6;background:#dbeafe;"></div> Current Week</div>
        <div class="legend-item"><div class="legend-box" style="border-left:3px solid #4ade80;background:#dcfce7;"></div> Upcoming</div>
        <span style="margin:0 8px;">|</span>
        <div class="legend-item"><div class="legend-dot" style="background:#f97316;"></div> SW</div>
        <div class="legend-item"><div class="legend-dot" style="background:#8b5cf6;"></div> STAIR</div>
        <div class="legend-item"><div class="legend-dot" style="background:#ef4444;"></div> 3HR</div>
        <div class="legend-item"><div class="legend-dot" style="background:#eab308;"></div> SHORT</div>
        <div class="legend-item"><div class="legend-dot" style="background:#6366f1;"></div> DBL</div>
        <div class="legend-item"><div class="legend-dot" style="background:#ec4899;"></div> SAW</div>
    </div>
    
    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>`;
        
        printWindow.document.write(html);
        printWindow.document.close();
        addToast('Detailed report opened - print or save as PDF', 'success');
    };
    
    // Scroll board horizontally with keyboard
    const handleBoardKeyDown = useCallback((e) => {
        if (!boardRef.current) return;
        const scrollContainer = boardRef.current.querySelector('.board-scroll-container');
        if (!scrollContainer) return;
        
        const scrollAmount = 200; // pixels to scroll
        
        if (e.key === 'ArrowLeft') {
            scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            e.preventDefault();
        }
    }, []);
    
    // Card height for alignment between date markers and module cards
    // Compact = 58px (serial only), Detailed = 120px (full info with BLM, unit type, room type, difficulty dots)
    const CARD_HEIGHT = boardViewMode === 'detailed' ? 120 : 58;
    
    // Render a module card with progress buttons and menu (Station Board style)
    const renderModuleCard = (module, station, weekSection = 'current') => {
        const currentProgress = module.stageProgress?.[station.id] || 0;
        const isComplete = currentProgress === 100;
        const moduleIsSelected = isSelected(module.id, station.id);
        
        // Determine border/background based on week section, selection, completion, and hold status
        let borderClass = 'border';
        let bgClass = 'bg-white';
        
        // Hold status takes priority for visual indication (thick red border)
        if (module.isOnHold) {
            borderClass = 'border-4 border-red-500';
            bgClass = 'bg-red-50';
        } else if (moduleIsSelected) {
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
            const difficulties = module.difficulties || {};
            const activeDifficulties = Object.entries(difficulties).filter(([_, v]) => v);
            
            return (
                <div
                    key={`${station.id}-${module.id}`}
                    data-module-serial={module.serialNumber}
                    className="rounded p-1.5 bg-gray-50 border border-gray-200 opacity-50 hover:opacity-100 transition cursor-pointer"
                    style={{ height: `${CARD_HEIGHT}px` }}
                    onClick={() => updateModuleProgress(module.id, module.projectId, station.id, 25)}
                    title="Click to start"
                >
                    <div className="font-mono text-xs font-bold text-gray-500 truncate">
                        {module.serialNumber}
                    </div>
                    
                    {/* Detailed View for On-Deck modules */}
                    {boardViewMode === 'detailed' && (
                        <>
                            <div className="grid grid-cols-2 divide-x text-center mt-1 border-t border-b py-0.5">
                                <div className="px-0.5">
                                    <div className="text-[8px] text-gray-400 font-medium">(H)</div>
                                    <div className="font-mono text-[9px] font-semibold truncate">{module.hitchBLM || '—'}</div>
                                    <div className="text-[8px] text-gray-600 truncate">{module.hitchUnit || '—'}</div>
                                    <div className="text-[8px] text-gray-500 truncate">{module.hitchRoomType || '—'}</div>
                                </div>
                                <div className="px-0.5">
                                    <div className="text-[8px] text-gray-400 font-medium">(R)</div>
                                    <div className="font-mono text-[9px] font-semibold truncate">{module.rearBLM || '—'}</div>
                                    <div className="text-[8px] text-gray-600 truncate">{module.rearUnit || module.hitchUnit || '—'}</div>
                                    <div className="text-[8px] text-gray-500 truncate">{module.rearRoomType || '—'}</div>
                                </div>
                            </div>
                            {activeDifficulties.length > 0 && (
                                <div className="flex justify-center gap-0.5 py-0.5">
                                    {activeDifficulties.map(([key]) => (
                                        <div key={key} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: difficultyColors[key] }} title={difficultyLabels[key]} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                    
                    <div className="text-xs text-autovol-teal mt-0.5">
                        ▶ Start
                    </div>
                </div>
            );
        }
        
        // Check if this module has a pending reorder
        const pendingReorder = pendingReorders.find(r => r.moduleId === module.id);
        const isDragTarget = dragOverTarget?.moduleId === module.id;
        const dropIndicatorClass = isDragTarget 
            ? dragOverTarget.position === 'before' 
                ? 'border-t-4 border-t-blue-500' 
                : 'border-b-4 border-b-blue-500'
            : '';
        
        return (
            <div
                key={`${station.id}-${module.id}`}
                data-module-serial={module.serialNumber}
                className={`rounded p-1.5 transition-all hover:shadow-md ${bgClass} ${borderClass} ${dropIndicatorClass} ${
                    reorderMode ? 'cursor-grab active:cursor-grabbing' : ''
                } ${pendingReorder ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}
                style={{ height: `${CARD_HEIGHT}px` }}
                draggable={reorderMode}
                onDragStart={(e) => handleDragStart(e, module)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, module)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, module)}
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
                
                {/* Detailed View: Hitch/Rear Info + Difficulty Indicators */}
                {boardViewMode === 'detailed' && (
                    <>
                        <div className="grid grid-cols-2 divide-x text-center mt-1 border-t border-b py-0.5">
                            {/* Hitch Side */}
                            <div className="px-0.5">
                                <div className="text-[8px] text-gray-400 font-medium">(H)</div>
                                <div className="font-mono text-[9px] font-semibold truncate" title={module.hitchBLM}>
                                    {module.hitchBLM || '—'}
                                </div>
                                <div className="text-[8px] text-gray-600 truncate" title={module.hitchUnit}>
                                    {module.hitchUnit || '—'}
                                </div>
                                <div className="text-[8px] text-gray-500 truncate" title={module.hitchRoomType}>
                                    {module.hitchRoomType || '—'}
                                </div>
                            </div>
                            
                            {/* Rear Side */}
                            <div className="px-0.5">
                                <div className="text-[8px] text-gray-400 font-medium">(R)</div>
                                <div className="font-mono text-[9px] font-semibold truncate" title={module.rearBLM}>
                                    {module.rearBLM || '—'}
                                </div>
                                <div className="text-[8px] text-gray-600 truncate" title={module.rearUnit}>
                                    {module.rearUnit || module.hitchUnit || '—'}
                                </div>
                                <div className="text-[8px] text-gray-500 truncate" title={module.rearRoomType}>
                                    {module.rearRoomType || '—'}
                                </div>
                            </div>
                        </div>
                        
                        {/* Difficulty Indicators */}
                        {(() => {
                            const difficulties = module.difficulties || {};
                            const activeDifficulties = Object.entries(difficulties).filter(([_, v]) => v);
                            if (activeDifficulties.length === 0) return null;
                            return (
                                <div className="flex justify-center gap-0.5 py-0.5">
                                    {activeDifficulties.map(([key]) => (
                                        <div 
                                            key={key}
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{ backgroundColor: difficultyColors[key] }}
                                            title={difficultyLabels[key]}
                                        />
                                    ))}
                                </div>
                            );
                        })()}
                    </>
                )}
                
                {/* Row 2: Progress Buttons - Special for Sign-Off station */}
                {station.id === 'sign-off' ? (
                    // Sign-Off station: 0%/100%/Hold buttons
                    <div className="flex gap-0.5 mt-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (canEdit) {
                                    updateModuleProgress(module.id, module.projectId, station.id, 0);
                                    // Clear hold status if set
                                    if (module.isOnHold) {
                                        setProjects(prev => prev.map(p => ({
                                            ...p,
                                            modules: p.modules.map(m => m.id === module.id ? { ...m, isOnHold: false } : m)
                                        })));
                                    }
                                }
                            }}
                            disabled={!canEdit}
                            className={`flex-1 text-xs py-0.5 rounded transition ${
                                currentProgress === 0 && !module.isOnHold
                                    ? 'bg-gray-500 text-white' 
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            } ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}`}
                            title="Reset to 0%"
                        >
                            0%
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (canEdit) {
                                    updateModuleProgress(module.id, module.projectId, station.id, 100);
                                    // Clear hold status if set
                                    if (module.isOnHold) {
                                        setProjects(prev => prev.map(p => ({
                                            ...p,
                                            modules: p.modules.map(m => m.id === module.id ? { ...m, isOnHold: false } : m)
                                        })));
                                    }
                                }
                            }}
                            disabled={!canEdit}
                            className={`flex-1 text-xs py-0.5 rounded transition ${
                                isComplete && !module.isOnHold
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            } ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}`}
                            title="Mark complete (100%)"
                        >
                            ✓
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (canEdit) {
                                    // Toggle hold status
                                    setProjects(prev => prev.map(p => ({
                                        ...p,
                                        modules: p.modules.map(m => m.id === module.id ? { ...m, isOnHold: !m.isOnHold } : m)
                                    })));
                                    addToast(
                                        module.isOnHold ? `${module.serialNumber} removed from hold` : `${module.serialNumber} placed on hold`,
                                        module.isOnHold ? 'success' : 'warning',
                                        module.serialNumber,
                                        station.dept
                                    );
                                }
                            }}
                            disabled={!canEdit}
                            className={`flex-1 text-xs py-0.5 rounded transition ${
                                module.isOnHold
                                    ? 'bg-red-500 text-white' 
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            } ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}`}
                            title={module.isOnHold ? "Remove from hold" : "Place on hold"}
                        >
                            !
                        </button>
                    </div>
                ) : (
                    // Standard progress buttons for other stations
                    <div className="flex gap-0.5 mt-1">
                        {[25, 50, 75, 100].map(pct => (
                            <button
                                key={pct}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (canEdit) {
                                        // Toggle: if clicking the current progress level, reset to previous level (or 0 for 25%)
                                        const newProgress = currentProgress === pct 
                                            ? (pct === 25 ? 0 : pct - 25) 
                                            : pct;
                                        updateModuleProgress(module.id, module.projectId, station.id, newProgress);
                                    }
                                }}
                                disabled={!canEdit}
                                className={`flex-1 text-xs py-0.5 rounded transition ${
                                    currentProgress >= pct 
                                        ? isComplete 
                                            ? 'bg-green-500 text-white' 
                                            : 'bg-autovol-teal text-white'
                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                } ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}`}
                                title={canEdit ? (currentProgress === pct ? `Click to set to ${pct === 25 ? 0 : pct - 25}%` : `Set to ${pct}%`) : 'View-only mode'}
                            >
                                {pct === 100 ? '✓' : ''}
                            </button>
                        ))}
                    </div>
                )}
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
                const weekStart = displayWeek?.weekStart ? new Date(displayWeek.weekStart) : new Date();
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
        const capacityInfo = getStationCapacityInfo[station.id] || { capacity: 5, inProgress: 0, complete: 0, loadPercent: 0, status: 'under' };
        
        // Capacity bar colors based on status
        const capacityBarColor = capacityInfo.status === 'over' ? 'bg-red-400' 
            : capacityInfo.status === 'at' ? 'bg-yellow-400' 
            : 'bg-green-400';
        const capacityBgColor = capacityInfo.status === 'over' ? 'bg-red-200' 
            : capacityInfo.status === 'at' ? 'bg-yellow-200' 
            : 'bg-white/30';
        
        return (
            <div key={station.id} className="flex-shrink-0 w-36 flex flex-col">
                {/* Station Header - with capacity indicator - STICKY */}
                <div 
                    className={`${station.color} text-white px-2 py-2 text-center rounded-t-lg sticky top-0 z-20`}
                    style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                    <div className="font-semibold text-xs truncate" title={station.name}>{station.dept}</div>
                    <div className="text-xs opacity-80">Start: {startingModule?.serialNumber?.slice(-4) || '—'}</div>
                    
                    {/* Capacity Indicator Bar */}
                    <div className="mt-1.5">
                        <div className={`h-1.5 rounded-full ${capacityBgColor} overflow-hidden`}>
                            <div 
                                className={`h-full ${capacityBarColor} transition-all duration-300`}
                                style={{ width: `${capacityInfo.loadPercent}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs mt-0.5 opacity-90">
                            <span>{capacityInfo.inProgress}/{capacityInfo.capacity}</span>
                            <span>{capacityInfo.complete}✓</span>
                        </div>
                    </div>
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
            <div className="flex-shrink-0 w-20 sticky left-0 z-30 bg-white flex flex-col" style={{ boxShadow: '4px 0 8px rgba(0,0,0,0.08)' }}>
                {/* Header - matches station header height (includes capacity bar space) - STICKY */}
                <div 
                    className="bg-autovol-navy text-white px-2 py-2 text-center rounded-tl-lg sticky top-0 z-30"
                    style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                >
                    <div className="font-semibold text-xs">Day</div>
                    <div className="text-xs opacity-80">Date</div>
                    {/* Spacer to match capacity indicator height in station headers */}
                    <div className="mt-1.5">
                        <div className="h-1.5"></div>
                        <div className="flex justify-between text-xs mt-0.5 opacity-0">
                            <span>0/0</span>
                            <span>0</span>
                        </div>
                    </div>
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
    
    // ===== MOBILE VIEW =====
    // Show simplified swipeable view on mobile devices
    if (isMobile) {
        return (
            <div className="space-y-4">
                {/* Mobile Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-autovol-navy">Weekly Board</h3>
                        <p className="text-xs text-gray-500">
                            Week: {displayWeek?.weekStart || 'Not set'} • {lineBalance} modules
                        </p>
                    </div>
                    <button
                        onClick={() => setShowHistoryModal(true)}
                        className="p-2 bg-gray-100 rounded-lg"
                        title="Week History"
                    >
                        <span className="icon-history" style={{ width: '20px', height: '20px', display: 'inline-block' }}></span>
                    </button>
                </div>
                
                {/* Mobile Weekly Board View */}
                <MobileWeeklyBoardView
                    productionStages={productionStages}
                    getModulesForStation={getModulesForStation}
                    getStationStartingModule={getStationStartingModule}
                    getStationCapacityInfo={getStationCapacityInfo}
                    onModuleClick={onModuleClick}
                    canEdit={canEdit}
                />
                
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
            {/* View-Only Banner */}
            {!canEdit && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 flex items-center gap-3">
                    <span className="text-xl">👁️</span>
                    <div>
                        <div className="font-semibold text-amber-800">View-Only Mode</div>
                        <div className="text-sm text-amber-700">You have read-only access to this tab. Contact an administrator to request edit permissions.</div>
                    </div>
                </div>
            )}
            
            {/* Header with Week Info and Actions */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-autovol-navy">Weekly Board</h3>
                        <p className="text-sm text-gray-500">
                            Starting: <span className="font-mono">{displayWeek.startingModule}</span> • Line Balance: {lineBalance} modules
                        </p>
                    </div>
                    
                    {/* Week Selector Dropdown */}
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedWeekId || ''}
                            onChange={(e) => setSelectedWeekId(e.target.value || null)}
                            className="border rounded-lg px-3 py-2 text-sm font-medium bg-white"
                        >
                            <option value="">
                                {currentWeek ? `Current: ${currentWeek.weekStart}` : 'Select Week'}
                            </option>
                            {weeks
                                .sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart))
                                .map(week => {
                                    const isCurrent = currentWeek?.id === week.id;
                                    const isPast = new Date(week.weekEnd) < new Date();
                                    return (
                                        <option key={week.id} value={week.id}>
                                            {week.weekStart} → {week.weekEnd}
                                            {isCurrent ? ' (Current)' : isPast ? ' (Past)' : ' (Future)'}
                                        </option>
                                    );
                                })
                            }
                        </select>
                        {selectedWeekId && selectedWeekId !== currentWeek?.id && (
                            <button
                                onClick={() => setSelectedWeekId(null)}
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                                Back to Current
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    {/* View Mode Toggle */}
                    <div className="flex items-center border rounded-lg overflow-hidden">
                        <button
                            onClick={() => setBoardViewMode('compact')}
                            className={`px-3 py-2 text-sm font-medium transition ${
                                boardViewMode === 'compact' 
                                    ? 'bg-autovol-navy text-white' 
                                    : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                            title="Compact view - Serial number only"
                        >
                            Compact
                        </button>
                        <button
                            onClick={() => setBoardViewMode('detailed')}
                            className={`px-3 py-2 text-sm font-medium transition ${
                                boardViewMode === 'detailed' 
                                    ? 'bg-autovol-navy text-white' 
                                    : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                            title="Detailed view - Full module info"
                        >
                            Detailed
                        </button>
                    </div>
                    
                    {/* Reorder Mode Toggle - only show if canEdit */}
                    {canEdit && !reorderMode && (
                        <button
                            onClick={() => setReorderMode(true)}
                            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium"
                            title="Enter reorder mode to drag and drop modules"
                        >
                            📋 Reorder
                        </button>
                    )}
                    {canEdit && reorderMode && (
                        <div className="flex gap-1">
                            <button
                                onClick={cancelReorderMode}
                                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setShowReorderConfirm(true)}
                                disabled={pendingReorders.length === 0}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Apply ({pendingReorders.length})
                            </button>
                        </div>
                    )}
                    {canEdit && (
                        <button
                            onClick={() => setProductionTab?.('schedule-setup')}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                            title="Change week configuration"
                        >
                            ⚙️ Edit Week
                        </button>
                    )}
                    <button
                        onClick={() => setShowHistoryModal(true)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                    >
                        📊 Week History
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                        title="Export schedule as 11x17 PDF"
                    >
                        📄 Export PDF
                    </button>
                    <button
                        onClick={executeDetailedReport}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                        title="Print detailed module report (11x17)"
                    >
                        🖨️ Print Report
                    </button>
                    {canEdit && (
                        <button
                            onClick={() => setShowCompleteModal(true)}
                            className="px-4 py-2 btn-primary rounded-lg text-sm font-medium"
                        >
                            ✓ Week Complete
                        </button>
                    )}
                </div>
            </div>
            
            {/* Production Metrics Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Modules This Week */}
                <div className="bg-white rounded-lg border p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500 font-medium uppercase">This Week</div>
                        <span className="text-lg">📊</span>
                    </div>
                    <div className="mt-1">
                        <span className="text-2xl font-bold text-autovol-navy">
                            {Object.values(getStationCapacityInfo).reduce((sum, s) => sum + s.complete, 0)}
                        </span>
                        <span className="text-sm text-gray-500 ml-1">/ {lineBalance}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">modules completed</div>
                </div>
                
                {/* In Progress */}
                <div className="bg-white rounded-lg border p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500 font-medium uppercase">In Progress</div>
                        <span className="text-lg">🔄</span>
                    </div>
                    <div className="mt-1">
                        <span className="text-2xl font-bold text-blue-600">
                            {Object.values(getStationCapacityInfo).reduce((sum, s) => sum + s.inProgress, 0)}
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">across all stations</div>
                </div>
                
                {/* Completion Rate - modules fully done at ALL stations */}
                <div className="bg-white rounded-lg border p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500 font-medium uppercase">Completion Rate</div>
                        <span className="text-lg">📈</span>
                    </div>
                    {(() => {
                        // Count modules that are 100% complete at ALL stations (truly finished)
                        const fullyCompleteModules = getRecentlyCompleted().length;
                        const rate = lineBalance > 0 ? Math.round((fullyCompleteModules / lineBalance) * 100) : 0;
                        const rateColor = rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600';
                        return (
                            <>
                                <div className="mt-1">
                                    <span className={`text-2xl font-bold ${rateColor}`}>{rate}%</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {fullyCompleteModules}/{lineBalance} modules done
                                </div>
                            </>
                        );
                    })()}
                </div>
                
                {/* Stations at Capacity */}
                <div className="bg-white rounded-lg border p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500 font-medium uppercase">Station Status</div>
                        <span className="text-lg">🏭</span>
                    </div>
                    {(() => {
                        const overCount = Object.values(getStationCapacityInfo).filter(s => s.status === 'over').length;
                        const atCount = Object.values(getStationCapacityInfo).filter(s => s.status === 'at').length;
                        return (
                            <>
                                <div className="mt-1 flex items-center gap-2">
                                    {overCount > 0 && (
                                        <span className="text-sm font-bold text-red-600">{overCount} over</span>
                                    )}
                                    {atCount > 0 && (
                                        <span className="text-sm font-bold text-yellow-600">{atCount} at limit</span>
                                    )}
                                    {overCount === 0 && atCount === 0 && (
                                        <span className="text-sm font-bold text-green-600">All clear</span>
                                    )}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">capacity status</div>
                            </>
                        );
                    })()}
                </div>
            </div>
            
            {/* Schedule Conflict Warning Banner */}
            {(() => {
                const overloadedStations = productionStages.filter(s => 
                    getStationCapacityInfo[s.id]?.status === 'over'
                );
                if (overloadedStations.length === 0) return null;
                
                return (
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">⚠️</div>
                            <div className="flex-1">
                                <div className="font-bold text-red-800">Schedule Conflict Detected</div>
                                <div className="text-sm text-red-700 mt-1">
                                    {overloadedStations.length} station{overloadedStations.length > 1 ? 's are' : ' is'} over capacity:
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {overloadedStations.map(station => {
                                        const info = getStationCapacityInfo[station.id];
                                        return (
                                            <div 
                                                key={station.id}
                                                className="bg-white border border-red-300 rounded px-3 py-1.5 text-sm"
                                            >
                                                <span className="font-semibold text-red-800">{station.dept}</span>
                                                <span className="text-red-600 ml-2">
                                                    {info.inProgress}/{info.capacity} active
                                                </span>
                                                <span className="text-red-500 ml-1 text-xs">
                                                    (+{info.inProgress - info.capacity} over)
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="text-xs text-red-600 mt-2">
                                    💡 Consider moving modules to next week or adjusting station capacity in Schedule Setup.
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
            
            {/* Recently Completed Summary - Modules 100% at ALL stations */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-700 font-medium text-sm mb-2">
                    <span>✅ Fully Completed (All Stations)</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {getRecentlyCompleted().map((module, idx) => (
                        <div key={idx} className="bg-white border border-green-300 rounded px-2 py-1 text-xs">
                            <span className="font-mono font-bold">{module.serialNumber}</span>
                            <span className="text-green-600 ml-1">✓ Done</span>
                        </div>
                    ))}
                    {getRecentlyCompleted().length === 0 && (
                        <span className="text-sm text-gray-500">No modules fully completed yet (100% at all stations)</span>
                    )}
                </div>
            </div>
            
            {/* Main Board Area with Modules Panel */}
            <div className="flex gap-4">
                {/* Modules On-Board Panel (Left Sidebar) */}
                <div className="w-[180px] flex-shrink-0 no-print">
                    <div className="bg-white border rounded-lg shadow-sm sticky top-0">
                        <div className="bg-autovol-navy text-white px-3 py-2 rounded-t-lg">
                            <div className="font-semibold text-sm">Modules On Board</div>
                            <div className="text-xs opacity-80">{getModulesOnBoard.length} modules</div>
                        </div>
                        
                        {/* Difficulty Legend */}
                        <div className="px-2 py-2 border-b bg-gray-50">
                            <div className="text-xs text-gray-500 font-medium mb-1">Difficulty Indicators:</div>
                            <div className="flex flex-wrap gap-1">
                                {Object.entries(difficultyLabels).map(([key, label]) => (
                                    <div key={key} className="flex items-center gap-0.5" title={label}>
                                        <div 
                                            className="w-2 h-2 rounded-full" 
                                            style={{ backgroundColor: difficultyColors[key] }}
                                        />
                                        <span className="text-[9px] text-gray-500">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Module Tiles */}
                        <div 
                            className="overflow-y-auto p-2 space-y-2" 
                            style={{ maxHeight: 'calc(100vh - 450px)', minHeight: '300px' }}
                        >
                            {getModulesOnBoard.map((module, idx) => {
                                const difficulties = module.difficulties || {};
                                const activeDifficulties = Object.entries(difficulties).filter(([_, v]) => v);
                                const sectionColor = module.section === 'previous' ? 'border-l-red-400' : 
                                                    module.section === 'next' ? 'border-l-green-400' : 'border-l-blue-400';
                                
                                return (
                                    <div 
                                        key={module.id || idx}
                                        className={`bg-white border rounded shadow-sm text-xs cursor-pointer hover:shadow-md transition border-l-4 ${sectionColor}`}
                                        onClick={() => {
                                            // Scroll to this module on the board
                                            const moduleCard = document.querySelector(`[data-module-serial="${module.serialNumber}"]`);
                                            if (moduleCard) {
                                                moduleCard.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                                                moduleCard.classList.add('ring-2', 'ring-blue-500');
                                                setTimeout(() => moduleCard.classList.remove('ring-2', 'ring-blue-500'), 2000);
                                            }
                                        }}
                                        title="Click to highlight on board"
                                    >
                                        {/* Serial Number Header */}
                                        <div className="bg-gray-100 px-2 py-1 font-mono font-bold text-center border-b">
                                            {module.serialNumber?.slice(-7) || 'N/A'}
                                        </div>
                                        
                                        {/* Hitch / Rear Info */}
                                        <div className="grid grid-cols-2 divide-x text-center">
                                            {/* Hitch Side */}
                                            <div className="p-1">
                                                <div className="text-[9px] text-gray-400 font-medium">(H)</div>
                                                <div className="font-mono text-[10px] font-semibold truncate" title={module.hitchBLM}>
                                                    {module.hitchBLM || '—'}
                                                </div>
                                                <div className="text-[9px] text-gray-600 truncate" title={module.hitchUnit}>
                                                    {module.hitchUnit || '—'}
                                                </div>
                                                <div className="text-[9px] text-gray-500 truncate" title={module.hitchRoomType}>
                                                    {module.hitchRoomType || '—'}
                                                </div>
                                            </div>
                                            
                                            {/* Rear Side */}
                                            <div className="p-1">
                                                <div className="text-[9px] text-gray-400 font-medium">(R)</div>
                                                <div className="font-mono text-[10px] font-semibold truncate" title={module.rearBLM}>
                                                    {module.rearBLM || '—'}
                                                </div>
                                                <div className="text-[9px] text-gray-600 truncate" title={module.rearUnit}>
                                                    {module.rearUnit || module.hitchUnit || '—'}
                                                </div>
                                                <div className="text-[9px] text-gray-500 truncate" title={module.rearRoomType}>
                                                    {module.rearRoomType || '—'}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Difficulty Indicators */}
                                        {activeDifficulties.length > 0 && (
                                            <div className="flex justify-center gap-1 py-1 border-t bg-gray-50">
                                                {activeDifficulties.map(([key]) => (
                                                    <div 
                                                        key={key}
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: difficultyColors[key] }}
                                                        title={difficultyLabels[key]}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            
                            {getModulesOnBoard.length === 0 && (
                                <div className="text-center text-gray-400 py-4 text-xs">
                                    No modules on board
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Station Board Grid with Date Markers */}
                <div 
                    id="weekly-board-print-area"
                    className="relative flex-1 min-w-0"
                    ref={boardRef}
                    tabIndex={0}
                    onKeyDown={handleBoardKeyDown}
                >
                    {/* Horizontal Scroll Controls */}
                    <div className="flex items-center justify-between mb-2 no-print">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>💡</span>
                            <span>Use <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">←</kbd> <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">→</kbd> arrow keys to scroll</span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => {
                                    const scrollContainer = boardRef.current?.querySelector('.board-scroll-container');
                                    if (scrollContainer) scrollContainer.scrollBy({ left: -300, behavior: 'smooth' });
                                }}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                                title="Scroll left"
                            >
                                ← Prev
                            </button>
                            <button
                                onClick={() => {
                                    const scrollContainer = boardRef.current?.querySelector('.board-scroll-container');
                                    if (scrollContainer) scrollContainer.scrollBy({ left: 300, behavior: 'smooth' });
                                }}
                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                                title="Scroll right"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                    
                    {/* Scrollable Station Grid with sticky headers */}
                    <div 
                        className="board-scroll-container overflow-auto pb-4 scrollbar-visible" 
                        style={{ 
                            scrollbarWidth: 'auto', 
                            scrollbarColor: '#94a3b8 #f1f5f9',
                            maxHeight: 'calc(100vh - 350px)',
                            minHeight: '400px'
                        }}
                    >
                        <div className="flex gap-2 min-w-max">
                            {/* Sticky Date Marker Column */}
                            {renderDateMarkerColumn()}
                            
                            {/* Station Columns */}
                            {productionStages.map(station => renderStationColumn(station))}
                        </div>
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
                <span className="font-medium ml-4">Capacity:</span>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-2 rounded-full bg-green-400"></div>
                    <span>Under</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-2 rounded-full bg-yellow-400"></div>
                    <span>At Limit</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-2 rounded-full bg-red-400"></div>
                    <span>Over</span>
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
                    onComplete={(data, nextWeekId) => {
                        completeWeek(data);
                        setShowCompleteModal(false);
                        // Auto-advance to next week if one was created
                        if (nextWeekId) {
                            setSelectedWeekId(nextWeekId);
                            addToast('Week completed! Switched to next week.', 'success');
                        } else {
                            addToast('Week completed!', 'success');
                        }
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
                    onMoveModule={openMoveModal}
                    userRole={userRole}
                    onLogQAInspection={onLogQAInspection}
                />
            )}
            
            {/* Move Module Modal */}
            {showMoveModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150] p-4" onClick={() => setShowMoveModal(null)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="text-lg font-bold text-autovol-navy">Move Module in Schedule</h3>
                            <button onClick={() => setShowMoveModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">×</button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-sm text-gray-500">Module</div>
                                <div className="font-mono font-bold text-lg">{showMoveModal.module.serialNumber}</div>
                                <div className="text-sm text-gray-500 mt-1">
                                    Current position: <span className="font-semibold">#{showMoveModal.currentPosition}</span>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Move to position:
                                </label>
                                <select 
                                    id="moveToPosition"
                                    className="w-full border rounded-lg px-3 py-2"
                                    defaultValue={showMoveModal.currentPosition}
                                >
                                    {allModules.map((m, idx) => (
                                        <option key={m.id} value={idx + 1}>
                                            #{idx + 1} - {m.serialNumber === showMoveModal.module.serialNumber ? '(current)' : m.serialNumber}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        id="applyToAllStations"
                                        defaultChecked={true}
                                        className="mt-1 w-5 h-5 rounded text-blue-600"
                                    />
                                    <div>
                                        <div className="font-semibold text-blue-800">Apply to ALL stations</div>
                                        <div className="text-sm text-blue-700 mt-1">
                                            This will update the build sequence for this module across the entire production line (AUTO-FC through Close-Up).
                                        </div>
                                        <div className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                                            <span>⚠️</span> Recommended to keep stations in sync
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                        
                        <div className="p-4 border-t flex justify-end gap-2">
                            <button
                                onClick={() => setShowMoveModal(null)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const newPosition = parseInt(document.getElementById('moveToPosition').value);
                                    const applyToAll = document.getElementById('applyToAllStations').checked;
                                    applyModuleMove(showMoveModal.module, newPosition, applyToAll);
                                }}
                                className="px-4 py-2 btn-primary rounded-lg"
                            >
                                Move Module
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Reorder Confirmation Modal */}
            {showReorderConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150] p-4" onClick={() => setShowReorderConfirm(false)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="text-lg font-bold text-autovol-navy">⚠️ Confirm Schedule Changes</h3>
                            <button onClick={() => setShowReorderConfirm(false)} className="p-2 hover:bg-gray-100 rounded-lg">×</button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="text-sm text-gray-600">
                                You are about to reorder <span className="font-bold">{pendingReorders.length} module{pendingReorders.length > 1 ? 's' : ''}</span>:
                            </div>
                            
                            <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                                {pendingReorders.map((reorder, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm">
                                        <span className="font-mono font-bold">{reorder.moduleSerial}</span>
                                        <span className="text-gray-500">
                                            #{reorder.fromSeq} → {reorder.position} {reorder.targetSerial}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        id="reorderApplyToAll"
                                        defaultChecked={true}
                                        className="mt-1 w-5 h-5 rounded text-blue-600"
                                    />
                                    <div>
                                        <div className="font-semibold text-blue-800">Apply to ALL stations</div>
                                        <div className="text-sm text-blue-700 mt-1">
                                            This will update the build sequence across the entire production line.
                                        </div>
                                        <div className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                                            <span>⚠️</span> Recommended to keep stations in sync
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                        
                        <div className="p-4 border-t flex justify-end gap-2">
                            <button
                                onClick={() => setShowReorderConfirm(false)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    const applyToAll = document.getElementById('reorderApplyToAll').checked;
                                    applyPendingReorders(applyToAll);
                                }}
                                className="px-4 py-2 btn-primary rounded-lg"
                            >
                                Apply Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Reorder Mode Banner */}
            {reorderMode && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white rounded-xl shadow-2xl px-6 py-3 flex items-center gap-4">
                    <div className="text-lg">📋</div>
                    <div>
                        <div className="font-semibold">Reorder Mode Active</div>
                        <div className="text-sm opacity-90">Drag modules to reorder • {pendingReorders.length} change{pendingReorders.length !== 1 ? 's' : ''} pending</div>
                    </div>
                    <div className="h-8 w-px bg-blue-400"></div>
                    <button
                        onClick={cancelReorderMode}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 rounded-lg text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => setShowReorderConfirm(true)}
                        disabled={pendingReorders.length === 0}
                        className="px-3 py-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-semibold disabled:opacity-50"
                    >
                        Apply Changes
                    </button>
                </div>
            )}
            
            {/* PDF Export Modal */}
            {showPDFExport && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150] p-4" onClick={() => setShowPDFExport(false)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
                            <h3 className="text-lg font-bold text-autovol-navy">📄 Export Weekly Schedule</h3>
                            <button onClick={() => setShowPDFExport(false)} className="p-2 hover:bg-gray-100 rounded-lg text-xl">×</button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            {/* Export Scope Selection */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    What to include in export:
                                </label>
                                <select
                                    value={pdfExportScope}
                                    onChange={(e) => setPdfExportScope(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="current">Current Week Only (recommended for 1-page fit)</option>
                                    <option value="with-prev">Current Week + Previous Week Carryover</option>
                                    <option value="with-next">Current Week + Upcoming Preview</option>
                                    <option value="all">All (Previous + Current + Upcoming)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-2">
                                    💡 "Current Week Only" fits best on a single 11×17 page
                                </p>
                            </div>
                            
                            {/* Preview Info */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="text-2xl">ℹ️</div>
                                    <div>
                                        <div className="font-semibold text-blue-800">Export Format</div>
                                        <div className="text-sm text-blue-700 mt-1">
                                            The schedule will be exported as a clean table view optimized for 11×17 landscape printing.
                                            Color coding shows progress: white (0%), light green (25%), medium green (50%), green (75%), bright green (100%).
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Preview Table */}
                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-gray-100 px-3 py-2 text-sm font-medium text-gray-600 border-b">
                                    Preview (simplified)
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-autovol-navy text-white">
                                                <th className="px-2 py-1.5 text-left">Day</th>
                                                {getPDFExportData.stations.slice(0, 5).map(s => (
                                                    <th key={s.id} className="px-2 py-1.5 text-center">{s.dept}</th>
                                                ))}
                                                {getPDFExportData.stations.length > 5 && (
                                                    <th className="px-2 py-1.5 text-center">+{getPDFExportData.stations.length - 5}</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getPDFExportData.rows.slice(0, 5).map((row, idx) => (
                                                <tr key={idx} className="border-b">
                                                    <td className={`px-2 py-1 font-medium ${
                                                        row.weekSection === 'previous' ? 'bg-red-50 text-red-600' :
                                                        row.weekSection === 'next' ? 'bg-green-50 text-green-600' : ''
                                                    }`}>
                                                        {row.dayLabel}
                                                    </td>
                                                    {getPDFExportData.stations.slice(0, 5).map(s => {
                                                        const data = row.stations[s.id];
                                                        const bgColor = !data ? '' : 
                                                            data.progress === 0 ? 'bg-white' :
                                                            data.progress === 25 ? 'bg-green-100' :
                                                            data.progress === 50 ? 'bg-green-200' :
                                                            data.progress === 75 ? 'bg-green-300' : 'bg-green-400';
                                                        return (
                                                            <td key={s.id} className={`px-2 py-1 text-center font-mono ${bgColor}`}>
                                                                {data?.serialNumber?.slice(-5) || '—'}
                                                            </td>
                                                        );
                                                    })}
                                                    {getPDFExportData.stations.length > 5 && (
                                                        <td className="px-2 py-1 text-center text-gray-400">...</td>
                                                    )}
                                                </tr>
                                            ))}
                                            {getPDFExportData.rows.length > 5 && (
                                                <tr>
                                                    <td colSpan={Math.min(getPDFExportData.stations.length, 5) + 2} className="px-2 py-1 text-center text-gray-400 text-xs">
                                                        ... and {getPDFExportData.rows.length - 5} more rows
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            {/* Export Stats */}
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-autovol-navy">{getPDFExportData.rows.length}</div>
                                    <div className="text-xs text-gray-500">Total Rows</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-autovol-navy">{getPDFExportData.stations.length}</div>
                                    <div className="text-xs text-gray-500">Stations</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3">
                                    <div className="text-2xl font-bold text-autovol-navy">11×17</div>
                                    <div className="text-xs text-gray-500">Page Size</div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
                            <button
                                onClick={() => setShowPDFExport(false)}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executePDFExport}
                                className="px-4 py-2 btn-primary rounded-lg flex items-center gap-2"
                            >
                                <span>📄</span>
                                Export PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Toast Notifications Container */}
            {toasts.length > 0 && (
                <div className="fixed top-4 right-4 z-[200] space-y-2 pointer-events-none">
                    {toasts.map(toast => (
                        <div 
                            key={toast.id}
                            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-l-4 animate-slide-in ${
                                toast.type === 'success' 
                                    ? 'bg-green-50 border-green-500 text-green-800' 
                                    : toast.type === 'warning'
                                    ? 'bg-yellow-50 border-yellow-500 text-yellow-800'
                                    : 'bg-blue-50 border-blue-500 text-blue-800'
                            }`}
                            style={{
                                animation: 'slideIn 0.3s ease-out',
                                minWidth: '280px'
                            }}
                        >
                            <div className="flex-shrink-0 text-xl">
                                {toast.type === 'success' ? '✅' : toast.type === 'warning' ? '⚠️' : 'ℹ️'}
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-sm">{toast.message}</div>
                                {toast.stationName && (
                                    <div className="text-xs opacity-75 mt-0.5">
                                        Station: {toast.stationName}
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => removeToast(toast.id)}
                                className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-lg"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
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
        
        // Auto-create next week if enabled and get its ID
        let nextWeekId = null;
        if (createNextWeek && nextStartingModule && addWeek) {
            const nextWeekData = {
                id: `week-${nextWeekDates.start}`, // Generate predictable ID
                weekStart: nextWeekDates.start,
                weekEnd: nextWeekDates.end,
                startingModule: nextStartingModule,
                productionGoal: lineBalance,
                dailyGoal: Math.ceil(lineBalance / 4),
                notes: `Auto-created from week ${currentWeek.weekStart}`
            };
            addWeek(nextWeekData);
            nextWeekId = nextWeekData.id;
        }
        
        // Complete the current week (saves to history) and pass nextWeekId for auto-advance
        onComplete(weekData, nextWeekId);
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

// ===== MOBILE WEEKLY BOARD VIEW =====
// Swipeable single-station view for mobile devices
function MobileWeeklyBoardView({ 
    productionStages, 
    getModulesForStation,
    getStationStartingModule,
    getStationCapacityInfo,
    renderModuleCard,
    CARD_HEIGHT,
    onModuleClick,
    onProgressUpdate,
    canEdit
}) {
    const { useState, useRef, useEffect, useCallback } = React;
    const [currentStationIndex, setCurrentStationIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [slideDirection, setSlideDirection] = useState(null);
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);
    const containerRef = useRef(null);
    
    const currentStation = productionStages[currentStationIndex];
    const { previous, current, next } = getModulesForStation ? getModulesForStation(currentStation) : { previous: [], current: [], next: [] };
    const startingModule = getStationStartingModule ? getStationStartingModule(currentStation.id) : null;
    const capacityInfo = getStationCapacityInfo?.[currentStation.id] || { capacity: 5, inProgress: 0, complete: 0, loadPercent: 0, status: 'under' };
    
    // Navigate with animation
    const navigateTo = useCallback((newIndex, direction) => {
        if (isAnimating || newIndex < 0 || newIndex >= productionStages.length) return;
        setIsAnimating(true);
        setSlideDirection(direction);
        setTimeout(() => {
            setCurrentStationIndex(newIndex);
            setSlideDirection(null);
            setIsAnimating(false);
        }, 200);
    }, [isAnimating, productionStages.length]);
    
    // Swipe handlers - improved for Safari
    const handleTouchStart = (e) => {
        touchStartX.current = e.touches[0].clientX;
        touchEndX.current = e.touches[0].clientX;
    };
    
    const handleTouchMove = (e) => {
        touchEndX.current = e.touches[0].clientX;
    };
    
    const handleTouchEnd = () => {
        const swipeDistance = touchStartX.current - touchEndX.current;
        const minSwipeDistance = 50;
        
        if (swipeDistance > minSwipeDistance && currentStationIndex < productionStages.length - 1) {
            navigateTo(currentStationIndex + 1, 'left');
        } else if (swipeDistance < -minSwipeDistance && currentStationIndex > 0) {
            navigateTo(currentStationIndex - 1, 'right');
        }
    };
    
    // Arrow navigation handlers
    const goToPrevious = () => navigateTo(currentStationIndex - 1, 'right');
    const goToNext = () => navigateTo(currentStationIndex + 1, 'left');
    
    // Capacity bar colors
    const capacityBarColor = capacityInfo.status === 'over' ? 'bg-red-400' 
        : capacityInfo.status === 'at' ? 'bg-yellow-400' 
        : 'bg-green-400';
    
    return (
        <div className="mobile-weekly-board">
            {/* Station Selector Pills */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                {productionStages.map((station, idx) => (
                    <button
                        key={station.id}
                        onClick={() => setCurrentStationIndex(idx)}
                        className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium transition-all ${
                            idx === currentStationIndex 
                                ? `${station.color} text-white shadow-md` 
                                : 'bg-gray-100 text-gray-600'
                        }`}
                    >
                        {station.dept}
                    </button>
                ))}
            </div>
            
            {/* Current Station Card - with slide animation */}
            <div 
                ref={containerRef}
                className={`touch-pan-y transition-all duration-200 ease-out ${slideDirection === 'left' ? 'opacity-0 -translate-x-4' : slideDirection === 'right' ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ WebkitTransform: slideDirection === 'left' ? 'translateX(-16px)' : slideDirection === 'right' ? 'translateX(16px)' : 'translateX(0)' }}
            >
                {/* Station Header */}
                <div className={`${currentStation.color} text-white px-4 py-3 rounded-t-xl`}>
                    <div className="flex justify-between items-center">
                        <div>
                            <div className="font-bold text-lg">{currentStation.name}</div>
                            <div className="text-sm opacity-80">
                                Start: {startingModule?.serialNumber || 'Not set'}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold">{capacityInfo.inProgress}</div>
                            <div className="text-xs opacity-80">of {capacityInfo.capacity}</div>
                        </div>
                    </div>
                    
                    {/* Capacity Bar */}
                    <div className="mt-2">
                        <div className="h-2 rounded-full bg-white/30 overflow-hidden">
                            <div 
                                className={`h-full ${capacityBarColor} transition-all duration-300`}
                                style={{ width: `${Math.min(capacityInfo.loadPercent, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs mt-1 opacity-90">
                            <span>{capacityInfo.complete} complete</span>
                            <span>{currentStationIndex + 1} of {productionStages.length}</span>
                        </div>
                    </div>
                </div>
                
                {/* Swipe Hint */}
                <div className="bg-gray-100 text-center py-1 text-xs text-gray-500 flex items-center justify-center gap-2">
                    {currentStationIndex > 0 && <span>← {productionStages[currentStationIndex - 1]?.dept}</span>}
                    <span className="text-gray-400">|</span>
                    <span>Swipe to navigate</span>
                    <span className="text-gray-400">|</span>
                    {currentStationIndex < productionStages.length - 1 && <span>{productionStages[currentStationIndex + 1]?.dept} →</span>}
                </div>
                
                {/* Module List */}
                <div className="bg-white border border-gray-200 rounded-b-xl p-3 space-y-2 max-h-96 overflow-y-auto">
                    {previous.length === 0 && current.length === 0 && next.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <div className="text-3xl mb-2"><span className="icon-box inline-block w-8 h-8"></span></div>
                            <div>No modules at this station</div>
                        </div>
                    ) : (
                        <>
                            {/* Previous Week */}
                            {previous.length > 0 && (
                                <>
                                    <div className="text-xs font-semibold text-red-600 uppercase tracking-wide">Previous Week</div>
                                    {previous.map(module => (
                                        <MobileModuleCard 
                                            key={module.id} 
                                            module={module} 
                                            station={currentStation}
                                            section="previous"
                                            onClick={onModuleClick}
                                            onProgressUpdate={onProgressUpdate}
                                            canEdit={canEdit}
                                        />
                                    ))}
                                    <div className="border-t border-dashed border-red-200 my-2"></div>
                                </>
                            )}
                            
                            {/* Current Week */}
                            {current.length > 0 && (
                                <>
                                    <div className="text-xs font-semibold text-autovol-teal uppercase tracking-wide">Current Week</div>
                                    {current.map(module => (
                                        <MobileModuleCard 
                                            key={module.id} 
                                            module={module} 
                                            station={currentStation}
                                            section="current"
                                            onClick={onModuleClick}
                                            onProgressUpdate={onProgressUpdate}
                                            canEdit={canEdit}
                                        />
                                    ))}
                                </>
                            )}
                            
                            {/* Next Week */}
                            {next.length > 0 && (
                                <>
                                    <div className="border-t border-dashed border-green-200 my-2"></div>
                                    <div className="text-xs font-semibold text-green-600 uppercase tracking-wide">Next Week</div>
                                    {next.map(module => (
                                        <MobileModuleCard 
                                            key={module.id} 
                                            module={module} 
                                            station={currentStation}
                                            section="next"
                                            onClick={onModuleClick}
                                            onProgressUpdate={onProgressUpdate}
                                            canEdit={canEdit}
                                        />
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
            
            {/* Navigation Arrows - larger touch targets for mobile */}
            <div className="flex justify-between mt-3 gap-4">
                <button
                    onClick={goToPrevious}
                    disabled={currentStationIndex === 0 || isAnimating}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 active:scale-95 ${
                        currentStationIndex === 0 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-autovol-navy text-white shadow-md'
                    }`}
                    style={{ minHeight: '48px' }}
                >
                    <span className="icon-chevron-left inline-block w-4 h-4 mr-1" style={{ filter: currentStationIndex === 0 ? 'none' : 'invert(1)' }}></span>
                    Previous
                </button>
                <button
                    onClick={goToNext}
                    disabled={currentStationIndex === productionStages.length - 1 || isAnimating}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-200 active:scale-95 ${
                        currentStationIndex === productionStages.length - 1 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-autovol-navy text-white shadow-md'
                    }`}
                    style={{ minHeight: '48px' }}
                >
                    Next
                    <span className="icon-chevron-right inline-block w-4 h-4 ml-1" style={{ filter: currentStationIndex === productionStages.length - 1 ? 'none' : 'invert(1)' }}></span>
                </button>
            </div>
        </div>
    );
}

// Mobile Module Card - simplified card for mobile view with progress buttons
function MobileModuleCard({ module, station, section, onClick, onProgressUpdate, canEdit = true }) {
    const { useState } = React;
    const [showProgressButtons, setShowProgressButtons] = useState(false);
    const progress = module.stageProgress?.[station.id] || 0;
    const isComplete = progress === 100;
    const isInProgress = progress > 0 && progress < 100;
    
    const sectionStyles = {
        previous: 'border-red-200 bg-red-50/50',
        current: isComplete ? 'border-green-300 bg-green-50' : isInProgress ? 'border-autovol-teal bg-white' : 'border-gray-200 bg-gray-50',
        next: 'border-green-200 bg-green-50/50'
    };
    
    const progressOptions = [0, 25, 50, 75, 100];
    
    const handleProgressClick = (e, value) => {
        e.stopPropagation();
        if (onProgressUpdate) {
            onProgressUpdate(module, station, value);
        }
        setShowProgressButtons(false);
    };
    
    return (
        <div 
            className={`p-3 rounded-lg border-2 ${sectionStyles[section]} transition-all`}
            onClick={() => onClick?.(module, station)}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="font-bold text-autovol-navy">{module.serialNumber}</div>
                    <div className="text-xs text-gray-500">{module.projectName}</div>
                    <div className="text-xs text-gray-400">{module.blmId || 'No BLM'}</div>
                </div>
                <div className="text-right">
                    <button
                        onClick={(e) => { e.stopPropagation(); if (canEdit) setShowProgressButtons(!showProgressButtons); }}
                        className={`text-lg font-bold px-2 py-1 rounded ${isComplete ? 'text-green-600 bg-green-100' : isInProgress ? 'text-autovol-teal bg-teal-50' : 'text-gray-400 bg-gray-100'} ${canEdit ? 'active:scale-95' : ''}`}
                    >
                        {progress}%
                    </button>
                    {isComplete && <div className="text-xs text-green-600 mt-1">Complete</div>}
                </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-2 h-2 rounded-full bg-gray-200 overflow-hidden">
                <div 
                    className={`h-full transition-all duration-300 ${isComplete ? 'bg-green-500' : 'bg-autovol-teal'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
            
            {/* Quick Progress Buttons */}
            {showProgressButtons && canEdit && (
                <div className="mt-3 flex gap-1 justify-center">
                    {progressOptions.map(value => (
                        <button
                            key={value}
                            onClick={(e) => handleProgressClick(e, value)}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
                                progress === value 
                                    ? 'bg-autovol-teal text-white' 
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {value}%
                        </button>
                    ))}
                </div>
            )}
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
        ModuleDetailsTable,
        MobileWeeklyBoardView,
        MobileModuleCard
    };
}
