// MODA Dashboard - React Components
// Extracted from index.html for optimization

        const { useState, useEffect, useMemo, useRef, useCallback } = React;
        
        // Feature flag helper
        const isFeatureEnabled = (flag, userEmail) => window.MODA_FEATURE_FLAGS?.isEnabled(flag, userEmail) || false;

        // ===== AUTOVOL LOGO =====
        const AUTOVOL_LOGO = "./public/autovol-logo.png";

        // ===== LICENSE PLATE UTILITIES =====
        const generateQRCode = (text) => {
            const qr = qrcode(0, 'M');
            qr.addData(text);
            qr.make();
            return qr.createDataURL(4, 0);
        };

        const buildModuleUrl = (baseUrl, projectId, serialNumber) => {
            // Point to the Module Scanner page
            const scannerUrl = baseUrl.replace(/[^/]*$/, 'Module_Scanner.html');
            return `${scannerUrl}?project=${encodeURIComponent(projectId)}&module=${encodeURIComponent(serialNumber)}`;
        };

        // Extract Building, Level, Module from BLM ID (e.g., B1L2M52 → Building 1, Level 2, Module 52)
        const extractFromBLM = (blmId) => {
            const blm = String(blmId || '').toUpperCase();
            // Pattern: B{building}L{level}M{module} e.g., B1L2M52
            const match = blm.match(/B(\d+)L(\d+)M(\d+)/);
            if (match) {
                return {
                    building: `B${match[1]}`,
                    level: `L${match[2]}`,
                    module: `M${match[3].padStart(2, '0')}`
                };
            }
            // Fallback: Try 3-digit serial format (e.g., 313 = Building 3, Level 1, Module 3)
            const serialMatch = String(blmId).match(/^(\d)(\d)(\d+)$/);
            if (serialMatch) {
                return {
                    building: `B${serialMatch[1]}`,
                    level: `L${serialMatch[2]}`,
                    module: `M${serialMatch[3].padStart(2, '0')}`
                };
            }
            return { building: 'OTHER', level: 'OTHER', module: 'OTHER' };
        };

        const extractStack = (serialNumber) => {
            // Keep for backwards compatibility - now uses BLM extraction
            const result = extractFromBLM(serialNumber);
            return result.building !== 'OTHER' ? result.building : 'OTHER';
        };

        const extractUnitType = (unitType) => {
            const type = String(unitType).toUpperCase().replace(/[.\-_]/g, ' ').trim();
            const match = type.match(/^(\d*\s*B|STUDIO|STU)/i);
            return match ? match[0].replace(/\s+/g, '') : type.split(' ')[0] || 'OTHER';
        };

        const getLicensePlateIndicators = (module) => {
            const indicators = [];
            const difficulties = module.difficulties || {};
            
            if (difficulties.sidewall) indicators.push({ key: 'SW', label: 'SW' });
            if (difficulties.short) indicators.push({ key: 'SHORT', label: 'SHORT' });
            if (difficulties.stair) indicators.push({ key: 'STAIR', label: 'STAIR' });
            if (difficulties.hr3Wall) indicators.push({ key: '3HR', label: '3HR' });
            if (difficulties.doubleStudio) indicators.push({ key: 'DBL', label: 'DBL STUDIO' });
            if (difficulties.sawbox) indicators.push({ key: 'SAWBOX', label: 'SAWBOX' });
            if (difficulties.proto) indicators.push({ key: 'PROTO', label: 'PROTO' });
            
            return indicators;
        };
// ===== AUTHENTICATION SYSTEM =====

// ============================================================================
// DASHBOARD ROLES - CONSTANTS MOVED TO auth/AuthConstants.jsx
// ============================================================================

// Use window.ALL_AVAILABLE_TABS and window.DEFAULT_DASHBOARD_ROLES from AuthConstants.jsx
const ALL_AVAILABLE_TABS = window.ALL_AVAILABLE_TABS || [];
const DEFAULT_DASHBOARD_ROLES = window.DEFAULT_DASHBOARD_ROLES || [];

// ============================================================================
// AUTH MODULE - EXTRACTED TO auth/AuthModule.jsx
// LOGIN PAGE - EXTRACTED TO auth/LoginPage.jsx
// ROLE MANAGER - EXTRACTED TO auth/RoleManager.jsx
// ============================================================================
        // ===== END AUTHENTICATION SYSTEM =====

        // Production Stages Definition - 21 stations with staggers
        // startingSerial: the module serial # that starts at this station this week
        // stagger: offset from Automation (calculated from starting modules)
        const productionStages = [
            { id: 'auto-fc', name: 'Automation (Floor/Ceiling)', dept: 'AUTO-FC', color: 'bg-slate-600', group: 'automation', startingSerial: '25-0861' },
            { id: 'auto-walls', name: 'Automation (Walls)', dept: 'AUTO-W', color: 'bg-slate-500', group: 'automation', startingSerial: '25-0861' },
            { id: 'mezzanine', name: 'Mezzanine (FC Prep, Plumbing - Floors)', dept: 'MEZZ', color: 'bg-violet-500', group: null, startingSerial: '25-0860' },
            { id: 'elec-ceiling', name: 'Electrical - Ceilings', dept: 'ELEC-C', color: 'bg-amber-400', group: null, startingSerial: '25-0857' },
            { id: 'wall-set', name: 'Wall Set', dept: 'WALL', color: 'bg-autovol-teal', group: null, startingSerial: '25-0856' },
            { id: 'ceiling-set', name: 'Ceiling Set', dept: 'CEIL', color: 'bg-teal-400', group: null, startingSerial: '25-0855' },
            { id: 'soffits', name: 'Soffits', dept: 'SOFF', color: 'bg-sky-500', group: null, startingSerial: '25-0854' },
            { id: 'mech-rough', name: 'Mechanical Rough-In', dept: 'MECH-R', color: 'bg-cyan-600', group: 'mep-rough', startingSerial: '25-0959' },
            { id: 'elec-rough', name: 'Electrical Rough-In', dept: 'ELEC-R', color: 'bg-cyan-500', group: 'mep-rough', startingSerial: '25-0959' },
            { id: 'plumb-rough', name: 'Plumbing Rough-In', dept: 'PLMB-R', color: 'bg-cyan-400', group: 'mep-rough', startingSerial: '25-0959' },
            { id: 'exteriors', name: 'Exteriors', dept: 'EXT', color: 'bg-teal-500', group: null, startingSerial: '25-0853' },
            { id: 'drywall-bp', name: 'Drywall - BackPanel', dept: 'DRY-BP', color: 'bg-green-600', group: null, startingSerial: '25-0852' },
            { id: 'drywall-ttp', name: 'Drywall - Tape/Texture/Paint', dept: 'DRY-TTP', color: 'bg-green-500', group: null, startingSerial: '25-0846' },
            { id: 'roofing', name: 'Roofing', dept: 'ROOF', color: 'bg-amber-500', group: null, startingSerial: '25-0848' },
            { id: 'pre-finish', name: 'Pre-Finish', dept: 'PRE-FIN', color: 'bg-lime-500', group: null, startingSerial: '25-0840' },
            { id: 'mech-trim', name: 'Mechanical Trim', dept: 'MECH-T', color: 'bg-yellow-600', group: 'mep-trim', startingSerial: '25-0956' },
            { id: 'elec-trim', name: 'Electrical Trim', dept: 'ELEC-T', color: 'bg-yellow-500', group: 'mep-trim', startingSerial: '25-0956' },
            { id: 'plumb-trim', name: 'Plumbing Trim', dept: 'PLMB-T', color: 'bg-yellow-400', group: 'mep-trim', startingSerial: '25-0956' },
            { id: 'final-finish', name: 'Final Finish', dept: 'FINAL', color: 'bg-orange-500', group: null, startingSerial: '25-0958' },
            { id: 'sign-off', name: 'Module Sign-Off', dept: 'SIGN-OFF', color: 'bg-rose-500', group: null, startingSerial: '25-0955' },
            { id: 'close-up', name: 'Close-Up', dept: 'CLOSE', color: 'bg-red-500', group: null, startingSerial: '25-0953' }
        ];

        // Station groups for visual styling
        const stationGroups = {
            'automation': { name: 'Automation', borderColor: 'border-autovol-teal', stations: ['auto-fc', 'auto-walls'] },
            'mep-rough': { name: 'MEP Rough-In', borderColor: 'border-cyan-500', stations: ['mech-rough', 'elec-rough', 'plumb-rough'] },
            'mep-trim': { name: 'MEP Trim', borderColor: 'border-yellow-500', stations: ['mech-trim', 'elec-trim', 'plumb-trim'] }
        };

        // Station staggers (offset from Automation in build sequence)
        // Higher number = station is working on modules further ahead in production
        // Default values as of Dec 5, 2025
        const stationStaggers = {
            'auto-fc': 0,        // Automation (Floor/Ceiling) - Base
            'auto-walls': 0,     // Automation (Walls) - Parallel with F/C
            'mezzanine': 1,      // Mezzanine (FC Prep, Plumbing - Floors)
            'elec-ceiling': 4,   // Electrical - Ceilings
            'wall-set': 5,       // Wall Set
            'ceiling-set': 6,    // Ceiling Set
            'soffits': 7,        // Soffits
            'mech-rough': 8,     // Mechanical Rough-In (MEP Rough-In group)
            'elec-rough': 8,     // Electrical Rough-In (MEP Rough-In group)
            'plumb-rough': 8,    // Plumbing Rough-In (MEP Rough-In group)
            'exteriors': 9,      // Exteriors
            'drywall-bp': 10,    // Drywall - BackPanel
            'drywall-ttp': 18,   // Drywall - Tape/Texture/Paint
            'roofing': 15,       // Roofing
            'pre-finish': 24,    // Pre-Finish
            'mech-trim': 25,     // Mechanical Trim (MEP Trim group)
            'elec-trim': 25,     // Electrical Trim (MEP Trim group)
            'plumb-trim': 25,    // Plumbing Trim (MEP Trim group)
            'final-finish': 27,  // Final Finish
            'sign-off': 29,      // Module Sign-Off
            'close-up': 36       // Close-Up
        };

        // Difficulty color mappings
        const difficultyColors = {
            sidewall: 'bg-orange-100 text-orange-800',
            stair: 'bg-purple-100 text-purple-800',
            hr3Wall: 'bg-red-100 text-red-800',
            short: 'bg-yellow-100 text-yellow-800',
            doubleStudio: 'bg-indigo-100 text-indigo-800',
            sawbox: 'bg-pink-100 text-pink-800'
        };

        const difficultyLabels = {
            sidewall: 'Sidewall',
            stair: 'Stair',
            hr3Wall: '3HR-Wall',
            short: 'Short',
            doubleStudio: 'Dbl Studio',
            sawbox: 'Sawbox'
        };

        // Default Employee Roster (from Autovol_Roster_Current.xlsx)
        const defaultEmployees = [];

// ===== PRODUCTION WEEK MANAGEMENT HOOK =====
const useProductionWeeks = () => {
    const [weeks, setWeeks] = useState(() => {
        const saved = localStorage.getItem('autovol_production_weeks');
        if (saved && saved !== 'undefined' && saved !== 'null') {
            try { return JSON.parse(saved); } catch (e) { return []; }
        }
        return [];
    });
    
    const [staggerConfig, setStaggerConfig] = useState(() => {
        const saved = localStorage.getItem('autovol_station_staggers');
        if (saved && saved !== 'undefined' && saved !== 'null') {
            try { return JSON.parse(saved); } catch (e) { return { ...stationStaggers }; }
        }
        return { ...stationStaggers };
    });
    
    // Stagger change log - tracks all saved stagger configurations
    const [staggerChangeLog, setStaggerChangeLog] = useState(() => {
        const saved = localStorage.getItem('autovol_stagger_change_log');
        if (saved && saved !== 'undefined' && saved !== 'null') {
            try { return JSON.parse(saved); } catch (e) { return []; }
        }
        return [];
    });
    
    // Track if there are unsaved changes
    const [hasUnsavedStaggerChanges, setHasUnsavedStaggerChanges] = useState(false);
    const [pendingStaggerChanges, setPendingStaggerChanges] = useState({});
    
    useEffect(() => {
        localStorage.setItem('autovol_production_weeks', JSON.stringify(weeks));
    }, [weeks]);
    
    useEffect(() => {
        localStorage.setItem('autovol_station_staggers', JSON.stringify(staggerConfig));
    }, [staggerConfig]);
    
    useEffect(() => {
        localStorage.setItem('autovol_stagger_change_log', JSON.stringify(staggerChangeLog));
    }, [staggerChangeLog]);
    
    const addWeek = (weekData) => {
        const newWeek = { ...weekData, id: `week-${Date.now()}`, createdAt: new Date().toISOString() };
        setWeeks(prev => [...prev, newWeek]);
        return newWeek;
    };
    
    const updateWeek = (weekId, updates) => {
        setWeeks(prev => prev.map(w => w.id === weekId ? { ...w, ...updates } : w));
    };
    
    const deleteWeek = (weekId) => {
        setWeeks(prev => prev.filter(w => w.id !== weekId));
    };
    
    // Update stagger value (marks as pending until saved)
    const updateStagger = (stationId, value) => {
        const newValue = parseInt(value) || 0;
        setPendingStaggerChanges(prev => ({ ...prev, [stationId]: newValue }));
        setStaggerConfig(prev => ({ ...prev, [stationId]: newValue }));
        setHasUnsavedStaggerChanges(true);
    };
    
    // Save stagger changes with description to change log
    const saveStaggerChanges = (description, userName = 'Unknown') => {
        if (!hasUnsavedStaggerChanges) return;
        
        const logEntry = {
            id: `stagger-${Date.now()}`,
            timestamp: new Date().toISOString(),
            description: description || 'No description provided',
            changedBy: userName,
            changes: { ...pendingStaggerChanges },
            fullConfig: { ...staggerConfig }
        };
        
        setStaggerChangeLog(prev => [logEntry, ...prev]);
        setPendingStaggerChanges({});
        setHasUnsavedStaggerChanges(false);
        
        return logEntry;
    };
    
    // Revert to a previous stagger configuration
    const revertToStaggerConfig = (logEntryId) => {
        const entry = staggerChangeLog.find(e => e.id === logEntryId);
        if (entry && entry.fullConfig) {
            setStaggerConfig({ ...entry.fullConfig });
            setPendingStaggerChanges({});
            setHasUnsavedStaggerChanges(false);
        }
    };
    
    // Reset to default staggers
    const resetToDefaultStaggers = () => {
        setStaggerConfig({ ...stationStaggers });
        setPendingStaggerChanges({});
        setHasUnsavedStaggerChanges(true);
    };
    
    const validateWeek = (weekData, excludeId = null) => {
        const start = new Date(weekData.weekStart);
        const end = new Date(weekData.weekEnd);
        if (end <= start) return { valid: false, error: 'End date must be after start date' };
        const overlap = weeks.find(w => {
            if (w.id === excludeId) return false;
            const wStart = new Date(w.weekStart);
            const wEnd = new Date(w.weekEnd);
            return (start <= wEnd && end >= wStart);
        });
        if (overlap) return { valid: false, error: 'Week overlaps with existing schedule' };
        return { valid: true };
    };
    
    const getCurrentWeek = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return weeks.find(week => {
            const start = new Date(week.weekStart);
            const end = new Date(week.weekEnd);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return today >= start && today <= end;
        });
    };
    
    const getWeekForDate = (date) => {
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);
        return weeks.find(week => {
            const start = new Date(week.weekStart);
            const end = new Date(week.weekEnd);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return targetDate >= start && targetDate <= end;
        });
    };

    return { 
        weeks, 
        staggerConfig, 
        staggerChangeLog,
        hasUnsavedStaggerChanges,
        addWeek, 
        updateWeek, 
        deleteWeek, 
        updateStagger,
        saveStaggerChanges,
        revertToStaggerConfig,
        resetToDefaultStaggers,
        validateWeek,
        getCurrentWeek,
        getWeekForDate
    };
};

