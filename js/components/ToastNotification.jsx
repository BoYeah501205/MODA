/**
 * Global Toast Notification System for MODA
 * 
 * Provides in-app notifications that auto-dismiss.
 * Usage: window.MODA_TOAST.show('Message', 'success')
 */

(function() {
    'use strict';
    
    const { useState, useEffect, useCallback } = React;
    
    // Global toast state manager
    let toastListeners = [];
    let toastIdCounter = 0;
    
    // Global API for showing toasts from anywhere
    window.MODA_TOAST = {
        show: (message, type = 'success', options = {}) => {
            const toast = {
                id: ++toastIdCounter,
                message,
                type, // 'success', 'error', 'warning', 'info'
                duration: options.duration || 4000,
                subtitle: options.subtitle || null
            };
            toastListeners.forEach(listener => listener(toast));
            return toast.id;
        },
        success: (message, options = {}) => window.MODA_TOAST.show(message, 'success', options),
        error: (message, options = {}) => window.MODA_TOAST.show(message, 'error', options),
        warning: (message, options = {}) => window.MODA_TOAST.show(message, 'warning', options),
        info: (message, options = {}) => window.MODA_TOAST.show(message, 'info', options),
        subscribe: (listener) => {
            toastListeners.push(listener);
            return () => {
                toastListeners = toastListeners.filter(l => l !== listener);
            };
        }
    };
    
    // Toast Container Component - renders at app root level
    function ToastContainer() {
        const [toasts, setToasts] = useState([]);
        
        useEffect(() => {
            const unsubscribe = window.MODA_TOAST.subscribe((newToast) => {
                setToasts(prev => [...prev, newToast]);
                
                // Auto-dismiss after duration
                setTimeout(() => {
                    setToasts(prev => prev.filter(t => t.id !== newToast.id));
                }, newToast.duration);
            });
            
            return unsubscribe;
        }, []);
        
        const removeToast = useCallback((id) => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, []);
        
        if (toasts.length === 0) return null;
        
        const getToastStyles = (type) => {
            switch (type) {
                case 'success':
                    return 'bg-green-50 border-green-500 text-green-800';
                case 'error':
                    return 'bg-red-50 border-red-500 text-red-800';
                case 'warning':
                    return 'bg-yellow-50 border-yellow-500 text-yellow-800';
                case 'info':
                default:
                    return 'bg-blue-50 border-blue-500 text-blue-800';
            }
        };
        
        const getIcon = (type) => {
            switch (type) {
                case 'success':
                    return (
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    );
                case 'error':
                    return (
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    );
                case 'warning':
                    return (
                        <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    );
                case 'info':
                default:
                    return (
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    );
            }
        };
        
        return (
            <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none" style={{ maxWidth: '400px' }}>
                {toasts.map(toast => (
                    <div 
                        key={toast.id}
                        className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border-l-4 ${getToastStyles(toast.type)}`}
                        style={{
                            animation: 'slideInRight 0.3s ease-out',
                            minWidth: '280px'
                        }}
                    >
                        <div className="flex-shrink-0 mt-0.5">
                            {getIcon(toast.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{toast.message}</div>
                            {toast.subtitle && (
                                <div className="text-xs opacity-75 mt-0.5">{toast.subtitle}</div>
                            )}
                        </div>
                        <button 
                            onClick={() => removeToast(toast.id)}
                            className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-lg leading-none"
                            style={{ marginTop: '-2px' }}
                        >
                            &times;
                        </button>
                    </div>
                ))}
            </div>
        );
    }
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Export component
    window.ToastContainer = ToastContainer;
    
    console.log('[ToastNotification] Global toast system initialized');
})();
