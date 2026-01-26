/**
 * MODA Error Boundary Component
 * 
 * Catches JavaScript errors in child components and displays a fallback UI
 * instead of crashing the entire application.
 */

const { Component } = React;

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false, 
            error: null, 
            errorInfo: null 
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log error to console
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
        
        this.setState({ errorInfo });
        
        // Log to activity log if available
        if (window.MODA_ACTIVITY_LOG?.log) {
            window.MODA_ACTIVITY_LOG.log({
                action: 'error',
                entity_type: 'app',
                entity_id: 'error-boundary',
                details: {
                    error: error.message,
                    stack: error.stack,
                    componentStack: errorInfo.componentStack
                }
            });
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div className="min-h-[200px] flex items-center justify-center p-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg text-center">
                        <div className="text-red-500 text-4xl mb-4">⚠️</div>
                        <h2 className="text-lg font-semibold text-red-800 mb-2">
                            {this.props.title || 'Something went wrong'}
                        </h2>
                        <p className="text-red-600 text-sm mb-4">
                            {this.props.message || 'An error occurred while loading this section.'}
                        </p>
                        
                        {/* Show error details in debug mode */}
                        {window.MODA_DEBUG && this.state.error && (
                            <details className="text-left mb-4 text-xs">
                                <summary className="cursor-pointer text-red-700 font-medium">
                                    Error Details (Debug Mode)
                                </summary>
                                <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto max-h-32 text-red-800">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                        
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition text-sm"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Tab-specific error boundary with custom messaging
function TabErrorBoundary({ children, tabName }) {
    return (
        <ErrorBoundary
            title={`Error loading ${tabName || 'this tab'}`}
            message="There was a problem loading this section. You can try again or reload the page."
        >
            {children}
        </ErrorBoundary>
    );
}

// Export to window
window.ErrorBoundary = ErrorBoundary;
window.TabErrorBoundary = TabErrorBoundary;

if (window.MODA_DEBUG) console.log('[ErrorBoundary] Component loaded');
