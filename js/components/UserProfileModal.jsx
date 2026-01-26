/**
 * UserProfileModal.jsx - User Profile View
 * 
 * Phase 6 of MODA Dashboard Migration
 * Shows current user's profile information when clicking their name
 * 
 * Sections:
 * - Identity: Name, email, profile initials
 * - Role & Access: Dashboard role, visible tabs, permissions
 * - Employment: Job title, department, shift, hire date
 * - Account: Status, last login
 */

function UserProfileModal({ auth, employees = [], onClose, darkMode, setDarkMode, onOpenViewsSettings }) {
    const { useState, useMemo } = React;
    const viewportSize = window.useViewportSize ? window.useViewportSize() : 'desktop';
    const isMobileOrTablet = viewportSize === 'mobile' || viewportSize === 'tablet';
    
    // Find employee record for current user
    const employeeRecord = useMemo(() => {
        const email = auth?.currentUser?.email;
        if (!email) return null;
        return employees.find(e => 
            (e.email || '').toLowerCase() === (email || '').toLowerCase()
        );
    }, [auth?.currentUser?.email, employees]);
    
    // Get user initials for avatar
    const initials = useMemo(() => {
        const name = auth?.currentUser?.name || auth?.currentUser?.firstName || 'U';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }, [auth?.currentUser]);
    
    // Format date helper
    const formatDate = (dateStr) => {
        if (!dateStr) return 'Not set';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center gap-4">
                    {/* Avatar */}
                    <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white"
                        style={{ backgroundColor: 'var(--autovol-teal)' }}
                    >
                        {initials}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                            {auth?.currentUser?.name || 'User'}
                        </h2>
                        <p className="text-sm text-gray-500">{auth?.currentUser?.email}</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Role & Access */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                            <span className="icon-admin" style={{ width: '16px', height: '16px', display: 'inline-block' }}></span>
                            Role & Access
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Dashboard Role</span>
                                <span 
                                    className="px-3 py-1 rounded-full text-sm font-medium"
                                    style={{ 
                                        backgroundColor: auth?.isAdmin ? 'var(--autovol-red)' : 'var(--autovol-teal)',
                                        color: 'white'
                                    }}
                                >
                                    {auth?.userRole?.name || auth?.currentUser?.dashboardRole || 'User'}
                                </span>
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="text-sm text-gray-600">Visible Tabs</span>
                                <div className="text-right">
                                    <span className="text-sm font-medium" style={{ color: 'var(--autovol-navy)' }}>
                                        {auth?.visibleTabs?.length || 0} tabs
                                    </span>
                                    <div className="text-xs text-gray-400 mt-1 max-w-48">
                                        {auth?.visibleTabs?.slice(0, 5).join(', ')}
                                        {auth?.visibleTabs?.length > 5 && ` +${auth.visibleTabs.length - 5} more`}
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Can Edit</span>
                                <span className={`text-sm font-medium ${auth?.userRole?.capabilities?.canEdit ? 'text-green-600' : 'text-gray-400'}`}>
                                    {auth?.userRole?.capabilities?.canEdit ? 'Yes' : 'View Only'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Admin Access</span>
                                <span className={`text-sm font-medium ${auth?.canAccessAdmin ? 'text-green-600' : 'text-gray-400'}`}>
                                    {auth?.canAccessAdmin ? 'Yes' : 'No'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Employment Info (if employee record exists) */}
                    {employeeRecord && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                <span className="icon-people" style={{ width: '16px', height: '16px', display: 'inline-block' }}></span>
                                Employment
                            </h3>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                {employeeRecord.jobTitle && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Job Title</span>
                                        <span className="text-sm font-medium" style={{ color: 'var(--autovol-navy)' }}>
                                            {employeeRecord.jobTitle}
                                        </span>
                                    </div>
                                )}
                                {employeeRecord.department && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Department</span>
                                        <span className="text-sm font-medium" style={{ color: 'var(--autovol-navy)' }}>
                                            {employeeRecord.department}
                                        </span>
                                    </div>
                                )}
                                {employeeRecord.shift && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Shift</span>
                                        <span className="text-sm font-medium" style={{ color: 'var(--autovol-navy)' }}>
                                            {employeeRecord.shift}
                                        </span>
                                    </div>
                                )}
                                {employeeRecord.hireDate && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Hire Date</span>
                                        <span className="text-sm font-medium" style={{ color: 'var(--autovol-navy)' }}>
                                            {formatDate(employeeRecord.hireDate)}
                                        </span>
                                    </div>
                                )}
                                {employeeRecord.phone && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Phone</span>
                                        <span className="text-sm font-medium" style={{ color: 'var(--autovol-navy)' }}>
                                            {employeeRecord.phone}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Settings (shown on mobile/tablet) */}
                    {isMobileOrTablet && setDarkMode && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                <span className="icon-cog" style={{ width: '16px', height: '16px', display: 'inline-block' }}></span>
                                Settings
                            </h3>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Theme</span>
                                    <button
                                        onClick={() => setDarkMode(prev => !prev)}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition touch-target"
                                    >
                                        <span className={darkMode ? 'icon-sun' : 'icon-moon'} style={{ width: '18px', height: '18px', display: 'inline-block' }}></span>
                                        <span className="text-sm font-medium">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Settings */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                            <span className="icon-cog" style={{ width: '16px', height: '16px', display: 'inline-block' }}></span>
                            Settings
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            {/* Customize Navigation */}
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="text-sm text-gray-600">Navigation</span>
                                    <p className="text-xs text-gray-400">Hide or reorder tabs</p>
                                </div>
                                <button
                                    onClick={() => {
                                        if (onOpenViewsSettings) {
                                            onClose();
                                            onOpenViewsSettings();
                                        }
                                    }}
                                    className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition"
                                    style={{ color: 'var(--autovol-navy)' }}
                                >
                                    Customize
                                </button>
                            </div>
                            
                            {/* Theme Toggle (shown on mobile/tablet or always) */}
                            {setDarkMode && (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Theme</span>
                                    <button
                                        onClick={() => setDarkMode(prev => !prev)}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
                                    >
                                        <span className={darkMode ? 'icon-sun' : 'icon-moon'} style={{ width: '16px', height: '16px', display: 'inline-block' }}></span>
                                        <span className="text-sm">{darkMode ? 'Light' : 'Dark'}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Account Status */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
                            <span className="icon-tracker" style={{ width: '16px', height: '16px', display: 'inline-block' }}></span>
                            Account
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Status</span>
                                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                                    Active
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Email Verified</span>
                                <span className={`text-sm font-medium ${auth?.currentUser?.emailVerified ? 'text-green-600' : 'text-amber-600'}`}>
                                    {auth?.currentUser?.emailVerified ? 'Yes' : 'Pending'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <div className="text-center text-xs text-gray-400">
                        Need to update your information? Contact your administrator.
                    </div>
                </div>
            </div>
        </div>
    );
}

// Export for use
window.UserProfileModal = UserProfileModal;
