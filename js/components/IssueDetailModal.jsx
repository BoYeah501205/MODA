/**
 * Issue Detail Modal for MODA Engineering Issue Tracker
 * 
 * Displays full issue details with:
 * - Status management
 * - Assignment
 * - Comment threading
 * - Photo gallery
 * - Activity history
 */

const { useState, useEffect, useRef } = React;

function IssueDetailModal({
    issue,
    employees = [],
    auth = {},
    onUpdate,
    onDelete,
    onClose
}) {
    // ===== CONSTANTS =====
    const ISSUE_TYPES = window.MODA_SUPABASE_ISSUES?.ISSUE_TYPES || [
        { id: 'shop-drawing', label: 'Shop Drawing', color: '#0057B8' },
        { id: 'design-conflict', label: 'Design Conflict', color: '#7C3AED' },
        { id: 'material-supply', label: 'Material/Supply', color: '#EA580C' },
        { id: 'quality', label: 'Quality Issue', color: '#DC2626' },
        { id: 'engineering-question', label: 'Engineering Question', color: '#0891B2' },
        { id: 'rfi', label: 'RFI Required', color: '#4F46E5' },
        { id: 'other', label: 'Other', color: '#6B7280' }
    ];

    const PRIORITY_LEVELS = window.MODA_SUPABASE_ISSUES?.PRIORITY_LEVELS || [
        { id: 'low', label: 'Low', color: '#10B981' },
        { id: 'medium', label: 'Medium', color: '#F59E0B' },
        { id: 'high', label: 'High', color: '#EA580C' },
        { id: 'critical', label: 'Critical', color: '#DC2626' }
    ];

    const ISSUE_STATUSES = window.MODA_SUPABASE_ISSUES?.ISSUE_STATUSES || [
        { id: 'open', label: 'Open', color: '#DC2626' },
        { id: 'in-progress', label: 'In Progress', color: '#0057B8' },
        { id: 'pending-info', label: 'Pending Info', color: '#F59E0B' },
        { id: 'resolved', label: 'Resolved', color: '#10B981' },
        { id: 'closed', label: 'Closed', color: '#6B7280' }
    ];

    // ===== STATE =====
    const [activeTab, setActiveTab] = useState('details');
    const [newComment, setNewComment] = useState('');
    const [commentPhotos, setCommentPhotos] = useState([]);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [showAssignMenu, setShowAssignMenu] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [resolutionNote, setResolutionNote] = useState('');
    
    // Edit mode state
    const [isEditMode, setIsEditMode] = useState(false);
    const [editForm, setEditForm] = useState({
        title: issue?.title || '',
        description: issue?.description || '',
        priority: issue?.priority || 'medium'
    });
    
    // Delete confirmation state
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const modalRef = useRef(null);
    const commentInputRef = useRef(null);
    const fileInputRef = useRef(null);

    // Get current user info
    const currentUser = {
        id: auth.userId || window.MODA_SUPABASE?.userProfile?.id || null,
        name: auth.userName || window.MODA_SUPABASE?.userProfile?.name || 
              window.MODA_SUPABASE?.userProfile?.email?.split('@')[0] || 'Unknown User'
    };

    // Check if user can edit
    const canEdit = auth.canEdit || window.canUserEditTab?.('engineering') || false;
    
    // Check if user is admin (can delete)
    const isAdmin = auth.isAdmin || window.MODA_AUTH?.hasPermission?.('admin') || 
                    window.MODA_SUPABASE?.userProfile?.role === 'admin' || false;

    // ===== EFFECTS =====
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                if (selectedPhoto) {
                    setSelectedPhoto(null);
                } else {
                    onClose();
                }
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose, selectedPhoto]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    // ===== HELPERS =====
    const getStatusColor = (status) => {
        const found = ISSUE_STATUSES.find(s => s.id === status);
        return found?.color || '#6B7280';
    };

    const getPriorityColor = (priority) => {
        const found = PRIORITY_LEVELS.find(p => p.id === priority);
        return found?.color || '#6B7280';
    };

    const getTypeInfo = (typeId) => {
        return ISSUE_TYPES.find(t => t.id === typeId) || { label: typeId, color: '#6B7280' };
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const getTimeAgo = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    // ===== HANDLERS =====
    const handleStatusChange = async (newStatus) => {
        if (!canEdit) return;
        setIsUpdating(true);
        setShowStatusMenu(false);

        try {
            let updates;
            
            if (window.MODA_SUPABASE_ISSUES?.issues) {
                updates = await window.MODA_SUPABASE_ISSUES.issues.updateStatus(
                    issue.id,
                    newStatus,
                    currentUser.id,
                    currentUser.name,
                    newStatus === 'resolved' || newStatus === 'closed' ? resolutionNote : ''
                );
            } else {
                // localStorage fallback
                const now = new Date().toISOString();
                updates = {
                    ...issue,
                    status: newStatus,
                    updated_at: now,
                    status_history: [
                        ...(issue.status_history || []),
                        {
                            status: newStatus,
                            changed_by: currentUser.name,
                            changed_by_id: currentUser.id,
                            timestamp: now,
                            note: newStatus === 'resolved' || newStatus === 'closed' ? resolutionNote : `Status changed to ${newStatus}`
                        }
                    ]
                };
                
                if (newStatus === 'resolved' || newStatus === 'closed') {
                    updates.resolved_at = now;
                    updates.resolved_by = currentUser.name;
                    updates.resolved_by_id = currentUser.id;
                    if (resolutionNote) updates.resolution_notes = resolutionNote;
                }

                // Update localStorage
                const stored = JSON.parse(localStorage.getItem('moda_engineering_issues') || '[]');
                const idx = stored.findIndex(i => i.id === issue.id);
                if (idx !== -1) {
                    stored[idx] = updates;
                    localStorage.setItem('moda_engineering_issues', JSON.stringify(stored));
                }
            }

            onUpdate(updates);
            setResolutionNote('');
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Failed to update status: ' + err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    // Handle saving issue edits
    const handleSaveEdit = async () => {
        if (!canEdit) return;
        
        // Check if anything changed
        const hasChanges = editForm.title !== issue.title ||
                          editForm.description !== issue.description ||
                          editForm.priority !== issue.priority;
        
        if (!hasChanges) {
            setIsEditMode(false);
            return;
        }

        setIsUpdating(true);

        try {
            const now = new Date().toISOString();
            
            // Build edit history entry
            const editEntry = {
                edited_by: currentUser.name,
                edited_by_id: currentUser.id,
                timestamp: now,
                changes: []
            };
            
            if (editForm.title !== issue.title) {
                editEntry.changes.push({ field: 'title', from: issue.title, to: editForm.title });
            }
            if (editForm.description !== issue.description) {
                editEntry.changes.push({ field: 'description', from: issue.description, to: editForm.description });
            }
            if (editForm.priority !== issue.priority) {
                editEntry.changes.push({ field: 'priority', from: issue.priority, to: editForm.priority });
            }

            let updates;

            if (window.MODA_SUPABASE_ISSUES?.issues?.update) {
                // Supabase update
                updates = await window.MODA_SUPABASE_ISSUES.issues.update(issue.id, {
                    title: editForm.title,
                    description: editForm.description,
                    priority: editForm.priority,
                    edit_history: [...(issue.edit_history || []), editEntry]
                });
            } else {
                // localStorage fallback
                updates = {
                    ...issue,
                    title: editForm.title,
                    description: editForm.description,
                    priority: editForm.priority,
                    updated_at: now,
                    edit_history: [...(issue.edit_history || []), editEntry]
                };

                const stored = JSON.parse(localStorage.getItem('moda_engineering_issues') || '[]');
                const idx = stored.findIndex(i => i.id === issue.id);
                if (idx !== -1) {
                    stored[idx] = updates;
                    localStorage.setItem('moda_engineering_issues', JSON.stringify(stored));
                }
            }

            onUpdate(updates);
            setIsEditMode(false);
        } catch (err) {
            console.error('Error saving edit:', err);
            alert('Failed to save changes: ' + err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    // Cancel edit and reset form
    const handleCancelEdit = () => {
        setEditForm({
            title: issue?.title || '',
            description: issue?.description || '',
            priority: issue?.priority || 'medium'
        });
        setIsEditMode(false);
    };

    const handleAssign = async (employeeId) => {
        if (!canEdit) return;
        setIsUpdating(true);
        setShowAssignMenu(false);

        const employee = employees.find(e => e.id === employeeId);
        const assigneeName = employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : '';

        try {
            let updates;

            if (window.MODA_SUPABASE_ISSUES?.issues) {
                updates = await window.MODA_SUPABASE_ISSUES.issues.assignTo(
                    issue.id,
                    employeeId,
                    assigneeName,
                    currentUser.name,
                    currentUser.id
                );
            } else {
                // localStorage fallback
                const now = new Date().toISOString();
                updates = {
                    ...issue,
                    assigned_to: assigneeName,
                    assigned_to_id: employeeId,
                    updated_at: now,
                    status: issue.status === 'open' ? 'in-progress' : issue.status,
                    status_history: [
                        ...(issue.status_history || []),
                        {
                            status: issue.status === 'open' ? 'in-progress' : issue.status,
                            changed_by: currentUser.name,
                            changed_by_id: currentUser.id,
                            timestamp: now,
                            note: `Assigned to ${assigneeName}`
                        }
                    ]
                };

                const stored = JSON.parse(localStorage.getItem('moda_engineering_issues') || '[]');
                const idx = stored.findIndex(i => i.id === issue.id);
                if (idx !== -1) {
                    stored[idx] = updates;
                    localStorage.setItem('moda_engineering_issues', JSON.stringify(stored));
                }
            }

            onUpdate(updates);
        } catch (err) {
            console.error('Error assigning issue:', err);
            alert('Failed to assign issue: ' + err.message);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        setIsSubmittingComment(true);

        try {
            const commentData = {
                user_id: currentUser.id,
                user_name: currentUser.name,
                message: newComment.trim(),
                photo_urls: commentPhotos
            };

            let updates;

            if (window.MODA_SUPABASE_ISSUES?.issues) {
                updates = await window.MODA_SUPABASE_ISSUES.issues.addComment(issue.id, commentData);
            } else {
                // localStorage fallback
                const now = new Date().toISOString();
                const comment = {
                    id: `comment-${Date.now()}`,
                    ...commentData,
                    timestamp: now
                };

                updates = {
                    ...issue,
                    comments: [...(issue.comments || []), comment],
                    updated_at: now
                };

                const stored = JSON.parse(localStorage.getItem('moda_engineering_issues') || '[]');
                const idx = stored.findIndex(i => i.id === issue.id);
                if (idx !== -1) {
                    stored[idx] = updates;
                    localStorage.setItem('moda_engineering_issues', JSON.stringify(stored));
                }
            }

            onUpdate(updates);
            setNewComment('');
            setCommentPhotos([]);
        } catch (err) {
            console.error('Error adding comment:', err);
            alert('Failed to add comment: ' + err.message);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleCommentPhotoCapture = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const remaining = 3 - commentPhotos.length;
        const filesToProcess = files.slice(0, remaining);

        for (const file of filesToProcess) {
            try {
                let compressed;
                if (window.compressPhoto) {
                    compressed = await window.compressPhoto(file, { maxWidth: 1200, quality: 0.8 });
                } else {
                    compressed = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                }
                setCommentPhotos(prev => [...prev, compressed]);
            } catch (err) {
                console.error('Error processing photo:', err);
            }
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === modalRef.current) {
            onClose();
        }
    };
    
    // Handle delete issue
    const handleDeleteIssue = async () => {
        if (!isAdmin && !canEdit) return;
        setIsDeleting(true);
        
        try {
            if (window.MODA_SUPABASE_ISSUES?.issues?.delete) {
                await window.MODA_SUPABASE_ISSUES.issues.delete(issue.id);
            } else {
                // localStorage fallback
                const stored = JSON.parse(localStorage.getItem('moda_engineering_issues') || '[]');
                const filtered = stored.filter(i => i.id !== issue.id);
                localStorage.setItem('moda_engineering_issues', JSON.stringify(filtered));
            }
            
            // Notify parent and close
            if (onDelete) {
                onDelete(issue.id);
            }
            onClose();
            
            // Dispatch event to refresh issue list
            window.dispatchEvent(new CustomEvent('moda-issues-updated'));
        } catch (err) {
            console.error('Error deleting issue:', err);
            alert('Failed to delete issue: ' + err.message);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    // ===== RENDER =====
    const typeInfo = getTypeInfo(issue.issue_type);
    const statusInfo = ISSUE_STATUSES.find(s => s.id === issue.status) || { label: issue.status, color: '#6B7280' };
    const priorityInfo = PRIORITY_LEVELS.find(p => p.id === issue.priority) || { label: issue.priority, color: '#6B7280' };

    return (
        <div 
            ref={modalRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="font-mono text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                    {issue.issue_display_id}
                                </span>
                                <span
                                    className="px-2 py-1 rounded text-xs font-medium"
                                    style={{
                                        backgroundColor: `${statusInfo.color}15`,
                                        color: statusInfo.color
                                    }}
                                >
                                    {statusInfo.label}
                                </span>
                                <span
                                    className="px-2 py-1 rounded text-xs font-medium"
                                    style={{
                                        backgroundColor: `${priorityInfo.color}15`,
                                        color: priorityInfo.color
                                    }}
                                >
                                    {priorityInfo.label} Priority
                                </span>
                                <span
                                    className="px-2 py-1 rounded text-xs font-medium"
                                    style={{
                                        backgroundColor: `${typeInfo.color}15`,
                                        color: typeInfo.color
                                    }}
                                >
                                    {typeInfo.label}
                                </span>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {issue.title || issue.description?.substring(0, 60) || 'Untitled Issue'}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                            {/* Delete Button - Admin only */}
                            {(isAdmin || canEdit) && (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete Issue"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                <span className="icon-close" style={{ width: '20px', height: '20px', display: 'block' }}></span>
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50 rounded-xl">
                        <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-md">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Delete Issue?</h3>
                                    <p className="text-sm text-gray-500">{issue.issue_display_id}</p>
                                </div>
                            </div>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete this issue? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteIssue}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete Issue'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="border-b border-gray-200 px-6">
                    <div className="flex gap-6">
                        {[
                            { id: 'details', label: 'Details' },
                            { id: 'comments', label: `Comments (${issue.comments?.length || 0})` },
                            { id: 'history', label: 'History' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Details Tab */}
                    {activeTab === 'details' && (
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Main Content */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Edit Button */}
                                    {canEdit && !isEditMode && issue.status !== 'closed' && (
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => setIsEditMode(true)}
                                                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center gap-1"
                                            >
                                                <span className="icon-edit w-4 h-4"></span>
                                                Edit Issue
                                            </button>
                                        </div>
                                    )}

                                    {/* Edit Mode Form */}
                                    {isEditMode ? (
                                        <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                                <input
                                                    type="text"
                                                    value={editForm.title}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Issue title..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                                <textarea
                                                    value={editForm.description}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                                    rows={4}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                    placeholder="Describe the issue..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                                <div className="flex gap-2">
                                                    {PRIORITY_LEVELS.map(level => (
                                                        <button
                                                            key={level.id}
                                                            type="button"
                                                            onClick={() => setEditForm(prev => ({ ...prev, priority: level.id }))}
                                                            className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition ${
                                                                editForm.priority === level.id
                                                                    ? 'border-current'
                                                                    : 'border-gray-200 hover:border-gray-300'
                                                            }`}
                                                            style={{
                                                                borderColor: editForm.priority === level.id ? level.color : undefined,
                                                                backgroundColor: editForm.priority === level.id ? `${level.color}15` : undefined,
                                                                color: level.color
                                                            }}
                                                        >
                                                            {level.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2">
                                                <button
                                                    onClick={handleCancelEdit}
                                                    disabled={isUpdating}
                                                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSaveEdit}
                                                    disabled={isUpdating}
                                                    className="px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                                                >
                                                    {isUpdating ? 'Saving...' : 'Save Changes'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Description (View Mode) */
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                                            <p className="text-gray-900 whitespace-pre-wrap">
                                                {issue.description || 'No description provided'}
                                            </p>
                                        </div>
                                    )}

                                    {/* Photos */}
                                    {issue.photo_urls?.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-2">
                                                Photos ({issue.photo_urls.length})
                                            </h3>
                                            <div className="grid grid-cols-3 gap-2">
                                                {issue.photo_urls.map((photo, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setSelectedPhoto(photo)}
                                                        className="aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                                                    >
                                                        <img
                                                            src={photo}
                                                            alt={`Photo ${idx + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Resolution Notes */}
                                    {issue.resolution_notes && (
                                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <h3 className="text-sm font-medium text-green-800 mb-1">Resolution Notes</h3>
                                            <p className="text-green-900">{issue.resolution_notes}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Sidebar */}
                                <div className="space-y-4">
                                    {/* Context Info */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <h3 className="text-sm font-medium text-gray-700 mb-3">Context</h3>
                                        <div className="space-y-2 text-sm">
                                            {issue.project_name && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Project</span>
                                                    <span className="font-medium text-gray-900">{issue.project_name}</span>
                                                </div>
                                            )}
                                            {issue.blm_id && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Module</span>
                                                    <span className="font-medium text-gray-900">{issue.blm_id}</span>
                                                </div>
                                            )}
                                            {issue.unit_type && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Unit Type</span>
                                                    <span className="font-medium text-gray-900">{issue.unit_type}</span>
                                                </div>
                                            )}
                                            {issue.department && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Department</span>
                                                    <span className="font-medium text-gray-900">{issue.department}</span>
                                                </div>
                                            )}
                                            {issue.stage && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Stage</span>
                                                    <span className="font-medium text-gray-900">{issue.stage}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Assignment */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-sm font-medium text-gray-700">Assigned To</h3>
                                            {canEdit && (
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setShowAssignMenu(!showAssignMenu)}
                                                        className="text-xs text-blue-600 hover:text-blue-800"
                                                    >
                                                        Change
                                                    </button>
                                                    {showAssignMenu && (
                                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 max-h-60 overflow-y-auto">
                                                            <button
                                                                onClick={() => handleAssign(null)}
                                                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-gray-500"
                                                            >
                                                                Unassigned
                                                            </button>
                                                            {employees.map(e => (
                                                                <button
                                                                    key={e.id}
                                                                    onClick={() => handleAssign(e.id)}
                                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                                                                >
                                                                    {e.firstName} {e.lastName}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <p className={`text-sm ${issue.assigned_to ? 'text-gray-900 font-medium' : 'text-gray-400 italic'}`}>
                                            {issue.assigned_to || 'Unassigned'}
                                        </p>
                                    </div>

                                    {/* Status Actions */}
                                    {canEdit && issue.status !== 'closed' && (
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                                                    disabled={isUpdating}
                                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-left hover:bg-gray-50 disabled:opacity-50"
                                                >
                                                    Change Status...
                                                </button>
                                                {showStatusMenu && (
                                                    <div className="absolute left-0 top-full mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                                                        {ISSUE_STATUSES.filter(s => s.id !== issue.status).map(status => (
                                                            <button
                                                                key={status.id}
                                                                onClick={() => handleStatusChange(status.id)}
                                                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                                            >
                                                                <span
                                                                    className="w-2 h-2 rounded-full"
                                                                    style={{ backgroundColor: status.color }}
                                                                ></span>
                                                                {status.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Resolution note input for resolve/close */}
                                            {(issue.status === 'in-progress' || issue.status === 'pending-info') && (
                                                <div className="mt-3">
                                                    <textarea
                                                        value={resolutionNote}
                                                        onChange={(e) => setResolutionNote(e.target.value)}
                                                        placeholder="Resolution notes (optional)..."
                                                        rows={2}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Timestamps */}
                                    <div className="text-xs text-gray-500 space-y-1">
                                        <div>Created: {formatDateTime(issue.created_at)}</div>
                                        <div>By: {issue.submitted_by}</div>
                                        {issue.updated_at !== issue.created_at && (
                                            <div>Updated: {formatDateTime(issue.updated_at)}</div>
                                        )}
                                        {issue.resolved_at && (
                                            <div>Resolved: {formatDateTime(issue.resolved_at)} by {issue.resolved_by}</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Comments Tab */}
                    {activeTab === 'comments' && (
                        <div className="p-6">
                            {/* Comment Input */}
                            <div className="mb-6 bg-gray-50 rounded-lg p-4">
                                <textarea
                                    ref={commentInputRef}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                
                                {/* Comment Photos */}
                                {commentPhotos.length > 0 && (
                                    <div className="flex gap-2 mt-2">
                                        {commentPhotos.map((photo, idx) => (
                                            <div key={idx} className="relative w-16 h-16">
                                                <img
                                                    src={photo}
                                                    alt={`Photo ${idx + 1}`}
                                                    className="w-full h-full object-cover rounded"
                                                />
                                                <button
                                                    onClick={() => setCommentPhotos(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                                                >
                                                    X
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-3">
                                    <div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleCommentPhotoCapture}
                                            className="hidden"
                                        />
                                        {commentPhotos.length < 3 && (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                                            >
                                                <span className="icon-camera" style={{ width: '16px', height: '16px', display: 'inline-block' }}></span>
                                                Add Photo
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!newComment.trim() || isSubmittingComment}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmittingComment ? 'Posting...' : 'Post Comment'}
                                    </button>
                                </div>
                            </div>

                            {/* Comments List */}
                            {issue.comments?.length > 0 ? (
                                <div className="space-y-4">
                                    {[...issue.comments].reverse().map(comment => (
                                        <div key={comment.id} className="border-b border-gray-100 pb-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                                                    {comment.user_name?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-900">{comment.user_name}</span>
                                                    <span className="text-gray-400 text-sm ml-2">{getTimeAgo(comment.timestamp)}</span>
                                                </div>
                                            </div>
                                            <p className="text-gray-700 ml-10 whitespace-pre-wrap">{comment.message}</p>
                                            {comment.photo_urls?.length > 0 && (
                                                <div className="flex gap-2 mt-2 ml-10">
                                                    {comment.photo_urls.map((photo, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => setSelectedPhoto(photo)}
                                                            className="w-20 h-20 rounded overflow-hidden"
                                                        >
                                                            <img
                                                                src={photo}
                                                                alt={`Photo ${idx + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No comments yet. Be the first to comment!
                                </div>
                            )}
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div className="p-6">
                            {issue.status_history?.length > 0 ? (
                                <div className="relative">
                                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                                    <div className="space-y-4">
                                        {[...issue.status_history].reverse().map((entry, idx) => (
                                            <div key={idx} className="relative pl-10">
                                                <div
                                                    className="absolute left-2 w-5 h-5 rounded-full border-2 border-white"
                                                    style={{ backgroundColor: getStatusColor(entry.status) }}
                                                ></div>
                                                <div className="bg-gray-50 rounded-lg p-3">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-medium text-gray-900">
                                                            {ISSUE_STATUSES.find(s => s.id === entry.status)?.label || entry.status}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {formatDateTime(entry.timestamp)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600">{entry.note}</p>
                                                    <p className="text-xs text-gray-400 mt-1">by {entry.changed_by}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    No history available
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Photo Lightbox */}
            {selectedPhoto && (
                <div
                    className="fixed inset-0 z-60 bg-black bg-opacity-90 flex items-center justify-center p-4"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <img
                        src={selectedPhoto}
                        alt="Full size"
                        className="max-w-full max-h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setSelectedPhoto(null)}
                        className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100"
                    >
                        <span className="icon-close" style={{ width: '24px', height: '24px', display: 'block' }}></span>
                    </button>
                </div>
            )}
        </div>
    );
}

// Export to window for global access
window.IssueDetailModal = IssueDetailModal;
