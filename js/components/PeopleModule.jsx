// ============================================================================
// MODA PEOPLE MODULE
// Extracted from App.jsx for better maintainability
// ============================================================================

        // Helper to check if an ID is a valid UUID (Supabase uses UUIDs)
        const isValidUUID = (id) => {
            if (!id || typeof id !== 'string') return false;
            // UUID v4 pattern
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            return uuidPattern.test(id);
        };

        // People Module Component
        function PeopleModule({ employees, setEmployees, departments, setDepartments, productionStages, isAdmin }) {
            const [activeView, setActiveView] = useState('directory');
            const [showEmployeeModal, setShowEmployeeModal] = useState(false);
            const [editingEmployee, setEditingEmployee] = useState(null);
            const [searchTerm, setSearchTerm] = useState('');
            const [permissionFilter, setPermissionFilter] = useState('all');
            const [showInviteConfirm, setShowInviteConfirm] = useState(null);
            const [sortColumn, setSortColumn] = useState('name');
            const [sortDirection, setSortDirection] = useState('asc');
            
            // Department management state
            const [showDeptModal, setShowDeptModal] = useState(false);
            const [editingDept, setEditingDept] = useState(null);
            const [showDeleteDeptConfirm, setShowDeleteDeptConfirm] = useState(null);
            
            // Inactive employee state
            const [showInactiveModal, setShowInactiveModal] = useState(null);
            const [showInactiveFilter, setShowInactiveFilter] = useState(false);
            
            // Password set modal state
            const [showPasswordModal, setShowPasswordModal] = useState(null);
            const [newPassword, setNewPassword] = useState('');
            const [settingPassword, setSettingPassword] = useState(false);

            const handleSort = (column) => {
                if (sortColumn === column) {
                    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                } else {
                    setSortColumn(column);
                    setSortDirection('asc');
                }
            };

            const getSortValue = (emp, column) => {
                if (!emp) return '';
                switch(column) {
                    case 'name':
                        return [emp.lastName, emp.firstName].filter(Boolean).join(' ').toLowerCase();
                    case 'lastName':
                        return (emp.lastName || '').toLowerCase();
                    case 'jobTitle':
                        return (emp.jobTitle || '').toLowerCase();
                    case 'department':
                        return (emp.department || '').toLowerCase();
                    case 'shift':
                        return (emp.shift || '').toLowerCase();
                    case 'permissions':
                        const permOrder = { 'Admin': 0, 'User': 1, 'No Access': 2 };
                        return permOrder[emp.permissions] ?? 3;
                    case 'accessStatus':
                        const statusOrder = { 'active': 0, 'invited': 1, 'none': 2 };
                        return statusOrder[emp.accessStatus] ?? 3;
                    default:
                        return '';
                }
            };

            const filteredEmployees = (employees || []).filter(e => {
                if (!e) return false;
                // Filter by active/inactive status
                const isActive = e.isActive !== false; // Default to active if not set
                if (!showInactiveFilter && !isActive) return false; // Hide inactive unless filter is on
                if (showInactiveFilter && isActive) return false; // When showing inactive, hide active
                
                const searchLower = (searchTerm || '').toLowerCase();
                const fullName = [e.prefix, e.firstName, e.middleName, e.lastName, e.suffix]
                    .filter(Boolean).join(' ').toLowerCase();
                const matchesSearch = !searchTerm ||
                    fullName.includes(searchLower) ||
                    (e.name || '').toLowerCase().includes(searchLower) ||
                    (e.department || '').toLowerCase().includes(searchLower) ||
                    (e.jobTitle || '').toLowerCase().includes(searchLower) ||
                    (e.email || '').toLowerCase().includes(searchLower);
                const matchesPermission = permissionFilter === 'all' || e.permissions === permissionFilter;
                return matchesSearch && matchesPermission;
            }).sort((a, b) => {
                const aVal = getSortValue(a, sortColumn);
                const bVal = getSortValue(b, sortColumn);
                if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });

            const SortHeader = ({ column, label }) => (
                <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-200 select-none"
                    onClick={() => handleSort(column)}
                >
                    <div className="flex items-center gap-1">
                        {label}
                        <span className="text-gray-400">
                            {sortColumn === column ? (
                                sortDirection === 'asc' ? '▲' : '▼'
                            ) : '⇅'}
                        </span>
                    </div>
                </th>
            );

            // State for async operations
            const [saving, setSaving] = useState(false);
            const [inviting, setInviting] = useState(false);
            const [actionMessage, setActionMessage] = useState('');

            const handleSaveEmployee = async (employeeData) => {
                console.log('[PeopleModule] handleSaveEmployee called with:', employeeData);
                setSaving(true);
                setActionMessage('');
                
                try {
                    let newEmployee;
                    const fullName = [employeeData.firstName, employeeData.lastName].filter(Boolean).join(' ');
                    
                    if (editingEmployee) {
                        // Update existing employee
                        const updated = { ...editingEmployee, ...employeeData };
                        setEmployees(employees.map(e => e.id === editingEmployee.id ? updated : e));
                        
                        // If user has Supabase account and dashboard role changed, update in Supabase
                        if (editingEmployee.supabaseUserId && 
                            employeeData.dashboardRole && 
                            employeeData.dashboardRole !== editingEmployee.dashboardRole) {
                            try {
                                const result = await window.MODA_SUPABASE?.updateUserRole(
                                    editingEmployee.supabaseUserId, 
                                    employeeData.dashboardRole
                                );
                                if (result?.success) {
                                    console.log('[PeopleModule] Dashboard role updated in Supabase:', employeeData.dashboardRole);
                                } else {
                                    console.warn('[PeopleModule] Failed to update role in Supabase:', result?.error);
                                }
                            } catch (err) {
                                console.warn('[PeopleModule] Error updating role in Supabase:', err.message);
                            }
                        }
                        
                        setActionMessage(`Updated ${fullName}`);
                    } else {
                        // Create new employee
                        const useSupabase = window.MODA_SUPABASE_DATA?.isAvailable?.();
                        
                        if (useSupabase) {
                            // Try Supabase with timeout
                            try {
                                const timeoutPromise = new Promise((_, reject) => 
                                    setTimeout(() => reject(new Error('Timeout')), 5000)
                                );
                                const createPromise = window.MODA_SUPABASE_DATA.employees.create(employeeData);
                                newEmployee = await Promise.race([createPromise, timeoutPromise]);
                                console.log('[PeopleModule] Created in Supabase:', newEmployee);
                            } catch (err) {
                                console.warn('[PeopleModule] Supabase failed, using local:', err.message);
                                newEmployee = { 
                                    ...employeeData, 
                                    id: `emp_${Date.now()}`, 
                                    accessStatus: 'none',
                                    createdAt: new Date().toISOString()
                                };
                            }
                        } else {
                            // Local storage fallback
                            newEmployee = { 
                                ...employeeData, 
                                id: `emp_${Date.now()}`, 
                                accessStatus: 'none',
                                createdAt: new Date().toISOString()
                            };
                        }
                        
                        setEmployees(prev => [...prev, newEmployee]);
                        console.log('[PeopleModule] Employee added:', newEmployee);
                        setActionMessage(`Added ${fullName} to directory`);
                    }
                    
                    // Close modal after short delay to show success message
                    setTimeout(() => {
                        setShowEmployeeModal(false);
                        setEditingEmployee(null);
                        setActionMessage('');
                    }, 1000);
                    
                } catch (error) {
                    console.error('[PeopleModule] Save error:', error);
                    setActionMessage(`Error: ${error.message}`);
                } finally {
                    setSaving(false);
                }
            };

            const handleDeleteEmployee = async (id) => {
                console.log('[PeopleModule] handleDeleteEmployee called for:', id);
                if (!confirm('Are you sure you want to remove this employee?')) return;
                
                try {
                    const useSupabase = window.MODA_SUPABASE_DATA?.isAvailable?.();
                    console.log('[PeopleModule] useSupabase:', useSupabase);
                    
                    // Only delete from Supabase if employee has a valid UUID (not a local emp_* ID)
                    if (useSupabase && isValidUUID(id)) {
                        await window.MODA_SUPABASE_DATA.employees.delete(id);
                    } else if (useSupabase && !isValidUUID(id)) {
                        console.log('[PeopleModule] Skipping Supabase delete - employee has local ID:', id);
                    }
                    
                    setEmployees(employees.filter(e => e.id !== id));
                    console.log('[PeopleModule] Employee removed from UI');
                } catch (error) {
                    console.error('[PeopleModule] Delete error:', error);
                    alert(`Error deleting employee: ${error.message}`);
                }
            };

            const handleSendInvite = async (employee) => {
                console.log('[PeopleModule] handleSendInvite called for:', employee.email);
                const empName = [employee.prefix, employee.firstName, employee.middleName, employee.lastName, employee.suffix]
                    .filter(Boolean).join(' ') || employee.name || 'Employee';
                
                setInviting(true);
                setShowInviteConfirm(null);
                
                try {
                    // Check if user already exists
                    console.log('[PeopleModule] Checking if user exists...');
                    const existingUser = await window.MODA_SUPABASE?.checkUserByEmail(employee.email);
                    console.log('[PeopleModule] existingUser result:', existingUser);
                    
                    if (existingUser?.exists) {
                        // User already has account - just link them
                        const useSupabase = window.MODA_SUPABASE_DATA?.isAvailable?.();
                        
                        // Only update Supabase if employee has a valid UUID (not a local emp_* ID)
                        if (useSupabase && isValidUUID(employee.id)) {
                            await window.MODA_SUPABASE_DATA.employees.update(employee.id, {
                                supabaseUserId: existingUser.user.id,
                                accessStatus: 'active'
                            });
                        } else if (useSupabase && !isValidUUID(employee.id)) {
                            console.log('[PeopleModule] Skipping Supabase update - employee has local ID:', employee.id);
                        }
                        
                        setEmployees(employees.map(e => 
                            e.id === employee.id 
                                ? { ...e, supabaseUserId: existingUser.user.id, accessStatus: 'active' } 
                                : e
                        ));
                        
                        alert(`${empName} already has a MODA account and has been linked!\n\nNo invite email needed - they can log in immediately.`);
                        return;
                    }
                    
                    // Send invite via Supabase Edge Function
                    const result = await window.MODA_SUPABASE?.inviteUser(employee.email, {
                        name: empName,
                        dashboardRole: employee.permissions === 'Admin' ? 'admin' : 'employee',
                        invitedBy: window.MODA_SUPABASE?.userProfile?.name || 'MODA Admin'
                    });
                    
                    if (result?.success) {
                        // Update employee status
                        const useSupabase = window.MODA_SUPABASE_DATA?.isAvailable?.();
                        
                        // Only update Supabase if employee has a valid UUID (not a local emp_* ID)
                        // The Edge Function already updates by email, so this is just for consistency
                        if (useSupabase && isValidUUID(employee.id)) {
                            await window.MODA_SUPABASE_DATA.employees.update(employee.id, {
                                accessStatus: 'invited'
                            });
                        } else if (useSupabase && !isValidUUID(employee.id)) {
                            console.log('[PeopleModule] Skipping Supabase update - employee has local ID:', employee.id);
                        }
                        
                        setEmployees(employees.map(e => 
                            e.id === employee.id 
                                ? { ...e, accessStatus: 'invited', invitedAt: new Date().toISOString() } 
                                : e
                        ));
                        
                        alert(`Invite sent to ${empName} at ${employee.email}!\n\nThey will receive an email with a link to set up their password.`);
                    } else {
                        throw new Error(result?.error || 'Failed to send invite');
                    }
                } catch (error) {
                    console.error('[PeopleModule] Invite error:', error);
                    alert(`Error sending invite: ${error.message}`);
                } finally {
                    setInviting(false);
                }
            };

            const handleResendInvite = async (employee) => {
                // Resend is the same as send
                await handleSendInvite(employee);
            };

            // Admin function to set password directly
            const handleSetPassword = async () => {
                if (!showPasswordModal || !newPassword) return;
                
                if (newPassword.length < 6) {
                    alert('Password must be at least 6 characters');
                    return;
                }
                
                setSettingPassword(true);
                try {
                    const result = await window.MODA_SUPABASE?.adminSetPassword(showPasswordModal.email, newPassword);
                    
                    if (result?.success) {
                        // Update employee status to active
                        setEmployees(employees.map(e => 
                            e.id === showPasswordModal.id 
                                ? { ...e, accessStatus: 'active' } 
                                : e
                        ));
                        
                        alert(`Password set successfully for ${showPasswordModal.email}!\n\nThey can now log in with this password.`);
                        setShowPasswordModal(null);
                        setNewPassword('');
                    } else {
                        throw new Error(result?.error || 'Failed to set password');
                    }
                } catch (error) {
                    console.error('[PeopleModule] Set password error:', error);
                    alert(`Error setting password: ${error.message}`);
                } finally {
                    setSettingPassword(false);
                }
            };

            // Mark employee as inactive with reason and notes
            const handleMarkInactive = async (employee, inactiveReason, inactiveNotes) => {
                try {
                    const updateData = {
                        isActive: false,
                        inactiveReason: inactiveReason,
                        inactiveNotes: inactiveNotes,
                        inactiveDate: new Date().toISOString().split('T')[0] // YYYY-MM-DD
                    };
                    
                    const useSupabase = window.MODA_SUPABASE_DATA?.isAvailable?.();
                    
                    // Only update Supabase if employee has a valid UUID (not a local emp_* ID)
                    if (useSupabase && isValidUUID(employee.id)) {
                        await window.MODA_SUPABASE_DATA.employees.update(employee.id, updateData);
                    } else if (useSupabase && !isValidUUID(employee.id)) {
                        console.log('[PeopleModule] Skipping Supabase update - employee has local ID:', employee.id);
                    }
                    
                    setEmployees(employees.map(e => 
                        e.id === employee.id ? { ...e, ...updateData } : e
                    ));
                    
                    const empName = [employee.firstName, employee.lastName].filter(Boolean).join(' ');
                    setActionMessage(`${empName} marked as inactive`);
                    setShowInactiveModal(null);
                    
                    setTimeout(() => setActionMessage(''), 3000);
                } catch (error) {
                    console.error('[PeopleModule] Mark inactive error:', error);
                    alert(`Error marking employee inactive: ${error.message}`);
                }
            };

            // Reactivate an inactive employee
            const handleReactivate = async (employee) => {
                if (!confirm(`Reactivate ${employee.firstName} ${employee.lastName}?`)) return;
                
                try {
                    const updateData = {
                        isActive: true,
                        inactiveReason: null,
                        inactiveNotes: null,
                        inactiveDate: null
                    };
                    
                    const useSupabase = window.MODA_SUPABASE_DATA?.isAvailable?.();
                    
                    // Only update Supabase if employee has a valid UUID (not a local emp_* ID)
                    if (useSupabase && isValidUUID(employee.id)) {
                        await window.MODA_SUPABASE_DATA.employees.update(employee.id, updateData);
                    } else if (useSupabase && !isValidUUID(employee.id)) {
                        console.log('[PeopleModule] Skipping Supabase update - employee has local ID:', employee.id);
                    }
                    
                    setEmployees(employees.map(e => 
                        e.id === employee.id ? { ...e, ...updateData } : e
                    ));
                    
                    setActionMessage(`${employee.firstName} ${employee.lastName} reactivated`);
                    setTimeout(() => setActionMessage(''), 3000);
                } catch (error) {
                    console.error('[PeopleModule] Reactivate error:', error);
                    alert(`Error reactivating employee: ${error.message}`);
                }
            };

            const updateDepartmentSupervisor = (deptId, supervisorId) => {
                setDepartments(departments.map(d => 
                    d.id === deptId ? { ...d, supervisor: supervisorId } : d
                ));
            };

            // Department management functions
            const handleAddDepartment = () => {
                setEditingDept({ id: '', name: '', supervisor: null, linkedStationId: null });
                setShowDeptModal(true);
            };

            const handleEditDepartment = (dept) => {
                setEditingDept({ ...dept });
                setShowDeptModal(true);
            };

            const handleSaveDepartment = (deptData) => {
                if (editingDept.id) {
                    // Editing existing - also update employees if name changed
                    const oldName = departments.find(d => d.id === editingDept.id)?.name;
                    setDepartments(departments.map(d => 
                        d.id === editingDept.id ? { ...d, ...deptData } : d
                    ));
                    if (oldName && oldName !== deptData.name) {
                        setEmployees(employees.map(e => 
                            e.department === oldName ? { ...e, department: deptData.name } : e
                        ));
                    }
                } else {
                    // Adding new
                    const newDept = {
                        ...deptData,
                        id: deptData.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
                        employeeCount: 0
                    };
                    setDepartments([...departments, newDept]);
                }
                setShowDeptModal(false);
                setEditingDept(null);
            };

            const handleDeleteDepartment = (dept) => {
                const deptEmployees = employees.filter(e => e.department === dept.name);
                if (deptEmployees.length > 0) {
                    // Has employees - show confirmation
                    setShowDeleteDeptConfirm(dept);
                } else {
                    // No employees - delete immediately
                    setDepartments(departments.filter(d => d.id !== dept.id));
                }
            };

            const confirmDeleteDepartment = () => {
                if (showDeleteDeptConfirm) {
                    // Unassign employees from this department
                    setEmployees(employees.map(e => 
                        e.department === showDeleteDeptConfirm.name ? { ...e, department: '' } : e
                    ));
                    // Delete the department
                    setDepartments(departments.filter(d => d.id !== showDeleteDeptConfirm.id));
                    setShowDeleteDeptConfirm(null);
                }
            };

            const getLinkedStationName = (stationId) => {
                if (!stationId || !productionStages) return null;
                const station = productionStages.find(s => s.id === stationId);
                return station ? station.dept : null;
            };

            // Permission counts
            const permissionCounts = {
                all: employees.length,
                'No Access': employees.filter(e => e.permissions === 'No Access' || !e.permissions).length,
                'User': employees.filter(e => e.permissions === 'User').length,
                'Admin': employees.filter(e => e.permissions === 'Admin').length
            };

            // Access status badge
            const getAccessBadge = (emp) => {
                if (emp.permissions === 'No Access' || !emp.permissions) {
                    return <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">No Access</span>;
                }
                if (emp.accessStatus === 'invited') {
                    return <span className="px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800">Invited</span>;
                }
                if (emp.accessStatus === 'active') {
                    return <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800">Active</span>;
                }
                // Has permission but not invited yet
                return <span className="px-2 py-0.5 text-xs rounded bg-orange-100 text-orange-800">Pending Invite</span>;
            };

            // Permission badge
            const getPermissionBadge = (permission) => {
                if (permission === 'Admin') {
                    return <span className="px-2 py-0.5 text-xs rounded text-white" style={{backgroundColor: 'var(--autovol-red)'}}>Admin</span>;
                }
                if (permission === 'User') {
                    return <span className="px-2 py-0.5 text-xs rounded text-white" style={{backgroundColor: 'var(--autovol-teal)'}}>User</span>;
                }
                return <span className="px-2 py-0.5 text-xs rounded bg-gray-200 text-gray-600">No Access</span>;
            };

            return (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-autovol-navy">People</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveView('directory')}
                                className={`px-3 py-1 rounded ${activeView === 'directory' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}
                            >
                                Directory
                            </button>
                            <button
                                onClick={() => setActiveView('departments')}
                                className={`px-3 py-1 rounded ${activeView === 'departments' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}
                            >
                                Departments
                            </button>
                            <button
                                onClick={() => setActiveView('training')}
                                className={`px-3 py-1 rounded ${activeView === 'training' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}
                            >
                                Training
                            </button>
                        </div>
                    </div>

                    {activeView === 'training' ? (
                        <TrainingMatrixView 
                            employees={employees}
                            currentUser="Admin"
                            isAdmin={isAdmin}
                        />
                    ) : activeView === 'directory' ? (
                        <div className="space-y-4">
                            {/* Search, Filter, and Add */}
                            <div className="flex flex-wrap gap-4 items-center">
                                <input
                                    type="text"
                                    placeholder="Search by name, department, title, email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="flex-1 min-w-64 px-3 py-2 border rounded-lg"
                                />
                                <select
                                    value={permissionFilter}
                                    onChange={(e) => setPermissionFilter(e.target.value)}
                                    className="px-3 py-2 border rounded-lg"
                                >
                                    <option value="all">All Permissions ({permissionCounts.all})</option>
                                    <option value="No Access">No Access ({permissionCounts['No Access']})</option>
                                    <option value="User">User ({permissionCounts['User']})</option>
                                    <option value="Admin">Admin ({permissionCounts['Admin']})</option>
                                </select>
                                <button
                                    onClick={() => setShowInactiveFilter(!showInactiveFilter)}
                                    className={`px-3 py-2 rounded-lg border ${showInactiveFilter ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                >
                                    {showInactiveFilter ? '← Back to Active' : 'View Inactive'}
                                </button>
                                <button
                                    onClick={() => { setEditingEmployee(null); setShowEmployeeModal(true); }}
                                    className="px-4 py-2 btn-primary rounded-lg"
                                >
                                    + Add Employee
                                </button>
                            </div>

                            <p className="text-sm text-gray-500">
                                Showing {filteredEmployees.length} {showInactiveFilter ? 'inactive' : 'active'} employees
                            </p>

                            {/* Employee List */}
                            <div className="bg-white rounded-lg shadow overflow-x-auto">
                                {filteredEmployees.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        No employees found. {employees.length === 0 && 'Click "Add Employee" to get started.'}
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead style={{backgroundColor: 'var(--autovol-gray-bg)'}}>
                                            <tr>
                                                <SortHeader column="name" label="Name" />
                                                <SortHeader column="jobTitle" label="Job Title" />
                                                <SortHeader column="department" label="Department" />
                                                <SortHeader column="shift" label="Shift" />
                                                <SortHeader column="permissions" label="Permissions" />
                                                <SortHeader column="accessStatus" label="Access Status" />
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {filteredEmployees.map(emp => {
                                                const fullName = [emp.prefix, emp.firstName, emp.middleName, emp.lastName, emp.suffix]
                                                    .filter(Boolean).join(' ');
                                                return (
                                                <tr key={emp.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3">
                                                        <div>
                                                            <p className="font-medium">{fullName || emp.name || 'Unnamed'}</p>
                                                            <p className="text-xs text-gray-500">{emp.email}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">{emp.jobTitle || '-'}</td>
                                                    <td className="px-4 py-3 text-sm">{emp.department || '-'}</td>
                                                    <td className="px-4 py-3 text-sm">{emp.shift || '-'}</td>
                                                    <td className="px-4 py-3">{getPermissionBadge(emp.permissions)}</td>
                                                    <td className="px-4 py-3">{getAccessBadge(emp)}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex gap-2 flex-wrap">
                                                            <button 
                                                                onClick={() => { setEditingEmployee(emp); setShowEmployeeModal(true); }}
                                                                className="text-sm hover:underline"
                                                                style={{color: 'var(--autovol-teal)'}}
                                                            >
                                                                Edit
                                                            </button>
                                                            {/* Show Send Invite for users with permission but not yet invited */}
                                                            {(emp.permissions === 'User' || emp.permissions === 'Admin') && 
                                                             emp.accessStatus !== 'invited' && emp.accessStatus !== 'active' && (
                                                                emp.email ? (
                                                                    <button 
                                                                        onClick={() => setShowInviteConfirm(emp)}
                                                                        className="text-sm hover:underline"
                                                                        style={{color: 'var(--autovol-red)'}}
                                                                    >
                                                                        Send Invite
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400 italic">Add email to invite</span>
                                                                )
                                                            )}
                                                            {/* Show Resend for invited but not active */}
                                                            {emp.accessStatus === 'invited' && (
                                                                <button 
                                                                    onClick={() => handleResendInvite(emp)}
                                                                    className="text-sm text-orange-600 hover:underline"
                                                                >
                                                                    Resend
                                                                </button>
                                                            )}
                                                            {/* Show Set Password for admins - works for invited or existing users */}
                                                            {isAdmin && emp.email && (emp.permissions === 'User' || emp.permissions === 'Admin') && (
                                                                <button 
                                                                    onClick={() => setShowPasswordModal(emp)}
                                                                    className="text-sm text-purple-600 hover:underline"
                                                                >
                                                                    Set Password
                                                                </button>
                                                            )}
                                                            {/* Show Mark Inactive for active employees, Reactivate for inactive */}
                                                            {emp.isActive !== false ? (
                                                                <button 
                                                                    onClick={() => setShowInactiveModal(emp)}
                                                                    className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
                                                                >
                                                                    Mark Inactive
                                                                </button>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => handleReactivate(emp)}
                                                                    className="text-sm text-green-600 hover:underline"
                                                                >
                                                                    Reactivate
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => handleDeleteEmployee(emp.id)}
                                                                className="text-sm text-gray-400 hover:text-red-600 hover:underline"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ); })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Admin Add Button */}
                            {isAdmin && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleAddDepartment}
                                        className="px-4 py-2 btn-primary rounded-lg flex items-center gap-2"
                                    >
                                        <span className="text-lg">+</span> Add Department
                                    </button>
                                </div>
                            )}
                            
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {departments.map(dept => {
                                    const supervisor = employees.find(e => e.id === dept.supervisor);
                                    const deptEmployees = employees.filter(e => e.department === dept.name);
                                    const linkedStation = productionStages.find(s => s.id === dept.linkedStationId);
                                    
                                    return (
                                        <div key={dept.id} className="bg-white rounded-lg shadow p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                                                {isAdmin && (
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleEditDepartment(dept)}
                                                            className="p-1 text-gray-400 hover:text-autovol-teal"
                                                            title="Edit department"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteDepartment(dept)}
                                                            className="p-1 text-gray-400 hover:text-red-500"
                                                            title="Delete department"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                {linkedStation && (
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 text-xs rounded ${linkedStation.color} text-white`}>
                                                            {linkedStation.dept}
                                                        </span>
                                                        <span className="text-gray-400 text-xs">Station Link</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="text-gray-500">Supervisor:</span>
                                                    <select
                                                        value={dept.supervisor || ''}
                                                        onChange={(e) => updateDepartmentSupervisor(dept.id, e.target.value || null)}
                                                        className="ml-2 px-2 py-1 border rounded text-sm"
                                                        disabled={!isAdmin}
                                                    >
                                                        <option value="">None assigned</option>
                                                        {employees.map(emp => {
                                                            const empFullName = [emp.prefix, emp.firstName, emp.middleName, emp.lastName, emp.suffix]
                                                                .filter(Boolean).join(' ') || emp.name || 'Unnamed';
                                                            return (
                                                                <option key={emp.id} value={emp.id}>{empFullName}</option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Employees:</span>
                                                    <span className="ml-2 font-medium">{deptEmployees.length}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Add/Edit Employee Modal */}
                    {showEmployeeModal && (
                        <EmployeeModal 
                            employee={editingEmployee}
                            onClose={() => { setShowEmployeeModal(false); setEditingEmployee(null); setActionMessage(''); }}
                            onSave={handleSaveEmployee}
                            departments={departments}
                            saving={saving}
                            successMessage={actionMessage}
                        />
                    )}

                    {/* Add/Edit Department Modal */}
                    {showDeptModal && editingDept && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => { setShowDeptModal(false); setEditingDept(null); }}>
                            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                                <h3 className="text-lg font-bold mb-4" style={{color: 'var(--autovol-navy)'}}>
                                    {editingDept.id ? 'Edit Department' : 'Add Department'}
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Department Name *</label>
                                        <input
                                            type="text"
                                            value={editingDept.name}
                                            onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-autovol-teal focus:border-autovol-teal"
                                            placeholder="e.g., Human Resources"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Linked Production Station</label>
                                        <select
                                            value={editingDept.linkedStationId || ''}
                                            onChange={(e) => setEditingDept({ ...editingDept, linkedStationId: e.target.value || null })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-autovol-teal focus:border-autovol-teal"
                                        >
                                            <option value="">None (Non-Production)</option>
                                            {productionStages.map(stage => (
                                                <option key={stage.id} value={stage.id}>{stage.dept} - {stage.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">Link to a station on the Production Board for tracking</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor</label>
                                        <select
                                            value={editingDept.supervisor || ''}
                                            onChange={(e) => setEditingDept({ ...editingDept, supervisor: e.target.value || null })}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-autovol-teal focus:border-autovol-teal"
                                        >
                                            <option value="">None assigned</option>
                                            {employees.map(emp => {
                                                const empFullName = [emp.prefix, emp.firstName, emp.middleName, emp.lastName, emp.suffix]
                                                    .filter(Boolean).join(' ') || emp.name || 'Unnamed';
                                                return <option key={emp.id} value={emp.id}>{empFullName}</option>;
                                            })}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end mt-6">
                                    <button 
                                        onClick={() => { setShowDeptModal(false); setEditingDept(null); }}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => handleSaveDepartment(editingDept)}
                                        disabled={!editingDept.name.trim()}
                                        className="px-4 py-2 btn-primary rounded-lg disabled:opacity-50"
                                    >
                                        {editingDept.id ? 'Save Changes' : 'Add Department'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delete Department Confirmation Modal */}
                    {showDeleteDeptConfirm && (() => {
                        const deptEmployees = employees.filter(e => e.department === showDeleteDeptConfirm.name);
                        return (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteDeptConfirm(null)}>
                            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                                <h3 className="text-lg font-bold mb-2 text-red-600">Delete Department</h3>
                                <p className="text-gray-600 mb-4">
                                    Are you sure you want to delete <strong>{showDeleteDeptConfirm.name}</strong>?
                                </p>
                                {deptEmployees.length > 0 && (
                                    <div className="p-3 rounded-lg mb-4 bg-yellow-50 border border-yellow-200">
                                        <p className="text-sm text-yellow-800 font-medium">
                                            ⚠ Warning: This department has {deptEmployees.length} employee{deptEmployees.length !== 1 ? 's' : ''} assigned.
                                        </p>
                                        <p className="text-xs text-yellow-700 mt-1">
                                            They will be unassigned from this department but not deleted.
                                        </p>
                                    </div>
                                )}
                                {showDeleteDeptConfirm.linkedStationId && (
                                    <div className="p-3 rounded-lg mb-4 bg-blue-50 border border-blue-200">
                                        <p className="text-sm text-blue-800">
                                            This department is linked to a production station. The station board will not be affected.
                                        </p>
                                    </div>
                                )}
                                <div className="flex gap-2 justify-end">
                                    <button 
                                        onClick={() => setShowDeleteDeptConfirm(null)}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={confirmDeleteDepartment}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    >
                                        Delete Department
                                    </button>
                                </div>
                            </div>
                        </div>
                        );
                    })()}

                    {/* Invite Confirmation Modal */}
                    {showInviteConfirm && (() => {
                        const inviteeName = [showInviteConfirm.prefix, showInviteConfirm.firstName, showInviteConfirm.middleName, showInviteConfirm.lastName, showInviteConfirm.suffix]
                            .filter(Boolean).join(' ') || showInviteConfirm.name || 'this employee';
                        return (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowInviteConfirm(null)}>
                            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                                <h3 className="text-lg font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>Send Invite</h3>
                                <p className="text-gray-600 mb-4">
                                    Send MODA access invite to <strong>{inviteeName}</strong>?
                                </p>
                                <p className="text-sm text-gray-500 mb-4">
                                    An email will be sent to: <strong>{showInviteConfirm.email}</strong>
                                </p>
                                <div className="p-3 rounded-lg mb-4" style={{backgroundColor: 'var(--autovol-gray-bg)'}}>
                                    <p className="text-sm">
                                        <span className="text-gray-500">Permission Level:</span>{' '}
                                        <span className="font-medium">{showInviteConfirm.permissions}</span>
                                    </p>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button 
                                        onClick={() => setShowInviteConfirm(null)}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={() => handleSendInvite(showInviteConfirm)}
                                        className="px-4 py-2 btn-primary rounded-lg"
                                    >
                                        Send Invite
                                    </button>
                                </div>
                            </div>
                        </div>
                        );
                    })()}

                    {/* Mark Inactive Modal */}
                    {showInactiveModal && (() => {
                        const emp = showInactiveModal;
                        const empName = [emp.firstName, emp.lastName].filter(Boolean).join(' ');
                        return (
                        <MarkInactiveModal
                            employee={emp}
                            employeeName={empName}
                            onClose={() => setShowInactiveModal(null)}
                            onConfirm={(reason, notes) => handleMarkInactive(emp, reason, notes)}
                        />
                        );
                    })()}

                    {/* Set Password Modal */}
                    {showPasswordModal && (() => {
                        const emp = showPasswordModal;
                        const empName = [emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.email;
                        return (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => { setShowPasswordModal(null); setNewPassword(''); }}>
                            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                                <h3 className="text-lg font-bold mb-2" style={{color: 'var(--autovol-navy)'}}>Set Password</h3>
                                <p className="text-gray-600 mb-4">
                                    Set a password for <strong>{empName}</strong> ({emp.email})
                                </p>
                                <p className="text-sm text-gray-500 mb-4">
                                    This will allow the user to log in immediately with this password. Use this if email invites are not working.
                                </p>
                                
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        New Password <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter password (min 6 characters)"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-400"
                                        autoFocus
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Password is shown in plain text so you can share it with the user</p>
                                </div>
                                
                                <div className="flex justify-end gap-3">
                                    <button 
                                        onClick={() => { setShowPasswordModal(null); setNewPassword(''); }}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                        disabled={settingPassword}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSetPassword}
                                        disabled={settingPassword || newPassword.length < 6}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                                    >
                                        {settingPassword ? 'Setting...' : 'Set Password'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        );
                    })()}
                </div>
            );
        }

        // Mark Inactive Modal Component
        function MarkInactiveModal({ employee, employeeName, onClose, onConfirm }) {
            const [reason, setReason] = useState('');
            const [notes, setNotes] = useState('');
            
            const INACTIVE_REASONS = [
                { value: 'Termination', label: 'Termination' },
                { value: 'Resignation', label: 'Resignation' },
                { value: 'Leave-of-Absence', label: 'Leave of Absence' },
                { value: 'Deceased', label: 'Deceased' },
                { value: 'Other', label: 'Other' }
            ];
            
            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-2 text-gray-800">Mark Employee Inactive</h3>
                        <p className="text-gray-600 mb-4">
                            Mark <strong>{employeeName}</strong> as inactive?
                        </p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Inactive Reason <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-400"
                                >
                                    <option value="">Select reason...</option>
                                    {INACTIVE_REASONS.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes (optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add any additional details..."
                                    rows={3}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-400 resize-none"
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-2 justify-end mt-6">
                            <button 
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => onConfirm(reason, notes)}
                                disabled={!reason}
                                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Mark Inactive
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // Employee Modal (Add/Edit)
        function EmployeeModal({ employee, onClose, onSave, departments, saving, successMessage }) {
            const [formData, setFormData] = useState({
                prefix: employee?.prefix || '',
                firstName: employee?.firstName || '',
                middleName: employee?.middleName || '',
                lastName: employee?.lastName || '',
                suffix: employee?.suffix || '',
                jobTitle: employee?.jobTitle || '',
                department: employee?.department || '',
                shift: employee?.shift || 'N/A',
                hireDate: employee?.hireDate || '',
                birthDate: employee?.birthDate || '',
                email: employee?.email || '',
                phone: employee?.phone || '',
                company: employee?.company || 'Autovol',
                permissions: employee?.permissions || 'No Access',
                dashboardRole: employee?.dashboardRole || 'employee',
                accessStatus: employee?.accessStatus || 'none'
            });
            
            // State for custom permissions editor
            const [showCustomPermissions, setShowCustomPermissions] = useState(false);
            const [hasCustomPermissions, setHasCustomPermissions] = useState(false);
            
            // Check if user has custom permissions on load
            useEffect(() => {
                if (employee?.supabaseUserId) {
                    window.MODA_SUPABASE?.getUserCustomPermissions(employee.supabaseUserId)
                        .then(result => {
                            if (result?.hasCustomPermissions) {
                                setHasCustomPermissions(true);
                            }
                        })
                        .catch(() => {});
                }
            }, [employee?.supabaseUserId]);
            
            const dashboardRoles = window.DEFAULT_DASHBOARD_ROLES || [
                { id: 'admin', name: 'Admin' },
                { id: 'executive', name: 'Executive' },
                { id: 'department-supervisor', name: 'Department Supervisor' },
                { id: 'coordinator', name: 'Coordinator' },
                { id: 'employee', name: 'Employee' }
            ];

            const [showInvitePrompt, setShowInvitePrompt] = useState(false);

            const handlePermissionChange = (newPermission) => {
                const wasNoAccess = formData.permissions === 'No Access' || !formData.permissions;
                const nowHasAccess = newPermission === 'User' || newPermission === 'Admin';
                
                setFormData({ ...formData, permissions: newPermission });
                
                // Show invite prompt when upgrading from No Access to User/Admin
                if (wasNoAccess && nowHasAccess && formData.email) {
                    setShowInvitePrompt(true);
                } else {
                    setShowInvitePrompt(false);
                }
            };

            const handleSubmit = () => {
                console.log('[EmployeeModal] handleSubmit called with formData:', formData);
                onSave(formData);
            };

            return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{zIndex: 9999}} onClick={onClose}>
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold" style={{color: 'var(--autovol-navy)'}}>
                                    {employee ? 'Edit Employee' : 'Add Employee'}
                                </h2>
                                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                            </div>
                            
                            {/* Success Message */}
                            {successMessage && (
                                <div className="mb-4 p-3 rounded-lg text-sm font-medium" style={{backgroundColor: '#E6F4F5', color: '#007B8A'}}>
                                    {successMessage}
                                </div>
                            )}
                            
                            <div className="space-y-4">
                                {/* Row 1: Prefix, First Name, Middle Name */}
                                <div className="grid grid-cols-6 gap-3">
                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
                                        <select
                                            value={formData.prefix}
                                            onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg"
                                        >
                                            <option value=""></option>
                                            <option value="Mr.">Mr.</option>
                                            <option value="Mrs.">Mrs.</option>
                                            <option value="Ms.">Ms.</option>
                                            <option value="Dr.">Dr.</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                                        <input
                                            type="text"
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                                        <input
                                            type="text"
                                            value={formData.middleName}
                                            onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Suffix</label>
                                        <select
                                            value={formData.suffix}
                                            onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg"
                                        >
                                            <option value=""></option>
                                            <option value="Jr.">Jr.</option>
                                            <option value="Sr.">Sr.</option>
                                            <option value="II">II</option>
                                            <option value="III">III</option>
                                            <option value="IV">IV</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 2: Last Name, Job Title */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                                        <input
                                            type="text"
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                                        <input
                                            type="text"
                                            value={formData.jobTitle}
                                            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                            placeholder="e.g., Framer, Electrician"
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                </div>

                                {/* Row 2: Department */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                                    <select
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    >
                                        <option value="">Select department...</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.name}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Row 3: Shift, Hire Date, Birth Date */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                                        <select
                                            value={formData.shift}
                                            onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg"
                                        >
                                            <option value="N/A">N/A</option>
                                            <option value="Shift-A">Shift-A (Mon-Thu)</option>
                                            <option value="Shift-B">Shift-B (Fri-Sun)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                                        <input
                                            type="date"
                                            value={formData.hireDate}
                                            onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
                                        <input
                                            type="date"
                                            value={formData.birthDate}
                                            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                </div>

                                {/* Row 4: Email, Phone */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="email@autovol.com"
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="(555) 123-4567"
                                            className="w-full px-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                </div>

                                {/* Row 5: Company */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                                    <input
                                        type="text"
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        placeholder="Autovol"
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Defaults to Autovol for internal employees</p>
                                </div>

                                {/* Permissions */}
                                <div className="border-t pt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">MODA Permissions</label>
                                    <div className="flex gap-2">
                                        {['No Access', 'User', 'Admin'].map(perm => (
                                            <button
                                                key={perm}
                                                type="button"
                                                onClick={() => handlePermissionChange(perm)}
                                                className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition ${
                                                    formData.permissions === perm
                                                        ? perm === 'Admin' 
                                                            ? 'border-red-500 bg-red-50 text-red-700'
                                                            : perm === 'User'
                                                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                                                : 'border-gray-400 bg-gray-100 text-gray-700'
                                                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                                }`}
                                            >
                                                {perm}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {formData.permissions === 'No Access' && 'Employee is in directory only - no MODA login access'}
                                        {formData.permissions === 'User' && 'Can view and update production data in MODA'}
                                        {formData.permissions === 'Admin' && 'Full MODA access including user management'}
                                    </p>

                                    {/* Invite Prompt */}
                                    {showInvitePrompt && (
                                        <div className="mt-3 p-3 rounded-lg" style={{backgroundColor: 'var(--autovol-red-light)'}}>
                                            <p className="text-sm" style={{color: 'var(--autovol-red)'}}>
                                                <strong>Note:</strong> After saving, you'll be able to send an invite to this employee's email.
                                            </p>
                                        </div>
                                    )}
                                    
                                    {!formData.email && (formData.permissions === 'User' || formData.permissions === 'Admin') && (
                                        <div className="mt-3 p-3 rounded-lg bg-yellow-50">
                                            <p className="text-sm text-yellow-800">
                                                <strong>Note:</strong> Add an email address to enable sending invites.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Dashboard Role - show when user has access, disabled when No Access */}
                                <div className="border-t pt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Dashboard Role</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={formData.dashboardRole}
                                            onChange={(e) => setFormData({ ...formData, dashboardRole: e.target.value })}
                                            disabled={formData.permissions === 'No Access'}
                                            className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                                                formData.permissions === 'No Access' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
                                            }`}
                                        >
                                            {dashboardRoles.filter(r => r.id !== 'no-access').map(role => (
                                                <option key={role.id} value={role.id}>
                                                    {role.name}
                                                </option>
                                            ))}
                                        </select>
                                        {/* Custom Permissions Button - only show for existing users with Supabase account */}
                                        {employee?.supabaseUserId && formData.permissions !== 'No Access' && (
                                            <button
                                                type="button"
                                                onClick={() => setShowCustomPermissions(true)}
                                                className={`px-3 py-2 rounded-lg border-2 text-sm font-medium whitespace-nowrap ${
                                                    hasCustomPermissions
                                                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                                                        : 'border-gray-300 bg-white text-gray-600 hover:border-teal-500 hover:text-teal-600'
                                                }`}
                                            >
                                                {hasCustomPermissions ? 'Edit Custom' : 'Customize'}
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {formData.permissions === 'No Access' 
                                            ? 'Set permissions to User or Admin to enable dashboard role selection'
                                            : hasCustomPermissions
                                                ? 'This user has custom tab permissions that override their role defaults'
                                                : (dashboardRoles.find(r => r.id === formData.dashboardRole)?.description || 'Controls which tabs and features this user can access')
                                        }
                                    </p>
                                    {/* Custom Permissions Hint */}
                                    {!employee?.supabaseUserId && formData.permissions !== 'No Access' && (
                                        <p className="text-xs text-blue-600 mt-2">
                                            Tip: After the user accepts their invite, you can set custom tab permissions for them.
                                        </p>
                                    )}
                                </div>
                                
                                {/* Custom Permissions Editor Modal */}
                                {showCustomPermissions && employee?.supabaseUserId && (
                                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{zIndex: 10000}} onClick={() => setShowCustomPermissions(false)}>
                                        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                                            {window.CustomPermissionsEditor ? (
                                                <window.CustomPermissionsEditor
                                                    userId={employee.supabaseUserId}
                                                    userEmail={employee.email}
                                                    userName={[employee.firstName, employee.lastName].filter(Boolean).join(' ')}
                                                    userRole={formData.dashboardRole}
                                                    onClose={() => setShowCustomPermissions(false)}
                                                    onSave={(updatedUser) => {
                                                        setHasCustomPermissions(
                                                            updatedUser.custom_tab_permissions != null && 
                                                            Object.keys(updatedUser.custom_tab_permissions).length > 0
                                                        );
                                                        setShowCustomPermissions(false);
                                                    }}
                                                />
                                            ) : (
                                                <div className="text-center py-8 text-gray-500">
                                                    Loading Custom Permissions Editor...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex gap-2 justify-end mt-6">
                                <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    disabled={!formData.firstName || !formData.lastName || saving}
                                    className="px-4 py-2 btn-primary rounded-lg disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : (employee ? 'Save Changes' : 'Add Employee')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }


// Export for use in App.jsx
window.PeopleModule = PeopleModule;
window.EmployeeModal = EmployeeModal;

