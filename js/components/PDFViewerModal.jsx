/**
 * PDFViewerModal - In-app PDF viewer with markup capabilities
 * 
 * Features:
 * - PDF viewing via browser's native PDF renderer (object/embed)
 * - Markup tools: Text box with arrow leader, Cloud, Arrow
 * - SVG overlay for annotations (better than canvas for this use case)
 */

const { useState, useRef, useEffect, useCallback } = React;

const PDFViewerModal = ({ 
    isOpen, 
    onClose, 
    pdfUrl, 
    drawingName,
    drawingId,
    versionId 
}) => {
    // Debug: log the PDF URL
    useEffect(() => {
        if (isOpen && pdfUrl) {
            console.log('[PDFViewer] Opening PDF:', pdfUrl);
        }
    }, [isOpen, pdfUrl]);
    
    // Markup state
    const [activeTool, setActiveTool] = useState(null); // 'textbox', 'cloud', 'arrow'
    const [annotations, setAnnotations] = useState([]);
    const [currentAnnotation, setCurrentAnnotation] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [selectedAnnotation, setSelectedAnnotation] = useState(null);
    const [showMarkupMode, setShowMarkupMode] = useState(false);
    
    // Text input state
    const [textInputVisible, setTextInputVisible] = useState(false);
    const [textInputValue, setTextInputValue] = useState('');
    const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 });
    
    // Refs
    const overlayRef = useRef(null);
    
    // Get mouse position relative to overlay
    const getMousePos = useCallback((e) => {
        if (!overlayRef.current) return { x: 0, y: 0 };
        const rect = overlayRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }, []);
    
    // Handle overlay mouse down
    const handleMouseDown = useCallback((e) => {
        if (!activeTool || !showMarkupMode) return;
        e.preventDefault();
        
        const pos = getMousePos(e);
        setIsDrawing(true);
        setSelectedAnnotation(null);
        
        setCurrentAnnotation({
            type: activeTool,
            startX: pos.x,
            startY: pos.y,
            endX: pos.x,
            endY: pos.y,
            text: ''
        });
    }, [activeTool, showMarkupMode, getMousePos]);
    
    // Handle overlay mouse move
    const handleMouseMove = useCallback((e) => {
        if (!isDrawing || !currentAnnotation) return;
        
        const pos = getMousePos(e);
        setCurrentAnnotation(prev => ({
            ...prev,
            endX: pos.x,
            endY: pos.y
        }));
    }, [isDrawing, currentAnnotation, getMousePos]);
    
    // Handle overlay mouse up
    const handleMouseUp = useCallback((e) => {
        if (!isDrawing || !currentAnnotation) return;
        
        setIsDrawing(false);
        
        // Check if annotation has meaningful size
        const dx = Math.abs(currentAnnotation.endX - currentAnnotation.startX);
        const dy = Math.abs(currentAnnotation.endY - currentAnnotation.startY);
        
        if (dx < 10 && dy < 10) {
            setCurrentAnnotation(null);
            return;
        }
        
        if (currentAnnotation.type === 'textbox') {
            // Show text input for textbox
            setTextInputPosition({ 
                x: Math.min(currentAnnotation.startX, currentAnnotation.endX),
                y: Math.min(currentAnnotation.startY, currentAnnotation.endY) - 40
            });
            setTextInputVisible(true);
            setTextInputValue('');
        } else {
            // Add annotation directly for cloud and arrow
            const newAnnotation = {
                ...currentAnnotation,
                id: Date.now().toString()
            };
            setAnnotations(prev => [...prev, newAnnotation]);
            setCurrentAnnotation(null);
        }
    }, [isDrawing, currentAnnotation]);
    
    // Handle text input submit
    const handleTextSubmit = useCallback(() => {
        if (textInputValue.trim() && currentAnnotation) {
            const newAnnotation = {
                ...currentAnnotation,
                text: textInputValue.trim(),
                id: Date.now().toString()
            };
            setAnnotations(prev => [...prev, newAnnotation]);
        }
        setTextInputVisible(false);
        setTextInputValue('');
        setCurrentAnnotation(null);
    }, [textInputValue, currentAnnotation]);
    
    // Handle text input cancel
    const handleTextCancel = useCallback(() => {
        setTextInputVisible(false);
        setTextInputValue('');
        setCurrentAnnotation(null);
    }, []);
    
    // Delete selected annotation
    const deleteSelectedAnnotation = useCallback(() => {
        if (selectedAnnotation) {
            setAnnotations(prev => prev.filter(a => a.id !== selectedAnnotation.id));
            setSelectedAnnotation(null);
        }
    }, [selectedAnnotation]);
    
    // Handle click on annotation to select
    const handleAnnotationClick = useCallback((e, annotation) => {
        e.stopPropagation();
        if (!activeTool) {
            setSelectedAnnotation(annotation);
        }
    }, [activeTool]);
    
    // Clear all annotations
    const clearAnnotations = useCallback(() => {
        if (confirm('Clear all annotations?')) {
            setAnnotations([]);
            setSelectedAnnotation(null);
        }
    }, []);
    
    // Toggle markup mode
    const toggleMarkupMode = useCallback(() => {
        setShowMarkupMode(prev => !prev);
        if (showMarkupMode) {
            setActiveTool(null);
            setSelectedAnnotation(null);
        }
    }, [showMarkupMode]);
    
    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!isOpen) return;
            
            if (e.key === 'Escape') {
                if (textInputVisible) {
                    handleTextCancel();
                } else if (activeTool) {
                    setActiveTool(null);
                    setCurrentAnnotation(null);
                } else if (showMarkupMode) {
                    setShowMarkupMode(false);
                } else {
                    onClose();
                }
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && !textInputVisible) {
                if (selectedAnnotation) {
                    e.preventDefault();
                    deleteSelectedAnnotation();
                }
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, textInputVisible, activeTool, selectedAnnotation, showMarkupMode, handleTextCancel, deleteSelectedAnnotation, onClose]);
    
    // Render arrow SVG path
    const renderArrow = (startX, startY, endX, endY, isSelected) => {
        const headLength = 15;
        const angle = Math.atan2(endY - startY, endX - startX);
        
        const arrowHead1X = endX - headLength * Math.cos(angle - Math.PI / 6);
        const arrowHead1Y = endY - headLength * Math.sin(angle - Math.PI / 6);
        const arrowHead2X = endX - headLength * Math.cos(angle + Math.PI / 6);
        const arrowHead2Y = endY - headLength * Math.sin(angle + Math.PI / 6);
        
        return (
            <g>
                <line 
                    x1={startX} y1={startY} x2={endX} y2={endY}
                    stroke={isSelected ? '#0066FF' : '#FF0000'}
                    strokeWidth="3"
                />
                <polygon
                    points={`${endX},${endY} ${arrowHead1X},${arrowHead1Y} ${arrowHead2X},${arrowHead2Y}`}
                    fill={isSelected ? '#0066FF' : '#FF0000'}
                />
            </g>
        );
    };
    
    // Render cloud SVG path
    const renderCloud = (x1, y1, x2, y2, isSelected) => {
        const minX = Math.min(x1, x2);
        const minY = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
        
        if (width < 20 || height < 20) return null;
        
        // Create cloud path with bumps
        const numBumpsH = Math.max(3, Math.floor(width / 40));
        const numBumpsV = Math.max(2, Math.floor(height / 40));
        const bumpRadiusH = width / (numBumpsH * 2);
        const bumpRadiusV = height / (numBumpsV * 2);
        
        let path = `M ${minX + bumpRadiusH} ${minY + bumpRadiusH}`;
        
        // Top bumps
        for (let i = 0; i < numBumpsH; i++) {
            const cx = minX + bumpRadiusH + (i * bumpRadiusH * 2);
            path += ` A ${bumpRadiusH} ${bumpRadiusH} 0 0 1 ${cx + bumpRadiusH * 2} ${minY + bumpRadiusH}`;
        }
        
        // Right bumps
        for (let i = 0; i < numBumpsV; i++) {
            const cy = minY + bumpRadiusV + (i * bumpRadiusV * 2);
            path += ` A ${bumpRadiusV} ${bumpRadiusV} 0 0 1 ${minX + width - bumpRadiusV} ${cy + bumpRadiusV * 2}`;
        }
        
        // Bottom bumps (reverse)
        for (let i = numBumpsH - 1; i >= 0; i--) {
            const cx = minX + bumpRadiusH + (i * bumpRadiusH * 2);
            path += ` A ${bumpRadiusH} ${bumpRadiusH} 0 0 1 ${cx} ${minY + height - bumpRadiusH}`;
        }
        
        // Left bumps
        for (let i = numBumpsV - 1; i >= 0; i--) {
            const cy = minY + bumpRadiusV + (i * bumpRadiusV * 2);
            path += ` A ${bumpRadiusV} ${bumpRadiusV} 0 0 1 ${minX + bumpRadiusV} ${cy}`;
        }
        
        path += ' Z';
        
        return (
            <path
                d={path}
                fill="none"
                stroke={isSelected ? '#0066FF' : '#FF0000'}
                strokeWidth="3"
            />
        );
    };
    
    // Render textbox with arrow leader
    const renderTextbox = (annotation, isSelected) => {
        const { startX, startY, endX, endY, text } = annotation;
        
        // Text box dimensions
        const padding = 8;
        const fontSize = 14;
        const textWidth = text ? Math.max(text.length * 8, 60) : 60;
        const boxWidth = textWidth + padding * 2;
        const boxHeight = fontSize + padding * 2;
        
        // Position text box at start, arrow points to end
        const boxX = startX;
        const boxY = startY - boxHeight;
        
        // Arrow from bottom center of box to end point
        const arrowStartX = startX + boxWidth / 2;
        const arrowStartY = startY;
        
        return (
            <g>
                {/* Text box background */}
                <rect
                    x={boxX}
                    y={boxY}
                    width={boxWidth}
                    height={boxHeight}
                    fill="#FFFFCC"
                    stroke={isSelected ? '#0066FF' : '#FF0000'}
                    strokeWidth="2"
                    rx="3"
                />
                {/* Text */}
                {text && (
                    <text
                        x={boxX + padding}
                        y={boxY + boxHeight - padding - 2}
                        fontSize={fontSize}
                        fill="#000000"
                    >
                        {text}
                    </text>
                )}
                {/* Arrow leader */}
                {renderArrow(arrowStartX, arrowStartY, endX, endY, isSelected)}
            </g>
        );
    };
    
    // Render annotation based on type
    const renderAnnotation = (annotation, isSelected = false) => {
        const key = annotation.id || 'current';
        
        switch (annotation.type) {
            case 'arrow':
                return (
                    <g 
                        key={key} 
                        onClick={(e) => annotation.id && handleAnnotationClick(e, annotation)}
                        style={{ cursor: activeTool ? 'crosshair' : 'pointer' }}
                    >
                        {renderArrow(annotation.startX, annotation.startY, annotation.endX, annotation.endY, isSelected)}
                    </g>
                );
            case 'cloud':
                return (
                    <g 
                        key={key}
                        onClick={(e) => annotation.id && handleAnnotationClick(e, annotation)}
                        style={{ cursor: activeTool ? 'crosshair' : 'pointer' }}
                    >
                        {renderCloud(annotation.startX, annotation.startY, annotation.endX, annotation.endY, isSelected)}
                    </g>
                );
            case 'textbox':
                return (
                    <g 
                        key={key}
                        onClick={(e) => annotation.id && handleAnnotationClick(e, annotation)}
                        style={{ cursor: activeTool ? 'crosshair' : 'pointer' }}
                    >
                        {renderTextbox(annotation, isSelected)}
                    </g>
                );
            default:
                return null;
        }
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/90 flex flex-col z-50">
            {/* Header */}
            <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-700 rounded transition"
                        title="Close (Esc)"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <h2 className="font-medium truncate max-w-md">{drawingName}</h2>
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleMarkupMode}
                        className={`px-4 py-2 rounded transition flex items-center gap-2 ${
                            showMarkupMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.5,1.15C17.97,1.15 17.46,1.34 17.07,1.73L11.26,7.55L16.91,13.2L22.73,7.39C23.5,6.61 23.5,5.35 22.73,4.56L19.89,1.73C19.5,1.34 19,1.15 18.5,1.15M10.3,8.5L4.34,14.46C3.56,15.24 3.56,16.5 4.34,17.27C5.12,18.05 6.38,18.05 7.16,17.27L13.11,11.32L10.3,8.5M2.93,17.94L1,23L6.06,21.07L2.93,17.94Z"/>
                        </svg>
                        {showMarkupMode ? 'Exit Markup' : 'Markup'}
                    </button>
                </div>
            </div>
            
            {/* Toolbar - only show in markup mode */}
            {showMarkupMode && (
                <div className="bg-gray-800 text-white px-4 py-2 flex items-center gap-4 border-t border-gray-700 flex-shrink-0">
                    <span className="text-sm text-gray-400">Tools:</span>
                    <button
                        onClick={() => setActiveTool(activeTool === 'textbox' ? null : 'textbox')}
                        className={`px-3 py-1.5 rounded transition flex items-center gap-2 ${
                            activeTool === 'textbox' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                        title="Text Box with Arrow Leader - Click and drag to place"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                        </svg>
                        Text
                    </button>
                    <button
                        onClick={() => setActiveTool(activeTool === 'cloud' ? null : 'cloud')}
                        className={`px-3 py-1.5 rounded transition flex items-center gap-2 ${
                            activeTool === 'cloud' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                        title="Cloud Shape - Click and drag to draw"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
                        </svg>
                        Cloud
                    </button>
                    <button
                        onClick={() => setActiveTool(activeTool === 'arrow' ? null : 'arrow')}
                        className={`px-3 py-1.5 rounded transition flex items-center gap-2 ${
                            activeTool === 'arrow' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                        title="Arrow - Click and drag to draw"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                        </svg>
                        Arrow
                    </button>
                    
                    <div className="border-l border-gray-600 h-6 mx-2"></div>
                    
                    {selectedAnnotation && (
                        <button
                            onClick={deleteSelectedAnnotation}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded transition flex items-center gap-2"
                            title="Delete Selected (Del)"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
                            </svg>
                            Delete
                        </button>
                    )}
                    
                    {annotations.length > 0 && (
                        <button
                            onClick={clearAnnotations}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded transition text-sm"
                            title="Clear All Annotations"
                        >
                            Clear All
                        </button>
                    )}
                    
                    <div className="flex-1"></div>
                    
                    <span className="text-sm text-gray-400">
                        {activeTool ? `Click and drag to draw ${activeTool}` : 'Select a tool or click annotation to select'}
                    </span>
                </div>
            )}
            
            {/* PDF Content with Overlay */}
            <div className="flex-1 relative overflow-hidden bg-gray-700">
                {/* PDF displayed via Google Docs Viewer - bypasses X-Frame-Options restrictions */}
                <iframe
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(pdfUrl)}&embedded=true`}
                    className="w-full h-full border-0 bg-white"
                    style={{ pointerEvents: showMarkupMode ? 'none' : 'auto' }}
                    title={drawingName}
                />
                
                {/* SVG Overlay for annotations - only interactive in markup mode */}
                {showMarkupMode && (
                    <svg
                        ref={overlayRef}
                        className="absolute inset-0 w-full h-full"
                        style={{ cursor: activeTool ? 'crosshair' : 'default' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={() => {
                            if (isDrawing) {
                                setIsDrawing(false);
                                setCurrentAnnotation(null);
                            }
                        }}
                    >
                        {/* Render all saved annotations */}
                        {annotations.map(annotation => 
                            renderAnnotation(annotation, selectedAnnotation?.id === annotation.id)
                        )}
                        
                        {/* Render current annotation being drawn */}
                        {currentAnnotation && renderAnnotation(currentAnnotation)}
                    </svg>
                )}
                
                {/* Text Input Overlay */}
                {textInputVisible && (
                    <div 
                        className="absolute bg-white border-2 border-blue-500 rounded shadow-lg p-2 z-10"
                        style={{ 
                            left: textInputPosition.x, 
                            top: textInputPosition.y
                        }}
                    >
                        <input
                            type="text"
                            value={textInputValue}
                            onChange={(e) => setTextInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleTextSubmit();
                                if (e.key === 'Escape') handleTextCancel();
                            }}
                            className="border border-gray-300 rounded px-2 py-1 text-sm w-48"
                            placeholder="Enter text..."
                            autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={handleTextSubmit}
                                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                            >
                                Add
                            </button>
                            <button
                                onClick={handleTextCancel}
                                className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Footer with annotation count */}
            {showMarkupMode && annotations.length > 0 && (
                <div className="bg-gray-800 text-white px-4 py-2 text-sm text-center border-t border-gray-700 flex-shrink-0">
                    {annotations.length} annotation{annotations.length !== 1 ? 's' : ''} on this drawing
                </div>
            )}
        </div>
    );
};

// Export to window for use in DrawingsModule
window.PDFViewerModal = PDFViewerModal;
