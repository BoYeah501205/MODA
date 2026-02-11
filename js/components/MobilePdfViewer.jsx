// ============================================================================
// Mobile PDF Viewer - Hybrid Approach
// 
// Strategy for shop floor iPad users:
// 1. FIRST VIEW: Open PDF natively in Safari immediately (no waiting)
// 2. BACKGROUND: Check for cached images, trigger generation if needed
// 3. SUBSEQUENT VIEWS: If images are ready, use fast image-based viewer
//
// This ensures instant access on first view while optimizing repeat views.
// ============================================================================

const MobilePdfViewer = ({ 
    isOpen, 
    onClose, 
    pdfUrl, 
    drawingName,
    drawingId,
    versionId 
}) => {
    // 'checking' = quick check for cached images (< 500ms)
    // 'images' = cached images available, use fast viewer
    // 'native' = no cached images, show native Safari viewer
    const [viewMode, setViewMode] = React.useState('checking');
    const [pageImages, setPageImages] = React.useState([]);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [pageUrls, setPageUrls] = React.useState({});
    const [isOptimizing, setIsOptimizing] = React.useState(false);
    const containerRef = React.useRef(null);
    
    // Track if we've triggered background generation
    const generationTriggeredRef = React.useRef(false);

    // Quick check for cached images on open - timeout after 500ms to avoid blocking
    React.useEffect(() => {
        if (!isOpen || !drawingId || !versionId) return;

        let cancelled = false;
        const checkTimeout = setTimeout(() => {
            if (!cancelled && viewMode === 'checking') {
                console.log('[MobilePdfViewer] Check timeout, using native viewer');
                setViewMode('native');
                triggerBackgroundGeneration();
            }
        }, 500); // Max 500ms wait for cache check

        const checkForCachedImages = async () => {
            try {
                if (!window.MODA_PDF_IMAGES) {
                    console.log('[MobilePdfViewer] PDF Images service not available');
                    if (!cancelled) setViewMode('native');
                    return;
                }

                // Quick check if images already exist (no generation)
                const status = await window.MODA_PDF_IMAGES.checkImagesExist(versionId);
                
                if (cancelled) return;
                clearTimeout(checkTimeout);

                if (status.hasImages && status.pageCount > 0) {
                    console.log(`[MobilePdfViewer] Found ${status.pageCount} cached images - using fast viewer`);
                    const images = await window.MODA_PDF_IMAGES.getPageImages(versionId);
                    if (!cancelled && images.length > 0) {
                        setPageImages(images);
                        setViewMode('images');
                        loadPageUrls(images.slice(0, 3));
                        return;
                    }
                }

                // No cached images - use native viewer and trigger background generation
                console.log('[MobilePdfViewer] No cached images, using native viewer');
                setViewMode('native');
                triggerBackgroundGeneration();

            } catch (err) {
                console.error('[MobilePdfViewer] Cache check error:', err);
                if (!cancelled) {
                    setViewMode('native');
                    triggerBackgroundGeneration();
                }
            }
        };

        checkForCachedImages();

        return () => {
            cancelled = true;
            clearTimeout(checkTimeout);
        };
    }, [isOpen, drawingId, versionId]);

    // Trigger background image generation (fire and forget)
    const triggerBackgroundGeneration = async () => {
        if (generationTriggeredRef.current) return;
        if (!window.MODA_PDF_IMAGES || !drawingId || !versionId) return;
        
        generationTriggeredRef.current = true;
        setIsOptimizing(true);
        
        try {
            console.log('[MobilePdfViewer] Triggering background image generation...');
            const result = await window.MODA_PDF_IMAGES.triggerGeneration(drawingId, versionId, pdfUrl);
            
            if (result.success) {
                if (result.cached) {
                    console.log('[MobilePdfViewer] Images were already cached');
                } else {
                    console.log('[MobilePdfViewer] Generation started in background');
                }
            }
        } catch (err) {
            console.error('[MobilePdfViewer] Background generation error:', err);
        } finally {
            // Keep optimizing indicator for a bit so user knows it's working
            setTimeout(() => setIsOptimizing(false), 3000);
        }
    };

    // Load signed URLs for page images
    const loadPageUrls = async (images) => {
        const urls = {};
        for (const img of images) {
            const url = await window.MODA_PDF_IMAGES.getPageImageUrl(img.storage_path);
            if (url) {
                urls[img.page_number] = url;
            }
        }
        setPageUrls(prev => ({ ...prev, ...urls }));
    };

    // Load URL for a specific page on demand
    const ensurePageUrl = async (pageNum) => {
        if (pageUrls[pageNum]) return;
        
        const pageImage = pageImages.find(p => p.page_number === pageNum);
        if (!pageImage) return;

        const url = await window.MODA_PDF_IMAGES.getPageImageUrl(pageImage.storage_path);
        if (url) {
            setPageUrls(prev => ({ ...prev, [pageNum]: url }));
        }
    };

    // Handle page change
    const goToPage = (pageNum) => {
        if (pageNum < 1 || pageNum > pageImages.length) return;
        setCurrentPage(pageNum);
        
        // Pre-load adjacent pages
        ensurePageUrl(pageNum);
        ensurePageUrl(pageNum - 1);
        ensurePageUrl(pageNum + 1);
    };

    // Handle swipe navigation
    const handleTouchStart = React.useRef({ x: 0, y: 0 });
    const handleTouchEnd = (e) => {
        const deltaX = e.changedTouches[0].clientX - handleTouchStart.current.x;
        const deltaY = Math.abs(e.changedTouches[0].clientY - handleTouchStart.current.y);
        
        // Only handle horizontal swipes
        if (Math.abs(deltaX) > 50 && deltaY < 100) {
            if (deltaX > 0) {
                goToPage(currentPage - 1);
            } else {
                goToPage(currentPage + 1);
            }
        }
    };

    if (!isOpen) return null;

    // Checking state - show minimal loading while checking cache (max 500ms)
    if (viewMode === 'checking') {
        return (
            <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
                {/* Header */}
                <div className="flex items-center justify-between p-3 bg-gray-900 text-white shrink-0">
                    <h3 className="font-medium truncate flex-1 mr-4 text-sm">{drawingName}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-700 rounded-full"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
            </div>
        );
    }

    // Native viewer - shows PDF in iframe with iOS Safari's native viewer
    if (viewMode === 'native') {
        return (
            <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
                {/* Header */}
                <div className="flex items-center justify-between p-3 bg-gray-900 text-white shrink-0">
                    <h3 className="font-medium truncate flex-1 mr-4 text-sm">{drawingName}</h3>
                    <div className="flex items-center gap-2">
                        {isOptimizing && (
                            <span className="text-xs text-blue-400 flex items-center gap-1">
                                <span className="animate-pulse">Optimizing for faster viewing...</span>
                            </span>
                        )}
                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
                        >
                            Open Full
                        </a>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-700 rounded-full"
                            aria-label="Close"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                {/* Native PDF iframe - iOS Safari handles this well */}
                <iframe
                    src={pdfUrl}
                    className="flex-1 w-full bg-white"
                    title={drawingName}
                    style={{ border: 'none' }}
                />
            </div>
        );
    }

    // Image-based viewer
    return (
        <div className="fixed inset-0 bg-black flex flex-col z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-gray-900 text-white shrink-0">
                <h3 className="font-medium truncate flex-1 mr-2 text-sm">{drawingName}</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                        {currentPage} / {pageImages.length}
                    </span>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-700 rounded-full"
                        aria-label="Close"
                    >
                        <span className="icon-x w-5 h-5"></span>
                    </button>
                </div>
            </div>

            {/* Page viewer */}
            <div 
                ref={containerRef}
                className="flex-1 overflow-auto bg-gray-800"
                onTouchStart={(e) => {
                    handleTouchStart.current = { 
                        x: e.touches[0].clientX, 
                        y: e.touches[0].clientY 
                    };
                }}
                onTouchEnd={handleTouchEnd}
            >
                {pageUrls[currentPage] ? (
                    <iframe
                        src={pageUrls[currentPage]}
                        className="w-full h-full bg-white"
                        title={`Page ${currentPage}`}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                )}
            </div>

            {/* Page navigation */}
            <div className="flex items-center justify-between p-2 bg-gray-900 shrink-0">
                <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded"
                >
                    Prev
                </button>
                
                {/* Page selector */}
                <select
                    value={currentPage}
                    onChange={(e) => goToPage(parseInt(e.target.value))}
                    className="px-3 py-2 bg-gray-700 text-white rounded border-none"
                >
                    {pageImages.map((_, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                            Page {idx + 1}
                        </option>
                    ))}
                </select>

                <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= pageImages.length}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

// Export to window
window.MobilePdfViewer = MobilePdfViewer;
