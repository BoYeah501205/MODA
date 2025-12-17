// ============================================================================
// TRAINING MATRIX COMPONENT - People Module "Training" Sub-Tab
// Version: 3.0 - December 2024
// ============================================================================

const DEFAULT_TRAINING_STATIONS = [
    { id: 'automation', name: 'Automation Stations', type: 'hierarchical', order: 1, substations: [
        { id: 'walls', name: 'Walls', skills: [
            { skillId: 'auto-walls-0', name: 'SE/SSE', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
            { skillId: 'auto-walls-1', name: 'ME', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
            { skillId: 'auto-walls-2', name: 'Sheathing', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
            { skillId: 'auto-walls-3', name: 'Tilt/Transfer', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
            { skillId: 'auto-walls-4', name: 'MEP Rack', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] }
        ]},
        { id: 'floors-ceilings', name: 'Floors/Ceilings', skills: [
            { skillId: 'auto-fc-0', name: 'SE', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
            { skillId: 'auto-fc-1', name: 'ME', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
            { skillId: 'auto-fc-2', name: 'Sheathing', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
            { skillId: 'auto-fc-3', name: 'QC', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
            { skillId: 'auto-fc-4', name: 'Transfer/Flip', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] }
        ]},
        { id: 'mill', name: 'Mill', skills: [
            { skillId: 'auto-mill-0', name: 'Hundegger 1', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
            { skillId: 'auto-mill-1', name: 'Hundegger 2', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
            { skillId: 'auto-mill-2', name: 'SCM Saw', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] }
        ]},
        { id: 'program-use', name: 'Program Use', skills: [
            { skillId: 'auto-prog-0', name: 'Hundegger-Cambium', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
            { skillId: 'auto-prog-1', name: 'MS Teams', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
            { skillId: 'auto-prog-2', name: 'PAT', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
            { skillId: 'auto-prog-3', name: 'TED', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] }
        ]}
    ]},
    { id: 'floor-ceiling-mez', name: 'Floor-Ceiling Mez', type: 'standard', order: 2, skills: [
        { skillId: 'fcm-0', name: 'F/C QC', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
        { skillId: 'fcm-1', name: 'Flip/Outfeed', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
        { skillId: 'fcm-2', name: 'Fire-Blocking', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
        { skillId: 'fcm-3', name: 'Structural-Floors', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
        { skillId: 'fcm-4', name: 'Structural-Ceilings', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
        { skillId: 'fcm-5', name: 'Floor Decking', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
        { skillId: 'fcm-6', name: 'Strong-backs', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] },
        { skillId: 'fcm-7', name: 'A-Bay Hoist', expectations: {'25':'','50':'','75':'','100':''}, attachments: [] }
    ]},
    { id: 'plumb-rough-floors', name: 'Plumb Rough-Floors', type: 'standard', order: 3, skills: [] },
    { id: 'plumb-rough', name: 'Plumbing Rough-In', type: 'standard', order: 4, skills: [] },
    { id: 'plumb-trim', name: 'Plumbing Trim', type: 'standard', order: 5, skills: [] },
    { id: 'hvac-rough', name: 'HVAC Rough-In', type: 'standard', order: 6, skills: [] },
    { id: 'hvac-trim', name: 'HVAC Trim', type: 'standard', order: 7, skills: [] },
    { id: 'elec-rough-ceil', name: 'Elec Rough-Ceilings', type: 'standard', order: 8, skills: [] },
    { id: 'elec-rough', name: 'Electrical Rough-In', type: 'standard', order: 9, skills: [] },
    { id: 'elec-trim', name: 'Electrical Trim', type: 'standard', order: 10, skills: [] },
    { id: 'wall-set', name: 'Wall Set', type: 'standard', order: 11, skills: [] },
    { id: 'ceiling-set', name: 'Ceiling Set', type: 'standard', order: 12, skills: [] },
    { id: 'soffits', name: 'Soffits', type: 'standard', order: 13, skills: [] },
    { id: 'exteriors', name: 'Exteriors', type: 'standard', order: 14, skills: [] },
    { id: 'drywall', name: 'Drywall', type: 'standard', order: 15, skills: [] },
    { id: 'roofing', name: 'Roofing', type: 'standard', order: 16, skills: [] },
    { id: 'pre-finish', name: 'Pre-Finish', type: 'standard', order: 17, skills: [] },
    { id: 'final-finish', name: 'Final Finish', type: 'standard', order: 18, skills: [] },
    { id: 'close-up', name: 'Close-Up/Transport', type: 'standard', order: 19, skills: [] }
];

function getTrainingSkillCount(station) {
    if (station.type === 'hierarchical' && station.substations) {
        return station.substations.reduce((sum, sub) => sum + (sub.skills?.length || 0), 0);
    }
    return station.skills?.length || 0;
}

function getAllSkillsFromStation(station) {
    if (station.type === 'hierarchical' && station.substations) {
        const skills = [];
        station.substations.forEach(sub => {
            (sub.skills || []).forEach(skill => {
                skills.push({ ...skill, substationId: sub.id, substationName: sub.name });
            });
        });
        return skills;
    }
    return station.skills || [];
}

function TrainingMatrixView({ employees: propEmployees, currentUser, isAdmin }) {
    const { useState, useEffect, useMemo } = React;
    
    const [trainingEmployees, setTrainingEmployees] = useState([]);
    const [trainingStations, setTrainingStations] = useState([]);
    const [trainingProgress, setTrainingProgress] = useState({});
    const [collapsedStations, setCollapsedStations] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');
    const [statusMsg, setStatusMsg] = useState(null);
    const [showSkillModal, setShowSkillModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showManagerModal, setShowManagerModal] = useState(false);
    const [currentStation, setCurrentStation] = useState(null);
    const [currentSubstation, setCurrentSubstation] = useState(null);
    const [currentSkill, setCurrentSkill] = useState(null);

    // Load data
    useEffect(() => {
        if (propEmployees?.length > 0) {
            setTrainingEmployees(propEmployees.filter(e => e.jobTitle === 'Line Solutioneer'));
        }
        const stored = localStorage.getItem('moda_training_stations');
        setTrainingStations(stored ? JSON.parse(stored) : DEFAULT_TRAINING_STATIONS);
        const prog = localStorage.getItem('moda_training_progress');
        if (prog) setTrainingProgress(JSON.parse(prog));
        const coll = localStorage.getItem('moda_training_collapsed');
        if (coll) setCollapsedStations(JSON.parse(coll));
    }, [propEmployees]);

    // Save data
    useEffect(() => {
        if (trainingStations.length > 0) localStorage.setItem('moda_training_stations', JSON.stringify(trainingStations));
    }, [trainingStations]);
    useEffect(() => {
        localStorage.setItem('moda_training_progress', JSON.stringify(trainingProgress));
    }, [trainingProgress]);
    useEffect(() => {
        localStorage.setItem('moda_training_collapsed', JSON.stringify(collapsedStations));
    }, [collapsedStations]);

    const depts = useMemo(() => [...new Set(trainingEmployees.map(e => e.department).filter(Boolean))].sort(), [trainingEmployees]);
    
    const filtered = useMemo(() => {
        let r = trainingEmployees.filter(e => {
            if (!e) return false;
            const fullName = `${e.firstName || ''} ${e.lastName || ''}`.toLowerCase();
            return fullName.includes((searchTerm || '').toLowerCase()) && 
                (deptFilter === 'all' || e.department === deptFilter);
        });
        r.sort((a, b) => {
            if (!a || !b) return 0;
            if (sortBy === 'name') return (a.lastName || '').localeCompare(b.lastName || '');
            if (sortBy === 'department') return (a.department || '').localeCompare(b.department || '');
            if (sortBy === 'hireDate') return new Date(a.hireDate || 0) - new Date(b.hireDate || 0);
            return 0;
        });
        return r;
    }, [trainingEmployees, searchTerm, deptFilter, sortBy]);

    const showStatus = (msg, type = 'success') => {
        setStatusMsg({ msg, type });
        setTimeout(() => setStatusMsg(null), 4000);
    };

    const toggleStation = (id) => setCollapsedStations(p => ({ ...p, [id]: !p[id] }));
    const getProgress = (empId, skillId) => trainingProgress[`${empId}-${skillId}`]?.progress || 0;
    const updateProgress = (empId, skillId, val) => {
        setTrainingProgress(p => ({ 
            ...p, 
            [`${empId}-${skillId}`]: { progress: val, lastUpdated: new Date().toISOString() } 
        }));
    };

    const saveSkill = (stationId, subId, skill, isEdit) => {
        setTrainingStations(prev => prev.map(s => {
            if (s.id !== stationId) return s;
            if (s.type === 'hierarchical' && subId) {
                return { 
                    ...s, 
                    substations: s.substations.map(sub => {
                        if (sub.id !== subId) return sub;
                        return isEdit 
                            ? { ...sub, skills: sub.skills.map(sk => sk.skillId === skill.skillId ? skill : sk) } 
                            : { ...sub, skills: [...(sub.skills || []), skill] };
                    })
                };
            }
            return isEdit 
                ? { ...s, skills: s.skills.map(sk => sk.skillId === skill.skillId ? skill : sk) } 
                : { ...s, skills: [...(s.skills || []), skill] };
        }));
        showStatus(isEdit ? 'Skill updated' : 'Skill added');
    };

    const removeSkill = (stationId, subId, skillId) => {
        setTrainingStations(prev => prev.map(s => {
            if (s.id !== stationId) return s;
            if (s.type === 'hierarchical' && subId) {
                return { 
                    ...s, 
                    substations: s.substations.map(sub => 
                        sub.id !== subId ? sub : { ...sub, skills: sub.skills.filter(sk => sk.skillId !== skillId) }
                    ) 
                };
            }
            return { ...s, skills: s.skills.filter(sk => sk.skillId !== skillId) };
        }));
        showStatus('Skill removed');
    };

    const openAddSkill = (stationId, subId) => {
        setCurrentStation(stationId);
        setCurrentSubstation(subId);
        setCurrentSkill(null);
        setShowSkillModal(true);
    };

    const openEditSkill = (skill) => {
        const st = trainingStations.find(s => 
            s.type === 'hierarchical' 
                ? s.substations?.some(sub => sub.skills?.some(sk => sk.skillId === skill.skillId)) 
                : s.skills?.some(sk => sk.skillId === skill.skillId)
        );
        if (st) {
            setCurrentStation(st.id);
            setCurrentSubstation(st.type === 'hierarchical' 
                ? st.substations.find(sub => sub.skills?.some(sk => sk.skillId === skill.skillId))?.id 
                : null
            );
        }
        setCurrentSkill(skill);
        setShowSkillModal(true);
    };

    const openManager = (st) => { setCurrentStation(st); setShowManagerModal(true); };
    const openDetail = (sk) => { setCurrentSkill(sk); setShowDetailModal(true); };

    const exportAll = () => {
        const d = { type: 'complete', stations: trainingStations, progress: trainingProgress };
        const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = `Training_Matrix_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        showStatus('Data exported');
    };

    const exportSkills = () => {
        const d = { type: 'skills-config', stations: trainingStations };
        const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = `Skills_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        showStatus('Skills exported');
    };

    const importSkills = (imported) => {
        setTrainingStations(prev => prev.map(s => {
            const imp = imported.find(i => i.id === s.id);
            if (!imp) return s;
            if (s.type === 'hierarchical' && imp.substations) {
                return { 
                    ...s, 
                    substations: s.substations.map(sub => {
                        const iSub = imp.substations.find(is => is.id === sub.id);
                        return iSub ? { ...sub, skills: iSub.skills || [] } : sub;
                    }) 
                };
            }
            return { ...s, skills: imp.skills || [] };
        }));
        showStatus('Skills imported');
    };

    const clearProgress = () => {
        if (confirm('Clear all progress? This cannot be undone!')) {
            setTrainingProgress({});
            showStatus('Progress cleared');
        }
    };

    // Skill Builder Modal
    const SkillModal = () => {
        const [name, setName] = useState(currentSkill?.name || '');
        const [exp, setExp] = useState(currentSkill?.expectations || { '25': '', '50': '', '75': '', '100': '' });
        
        useEffect(() => {
            setName(currentSkill?.name || '');
            setExp(currentSkill?.expectations || { '25': '', '50': '', '75': '', '100': '' });
        }, [currentSkill]);

        if (!showSkillModal) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowSkillModal(false)}>
                <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{currentSkill ? 'Edit Skill' : 'Add Skill'}</h2>
                            <button onClick={() => setShowSkillModal(false)} className="text-2xl text-gray-400">&times;</button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">Skill Name *</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">25% Expectation</label>
                                <textarea value={exp['25']} onChange={e => setExp({...exp, '25': e.target.value})} rows="2" className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">50% Expectation</label>
                                <textarea value={exp['50']} onChange={e => setExp({...exp, '50': e.target.value})} rows="2" className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">75% Expectation</label>
                                <textarea value={exp['75']} onChange={e => setExp({...exp, '75': e.target.value})} rows="2" className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">100% Expectation</label>
                                <textarea value={exp['100']} onChange={e => setExp({...exp, '100': e.target.value})} rows="2" className="w-full px-3 py-2 border rounded-lg" />
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end mt-4">
                            <button onClick={() => setShowSkillModal(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
                            <button 
                                onClick={() => {
                                    if (!name.trim()) return alert('Enter skill name');
                                    saveSkill(currentStation, currentSubstation, {
                                        skillId: currentSkill?.skillId || `${currentSubstation || currentStation}-${Date.now()}`,
                                        name: name.trim(),
                                        expectations: exp,
                                        attachments: []
                                    }, !!currentSkill);
                                    setShowSkillModal(false);
                                }} 
                                className="px-4 py-2 btn-primary rounded-lg"
                            >
                                {currentSkill ? 'Update' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Skill Detail Modal
    const DetailModal = () => {
        if (!showDetailModal || !currentSkill) return null;
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => { setShowDetailModal(false); setCurrentSkill(null); }}>
                <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full" onClick={e => e.stopPropagation()}>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">{currentSkill.name}</h2>
                            <button onClick={() => { setShowDetailModal(false); setCurrentSkill(null); }} className="text-2xl text-gray-400">&times;</button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded bg-red-50 border-l-4 border-red-400">
                                <h3 className="font-semibold text-red-800 text-sm">25%</h3>
                                <p className="text-xs">{currentSkill.expectations?.['25'] || 'Not defined'}</p>
                            </div>
                            <div className="p-3 rounded bg-yellow-50 border-l-4 border-yellow-400">
                                <h3 className="font-semibold text-yellow-800 text-sm">50%</h3>
                                <p className="text-xs">{currentSkill.expectations?.['50'] || 'Not defined'}</p>
                            </div>
                            <div className="p-3 rounded bg-orange-50 border-l-4 border-orange-400">
                                <h3 className="font-semibold text-orange-800 text-sm">75%</h3>
                                <p className="text-xs">{currentSkill.expectations?.['75'] || 'Not defined'}</p>
                            </div>
                            <div className="p-3 rounded bg-green-50 border-l-4 border-green-400">
                                <h3 className="font-semibold text-green-800 text-sm">100%</h3>
                                <p className="text-xs">{currentSkill.expectations?.['100'] || 'Not defined'}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end mt-4">
                            <button onClick={() => { openEditSkill(currentSkill); setShowDetailModal(false); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Edit</button>
                            <button onClick={() => { setShowDetailModal(false); setCurrentSkill(null); }} className="px-4 py-2 bg-gray-200 rounded-lg">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Station Manager Modal
    const ManagerModal = () => {
        if (!showManagerModal || !currentStation) return null;
        const skills = getAllSkillsFromStation(currentStation);
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => { setShowManagerModal(false); setCurrentStation(null); }}>
                <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Manage: {currentStation.name}</h2>
                            <button onClick={() => { setShowManagerModal(false); setCurrentStation(null); }} className="text-2xl text-gray-400">&times;</button>
                        </div>
                        {skills.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No skills yet</p>
                        ) : (
                            <ul className="space-y-2">
                                {skills.map((sk, i) => (
                                    <li key={sk.skillId} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                                        <span className="text-sm">{i + 1}. {sk.name} {sk.substationName && <span className="text-xs text-gray-400">({sk.substationName})</span>}</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => { openEditSkill(sk); setShowManagerModal(false); }} className="px-2 py-1 text-xs bg-blue-600 text-white rounded">Edit</button>
                                            <button onClick={() => { if (confirm(`Remove "${sk.name}"?`)) removeSkill(currentStation.id, sk.substationId, sk.skillId); }} className="px-2 py-1 text-xs bg-red-600 text-white rounded">Remove</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="flex gap-2 justify-end mt-4">
                            <button onClick={() => { openAddSkill(currentStation.id, currentStation.type === 'hierarchical' ? currentStation.substations[0]?.id : null); setShowManagerModal(false); }} className="px-4 py-2 btn-primary rounded-lg">+ Add Skill</button>
                            <button onClick={() => { setShowManagerModal(false); setCurrentStation(null); }} className="px-4 py-2 bg-gray-200 rounded-lg">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--autovol-navy)' }}>Training Matrix</h3>
                    <p className="text-sm text-gray-500">Track skill progress • Click headers to collapse</p>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-medium text-white" style={{ backgroundColor: 'var(--autovol-blue)' }}>
                    {filtered.length} Line Solutioneers
                </span>
            </div>

            {/* Status */}
            {statusMsg && (
                <div className={`p-3 rounded-lg ${statusMsg.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {statusMsg.msg}
                </div>
            )}

            {/* Controls */}
            <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                    <input type="search" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-3 py-2 border rounded-lg w-40" />
                    <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
                        <option value="all">All ({trainingEmployees.length})</option>
                        {depts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-2 border rounded-lg">
                        <option value="name">Name</option>
                        <option value="department">Dept</option>
                        <option value="hireDate">Hire</option>
                    </select>
                </div>
                <div className="flex flex-wrap gap-2">
                    <label className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm cursor-pointer">
                        Import
                        <input type="file" accept=".json" className="hidden" onChange={e => {
                            const f = e.target.files[0];
                            if (f) {
                                const r = new FileReader();
                                r.onload = ev => {
                                    try {
                                        const d = JSON.parse(ev.target.result);
                                        if (d.stations) importSkills(d.stations);
                                    } catch (err) { alert('Error'); }
                                };
                                r.readAsText(f);
                            }
                        }} />
                    </label>
                    <button onClick={exportSkills} className="px-3 py-2 bg-gray-500 text-white rounded-lg text-sm">Export Skills</button>
                    <button onClick={exportAll} className="px-3 py-2 bg-gray-500 text-white rounded-lg text-sm">Export All</button>
                    <button onClick={clearProgress} className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm">Clear</button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-x-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-20 px-3 py-2 text-left font-semibold text-white" style={{ backgroundColor: 'var(--autovol-charcoal)', minWidth: '150px' }} rowSpan="2">
                                Employee
                            </th>
                            {trainingStations.map(st => {
                                const collapsed = collapsedStations[st.id];
                                const cnt = getTrainingSkillCount(st);
                                if (collapsed) {
                                    return (
                                        <th key={st.id} className="px-1 py-2 text-white cursor-pointer text-[10px]" 
                                            style={{ backgroundColor: 'var(--autovol-blue)', writingMode: 'vertical-rl', transform: 'rotate(180deg)', minWidth: '25px' }} 
                                            rowSpan="2" onClick={() => toggleStation(st.id)}>
                                            {st.name}
                                        </th>
                                    );
                                }
                                return (
                                    <th key={st.id} className="px-1 py-1 text-white cursor-pointer text-[10px]" 
                                        style={{ backgroundColor: 'var(--autovol-blue)' }} 
                                        colSpan={Math.max(cnt, 1)} onClick={() => toggleStation(st.id)}>
                                        <div className="flex items-center justify-center gap-1">
                                            <span>▼</span>
                                            <span>{st.name}</span>
                                            <button className="ml-1 px-1 bg-white bg-opacity-20 rounded" onClick={e => { e.stopPropagation(); openManager(st); }}>⚙</button>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                        <tr>
                            {trainingStations.map(st => {
                                if (collapsedStations[st.id]) return null;
                                const skills = getAllSkillsFromStation(st);
                                if (skills.length === 0) {
                                    return (
                                        <th key={`${st.id}-add`} className="px-1 py-1 bg-blue-100">
                                            <button className="px-1 py-1 text-[9px] bg-blue-600 text-white rounded" 
                                                onClick={() => openAddSkill(st.id, st.type === 'hierarchical' ? st.substations[0]?.id : null)}>
                                                +Add
                                            </button>
                                        </th>
                                    );
                                }
                                return skills.map(sk => (
                                    <th key={sk.skillId} className="px-1 py-1 text-[9px] text-white font-medium" style={{ backgroundColor: '#1E40AF', minWidth: '60px' }}>
                                        <div className="flex flex-col items-center">
                                            <span>{sk.name}</span>
                                            <button className="mt-1 px-1 bg-white bg-opacity-20 rounded" onClick={() => openDetail(sk)}>...</button>
                                        </div>
                                    </th>
                                ));
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan="1000" className="px-4 py-8 text-center text-gray-500">
                                    {trainingEmployees.length === 0 ? 'No Line Solutioneers found' : 'No matches'}
                                </td>
                            </tr>
                        ) : (
                            filtered.map(emp => (
                                <tr key={emp.id} className="hover:bg-gray-50">
                                    <td className="sticky left-0 z-10 px-3 py-2 bg-white border-r-2" style={{ borderColor: 'var(--autovol-charcoal)' }}>
                                        <p className="font-medium text-sm">{emp.lastName}, {emp.firstName}</p>
                                        <p className="text-xs text-gray-500">{emp.department || '-'}</p>
                                    </td>
                                    {trainingStations.map(st => {
                                        if (collapsedStations[st.id]) {
                                            return <td key={`${emp.id}-${st.id}`} className="px-1 py-1 text-center text-gray-400 bg-gray-50">-</td>;
                                        }
                                        const skills = getAllSkillsFromStation(st);
                                        if (skills.length === 0) {
                                            return <td key={`${emp.id}-${st.id}`} className="px-1 py-1 text-center text-gray-400 bg-gray-50">-</td>;
                                        }
                                        return skills.map(sk => (
                                            <td key={`${emp.id}-${sk.skillId}`} className="px-1 py-1">
                                                <select 
                                                    value={getProgress(emp.id, sk.skillId)} 
                                                    onChange={e => updateProgress(emp.id, sk.skillId, parseInt(e.target.value))} 
                                                    className="w-full px-1 py-1 text-xs border rounded font-semibold"
                                                >
                                                    <option value="0">0%</option>
                                                    <option value="25">25%</option>
                                                    <option value="50">50%</option>
                                                    <option value="75">75%</option>
                                                    <option value="100">100%</option>
                                                </select>
                                            </td>
                                        ));
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            <SkillModal />
            <DetailModal />
            <ManagerModal />
        </div>
    );
}

// Make available globally
window.TrainingMatrixView = TrainingMatrixView;
