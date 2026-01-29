// ============================================================================
// Mobile PDF Viewer
// Fast image-based PDF viewer for mobile devices
// Falls back to native iframe if images aren't ready
// ============================================================================

const MobilePdfViewer = ({ 
    isOpen, 
    onClose, 
    pdfUrl, 
    drawingName,
    drawingId,
    versionId 
}) => {
    const [viewMode, setViewMode] = React.useState('loading'); // 'loading' | 'images' | 'native' | 'generating'
    const [pageImages, setPageImages] = React.useState([]);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [pageUrls, setPageUrls] = React.useState({});
    const [generationProgress, setGenerationProgress] = React.useState(null);
    const [error, setError] = React.useState(null);
    const containerRef = React.useRef(null);

    // Load page images or trigger generation
    React.useEffect(() => {
        if (!isOpen || !drawingId || !versionId) return;

        let cancelled = false;
        let pollInterval = null;

        const loadImages = async () => {
            setViewMode('loading');
            setError(null);

            try {
                // Check if MODA_PDF_IMAGES service is available
                if (!window.MODA_PDF_IMAGES) {
                    console.log('[MobilePdfViewer] PDF Images service not available, using native viewer');
                    setViewMode('native');
                    return;
                }

                // Try to get or generate page images
                const result = await window.MODA_PDF_IMAGES.getOrGeneratePageImages(
                    drawingId,
                    versionId,
                    pdfUrl
                );

                if (cancelled) return;

                if (result.ready && result.images?.length > 0) {
                    console.log(`[MobilePdfViewer] Got ${result.images.length} page images`);
                    setPageImages(result.images);
                    setViewMode('images');
                    
                    // Pre-load first few page URLs
                    loadPageUrls(result.images.slice(0, 3));
                } else if (result.generating) {
                    console.log('[MobilePdfViewer] Images generating, showing native viewer with progress');
                    setGenerationProgress({ 
                        total: result.totalPages || 0, 
                        processed: 0,
                        jobId: result.jobId 
                    });
                    setViewMode('generating');
                    
                    // Poll for completion
                    pollInterval = setInterval(async () => {
                        const job = await window.MODA_PDF_IMAGES.getJobStatus(versionId);
                        if (!job) return;

                        if (job.status === 'completed') {
                            clearInterval(pollInterval);
                            const images = await window.MODA_PDF_IMAGES.getPageImages(versionId);
                            if (!cancelled && images.length > 0) {
                                setPageImages(images);
                                setViewMode('images');
                                loadPageUrls(images.slice(0, 3));
                            }
                        } else if (job.status === 'failed') {
                            clearInterval(pollInterval);
                            console.log('[MobilePdfViewer] Generation failed, using native viewer');
                            setViewMode('native');
                        } else {
                            setGenerationProgress({
                                total: job.total_pages || 0,
                                processed: job.processed_pages || 0,
                                jobId: job.id
                            });
                        }
                    }, 2000);
                } else {
                    console.log('[MobilePdfViewer] No images available, using native viewer');
                    setViewMode('native');
                }
            } catch (err) {
                console.error('[MobilePdfViewer] Error:', err);
                if (!cancelled) {
                    setViewMode('native');
                }
            }
        };

        loadImages();

        return () => {
            cancelled = true;
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [isOpen, drawingId, versionId, pdfUrl]);

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

    // Native iframe viewer (fallback or while generating)
    if (viewMode === 'native' || viewMode === 'generating') {
        return (
            <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
                {/* Header */}
                <div className="flex items-center justify-between p-3 bg-gray-900 text-white shrink-0">
                    <h3 className="font-medium truncate flex-1 mr-4 text-sm">{drawingName}</h3>
                    <div className="flex items-center gap-2">
                        {viewMode === 'generating' && generationProgress && (
                            <span className="text-xs text-blue-400">
                                Optimizing: {generationProgress.processed}/{generationProgress.total || '?'}
                            </span>
                        )}
                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                        >
                            New Tab
                        </a>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-700 rounded-full"
                            aria-label="Close"
                        >
                            <span className="icon-x w-5 h-5"></span>
                        </button>
                    </div>
                </div>
                
                {/* Native PDF iframe */}
                <iframe
                    src={pdfUrl}
                    className="flex-1 w-full bg-white"
                    title={drawingName}
                />
            </div>
        );
    }

    // Loading state
    if (viewMode === 'loading') {
        return (
            <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                <p className="text-white text-sm">Loading...</p>
                <button
                    onClick={onClose}
                    className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                >
                    Cancel
                </button>
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
