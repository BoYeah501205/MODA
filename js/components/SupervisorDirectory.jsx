const { useState, useEffect, useCallback } = React;

function SupervisorDirectory({ currentUser, isAdmin }) {
    const [activeView, setActiveView] = useState('directory');
    const [supervisors, setSupervisors] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const loadData = useCallback(async (retries = 5) => {
        if (retries === 5) {
            setLoading(true);
            setError(null);
        }
        try {
            const [sups, depts] = await Promise.all([
                window.MODA_SUPERVISORS.getSupervisors(false),
                window.MODA_STATION_BOARD.getLineDepartments(),
            ]);
            setSupervisors(sups || []);
            setDepartments(depts || []);
            setLoading(false);
        } catch (err) {
            if (err.message && err.message.includes('not ready') && retries > 0) {
                setTimeout(() => loadData(retries - 1), 500);
                return;
            }
            console.error('[SupervisorDirectory] Load error:', err);
            setError(err.message || 'Failed to load data');
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // --- Add/Edit Form ---
    const emptyForm = { fullName: '', email: '', phone: '', shiftAssignment: 1, role: 'supervisor', avatarColor: '#0D9488', departmentIds: [] };
    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const openAddForm = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowAddForm(true);
    };

    const openEditForm = (sup) => {
        setForm({
            fullName: sup.full_name || '',
            email: sup.email || '',
            phone: sup.phone || '',
            shiftAssignment: sup.shift_assignment || 1,
            role: sup.role || 'supervisor',
            avatarColor: sup.avatar_color || '#0D9488',
            departmentIds: (sup.departments || []).map(d => d.department_id),
        });
        setEditingId(sup.id);
        setShowAddForm(true);
    };

    const handleSave = async () => {
        if (!form.fullName.trim() || !form.email.trim()) return;
        setSaving(true);
        try {
            const saved = await window.MODA_SUPERVISORS.upsertSupervisor({
                id: editingId || undefined,
                email: form.email.trim(),
                fullName: form.fullName.trim(),
                phone: form.phone.trim(),
                shiftAssignment: Number(form.shiftAssignment),
                role: form.role,
                avatarColor: form.avatarColor,
                isActive: true,
            });
            await window.MODA_SUPERVISORS.setDepartmentAssignments(saved.id, form.departmentIds);
            setShowAddForm(false);
            setEditingId(null);
            await loadData();
        } catch (err) {
            console.error('[SupervisorDirectory] Save error:', err);
            alert('Error saving supervisor: ' + (err.message || 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    const handleDeactivate = async (sup) => {
        if (!confirm(`Deactivate ${sup.full_name}?`)) return;
        try {
            await window.MODA_SUPERVISORS.deleteSupervisor(sup.id);
            await loadData();
        } catch (err) {
            alert('Error deactivating: ' + (err.message || 'Unknown error'));
        }
    };

    const handleReactivate = async (sup) => {
        try {
            await window.MODA_SUPERVISORS.upsertSupervisor({ id: sup.id, email: sup.email, fullName: sup.full_name, isActive: true });
            await loadData();
        } catch (err) {
            alert('Error reactivating: ' + (err.message || 'Unknown error'));
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

    // --- Loading / Error states ---
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-autovol-teal"></div>
                <span className="ml-3 text-gray-600">Loading supervisors...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-20">
                <p className="text-red-600 mb-4">{error}</p>
                <button onClick={loadData} className="px-4 py-2 bg-autovol-teal text-white rounded-lg hover:opacity-90">Retry</button>
            </div>
        );
    }

    // --- DIRECTORY TAB ---
    const renderDirectory = () => (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{color: 'var(--autovol-navy)'}}>All Supervisors ({supervisors.length})</h3>
                {isAdmin && (
                    <button onClick={openAddForm} className="px-4 py-2 bg-autovol-teal text-white rounded-lg hover:opacity-90 text-sm font-medium">
                        + Add Supervisor
                    </button>
                )}
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6 shadow-sm">
                    <h4 className="font-semibold mb-3" style={{color: 'var(--autovol-navy)'}}>{editingId ? 'Edit Supervisor' : 'Add Supervisor'}</h4>
                    <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 text-sm text-amber-800">
                        Note: Creating a profile here does NOT create a login account. The Supabase auth account (email/password) must be created separately by an admin in the Supabase Dashboard.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                            <input type="text" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-autovol-teal focus:border-transparent" placeholder="John Smith" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-autovol-teal focus:border-transparent" placeholder="john@autovol.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-autovol-teal focus:border-transparent" placeholder="(555) 123-4567" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Shift Assignment</label>
                            <select value={form.shiftAssignment} onChange={e => setForm({...form, shiftAssignment: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-autovol-teal focus:border-transparent">
                                <option value={1}>Shift 1</option>
                                <option value={2}>Shift 2</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-autovol-teal focus:border-transparent">
                                <option value="supervisor">Supervisor</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Avatar Color</label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={form.avatarColor} onChange={e => setForm({...form, avatarColor: e.target.value})} className="w-10 h-10 border rounded cursor-pointer" />
                                <span className="text-sm text-gray-500">{form.avatarColor}</span>
                            </div>
                        </div>
                    </div>

                    {/* Department Assignments */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Department Assignments</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {departments.map(dept => (
                                <label key={dept.id} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={form.departmentIds.includes(dept.id)}
                                        onChange={e => {
                                            if (e.target.checked) {
                                                setForm({...form, departmentIds: [...form.departmentIds, dept.id]});
                                            } else {
                                                setForm({...form, departmentIds: form.departmentIds.filter(id => id !== dept.id)});
                                            }
                                        }}
                                        className="rounded border-gray-300"
                                    />
                                    <span className="inline-block w-3 h-3 rounded-full" style={{backgroundColor: dept.color || '#0d9488'}}></span>
                                    {dept.name}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mt-5">
                        <button onClick={handleSave} disabled={saving || !form.fullName.trim() || !form.email.trim()} className="px-4 py-2 bg-autovol-teal text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm font-medium">
                            {saving ? 'Saving...' : (editingId ? 'Update' : 'Save')}
                        </button>
                        <button onClick={() => { setShowAddForm(false); setEditingId(null); }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
                    </div>
                </div>
            )}

            {/* Supervisor List */}
            <div className="space-y-3">
                {supervisors.map(sup => (
                    <div key={sup.id} className={`bg-white border rounded-lg p-4 flex items-center gap-4 ${!sup.is_active ? 'opacity-60' : ''}`}>
                        {/* Avatar */}
                        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{backgroundColor: sup.avatar_color || '#0D9488'}}>
                            {getInitials(sup.full_name)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900">{sup.full_name}</span>
                                {!sup.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Inactive</span>}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sup.shift_assignment === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                    Shift {sup.shift_assignment || 1}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sup.role === 'admin' ? 'bg-autovol-navy text-white' : 'bg-teal-100 text-teal-800'}`} style={sup.role === 'admin' ? {backgroundColor: 'var(--autovol-navy)'} : {}}>
                                    {sup.role === 'admin' ? 'Admin' : 'Supervisor'}
                                </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-0.5">
                                {sup.email}{sup.phone ? ` | ${sup.phone}` : ''}
                            </div>
                            {/* Department pills */}
                            {sup.departments && sup.departments.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                    {sup.departments.map(da => (
                                        <span key={da.department_id} className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{backgroundColor: da.department?.color || '#6b7280'}}>
                                            {da.department?.name || da.department_id}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        {isAdmin && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => openEditForm(sup)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Edit</button>
                                {sup.is_active ? (
                                    <button onClick={() => handleDeactivate(sup)} className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50">Deactivate</button>
                                ) : (
                                    <button onClick={() => handleReactivate(sup)} className="px-3 py-1.5 text-sm border border-green-300 text-green-600 rounded-lg hover:bg-green-50">Reactivate</button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {supervisors.length === 0 && (
                    <div className="text-center py-10 text-gray-500">No supervisors found. Add one to get started.</div>
                )}
            </div>
        </div>
    );

    // --- DEPARTMENTS TAB ---
    const renderDepartments = () => {
        const activeSups = supervisors.filter(s => s.is_active);
        return (
            <div>
                <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--autovol-navy)'}}>Departments & Assigned Supervisors</h3>
                <p className="text-sm text-gray-500 mb-4">Read-only view. To change assignments, edit from the Directory tab.</p>
                <div className="space-y-3">
                    {departments.map(dept => {
                        const assigned = activeSups.filter(s => s.departments?.some(d => d.department_id === dept.id));
                        return (
                            <div key={dept.id} className="bg-white border rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-4 h-4 rounded-full inline-block" style={{backgroundColor: dept.color || '#0d9488'}}></span>
                                    <span className="font-semibold text-gray-900">{dept.name}</span>
                                    <span className="text-xs text-gray-400">({assigned.length} supervisor{assigned.length !== 1 ? 's' : ''})</span>
                                </div>
                                {assigned.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 ml-6">
                                        {assigned.map(sup => (
                                            <div key={sup.id} className="flex items-center gap-1.5 bg-gray-50 border rounded px-2 py-1">
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{backgroundColor: sup.avatar_color || '#0D9488'}}>
                                                    {getInitials(sup.full_name)}
                                                </div>
                                                <span className="text-sm text-gray-700">{sup.full_name}</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${sup.shift_assignment === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>S{sup.shift_assignment || 1}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 ml-6">No supervisors assigned</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- MAIN RENDER ---
    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold" style={{color: 'var(--autovol-navy)'}}>Supervisor Directory</h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b">
                <button
                    onClick={() => setActiveView('directory')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition ${activeView === 'directory' ? 'border-autovol-teal text-autovol-teal' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    style={activeView === 'directory' ? {borderColor: 'var(--autovol-teal)', color: 'var(--autovol-teal)'} : {}}
                >
                    Directory
                </button>
                <button
                    onClick={() => setActiveView('departments')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition ${activeView === 'departments' ? 'border-autovol-teal text-autovol-teal' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    style={activeView === 'departments' ? {borderColor: 'var(--autovol-teal)', color: 'var(--autovol-teal)'} : {}}
                >
                    Departments
                </button>
            </div>

            {activeView === 'directory' ? renderDirectory() : renderDepartments()}
        </div>
    );
}

window.SupervisorDirectory = SupervisorDirectory;
