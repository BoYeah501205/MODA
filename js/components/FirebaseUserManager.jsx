/**
 * Firebase User Manager Component
 * 
 * Provides admin UI for managing Firebase users with dashboard role integration.
 * This replaces the scattered permission systems with a unified approach.
 * 
 * Usage: Include in Admin tab or as standalone component
 * <FirebaseUserManager auth={auth} />
 */

function FirebaseUserManager({ auth }) {
    const { useState, useEffect } = React;
    
    const [firebaseUsers, setFirebaseUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [actionMessage, setActionMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Get dashboard roles from the auth system
    const availableRoles = auth.dashboardRoles?.roles || [];

    // Load Firebase users on mount
    useEffect(() => {
        loadUsers();
    }, []);

    // Clear messages after 5 seconds
    useEffect(() => {
        if (actionMessage) {
            const timer = setTimeout(() => setActionMessage(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [actionMessage]);

    const loadUsers = async () => {
        if (!window.MODA_FIREBASE || !MODA_FIREBASE.isInitialized) {
            setError('Firebase not initialized. Please refresh the page.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const users = await MODA_FIREBASE.getAllUsers();
            setFirebaseUsers(users || []);
            setError('');
        } catch (err) {
            console.error('[UserManager] Load error:', err);
            setError(err.message || 'Failed to load users');
        }
        setLoading(false);
    };

    const handleCreateUser = async (formData, createProfileOnly = false) => {
        setError('');
        setActionMessage('');
        
        try {
            if (createProfileOnly) {
                // Create profile for existing Auth user
                await MODA_FIREBASE.createProfileForExistingUser(formData.email, {
                    name: formData.name,
                    dashboardRole: formData.dashboardRole,
                    department: formData.department,
                    jobTitle: formData.jobTitle,
                    phone: formData.phone
                });
                
                setActionMessage(`✅ Profile created for "${formData.email}". They can now log in with their existing password.`);
                setShowAddModal(false);
                loadUsers();
            } else {
                // Create new Firebase Auth user + profile
                const result = await MODA_FIREBASE.createUser(
                    formData.email,
                    formData.password,
                    {
                        name: formData.name,
                        role: formData.dashboardRole,
                        dashboardRole: formData.dashboardRole,
                        department: formData.department,
                        jobTitle: formData.jobTitle,
                        phone: formData.phone
                    }
                );
                
                setActionMessage(`✅ User "${formData.email}" created! You'll be logged out - please log back in.`);
                setShowAddModal(false);
                
                // Firebase client SDK signs in as new user, so we need to reload
                setTimeout(() => {
                    window.location.reload();
                }, 2500);
            }
        } catch (err) {
            console.error('[UserManager] Create error:', err);
            
            // Special handling for "email already in use" error
            if (err.code === 'auth/email-already-in-use') {
                setError(`This email is already registered in Firebase Auth but has no profile. Click "Create Profile Only" to add their profile.`);
                return { emailExists: true, formData };
            }
            
            const msg = MODA_FIREBASE.getErrorMessage ? MODA_FIREBASE.getErrorMessage(err.code) : err.message;
            setError(msg);
        }
    };

    const handleUpdateUser = async (uid, updates) => {
        setError('');
        try {
            await MODA_FIREBASE.updateUserProfile(uid, {
                ...updates,
                role: updates.dashboardRole // Keep role in sync
            });
            setActionMessage('✅ User updated successfully');
            setEditingUser(null);
            loadUsers();
        } catch (err) {
            setError(err.message || 'Failed to update user');
        }
    };

    const handleToggleActive = async (user) => {
        try {
            if (user.active === false) {
                await MODA_FIREBASE.reactivateUser(user.uid);
                setActionMessage(`✅ ${user.name || user.email} reactivated`);
            } else {
                await MODA_FIREBASE.deactivateUser(user.uid);
                setActionMessage(`✅ ${user.name || user.email} deactivated`);
            }
            loadUsers();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSendPasswordReset = async (email) => {
        try {
            await MODA_FIREBASE.resetPassword(email);
            setActionMessage(`✅ Password reset email sent to ${email}`);
        } catch (err) {
            const msg = MODA_FIREBASE.getErrorMessage ? MODA_FIREBASE.getErrorMessage(err.code) : err.message;
            setError(msg);
        }
    };

    // Filter users by search term
    const filteredUsers = firebaseUsers.filter(user => {
        if (!searchTerm) return true;
        const term = (searchTerm || '').toLowerCase();
        return (
            (user.email || '').toLowerCase().includes(term) ||
            (user.name || '').toLowerCase().includes(term) ||
            (user.department || '').toLowerCase().includes(term) ||
            (user.dashboardRole || '').toLowerCase().includes(term)
        );
    });

    // Get role display info
    const getRoleInfo = (roleId) => {
        const role = availableRoles.find(r => r.id === roleId);
        return role || { id: roleId, name: roleId, description: '' };
    };

    // Role badge colors
    const getRoleBadgeClass = (roleId) => {
        const colors = {
            'admin': 'bg-purple-100 text-purple-800',
            'executive': 'bg-blue-100 text-blue-800',
            'department-supervisor': 'bg-green-100 text-green-800',
            'coordinator': 'bg-yellow-100 text-yellow-800',
            'employee': 'bg-gray-100 text-gray-800',
            'no-access': 'bg-red-100 text-red-800'
        };
        return colors[roleId] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    🔐 User Access Management
                </h2>
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                    <span className="ml-3 text-gray-500">Loading users...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        🔐 User Access Management
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Manage who can access MODA and their permissions
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 rounded-lg font-medium text-white flex items-center gap-2"
                    style={{ backgroundColor: 'var(--autovol-teal)' }}
                >
                    <span>+</span> Add User
                </button>
            </div>

            {/* Messages */}
            {error && (
                <div className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2" 
                     style={{backgroundColor: '#FDEAEA', color: '#E31B23'}}>
                    <span>⚠️</span> {error}
                    <button onClick={() => setError('')} className="ml-auto text-lg">&times;</button>
                </div>
            )}

            {actionMessage && (
                <div className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2" 
                     style={{backgroundColor: '#E6F4F5', color: '#007B8A'}}>
                    {actionMessage}
                </div>
            )}

            {/* Search */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search by name, email, department, or role..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-gray-700">{firebaseUsers.length}</div>
                    <div className="text-xs text-gray-500">Total Users</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">
                        {firebaseUsers.filter(u => u.active !== false).length}
                    </div>
                    <div className="text-xs text-gray-500">Active</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                        {firebaseUsers.filter(u => u.dashboardRole === 'admin').length}
                    </div>
                    <div className="text-xs text-gray-500">Admins</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-600">
                        {firebaseUsers.filter(u => u.active === false).length}
                    </div>
                    <div className="text-xs text-gray-500">Inactive</div>
                </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto border rounded-lg">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                                    {searchTerm ? 'No users match your search' : 'No users found. Click "Add User" to create one.'}
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map(user => {
                                const roleInfo = getRoleInfo(user.dashboardRole);
                                const isCurrentUser = MODA_FIREBASE.currentUser?.uid === user.uid;
                                
                                return (
                                    <tr key={user.uid} className={`${user.active === false ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white font-medium">
                                                    {(user.name || user.email || '?')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {user.name || 'No name'}
                                                        {isCurrentUser && <span className="ml-2 text-xs text-teal-600">(You)</span>}
                                                    </div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeClass(user.dashboardRole)}`}>
                                                {roleInfo.name}
                                            </span>
                                            {roleInfo.description && (
                                                <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                                                    {roleInfo.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {user.department || '-'}
                                            {user.jobTitle && (
                                                <div className="text-xs text-gray-400">{user.jobTitle}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                user.active === false ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                                {user.active === false ? 'Inactive' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2 flex-wrap">
                                                <button
                                                    onClick={() => setEditingUser(user)}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleSendPasswordReset(user.email)}
                                                    className="text-orange-600 hover:text-orange-800 text-sm font-medium"
                                                >
                                                    Reset PW
                                                </button>
                                                {!isCurrentUser && (
                                                    <button
                                                        onClick={() => handleToggleActive(user)}
                                                        className={`text-sm font-medium ${
                                                            user.active === false 
                                                                ? 'text-green-600 hover:text-green-800' 
                                                                : 'text-red-600 hover:text-red-800'
                                                        }`}
                                                    >
                                                        {user.active === false ? 'Activate' : 'Deactivate'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Role Legend */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Role Permissions</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {availableRoles.map(role => (
                        <div key={role.id} className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded ${getRoleBadgeClass(role.id)}`}>
                                {role.name}
                            </span>
                            <span className="text-gray-500 truncate">{role.description}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <AddUserModal
                    availableRoles={availableRoles}
                    onSave={handleCreateUser}
                    onClose={() => setShowAddModal(false)}
                />
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    availableRoles={availableRoles}
                    onSave={(updates) => handleUpdateUser(editingUser.uid, updates)}
                    onClose={() => setEditingUser(null)}
                    isCurrentUser={MODA_FIREBASE.currentUser?.uid === editingUser.uid}
                />
            )}
        </div>
    );
}

// Add User Modal Component
function AddUserModal({ availableRoles, onSave, onClose }) {
    const { useState } = React;
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        dashboardRole: 'employee',
        department: '',
        jobTitle: '',
        phone: ''
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [emailExistsError, setEmailExistsError] = useState(false);

    const generatePassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 10; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData({ ...formData, password });
        setShowPassword(true);
    };

    const handleSubmit = async (e, createProfileOnly = false) => {
        if (e) e.preventDefault();
        setLoading(true);
        const result = await onSave(formData, createProfileOnly);
        if (result?.emailExists) {
            setEmailExistsError(true);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold">Add New User</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                placeholder="user@autovol.com"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Temporary Password <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        minLength={6}
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 pr-10"
                                        placeholder="Min 6 characters"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                                    >
                                        {showPassword ? '🙈' : '👁'}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={generatePassword}
                                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm whitespace-nowrap"
                                >
                                    Generate
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">User should change this after first login</p>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                placeholder="John Smith"
                            />
                        </div>

                        {/* Role */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Dashboard Role <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.dashboardRole}
                                onChange={e => setFormData({...formData, dashboardRole: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            >
                                {availableRoles.filter(r => r.id !== 'no-access').map(role => (
                                    <option key={role.id} value={role.id}>
                                        {role.name} - {role.description}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Department & Job Title */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={e => setFormData({...formData, department: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                    placeholder="e.g., Drywall"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                                <input
                                    type="text"
                                    value={formData.jobTitle}
                                    onChange={e => setFormData({...formData, jobTitle: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                    placeholder="e.g., Supervisor"
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                placeholder="(555) 123-4567"
                            />
                        </div>

                        {/* Warning */}
                        {!emailExistsError && (
                            <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                                <strong>⚠️ Note:</strong> After creating a user, you will be logged out and need to log back in. 
                                This is a Firebase limitation.
                            </div>
                        )}

                        {/* Email exists warning */}
                        {emailExistsError && (
                            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                                <strong>ℹ️ User exists in Firebase Auth</strong><br/>
                                This email is already registered but has no profile in MODA. 
                                Click "Create Profile Only" to add their profile without changing their password.
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            {emailExistsError ? (
                                <button
                                    type="button"
                                    onClick={() => handleSubmit(null, true)}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
                                    style={{ backgroundColor: 'var(--autovol-teal)' }}
                                >
                                    {loading ? 'Creating...' : 'Create Profile Only'}
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
                                    style={{ backgroundColor: 'var(--autovol-teal)' }}
                                >
                                    {loading ? 'Creating...' : 'Create User'}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Edit User Modal Component
function EditUserModal({ user, availableRoles, onSave, onClose, isCurrentUser }) {
    const { useState } = React;
    
    const [formData, setFormData] = useState({
        name: user.name || '',
        dashboardRole: user.dashboardRole || 'employee',
        department: user.department || '',
        jobTitle: user.jobTitle || '',
        phone: user.phone || ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        await onSave(formData);
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold">Edit User</h3>
                            <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        {/* Role */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dashboard Role</label>
                            <select
                                value={formData.dashboardRole}
                                onChange={e => setFormData({...formData, dashboardRole: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                disabled={isCurrentUser && user.dashboardRole === 'admin'}
                            >
                                {availableRoles.map(role => (
                                    <option key={role.id} value={role.id}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                            {isCurrentUser && user.dashboardRole === 'admin' && (
                                <p className="text-xs text-orange-600 mt-1">You cannot change your own admin role</p>
                            )}
                        </div>

                        {/* Department & Job Title */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <input
                                    type="text"
                                    value={formData.department}
                                    onChange={e => setFormData({...formData, department: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                                <input
                                    type="text"
                                    value={formData.jobTitle}
                                    onChange={e => setFormData({...formData, jobTitle: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
                                style={{ backgroundColor: 'var(--autovol-teal)' }}
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
