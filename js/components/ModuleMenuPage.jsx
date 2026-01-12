/**
 * Module Menu Landing Page
 * 
 * Displays when a QR code is scanned from a license plate.
 * Shows navigation options for:
 * - QA (placeholder)
 * - Shop Drawing Package (Module Packages folder for that BLM)
 * - Permit Drawings
 * - Shop Drawings - Other
 */

const { useState, useEffect } = React;

function ModuleMenuPage() {
    const [projectId, setProjectId] = useState(null);
    const [blm, setBlm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Parse URL parameters: /module/{projectId}/{blm}
        const path = window.location.pathname;
        const match = path.match(/\/module\/([^\/]+)\/([^\/]+)/);
        
        if (match) {
            setProjectId(match[1]);
            setBlm(match[2]);
            setLoading(false);
        } else {
            setError('Invalid module URL');
            setLoading(false);
        }
    }, []);

    const handleNavigation = (option) => {
        switch (option) {
            case 'qa':
                alert('QA Module - Coming Soon!\n\nThis will link to quality assurance documentation and checklists for this module.');
                break;
            
            case 'shop-drawing-package':
                // Navigate to Drawings Module filtered to Module Packages for this BLM
                window.location.hash = 'drawings';
                sessionStorage.setItem('moda_drawings_category', 'shop-drawings');
                sessionStorage.setItem('moda_drawings_discipline', 'Module Packages');
                sessionStorage.setItem('moda_drawings_search', blm);
                window.location.reload();
                break;
            
            case 'permit-drawings':
                // Navigate to Permit Drawings
                window.location.hash = 'drawings';
                sessionStorage.setItem('moda_drawings_category', 'permit-drawings');
                sessionStorage.setItem('moda_drawings_discipline', '');
                sessionStorage.setItem('moda_drawings_search', '');
                window.location.reload();
                break;
            
            case 'shop-drawings-other':
                // Navigate to Shop Drawings main folder
                window.location.hash = 'drawings';
                sessionStorage.setItem('moda_drawings_category', 'shop-drawings');
                sessionStorage.setItem('moda_drawings_discipline', '');
                sessionStorage.setItem('moda_drawings_search', '');
                window.location.reload();
                break;
            
            default:
                break;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-autovol-navy mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading module information...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="px-6 py-2 bg-autovol-navy text-white rounded-lg hover:bg-autovol-navy-light"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
                {/* Header */}
                <div className="bg-autovol-navy text-white p-6 rounded-t-lg">
                    <h1 className="text-2xl font-bold mb-2">Module Information</h1>
                    <p className="text-blue-200">BLM: {blm}</p>
                </div>

                {/* Menu Options */}
                <div className="p-6">
                    <p className="text-gray-600 mb-6 text-center">
                        Select an option to view module documentation and drawings:
                    </p>

                    <div className="space-y-3">
                        {/* QA Placeholder */}
                        <button
                            onClick={() => handleNavigation('qa')}
                            className="w-full p-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-left transition-colors border-2 border-gray-300 hover:border-gray-400"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📋</span>
                                <div className="flex-1">
                                    <div className="font-bold text-gray-900">QA (Placeholder)</div>
                                    <div className="text-sm text-gray-600">Quality assurance documentation</div>
                                </div>
                                <span className="text-gray-400">→</span>
                            </div>
                        </button>

                        {/* Shop Drawing Package */}
                        <button
                            onClick={() => handleNavigation('shop-drawing-package')}
                            className="w-full p-4 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-left transition-colors border-2 border-emerald-400 hover:border-emerald-500"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📦</span>
                                <div className="flex-1">
                                    <div className="font-bold text-gray-900">Shop Drawing Package</div>
                                    <div className="text-sm text-gray-600">Module-specific shop drawings for {blm}</div>
                                </div>
                                <span className="text-emerald-600">→</span>
                            </div>
                        </button>

                        {/* Permit Drawings */}
                        <button
                            onClick={() => handleNavigation('permit-drawings')}
                            className="w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors border-2 border-blue-400 hover:border-blue-500"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📄</span>
                                <div className="flex-1">
                                    <div className="font-bold text-gray-900">Permit Drawings</div>
                                    <div className="text-sm text-gray-600">Official permit and approval drawings</div>
                                </div>
                                <span className="text-blue-600">→</span>
                            </div>
                        </button>

                        {/* Shop Drawings - Other */}
                        <button
                            onClick={() => handleNavigation('shop-drawings-other')}
                            className="w-full p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors border-2 border-purple-400 hover:border-purple-500"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📁</span>
                                <div className="flex-1">
                                    <div className="font-bold text-gray-900">Shop Drawings - Other</div>
                                    <div className="text-sm text-gray-600">Browse all shop drawing categories</div>
                                </div>
                                <span className="text-purple-600">→</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 rounded-b-lg border-t text-center">
                    <p className="text-sm text-gray-600">
                        Scanned from license plate • Project ID: {projectId}
                    </p>
                </div>
            </div>
        </div>
    );
}

// Export for use in App.jsx
window.ModuleMenuPage = ModuleMenuPage;
