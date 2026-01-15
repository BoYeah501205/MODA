// ============================================================================
// MODA SHARED MODAL COMPONENT
// Reusable modal dialog to replace 61+ duplicate implementations
// ============================================================================

const Modal = React.memo(function Modal({ 
    isOpen, 
    onClose, 
    title, 
    size = 'md',
    children,
    footer,
    closeOnBackdrop = true,
    closeOnEscape = true,
    showCloseButton = true,
    className = ''
}) {
    const { useEffect, useCallback } = React;
    
    // Size classes mapping
    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
        full: 'max-w-[95vw]'
    };
    
    // Handle escape key
    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;
        
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEscape, onClose]);
    
    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);
    
    // Handle backdrop click
    const handleBackdropClick = useCallback((e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
            onClose();
        }
    }, [closeOnBackdrop, onClose]);
    
    // Don't render if not open
    if (!isOpen) return null;
    
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleBackdropClick}
        >
            <div 
                className={`bg-white rounded-lg shadow-xl ${sizeClasses[size] || sizeClasses.md} w-full max-h-[90vh] overflow-hidden flex flex-col ${className}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="p-4 border-b flex justify-between items-center shrink-0">
                        {title && (
                            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                        )}
                        {showCloseButton && (
                            <button 
                                onClick={onClose} 
                                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 text-2xl leading-none ml-auto"
                                aria-label="Close modal"
                            >
                                &times;
                            </button>
                        )}
                    </div>
                )}
                
                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {children}
                </div>
                
                {/* Footer */}
                {footer && (
                    <div className="p-4 border-t shrink-0 bg-gray-50">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
});

// ============================================================================
// MODAL FOOTER HELPERS
// Common footer patterns for consistency
// ============================================================================

const ModalFooter = React.memo(function ModalFooter({ children, className = '' }) {
    return (
        <div className={`flex justify-end gap-2 ${className}`}>
            {children}
        </div>
    );
});

const ModalCancelButton = React.memo(function ModalCancelButton({ 
    onClick, 
    children = 'Cancel',
    disabled = false 
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
            {children}
        </button>
    );
});

const ModalSubmitButton = React.memo(function ModalSubmitButton({ 
    onClick, 
    children = 'Save',
    disabled = false,
    loading = false,
    variant = 'primary'
}) {
    const variantClasses = {
        primary: 'bg-teal-600 hover:bg-teal-700 text-white',
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        secondary: 'bg-gray-600 hover:bg-gray-700 text-white'
    };
    
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || loading}
            className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${variantClasses[variant] || variantClasses.primary}`}
        >
            {loading ? (
                <span className="flex items-center gap-2">
                    <span className="animate-spin">&#8635;</span>
                    Loading...
                </span>
            ) : children}
        </button>
    );
});

// ============================================================================
// CONFIRMATION MODAL
// Pre-built modal for delete/confirm actions
// ============================================================================

const ConfirmModal = React.memo(function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    loading = false
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <ModalFooter>
                    <ModalCancelButton onClick={onClose} disabled={loading}>
                        {cancelText}
                    </ModalCancelButton>
                    <ModalSubmitButton 
                        onClick={onConfirm} 
                        variant={variant}
                        loading={loading}
                    >
                        {confirmText}
                    </ModalSubmitButton>
                </ModalFooter>
            }
        >
            <p className="text-gray-600">{message}</p>
        </Modal>
    );
});

// Export to window for global access
window.Modal = Modal;
window.ModalFooter = ModalFooter;
window.ModalCancelButton = ModalCancelButton;
window.ModalSubmitButton = ModalSubmitButton;
window.ConfirmModal = ConfirmModal;