// ===== STAGGER CONFIG TAB COMPONENT =====
function StaggerConfigTab({ productionStages, stationGroups, staggerConfig, staggerChangeLog, hasUnsavedStaggerChanges, updateStagger, saveStaggerChanges, revertToStaggerConfig, resetToDefaultStaggers, currentUser, isAdmin }) {
    // Only admins can edit staggers
    const [changeDescription, setChangeDescription] = useState('');
    const [showChangeLog, setShowChangeLog] = useState(false);
    const [confirmRevert, setConfirmRevert] = useState(null);

    const handleSaveChanges = () => {
        if (!changeDescription.trim()) { alert('Please enter a description for this change'); return; }
        const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unknown';
        saveStaggerChanges(changeDescription.trim(), userName);
        setChangeDescription('');
    };

    const handleRevert = (logEntryId) => { revertToStaggerConfig(logEntryId); setConfirmRevert(null); };

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-autovol-navy">Station Stagger Configuration</h3>
                    <p className="text-sm text-gray-600">Configure the offset between departments. A stagger of 5 means that station is working on modules 5 positions ahead of Automation.</p>
                    {!isAdmin && <p className="text-xs text-amber-600 mt-1">🔒 View only - Admin access required to modify staggers</p>}
                </div>
                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <button onClick={resetToDefaultStaggers} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">Reset to Default</button>
                    )}
                    <button onClick={() => setShowChangeLog(!showChangeLog)} className={`px-3 py-1.5 text-sm border rounded-lg flex items-center gap-1 ${showChangeLog ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50 text-gray-600'}`}>
                        📋 Change Log ({staggerChangeLog.length})
                    </button>
                </div>
            </div>

            {/* Unsaved Changes Banner */}
            {hasUnsavedStaggerChanges && isAdmin && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-amber-800 font-medium mb-2">⚠️ You have unsaved stagger changes</div>
                    <div className="flex items-center gap-2">
                        <input type="text" value={changeDescription} onChange={(e) => setChangeDescription(e.target.value)} placeholder="Describe why you're making this change..." className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm" />
                        <button onClick={handleSaveChanges} disabled={!changeDescription.trim()} className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed">Save Changes</button>
                    </div>
                </div>
            )}

            {/* Change Log Panel */}
            {showChangeLog && (
                <div className="bg-gray-50 border rounded-lg">
                    <div className="p-3 border-b bg-gray-100 flex items-center justify-between">
                        <h4 className="font-semibold text-gray-700">Stagger Change History</h4>
                        <button onClick={() => setShowChangeLog(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {staggerChangeLog.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">No changes recorded yet.</div>
                        ) : (
                            <div className="divide-y">
                                {staggerChangeLog.map((entry, idx) => (
                                    <div key={entry.id} className="p-3 hover:bg-white">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="font-medium text-gray-800">{entry.description}</span>
                                                    {idx === 0 && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">Current</span>}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">{formatDate(entry.timestamp)} • by {entry.changedBy}</div>
                                                {Object.keys(entry.changes || {}).length > 0 && (
                                                    <div className="mt-1 text-xs text-gray-600">
                                                        Changed: {Object.entries(entry.changes).map(([station, value]) => (
                                                            <span key={station} className="inline-block bg-gray-200 px-1.5 py-0.5 rounded mr-1 mb-1">{station}: {value}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {idx !== 0 && isAdmin && (
                                                confirmRevert === entry.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => handleRevert(entry.id)} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">Confirm</button>
                                                        <button onClick={() => setConfirmRevert(null)} className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded">Cancel</button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => setConfirmRevert(entry.id)} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100">Revert</button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Stagger Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Station</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Dept Code</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Stagger Offset</th>
                            <th className="text-left py-2 px-3 font-semibold text-gray-700">Group</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productionStages.map((station, idx) => (
                            <tr key={station.id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                                <td className="py-2 px-3">{station.name}</td>
                                <td className="py-2 px-3 font-mono">{station.dept}</td>
                                <td className="py-2 px-3">
                                    <input type="number" min="0" max="50" value={staggerConfig[station.id] || 0} onChange={(e) => isAdmin && updateStagger(station.id, e.target.value)} disabled={!isAdmin} className={`w-20 px-2 py-1 border rounded text-center font-mono ${!isAdmin ? 'bg-gray-100 cursor-not-allowed' : ''}`} />
                                </td>
                                <td className="py-2 px-3">
                                    {station.group && <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">{stationGroups[station.group]?.name || station.group}</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Info Tip */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <strong>Tip:</strong> Stagger values determine which module appears at each station on the Weekly Board. <strong>Remember to save your changes with a description!</strong>
            </div>
        </div>
    );
}

// ============================================================================
// DASHBOARD ROLE MANAGER - EXTRACTED TO auth/RoleManager.jsx
// ============================================================================

        // Main Dashboard Component (requires authentication)
        function Dashboard({ auth }) {
            // Use URL-based navigation if feature flag is enabled, otherwise use local state
            const useUrlNav = isFeatureEnabled('enableUrlNavigation', auth.currentUser?.email) && window.useUrlNavigation;
            const [urlActiveTab, urlSetActiveTab] = useUrlNav ? window.useUrlNavigation('home') : [null, null];
            const [localActiveTab, setLocalActiveTab] = useState('home');
            
            // Use URL navigation if available, otherwise fall back to local state
            const activeTab = useUrlNav ? urlActiveTab : localActiveTab;
            const setActiveTab = useUrlNav ? urlSetActiveTab : setLocalActiveTab;
            
            // Projects state - loaded from Supabase with localStorage fallback
            const [projects, setProjectsState] = useState([]);
            const [projectsLoading, setProjectsLoading] = useState(true);
            const [projectsSynced, setProjectsSynced] = useState(false);
            
            // Wrapper to save projects to both state and localStorage
            const setProjects = useCallback((newProjects) => {
                setProjectsState(prevProjects => {
                    const projectsArray = typeof newProjects === 'function' 
                        ? newProjects(prevProjects) 
                        : newProjects;
                    // Save to localStorage as backup (only if valid array)
                    if (Array.isArray(projectsArray)) {
                        localStorage.setItem('autovol_projects', JSON.stringify(projectsArray));
                    }
                    return projectsArray || [];
                });
            }, []);
            
            // Load projects from Supabase on mount
            useEffect(() => {
                const loadProjects = async () => {
                    try {
                        if (window.MODA_SUPABASE_DATA?.isAvailable?.()) {
                            console.log('[App] Loading projects from Supabase...');
                            const supabaseProjects = await window.MODA_SUPABASE_DATA.projects.getAll();
                            setProjectsState(supabaseProjects || []);
                            setProjectsSynced(true);
                            console.log('[App] Loaded', supabaseProjects?.length || 0, 'projects from Supabase');
                        } else {
                            // Fallback to localStorage
                            console.log('[App] Supabase not available, using localStorage for projects');
                            try {
                                const saved = localStorage.getItem('autovol_projects');
                                if (saved && saved !== 'undefined' && saved !== 'null') {
                                    setProjectsState(JSON.parse(saved));
                                }
                            } catch (e) {
                                console.error('[App] Error parsing projects from localStorage:', e);
                            }
                        }
                    } catch (error) {
                        console.error('[App] Error loading projects:', error);
                        // Fallback to localStorage on error
                        try {
                            const saved = localStorage.getItem('autovol_projects');
                            if (saved && saved !== 'undefined' && saved !== 'null') {
                                setProjectsState(JSON.parse(saved));
                            }
                        } catch (e) {
                            console.error('[App] Error parsing projects fallback:', e);
                        }
                    } finally {
                        setProjectsLoading(false);
                    }
                };
                
                // Wait for Supabase to initialize
                const timer = setTimeout(loadProjects, 500);
                return () => clearTimeout(timer);
            }, []);
            
            const [trashedProjects, setTrashedProjects] = useState(() => {
                const saved = localStorage.getItem('autovol_trash_projects');
                if (saved && saved !== 'undefined' && saved !== 'null') {
                    try {
                        const parsed = JSON.parse(saved);
                        // Auto-purge items older than 90 days
                        const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
                        return parsed.filter(p => p.deletedAt > ninetyDaysAgo);
                    } catch (e) { return []; }
                }
                return [];
            });
            const [trashedEmployees, setTrashedEmployees] = useState(() => {
                const saved = localStorage.getItem('autovol_trash_employees');
                if (saved && saved !== 'undefined' && saved !== 'null') {
                    try {
                        const parsed = JSON.parse(saved);
                        // Auto-purge items older than 90 days
                        const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
                        return parsed.filter(e => e.deletedAt > ninetyDaysAgo);
                    } catch (e) { return []; }
                }
                return [];
            });
            const [showDataManagement, setShowDataManagement] = useState(false);
            const [selectedProject, setSelectedProject] = useState(null);
            const [showProjectModal, setShowProjectModal] = useState(false);
            const [showImportModal, setShowImportModal] = useState(false);
            const [viewMode, setViewMode] = useState('grid'); // grid, list
            const [searchTerm, setSearchTerm] = useState('');
            const [stageFilter, setStageFilter] = useState('all');
            
            // Theme state (dark mode) - defaults to light mode
            const [darkMode, setDarkMode] = useState(() => {
                const saved = localStorage.getItem('moda_theme');
                if (saved) return saved === 'dark';
                // Default to light mode instead of system preference
                return false;
            });
            
            // Keyboard shortcuts help modal
            const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
            
            // Apply theme to document
            useEffect(() => {
                document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
                localStorage.setItem('moda_theme', darkMode ? 'dark' : 'light');
            }, [darkMode]);
            
            // Keyboard shortcuts
            useEffect(() => {
                const handleKeyDown = (e) => {
                    // Don't trigger shortcuts when typing in inputs
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                        return;
                    }
                    
                    const key = e.key.toLowerCase();
                    const ctrl = e.ctrlKey || e.metaKey;
                    
                    // Ctrl+D: Toggle dark mode
                    if (ctrl && key === 'd') {
                        e.preventDefault();
                        setDarkMode(prev => !prev);
                        return;
                    }
                    
                    // ?: Show shortcuts help
                    if (e.key === '?' || (e.shiftKey && key === '/')) {
                        e.preventDefault();
                        setShowShortcutsHelp(true);
                        return;
                    }
                    
                    // Escape: Close modals
                    if (key === 'escape') {
                        setShowShortcutsHelp(false);
                        setShowProjectModal(false);
                        setShowImportModal(false);
                        setShowDataManagement(false);
                        return;
                    }
                    
                    // Tab navigation with number keys (1-9)
                    if (!ctrl && !e.altKey && /^[1-9]$/.test(key)) {
                        const tabIndex = parseInt(key) - 1;
                        const visibleTabs = [
                            'executive', 'production', 'projects', 'people', 'qa', 
                            'transport', 'equipment', 'precon', 'onsite', 'engineering', 
                            'automation', 'tracker'
                        ].filter(tab => auth.visibleTabs.includes(tab));
                        
                        if (tabIndex < visibleTabs.length) {
                            e.preventDefault();
                            setActiveTab(visibleTabs[tabIndex]);
                            setSelectedProject(null);
                        }
                        return;
                    }
                    
                    // Ctrl+E: Export data (admin only)
                    if (ctrl && key === 'e' && auth.isAdmin) {
                        e.preventDefault();
                        exportData();
                        return;
                    }
                    
                    // Ctrl+F: Focus search (if on projects tab)
                    if (ctrl && key === 'f' && activeTab === 'projects') {
                        e.preventDefault();
                        const searchInput = document.querySelector('input[placeholder*="Search"]');
                        if (searchInput) searchInput.focus();
                        return;
                    }
                };
                
                document.addEventListener('keydown', handleKeyDown);
                return () => document.removeEventListener('keydown', handleKeyDown);
            }, [activeTab, auth.visibleTabs, auth.isAdmin]);
            
            // People Module State
            const [employees, setEmployees] = useState([]);
            const [employeesSynced, setEmployeesSynced] = useState(false);
            const [departments, setDepartments] = useState([]);
            const [departmentsLoaded, setDepartmentsLoaded] = useState(false);

            // Default departments based on production stages
            const getDefaultDepartments = () => productionStages.map(s => ({
                id: s.id,
                name: s.name,
                supervisor: null,
                employeeCount: 0
            }));

            // Load employees and departments from Supabase (or localStorage fallback)
            useEffect(() => {
                const loadPeopleData = async () => {
                    try {
                        if (window.MODA_SUPABASE_DATA?.isAvailable?.()) {
                            console.log('[App] Loading people data from Supabase...');
                            
                            // Load employees
                            const supabaseEmployees = await window.MODA_SUPABASE_DATA.employees.getAll();
                            setEmployees(supabaseEmployees);
                            setEmployeesSynced(true);
                            console.log('[App] Loaded', supabaseEmployees.length, 'employees from Supabase');
                            
                            // Load departments
                            try {
                                const supabaseDepts = await window.MODA_SUPABASE_DATA.departments.getAll();
                                if (supabaseDepts && supabaseDepts.length > 0) {
                                    setDepartments(supabaseDepts);
                                    console.log('[App] Loaded', supabaseDepts.length, 'departments from Supabase');
                                } else {
                                    // Fallback to localStorage or defaults
                                    const saved = localStorage.getItem('autovol_departments');
                                    if (saved && saved !== 'undefined' && saved !== 'null') {
                                        try { setDepartments(JSON.parse(saved)); } 
                                        catch (e) { setDepartments(getDefaultDepartments()); }
                                    } else {
                                        setDepartments(getDefaultDepartments());
                                    }
                                }
                            } catch (deptErr) {
                                console.log('[App] Departments table may not exist yet, using localStorage');
                                const saved = localStorage.getItem('autovol_departments');
                                if (saved && saved !== 'undefined' && saved !== 'null') {
                                    try { setDepartments(JSON.parse(saved)); } 
                                    catch (e) { setDepartments(getDefaultDepartments()); }
                                } else {
                                    setDepartments(getDefaultDepartments());
                                }
                            }
                            setDepartmentsLoaded(true);
                        } else {
                            // Fallback to localStorage
                            console.log('[App] Supabase not available, using localStorage');
                            const saved = localStorage.getItem('autovol_employees');
                            if (saved && saved !== 'undefined' && saved !== 'null') {
                                try {
                                    const parsed = JSON.parse(saved);
                                    setEmployees(parsed.length > 0 ? parsed : []);
                                } catch (e) {
                                    console.error('[App] Error parsing employees from localStorage:', e);
                                }
                            }
                            // Load departments from localStorage
                            const savedDepts = localStorage.getItem('autovol_departments');
                            if (savedDepts && savedDepts !== 'undefined' && savedDepts !== 'null') {
                                try { setDepartments(JSON.parse(savedDepts)); } 
                                catch (e) { setDepartments(getDefaultDepartments()); }
                            } else {
                                setDepartments(getDefaultDepartments());
                            }
                            setDepartmentsLoaded(true);
                        }
                    } catch (error) {
                        console.error('[App] Error loading people data:', error);
                        // Fallback to localStorage on error
                        const saved = localStorage.getItem('autovol_employees');
                        if (saved && saved !== 'undefined' && saved !== 'null') {
                            try {
                                setEmployees(JSON.parse(saved));
                            } catch (e) {
                                console.error('[App] Error parsing employees fallback:', e);
                            }
                        }
                        const savedDepts = localStorage.getItem('autovol_departments');
                        if (savedDepts && savedDepts !== 'undefined' && savedDepts !== 'null') {
                            try { setDepartments(JSON.parse(savedDepts)); } 
                            catch (e) { setDepartments(getDefaultDepartments()); }
                        } else {
                            setDepartments(getDefaultDepartments());
                        }
                        setDepartmentsLoaded(true);
                    }
                };
                
                // Wait a bit for Supabase to initialize
                const timer = setTimeout(loadPeopleData, 500);
                return () => clearTimeout(timer);
            }, []);

            // Save to localStorage and sync to Supabase when projects change
            const lastSyncedProjects = useRef(null);
            useEffect(() => {
                // Only save to localStorage if not using Firestore (Firestore handles its own persistence)
                if (!projectsSynced && Array.isArray(projects) && projects.length > 0) {
                    localStorage.setItem('autovol_projects', JSON.stringify(projects));
                }
                // Sync to unified layer for any modules with close-up at 100%
                MODA_UNIFIED.migrateFromProjects();
                
                // Sync changed projects to Supabase (debounced)
                if (projectsSynced && window.MODA_SUPABASE_DATA?.isAvailable?.() && Array.isArray(projects)) {
                    // Helper to check if ID is a valid UUID (not a timestamp)
                    const isValidUUID = (id) => {
                        if (!id) return false;
                        // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                        return uuidRegex.test(String(id));
                    };
                    
                    // Find projects that changed
                    const syncToSupabase = async () => {
                        const lastProjects = lastSyncedProjects.current || [];
                        for (const project of projects) {
                            // Only sync projects with valid Supabase UUIDs (skip timestamp IDs)
                            if (!isValidUUID(project.id)) {
                                console.log('[App] Skipping sync for non-UUID project:', project.name, project.id);
                                continue;
                            }
                            
                            const lastVersion = lastProjects.find(p => p.id === project.id);
                            // Check if project changed (compare modules array length or stringify)
                            if (!lastVersion || JSON.stringify(lastVersion) !== JSON.stringify(project)) {
                                try {
                                    await window.MODA_SUPABASE_DATA.projects.update(project.id, project);
                                    console.log('[App] Synced project to Supabase:', project.name, 'modules:', project.modules?.length || 0);
                                } catch (err) {
                                    console.error('[App] Error syncing project to Supabase:', err);
                                }
                            }
                        }
                        lastSyncedProjects.current = JSON.parse(JSON.stringify(projects));
                    };
                    
                    // Debounce the sync
                    const syncTimeout = setTimeout(syncToSupabase, 1000);
                    return () => clearTimeout(syncTimeout);
                }
            }, [projects, projectsSynced]);

            useEffect(() => {
                localStorage.setItem('autovol_trash_projects', JSON.stringify(trashedProjects));
            }, [trashedProjects]);

            useEffect(() => {
                localStorage.setItem('autovol_trash_employees', JSON.stringify(trashedEmployees));
            }, [trashedEmployees]);

            // Save employees to localStorage as backup (even when using Supabase)
            useEffect(() => {
                if (employees.length > 0) {
                    localStorage.setItem('autovol_employees', JSON.stringify(employees));
                }
            }, [employees]);

            useEffect(() => {
                localStorage.setItem('autovol_departments', JSON.stringify(departments));
            }, [departments]);

            // Export all data as JSON
            const exportData = () => {
                const data = {
                    exportDate: new Date().toISOString(),
                    version: '1.0',
                    projects,
                    trashedProjects,
                    employees,
                    trashedEmployees,
                    departments
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `MODA_Backup_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            };

            // Import data from JSON file
            const importData = (file) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.projects) setProjects(data.projects);
                        if (data.trashedProjects) setTrashedProjects(data.trashedProjects);
                        if (data.employees) setEmployees(data.employees);
                        if (data.trashedEmployees) setTrashedEmployees(data.trashedEmployees);
                        if (data.departments) setDepartments(data.departments);
                        alert('Data restored successfully!');
                    } catch (err) {
                        alert('Error reading backup file: ' + err.message);
                    }
                };
                reader.readAsText(file);
            };

            // Calculate department status from ALL active projects
            const departmentStatus = useMemo(() => {
                const status = {};
                productionStages.forEach(stage => {
                    status[stage.id] = { inProgress: 0, completed: 0 };
                });

                projects.filter(p => p.status === 'Active').forEach(project => {
                    (project.modules || []).forEach(module => {
                        productionStages.forEach(stage => {
                            const progress = module.stageProgress?.[stage.id] || 0;
                            if (progress > 0 && progress < 100) {
                                status[stage.id].inProgress++;
                            } else if (progress === 100) {
                                status[stage.id].completed++;
                            }
                        });
                    });
                });

                return status;
            }, [projects]);

            // Active projects count
            const activeProjects = projects.filter(p => p.status === 'Active');
            const totalActiveModules = activeProjects.reduce((sum, p) => sum + (p.modules?.length || 0), 0);

            // Weekly schedule integration for Executive Dashboard
            const weeklySchedule = window.WeeklyBoardComponents?.useWeeklySchedule?.() || {
                scheduleSetup: { shift1: { monday: 5, tuesday: 5, wednesday: 5, thursday: 5 }, shift2: { friday: 0, saturday: 0, sunday: 0 } },
                completedWeeks: [],
                updateShiftSchedule: () => {},
                getShiftTotal: () => 0,
                getLineBalance: () => 21,
                completeWeek: () => {}
            };

            // Get current week for Executive Dashboard
            const getCurrentWeek = () => {
                const now = new Date();
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
                return Math.ceil((days + startOfYear.getDay() + 1) / 7);
            };
            const currentWeek = getCurrentWeek();

            return (
                <div className="min-h-screen" style={{backgroundColor: 'var(--autovol-gray-bg)'}}>
                    {/* Header */}
                    <header className="bg-white shadow-sm border-b mobile-header">
                        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {/* Mobile Navigation - Hamburger Menu */}
                                {window.MobileNavigation && (
                                    <window.MobileNavigation
                                        tabs={[
                                            {id: 'executive', label: 'Executive', icon: 'icon-executive'},
                                            {id: 'production', label: 'Production', icon: 'icon-production'},
                                            {id: 'projects', label: 'Projects', icon: 'icon-projects'},
                                            {id: 'people', label: 'People', icon: 'icon-people'},
                                            {id: 'qa', label: 'QA', icon: 'icon-qa'},
                                            {id: 'transport', label: 'Transport', icon: 'icon-transport'},
                                            {id: 'equipment', label: 'Tools & Equipment', icon: 'icon-equipment'},
                                            {id: 'precon', label: 'Precon', icon: 'icon-precon'},
                                            {id: 'tracker', label: 'Tracker', icon: 'icon-tracker'}
                                        ].filter(tab => auth.visibleTabs.includes(tab.id))}
                                        activeTab={activeTab}
                                        onTabChange={(tabId) => { setActiveTab(tabId); setSelectedProject(null); }}
                                        currentUser={auth.currentUser}
                                        onLogout={auth.logout}
                                    />
                                )}
                                {/* Autovol Logo */}
                                <img 
                                    src={AUTOVOL_LOGO}
                                    alt="Autovol Volumetric Modular" 
                                    className="mobile-logo"
                                    style={{height: '45px', width: 'auto'}}
                                />
                                <div className="border-l pl-4 hide-mobile" style={{borderColor: 'var(--autovol-teal)'}}>
                                    <h1 className="text-lg font-bold" style={{color: 'var(--autovol-navy)'}}>Modular Operations Dashboard</h1>
                                    <p className="text-xs" style={{color: 'var(--autovol-teal)'}}>MODA</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {auth.isAdmin && (
                                    <button 
                                        onClick={() => setShowDataManagement(true)}
                                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 transition flex items-center gap-1 hide-mobile-tablet"
                                        title="Data Management"
                                    >
                                        <span className="icon-settings" style={{width: '14px', height: '14px', display: 'inline-block'}}></span> Data
                                    </button>
                                )}
                                <div className="text-right cursor-pointer hover:opacity-80 transition mobile-user-profile" onClick={() => setShowUserProfile(true)} title="View your profile">
                                    <p className="text-sm font-medium hide-mobile" style={{color: 'var(--autovol-navy)'}}>{auth.currentUser?.name || 'User'}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${auth.isAdmin ? 'role-badge-admin' : 'role-badge-user'}`}>
                                        {auth.userRole?.name || auth.currentUser?.dashboardRole || 'User'}
                                    </span>
                                </div>
                                {/* User Controls Group */}
                                <div className="flex items-center gap-1 hide-mobile-tablet">
                                    {/* Theme Toggle */}
                                    <button 
                                        onClick={() => setDarkMode(prev => !prev)}
                                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
                                        title={`Switch to ${darkMode ? 'light' : 'dark'} mode (Ctrl+D)`}
                                    >
                                        <span className={darkMode ? 'icon-sun' : 'icon-moon'} style={{width: '16px', height: '16px', display: 'inline-block'}}></span>
                                    </button>
                                    {/* Keyboard Shortcuts Help */}
                                    <button 
                                        onClick={() => setShowShortcutsHelp(true)}
                                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
                                        title="Keyboard shortcuts (?)"
                                    >
                                        <span className="icon-keyboard" style={{width: '16px', height: '16px', display: 'inline-block'}}></span>
                                    </button>
                                    {/* Sign Out */}
                                    <button 
                                        onClick={() => auth.logout()} 
                                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 transition"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Navigation - Grouped or Flat based on feature flag */}
                    {isFeatureEnabled('enableNavGroups', auth.currentUser?.email) && window.NavigationGroups ? (
                        <window.NavigationGroups
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            visibleTabs={auth.visibleTabs}
                            canAccessAdmin={auth.canAccessAdmin}
                            setSelectedProject={setSelectedProject}
                        />
                    ) : (
                        /* Original flat navigation - hidden on mobile/tablet */
                        <nav className="bg-white border-b hide-mobile-tablet">
                            <div className="max-w-7xl mx-auto px-4">
                                <div className="flex gap-1">
                                    {/* HOME TAB - Feature flagged */}
                                    {isFeatureEnabled('enableDashboardHome', auth.currentUser?.email) && (
                                        <button
                                            onClick={() => { setActiveTab('home'); setSelectedProject(null); }}
                                            className={`tab-button px-4 py-3 text-sm font-medium transition rounded-t-lg ${activeTab === 'home' ? 'active' : ''}`}
                                            style={activeTab === 'home' 
                                                ? {backgroundColor: 'var(--autovol-teal)', color: 'white'} 
                                                : {color: 'var(--autovol-navy)'}}
                                        >
                                            <span className="tab-icon icon-home"></span>
                                            Home
                                        </button>
                                    )}
                                    {[
                                        {id: 'executive', label: 'Executive', icon: 'icon-executive'},
                                        {id: 'production', label: 'Production', icon: 'icon-production'},
                                        {id: 'projects', label: 'Projects', icon: 'icon-projects'},
                                        {id: 'people', label: 'People', icon: 'icon-people'},
                                        {id: 'qa', label: 'QA', icon: 'icon-qa'},
                                        {id: 'transport', label: 'Transport', icon: 'icon-transport'},
                                        {id: 'equipment', label: 'Tools & Equipment', icon: 'icon-equipment'},
                                        {id: 'precon', label: 'Precon', icon: 'icon-precon'},
                                        {id: 'onsite', label: 'On-Site', icon: 'icon-onsite'},
                                        {id: 'engineering', label: 'Engineering', icon: 'icon-engineering'},
                                        {id: 'automation', label: 'Automation', icon: 'icon-automation'},
                                        {id: 'tracker', label: 'Tracker', icon: 'icon-tracker'}
                                    ]
                                    .filter(tab => auth.visibleTabs.includes(tab.id)) // FILTER BASED ON ROLE
                                    .map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => { setActiveTab(tab.id); setSelectedProject(null); }}
                                            className={`tab-button px-4 py-3 text-sm font-medium transition rounded-t-lg ${activeTab === tab.id ? 'active' : ''}`}
                                            style={activeTab === tab.id 
                                                ? {backgroundColor: 'var(--autovol-red)', color: 'white'} 
                                                : {color: 'var(--autovol-navy)'}}
                                        >
                                            <span className={`tab-icon ${tab.icon}`}></span>
                                            {tab.label}
                                        </button>
                                    ))}
                                    {/* ADMIN TAB - ONLY VISIBLE WITH canAccessAdmin */}
                                    {auth.canAccessAdmin && (
                                        <button
                                            key="admin"
                                            onClick={() => { setActiveTab('admin'); setSelectedProject(null); }}
                                            className={`tab-button px-4 py-3 text-sm font-medium transition rounded-t-lg ml-auto ${activeTab === 'admin' ? 'active' : ''}`}
                                            style={activeTab === 'admin' 
                                                ? {backgroundColor: 'var(--autovol-navy)', color: 'white'} 
                                                : {backgroundColor: 'var(--autovol-gray-bg)', color: 'var(--autovol-navy)'}}
                                        >
                                            <span className="tab-icon icon-admin"></span>
                                            Admin
                                        </button>
                                    )}
                                </div>
                            </div>
                        </nav>
                    )}

                    {/* Main Content */}
                    <main className="max-w-7xl mx-auto px-4 py-6">
                        {/* Dashboard Home - Feature flagged */}
                        {activeTab === 'home' && isFeatureEnabled('enableDashboardHome', auth.currentUser?.email) && (
                            window.DashboardHome ? (
                                <window.DashboardHome
                                    projects={projects}
                                    employees={employees}
                                    auth={auth}
                                    onNavigate={(tab) => { setActiveTab(tab); setSelectedProject(null); }}
                                />
                            ) : (
                                <div className="text-center py-20">
                                    <div className="text-6xl mb-4">🏠</div>
                                    <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>Dashboard Home</h2>
                                    <p className="text-gray-600">Loading...</p>
                                </div>
                            )
                        )}

                        {activeTab === 'production' && !selectedProject && (
                            <ProductionDashboard 
                                projects={projects}
                                setProjects={setProjects}
                                departmentStatus={departmentStatus}
                                onSelectProject={setSelectedProject}
                                auth={auth}
                            />
                        )}
                        
                        {activeTab === 'projects' && !selectedProject && (
                            window.ProjectsDirectory ? (
                                <window.ProjectsDirectory 
                                    projects={projects}
                                    setProjects={setProjects}
                                    trashedProjects={trashedProjects}
                                    setTrashedProjects={setTrashedProjects}
                                    onSelectProject={setSelectedProject}
                                    showNewProjectModal={() => setShowProjectModal(true)}
                                    auth={auth}
                                    exportData={exportData}
                                    importData={importData}
                                />
                            ) : <div className="p-8 text-center text-gray-500">Loading Projects Module...</div>
                        )}

                        {activeTab === 'people' && (
                            window.PeopleModule ? (
                                <window.PeopleModule 
                                    employees={employees}
                                    setEmployees={setEmployees}
                                    departments={departments}
                                    setDepartments={setDepartments}
                                    productionStages={productionStages}
                                    isAdmin={auth.isAdmin}
                                />
                            ) : <div className="p-8 text-center text-gray-500">Loading People Module...</div>
                        )}

                        {/* Executive Dashboard */}
                        {activeTab === 'executive' && (
                            window.ExecutiveDashboard ? (
                                <window.ExecutiveDashboard
                                    projects={projects}
                                    completedWeeks={weeklySchedule.completedWeeks}
                                    scheduleSetup={weeklySchedule.scheduleSetup}
                                    currentWeek={currentWeek}
                                />
                            ) : (
                                <div className="text-center py-20">
                                    <div className="text-6xl mb-4">📊</div>
                                    <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>Executive Dashboard</h2>
                                    <p className="text-gray-600">Loading executive view...</p>
                                </div>
                            )
                        )}

                        {activeTab === 'qa' && (
                            window.QAModule ? (
                                <window.QAModule 
                                    projects={projects}
                                    employees={employees}
                                    currentUser={{ name: auth.currentUser?.name, role: auth.userRole?.name }}
                                    canEdit={auth.canEditTab('qa')}
                                />
                            ) : (
                                <div className="text-center py-20">
                                    <div className="text-6xl mb-4">
                                        <span className="icon-qa" style={{ width: '64px', height: '64px', display: 'inline-block' }}></span>
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>QA Module</h2>
                                    <p className="text-gray-600">Loading QA Module...</p>
                                </div>
                            )
                        )}

                        {activeTab === 'transport' && (
                            <div className="bg-white rounded-lg shadow-sm">
                                {window.TransportApp ? <window.TransportApp canEdit={auth.canEditTab('transport')} /> : <div className="p-8 text-center text-gray-500">Loading Transport Module...</div>}
                            </div>
                        )}

                        {activeTab === 'equipment' && (
                            <div className="bg-white rounded-lg shadow-sm">
                                {window.EquipmentApp ? <window.EquipmentApp /> : <div className="p-8 text-center text-gray-500">Loading Equipment Module...</div>}
                            </div>
                        )}

                        {activeTab === 'precon' && (
                            <PreconModule projects={projects} employees={employees} />
                        )}

                        {activeTab === 'onsite' && (
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">🏗️</div>
                                <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>On-Site Services Module</h2>
                                <p className="text-gray-600">Coming soon - Module integration pending</p>
                            </div>
                        )}

                        {activeTab === 'engineering' && (
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">📋</div>
                                <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>Engineering Module</h2>
                                <p className="text-gray-600">Coming soon - Module integration pending</p>
                            </div>
                        )}

                        {activeTab === 'automation' && (
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">🤖</div>
                                <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>Automation Module</h2>
                                <p className="text-gray-600">Coming soon - Module integration pending</p>
                            </div>
                        )}

                        {activeTab === 'tracker' && (
                            window.ModuleTrackerPanel ? (
                                <window.ModuleTrackerPanel projects={projects} />
                            ) : <div className="p-8 text-center text-gray-500">Loading Tracker Module...</div>
                        )}

                        {activeTab === 'admin' && auth.canAccessAdmin && (
                            <>
                                {/* User Manager - Supabase based */}
                                <div className="bg-white rounded-lg shadow p-6 mb-6">
                                    <h2 className="text-xl font-bold mb-4" style={{color: 'var(--autovol-navy)'}}>User Management</h2>
                                    <p className="text-gray-600 mb-4">Manage users through Supabase Dashboard or the People module.</p>
                                    <a 
                                        href="https://supabase.com/dashboard/project/syreuphexagezawjyjgt/auth/users" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                    >
                                        Open Supabase Auth Dashboard
                                    </a>
                                </div>
                                <div className="mt-6">
                                    {window.DashboardRoleManager ? <window.DashboardRoleManager auth={auth} /> : <div className="p-4 text-gray-500">Loading Role Manager...</div>}
                                </div>
                            </>
                        )}

                        {activeTab === 'admin' && !auth.canAccessAdmin && (
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">🔒</div>
                                <h2 className="text-2xl font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>Access Denied</h2>
                                <p className="text-gray-600">You don't have permission to access this area</p>
                            </div>
                        )}


                        {selectedProject && (
                            <ProjectDetail 
                                project={projects.find(p => p.id === selectedProject.id) || selectedProject}
                                projects={projects}
                                setProjects={setProjects}
                                onBack={() => setSelectedProject(null)}
                                viewMode={viewMode}
                                setViewMode={setViewMode}
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                stageFilter={stageFilter}
                                setStageFilter={setStageFilter}
                            />
                        )}
                    </main>

                    {/* New Project Modal */}
                    {showProjectModal && (
                        <NewProjectModal 
                            onClose={() => setShowProjectModal(false)}
                            onSave={async (project) => {
                                const newProject = { ...project, id: Date.now(), modules: [], createdAt: new Date().toISOString() };
                                
                                // Save to Supabase if available
                                if (window.MODA_SUPABASE_DATA?.isAvailable?.()) {
                                    try {
                                        const savedProject = await window.MODA_SUPABASE_DATA.projects.create(newProject);
                                        console.log('[App] Project saved to Supabase:', savedProject.id);
                                        // Use the Supabase-generated ID
                                        setProjects([...projects, { ...newProject, id: savedProject.id }]);
                                    } catch (err) {
                                        console.error('[App] Error saving project to Supabase:', err);
                                        // Fallback to local state
                                        setProjects([...projects, newProject]);
                                    }
                                } else {
                                    setProjects([...projects, newProject]);
                                }
                                setShowProjectModal(false);
                            }}
                        />
                    )}

                    {/* Data Management Panel (Admin Only) */}
                    {showDataManagement && auth.isAdmin && (
                        <DataManagementPanel
                            onClose={() => setShowDataManagement(false)}
                            projects={projects}
                            setProjects={setProjects}
                            trashedProjects={trashedProjects}
                            setTrashedProjects={setTrashedProjects}
                            employees={employees}
                            setEmployees={setEmployees}
                            trashedEmployees={trashedEmployees}
                            setTrashedEmployees={setTrashedEmployees}
                            exportData={exportData}
                            importData={importData}
                        />
                    )}

                    {/* Keyboard Shortcuts Help Modal */}
                    {showShortcutsHelp && (
                        <div className="shortcuts-modal-overlay" onClick={() => setShowShortcutsHelp(false)}>
                            <div className="shortcuts-modal" onClick={e => e.stopPropagation()}>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold" style={{color: 'var(--autovol-navy)'}}>Keyboard Shortcuts</h2>
                                    <button 
                                        onClick={() => setShowShortcutsHelp(false)}
                                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                                    >
                                        ×
                                    </button>
                                </div>
                                
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Navigation</h3>
                                    <div className="shortcut-row">
                                        <span>Go to tab 1-9</span>
                                        <span className="shortcut-key"><kbd>1</kbd> - <kbd>9</kbd></span>
                                    </div>
                                    <div className="shortcut-row">
                                        <span>Close modal / Go back</span>
                                        <span className="shortcut-key"><kbd>Esc</kbd></span>
                                    </div>
                                </div>
                                
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Actions</h3>
                                    <div className="shortcut-row">
                                        <span>Toggle dark mode</span>
                                        <span className="shortcut-key"><kbd>Ctrl</kbd> + <kbd>D</kbd></span>
                                    </div>
                                    <div className="shortcut-row">
                                        <span>Focus search (Projects tab)</span>
                                        <span className="shortcut-key"><kbd>Ctrl</kbd> + <kbd>F</kbd></span>
                                    </div>
                                    {auth.isAdmin && (
                                        <div className="shortcut-row">
                                            <span>Export data backup</span>
                                            <span className="shortcut-key"><kbd>Ctrl</kbd> + <kbd>E</kbd></span>
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Help</h3>
                                    <div className="shortcut-row">
                                        <span>Show this help</span>
                                        <span className="shortcut-key"><kbd>?</kbd></span>
                                    </div>
                                </div>
                                
                                <div className="mt-6 pt-4 border-t text-center">
                                    <p className="text-xs text-gray-500">
                                        Press <kbd className="bg-gray-100 px-1 rounded">Esc</kbd> to close
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // ============================================================================
        // MODULE TRACKER PANEL - EXTRACTED TO TrackerModule.jsx
        // ============================================================================
        const ENGINEERING_DEPARTMENTS = [
            'Automation', 'Auto Floor/Ceiling', 'Auto Walls', 'Mezzanine', 'Electrical',
            'Wall Set', 'Ceiling Set', 'Soffits', 'Mechanical', 'Plumbing', 'Exteriors',
            'Drywall', 'Roofing', 'Pre-Finish', 'Final Finish', 'Sign-Off', 'Close-Up',
            'QA', 'Transport', 'On-Site', 'General'
        ];

        // Production Dashboard Component - Vertical Department Workflow
        function ProductionDashboard({ projects, setProjects, departmentStatus, onSelectProject, auth }) {
            const activeProjects = projects.filter(p => p.status === 'Active');
            const [selectedProjectId, setSelectedProjectId] = useState(activeProjects[0]?.id || null);
            const [productionTab, setProductionTab] = useState('weekly-board');
            
            // Module Detail State (for Station Board "View Details" button)
            const [selectedModuleDetail, setSelectedModuleDetail] = useState(null);
            const [editMode, setEditMode] = useState(false);
            
            // Report Issue State
            const [showReportIssueModal, setShowReportIssueModal] = useState(false);
            const [reportIssueContext, setReportIssueContext] = useState(null);
            const [engineeringIssues, setEngineeringIssues] = useState(() => {
                const saved = localStorage.getItem('autovol_engineering_issues');
                if (saved && saved !== 'undefined' && saved !== 'null') {
                    try { return JSON.parse(saved); } catch (e) { return []; }
                }
                return [];
            });
            
            // Production weeks integration
            const { weeks, staggerConfig, staggerChangeLog, hasUnsavedStaggerChanges, addWeek, updateWeek, deleteWeek, updateStagger, saveStaggerChanges, revertToStaggerConfig, resetToDefaultStaggers, validateWeek, getCurrentWeek } = useProductionWeeks();
            const currentWeek = getCurrentWeek();
            
            // Weekly schedule integration (from WeeklyBoard.jsx)
            const weeklySchedule = window.WeeklyBoardComponents?.useWeeklySchedule?.() || {
                scheduleSetup: { shift1: { monday: 5, tuesday: 5, wednesday: 5, thursday: 5 }, shift2: { friday: 0, saturday: 0, sunday: 0 } },
                completedWeeks: [],
                updateShiftSchedule: () => {},
                getShiftTotal: () => 0,
                getLineBalance: () => 20,
                completeWeek: () => {},
                getCompletedWeek: () => null,
                getRecentWeeks: () => [],
                deleteCompletedWeek: () => {}
            };
            
            // Save engineering issues to localStorage
            useEffect(() => {
                localStorage.setItem('autovol_engineering_issues', JSON.stringify(engineeringIssues));
            }, [engineeringIssues]);
            
            // Open report issue modal with context
            const openReportIssue = (module, station) => {
                setReportIssueContext({ module, station, project: selectedProject });
                setShowReportIssueModal(true);
            };
            
            // Handle issue submission
            const handleSubmitIssue = (issueData) => {
                const newIssue = {
                    id: `ENG-${Date.now()}`,
                    ...issueData,
                    status: 'open',
                    createdAt: new Date().toISOString(),
                    history: [{
                        action: 'Issue Created',
                        timestamp: new Date().toISOString(),
                        by: issueData.reportedBy
                    }]
                };
                setEngineeringIssues(prev => [newIssue, ...prev]);
                setShowReportIssueModal(false);
                setReportIssueContext(null);
            };
            
            const selectedProject = projects.find(p => p.id === selectedProjectId);
            const modules = selectedProject?.modules || [];
            
            // Sort modules by build sequence (lower = further along)
            const sortedModules = [...modules].sort((a, b) => (a.buildSequence || 0) - (b.buildSequence || 0));
            
            // Categorize modules
            const categorizeModules = () => {
                const scheduled = []; // Not yet in Automation
                const inProduction = []; // Automation through Sign-Off
                const allComplete = []; // Completed Close-Up (all of them)
                
                sortedModules.forEach(module => {
                    const progress = module.stageProgress || {};
                    const autoProgress = Math.max(progress['auto-fc'] || 0, progress['auto-walls'] || 0);
                    const closeUpProgress = progress['close-up'] || 0;
                    
                    if (closeUpProgress === 100) {
                        // Include close-up completion timestamp if available
                        const completedAt = module.stationCompletedAt?.['close-up'] || 0;
                        allComplete.push({ ...module, completedAt });
                    } else if (autoProgress > 0) {
                        inProduction.push(module);
                    } else {
                        scheduled.push(module);
                    }
                });
                
                // Limit to 5 most recently completed (by completion timestamp)
                // For modules without timestamps (legacy), use build sequence as fallback
                const complete = allComplete
                    .sort((a, b) => {
                        if (a.completedAt && b.completedAt) return b.completedAt - a.completedAt;
                        if (a.completedAt && !b.completedAt) return -1;
                        if (!a.completedAt && b.completedAt) return 1;
                        return (b.buildSequence || 0) - (a.buildSequence || 0);
                    })
                    .slice(0, 5)
                    .reverse();  // Oldest at top, newest at bottom
                
                return { scheduled, inProduction, complete };
            };
            

            // Update module progress for a specific station
            const updateModuleProgress = (moduleId, stationId, newProgress) => {
                setProjects(prevProjects => prevProjects.map(project => {
                    if (project.id !== selectedProjectId) return project;
                    
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
                                // Just marked complete - record timestamp
                                stationCompletedAt = { ...stationCompletedAt, [stationId]: Date.now() };
                            } else if (newProgress < 100 && wasComplete) {
                                // Reverted from complete - remove timestamp
                                stationCompletedAt = { ...stationCompletedAt };
                                delete stationCompletedAt[stationId];
                            }
                            
                            return { ...module, stageProgress: updatedProgress, stationCompletedAt };
                        })
                    };
                }));
            };
            
            const { scheduled, inProduction, complete } = categorizeModules();
            
         
            return (
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <h2 className="text-2xl font-bold text-autovol-navy">Production Dashboard</h2>
                        <div className="flex items-center gap-4">
                            {activeProjects.length > 0 && (
                                <select 
                                    value={selectedProjectId || ''}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="border rounded px-3 py-2 font-medium"
                                >
                                    {activeProjects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>
                    
                    {activeProjects.length === 0 ? (
                        <div className="bg-white rounded-lg shadow p-8 text-center">
                            <p className="text-gray-500">No active projects. Go to Projects tab to create one and set status to Active.</p>
                        </div>
                    ) : !selectedProject ? (
                        <div className="bg-white rounded-lg shadow p-8 text-center">
                            <p className="text-gray-500">Select a project to view production.</p>
                        </div>
                    ) : (
                        <>
                            {/* Sub-tabs */}
                            <div className="bg-white rounded-lg shadow">
                                <div className="border-b flex overflow-x-auto">
                                    {[
                                        { id: 'weekly-board', label: 'Weekly Board' },
                                        { id: 'module-status', label: 'Module Status' },
                                        { id: 'staggers', label: 'Station Stagger' },
                                        { id: 'schedule-setup', label: 'Schedule Setup' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setProductionTab(tab.id)}
                                            className={`px-6 py-3 text-sm font-medium transition ${
                                                productionTab === tab.id
                                                    ? 'text-autovol-teal border-b-2 border-autovol-teal'
                                                    : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                                
                                {/* Tab Content */}
                                <div className="p-4">
                                    
                                    
                                    {productionTab === 'module-status' && (
                                        <div className="space-y-6">
                                            {/* Scheduled */}
                                            <div>
                                                <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                                                    Scheduled ({scheduled.length})
                                                    <span className="font-normal text-sm text-gray-500">– Not yet in Automation</span>
                                                </h3>
                                                <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                                                    {scheduled.slice(0, 24).map(module => (
                                                        <div key={module.id} className="border rounded p-2 text-center bg-gray-50">
                                                            <div className="font-mono text-xs font-bold text-gray-600">
                                                                {module.serialNumber?.slice(-4)}
                                                            </div>
                                                            <div className="text-xs text-gray-400">#{module.buildSequence}</div>
                                                        </div>
                                                    ))}
                                                    {scheduled.length > 24 && (
                                                        <div className="border rounded p-2 text-center bg-gray-100 text-gray-500 text-xs">
                                                            +{scheduled.length - 24} more
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* In Production */}
                                            <div>
                                                <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-autovol-teal"></span>
                                                    In Production ({inProduction.length})
                                                    <span className="font-normal text-sm text-gray-500">– Automation through Sign-Off</span>
                                                </h3>
                                                <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                                                    {inProduction.map(module => (
                                                        <div key={module.id} className="border rounded p-2 text-center bg-teal-50 border-autovol-teal">
                                                            <div className="font-mono text-xs font-bold text-gray-800">
                                                                {module.serialNumber?.slice(-4)}
                                                            </div>
                                                            <div className="text-xs text-gray-500">#{module.buildSequence}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            {/* Complete */}
                                            <div>
                                                <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                                    Recently Complete ({complete.length})
                                                    <span className="font-normal text-sm text-gray-500">– Last 5 finished Close-Up</span>
                                                </h3>
                                                <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                                                    {complete.map(module => (
                                                        <div key={module.id} className="border rounded p-2 text-center bg-green-50 border-green-500">
                                                            <div className="font-mono text-xs font-bold text-gray-800">
                                                                {module.serialNumber?.slice(-4)}
                                                            </div>
                                                            <div className="text-xs text-gray-500">#{module.buildSequence}</div>
                                                        </div>
                                                    ))}
                                                    {complete.length === 0 && (
                                                        <div className="text-sm text-gray-400 col-span-full">No completed modules yet</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {productionTab === 'staggers' && (
                                        <StaggerConfigTab 
                                            productionStages={productionStages}
                                            stationGroups={stationGroups}
                                            staggerConfig={staggerConfig}
                                            staggerChangeLog={staggerChangeLog}
                                            hasUnsavedStaggerChanges={hasUnsavedStaggerChanges}
                                            updateStagger={updateStagger}
                                            saveStaggerChanges={saveStaggerChanges}
                                            revertToStaggerConfig={revertToStaggerConfig}
                                            resetToDefaultStaggers={resetToDefaultStaggers}
                                            currentUser={auth.currentUser}
                                            isAdmin={auth.isAdmin}
                                        />
                                    )}
                                    
                                    {productionTab === 'weekly-board' && (
                                        window.WeeklyBoardComponents?.WeeklyBoardTab ? (
                                            <window.WeeklyBoardComponents.WeeklyBoardTab
                                                projects={projects}
                                                productionStages={productionStages}
                                                staggerConfig={staggerConfig}
                                                currentWeek={currentWeek}
                                                weeks={weeks}
                                                scheduleSetup={weeklySchedule.scheduleSetup}
                                                getLineBalance={weeklySchedule.getLineBalance}
                                                completedWeeks={weeklySchedule.completedWeeks}
                                                completeWeek={weeklySchedule.completeWeek}
                                                addWeek={addWeek}
                                                onModuleClick={setSelectedModuleDetail}
                                                setProductionTab={setProductionTab}
                                                setProjects={setProjects}
                                                canEdit={auth.canEditTab('production')}
                                                onReportIssue={(module, station) => {
                                                    setReportIssueContext({ module, station, project: selectedProject });
                                                    setShowReportIssueModal(true);
                                                }}
                                            />
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                <p>Weekly Board component loading...</p>
                                                <p className="text-sm mt-2">If this persists, check that WeeklyBoard.jsx is loaded.</p>
                                            </div>
                                        )
                                    )}
                                    
                                    {productionTab === 'schedule-setup' && (
                                        window.WeeklyBoardComponents?.ScheduleSetupTab ? (
                                            <window.WeeklyBoardComponents.ScheduleSetupTab
                                                scheduleSetup={weeklySchedule.scheduleSetup}
                                                updateShiftSchedule={weeklySchedule.updateShiftSchedule}
                                                getShiftTotal={weeklySchedule.getShiftTotal}
                                                getLineBalance={weeklySchedule.getLineBalance}
                                                weeks={weeks}
                                                currentWeek={currentWeek}
                                                addWeek={addWeek}
                                                updateWeek={updateWeek}
                                                deleteWeek={deleteWeek}
                                                validateWeek={validateWeek}
                                                allModules={activeProjects.flatMap(p => (p.modules || []).map(m => ({ ...m, projectId: p.id, projectName: p.name })))}
                                                projects={projects}
                                                setProjects={setProjects}
                                                canEdit={auth.canEditTab('production')}
                                            />
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                <p>Schedule Setup component loading...</p>
                                                <p className="text-sm mt-2">If this persists, check that WeeklyBoard.jsx is loaded.</p>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                    
                    {/* Report Issue Modal */}
                    {showReportIssueModal && reportIssueContext && (
                        <ReportIssueModal
                            context={reportIssueContext}
                            onSubmit={handleSubmitIssue}
                            onClose={() => {
                                setShowReportIssueModal(false);
                                setReportIssueContext(null);
                            }}
                        />
                    )}
                    
                    {/* Module Detail Modal (for Station Board "View Details" button) */}
                    {selectedModuleDetail && (
                        <ModuleDetailModal 
                            module={selectedModuleDetail}
                            project={selectedProject}
                            projects={projects}
                            setProjects={setProjects}
                            onClose={() => { setSelectedModuleDetail(null); setEditMode(false); }}
                            editMode={editMode}
                            setEditMode={setEditMode}
                        />
                    )}
                </div>
            );
        }

        // ============================================================================
        // REPORT ISSUE MODAL COMPONENT
        // ============================================================================
        function ReportIssueModal({ context, onSubmit, onClose }) {
            const { module, station, project } = context;
            const fileInputRef = useRef(null);
            const [formData, setFormData] = useState({
                title: '',
                category: '',
                urgency: 'medium',
                department: station?.name || '',
                moduleSerial: module?.serialNumber || '',
                projectName: project?.name || '',
                description: '',
                reportedBy: '',
                contactPhone: '',
                location: station?.name || '',
                photos: []
            });
            const [photoPreview, setPhotoPreview] = useState([]);

            const handlePhotoCapture = (e) => {
                const files = Array.from(e.target.files);
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        setPhotoPreview(prev => [...prev, event.target.result]);
                        setFormData(prev => ({
                            ...prev,
                            photos: [...prev.photos, {
                                data: event.target.result,
                                name: file.name,
                                timestamp: new Date().toISOString()
                            }]
                        }));
                    };
                    reader.readAsDataURL(file);
                });
            };

            const removePhoto = (index) => {
                setPhotoPreview(prev => prev.filter((_, i) => i !== index));
                setFormData(prev => ({
                    ...prev,
                    photos: prev.photos.filter((_, i) => i !== index)
                }));
            };

            const handleSubmit = (e) => {
                e.preventDefault();
                if (!formData.title || !formData.category || !formData.reportedBy) {
                    alert('Please fill in Title, Category, and Your Name');
                    return;
                }
                onSubmit(formData);
            };

            return (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-4 border-b sticky top-0 bg-white z-10" style={{borderTopColor: 'var(--autovol-red)', borderTopWidth: '4px'}}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold" style={{color: 'var(--autovol-navy)'}}>
                                        ⚠️ Report Issue to Engineering
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Module: <span className="font-mono font-semibold">{module?.serialNumber}</span>
                                        {station && <> • Station: <span className="font-semibold">{station.name}</span></>}
                                    </p>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-2xl">×</button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Issue Title */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Issue Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    placeholder="Brief description of the issue"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            {/* Category Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Issue Category <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {ENGINEERING_ISSUE_CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setFormData({...formData, category: cat.id})}
                                            className={`p-2 rounded-lg border-2 text-left transition text-sm ${
                                                formData.category === cat.id 
                                                    ? 'border-blue-500 bg-blue-50' 
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <span className="mr-1">{cat.icon}</span>
                                            <span className="font-medium">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Urgency Level */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Urgency Level <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {URGENCY_LEVELS.map(u => (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => setFormData({...formData, urgency: u.id})}
                                            className={`p-2 rounded-lg border-2 text-left transition text-sm ${
                                                formData.urgency === u.id ? 'ring-2 ring-offset-1' : ''
                                            }`}
                                            style={{
                                                borderColor: u.color,
                                                backgroundColor: formData.urgency === u.id ? u.bgColor : 'white'
                                            }}
                                        >
                                            <span className="font-medium" style={{color: u.color}}>{u.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Department & Location */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                    <select
                                        value={formData.department}
                                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    >
                                        <option value="">Select department...</option>
                                        {ENGINEERING_DEPARTMENTS.map(dept => (
                                            <option key={dept} value={dept}>{dept}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location/Station</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                                        placeholder="e.g., Station 5, Bay 3"
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Detailed Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    placeholder="Describe the issue in detail..."
                                    rows={3}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>

                            {/* Photo Capture */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Photos (Optional)</label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    capture="environment"
                                    onChange={handlePhotoCapture}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:bg-gray-50 w-full"
                                >
                                    📷 Add Photos
                                </button>
                                {photoPreview.length > 0 && (
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                        {photoPreview.map((src, idx) => (
                                            <div key={idx} className="relative">
                                                <img src={src} alt={`Photo ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                                                <button
                                                    type="button"
                                                    onClick={() => removePhoto(idx)}
                                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Reporter Info */}
                            <div className="border-t pt-4">
                                <h3 className="font-semibold text-gray-700 mb-3">Your Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Your Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.reportedBy}
                                            onChange={(e) => setFormData({...formData, reportedBy: e.target.value})}
                                            placeholder="Full name"
                                            className="w-full px-3 py-2 border rounded-lg"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={formData.contactPhone}
                                            onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                                            placeholder="(555) 123-4567"
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 px-4 py-2 text-white rounded-lg font-medium" style={{backgroundColor: 'var(--autovol-red)'}}>
                                    📋 Submit Issue
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            );
        }

        // ============================================================================
        // PROJECTS DIRECTORY - EXTRACTED TO ProjectsModule.jsx
        // ============================================================================

        // Project Detail View        // Project Detail View
        function ProjectDetail({ project, projects, setProjects, onBack, viewMode, setViewMode, searchTerm, setSearchTerm, stageFilter, setStageFilter }) {
            const [showImportModal, setShowImportModal] = useState(false);
            const [selectedModule, setSelectedModule] = useState(null);
            const [editMode, setEditMode] = useState(false);
            const [editingModule, setEditingModule] = useState(null);
            const [showLicensePlates, setShowLicensePlates] = useState(false);
            const [showGoOnlineModal, setShowGoOnlineModal] = useState(false);
            const [goOnlineNotification, setGoOnlineNotification] = useState(null);
            const [importNotification, setImportNotification] = useState(null);
            
            // Report Issue State
            const [showReportIssueModal, setShowReportIssueModal] = useState(false);
            const [reportIssueContext, setReportIssueContext] = useState(null);
            const [engineeringIssues, setEngineeringIssues] = useState(() => {
                const saved = localStorage.getItem('autovol_engineering_issues');
                if (saved && saved !== 'undefined' && saved !== 'null') {
                    try { return JSON.parse(saved); } catch (e) { return []; }
                }
                return [];
            });
            
            const [difficultyFilters, setDifficultyFilters] = useState({
                sidewall: false,
                stair: false,
                hr3Wall: false,
                short: false,
                doubleStudio: false,
                sawbox: false
            });
            
            // Get fresh project data from projects array to ensure we have latest modules
            const currentProject = projects.find(p => p.id === project.id) || project;
            const modules = currentProject.modules || [];
            
            // Toggle difficulty filter
            const toggleDifficultyFilter = (key) => {
                setDifficultyFilters(prev => ({ ...prev, [key]: !prev[key] }));
            };
            
            // Check if any difficulty filter is active
            const anyDifficultyFilterActive = Object.values(difficultyFilters).some(v => v);
            
            // Filter modules
            const filteredModules = modules.filter(m => {
                const matchesSearch = !searchTerm || 
                    m.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    m.hitchBLM?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    m.rearBLM?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    String(m.hitchUnit)?.toLowerCase().includes(searchTerm.toLowerCase());
                
                const matchesStage = stageFilter === 'all' || 
                    (m.stageProgress?.[stageFilter] > 0 && m.stageProgress?.[stageFilter] < 100);
                
                // Difficulty filter - show modules that have ANY of the selected difficulties
                const matchesDifficulty = !anyDifficultyFilterActive || (
                    (difficultyFilters.sidewall && m.difficulties?.sidewall) ||
                    (difficultyFilters.stair && m.difficulties?.stair) ||
                    (difficultyFilters.hr3Wall && m.difficulties?.hr3Wall) ||
                    (difficultyFilters.short && m.difficulties?.short) ||
                    (difficultyFilters.doubleStudio && m.difficulties?.doubleStudio) ||
                    (difficultyFilters.sawbox && m.difficulties?.sawbox)
                );
                
                return matchesSearch && matchesStage && matchesDifficulty;
            });

            // Save engineering issues to localStorage
            useEffect(() => {
                localStorage.setItem('autovol_engineering_issues', JSON.stringify(engineeringIssues));
            }, [engineeringIssues]);
            
            // Open report issue modal with context
            const openReportIssue = (module, station) => {
                setReportIssueContext({ module, station: station || null, project: currentProject });
                setShowReportIssueModal(true);
            };
            
            // Handle issue submission
            const handleSubmitIssue = (issueData) => {
                const newIssue = {
                    id: `ENG-${Date.now()}`,
                    ...issueData,
                    status: 'open',
                    createdAt: new Date().toISOString(),
                    history: [{
                        action: 'Issue Created',
                        timestamp: new Date().toISOString(),
                        by: issueData.reportedBy
                    }]
                };
                setEngineeringIssues(prev => [newIssue, ...prev]);
                setShowReportIssueModal(false);
                setReportIssueContext(null);
            };
            
            // Update project modules
            const updateProjectModules = (newModules) => {
                const updatedProjects = projects.map(p => 
                    p.id === project.id ? { ...p, modules: newModules } : p
                );
                setProjects(updatedProjects);
            };

            // Import handler
            const handleImport = (importedModules) => {
                const newModules = importedModules.map((m, idx) => ({
                    ...m,
                    id: Date.now() + idx,
                    stageProgress: productionStages.reduce((acc, stage) => {
                        acc[stage.id] = 0;
                        return acc;
                    }, {})
                }));
                updateProjectModules([...modules, ...newModules]);
                setShowImportModal(false);
                
                // Show success notification
                setImportNotification({
                    message: `Successfully imported ${newModules.length} module${newModules.length !== 1 ? 's' : ''}!`,
                    type: 'success'
                });
                setTimeout(() => setImportNotification(null), 5000);
            };

            // Update project status
            const updateProjectStatus = (newStatus) => {
                const updatedProjects = projects.map(p => 
                    p.id === project.id ? { ...p, status: newStatus } : p
                );
                setProjects(updatedProjects);
            };

            // Get progress color class
            const getProgressClass = (progress) => {
                if (progress === 100) return 'stage-bg-100';
                if (progress >= 75) return 'stage-bg-75';
                if (progress >= 50) return 'stage-bg-50';
                if (progress >= 25) return 'stage-bg-25';
                return 'stage-bg-0';
            };

            // Get current stage for display
            const getCurrentStage = (module) => {
                const stageProgress = module.stageProgress || {};
                for (let i = productionStages.length - 1; i >= 0; i--) {
                    const stage = productionStages[i];
                    if (stageProgress[stage.id] > 0) {
                        return { stage, progress: stageProgress[stage.id] };
                    }
                }
                return { stage: null, progress: 0 };
            };

            return (
                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <button 
                                onClick={onBack}
                                className="text-autovol-red hover:text-autovol-red text-sm mb-2 flex items-center gap-1"
                            >
                                ← Back to Projects
                            </button>
                            <h2 className="text-2xl font-bold text-autovol-navy">{project.name}</h2>
                            <p className="text-gray-500">{project.location}</p>
                            {project.description && <p className="text-sm text-gray-600">{project.description}</p>}
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                    project.status === 'Active' ? 'bg-green-100 text-green-800' :
                                    project.status === 'Complete' ? 'bg-gray-100 text-gray-800' :
                                    project.status === 'Planned' ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {project.status}
                                </span>
                                <span className="text-sm text-gray-600">{modules.length} modules</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {project.status !== 'Active' && modules.length > 0 && (
                                <button
                                    onClick={() => setShowGoOnlineModal(true)}
                                    className="px-4 py-2 btn-secondary rounded-lg transition"
                                >
                                    Go Online
                                </button>
                            )}
                            <button
                                onClick={() => setShowLicensePlates(true)}
                                disabled={modules.length === 0}
                                className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                                    modules.length === 0 
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                        : 'bg-autovol-navy text-white hover:bg-autovol-navy-light'
                                }`}
                            >
                                🏷️ License Plates
                            </button>
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="px-4 py-2 btn-primary rounded-lg transition"
                            >
                                Import Modules
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <input
                                type="text"
                                placeholder="Search serial, BLM, unit..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="px-3 py-2 border rounded-lg flex-1 min-w-48"
                            />
                            <select
                                value={stageFilter}
                                onChange={(e) => setStageFilter(e.target.value)}
                                className="px-3 py-2 border rounded-lg"
                            >
                                <option value="all">All Stages</option>
                                {productionStages.map(stage => (
                                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                                ))}
                            </select>
                            <div className="flex gap-1 border rounded-lg p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-gray-800 text-white' : 'text-gray-600'}`}
                                >
                                    Grid
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-gray-800 text-white' : 'text-gray-600'}`}
                                >
                                    List
                                </button>
                            </div>
                        </div>
                        
                        {/* Difficulty Filters */}
                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t">
                            <span className="text-sm text-gray-600 font-medium">Difficulty Filters:</span>
                            <button
                                onClick={() => toggleDifficultyFilter('sidewall')}
                                className={`px-2 py-1 text-xs rounded-full border transition ${difficultyFilters.sidewall ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'}`}
                            >
                                Sidewall
                            </button>
                            <button
                                onClick={() => toggleDifficultyFilter('stair')}
                                className={`px-2 py-1 text-xs rounded-full border transition ${difficultyFilters.stair ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'}`}
                            >
                                Stair
                            </button>
                            <button
                                onClick={() => toggleDifficultyFilter('hr3Wall')}
                                className={`px-2 py-1 text-xs rounded-full border transition ${difficultyFilters.hr3Wall ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}
                            >
                                3HR-Wall
                            </button>
                            <button
                                onClick={() => toggleDifficultyFilter('short')}
                                className={`px-2 py-1 text-xs rounded-full border transition ${difficultyFilters.short ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-gray-600 border-gray-300 hover:border-yellow-400'}`}
                            >
                                Short
                            </button>
                            <button
                                onClick={() => toggleDifficultyFilter('doubleStudio')}
                                className={`px-2 py-1 text-xs rounded-full border transition ${difficultyFilters.doubleStudio ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
                            >
                                Dbl Studio
                            </button>
                            <button
                                onClick={() => toggleDifficultyFilter('sawbox')}
                                className={`px-2 py-1 text-xs rounded-full border transition ${difficultyFilters.sawbox ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}
                            >
                                Sawbox
                            </button>
                            {anyDifficultyFilterActive && (
                                <button
                                    onClick={() => setDifficultyFilters({ sidewall: false, stair: false, hr3Wall: false, short: false, doubleStudio: false, sawbox: false })}
                                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 underline"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                        
                        <p className="text-sm text-gray-500 mt-2">
                            Showing {filteredModules.length} of {modules.length} modules
                        </p>
                    </div>

                    {/* Module Grid/List */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-4 border-b">
                            <h3 className="font-semibold text-gray-900">Project Modules</h3>
                        </div>
                        
                        {modules.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No modules imported yet. Click "Import Modules" to add modules from Excel.
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredModules.map(module => {
                                    const { stage: currentStage, progress } = getCurrentStage(module);
                                    const hasDifficulties = Object.values(module.difficulties || {}).some(v => v);
                                    
                                    return (
                                        <div 
                                            key={module.id}
                                            onClick={() => setSelectedModule(module)}
                                            className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer"
                                        >
                                            {/* Header with Serial & Stage */}
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="flex items-center gap-1">
                                                        <h4 className="font-bold text-lg text-gray-900">{module.serialNumber}</h4>
                                                        {module.isPrototype && (
                                                            <span 
                                                                className="text-yellow-500 cursor-help" 
                                                                title="Prototype"
                                                                style={{ fontSize: '14px' }}
                                                            >
                                                                ★
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-500">Build Seq: {module.buildSequence}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {currentStage && (
                                                        <span className={`px-2 py-1 text-xs rounded ${getProgressClass(progress)} ${progress === 100 ? 'text-white' : progress >= 50 ? 'text-white' : 'text-gray-800'}`}>
                                                            {currentStage.name}
                                                        </span>
                                                    )}
                                                    {/* Module Actions Menu */}
                                                    <div className="relative group">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); }}
                                                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                                                            title="More options"
                                                        >
                                                            ⋮
                                                        </button>
                                                        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setSelectedModule(module); }}
                                                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                                            >
                                                                👁️ View Details
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setEditingModule(module); }}
                                                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                                            >
                                                                ✏️ Edit Module
                                                            </button>
                                                            <div className="border-t"></div>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); openReportIssue(module, null); }}
                                                                className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                                            >
                                                                ⚠️ Report Issue
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Unit Info */}
                                            <div className="text-sm text-gray-600 mb-2">
                                                <span className="font-medium">Unit:</span> {module.hitchUnit || 'N/A'}
                                            </div>
                                            
                                            {/* Dimensions */}
                                            <div className="flex gap-4 text-sm text-gray-600 mb-3">
                                                <span><strong>W:</strong> {module.moduleWidth}'</span>
                                                <span><strong>L:</strong> {module.moduleLength}'</span>
                                                <span><strong>SF:</strong> {module.squareFootage}</span>
                                            </div>

                                            {/* HITCH/REAR BLM */}
                                            <div className="border-t pt-2 space-y-1 text-sm">
                                                <div className="flex gap-2">
                                                    <span className="text-gray-500 w-12">HITCH:</span>
                                                    <span className="font-medium">{module.hitchBLM || 'N/A'}</span>
                                                    <span className="text-gray-500">|</span>
                                                    <span>{module.hitchRoomType || 'N/A'}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="text-gray-500 w-12">REAR:</span>
                                                    <span className="font-medium">{module.rearBLM || 'N/A'}</span>
                                                    <span className="text-gray-500">|</span>
                                                    <span>{module.rearRoomType || 'N/A'}</span>
                                                </div>
                                            </div>

                                            {/* Difficulty Indicators */}
                                            {hasDifficulties && (
                                                <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t">
                                                    {Object.entries(module.difficulties || {}).map(([key, value]) => 
                                                        value && (
                                                            <span key={key} className={`px-2 py-0.5 text-xs rounded ${difficultyColors[key]}`}>
                                                                {difficultyLabels[key]}
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            )}

                                            {/* Progress Bar */}
                                            {progress > 0 && (
                                                <div className="mt-3">
                                                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                        <span>{currentStage?.name}</span>
                                                        <span>{progress}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div 
                                                            className={`h-2 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-autovol-teal'}`}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial #</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Build Seq</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dimensions</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hitch BLM</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rear BLM</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulties</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredModules.map(module => {
                                            const { stage: currentStage, progress } = getCurrentStage(module);
                                            return (
                                                <tr 
                                                    key={module.id} 
                                                    onClick={() => setSelectedModule(module)}
                                                    className="hover:bg-gray-50 cursor-pointer"
                                                >
                                                    <td className="px-4 py-3 font-medium">
                                                        <span className="flex items-center gap-1">
                                                            {module.serialNumber}
                                                            {module.isPrototype && (
                                                                <span 
                                                                    className="text-yellow-500 cursor-help" 
                                                                    title="Prototype"
                                                                    style={{ fontSize: '12px' }}
                                                                >
                                                                    ★
                                                                </span>
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">{module.buildSequence}</td>
                                                    <td className="px-4 py-3">{module.hitchUnit}</td>
                                                    <td className="px-4 py-3 text-sm">{module.moduleWidth}' x {module.moduleLength}'</td>
                                                    <td className="px-4 py-3">{module.hitchBLM}</td>
                                                    <td className="px-4 py-3">{module.rearBLM}</td>
                                                    <td className="px-4 py-3">
                                                        {currentStage && (
                                                            <span className={`px-2 py-1 text-xs rounded ${getProgressClass(progress)} ${progress >= 50 ? 'text-white' : ''}`}>
                                                                {currentStage.name}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-20 bg-gray-200 rounded-full h-2">
                                                                <div 
                                                                    className={`h-2 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-autovol-teal'}`}
                                                                    style={{ width: `${progress}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-gray-500">{progress}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {Object.entries(module.difficulties || {}).map(([key, value]) => 
                                                                value && (
                                                                    <span key={key} className={`px-1.5 py-0.5 text-xs rounded ${difficultyColors[key]}`}>
                                                                        {difficultyLabels[key]}
                                                                    </span>
                                                                )
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Import Modal */}
                    {showImportModal && (
                        <ImportModal 
                            onClose={() => setShowImportModal(false)}
                            onImport={handleImport}
                        />
                    )}

                    {/* Module Detail Modal */}
                    {selectedModule && (
                        <ModuleDetailModal 
                            module={selectedModule}
                            project={project}
                            projects={projects}
                            setProjects={setProjects}
                            onClose={() => { setSelectedModule(null); setEditMode(false); }}
                            editMode={editMode}
                            setEditMode={setEditMode}
                        />
                    )}

                    {/* License Plate Generator */}
                    {showLicensePlates && (
                        <LicensePlateGenerator
                            project={currentProject}
                            modules={modules}
                            onClose={() => setShowLicensePlates(false)}
                        />
                    )}
                    
                    {/* Report Issue Modal */}
                    {showReportIssueModal && reportIssueContext && (
                        <ReportIssueModal
                            context={reportIssueContext}
                            onSubmit={handleSubmitIssue}
                            onClose={() => {
                                setShowReportIssueModal(false);
                                setReportIssueContext(null);
                            }}
                        />
                    )}
                    
                    {/* Go Online Modal */}
                    {showGoOnlineModal && (
                        <GoOnlineModal
                            project={currentProject}
                            modules={modules}
                            onClose={() => setShowGoOnlineModal(false)}
                            onConfirm={(selectedModuleIds, insertAfterSerial) => {
                                // Update project status to Active
                                const updatedProjects = projects.map(p => {
                                    if (p.id !== project.id) return p;
                                    
                                    // If specific modules selected, mark them as online
                                    const updatedModules = p.modules.map(m => {
                                        if (selectedModuleIds === 'all' || selectedModuleIds.includes(m.id)) {
                                            return { ...m, isOnline: true };
                                        }
                                        return m;
                                    });
                                    
                                    return { ...p, status: 'Active', modules: updatedModules };
                                });
                                setProjects(updatedProjects);
                                setShowGoOnlineModal(false);
                                
                                // Show success notification
                                const count = selectedModuleIds === 'all' ? modules.length : selectedModuleIds.length;
                                setGoOnlineNotification({
                                    message: `Project "${project.name}" is now Active with ${count} module${count !== 1 ? 's' : ''} online!`,
                                    type: 'success'
                                });
                                setTimeout(() => setGoOnlineNotification(null), 5000);
                            }}
                        />
                    )}
                    
                    {/* Go Online Success Notification */}
                    {goOnlineNotification && (
                        <div className="fixed top-4 right-4 z-[200] bg-green-50 border-l-4 border-green-500 text-green-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in">
                            <span className="text-xl">✅</span>
                            <span className="font-medium">{goOnlineNotification.message}</span>
                            <button onClick={() => setGoOnlineNotification(null)} className="text-green-600 hover:text-green-800 ml-2">×</button>
                        </div>
                    )}
                    
                    {/* Import Success Notification */}
                    {importNotification && (
                        <div className="fixed top-4 right-4 z-[200] bg-blue-50 border-l-4 border-blue-500 text-blue-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in">
                            <span className="text-xl">📥</span>
                            <span className="font-medium">{importNotification.message}</span>
                            <button onClick={() => setImportNotification(null)} className="text-blue-600 hover:text-blue-800 ml-2">×</button>
                        </div>
                    )}
                </div>
            );
        }

        // ===== GO ONLINE MODAL =====
        function GoOnlineModal({ project, modules, onClose, onConfirm }) {
            const [mode, setMode] = useState('all'); // 'all' or 'select'
            const [selectedModules, setSelectedModules] = useState(new Set());
            const [insertAfter, setInsertAfter] = useState('');
            
            // Get modules already online (for insert after dropdown)
            const onlineModules = modules.filter(m => m.isOnline);
            
            const toggleModule = (moduleId) => {
                setSelectedModules(prev => {
                    const next = new Set(prev);
                    if (next.has(moduleId)) {
                        next.delete(moduleId);
                    } else {
                        next.add(moduleId);
                    }
                    return next;
                });
            };
            
            const selectAll = () => setSelectedModules(new Set(modules.map(m => m.id)));
            const selectNone = () => setSelectedModules(new Set());
            
            const handleConfirm = () => {
                if (mode === 'all') {
                    onConfirm('all', null);
                } else {
                    onConfirm(Array.from(selectedModules), insertAfter);
                }
            };
            
            return (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b bg-green-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-green-800">Go Online</h2>
                                    <p className="text-sm text-green-600">Activate project: {project.name}</p>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-green-100 rounded-lg text-2xl text-green-600">×</button>
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            {/* Mode Selection */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">Which modules to put online?</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setMode('all')}
                                        className={`p-3 rounded-lg border-2 text-left transition ${
                                            mode === 'all' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="font-semibold text-gray-800">All Modules</div>
                                        <div className="text-sm text-gray-500">{modules.length} modules</div>
                                    </button>
                                    <button
                                        onClick={() => setMode('select')}
                                        className={`p-3 rounded-lg border-2 text-left transition ${
                                            mode === 'select' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="font-semibold text-gray-800">Select Modules</div>
                                        <div className="text-sm text-gray-500">e.g., prototypes only</div>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Module Selection (if select mode) */}
                            {mode === 'select' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-semibold text-gray-700">
                                            Select Modules ({selectedModules.size} selected)
                                        </label>
                                        <div className="flex gap-2">
                                            <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">Select All</button>
                                            <button onClick={selectNone} className="text-xs text-gray-500 hover:underline">Clear</button>
                                        </div>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                                        {modules.map(m => (
                                            <label key={m.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedModules.has(m.id)}
                                                    onChange={() => toggleModule(m.id)}
                                                    className="w-4 h-4 text-green-600 rounded"
                                                />
                                                <span className="font-mono text-sm">{m.serialNumber}</span>
                                                {m.isPrototype && <span className="text-yellow-500 text-xs">★ Prototype</span>}
                                                <span className="text-xs text-gray-400 ml-auto">#{m.buildSequence}</span>
                                            </label>
                                        ))}
                                    </div>
                                    
                                    {/* Insert After (for prototypes) */}
                                    {onlineModules.length > 0 && (
                                        <div className="mt-3">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Insert after existing module (optional)
                                            </label>
                                            <select
                                                value={insertAfter}
                                                onChange={(e) => setInsertAfter(e.target.value)}
                                                className="w-full border rounded-lg px-3 py-2 text-sm"
                                            >
                                                <option value="">At end of schedule</option>
                                                {onlineModules.map(m => (
                                                    <option key={m.id} value={m.serialNumber}>
                                                        After {m.serialNumber} (#{m.buildSequence})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Summary */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="text-sm text-gray-600">
                                    <strong>Summary:</strong> Project will be set to <span className="text-green-600 font-semibold">Active</span> status with{' '}
                                    {mode === 'all' ? (
                                        <span className="font-semibold">{modules.length} modules</span>
                                    ) : (
                                        <span className="font-semibold">{selectedModules.size} selected modules</span>
                                    )}{' '}
                                    ready for production scheduling.
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 border-t flex justify-end gap-2">
                            <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={mode === 'select' && selectedModules.size === 0}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Go Online
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // ===== LICENSE PLATE GENERATOR =====
        function LicensePlateGenerator({ project, modules, onClose }) {
            const [selectedModules, setSelectedModules] = useState(new Set(modules.map((_, i) => i)));
            const [searchTerm, setSearchTerm] = useState('');
            const [buildingFilters, setBuildingFilters] = useState(new Set());
            const [levelFilters, setLevelFilters] = useState(new Set());
            const [difficultyFilters, setDifficultyFilters] = useState(new Set());
            const [unitTypeFilters, setUnitTypeFilters] = useState(new Set());
            const [seqFrom, setSeqFrom] = useState('');
            const [seqTo, setSeqTo] = useState('');
            const [previewModule, setPreviewModule] = useState(modules[0] || null);
            const [previewSide, setPreviewSide] = useState('H');
            const [pageSize, setPageSize] = useState('letter');
            const [footerNotes, setFooterNotes] = useState('');
            const [isGenerating, setIsGenerating] = useState(false);

            const baseUrl = window.location.origin + window.location.pathname;
            const pageSizes = {
                letter: { width: 612, height: 792, label: 'Letter (8.5" × 11")' },
                legal: { width: 612, height: 1008, label: 'Legal (8.5" × 14")' },
                tabloid: { width: 792, height: 1224, label: 'Tabloid (11" × 17")' }
            };

            // Extract filter options
            const filterOptions = useMemo(() => {
                const buildings = new Map();
                const levels = new Map();
                const difficulties = new Map();
                const unitTypes = new Map();
                
                modules.forEach((module) => {
                    // Extract from BLM ID (hitchBLM) for Building/Level
                    const blmData = extractFromBLM(module.hitchBLM || module.serialNumber || '');
                    if (blmData.building !== 'OTHER') {
                        buildings.set(blmData.building, (buildings.get(blmData.building) || 0) + 1);
                    }
                    if (blmData.level !== 'OTHER') {
                        levels.set(blmData.level, (levels.get(blmData.level) || 0) + 1);
                    }
                    
                    const indicators = getLicensePlateIndicators(module);
                    indicators.forEach(ind => {
                        difficulties.set(ind.key, (difficulties.get(ind.key) || 0) + 1);
                    });
                    
                    const unitType = extractUnitType(module.hitchUnit || module.unitType || '');
                    unitTypes.set(unitType, (unitTypes.get(unitType) || 0) + 1);
                });
                
                // Sort buildings and levels naturally (B1, B2, B3... and L0, L1, L2...)
                const sortNatural = (a, b) => {
                    const numA = parseInt(a[0].slice(1)) || 0;
                    const numB = parseInt(b[0].slice(1)) || 0;
                    return numA - numB;
                };
                
                return {
                    buildings: Array.from(buildings.entries()).sort(sortNatural),
                    levels: Array.from(levels.entries()).sort(sortNatural),
                    difficulties: Array.from(difficulties.entries()),
                    unitTypes: Array.from(unitTypes.entries()).sort((a, b) => a[0].localeCompare(b[0]))
                };
            }, [modules]);

            // Filter modules
            const filteredModules = useMemo(() => {
                return modules.filter((module) => {
                    if (searchTerm) {
                        const term = searchTerm.toLowerCase();
                        const serial = String(module.serialNumber || '').toLowerCase();
                        const buildSeq = String(module.buildSequence || '').toLowerCase();
                        const unitType = String(module.hitchUnit || module.unitType || '').toLowerCase();
                        const blm = String(module.hitchBLM || '').toLowerCase();
                        if (!serial.includes(term) && !buildSeq.includes(term) && !unitType.includes(term) && !blm.includes(term)) return false;
                    }
                    // Building filter
                    if (buildingFilters.size > 0) {
                        const blmData = extractFromBLM(module.hitchBLM || module.serialNumber || '');
                        if (!buildingFilters.has(blmData.building)) return false;
                    }
                    // Level filter
                    if (levelFilters.size > 0) {
                        const blmData = extractFromBLM(module.hitchBLM || module.serialNumber || '');
                        if (!levelFilters.has(blmData.level)) return false;
                    }
                    if (difficultyFilters.size > 0) {
                        const indicators = getLicensePlateIndicators(module);
                        const indicatorKeys = indicators.map(i => i.key);
                        if (!Array.from(difficultyFilters).some(f => indicatorKeys.includes(f))) return false;
                    }
                    if (unitTypeFilters.size > 0) {
                        const unitType = extractUnitType(module.hitchUnit || module.unitType || '');
                        if (!unitTypeFilters.has(unitType)) return false;
                    }
                    const seq = parseInt(module.buildSequence) || 0;
                    if (seqFrom && seq < parseInt(seqFrom)) return false;
                    if (seqTo && seq > parseInt(seqTo)) return false;
                    return true;
                });
            }, [modules, searchTerm, buildingFilters, levelFilters, difficultyFilters, unitTypeFilters, seqFrom, seqTo]);

            const toggleFilter = (set, setFn, value) => {
                const newSet = new Set(set);
                newSet.has(value) ? newSet.delete(value) : newSet.add(value);
                setFn(newSet);
            };

            const clearFilters = () => {
                setBuildingFilters(new Set());
                setLevelFilters(new Set());
                setDifficultyFilters(new Set());
                setUnitTypeFilters(new Set());
                setSeqFrom('');
                setSeqTo('');
                setSearchTerm('');
            };

            const hasActiveFilters = buildingFilters.size > 0 || levelFilters.size > 0 || difficultyFilters.size > 0 || unitTypeFilters.size > 0 || seqFrom || seqTo || searchTerm;

            const selectAllFiltered = () => {
                const indices = filteredModules.map(m => modules.indexOf(m));
                setSelectedModules(new Set(indices));
            };

            const selectNone = () => setSelectedModules(new Set());

            const toggleModuleSelection = (moduleIdx) => {
                const newSelected = new Set(selectedModules);
                newSelected.has(moduleIdx) ? newSelected.delete(moduleIdx) : newSelected.add(moduleIdx);
                setSelectedModules(newSelected);
            };

            const selectedInFiltered = Array.from(selectedModules).filter(idx => filteredModules.includes(modules[idx])).length;

            // PDF Generation
            const generatePDF = async () => {
                const selectedArray = Array.from(selectedModules).filter(idx => filteredModules.includes(modules[idx])).sort((a, b) => {
                    const seqA = parseInt(modules[a].buildSequence) || 0;
                    const seqB = parseInt(modules[b].buildSequence) || 0;
                    return seqA - seqB;
                });
                if (selectedArray.length === 0) return alert('Please select at least one module');
                setIsGenerating(true);
                try {
                    const { jsPDF } = window.jspdf;
                    const size = pageSizes[pageSize];
                    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: [size.width, size.height] });
                    let isFirstPage = true;
                    for (const idx of selectedArray) {
                        const module = modules[idx];
                        if (!isFirstPage) doc.addPage();
                        isFirstPage = false;
                        drawPlate(doc, module, 'H', size);
                        doc.addPage();
                        drawPlate(doc, module, 'R', size);
                    }
                    doc.save(`License_Plates_${project.name.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('en-US', {month:'2-digit',day:'2-digit',year:'2-digit'}).replace(/\//g,'-')}.pdf`);
                } catch (error) {
                    alert('Error generating PDF: ' + error.message);
                } finally {
                    setIsGenerating(false);
                }
            };

            const drawPlate = (doc, module, side, size) => {
                const { width, height } = size;
                const centerX = width / 2;
                const scale = height > 900 ? (height > 1100 ? 1.3 : 1.15) : 1;
                const serial = module.serialNumber || '';
                const buildSeq = module.buildSequence || '';
                const blm = side === 'H' ? (module.hitchBLM || '') : (module.rearBLM || '');
                const unitType = module.hitchUnit || module.unitType || '';
                const indicators = getLicensePlateIndicators(module);
                
                // Get shop drawing URL for this module's BLM
                const shopDrawingLinks = project.shopDrawingLinks || {};
                const shopDrawingUrl = shopDrawingLinks[blm] || '';
                
                let y = 50 * scale;
                doc.setFontSize(14 * scale).setFont('helvetica', 'bold');
                doc.text(`PROJECT: ${project.name.toUpperCase()}`, centerX, y, { align: 'center' });
                y += 18 * scale;
                doc.text(`LOCATION: ${(project.location || '').toUpperCase()}`, centerX, y, { align: 'center' });
                y += 35 * scale;
                doc.setFontSize(36 * scale).text(`#${buildSeq}`, centerX, y, { align: 'center' });
                y += 45 * scale;
                doc.setFontSize(42 * scale).text(String(serial), centerX, y, { align: 'center' });
                y += 55 * scale;
                doc.setFontSize(54 * scale).text(`(${side}) - ${blm}`, centerX, y, { align: 'center' });
                y += 50 * scale;
                if (indicators.length > 0) {
                    doc.setTextColor(220, 38, 38).setFontSize(24 * scale);
                    doc.text(indicators.map(i => i.label).join('; '), centerX, y, { align: 'center' });
                    doc.setTextColor(0, 0, 0);
                }
                y += 35 * scale;
                doc.setFontSize(32 * scale).text(String(unitType).toUpperCase(), centerX, y, { align: 'center' });
                y += 50 * scale;
                
                // Only show QR code if shop drawing URL exists
                if (shopDrawingUrl) {
                    doc.setFontSize(8 * scale).setFont('helvetica', 'bold');
                    doc.text('Shop Drawing Package Link', centerX, y, { align: 'center' });
                    y += 12 * scale;
                    const qr = qrcode(0, 'M');
                    qr.addData(shopDrawingUrl);
                    qr.make();
                    const qrSize = 100 * scale;
                    doc.addImage(qr.createDataURL(4, 0), 'PNG', centerX - qrSize/2, y, qrSize, qrSize);
                    y += qrSize + 12 * scale;
                    doc.setFontSize(8 * scale).setFont('helvetica', 'normal');
                    doc.text('Scan to open shop drawing', centerX, y, { align: 'center' });
                }
                
                let footerY = height - 50 * scale;
                doc.setFontSize(10 * scale);
                doc.text(new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }), centerX, footerY, { align: 'center' });
                if (footerNotes?.trim()) {
                    doc.setFont('helvetica', 'italic').setFontSize(9 * scale);
                    doc.text(footerNotes.trim(), centerX, footerY - 15 * scale, { align: 'center' });
                }
            };

            // Filter Chip Component
            const FilterChip = ({ label, count, selected, onClick, color = 'blue' }) => {
                const colors = {
                    blue: selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400',
                    orange: selected ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400',
                    purple: selected ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400',
                    red: selected ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:border-red-400',
                    yellow: selected ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-400',
                    green: selected ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:border-green-400',
                    pink: selected ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-gray-700 border-gray-300 hover:border-pink-400',
                };
                return (
                    <button onClick={onClick} className={`px-3 py-1.5 rounded-full border text-sm font-medium flex items-center gap-1.5 transition ${colors[color]}`}>
                        {label}
                        {count !== undefined && <span className={`text-xs px-1.5 rounded-full ${selected ? 'bg-white/30' : 'bg-gray-200'}`}>{count}</span>}
                    </button>
                );
            };

            const difficultyColors = { 'PROTO': 'pink', 'STAIR': 'purple', '3HR': 'red', 'SW': 'orange', 'SHORT': 'yellow', 'DBL': 'blue', 'SAWBOX': 'green' };

            // Plate Preview Component
            const PlatePreview = ({ module, side }) => {
                if (!module) return <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">Select a module to preview</div>;
                const serial = module.serialNumber || '';
                const buildSeq = module.buildSequence || '';
                const blm = side === 'H' ? (module.hitchBLM || '') : (module.rearBLM || '');
                const unitType = module.hitchUnit || module.unitType || '';
                const indicators = getLicensePlateIndicators(module);
                const shopDrawingLinks = project.shopDrawingLinks || {};
                const shopDrawingUrl = shopDrawingLinks[blm] || '';
                return (
                    <div className="bg-white border-2 border-gray-400 rounded p-4 w-64 text-center mx-auto shadow-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
                        <div className="text-xs font-bold text-gray-700">PROJECT: {project.name.toUpperCase()}</div>
                        <div className="text-xs font-bold text-gray-700 mb-2">LOCATION: {(project.location || '').toUpperCase()}</div>
                        <div className="text-3xl font-bold text-gray-900">#{buildSeq}</div>
                        <div className="text-2xl font-bold text-gray-800 my-1">{serial}</div>
                        <div className="text-4xl font-bold my-2" style={{ color: 'var(--autovol-navy)' }}>({side}) - {blm}</div>
                        {indicators.length > 0 && <div className="text-red-600 font-bold text-sm my-1">{indicators.map(i => i.label).join('; ')}</div>}
                        <div className="text-xl font-bold text-gray-800 my-1">{String(unitType).toUpperCase()}</div>
                        {shopDrawingUrl ? (
                            <div className="my-3">
                                <div className="text-xs font-bold text-gray-600 mb-1">Shop Drawing Package Link</div>
                                <img src={generateQRCode(shopDrawingUrl)} className="w-20 h-20 mx-auto" alt="QR Code" />
                                <div className="text-xs text-gray-500 mt-1">Scan to open shop drawing</div>
                            </div>
                        ) : (
                            <div className="my-3 py-4 text-xs text-gray-400 italic">No shop drawing link</div>
                        )}
                        {footerNotes && <div className="text-xs italic text-gray-600 my-1">{footerNotes}</div>}
                        <div className="text-xs text-gray-500 border-t pt-2 mt-2">
                            <div>{new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}</div>
                        </div>
                    </div>
                );
            };

            return (
                <div className="fixed inset-0 bg-autovol-gray z-50 overflow-auto">
                    {/* Header */}
                    <div className="bg-autovol-navy text-white p-4 sticky top-0 z-10 shadow-lg">
                        <div className="max-w-7xl mx-auto flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={onClose} className="hover:bg-autovol-navy-light p-2 rounded flex items-center gap-1">
                                    <span>←</span> Back
                                </button>
                                <div>
                                    <h1 className="text-xl font-bold flex items-center gap-2">🏷️ License Plate Generator</h1>
                                    <p className="text-blue-200 text-sm">{project.name} • {modules.length} modules</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                            {/* Filters Column */}
                            <div className="lg:col-span-1 space-y-4">
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h3 className="font-bold text-autovol-navy mb-3">🏢 Building</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {filterOptions.buildings.length > 0 ? filterOptions.buildings.map(([building, count]) => (
                                            <FilterChip key={building} label={building} count={count} selected={buildingFilters.has(building)} onClick={() => toggleFilter(buildingFilters, setBuildingFilters, building)} color="blue" />
                                        )) : <p className="text-sm text-gray-500">No building data</p>}
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h3 className="font-bold text-autovol-navy mb-3">📋Š Level</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {filterOptions.levels.length > 0 ? filterOptions.levels.map(([level, count]) => (
                                            <FilterChip key={level} label={level} count={count} selected={levelFilters.has(level)} onClick={() => toggleFilter(levelFilters, setLevelFilters, level)} color="purple" />
                                        )) : <p className="text-sm text-gray-500">No level data</p>}
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h3 className="font-bold text-autovol-navy mb-3">⚠ Difficulty</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {filterOptions.difficulties.map(([diff, count]) => (
                                            <FilterChip key={diff} label={diff} count={count} selected={difficultyFilters.has(diff)} onClick={() => toggleFilter(difficultyFilters, setDifficultyFilters, diff)} color={difficultyColors[diff] || 'blue'} />
                                        ))}
                                    </div>
                                    {filterOptions.difficulties.length === 0 && <p className="text-sm text-gray-500">No difficulty indicators</p>}
                                </div>
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h3 className="font-bold text-autovol-navy mb-3">🏠 Unit Type</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {filterOptions.unitTypes.map(([type, count]) => (
                                            <FilterChip key={type} label={type} count={count} selected={unitTypeFilters.has(type)} onClick={() => toggleFilter(unitTypeFilters, setUnitTypeFilters, type)} color="green" />
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h3 className="font-bold text-autovol-navy mb-3">📢 Sequence Range</h3>
                                    <div className="flex items-center gap-2">
                                        <input type="number" placeholder="From" value={seqFrom} onChange={(e) => setSeqFrom(e.target.value)} className="w-20 border rounded px-2 py-1.5 text-sm" min="1" />
                                        <span className="text-gray-500">to</span>
                                        <input type="number" placeholder="To" value={seqTo} onChange={(e) => setSeqTo(e.target.value)} className="w-20 border rounded px-2 py-1.5 text-sm" min="1" />
                                    </div>
                                </div>
                                {hasActiveFilters && (
                                    <button onClick={clearFilters} className="w-full py-2 text-sm text-autovol-red hover:bg-red-50 rounded-lg border border-red-200 font-medium">
                                        ✕ Clear All Filters
                                    </button>
                                )}
                            </div>

                            {/* Module List */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-lg shadow">
                                    <div className="p-4 border-b">
                                        <div className="flex flex-wrap items-center gap-3 mb-3">
                                            <h3 className="font-bold text-autovol-navy">Modules</h3>
                                            <span className="text-sm text-gray-500">{filteredModules.length} of {modules.length} shown</span>
                                            <div className="flex-1" />
                                            <button onClick={selectAllFiltered} className="text-sm text-autovol-teal hover:underline font-medium">Select All</button>
                                            <button onClick={selectNone} className="text-sm text-gray-600 hover:underline font-medium">Select None</button>
                                        </div>
                                        <input type="text" placeholder="Search by serial, sequence, or unit type..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                                    </div>
                                    <div className="max-h-[500px] overflow-y-auto">
                                        {filteredModules.length === 0 ? (
                                            <div className="p-8 text-center text-gray-500">
                                                <div className="text-4xl mb-2">📍</div>
                                                <p>No modules match your filters</p>
                                                <button onClick={clearFilters} className="mt-2 text-autovol-teal hover:underline font-medium">Clear filters</button>
                                            </div>
                                        ) : (
                                            filteredModules.map((module) => {
                                                const idx = modules.indexOf(module);
                                                const isSelected = selectedModules.has(idx);
                                                const indicators = getLicensePlateIndicators(module);
                                                return (
                                                    <div key={idx} className={`p-3 border-b flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`} onClick={() => toggleModuleSelection(idx)}>
                                                        <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 rounded" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-gray-900">#{module.buildSequence}</span>
                                                                <span className="text-gray-700">{module.serialNumber}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                <span>{module.hitchUnit || module.unitType}</span>
                                                                <span>•</span>
                                                                <span>H:{module.hitchBLM}</span>
                                                                <span>R:{module.rearBLM}</span>
                                                            </div>
                                                            {indicators.length > 0 && (
                                                                <div className="flex gap-1 mt-1">
                                                                    {indicators.map((ind, i) => (
                                                                        <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">{ind.label}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button onClick={(e) => { e.stopPropagation(); setPreviewModule(module); }} className="p-2 text-gray-400 hover:text-autovol-teal hover:bg-teal-50 rounded" title="Preview">👁</button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Preview & Generate */}
                            <div className="lg:col-span-1 space-y-4">
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h3 className="font-bold text-autovol-navy mb-3">Preview</h3>
                                    <div className="flex justify-center gap-2 mb-4">
                                        <button onClick={() => setPreviewSide('H')} className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${previewSide === 'H' ? 'bg-autovol-navy text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Hitch (H)</button>
                                        <button onClick={() => setPreviewSide('R')} className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${previewSide === 'R' ? 'bg-autovol-navy text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Rear (R)</button>
                                    </div>
                                    <PlatePreview module={previewModule} side={previewSide} />
                                </div>
                                <div className="bg-white rounded-lg shadow p-4">
                                    <h3 className="font-bold text-autovol-navy mb-3">PDF Settings</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Page Size</label>
                                            <select value={pageSize} onChange={(e) => setPageSize(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                                                {Object.entries(pageSizes).map(([key, val]) => (<option key={key} value={key}>{val.label}</option>))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Footer Notes</label>
                                            <textarea value={footerNotes} onChange={(e) => setFooterNotes(e.target.value)} placeholder="e.g., Rev 2, Updated 11/23..." className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} maxLength={100} />
                                            <p className="text-xs text-gray-500 mt-1">{footerNotes.length}/100</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg shadow p-4">
                                    <div className="bg-autovol-teal-light rounded-lg p-3 mb-4 text-sm">
                                        <div className="flex justify-between mb-1"><span className="text-gray-600">Selected Modules:</span><span className="font-bold text-gray-900">{selectedInFiltered}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-600">Total Pages:</span><span className="font-bold text-autovol-teal">{selectedInFiltered * 2}</span></div>
                                    </div>
                                    <button onClick={generatePDF} disabled={isGenerating || selectedInFiltered === 0} className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-colors ${isGenerating || selectedInFiltered === 0 ? 'bg-gray-400 cursor-not-allowed' : 'btn-primary'}`}>
                                        {isGenerating ? (<><span className="animate-spin">⏳</span>Generating...</>) : (<>📋„ Generate {selectedInFiltered * 2} Plates</>)}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Module Detail Modal
        function ModuleDetailModal({ module, project, projects, setProjects, onClose, editMode, setEditMode }) {
            const [editingModule, setEditingModule] = useState({ ...module });
            
            // Close on Escape key
            useEffect(() => {
                const handleEscapeKey = (e) => {
                    if (e.key === 'Escape') {
                        onClose();
                    }
                };
                document.addEventListener('keydown', handleEscapeKey);
                return () => document.removeEventListener('keydown', handleEscapeKey);
            }, [onClose]);

            const handleSave = () => {
                const updatedProjects = projects.map(p => {
                    if (p.id === project.id) {
                        return {
                            ...p,
                            modules: p.modules.map(m => m.id === module.id ? editingModule : m)
                        };
                    }
                    return p;
                });
                setProjects(updatedProjects);
                
                // DUAL-WRITE: When close-up hits 100%, update unified layer to "Ready for Yard"
                const closeUpProgress = editingModule.stageProgress?.['close-up'] || 0;
                const wasCloseUpComplete = module.stageProgress?.['close-up'] === 100;
                
                if (closeUpProgress === 100 && !wasCloseUpComplete) {
                    // Module just completed production - mark as Ready for Yard
                    console.log(`[MODA] Module ${editingModule.serialNumber} completed close-up - marking Ready for Yard`);
                    
                    // IMPORTANT: Save to localStorage IMMEDIATELY before sync
                    // React setState is async, so migrateFromProjects would read stale data
                    localStorage.setItem('autovol_projects', JSON.stringify(updatedProjects));
                    console.log(`[MODA] Saved project data to localStorage`);
                    
                    // Now sync to unified layer with fresh data
                    MODA_UNIFIED.migrateFromProjects();
                    
                    // Then update transport status to 'ready' (Ready for Yard)
                    MODA_UNIFIED.updateTransport(
                        editingModule.id,
                        { 
                            status: MODA_UNIFIED.TRANSPORT_STAGES.READY,
                            completedProductionAt: new Date().toISOString()
                        },
                        'station-board'
                    );
                    
                    console.log(`[MODA] Module ${editingModule.serialNumber} now in Yard phase - Ready for Transport`);
                }
                
                setEditMode(false);
                onClose();
            };

            const updateField = (field, value) => {
                setEditingModule(prev => ({ ...prev, [field]: value }));
            };

            const updateStageProgress = (stageId, value) => {
                setEditingModule(prev => ({
                    ...prev,
                    stageProgress: { ...prev.stageProgress, [stageId]: parseInt(value) }
                }));
            };

            const displayModule = editMode ? editingModule : module;

            const handleOpenShopDrawing = () => {
                const shopDrawingLinks = project?.shopDrawingLinks || {};
                const blmToCheck = [displayModule.hitchBLM, displayModule.rearBLM].filter(Boolean);
                let foundUrl = null;
                
                for (const blm of blmToCheck) {
                    if (shopDrawingLinks[blm]) {
                        foundUrl = shopDrawingLinks[blm];
                        break;
                    }
                }
                
                if (foundUrl) {
                    window.open(foundUrl, '_blank');
                } else {
                    const blmList = blmToCheck.length > 0 ? blmToCheck.join(', ') : 'No BLM';
                    alert(`Shop Drawing Not Found\n\nNo shop drawing link found for module ${displayModule.serialNumber} (BLM: ${blmList}).\n\nTo add shop drawing links, go to Projects → Edit Project → Shop Drawing Links.`);
                }
            };

            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-autovol-navy">{displayModule.serialNumber}</h2>
                                    <p className="text-gray-500">Build Sequence: {displayModule.buildSequence}</p>
                                </div>
                                <div className="flex gap-2">
                                    {editMode ? (
                                        <>
                                            <button onClick={handleSave} className="px-3 py-1 btn-secondary rounded">Save</button>
                                            <button onClick={() => { setEditMode(false); setEditingModule({ ...module }); }} className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Cancel</button>
                                        </>
                                    ) : (
                                        <button onClick={() => setEditMode(true)} className="px-3 py-1 btn-primary rounded">Edit</button>
                                    )}
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                                </div>
                            </div>
                            
                            {/* Shop Drawing Button */}
                            <div className="mb-6">
                                <button
                                    onClick={handleOpenShopDrawing}
                                    className="w-full py-3 bg-autovol-navy text-white rounded-lg font-medium hover:bg-autovol-navy-light transition flex items-center justify-center gap-2"
                                >
                                    <span>📐</span> Open Shop Drawing
                                </button>
                            </div>

                            {/* Dimensions */}
                            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <span className="text-sm text-gray-500">Width</span>
                                    {editMode ? (
                                        <input type="number" value={displayModule.moduleWidth} onChange={(e) => updateField('moduleWidth', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                    ) : (
                                        <p className="font-semibold">{displayModule.moduleWidth}'</p>
                                    )}
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Length</span>
                                    {editMode ? (
                                        <input type="number" value={displayModule.moduleLength} onChange={(e) => updateField('moduleLength', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                    ) : (
                                        <p className="font-semibold">{displayModule.moduleLength}'</p>
                                    )}
                                </div>
                                <div>
                                    <span className="text-sm text-gray-500">Square Footage</span>
                                    {editMode ? (
                                        <input type="number" value={displayModule.squareFootage} onChange={(e) => updateField('squareFootage', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                    ) : (
                                        <p className="font-semibold">{displayModule.squareFootage ? parseFloat(displayModule.squareFootage).toFixed(2) : '—'} SF</p>
                                    )}
                                </div>
                            </div>

                            {/* HITCH Details */}
                            <div className="mb-4">
                                <h3 className="font-semibold text-gray-700 mb-2">HITCH Side</h3>
                                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
                                    <div>
                                        <span className="text-gray-500">BLM ID</span>
                                        {editMode ? (
                                            <input type="text" value={displayModule.hitchBLM || ''} onChange={(e) => updateField('hitchBLM', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                        ) : (
                                            <p className="font-medium">{displayModule.hitchBLM}</p>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Unit</span>
                                        {editMode ? (
                                            <input type="text" value={displayModule.hitchUnit || ''} onChange={(e) => updateField('hitchUnit', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                        ) : (
                                            <p className="font-medium">{displayModule.hitchUnit}</p>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Room</span>
                                        {editMode ? (
                                            <input type="text" value={displayModule.hitchRoom || ''} onChange={(e) => updateField('hitchRoom', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                        ) : (
                                            <p className="font-medium">{displayModule.hitchRoom}</p>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Room Type</span>
                                        {editMode ? (
                                            <input type="text" value={displayModule.hitchRoomType || ''} onChange={(e) => updateField('hitchRoomType', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                        ) : (
                                            <p className="font-medium">{displayModule.hitchRoomType}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* REAR Details */}
                            <div className="mb-4">
                                <h3 className="font-semibold text-gray-700 mb-2">REAR Side</h3>
                                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg text-sm">
                                    <div>
                                        <span className="text-gray-500">BLM ID</span>
                                        {editMode ? (
                                            <input type="text" value={displayModule.rearBLM || ''} onChange={(e) => updateField('rearBLM', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                        ) : (
                                            <p className="font-medium">{displayModule.rearBLM}</p>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Unit</span>
                                        {editMode ? (
                                            <input type="text" value={displayModule.rearUnit || ''} onChange={(e) => updateField('rearUnit', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                        ) : (
                                            <p className="font-medium">{displayModule.rearUnit}</p>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Room</span>
                                        {editMode ? (
                                            <input type="text" value={displayModule.rearRoom || ''} onChange={(e) => updateField('rearRoom', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                        ) : (
                                            <p className="font-medium">{displayModule.rearRoom}</p>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Room Type</span>
                                        {editMode ? (
                                            <input type="text" value={displayModule.rearRoomType || ''} onChange={(e) => updateField('rearRoomType', e.target.value)} className="w-full mt-1 px-2 py-1 border rounded" />
                                        ) : (
                                            <p className="font-medium">{displayModule.rearRoomType}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Difficulty Indicators */}
                            <div className="mb-4">
                                <h3 className="font-semibold text-gray-700 mb-2">Difficulty Indicators</h3>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(difficultyLabels).map(([key, label]) => (
                                        <label key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${
                                            displayModule.difficulties?.[key] ? difficultyColors[key] : 'bg-gray-100'
                                        }`}>
                                            <input
                                                type="checkbox"
                                                checked={displayModule.difficulties?.[key] || false}
                                                onChange={(e) => {
                                                    if (editMode) {
                                                        setEditingModule(prev => ({
                                                            ...prev,
                                                            difficulties: { ...prev.difficulties, [key]: e.target.checked }
                                                        }));
                                                    }
                                                }}
                                                disabled={!editMode}
                                                className="rounded"
                                            />
                                            <span className="text-sm">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Stage Progress */}
                            <div>
                                <h3 className="font-semibold text-gray-700 mb-2">Production Progress</h3>
                                <div className="space-y-2">
                                    {productionStages.map(stage => {
                                        const progress = displayModule.stageProgress?.[stage.id] || 0;
                                        return (
                                            <div key={stage.id} className="flex items-center gap-3">
                                                <span className="w-36 text-sm text-gray-600">{stage.name}</span>
                                                {editMode ? (
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="100"
                                                        step="25"
                                                        value={progress}
                                                        onChange={(e) => updateStageProgress(stage.id, e.target.value)}
                                                        className="flex-1"
                                                    />
                                                ) : (
                                                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                                                        <div 
                                                            className={`h-3 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-autovol-teal'}`}
                                                            style={{ width: `${progress}%` }}
                                                        />
                                                    </div>
                                                )}
                                                <span className="w-10 text-right text-sm">{progress}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Import Modal Component
        function ImportModal({ onClose, onImport }) {
            const [dragActive, setDragActive] = useState(false);
            const [preview, setPreview] = useState(null);
            const [error, setError] = useState(null);

            const handleFile = (file) => {
                setError(null);
                
                if (!file) {
                    setError('No file selected');
                    return;
                }
                
                console.log('Processing file:', file.name, file.type, file.size);
                
                const reader = new FileReader();
                reader.onerror = () => {
                    setError('Error reading file');
                };
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        console.log('File loaded, size:', data.length);
                        
                        if (typeof XLSX === 'undefined') {
                            setError('Excel library not loaded. Please refresh the page.');
                            return;
                        }
                        
                        const workbook = XLSX.read(data, { type: 'array' });
                        console.log('Workbook sheets:', workbook.SheetNames);
                        
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                        console.log('Rows found:', jsonData.length);
                        console.log('First row (headers):', jsonData[0]);
                        
                        if (jsonData.length < 2) {
                            setError('File must have at least a header row and one data row');
                            return;
                        }

                        const headers = jsonData[0].map(h => String(h).toLowerCase().trim());
                        const modules = [];

                        for (let i = 1; i < jsonData.length; i++) {
                            const row = jsonData[i];
                            if (!row || row.length === 0 || !row[0]) continue;

                            const getVal = (keywords) => {
                                for (const keyword of keywords) {
                                    const idx = headers.findIndex(h => h.includes(keyword.toLowerCase()));
                                    if (idx !== -1 && row[idx] !== undefined) return row[idx];
                                }
                                return '';
                            };

                            modules.push({
                                serialNumber: getVal(['serial']) || row[0],
                                buildSequence: getVal(['build', 'sequence']) || i,
                                moduleWidth: parseFloat(getVal(['width'])) || 0,
                                moduleLength: parseFloat(getVal(['length'])) || 0,
                                squareFootage: parseFloat(getVal(['square', 'sf', 'footage'])) || 0,
                                hitchBLM: getVal(['hitch blm', 'hitch_blm']) || getVal(['blm']) || '',
                                hitchUnit: getVal(['hitch unit', 'hitch_unit']) || getVal(['unit']) || '',
                                hitchRoom: getVal(['hitch room', 'hitch_room']) || '',
                                hitchRoomType: getVal(['hitch room type', 'hitch_room_type', 'hitch type']) || '',
                                rearBLM: getVal(['rear blm', 'rear_blm']) || '',
                                rearUnit: getVal(['rear unit', 'rear_unit']) || '',
                                rearRoom: getVal(['rear room', 'rear_room']) || '',
                                rearRoomType: getVal(['rear room type', 'rear_room_type', 'rear type']) || '',
                                difficulties: {
                                    sidewall: String(getVal(['sidewall'])).toLowerCase() === 'x' || String(getVal(['sidewall'])).toLowerCase() === 'true',
                                    stair: String(getVal(['stair'])).toLowerCase() === 'x' || String(getVal(['stair'])).toLowerCase() === 'true',
                                    hr3Wall: String(getVal(['3hr', '3 hr', 'three hr'])).toLowerCase() === 'x' || String(getVal(['3hr'])).toLowerCase() === 'true',
                                    short: String(getVal(['short'])).toLowerCase() === 'x' || String(getVal(['short'])).toLowerCase() === 'true',
                                    doubleStudio: String(getVal(['double', 'dbl studio'])).toLowerCase() === 'x' || String(getVal(['double studio'])).toLowerCase() === 'true',
                                    sawbox: String(getVal(['sawbox'])).toLowerCase() === 'x' || String(getVal(['sawbox'])).toLowerCase() === 'true'
                                },
                                isPrototype: String(getVal(['proto', 'prototype'])).toLowerCase() === 'x' || String(getVal(['proto', 'prototype'])).toLowerCase() === 'true'
                            });
                        }

                        if (modules.length === 0) {
                            setError('No valid modules found in file. Make sure your file has data rows after the header.');
                            console.log('No modules parsed from file');
                            return;
                        }

                        console.log('Successfully parsed', modules.length, 'modules');
                        setPreview({ modules, headers: jsonData[0] });
                    } catch (err) {
                        console.error('Import error:', err);
                        setError('Error reading file: ' + err.message + '. Check browser console for details.');
                    }
                };
                reader.readAsArrayBuffer(file);
            };

            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Import Modules from Excel</h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                            </div>

                            {!preview ? (
                                <>
                                    <div
                                        className={`border-2 border-dashed rounded-lg p-12 text-center transition ${dragActive ? 'border-autovol-teal bg-autovol-teal-light' : 'border-gray-300'}`}
                                        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                        onDragLeave={() => setDragActive(false)}
                                        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files[0]); }}
                                    >
                                        <p className="text-gray-600 mb-2">Drag and drop your Excel file here, or</p>
                                        <label className="inline-block px-4 py-2 btn-primary rounded-lg cursor-pointer">
                                            Browse Files
                                            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
                                        </label>
                                    </div>
                                    {error && <p className="text-red-600 mt-4">{error}</p>}
                                    
                                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                        <h3 className="font-semibold mb-2">Expected Columns:</h3>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                            <span>• Serial Number</span>
                                            <span>• Build Sequence</span>
                                            <span>• Module Width</span>
                                            <span>• Module Length</span>
                                            <span>• Square Footage</span>
                                            <span>• HITCH BLM ID</span>
                                            <span>• HITCH Unit</span>
                                            <span>• HITCH Room</span>
                                            <span>• HITCH Room Type</span>
                                            <span>• REAR BLM ID</span>
                                            <span>• REAR Unit</span>
                                            <span>• REAR Room</span>
                                            <span>• REAR Room Type</span>
                                            <span>• Sidewall (X)</span>
                                            <span>• Stair (X)</span>
                                            <span>• 3HR-Wall (X)</span>
                                            <span>• Short (X)</span>
                                            <span>• Double Studio (X)</span>
                                            <span>• Sawbox (X)</span>
                                            <span>• Proto (X)</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                        <p className="text-green-800 font-medium">✓ Found {preview.modules.length} modules to import</p>
                                    </div>
                                    
                                    <div className="overflow-x-auto max-h-64 mb-4">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-100 sticky top-0">
                                                <tr>
                                                    <th className="px-2 py-1 text-left">Serial #</th>
                                                    <th className="px-2 py-1 text-left">Build Seq</th>
                                                    <th className="px-2 py-1 text-left">Dimensions</th>
                                                    <th className="px-2 py-1 text-left">Hitch BLM</th>
                                                    <th className="px-2 py-1 text-left">Unit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {preview.modules.slice(0, 10).map((m, i) => (
                                                    <tr key={i}>
                                                        <td className="px-2 py-1 font-medium">{m.serialNumber}</td>
                                                        <td className="px-2 py-1">{m.buildSequence}</td>
                                                        <td className="px-2 py-1">{m.moduleWidth}' x {m.moduleLength}'</td>
                                                        <td className="px-2 py-1">{m.hitchBLM}</td>
                                                        <td className="px-2 py-1">{m.hitchUnit}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {preview.modules.length > 10 && (
                                            <p className="text-sm text-gray-500 mt-2 text-center">...and {preview.modules.length - 10} more</p>
                                        )}
                                    </div>
                                    
                                    <div className="flex gap-2 justify-end">
                                        <button onClick={() => setPreview(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
                                        <button onClick={() => onImport(preview.modules)} className="px-4 py-2 btn-primary rounded-lg">Import {preview.modules.length} Modules</button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // New Project Modal
        function NewProjectModal({ onClose, onSave }) {
            const [name, setName] = useState('');
            const [location, setLocation] = useState('');
            const [description, setDescription] = useState('');
            const [status, setStatus] = useState('Planning');
            const [sharepointSite, setSharepointSite] = useState('ProductDevelopmentAutovolPrefab');
            const [sharepointChannel, setSharepointChannel] = useState('');
            const [shopDrawingLinksText, setShopDrawingLinksText] = useState('');
            const [shopDrawingLinksError, setShopDrawingLinksError] = useState('');
            const [parsedLinksCount, setParsedLinksCount] = useState(0);
            
            // Parse shop drawing links from text input
            const parseShopDrawingLinks = (text) => {
                const links = {};
                const lines = text.split('\n').filter(line => line.trim());
                let errorMsg = '';
                
                for (const line of lines) {
                    // Support formats: "BLM, URL" or "BLM URL" or "BLM\tURL"
                    const parts = line.split(/[,\t]/).map(p => p.trim());
                    if (parts.length >= 2) {
                        const blm = parts[0];
                        const url = parts[1];
                        if (blm && url && url.startsWith('http')) {
                            links[blm] = url;
                        } else if (blm && !url.startsWith('http')) {
                            errorMsg = `Invalid URL for BLM "${blm}"`;
                        }
                    }
                }
                
                setShopDrawingLinksError(errorMsg);
                setParsedLinksCount(Object.keys(links).length);
                return links;
            };
            
            // Handle text change and parse
            const handleLinksTextChange = (text) => {
                setShopDrawingLinksText(text);
                parseShopDrawingLinks(text);
            };

            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">New Project</h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Building A - Phoenix"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="e.g., Phoenix, AZ"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Phase 1 residential units..."
                                        rows={2}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="Planning">Planning</option>
                                        <option value="Active">Active</option>
                                        <option value="On Hold">On Hold</option>
                                        <option value="Complete">Complete</option>
                                        <option value="Archived">Archived</option>
                                    </select>
                                </div>
                                
                                {/* SharePoint Integration */}
                                <div className="border-t pt-4 mt-4">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <span>📋</span> SharePoint Integration
                                        <span className="text-xs font-normal text-gray-500">(for Shop Drawings)</span>
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">SharePoint Site</label>
                                            <input
                                                type="text"
                                                value={sharepointSite}
                                                onChange={(e) => setSharepointSite(e.target.value)}
                                                placeholder="e.g., ProductDevelopmentAutovolPrefab"
                                                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Site name from SharePoint URL</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Teams Channel Folder</label>
                                            <input
                                                type="text"
                                                value={sharepointChannel}
                                                onChange={(e) => setSharepointChannel(e.target.value)}
                                                placeholder="e.g., Alvarado Creek - San Diego, CA (TPC)"
                                                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Exact channel name from Teams</p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Shop Drawing Links */}
                                <div className="border-t pt-4 mt-4">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                        <span>📐</span> Shop Drawing Links
                                        <span className="text-xs font-normal text-gray-500">(optional)</span>
                                    </h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">BLM / URL Mapping</label>
                                        <textarea
                                            value={shopDrawingLinksText}
                                            onChange={(e) => handleLinksTextChange(e.target.value)}
                                            placeholder="B1L2M39, https://sharepoint.com/..."
                                            rows={4}
                                            className="w-full px-3 py-2 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        <div className="flex justify-between mt-1">
                                            <p className="text-xs text-gray-500">Format: BLM, URL (comma or tab separated)</p>
                                            {parsedLinksCount > 0 && (
                                                <p className="text-xs text-green-600 font-medium">{parsedLinksCount} links parsed</p>
                                            )}
                                        </div>
                                        {shopDrawingLinksError && (
                                            <p className="text-xs text-red-600 mt-1">{shopDrawingLinksError}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 justify-end mt-6">
                                <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Cancel</button>
                                <button 
                                    onClick={() => onSave({ 
                                        name, 
                                        location, 
                                        description, 
                                        status, 
                                        sharepointSite, 
                                        sharepointChannel,
                                        shopDrawingLinks: parseShopDrawingLinks(shopDrawingLinksText)
                                    })}
                                    disabled={!name || !location}
                                    className="px-4 py-2 btn-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Create Project
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // ============================================================================
        // EXTRACTED MODULES:
        // - PeopleModule.jsx (People directory, employee management)
        // - TransportModule.jsx (Transport board, yards, companies)
        // - EquipmentModule.jsx (Tools & equipment tracking)
        // ============================================================================

        function App() {
            const auth = window.useAuth ? window.useAuth() : { currentUser: null };
            
            // If not logged in, show login page
            if (!auth.currentUser) {
                return window.LoginPage ? <window.LoginPage auth={auth} /> : <div className="p-8 text-center">Loading...</div>;
            }
            
            // If logged in, show dashboard
            return <Dashboard auth={auth} />;
        }

        ReactDOM.render(<App />, document.getElementById('root'));

// ============================================================================
// EMERGENCY RECOVERY FUNCTION
// Accessible from browser console in case of lockout
// ============================================================================
window.MODA_EMERGENCY_ADMIN_RESTORE = function() {
    console.log('🚨 EMERGENCY ADMIN RESTORE INITIATED');
    
    // Restore Trevor as protected admin
    let users = [];
    try {
        const saved = localStorage.getItem('autovol_users');
        if (saved && saved !== 'undefined' && saved !== 'null') {
            users = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error parsing users:', e);
    }
    const trevor = users.find(u => 
        u.email === 'trevor@autovol.com' || 
        (u.firstName === 'Trevor' && u.lastName === 'Fletcher')
    );
    
    if (trevor) {
        trevor.dashboardRole = 'admin';
        trevor.isProtected = true;
        localStorage.setItem('autovol_users', JSON.stringify(users));
        console.log('✅ Trevor Fletcher restored as protected Admin');
        alert('✅ Admin access restored to Trevor Fletcher. Refreshing page...');
        window.location.reload();
    } else {
        console.error('❌ Trevor Fletcher not found in user records');
        alert('❌ Could not find Trevor Fletcher in user records');
    }
};

// Log system status
console.log('🛡️ MODA Dashboard Role System Loaded');
console.log('🛡️ Emergency recovery: MODA_EMERGENCY_ADMIN_RESTORE()');
console.log('🛡️ Trevor Fletcher account is protected');