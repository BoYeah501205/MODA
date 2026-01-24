/**
 * IssueComments Component
 * 
 * Displays and manages comments/responses on report issues.
 * Allows team members to discuss and track issue resolution.
 */

const { useState, useEffect, useRef } = React;

function IssueComments({
    issueId,
    comments: initialComments = [],
    onAddComment,
    onUpdateComment,
    onDeleteComment,
    readOnly = false
}) {
    const [comments, setComments] = useState(initialComments);
    const [newComment, setNewComment] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const commentsEndRef = useRef(null);

    // Update comments when props change
    useEffect(() => {
        setComments(initialComments);
    }, [initialComments]);

    // Scroll to bottom when new comment added
    useEffect(() => {
        if (commentsEndRef.current) {
            commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [comments.length]);

    // Handle add comment
    const handleAddComment = async () => {
        if (!newComment.trim() || isSubmitting) return;

        setIsSubmitting(true);
        setError(null);

        try {
            if (onAddComment) {
                const added = await onAddComment(issueId, newComment.trim());
                if (added) {
                    setComments([...comments, added]);
                }
            } else if (window.MODA_DAILY_REPORTS) {
                const added = await window.MODA_DAILY_REPORTS.addComment(issueId, newComment.trim());
                setComments([...comments, added]);
            }
            setNewComment('');
        } catch (err) {
            console.error('Error adding comment:', err);
            setError('Failed to add comment');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle update comment
    const handleUpdateComment = async (commentId) => {
        if (!editText.trim() || isSubmitting) return;

        setIsSubmitting(true);
        setError(null);

        try {
            if (onUpdateComment) {
                await onUpdateComment(commentId, editText.trim());
            } else if (window.MODA_DAILY_REPORTS) {
                await window.MODA_DAILY_REPORTS.updateComment(commentId, editText.trim());
            }
            
            setComments(comments.map(c => 
                c.id === commentId ? { ...c, comment: editText.trim(), updated_at: new Date().toISOString() } : c
            ));
            setEditingId(null);
            setEditText('');
        } catch (err) {
            console.error('Error updating comment:', err);
            setError('Failed to update comment');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle delete comment
    const handleDeleteComment = async (commentId) => {
        if (!confirm('Delete this comment?')) return;

        setIsSubmitting(true);
        setError(null);

        try {
            if (onDeleteComment) {
                await onDeleteComment(commentId);
            } else if (window.MODA_DAILY_REPORTS) {
                await window.MODA_DAILY_REPORTS.deleteComment(commentId);
            }
            
            setComments(comments.filter(c => c.id !== commentId));
        } catch (err) {
            console.error('Error deleting comment:', err);
            setError('Failed to delete comment');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Start editing
    const startEditing = (comment) => {
        setEditingId(comment.id);
        setEditText(comment.comment);
    };

    // Cancel editing
    const cancelEditing = () => {
        setEditingId(null);
        setEditText('');
    };

    // Format timestamp
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    // Get current user for edit/delete permissions
    const currentUser = window.MODA_SUPABASE?.currentUser;

    return (
        <div className="issue-comments">
            {/* Comments List */}
            <div className="comments-list">
                {comments.length === 0 ? (
                    <div className="no-comments">
                        <p>No comments yet</p>
                    </div>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className="comment-item">
                            {editingId === comment.id ? (
                                <div className="comment-edit">
                                    <textarea
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        className="edit-textarea"
                                        rows={2}
                                        autoFocus
                                    />
                                    <div className="edit-actions">
                                        <button
                                            type="button"
                                            onClick={cancelEditing}
                                            className="btn-link"
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleUpdateComment(comment.id)}
                                            className="btn-link primary"
                                            disabled={!editText.trim() || isSubmitting}
                                        >
                                            {isSubmitting ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="comment-header">
                                        <span className="comment-author">{comment.author_name}</span>
                                        <span className="comment-time">{formatTimestamp(comment.created_at)}</span>
                                        {comment.updated_at && comment.updated_at !== comment.created_at && (
                                            <span className="comment-edited">(edited)</span>
                                        )}
                                    </div>
                                    <div className="comment-text">{comment.comment}</div>
                                    
                                    {!readOnly && currentUser && comment.author_id === currentUser.id && (
                                        <div className="comment-actions">
                                            <button
                                                type="button"
                                                onClick={() => startEditing(comment)}
                                                className="btn-link"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="btn-link danger"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))
                )}
                <div ref={commentsEndRef} />
            </div>

            {/* Error Display */}
            {error && (
                <div className="comments-error">
                    {error}
                </div>
            )}

            {/* Add Comment Form */}
            {!readOnly && (
                <div className="add-comment-form">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="comment-input"
                        rows={2}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                handleAddComment();
                            }
                        }}
                    />
                    <div className="comment-form-footer">
                        <span className="hint">Ctrl+Enter to submit</span>
                        <button
                            type="button"
                            onClick={handleAddComment}
                            disabled={!newComment.trim() || isSubmitting}
                            className="btn-primary btn-sm"
                        >
                            {isSubmitting ? 'Adding...' : 'Add Comment'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * IssueCommentsModal - Wrapper for displaying comments in a modal
 */
function IssueCommentsModal({
    issue,
    onClose,
    onIssueUpdate
}) {
    const [comments, setComments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch comments on mount
    useEffect(() => {
        fetchComments();
    }, [issue.id]);

    const fetchComments = async () => {
        setIsLoading(true);
        try {
            if (window.MODA_DAILY_REPORTS) {
                const data = await window.MODA_DAILY_REPORTS.getCommentsByIssue(issue.id);
                setComments(data);
            }
        } catch (err) {
            console.error('Error fetching comments:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Get category label
    const categoryLabel = window.MODA_DAILY_REPORTS?.ISSUE_CATEGORIES[issue.category]?.label || issue.category;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content issue-comments-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Issue Discussion</h3>
                    <button type="button" onClick={onClose} className="close-btn">
                        <span className="icon-close"></span>
                    </button>
                </div>

                <div className="modal-body">
                    {/* Issue Summary */}
                    <div className="issue-summary-card">
                        <div className="issue-meta">
                            <span className={`severity-badge ${issue.severity}`}>{issue.severity}</span>
                            <span className="category-badge">{categoryLabel}</span>
                            <span className={`status-badge ${issue.status}`}>{issue.status}</span>
                        </div>
                        <p className="issue-description">{issue.description}</p>
                        {issue.action_taken && (
                            <div className="issue-action">
                                <strong>Action Taken:</strong> {issue.action_taken}
                            </div>
                        )}
                        <div className="issue-reporter">
                            Reported by {issue.reported_by_name || 'Unknown'} on{' '}
                            {new Date(issue.reported_at).toLocaleDateString()}
                        </div>
                    </div>

                    {/* Comments Section */}
                    {isLoading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading comments...</p>
                        </div>
                    ) : (
                        <IssueComments
                            issueId={issue.id}
                            comments={comments}
                        />
                    )}
                </div>

                <div className="modal-footer">
                    <button type="button" onClick={onClose} className="btn-secondary">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// Make components available globally
window.IssueComments = IssueComments;
window.IssueCommentsModal = IssueCommentsModal;
