// ============================================================================
// WEEKLY BOARD COMPONENTS
// Weekly Board and Schedule Setup sub-tabs for Production Dashboard
// ============================================================================

// ===== DATE HELPER FUNCTIONS =====
// Format a Date object to YYYY-MM-DD string in LOCAL timezone (not UTC)
const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Parse a YYYY-MM-DD string as LOCAL date (not UTC)
// This prevents timezone shift when parsing date strings
const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

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
    
    // Debug info for mobile testing (visible in UI)
    const [debugInfo, setDebugInfo] = useState({ source: 'initializing', retries: 0, error: null });
    
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
    
    // Load from Supabase on mount with retry for late initialization
    useEffect(() => {
        let retryCount = 0;
        const MAX_RETRIES = 5;
        let retryTimer = null;
        let unsubscribe = null;
        
        const loadFromSupabase = async () => {
            const available = isSupabaseAvailable();
            console.log('[WeeklySchedule] Load attempt', retryCount + 1, '- Supabase available:', available);
            setDebugInfo(prev => ({ ...prev, retries: retryCount }));
            
            if (!available) {
                // Retry a few times before falling back to localStorage
                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    console.log('[WeeklySchedule] Supabase not ready, retry in 500ms (attempt', retryCount, 'of', MAX_RETRIES, ')');
                    retryTimer = setTimeout(loadFromSupabase, 500);
                    return;
                }
                
                console.log('[WeeklySchedule] Supabase not available after retries, using localStorage fallback');
                setDebugInfo({ source: 'localStorage', retries: retryCount, error: 'Supabase not available' });
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
                console.log('[WeeklySchedule] Loaded current schedule from Supabase:', current);
                if (current) {
                    setScheduleSetup({
                        shift1: current.shift1 || DEFAULT_SCHEDULE.shift1,
                        shift2: current.shift2 || DEFAULT_SCHEDULE.shift2
                    });
                } else {
                    console.log('[WeeklySchedule] No current schedule in Supabase, using defaults');
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
                setDebugInfo({ source: 'supabase', retries: retryCount, error: null });
                console.log('[WeeklySchedule] Loaded from Supabase successfully');
                
                // Subscribe to real-time updates after successful load
                unsubscribe = window.MODA_SUPABASE_DATA.weeklySchedules.onSnapshot(({ current, completed }) => {
                    if (isSaving.current) return; // Skip if we're the one saving
                    
                    console.log('[WeeklySchedule] Real-time update received');
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
            } catch (err) {
                console.error('[WeeklySchedule] Load error:', err);
                setDebugInfo({ source: 'localStorage', retries: retryCount, error: err.message });
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
        
        return () => {
            if (retryTimer) clearTimeout(retryTimer);
            if (unsubscribe) unsubscribe();
        };
    }, [isSupabaseAvailable]);
    
    // Re-check edit permissions when user profile changes
    // This runs continuously until permission is granted (no timeout)
    useEffect(() => {
        let pollInterval = null;
        let isMounted = true;
        
        const checkPermissions = () => {
            // Check if user profile is available
            const userProfile = window.MODA_SUPABASE?.userProfile;
            const hasProfile = userProfile && (userProfile.email || userProfile.dashboard_role);
            
            if (!hasProfile) {
                // Profile not ready yet - keep waiting
                return false;
            }
            
            if (isSupabaseAvailable() && window.MODA_SUPABASE_DATA?.weeklySchedules) {
                const newCanEdit = window.MODA_SUPABASE_DATA.weeklySchedules.canEdit();
                console.log('[WeeklySchedule] Permission check result:', newCanEdit);
                if (isMounted) {
                    setCanEdit(newCanEdit);
                }
                return true; // Profile was checked (regardless of result)
            }
            return false;
        };
        
        // Check immediately
        if (checkPermissions()) {
            return; // Already have profile, no need to poll
        }
        
        // Poll every 200ms until profile is available (no timeout - keep trying)
        pollInterval = setInterval(() => {
            if (checkPermissions()) {
                // Profile loaded and checked, stop polling
                clearInterval(pollInterval);
                pollInterval = null;
            }
        }, 200);
        
        // Listen for profile changes (backup mechanism)
        const handleProfileChange = (event) => {
            console.log('[WeeklySchedule] Profile loaded event received');
            setTimeout(() => {
                if (checkPermissions() && pollInterval) {
                    clearInterval(pollInterval);
                    pollInterval = null;
                }
            }, 50);
        };
        window.addEventListener('moda-profile-loaded', handleProfileChange);
        
        return () => {
            isMounted = false;
            if (pollInterval) clearInterval(pollInterval);
            window.removeEventListener('moda-profile-loaded', handleProfileChange);
        };
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
            console.warn('[WeeklySchedule] Cannot edit - user role does not have schedule_setup permission');
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
            console.warn('[WeeklySchedule] Cannot complete week - user role does not have schedule_setup permission');
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
        canEdit,
        debugInfo
    };
};

// ===== SCHEDULED PROJECTS SECTION COMPONENT =====
// Shows Active/Scheduled/Planned projects with ability to reorder and remove from schedule
function ScheduledProjectsSection({ projects, setProjects, canEdit }) {
    const { useMemo } = React;
    
    // Categorize projects
    const categorizedProjects = useMemo(() => {
        const active = []; // Has progression - locked
        const scheduled = []; // On weekly board (status=Active) but no progression yet
        const planned = []; // Not on weekly board yet (status=Planning/Planned)
        
        (projects || []).forEach(p => {
            if (p.status === 'Complete') return; // Skip completed projects
            
            // Check if any module has progression (stageProgress > 0 at any station)
            const hasProgression = (p.modules || []).some(m => {
                const progress = m.stageProgress || {};
                return Object.values(progress).some(v => v > 0);
            });
            
            if (p.status === 'Active') {
                if (hasProgression) {
                    active.push(p);
                } else {
                    scheduled.push(p);
                }
            } else {
                planned.push(p);
            }
        });
        
        // Sort by productionOrder
        active.sort((a, b) => (a.productionOrder || 999) - (b.productionOrder || 999));
        scheduled.sort((a, b) => (a.productionOrder || 999) - (b.productionOrder || 999));
        planned.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        return { active, scheduled, planned };
    }, [projects]);
    
    // Move project up in order (swap with previous)
    const handleMoveUp = (project, category) => {
        if (!canEdit || !setProjects) return;
        
        const list = category === 'scheduled' ? categorizedProjects.scheduled : categorizedProjects.planned;
        const idx = list.findIndex(p => p.id === project.id);
        if (idx <= 0) return;
        
        const prevProject = list[idx - 1];
        const currentOrder = project.productionOrder || 999;
        const prevOrder = prevProject.productionOrder || 999;
        
        // Swap production orders
        setProjects(prev => prev.map(p => {
            if (p.id === project.id) return { ...p, productionOrder: prevOrder };
            if (p.id === prevProject.id) return { ...p, productionOrder: currentOrder };
            return p;
        }));
    };
    
    // Move project down in order (swap with next)
    const handleMoveDown = (project, category) => {
        if (!canEdit || !setProjects) return;
        
        const list = category === 'scheduled' ? categorizedProjects.scheduled : categorizedProjects.planned;
        const idx = list.findIndex(p => p.id === project.id);
        if (idx < 0 || idx >= list.length - 1) return;
        
        const nextProject = list[idx + 1];
        const currentOrder = project.productionOrder || 999;
        const nextOrder = nextProject.productionOrder || 999;
        
        // Swap production orders
        setProjects(prev => prev.map(p => {
            if (p.id === project.id) return { ...p, productionOrder: nextOrder };
            if (p.id === nextProject.id) return { ...p, productionOrder: currentOrder };
            return p;
        }));
    };
    
    // Remove project from schedule (set back to Planning, clear productionOrder)
    const handleRemoveFromSchedule = (project) => {
        if (!canEdit || !setProjects) return;
        if (!confirm(`Remove "${project.name}" from the production schedule?\n\nThis will set the project back to Planning status. You can re-schedule it from the Projects tab.`)) return;
        
        setProjects(prev => prev.map(p => {
            if (p.id !== project.id) return p;
            // Clear productionOrder and set status back to Planning
            const { productionOrder, ...rest } = p;
            return { 
                ...rest, 
                status: 'Planning',
                modules: (p.modules || []).map(m => ({ ...m, isOnline: false }))
            };
        }));
    };
    
    const totalScheduled = categorizedProjects.active.length + categorizedProjects.scheduled.length;
    
    return (
        <div className="bg-white border-2 border-purple-400 rounded-lg overflow-hidden">
            <div className="bg-purple-500 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <span className="font-semibold">Scheduled Projects</span>
                    <span className="text-sm opacity-75">Production order for Weekly Board</span>
                </div>
                <span className="bg-purple-700 text-white px-2 py-0.5 rounded text-sm font-medium">
                    {totalScheduled} project{totalScheduled !== 1 ? 's' : ''} scheduled
                </span>
            </div>
            
            <div className="p-4 space-y-4">
                {/* Active Projects - Locked */}
                {categorizedProjects.active.length > 0 && (
                    <div>
                        <div className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Active Projects (Locked - has progression)
                        </div>
                        <div className="space-y-1">
                            {categorizedProjects.active.map((p, idx) => (
                                <div key={p.id} className="flex items-center gap-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                                    <span className="text-gray-400 font-mono text-sm w-6">#{p.productionOrder || idx + 1}</span>
                                    <span className="font-medium text-gray-800 flex-1">{p.name}</span>
                                    <span className="text-xs text-gray-500">{(p.modules || []).length} modules</span>
                                    <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">Active</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Scheduled Projects - Can reorder or remove */}
                {categorizedProjects.scheduled.length > 0 && (
                    <div>
                        <div className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Scheduled Projects (No progression yet)
                        </div>
                        <div className="space-y-1">
                            {categorizedProjects.scheduled.map((p, idx) => (
                                <div key={p.id} className="flex items-center gap-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                                    <span className="text-gray-400 font-mono text-sm w-6">#{p.productionOrder || idx + 1}</span>
                                    <span className="font-medium text-gray-800 flex-1">{p.name}</span>
                                    <span className="text-xs text-gray-500">{(p.modules || []).length} modules</span>
                                    {canEdit && (
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleMoveUp(p, 'scheduled')}
                                                disabled={idx === 0}
                                                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Move up"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                onClick={() => handleMoveDown(p, 'scheduled')}
                                                disabled={idx === categorizedProjects.scheduled.length - 1}
                                                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Move down"
                                            >
                                                ↓
                                            </button>
                                            <button
                                                onClick={() => handleRemoveFromSchedule(p)}
                                                className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-600 rounded"
                                                title="Remove from schedule"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Planned Projects - Not yet scheduled */}
                {categorizedProjects.planned.length > 0 && (
                    <div>
                        <div className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                            Planned Projects (Not scheduled)
                        </div>
                        <div className="space-y-1">
                            {categorizedProjects.planned.map(p => (
                                <div key={p.id} className="flex items-center gap-3 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                                    <span className="text-gray-300 font-mono text-sm w-6">—</span>
                                    <span className="font-medium text-gray-600 flex-1">{p.name}</span>
                                    <span className="text-xs text-gray-500">{(p.modules || []).length} modules</span>
                                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{p.status || 'Planning'}</span>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            To schedule a project, go to Projects → select project → click "Schedule Online"
                        </p>
                    </div>
                )}
                
                {totalScheduled === 0 && categorizedProjects.planned.length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                        No projects found. Create projects in the Projects tab.
                    </div>
                )}
            </div>
        </div>
    );
}

// ===== CALENDAR WEEK PICKER COMPONENT =====
// A calendar-style week picker that shows weeks in a monthly grid
function CalendarWeekPicker({ weeks, currentWeek, selectedWeekId, onSelectWeek, onClose }) {
    const { useState, useMemo } = React;
    
    // Initialize to the month of the current/selected week
    const initialDate = useMemo(() => {
        if (selectedWeekId) {
            const selected = weeks.find(w => w.id === selectedWeekId);
            if (selected?.weekStart) return parseLocalDate(selected.weekStart);
        }
        if (currentWeek?.weekStart) return parseLocalDate(currentWeek.weekStart);
        return new Date();
    }, [selectedWeekId, currentWeek, weeks]);
    
    const [viewDate, setViewDate] = useState(initialDate);
    
    // Get month/year for display
    const monthYear = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Navigate months
    const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    const prevYear = () => setViewDate(d => new Date(d.getFullYear() - 1, d.getMonth(), 1));
    const nextYear = () => setViewDate(d => new Date(d.getFullYear() + 1, d.getMonth(), 1));
    const goToToday = () => setViewDate(new Date());
    
    // Get weeks that fall within the current view month
    const weeksInMonth = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        return weeks.filter(w => {
            if (!w.weekStart) return false;
            const weekStart = parseLocalDate(w.weekStart);
            const weekEnd = parseLocalDate(w.weekEnd || w.weekStart);
            // Include week if it overlaps with this month
            return (weekStart <= lastDay && weekEnd >= firstDay);
        }).sort((a, b) => parseLocalDate(a.weekStart) - parseLocalDate(b.weekStart));
    }, [weeks, viewDate]);
    
    // Get week status
    const getWeekStatus = (week) => {
        const now = new Date();
        const weekEnd = parseLocalDate(week.weekEnd || week.weekStart);
        const weekStart = parseLocalDate(week.weekStart);
        
        if (currentWeek?.id === week.id) return 'current';
        if (weekEnd < now) return 'past';
        if (weekStart > now) return 'future';
        return 'active';
    };
    
    const getWeekStyles = (week) => {
        const status = getWeekStatus(week);
        const isSelected = selectedWeekId === week.id;
        
        let base = 'p-2 rounded-lg border-2 cursor-pointer transition-all text-left ';
        
        if (isSelected) {
            base += 'border-blue-500 bg-blue-50 ring-2 ring-blue-300 ';
        } else if (status === 'current') {
            base += 'border-green-500 bg-green-50 hover:bg-green-100 ';
        } else if (status === 'past') {
            base += 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-500 ';
        } else {
            base += 'border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 ';
        }
        
        return base;
    };
    
    return (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 w-80" onClick={e => e.stopPropagation()}>
            {/* Header with navigation */}
            <div className="p-3 border-b bg-gray-50 rounded-t-xl">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-1">
                        <button onClick={prevYear} className="p-1 hover:bg-gray-200 rounded text-gray-500" title="Previous Year">
                            &#171;
                        </button>
                        <button onClick={prevMonth} className="p-1 hover:bg-gray-200 rounded text-gray-500" title="Previous Month">
                            &#8249;
                        </button>
                    </div>
                    <span className="font-semibold text-gray-800">{monthYear}</span>
                    <div className="flex gap-1">
                        <button onClick={nextMonth} className="p-1 hover:bg-gray-200 rounded text-gray-500" title="Next Month">
                            &#8250;
                        </button>
                        <button onClick={nextYear} className="p-1 hover:bg-gray-200 rounded text-gray-500" title="Next Year">
                            &#187;
                        </button>
                    </div>
                </div>
                <div className="flex justify-center gap-2">
                    <button onClick={goToToday} className="text-xs text-blue-600 hover:underline">Today</button>
                    {currentWeek && (
                        <button 
                            onClick={() => { onSelectWeek(null); onClose(); }} 
                            className="text-xs text-green-600 hover:underline"
                        >
                            Current Week
                        </button>
                    )}
                </div>
            </div>
            
            {/* Weeks grid */}
            <div className="p-3 max-h-64 overflow-y-auto">
                {weeksInMonth.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                        No weeks configured for this month
                    </div>
                ) : (
                    <div className="space-y-2">
                        {weeksInMonth.map(week => {
                            const status = getWeekStatus(week);
                            const startDate = parseLocalDate(week.weekStart);
                            const endDate = parseLocalDate(week.weekEnd || week.weekStart);
                            const weekNum = week.weekNumber || Math.ceil((startDate - new Date(startDate.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000));
                            
                            return (
                                <button
                                    key={week.id}
                                    onClick={() => { onSelectWeek(week.id); onClose(); }}
                                    className={getWeekStyles(week) + ' w-full'}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-xs text-gray-500">Week {weekNum}</div>
                                            <div className="font-medium text-sm">
                                                {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {status === 'current' && (
                                                <span className="px-1.5 py-0.5 bg-green-500 text-white text-xs rounded">Current</span>
                                            )}
                                            {status === 'past' && (
                                                <span className="px-1.5 py-0.5 bg-gray-400 text-white text-xs rounded">Past</span>
                                            )}
                                            {status === 'future' && (
                                                <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded">Future</span>
                                            )}
                                            {week.plannedModules > 0 && (
                                                <span className="text-xs text-gray-500">{week.plannedModules} mod</span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {/* Footer */}
            <div className="p-2 border-t bg-gray-50 rounded-b-xl">
                <button 
                    onClick={onClose}
                    className="w-full py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded"
                >
                    Close
                </button>
            </div>
        </div>
    );
}

// ===== PROTOTYPE SCHEDULING SECTION COMPONENT =====
function PrototypeSchedulingSection({ allModules, sortedModules, projects, setProjects, onPlaceOnBoard }) {
    const { useState, useMemo } = React;
    const [expandedProto, setExpandedProto] = useState(null);
    
    // Get all prototype modules from ALL projects (not just Active ones)
    // This ensures prototypes are visible for scheduling regardless of parent project status
    const prototypeModules = useMemo(() => {
        return (projects || []).flatMap(p => 
            (p.modules || [])
                .filter(m => m.isPrototype)
                .map(m => ({ ...m, projectId: p.id, projectName: p.name, projectAbbreviation: p.abbreviation }))
        );
    }, [projects]);
    
    // Get modules for "Insert After" dropdown (sorted by buildSequence)
    // Include: non-prototypes with integer buildSequence, AND scheduled prototypes (with decimal buildSequence)
    // This allows consecutive prototype scheduling (e.g., Proto 2 after Proto 1)
    // Group by project for better UX in the dropdown
    const insertTargetsByProject = useMemo(() => {
        // Combine sortedModules with already-scheduled prototypes from prototypeModules
        const scheduledPrototypes = prototypeModules
            .filter(m => m.buildSequence && !Number.isInteger(m.buildSequence))
            .map(m => ({ ...m, isScheduledPrototype: true }));
        
        const regularModules = sortedModules
            .filter(m => !m.isPrototype && Number.isInteger(m.buildSequence));
        
        // Merge all modules
        const allModules = [...regularModules, ...scheduledPrototypes];
        
        // Group by project, then sort each group by buildSequence
        const grouped = {};
        allModules.forEach(m => {
            const projectKey = m.projectId || 'unknown';
            if (!grouped[projectKey]) {
                grouped[projectKey] = {
                    projectId: m.projectId,
                    projectName: m.projectName || 'Unknown Project',
                    modules: []
                };
            }
            grouped[projectKey].modules.push(m);
        });
        
        // Sort modules within each project by buildSequence
        Object.values(grouped).forEach(group => {
            group.modules.sort((a, b) => (a.buildSequence || 0) - (b.buildSequence || 0));
        });
        
        // Return as array of project groups, sorted by first module's buildSequence
        return Object.values(grouped).sort((a, b) => {
            const aFirst = a.modules[0]?.buildSequence || 0;
            const bFirst = b.modules[0]?.buildSequence || 0;
            return aFirst - bFirst;
        });
    }, [sortedModules, prototypeModules]);
    
    // Calculate the next available decimal slot after a given module
    const getNextDecimalSlot = (afterBuildSeq) => {
        // Combine regular modules and prototype modules to check for existing decimals
        const allModulesForCheck = [...sortedModules, ...prototypeModules];
        
        // Find all modules with buildSequence between afterBuildSeq and the next integer
        // For decimal afterBuildSeq (e.g., 28.1), look between 28.1 and 29
        const baseInt = Math.floor(afterBuildSeq);
        const existingDecimals = allModulesForCheck
            .filter(m => m.buildSequence > afterBuildSeq && m.buildSequence < baseInt + 1)
            .map(m => m.buildSequence);
        
        if (existingDecimals.length === 0) {
            // If afterBuildSeq is already decimal, add 0.1 to it
            // If it's an integer, start at .1
            const newSeq = Number.isInteger(afterBuildSeq) 
                ? afterBuildSeq + 0.1 
                : Math.round((afterBuildSeq + 0.1) * 100) / 100;
            return newSeq;
        }
        // Find the max and add 0.1
        const maxDecimal = Math.max(...existingDecimals);
        return Math.round((maxDecimal + 0.1) * 100) / 100; // Round to 2 decimal places
    };
    
    // Update a prototype's buildSequence based on "Insert After" selection
    // Stores original build sequence so it can be restored later
    const handleInsertAfter = (protoModule, afterModuleSerial) => {
        console.log('[PrototypeScheduling] handleInsertAfter called:', {
            protoSerial: protoModule.serialNumber,
            afterSerial: afterModuleSerial,
            hasSetProjects: !!setProjects
        });
        
        if (!afterModuleSerial || !setProjects) {
            console.warn('[PrototypeScheduling] Missing afterModuleSerial or setProjects');
            return;
        }
        
        // Search in both regular modules and scheduled prototypes
        let afterModule = sortedModules.find(m => m.serialNumber === afterModuleSerial);
        if (!afterModule) {
            // Check if it's a scheduled prototype
            afterModule = prototypeModules.find(m => m.serialNumber === afterModuleSerial);
        }
        if (!afterModule) {
            console.warn('[PrototypeScheduling] Could not find afterModule:', afterModuleSerial);
            return;
        }
        
        const newBuildSeq = getNextDecimalSlot(afterModule.buildSequence);
        console.log('[PrototypeScheduling] Calculated newBuildSeq:', newBuildSeq, 'after:', afterModule.buildSequence);
        
        // Update the module in projects - store original sequence for restoration
        setProjects(prev => {
            const updated = prev.map(project => {
                if (project.id !== protoModule.projectId) return project;
                return {
                    ...project,
                    modules: (project.modules || []).map(m => {
                        if (m.id !== protoModule.id) return m;
                        // Store original build sequence if not already stored
                        const originalSeq = m.originalBuildSequence || m.buildSequence;
                        console.log('[PrototypeScheduling] Updating module:', m.serialNumber, 'with insertedAfter:', afterModuleSerial);
                        return { 
                            ...m, 
                            buildSequence: newBuildSeq, 
                            insertedAfter: afterModuleSerial,
                            originalBuildSequence: originalSeq
                        };
                    })
                };
            });
            return updated;
        });
        
        setExpandedProto(null);
    };
    
    // Clear insertion (reset to original project sequence)
    // Restores the prototype's original build sequence from its source project
    const handleClearInsertion = (protoModule) => {
        if (!setProjects) return;
        
        // Use the stored original build sequence if available, otherwise use module's index in project
        const project = projects?.find(p => p.id === protoModule.projectId);
        const projectModules = project?.modules || [];
        const protoIndex = projectModules.findIndex(m => m.id === protoModule.id);
        
        // Restore to original sequence (stored when first inserted) or calculate from project position
        const originalSeq = protoModule.originalBuildSequence || (protoIndex + 1);
        
        setProjects(prev => prev.map(proj => {
            if (proj.id !== protoModule.projectId) return proj;
            return {
                ...proj,
                modules: (proj.modules || []).map(m => {
                    if (m.id !== protoModule.id) return m;
                    const { insertedAfter, ...rest } = m;
                    return { ...rest, buildSequence: originalSeq };
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
                                        {onPlaceOnBoard && (
                                            <button
                                                onClick={() => onPlaceOnBoard(proto)}
                                                className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded font-medium"
                                            >
                                                Place on Board
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
                                            {insertTargetsByProject.map(group => (
                                                <optgroup key={group.projectId} label={group.projectName}>
                                                    {group.modules.map(m => (
                                                        <option key={m.id} value={m.serialNumber}>
                                                            {m.isScheduledPrototype ? '★ ' : ''}{m.serialNumber} (#{m.buildSequence})
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            The prototype will be assigned a decimal sequence to slot after the selected module.
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
    canEdit = true, // Tab-specific edit permission (false = view-only mode)
    userEmail = '', // User email passed from Dashboard auth
    // Navigation props
    onViewWeek = null, // Callback to view a week in WeeklyBoard: (weekId) => void
    onPlacePrototype = null, // Callback to place a prototype on the board: (prototype) => void
    initialEditWeekId = null, // Week ID to open edit modal for (from WeeklyBoard Edit Week button)
    onEditWeekHandled = null // Callback when edit week has been handled
}) {
    const { useState, useCallback } = React;
    
    // Handle "Place on Board" button click - stores prototype in localStorage and navigates to Weekly Board
    const handlePlaceOnBoard = useCallback((prototype) => {
        // Store prototype in localStorage for WeeklyBoardTab to pick up
        localStorage.setItem('moda_prototype_placement', JSON.stringify(prototype));
        // Navigate to Weekly Board tab if callback provided
        if (onViewWeek) {
            onViewWeek(null); // null means current week
        }
    }, [onViewWeek]);
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
    
    // Collapsible state for Year > Quarter grouping
    // Default: current year expanded, current quarter expanded
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
    const [expandedYears, setExpandedYears] = useState({ [currentYear]: true });
    const [expandedQuarters, setExpandedQuarters] = useState({ [`${currentYear}-Q${currentQuarter}`]: true });
    
    const toggleYear = (year) => {
        setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
    };
    
    const toggleQuarter = (yearQuarterKey) => {
        setExpandedQuarters(prev => ({ ...prev, [yearQuarterKey]: !prev[yearQuarterKey] }));
    };
    
    // Group weeks by year and quarter
    const groupWeeksByYearQuarter = (weeksList) => {
        const grouped = {};
        (weeksList || []).forEach(week => {
            const year = week.year || parseLocalDate(week.weekStart).getFullYear();
            const quarter = week.quarter || Math.ceil((parseLocalDate(week.weekStart).getMonth() + 1) / 3);
            if (!grouped[year]) grouped[year] = {};
            if (!grouped[year][quarter]) grouped[year][quarter] = [];
            grouped[year][quarter].push(week);
        });
        // Sort weeks within each quarter by week number (ascending)
        Object.keys(grouped).forEach(year => {
            Object.keys(grouped[year]).forEach(quarter => {
                grouped[year][quarter].sort((a, b) => (a.weekNumber || 0) - (b.weekNumber || 0));
            });
        });
        return grouped;
    };
    
    const [formData, setFormData] = useState({ 
        weekStart: '', 
        weekEnd: '', 
        productionGoal: 20, 
        dailyGoal: 5, 
        startingModule: '', 
        notes: '',
        // Per-week daily targets
        shift1: { monday: 5, tuesday: 5, wednesday: 5, thursday: 5 },
        shift2: { friday: 0, saturday: 0, sunday: 0 }
    });
    
    // Handle initialEditWeekId from WeeklyBoard Edit Week button
    React.useEffect(() => {
        if (initialEditWeekId && weeks) {
            const weekToEdit = weeks.find(w => w.id === initialEditWeekId);
            if (weekToEdit) {
                // Open the edit modal for this week
                setFormData({ 
                    weekStart: weekToEdit.weekStart, 
                    weekEnd: weekToEdit.weekEnd, 
                    productionGoal: weekToEdit.productionGoal || 20, 
                    dailyGoal: weekToEdit.dailyGoal || 5, 
                    startingModule: weekToEdit.startingModule || '', 
                    notes: weekToEdit.notes || '',
                    shift1: weekToEdit.shift1 || { monday: 5, tuesday: 5, wednesday: 5, thursday: 5 },
                    shift2: weekToEdit.shift2 || { friday: 0, saturday: 0, sunday: 0 }
                }); 
                setEditingWeek(weekToEdit); 
                setShowAddWeek(true); 
                setError('');
                
                // Expand the year and quarter containing this week
                const year = weekToEdit.year || parseLocalDate(weekToEdit.weekStart).getFullYear();
                const quarter = weekToEdit.quarter || Math.ceil((parseLocalDate(weekToEdit.weekStart).getMonth() + 1) / 3);
                setExpandedYears(prev => ({ ...prev, [year]: true }));
                setExpandedQuarters(prev => ({ ...prev, [`${year}-Q${quarter}`]: true }));
            }
            // Clear the initialEditWeekId after handling
            if (onEditWeekHandled) onEditWeekHandled();
        }
    }, [initialEditWeekId, weeks, onEditWeekHandled]);
    
    // Sort modules: first by project (productionOrder, then projectId), then by buildSequence within project
    const sortedModules = [...(allModules || [])].sort((a, b) => {
        // First by production order
        if ((a.projectProductionOrder || 999) !== (b.projectProductionOrder || 999)) {
            return (a.projectProductionOrder || 999) - (b.projectProductionOrder || 999);
        }
        // Then keep projects grouped by projectId
        if (a.projectId !== b.projectId) {
            return (a.projectId || '').localeCompare(b.projectId || '');
        }
        // Then by build sequence within project
        return (a.buildSequence || 0) - (b.buildSequence || 0);
    });
    
    const getWeekSunday = (mondayStr) => { 
        const monday = parseLocalDate(mondayStr); 
        const sunday = new Date(monday); 
        sunday.setDate(monday.getDate() + 6); 
        return formatLocalDate(sunday); 
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
                value: formatLocalDate(weekMonday), 
                label: `${weekMonday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${label ? ` (${label})` : ''}`, 
                isCurrent: i === 0 
            }); 
        } 
        return options; 
    };
    
    const resetForm = () => { 
        setFormData({ 
            weekStart: '', 
            weekEnd: '', 
            productionGoal: 20, 
            dailyGoal: 5, 
            startingModule: '', 
            notes: '',
            shift1: { monday: 5, tuesday: 5, wednesday: 5, thursday: 5 },
            shift2: { friday: 0, saturday: 0, sunday: 0 }
        }); 
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
            notes: week.notes || '',
            shift1: week.shift1 || { monday: 5, tuesday: 5, wednesday: 5, thursday: 5 },
            shift2: week.shift2 || { friday: 0, saturday: 0, sunday: 0 }
        }); 
        setEditingWeek(week); 
        setShowAddWeek(true); 
        setError(''); 
    };
    
    const handleWeekSelect = (weekStartValue) => { 
        const weekEnd = getWeekSunday(weekStartValue); 
        // Use current global schedule as default for new weeks
        setFormData(prev => ({ 
            ...prev, 
            weekStart: weekStartValue, 
            weekEnd: weekEnd, 
            productionGoal: getLineBalance(),
            shift1: scheduleSetup?.shift1 || prev.shift1,
            shift2: scheduleSetup?.shift2 || prev.shift2
        })); 
    };
    
    // Calculate line balance for form data
    const getFormLineBalance = () => {
        const s1 = formData.shift1 || {};
        const s2 = formData.shift2 || {};
        return (s1.monday || 0) + (s1.tuesday || 0) + (s1.wednesday || 0) + (s1.thursday || 0) +
               (s2.friday || 0) + (s2.saturday || 0) + (s2.sunday || 0);
    };
    
    // Update daily target in form
    const updateFormDailyTarget = (shift, day, value) => {
        const numValue = parseInt(value) || 0;
        setFormData(prev => ({
            ...prev,
            [shift]: { ...prev[shift], [day]: numValue }
        }));
    };
    
    const handleSave = () => { 
        if (!formData.weekStart) { setError('Please select a week'); return; } 
        if (!formData.startingModule) { setError('Please select a starting module'); return; } 
        const validation = validateWeek?.(formData, editingWeek?.id); 
        if (validation && !validation.valid) { setError(validation.error); return; } 
        
        // Calculate and include plannedModules in the saved data
        const plannedModules = getFormLineBalance();
        const dataToSave = { ...formData, plannedModules };
        
        if (editingWeek) { 
            updateWeek?.(editingWeek.id, dataToSave); 
        } else { 
            addWeek?.(dataToSave); 
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
                        <div className="text-sm text-amber-600">Your role does not have permission to modify the schedule setup. Contact an Admin or Production Management to make changes.</div>
                    </div>
                </div>
            )}
            
            {/* Debug Banner - Shows data source for mobile testing */}
            <div className={`rounded-lg p-2 text-xs font-mono ${
                window.MODA_SUPABASE_DATA?.isAvailable?.() 
                    ? 'bg-green-100 border border-green-300 text-green-800' 
                    : 'bg-red-100 border border-red-300 text-red-800'
            }`}>
                <strong>Sync Status:</strong> {window.MODA_SUPABASE_DATA?.isAvailable?.() ? 'Supabase Connected' : 'localStorage Only'} | 
                <strong> Shift1 Mon:</strong> {scheduleSetup?.shift1?.monday ?? 'N/A'} | 
                <strong> User:</strong> {userEmail || 'Not logged in'}
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-autovol-navy">Schedule Setup</h3>
                    <p className="text-sm text-gray-500">Configure weekly production schedule and starting modules</p>
                </div>
                <div className="bg-autovol-teal text-white px-4 py-2 rounded-lg">
                    <span className="text-sm">Current Week Balance:</span>
                    <span className="ml-2 text-xl font-bold">
                        {currentWeek?.shift1 
                            ? (currentWeek.shift1.monday || 0) + (currentWeek.shift1.tuesday || 0) + 
                              (currentWeek.shift1.wednesday || 0) + (currentWeek.shift1.thursday || 0) +
                              (currentWeek.shift2?.friday || 0) + (currentWeek.shift2?.saturday || 0) + (currentWeek.shift2?.sunday || 0)
                            : getLineBalance()}
                    </span>
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
                    
                    {/* Week List - Collapsible by Year > Quarter */}
                    {(!weeks || weeks.length === 0) ? (
                        <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                            No production weeks configured. Click "+ Add Week" to create one.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {(() => {
                                const grouped = groupWeeksByYearQuarter(weeks);
                                const years = Object.keys(grouped).sort((a, b) => b - a); // Descending by year
                                
                                return years.map(year => {
                                    const yearNum = parseInt(year);
                                    const isYearExpanded = expandedYears[yearNum];
                                    const quarters = Object.keys(grouped[year]).sort((a, b) => b - a); // Descending by quarter
                                    const totalWeeksInYear = quarters.reduce((sum, q) => sum + grouped[year][q].length, 0);
                                    const totalModulesInYear = quarters.reduce((sum, q) => 
                                        sum + grouped[year][q].reduce((wSum, w) => wSum + (w.plannedModules || 0), 0), 0);
                                    
                                    return (
                                        <div key={year} className="border rounded-lg overflow-hidden">
                                            {/* Year Header */}
                                            <button
                                                onClick={() => toggleYear(yearNum)}
                                                className={`w-full px-4 py-3 flex items-center justify-between text-left ${
                                                    yearNum === currentYear ? 'bg-autovol-navy text-white' : 'bg-gray-100 text-gray-800'
                                                } hover:opacity-90 transition-opacity`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={`transform transition-transform ${isYearExpanded ? 'rotate-90' : ''}`}>
                                                        &#9654;
                                                    </span>
                                                    <span className="font-bold text-lg">{year}</span>
                                                    {yearNum === currentYear && (
                                                        <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">Current Year</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <span>{totalWeeksInYear} weeks</span>
                                                    <span className="font-semibold">{totalModulesInYear.toLocaleString()} modules planned</span>
                                                </div>
                                            </button>
                                            
                                            {/* Quarters within Year */}
                                            {isYearExpanded && (
                                                <div className="border-t">
                                                    {quarters.map(quarter => {
                                                        const quarterNum = parseInt(quarter);
                                                        const quarterKey = `${year}-Q${quarter}`;
                                                        const isQuarterExpanded = expandedQuarters[quarterKey];
                                                        const quarterWeeks = grouped[year][quarter];
                                                        const totalModulesInQuarter = quarterWeeks.reduce((sum, w) => sum + (w.plannedModules || 0), 0);
                                                        const quarterLabels = { 1: 'Q1 (Jan-Mar)', 2: 'Q2 (Apr-Jun)', 3: 'Q3 (Jul-Sep)', 4: 'Q4 (Oct-Dec)' };
                                                        const isCurrentQuarterInYear = yearNum === currentYear && quarterNum === currentQuarter;
                                                        
                                                        return (
                                                            <div key={quarterKey}>
                                                                {/* Quarter Header */}
                                                                <button
                                                                    onClick={() => toggleQuarter(quarterKey)}
                                                                    className={`w-full px-6 py-2 flex items-center justify-between text-left border-b ${
                                                                        isCurrentQuarterInYear ? 'bg-green-50' : 'bg-gray-50'
                                                                    } hover:bg-gray-100 transition-colors`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`transform transition-transform text-xs ${isQuarterExpanded ? 'rotate-90' : ''}`}>
                                                                            &#9654;
                                                                        </span>
                                                                        <span className="font-semibold text-gray-700">{quarterLabels[quarterNum] || `Q${quarter}`}</span>
                                                                        {isCurrentQuarterInYear && (
                                                                            <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">Current</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                                                        <span>{quarterWeeks.length} weeks</span>
                                                                        <span>{totalModulesInQuarter.toLocaleString()} modules</span>
                                                                    </div>
                                                                </button>
                                                                
                                                                {/* Weeks within Quarter */}
                                                                {isQuarterExpanded && (
                                                                    <div className="divide-y">
                                                                        {quarterWeeks.map(week => {
                                                                            const isCurrentWeekItem = currentWeek?.id === week.id;
                                                                            const isPast = parseLocalDate(week.weekEnd) < new Date();
                                                                            const weekShift1 = week.shift1 || { monday: 5, tuesday: 5, wednesday: 5, thursday: 5 };
                                                                            const weekShift2 = week.shift2 || { friday: 0, saturday: 0, sunday: 0 };
                                                                            const shift1Total = (weekShift1.monday || 0) + (weekShift1.tuesday || 0) + 
                                                                                               (weekShift1.wednesday || 0) + (weekShift1.thursday || 0);
                                                                            const shift2Total = (weekShift2.friday || 0) + (weekShift2.saturday || 0) + (weekShift2.sunday || 0);
                                                                            const weekLineBalance = week.plannedModules || (shift1Total + shift2Total);
                                                                            
                                                                            return (
                                                                                <div 
                                                                                    key={week.id} 
                                                                                    className={`px-8 py-2 flex items-center justify-between ${
                                                                                        isCurrentWeekItem ? 'bg-green-100' : 
                                                                                        isPast ? 'bg-gray-50 opacity-70' : 
                                                                                        'bg-white'
                                                                                    }`}
                                                                                >
                                                                                    <div className="flex items-center gap-3">
                                                                                        <span className="font-mono text-sm text-gray-500 w-12">W{week.weekNumber || '?'}</span>
                                                                                        <span className="text-sm text-gray-800">
                                                                                            {week.weekStart} - {week.weekEnd}
                                                                                        </span>
                                                                                        {isCurrentWeekItem && (
                                                                                            <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">Current</span>
                                                                                        )}
                                                                                        <span className="px-2 py-0.5 bg-autovol-teal text-white text-xs rounded">
                                                                                            {weekLineBalance} modules
                                                                                        </span>
                                                                                        {week.startingModule && (
                                                                                            <span className="text-xs text-gray-500">
                                                                                                Start: <span className="font-mono">{week.startingModule}</span>
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex gap-1">
                                                                                        {onViewWeek && (
                                                                                            <button 
                                                                                                onClick={() => onViewWeek(week.id)} 
                                                                                                className="px-2 py-1 text-xs bg-autovol-teal text-white hover:bg-teal-600 rounded"
                                                                                            >
                                                                                                View
                                                                                            </button>
                                                                                        )}
                                                                                        {canEdit && (
                                                                                            <>
                                                                                                <button 
                                                                                                    onClick={() => handleOpenEdit(week)} 
                                                                                                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                                                                                                >
                                                                                                    Edit
                                                                                                </button>
                                                                                                <button 
                                                                                                    onClick={() => handleDelete(week.id)} 
                                                                                                    className="px-2 py-1 text-xs bg-red-100 text-red-600 hover:bg-red-200 rounded"
                                                                                                >
                                                                                                    Delete
                                                                                                </button>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                            })()}
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
                                    Starting Module (AUTO-C / AUTO-F / AUTO-W)
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
                                    This module will appear at AUTO-C/AUTO-F/AUTO-W. Other stations offset by their stagger.
                                </p>
                            </div>
                            
                            {/* Daily Targets Section - Shift #1 */}
                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-autovol-navy text-white px-3 py-2 flex items-center justify-between">
                                    <span className="font-medium text-sm">Shift #1 (Mon - Thu)</span>
                                    <span className="text-sm bg-white/20 px-2 py-0.5 rounded">
                                        {(formData.shift1?.monday || 0) + (formData.shift1?.tuesday || 0) + 
                                         (formData.shift1?.wednesday || 0) + (formData.shift1?.thursday || 0)} modules
                                    </span>
                                </div>
                                <div className="p-3 grid grid-cols-4 gap-2">
                                    {['monday', 'tuesday', 'wednesday', 'thursday'].map(day => (
                                        <div key={day} className="text-center">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="20"
                                                value={formData.shift1?.[day] || 0}
                                                onChange={(e) => updateFormDailyTarget('shift1', day, e.target.value)}
                                                className="w-full border rounded px-2 py-1 text-center font-mono text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Daily Targets Section - Shift #2 */}
                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-gray-600 text-white px-3 py-2 flex items-center justify-between">
                                    <span className="font-medium text-sm">Shift #2 (Fri - Sun)</span>
                                    <span className="text-sm bg-white/20 px-2 py-0.5 rounded">
                                        {(formData.shift2?.friday || 0) + (formData.shift2?.saturday || 0) + 
                                         (formData.shift2?.sunday || 0)} modules
                                    </span>
                                </div>
                                <div className="p-3 grid grid-cols-3 gap-2">
                                    {['friday', 'saturday', 'sunday'].map(day => (
                                        <div key={day} className="text-center">
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="20"
                                                value={formData.shift2?.[day] || 0}
                                                onChange={(e) => updateFormDailyTarget('shift2', day, e.target.value)}
                                                className="w-full border rounded px-2 py-1 text-center font-mono text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Total Line Balance */}
                            <div className="bg-autovol-teal/10 border border-autovol-teal rounded-lg p-3 flex items-center justify-between">
                                <span className="font-medium text-autovol-navy">Total Line Balance</span>
                                <span className="text-xl font-bold text-autovol-teal">{getFormLineBalance()} modules/week</span>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                                <textarea 
                                    value={formData.notes} 
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} 
                                    className="w-full border rounded-lg px-3 py-2 h-16"
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
            
            {/* ===== SCHEDULED PROJECTS SECTION ===== */}
            <ScheduledProjectsSection 
                projects={projects}
                setProjects={setProjects}
                canEdit={canEdit}
            />
            
            {/* ===== PROTOTYPE SCHEDULING SECTION ===== */}
            <PrototypeSchedulingSection 
                allModules={allModules}
                sortedModules={sortedModules}
                projects={projects}
                setProjects={setProjects}
                onPlaceOnBoard={handlePlaceOnBoard}
            />
            
            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                <strong>Note:</strong> Days with '0' modules assigned will not display on the Weekly Board.
                Configure daily targets when adding or editing a production week above.
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
    onLogQAInspection = null, // Callback for QA inspection (module, station) => void
    initialSelectedWeekId = null, // Initial week to display (from Schedule Setup navigation)
    onWeekSelected = null, // Callback when week is selected (to clear initialSelectedWeekId)
    onEditWeek = null, // Callback to edit a week in Schedule Setup: (weekId) => void
    isPopout = false, // Whether this is rendered in a pop-out window
    // Prototype placement props
    prototypePlacementMode = null, // { prototype: module } when placing a prototype
    onCancelPlacement = null, // Callback to cancel placement mode
    onPlacePrototype = null // Callback when prototype is placed: (prototype, afterModule) => void
}) {
    const { useState, useRef, useEffect, useCallback, useMemo } = React;
    
    // Mobile detection
    const isMobile = window.useIsMobile ? window.useIsMobile(768) : false;
    
    // Check if a feature should be hidden on mobile
    const isFeatureHiddenOnMobile = (featureId) => {
        return isMobile && window.MODA_MOBILE_CONFIG?.isFeatureHidden('production', featureId);
    };
    
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [activePrompt, setActivePrompt] = useState(null); // { module, station, position }
    
    // ===== WEEK SELECTOR =====
    // selectedWeekId: null means "use currentWeek (auto)", otherwise use specific week
    // For popout: read initial week from localStorage if available
    const getInitialWeekId = () => {
        if (initialSelectedWeekId) return initialSelectedWeekId;
        if (isPopout) {
            try {
                const saved = localStorage.getItem('autovol_selected_week_id');
                if (saved && saved !== 'null') {
                    console.log('[WeeklyBoard] Popout reading selected week from localStorage:', saved);
                    return saved;
                }
            } catch (e) {}
        }
        return null;
    };
    const [selectedWeekId, setSelectedWeekId] = useState(getInitialWeekId);
    const [showWeekPicker, setShowWeekPicker] = useState(false);
    
    // Handle initialSelectedWeekId from Schedule Setup navigation
    useEffect(() => {
        if (initialSelectedWeekId) {
            setSelectedWeekId(initialSelectedWeekId);
            // Clear the initial selection after applying it
            if (onWeekSelected) onWeekSelected();
        }
    }, [initialSelectedWeekId, onWeekSelected]);
    
    // Save selected week to localStorage when it changes (for popout sync)
    useEffect(() => {
        if (!isPopout) {
            try {
                localStorage.setItem('autovol_selected_week_id', selectedWeekId || '');
                console.log('[WeeklyBoard] Saved selected week to localStorage:', selectedWeekId);
            } catch (e) {}
        }
    }, [selectedWeekId, isPopout]);
    
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
    const [showSequenceHistory, setShowSequenceHistory] = useState(null); // { projectId, projectName, modules }
    
    // ===== REORDER MODE (Drag-and-Drop) =====
    const [reorderMode, setReorderMode] = useState(false);
    const [pendingReorders, setPendingReorders] = useState([]); // Array of { moduleId, fromSeq, toSeq }
    const [draggedModule, setDraggedModule] = useState(null);
    const [dragOverTarget, setDragOverTarget] = useState(null); // { moduleId, position: 'before' | 'after' }
    const [showReorderConfirm, setShowReorderConfirm] = useState(false);
    
    // ===== PROTOTYPE PLACEMENT MODE =====
    const [placementTarget, setPlacementTarget] = useState(null); // { moduleId, position: 'before' | 'after' }
    const [localPlacementMode, setLocalPlacementMode] = useState(null); // Prototype module being placed (from localStorage)
    
    // Check localStorage for prototype placement on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('moda_prototype_placement');
            if (saved) {
                const prototype = JSON.parse(saved);
                setLocalPlacementMode(prototype);
                // Clear localStorage after reading
                localStorage.removeItem('moda_prototype_placement');
                console.log('[WeeklyBoard] Entering placement mode for prototype:', prototype.serialNumber);
            }
        } catch (e) {
            console.error('[WeeklyBoard] Error reading prototype placement from localStorage:', e);
        }
    }, []);
    
    // Use either prop-based or localStorage-based placement mode
    const activePlacementMode = prototypePlacementMode || localPlacementMode;
    
    // Cancel placement mode handler
    const handleCancelPlacement = useCallback(() => {
        setLocalPlacementMode(null);
        setPlacementTarget(null);
        if (onCancelPlacement) onCancelPlacement();
    }, [onCancelPlacement]);
    
    // Handle prototype placement - insert after target module
    const handlePlacePrototypeLocal = useCallback((prototype, afterModule, position) => {
        console.log('[WeeklyBoard] handlePlacePrototypeLocal called:', {
            prototype: prototype.serialNumber,
            afterModule: afterModule.serialNumber,
            position,
            hasSetProjects: !!setProjects
        });
        if (!setProjects || !prototype) return;
        
        // Calculate the new decimal build sequence
        const afterSeq = afterModule.buildSequence || 0;
        const baseSeq = position === 'before' ? Math.floor(afterSeq) - 1 : Math.floor(afterSeq);
        
        // Find existing decimals in this range to avoid conflicts
        const allModules = (projects || []).flatMap(p => p.modules || []);
        const existingDecimals = allModules
            .filter(m => m.buildSequence > baseSeq && m.buildSequence < baseSeq + 1)
            .map(m => m.buildSequence);
        
        let newBuildSeq;
        if (position === 'before') {
            // Insert before: use afterSeq - 0.1 or find available slot
            newBuildSeq = existingDecimals.length === 0 
                ? afterSeq - 0.1 
                : Math.min(...existingDecimals) - 0.1;
        } else {
            // Insert after: use afterSeq + 0.1 or next available
            newBuildSeq = existingDecimals.length === 0 
                ? afterSeq + 0.1 
                : Math.max(...existingDecimals) + 0.1;
        }
        newBuildSeq = Math.round(newBuildSeq * 100) / 100; // Round to 2 decimals
        
        // Update the prototype module with new build sequence
        console.log('[WeeklyBoard] Updating prototype with:', { newBuildSeq, insertedAfter: afterModule.serialNumber, prototypeProjectId: prototype.projectId });
        setProjects(prev => {
            const targetProject = prev.find(p => p.id === prototype.projectId);
            console.log('[WeeklyBoard] Found target project:', targetProject?.name, 'with', targetProject?.modules?.length, 'modules');
            
            const updated = prev.map(project => {
                if (project.id !== prototype.projectId) return project;
                return {
                    ...project,
                    modules: (project.modules || []).map(m => {
                        if (m.id !== prototype.id) return m;
                        const originalSeq = m.originalBuildSequence || m.buildSequence;
                        console.log('[WeeklyBoard] Updating module:', m.serialNumber, 'insertedAfter:', afterModule.serialNumber);
                        return { 
                            ...m, 
                            buildSequence: newBuildSeq, 
                            insertedAfter: afterModule.serialNumber,
                            originalBuildSequence: originalSeq
                        };
                    })
                };
            });
            return updated;
        });
        
        // Exit placement mode
        setLocalPlacementMode(null);
        setPlacementTarget(null);
        addToast(`Prototype ${prototype.serialNumber} placed after ${afterModule.serialNumber} (Seq: ${newBuildSeq})`, 'success');
    }, [projects, setProjects, addToast]);
    
    // ===== PDF EXPORT =====
    const [showPDFExport, setShowPDFExport] = useState(false);
    const [pdfExportScope, setPdfExportScope] = useState('current'); // 'current', 'all', 'with-prev', 'with-next'
    
    // ===== BOARD VIEW MODE =====
    // 'compact' = serial number only (original), 'detailed' = full module info like Modules On-Board panel
    const [boardViewMode, setBoardViewMode] = useState('compact');
    
    // ===== SELECTION SYSTEM =====
    const [selectedModules, setSelectedModules] = useState(new Set()); // Set of "moduleId-stationId" keys
    const [showBulkMenu, setShowBulkMenu] = useState(null); // { x, y } position for context menu
    const [focusedCell, setFocusedCell] = useState(null); // { moduleId, stationId, rowIndex, colIndex } for keyboard nav
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
        setFocusedCell(null);
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
    
    // Debug: Log active projects
    console.log('[WeeklyBoard] Active projects:', activeProjects.map(p => ({ 
        name: p.name, 
        status: p.status, 
        productionOrder: p.productionOrder, 
        moduleCount: p.modules?.length 
    })));
    
    // Get line balance for current display
    // Use the displayed week's plannedModules if available, otherwise fall back to global getLineBalance()
    const lineBalance = displayWeek?.plannedModules || getLineBalance();
    
    // Get all modules from all active projects, sorted by productionOrder then buildSequence
    // Filter out modules with excludeFromSchedule flag
    // IMPORTANT: Projects are kept grouped together - buildSequence is project-specific, not global
    // EXCEPTION: Scheduled prototypes (with insertedAfter) are sorted by their decimal buildSequence globally
    const allModules = (() => {
        // Get regular modules from active projects only
        const rawModules = activeProjects
            .sort((a, b) => (a.productionOrder || 999) - (b.productionOrder || 999))
            .flatMap(p => 
                (p.modules || [])
                    .filter(m => !m.excludeFromSchedule)
                    .map(m => ({ ...m, projectId: p.id, projectName: p.name, projectAbbreviation: p.abbreviation, projectProductionOrder: p.productionOrder || 999 }))
            );
        
        // Get scheduled prototypes from ALL projects (not just active)
        // This allows prototypes from non-active projects to appear on the board
        const allScheduledPrototypes = (projects || [])
            .flatMap(p => 
                (p.modules || [])
                    .filter(m => m.isPrototype && m.insertedAfter)
                    .map(m => ({ ...m, projectId: p.id, projectName: p.name, projectAbbreviation: p.abbreviation, projectProductionOrder: p.productionOrder || 999 }))
            );
        
        console.log('[WeeklyBoard] Found scheduled prototypes from all projects:', allScheduledPrototypes.map(p => `${p.serialNumber} after ${p.insertedAfter}`));
        
        // Regular modules exclude prototypes with insertedAfter (they'll be added separately)
        const regularModules = rawModules.filter(m => !(m.isPrototype && m.insertedAfter));
        const scheduledPrototypes = allScheduledPrototypes;
        
        // Sort regular modules by project grouping
        const sortedRegular = regularModules.sort((a, b) => {
            // First sort by project production order
            if (a.projectProductionOrder !== b.projectProductionOrder) {
                return a.projectProductionOrder - b.projectProductionOrder;
            }
            // If same production order, keep projects grouped by projectId
            if (a.projectId !== b.projectId) {
                return a.projectId.localeCompare(b.projectId);
            }
            // Then by build sequence within project
            return (a.buildSequence || 0) - (b.buildSequence || 0);
        });
        
        // Insert scheduled prototypes at their correct positions
        // Use the insertedAfter field to find the target module, then insert right after it
        const result = [...sortedRegular];
        
        // Sort prototypes by their buildSequence to insert them in order
        const sortedPrototypes = [...scheduledPrototypes].sort((a, b) => 
            (a.buildSequence || 0) - (b.buildSequence || 0)
        );
        
        sortedPrototypes.forEach(proto => {
            // Find the module this prototype was inserted after using serialNumber
            let insertIdx = -1;
            
            if (proto.insertedAfter) {
                // Find the target module by serial number
                const targetIdx = result.findIndex(m => m.serialNumber === proto.insertedAfter);
                if (targetIdx !== -1) {
                    // Insert right after the target module
                    insertIdx = targetIdx + 1;
                }
            }
            
            // Fallback: if insertedAfter not found, try to find position by buildSequence
            if (insertIdx === -1) {
                insertIdx = result.findIndex(m => 
                    (m.buildSequence || 0) > proto.buildSequence
                );
                if (insertIdx === -1) insertIdx = result.length;
            }
            
            result.splice(insertIdx, 0, proto);
        });
        
        return result;
    })();
    
    // Debug: Log module count and scheduled prototypes
    const scheduledProtos = allModules.filter(m => m.isPrototype && m.insertedAfter);
    console.log('[WeeklyBoard] allModules count:', allModules.length, 
                'scheduledPrototypes:', scheduledProtos.map(p => `${p.serialNumber} after ${p.insertedAfter}`));
    
    // Auto-calculate starting module index for the current week
    // Based on cumulative line balance from all previous weeks
    const getAutoCalculatedStartingIndex = useMemo(() => {
        if (!displayWeek || !weeks || weeks.length === 0) return 0;
        
        // Sort weeks by date
        const sortedWeeks = [...weeks].sort((a, b) => parseLocalDate(a.weekStart) - parseLocalDate(b.weekStart));
        
        // Find index of current display week
        const currentWeekIdx = sortedWeeks.findIndex(w => w.id === displayWeek.id);
        if (currentWeekIdx === -1) return 0;
        
        // Sum up line balance from all previous weeks
        let cumulativeModules = 0;
        for (let i = 0; i < currentWeekIdx; i++) {
            const week = sortedWeeks[i];
            const weekBalance = (week.shift1?.monday || 0) + (week.shift1?.tuesday || 0) + 
                               (week.shift1?.wednesday || 0) + (week.shift1?.thursday || 0) +
                               (week.shift2?.friday || 0) + (week.shift2?.saturday || 0) + (week.shift2?.sunday || 0);
            cumulativeModules += weekBalance || week.line_balance || 0;
        }
        
        return cumulativeModules;
    }, [displayWeek, weeks]);
    
    // Get the auto-calculated starting module for the current week
    const autoStartingModule = allModules[getAutoCalculatedStartingIndex] || null;
    
    // Check if we have modules to display
    const hasWeekConfig = displayWeek && allModules.length > 0;
    
    // Get starting module for a station based on stagger
    // Stagger is subtracted because downstream stations work on earlier modules
    // (modules that have already passed through upstream stations)
    const getStationStartingModule = (stationId) => {
        // Use auto-calculated starting module if no manual override
        const weekStartingModule = displayWeek?.startingModule 
            ? allModules.find(m => m.serialNumber === displayWeek.startingModule)
            : autoStartingModule;
            
        if (!weekStartingModule) return null;
        
        const stagger = staggerConfig?.[stationId] || 0;
        const startIdx = allModules.findIndex(m => m.id === weekStartingModule.id);
        
        if (startIdx === -1) return null;
        
        // Apply stagger - downstream stations work on modules earlier in the sequence
        // A stagger of 5 means this station shows modules 5 positions behind Automation
        // (they've already passed through upstream stations)
        const staggeredIdx = Math.max(0, startIdx - stagger);
        return allModules[staggeredIdx] || null;
    };
    
    // Get modules for a station column based on stagger and line balance
    // Now includes previous week (5 before) and next week preview (5 after)
    const getModulesForStation = (station) => {
        const startingModule = getStationStartingModule(station.id);
        if (!startingModule) return { previous: [], current: [], next: [] };
        
        // Use the displayed week's plannedModules if available
        const weekLineBalance = displayWeek?.plannedModules || getLineBalance();
        
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
        
        // Current week: line balance modules (use weekLineBalance from displayed week)
        const currentModules = allModules.slice(startIdx, startIdx + weekLineBalance);
        
        // Next week preview: 5 modules after current week (or fewer if at end)
        const nextStartIdx = startIdx + weekLineBalance;
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
        const weekStart = parseLocalDate(displayWeek.weekStart);
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
    // Now requires explicit confirmation before renumbering sequences
    const applyModuleMove = async (module, newPosition, applyToAll = true, skipHistory = false) => {
        if (!setProjects) return;
        
        const oldPosition = module.buildSequence || 0;
        const project = projects.find(p => p.id === module.projectId);
        
        // Save snapshot BEFORE making changes (unless skipping)
        if (!skipHistory && project && window.MODA_SEQUENCE_HISTORY?.saveSnapshot) {
            await window.MODA_SEQUENCE_HISTORY.saveSnapshot(
                project.id,
                project.modules || [],
                'reorder',
                `Moved ${module.serialNumber} from #${oldPosition} to #${newPosition}`,
                auth?.currentUser
            );
        }
        
        // Update the module's build sequence
        setProjects(prevProjects => prevProjects.map(proj => {
            if (proj.id !== module.projectId) return proj;
            
            // Get all modules sorted by current sequence
            const modules = [...(proj.modules || [])];
            const moduleIndex = modules.findIndex(m => m.id === module.id);
            if (moduleIndex === -1) return proj;
            
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
            
            return { ...proj, modules };
        }));
        
        // Show success toast
        addToast(
            `${module.serialNumber} moved from #${oldPosition} to #${newPosition}`,
            'success',
            module.serialNumber,
            applyToAll ? 'Sequences renumbered' : 'Position updated'
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
    // Now saves sequence history before applying changes
    const applyPendingReorders = async (applyToAll = true) => {
        if (!setProjects || pendingReorders.length === 0) return;
        
        // Find affected projects and save snapshots BEFORE changes
        const affectedProjectIds = new Set();
        pendingReorders.forEach(r => {
            const project = projects.find(p => p.modules?.some(m => m.id === r.moduleId));
            if (project) affectedProjectIds.add(project.id);
        });
        
        // Save snapshots for each affected project
        if (window.MODA_SEQUENCE_HISTORY?.saveSnapshot) {
            for (const projectId of affectedProjectIds) {
                const project = projects.find(p => p.id === projectId);
                if (project) {
                    const reorderDescriptions = pendingReorders
                        .filter(r => project.modules?.some(m => m.id === r.moduleId))
                        .map(r => `${r.moduleSerial}: #${r.fromSeq} → #${Math.floor(r.toSeq)}`)
                        .join(', ');
                    
                    await window.MODA_SEQUENCE_HISTORY.saveSnapshot(
                        project.id,
                        project.modules || [],
                        'reorder',
                        `Reordered ${pendingReorders.length} module(s): ${reorderDescriptions}`,
                        auth?.currentUser
                    );
                }
            }
        }
        
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
            applyToAll ? 'Sequences renumbered (history saved)' : 'Positions updated'
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
    
    // Handle shop drawing click - opens current version of shop drawing package
    // First tries the new Drawings Module system, then falls back to legacy shopDrawingLinks
    const handleShopDrawing = async (module) => {
        // Find the project this module belongs to
        const project = projects.find(p => p.id === module.projectId);
        if (!project) {
            alert('Error: Could not find project for this module.');
            return;
        }
        
        // First, try the new Drawings Module system with direct file open
        if (window.MODA_SUPABASE_DRAWINGS?.isAvailable?.()) {
            try {
                // Search for drawings in Module Packages folder by BLM
                const blmToCheck = [module.hitchBLM, module.rearBLM].filter(Boolean);
                
                // Get drawings for this project in Module Packages discipline
                const drawings = await window.MODA_SUPABASE_DRAWINGS.drawings.getByProjectAndDiscipline(
                    project.id, 
                    'shop-module-packages'
                );
                
                // Find drawing that matches this module's BLM
                // Handles partial matches (L4M08 matches B1L4M08) and multi-BLM filenames
                let matchedDrawing = null;
                for (const blm of blmToCheck) {
                    const normalizedBLM = blm.toUpperCase().replace(/[_\-\s]/g, '');
                    // Extract just the level-module part (e.g., L4M08 from B1L4M08)
                    const levelModulePart = normalizedBLM.match(/L\d+M\d+/)?.[0] || normalizedBLM;
                    
                    matchedDrawing = drawings.find(d => {
                        const fileName = d.name.toUpperCase().replace(/[_\-\s]/g, '');
                        // Check if filename contains the BLM (full or partial match)
                        return fileName.includes(normalizedBLM) || fileName.includes(levelModulePart);
                    });
                    if (matchedDrawing) break;
                }
                
                if (matchedDrawing && matchedDrawing.versions?.length > 0) {
                    // Get latest version
                    const latestVersion = [...matchedDrawing.versions].sort((a, b) => 
                        new Date(b.uploaded_at || b.uploadedAt) - new Date(a.uploaded_at || a.uploadedAt)
                    )[0];
                    
                    // Get view URL with cache-busting
                    const storagePath = latestVersion.storage_path || latestVersion.storagePath;
                    const sharePointFileId = latestVersion.sharepoint_file_id || latestVersion.sharepointFileId;
                    
                    let url = await window.MODA_SUPABASE_DRAWINGS.versions.getViewUrl(storagePath, sharePointFileId);
                    if (url) {
                        // Add cache-busting timestamp to ensure current version loads
                        const cacheBuster = `_cb=${Date.now()}`;
                        url = url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                        return;
                    }
                }
            } catch (error) {
                console.error('[WeeklyBoard] Error fetching shop drawing:', error);
            }
        }
        
        // Fallback to legacy shopDrawingLinks system
        const shopDrawingLinks = project.shopDrawingLinks || {};
        const blmToCheck = [module.hitchBLM, module.rearBLM].filter(Boolean);
        let foundUrl = null;
        
        for (const blm of blmToCheck) {
            if (shopDrawingLinks[blm]) {
                foundUrl = shopDrawingLinks[blm];
                break;
            }
        }
        
        if (foundUrl) {
            // Add cache-busting and open in new tab
            const cacheBuster = `_cb=${Date.now()}`;
            foundUrl = foundUrl.includes('?') ? `${foundUrl}&${cacheBuster}` : `${foundUrl}?${cacheBuster}`;
            window.open(foundUrl, '_blank', 'noopener,noreferrer');
        } else {
            // Show not found message with instructions
            const blmList = blmToCheck.length > 0 ? blmToCheck.join(', ') : 'No BLM';
            alert(`Shop Drawing Not Found\n\nNo shop drawing found for module ${module.serialNumber} (BLM: ${blmList}).\n\nTo add shop drawings:\n1. Go to Drawings → Shop Drawings → Module Packages\n2. Upload a PDF with the BLM in the filename (e.g., "${blmToCheck[0] || 'B1L2M01'} - Shops.pdf")\n\nOr use legacy links: Projects → Edit Project → Shop Drawing Links.`);
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
            // Use displayWeek's shift config when viewing a specific week, fallback to scheduleSetup
            const count = displayWeek?.shift1?.[day] ?? scheduleSetup?.shift1?.[day] ?? 0;
            if (count > 0) {
                const weekStart = displayWeek?.weekStart ? parseLocalDate(displayWeek.weekStart) : new Date();
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
        <div class="header-right">Week of ${displayWeek?.weekStart ? parseLocalDate(displayWeek.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : dateStr}</div>
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
        const weekDateStr = displayWeek?.weekStart ? parseLocalDate(displayWeek.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : dateStr;
        
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
    
    // Build navigation grid for keyboard navigation
    // Each cell contains the actual module at that station's row position
    const navigationGrid = useMemo(() => {
        if (!productionStages?.length) return { rows: [], stationCount: 0 };
        
        // Get row count from first station
        const firstStation = productionStages[0];
        const { previous = [], current = [], next = [] } = getModulesForStation(firstStation);
        const rowCount = previous.length + current.length + next.length;
        
        // Build grid where each cell has the actual module at that position for that station
        const grid = [];
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            const row = {
                rowIndex,
                cells: productionStages.map((station, colIndex) => {
                    const stationData = getModulesForStation(station);
                    const allModules = [...(stationData.previous || []), ...(stationData.current || []), ...(stationData.next || [])];
                    const module = allModules[rowIndex];
                    return {
                        stationId: station.id,
                        colIndex,
                        moduleId: module?.id || null,
                        projectId: module?.projectId || null
                    };
                })
            };
            grid.push(row);
        }
        
        return { rows: grid, stationCount: productionStages.length };
    }, [productionStages, getModulesForStation]);
    
    // Handle keyboard navigation and shortcuts
    const handleBoardKeyDown = useCallback((e) => {
        if (!boardRef.current) return;
        const scrollContainer = boardRef.current.querySelector('.board-scroll-container');
        if (!scrollContainer) return;
        
        const { rows, stationCount } = navigationGrid;
        if (!rows.length || !stationCount) return;
        
        // Progress shortcuts: 0-4 keys when a cell is focused (single selection only)
        if (focusedCell && selectedModules.size === 1 && canEdit) {
            const progressMap = { '0': 0, '1': 25, '2': 50, '3': 75, '4': 100 };
            if (progressMap[e.key] !== undefined) {
                e.preventDefault();
                // Get the cell data which now contains moduleId and projectId
                const focusedRow = rows[focusedCell.rowIndex];
                if (focusedRow) {
                    const cell = focusedRow.cells[focusedCell.colIndex];
                    if (cell && cell.moduleId) {
                        updateModuleProgress(cell.moduleId, cell.projectId, cell.stationId, progressMap[e.key]);
                    }
                }
                return;
            }
        }
        
        // Arrow key navigation when a cell is focused
        if (focusedCell && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            
            let newRowIndex = focusedCell.rowIndex;
            let newColIndex = focusedCell.colIndex;
            
            switch (e.key) {
                case 'ArrowUp':
                    newRowIndex = Math.max(0, focusedCell.rowIndex - 1);
                    break;
                case 'ArrowDown':
                    newRowIndex = Math.min(rows.length - 1, focusedCell.rowIndex + 1);
                    break;
                case 'ArrowLeft':
                    newColIndex = Math.max(0, focusedCell.colIndex - 1);
                    break;
                case 'ArrowRight':
                    newColIndex = Math.min(stationCount - 1, focusedCell.colIndex + 1);
                    break;
            }
            
            // Get the new cell's module and station
            const newRow = rows[newRowIndex];
            if (newRow) {
                const newCell = newRow.cells[newColIndex];
                if (newCell && newCell.moduleId) {
                    const newFocusedCell = {
                        moduleId: newCell.moduleId,
                        stationId: newCell.stationId,
                        rowIndex: newRowIndex,
                        colIndex: newColIndex
                    };
                    
                    setFocusedCell(newFocusedCell);
                    
                    // Update selection to the new cell (single selection mode for keyboard nav)
                    if (!e.ctrlKey && !e.metaKey) {
                        setSelectedModules(new Set([getSelectionKey(newCell.moduleId, newCell.stationId)]));
                    }
                    
                    // Scroll the cell into view
                    const cellElement = document.querySelector(
                        `[data-cell-key="${getSelectionKey(newCell.moduleId, newCell.stationId)}"]`
                    );
                    if (cellElement) {
                        cellElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
                    }
                }
            }
            return;
        }
        
        // Default scroll behavior when no cell is focused
        if (!focusedCell) {
            const scrollAmount = 200;
            if (e.key === 'ArrowLeft') {
                scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                e.preventDefault();
            }
        }
    }, [navigationGrid, focusedCell, selectedModules.size, canEdit, productionStages, getModulesForStation, updateModuleProgress, getSelectionKey]);
    
    // Card height for alignment between date markers and module cards
    // Compact = 58px (serial only), Detailed = 120px (full info with BLM, unit type, room type, difficulty dots)
    const CARD_HEIGHT = boardViewMode === 'detailed' ? 140 : 70;
    const COLUMN_WIDTH = 180; // Width of each station column (increased for more visibility)
    const DATE_MARKER_WIDTH = 100; // Width of date marker column (increased for better readability)

// Get project abbreviation - use stored abbreviation if available, otherwise auto-generate
const getProjectAcronym = (module) => {
    // First check if module has projectAbbreviation from the project
    if (module.projectAbbreviation) return module.projectAbbreviation;
        const projectName = module.projectName;
        if (!projectName) return '';
        const words = projectName.trim().split(/\s+/);
        if (words.length === 1) {
            // Single word: take first 2-3 letters
            return words[0].substring(0, 3).toUpperCase();
        }
        // Multiple words: take first letter of each word (max 3)
        return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
    };
    
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
                    data-cell-key={getSelectionKey(module.id, station.id)}
                    className="rounded p-1.5 bg-gray-50 border border-gray-200 opacity-50 hover:opacity-100 transition cursor-pointer"
                    style={{ height: `${CARD_HEIGHT}px` }}
                    onClick={() => updateModuleProgress(module.id, module.projectId, station.id, 25)}
                    title="Click to start"
                >
                    <div className="font-mono text-xs font-bold text-gray-500 truncate flex items-center gap-1">
                        {module.serialNumber}
                        {module.projectName && (
                            <span className="text-[9px] px-1 py-0.5 bg-gray-200 text-gray-600 rounded" title={module.projectName}>
                                {getProjectAcronym(module)}
                            </span>
                        )}
                        {module.isPrototype && <span className="text-yellow-500 ml-1" title="Prototype">★</span>}
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
        const isPlacementTarget = activePlacementMode && placementTarget?.moduleId === module.id;
        
        // Determine indicator class: green for placement mode, blue for reorder mode
        let dropIndicatorClass = '';
        if (isPlacementTarget) {
            dropIndicatorClass = placementTarget.position === 'before' 
                ? 'border-t-4 border-t-green-500' 
                : 'border-b-4 border-b-green-500';
        } else if (isDragTarget) {
            dropIndicatorClass = dragOverTarget.position === 'before' 
                ? 'border-t-4 border-t-blue-500' 
                : 'border-b-4 border-b-blue-500';
        }
        
        // Find col index for this cell (for keyboard navigation)
        const colIndex = productionStages.findIndex(s => s.id === station.id);
        const isFocused = focusedCell?.moduleId === module.id && focusedCell?.stationId === station.id;
        
        return (
            <div
                key={`${station.id}-${module.id}`}
                data-module-serial={module.serialNumber}
                data-cell-key={getSelectionKey(module.id, station.id)}
                className={`rounded p-1.5 transition-all hover:shadow-md ${bgClass} ${borderClass} ${dropIndicatorClass} ${
                    reorderMode ? 'cursor-grab active:cursor-grabbing' : ''
                } ${activePlacementMode ? 'cursor-pointer hover:ring-2 hover:ring-green-400' : ''
                } ${pendingReorder ? 'ring-2 ring-blue-400 ring-offset-1' : ''} ${
                    isFocused ? 'ring-2 ring-blue-600 ring-offset-1' : ''
                }`}
                style={{ height: `${CARD_HEIGHT}px` }}
                draggable={reorderMode && !activePlacementMode}
                onDragStart={(e) => handleDragStart(e, module)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, module)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, module)}
                onMouseMove={(e) => {
                    if (!activePlacementMode) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    const position = e.clientY < midY ? 'before' : 'after';
                    if (placementTarget?.moduleId !== module.id || placementTarget?.position !== position) {
                        setPlacementTarget({ moduleId: module.id, position });
                    }
                }}
                onMouseLeave={() => {
                    if (activePlacementMode && placementTarget?.moduleId === module.id) {
                        setPlacementTarget(null);
                    }
                }}
                onClick={(e) => {
                    if (activePlacementMode) {
                        e.stopPropagation();
                        handlePlacePrototypeLocal(activePlacementMode, module, placementTarget?.position || 'after');
                    }
                }}
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
                            // Set focused cell for keyboard navigation (compute rowIndex from all modules)
                            if (!e.ctrlKey && !e.metaKey) {
                                const firstStation = productionStages[0];
                                if (firstStation) {
                                    const { previous = [], current = [], next = [] } = getModulesForStation(firstStation);
                                    const allModules = [...previous, ...current, ...next];
                                    const rowIndex = allModules.findIndex(m => m.id === module.id);
                                    setFocusedCell({ moduleId: module.id, stationId: station.id, rowIndex, colIndex });
                                }
                            }
                        }}
                        title="Click to select, Ctrl+Click for multi-select. Use arrow keys to navigate, 0-4 for progress."
                    >
                        {moduleIsSelected && <span className="text-blue-500 mr-1">✓</span>}
                        {module.serialNumber}
                        {module.projectName && (
                            <span className="text-[9px] px-1 py-0.5 bg-blue-100 text-blue-700 rounded ml-1" title={module.projectName}>
                                {getProjectAcronym(module)}
                            </span>
                        )}
                        {module.isPrototype && <span className="text-yellow-500 ml-1" title="Prototype">★</span>}
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
            // Use displayWeek's shift config when viewing a specific week, fallback to scheduleSetup
            const count = displayWeek?.shift1?.[day] ?? scheduleSetup?.shift1?.[day] ?? 0;
            if (count > 0) {
                // Calculate date for this day
                const weekStart = displayWeek?.weekStart ? parseLocalDate(displayWeek.weekStart) : new Date();
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
                            Tip: The starting module determines which modules appear at AUTO-C/AUTO-F/AUTO-W.
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
    
    // Helper function to navigate weeks
    const navigateWeek = (direction) => {
        const sortedWeeks = [...weeks].sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
        const currentIndex = sortedWeeks.findIndex(w => w.id === (selectedWeekId || currentWeek?.id));
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < sortedWeeks.length) {
            setSelectedWeekId(sortedWeeks[newIndex].id);
        }
    };
    
    // Pop-out mode: Show only the grid with week navigation
    if (isPopout) {
        return (
            <div className="h-full flex flex-col p-4 bg-gray-50">
                {/* Minimal Header with Week Navigation */}
                <div className="flex items-center justify-between mb-3 px-2">
                    <button
                        onClick={() => navigateWeek(-1)}
                        className="p-2 bg-white hover:bg-gray-100 rounded-lg border shadow-sm transition"
                        title="Previous Week"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                    </button>
                    
                    <div className="text-center">
                        <div className="text-sm font-semibold text-autovol-navy">
                            {displayWeek ? (
                                <>
                                    {parseLocalDate(displayWeek.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    {' - '}
                                    {parseLocalDate(displayWeek.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </>
                            ) : 'No Week Selected'}
                        </div>
                        {currentWeek?.id === displayWeek?.id && (
                            <span className="text-xs text-green-600 font-medium">Current Week</span>
                        )}
                    </div>
                    
                    <button
                        onClick={() => navigateWeek(1)}
                        className="p-2 bg-white hover:bg-gray-100 rounded-lg border shadow-sm transition"
                        title="Next Week"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </button>
                </div>
                
                {/* Main Board Area with Modules Panel */}
                <div className="flex gap-1 flex-1 min-h-0">
                    {/* Modules On-Board Panel (Left Sidebar) */}
                    <div className="w-[140px] flex-shrink-0">
                        <div className="bg-white border rounded-lg shadow-sm h-full flex flex-col">
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
                            <div className="overflow-y-auto p-2 space-y-2 flex-1">
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
                                                const moduleCard = document.querySelector(`[data-module-serial="${module.serialNumber}"]`);
                                                if (moduleCard) {
                                                    moduleCard.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                                                    moduleCard.classList.add('ring-2', 'ring-blue-500');
                                                    setTimeout(() => moduleCard.classList.remove('ring-2', 'ring-blue-500'), 2000);
                                                }
                                            }}
                                            title="Click to highlight on board"
                                        >
                                            <div className="bg-gray-100 px-2 py-1 font-mono font-bold text-center border-b">
                                                {module.serialNumber?.slice(-7) || 'N/A'}
                                            </div>
                                            <div className="grid grid-cols-2 divide-x text-center">
                                                <div className="p-1">
                                                    <div className="text-[9px] text-gray-400 font-medium">(H)</div>
                                                    <div className="font-mono text-[10px] font-semibold truncate" title={module.hitchBLM}>
                                                        {module.hitchBLM || '—'}
                                                    </div>
                                                </div>
                                                <div className="p-1">
                                                    <div className="text-[9px] text-gray-400 font-medium">(R)</div>
                                                    <div className="font-mono text-[10px] font-semibold truncate" title={module.rearBLM}>
                                                        {module.rearBLM || '—'}
                                                    </div>
                                                </div>
                                            </div>
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
                    
                    {/* Station Board Grid */}
                    <div 
                        className="flex-1 relative min-h-0"
                        ref={boardRef}
                        tabIndex={0}
                        onKeyDown={handleBoardKeyDown}
                    >
                        <div 
                            className="board-scroll-container overflow-auto h-full scrollbar-visible" 
                            style={{ 
                                scrollbarWidth: 'auto', 
                                scrollbarColor: '#94a3b8 #f1f5f9'
                            }}
                        >
                            <div className="flex gap-1 min-w-max">
                                {renderDateMarkerColumn()}
                                {productionStages.map(station => renderStationColumn(station))}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Status Legend */}
                <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap mt-3 pt-3 border-t bg-white rounded-lg px-4 py-2 shadow-sm">
                    <span className="font-medium">Status:</span>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 border rounded bg-gray-50 border-gray-200"></div>
                        <span>Pending</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 border rounded bg-white border-autovol-teal"></div>
                        <span>In Progress</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 border rounded bg-green-50 border-green-300"></div>
                        <span>Complete</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 border-2 rounded bg-red-50/30 border-red-300"></div>
                        <span>Previous</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 border-2 rounded bg-green-50/30 border-green-300"></div>
                        <span>Next</span>
                    </div>
                    <span className="font-medium ml-2">Capacity:</span>
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-1.5 rounded-full bg-green-400"></div>
                        <span>Under</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-1.5 rounded-full bg-yellow-400"></div>
                        <span>At Limit</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-6 h-1.5 rounded-full bg-red-400"></div>
                        <span>Over</span>
                    </div>
                </div>
                
                {/* Selection Toolbar - hidden on mobile */}
                {selectedModules.size > 0 && !isFeatureHiddenOnMobile('bulkOperations') && (
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
                                X
                            </button>
                        </div>
                        <div className="h-8 w-px bg-gray-300"></div>
                        <button
                            onClick={clearSelection}
                            className="px-3 py-2 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Clear selection (Esc)"
                        >
                            X Clear
                        </button>
                    </div>
                )}
                
                {/* Module Card Prompt */}
                {activePrompt && (
                    <ModuleCardPrompt
                        module={activePrompt.module}
                        station={activePrompt.station}
                        position={activePrompt.position}
                        onClose={() => setActivePrompt(null)}
                        onUpdateProgress={(progress) => {
                            handleProgressUpdate(activePrompt.module, activePrompt.station.id, progress);
                            setActivePrompt(null);
                        }}
                        onViewDetails={() => {
                            onModuleClick?.(activePrompt.module);
                            setActivePrompt(null);
                        }}
                        canEdit={canEdit}
                    />
                )}
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {/* Prototype Placement Mode Banner - hidden on mobile */}
            {activePlacementMode && !isFeatureHiddenOnMobile('prototypePlacement') && (
                <div className="bg-green-50 border-2 border-green-400 rounded-lg px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-yellow-500 text-xl">★</span>
                        <div>
                            <div className="font-semibold text-green-800">Placement Mode: {activePlacementMode.serialNumber}</div>
                            <div className="text-sm text-green-700">Click on a module to insert the prototype after it. The green line shows where it will be placed.</div>
                        </div>
                    </div>
                    <button
                        onClick={handleCancelPlacement}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                    >
                        Cancel
                    </button>
                </div>
            )}
            
            {/* View-Only Banner */}
            {!canEdit && !activePlacementMode && (
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
                    
                    {/* Week Selector with Navigation Arrows */}
                    <div className="relative flex items-center gap-1">
                        {/* Previous Week Arrow - hidden on mobile */}
                        {!isFeatureHiddenOnMobile('weekNavArrows') && (
                            <button
                                onClick={() => navigateWeek(-1)}
                                disabled={(() => {
                                    const sortedWeeks = [...weeks].sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
                                    const currentIndex = sortedWeeks.findIndex(w => w.id === (selectedWeekId || currentWeek?.id));
                                    return currentIndex <= 0;
                                })()}
                                className="p-2 bg-white hover:bg-gray-100 rounded-lg border shadow-sm transition disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Previous Week"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="15 18 9 12 15 6"/>
                                </svg>
                            </button>
                        )}
                        
                        {/* Week Dropdown */}
                        <button
                            onClick={() => setShowWeekPicker(!showWeekPicker)}
                            className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium bg-white hover:bg-gray-50 transition"
                        >
                            <span className="text-gray-400">&#128197;</span>
                            {displayWeek ? (
                                <span>
                                    {parseLocalDate(displayWeek.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    {' - '}
                                    {parseLocalDate(displayWeek.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            ) : (
                                <span>Select Week</span>
                            )}
                            {currentWeek?.id === displayWeek?.id && (
                                <span className="px-1.5 py-0.5 bg-green-500 text-white text-xs rounded">Current</span>
                            )}
                            <span className="text-gray-400">&#9662;</span>
                        </button>
                        
                        {/* Next Week Arrow - hidden on mobile */}
                        {!isFeatureHiddenOnMobile('weekNavArrows') && (
                            <button
                                onClick={() => navigateWeek(1)}
                                disabled={(() => {
                                    const sortedWeeks = [...weeks].sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
                                    const currentIndex = sortedWeeks.findIndex(w => w.id === (selectedWeekId || currentWeek?.id));
                                    return currentIndex >= sortedWeeks.length - 1;
                                })()}
                                className="p-2 bg-white hover:bg-gray-100 rounded-lg border shadow-sm transition disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Next Week"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="9 18 15 12 9 6"/>
                                </svg>
                            </button>
                        )}
                        
                        {showWeekPicker && (
                            <CalendarWeekPicker
                                weeks={weeks}
                                currentWeek={currentWeek}
                                selectedWeekId={selectedWeekId}
                                onSelectWeek={setSelectedWeekId}
                                onClose={() => setShowWeekPicker(false)}
                            />
                        )}
                        
                        {selectedWeekId && selectedWeekId !== currentWeek?.id && (
                            <button
                                onClick={() => setSelectedWeekId(null)}
                                className="text-xs text-blue-600 hover:text-blue-800 underline ml-2"
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
                    
                    {/* Reorder Mode Toggle - only show if canEdit, hidden on mobile */}
                    {canEdit && !reorderMode && !isFeatureHiddenOnMobile('reorderMode') && (
                        <button
                            onClick={() => setReorderMode(true)}
                            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium"
                            title="Enter reorder mode to drag and drop modules"
                        >
                            Reorder
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
                    {/* Edit Week - hidden on mobile */}
                    {canEdit && !isFeatureHiddenOnMobile('editWeekButton') && (
                        <button
                            onClick={() => {
                                if (onEditWeek && displayWeek?.id) {
                                    onEditWeek(displayWeek.id);
                                } else {
                                    setProductionTab?.('schedule-setup');
                                }
                            }}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                            title="Change week configuration"
                        >
                            Edit Week
                        </button>
                    )}
                    <button
                        onClick={() => setShowHistoryModal(true)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
                    >
                        📊 Week History
                    </button>
                    {/* Pop Out - hidden on mobile */}
                    {!isPopout && !isFeatureHiddenOnMobile('popoutWindow') && (
                        <button
                            onClick={() => {
                                const popoutUrl = window.location.origin + '/weekly-board-popout.html';
                                const popoutWindow = window.open(
                                    popoutUrl,
                                    'WeeklyBoardPopout',
                                    'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
                                );
                                if (!popoutWindow) {
                                    addToast('Please allow popups to open the Weekly Board in a new window', 'error');
                                }
                            }}
                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-medium flex items-center gap-1"
                            title="Open Weekly Board in a separate window"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                <polyline points="15 3 21 3 21 9"/>
                                <line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                            Pop Out
                        </button>
                    )}
                    {/* Complete Week - hidden on mobile */}
                    {canEdit && !isFeatureHiddenOnMobile('completeWeekButton') && (
                        <button
                            onClick={() => setShowCompleteModal(true)}
                            className="px-4 py-2 btn-primary rounded-lg text-sm font-medium"
                        >
                            Week Complete
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
            
            {/* Running Low on Modules Warning */}
            {(() => {
                const twoWeeksBalance = lineBalance * 2;
                const currentStartIdx = getAutoCalculatedStartingIndex;
                const remainingModules = allModules.length - currentStartIdx;
                
                if (remainingModules >= twoWeeksBalance || allModules.length === 0) return null;
                
                return (
                    <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">⚠️</div>
                            <div className="flex-1">
                                <div className="font-bold text-orange-800">Running Low on Scheduled Modules</div>
                                <div className="text-sm text-orange-700 mt-1">
                                    Only <strong>{remainingModules}</strong> modules remaining (less than 2 weeks at current line balance of {lineBalance}/week).
                                </div>
                                <div className="text-sm text-orange-600 mt-2">
                                    Consider scheduling the next project online to ensure continuous production.
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
            
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
            <div className="flex gap-1">
                {/* Modules On-Board Panel (Left Sidebar) */}
                <div className="w-[140px] flex-shrink-0 no-print">
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
                        <div className="flex gap-1 min-w-max">
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
                                            This will update the build sequence for this module across the entire production line (AUTO-C through Close-Up).
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
        const idx = allModules.findIndex(m => m.serialNumber === currentWeek.startingModule);
        // If starting module not found, log warning
        if (idx === -1 && currentWeek?.startingModule) {
            console.warn('[WeekCompleteModal] Starting module not found in allModules:', currentWeek.startingModule);
        }
        return idx;
    }, [currentWeek, allModules]);
    
    // Calculate suggested next starting module based on ACTUAL modules produced
    const suggestedNextModule = useMemo(() => {
        // If current starting module not found, suggest the first available module
        if (currentStartIdx === -1) {
            console.log('[WeekCompleteModal] Falling back to first available module');
            return allModules[0] || null;
        }
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
        const currentStart = parseLocalDate(currentWeek.weekStart);
        const nextMonday = new Date(currentStart);
        nextMonday.setDate(currentStart.getDate() + 7);
        const nextSunday = new Date(nextMonday);
        nextSunday.setDate(nextMonday.getDate() + 6);
        return {
            start: formatLocalDate(nextMonday),
            end: formatLocalDate(nextSunday)
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
// Wrapped with React.memo to prevent unnecessary re-renders in lists
const MobileModuleCard = React.memo(function MobileModuleCard({ module, station, section, onClick, onProgressUpdate, canEdit = true }) {
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
});

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
