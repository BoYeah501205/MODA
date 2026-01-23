/**
 * DrawingLinksPanel Component
 * 
 * Displays quick-access links to specific pages within permit drawing packages.
 * Shows preset links (Shear Schedule, Window Schedule, etc.) and custom links.
 * Allows users with edit permissions to configure and add new links.
 */

const DrawingLinksPanel = ({ 
    projectId, 
    projectName,
    drawings = [],
    auth,
    onRefresh
}) => {
    const { useState, useEffect, useCallback, useMemo } = React;
    
    // State
    const [links, setLinks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showConfigureModal, setShowConfigureModal] = useState(null); // Link being configured
    const [isExpanded, setIsExpanded] = useState(true);
    
    // Check if user can edit links (Admin or Production Management)
    const canEdit = useMemo(() => {
        const role = auth?.currentUser?.dashboardRole;
        return role === 'admin' || role === 'Admin' || 
               role === 'production_management' || role === 'Production Management';
    }, [auth]);
    
    // Check if Supabase drawing links module is available
    const isAvailable = () => window.MODA_DRAWING_LINKS?.isAvailable?.();
    
    // Load links on mount
    useEffect(() => {
        const loadLinks = async () => {
            if (!projectId || !isAvailable()) {
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            try {
                // Initialize presets if needed, then get all links
                await window.MODA_DRAWING_LINKS.initializePresets(
                    projectId, 
                    auth?.currentUser?.name || 'System'
                );
                const data = await window.MODA_DRAWING_LINKS.getByProject(projectId);
                setLinks(data);
            } catch (error) {
                console.error('[DrawingLinksPanel] Error loading links:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadLinks();
    }, [projectId, auth]);
    
    // Handle clicking a link
    const handleLinkClick = useCallback(async (link) => {
        if (!link.package_path && !link.sharepoint_file_id) {
            // Link not configured - show configure modal if user can edit
            if (canEdit) {
                setShowConfigureModal(link);
            } else {
                alert('This link has not been configured yet.');
            }
            return;
        }
        
        // Open the link (extract page and open in new tab)
        await window.MODA_DRAWING_LINKS.pdf.openLink(link);
    }, [canEdit]);
    
    // Handle saving link configuration (with pre-extraction)
    const handleSaveLink = useCallback(async (linkId, updates, onProgress = null) => {
        try {
            // Use pre-extraction if SharePoint file is specified
            if (updates.sharepointFileId && window.MODA_DRAWING_LINKS.pdf?.createLinkWithExtraction) {
                await window.MODA_DRAWING_LINKS.pdf.createLinkWithExtraction(
                    { id: linkId, ...updates, createdBy: auth?.currentUser?.name || 'Unknown' },
                    projectName,
                    onProgress
                );
            } else {
                await window.MODA_DRAWING_LINKS.update(linkId, updates);
            }
            // Refresh links
            const data = await window.MODA_DRAWING_LINKS.getByProject(projectId);
            setLinks(data);
            setShowConfigureModal(null);
        } catch (error) {
            console.error('[DrawingLinksPanel] Error saving link:', error);
            // Don't show error for extraction failures - link is still saved
            if (!error.message?.includes('extraction')) {
                alert('Error saving link: ' + error.message);
            }
            // Refresh anyway - link was created, just extraction failed
            const data = await window.MODA_DRAWING_LINKS.getByProject(projectId);
            setLinks(data);
            setShowConfigureModal(null);
        }
    }, [projectId, projectName, auth]);
    
    // Handle adding a new custom link (with pre-extraction)
    const handleAddLink = useCallback(async (linkData, onProgress = null) => {
        try {
            // Use pre-extraction if SharePoint file is specified
            if (linkData.sharepointFileId && window.MODA_DRAWING_LINKS.pdf?.createLinkWithExtraction) {
                await window.MODA_DRAWING_LINKS.pdf.createLinkWithExtraction(
                    { projectId, ...linkData, createdBy: auth?.currentUser?.name || 'Unknown' },
                    projectName,
                    onProgress
                );
            } else {
                await window.MODA_DRAWING_LINKS.create({
                    projectId,
                    ...linkData,
                    createdBy: auth?.currentUser?.name || 'Unknown'
                });
            }
            // Refresh links
            const data = await window.MODA_DRAWING_LINKS.getByProject(projectId);
            setLinks(data);
            setShowAddModal(false);
        } catch (error) {
            console.error('[DrawingLinksPanel] Error adding link:', error);
            // Don't show error for extraction failures - link is still saved
            if (!error.message?.includes('extraction')) {
                alert('Error adding link: ' + error.message);
            }
            // Refresh anyway - link was created, just extraction failed
            const data = await window.MODA_DRAWING_LINKS.getByProject(projectId);
            setLinks(data);
            setShowAddModal(false);
        }
    }, [projectId, projectName, auth]);
    
    // Handle deleting a link
    const handleDeleteLink = useCallback(async (linkId) => {
        if (!confirm('Delete this link?')) return;
        
        try {
            await window.MODA_DRAWING_LINKS.delete(linkId);
            // Refresh links
            const data = await window.MODA_DRAWING_LINKS.getByProject(projectId);
            setLinks(data);
        } catch (error) {
            console.error('[DrawingLinksPanel] Error deleting link:', error);
            alert('Error deleting link: ' + error.message);
        }
    }, [projectId]);
    
    // Handle resetting a link (clear configuration)
    const handleResetLink = useCallback(async (linkId) => {
        if (!confirm('Reset this link? This will clear the drawing and page configuration.')) return;
        
        try {
            // Use empty strings for NOT NULL constrained columns
            await window.MODA_DRAWING_LINKS.update(linkId, {
                packagePath: '',
                sharepointFileId: null,
                pageNumber: '',
                extractedFileId: null,
                extractionStatus: null,
                extractedAt: null
            });
            // Refresh links
            const data = await window.MODA_DRAWING_LINKS.getByProject(projectId);
            setLinks(data);
        } catch (error) {
            console.error('[DrawingLinksPanel] Error resetting link:', error);
            alert('Error resetting link: ' + error.message);
        }
    }, [projectId]);
    
    // Separate preset and custom links
    const presetLinks = useMemo(() => links.filter(l => l.is_preset), [links]);
    const customLinks = useMemo(() => links.filter(l => !l.is_preset), [links]);
    
    // Check if a link is configured
    const isConfigured = (link) => !!(link.package_path || link.sharepoint_file_id);
    
    if (!isAvailable()) {
        return null; // Don't render if not available
    }
    
    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4">
            {/* Header */}
            <div 
                className="flex items-center justify-between px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <span className="icon-link text-blue-600"></span>
                    <h3 className="font-semibold text-gray-800">Linked Details</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {links.length} links
                    </span>
                </div>
                <button className="text-gray-400 hover:text-gray-600 transition-transform duration-200"
                        style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>
            
            {/* Content */}
            {isExpanded && (
                <div className="p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-500">Loading links...</span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Preset Links */}
                            {presetLinks.map(link => (
                                <LinkButton 
                                    key={link.id}
                                    link={link}
                                    isConfigured={isConfigured(link)}
                                    canEdit={canEdit}
                                    onClick={() => handleLinkClick(link)}
                                    onConfigure={() => setShowConfigureModal(link)}
                                    onReset={() => handleResetLink(link.id)}
                                />
                            ))}
                            
                            {/* Custom Links */}
                            {customLinks.map(link => (
                                <LinkButton 
                                    key={link.id}
                                    link={link}
                                    isConfigured={isConfigured(link)}
                                    canEdit={canEdit}
                                    onClick={() => handleLinkClick(link)}
                                    onConfigure={() => setShowConfigureModal(link)}
                                    onDelete={() => handleDeleteLink(link.id)}
                                    onReset={() => handleResetLink(link.id)}
                                    isCustom={true}
                                />
                            ))}
                            
                            {/* Add Link Button */}
                            {canEdit && (
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Link
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
            
            {/* Configure Link Modal */}
            {showConfigureModal && (
                <ConfigureLinkModal
                    link={showConfigureModal}
                    projectId={projectId}
                    onSave={handleSaveLink}
                    onClose={() => setShowConfigureModal(null)}
                />
            )}
            
            {/* Add Link Modal */}
            {showAddModal && (
                <AddLinkModal
                    projectId={projectId}
                    onAdd={handleAddLink}
                    onClose={() => setShowAddModal(false)}
                />
            )}
        </div>
    );
};

/**
 * Individual link button component
 */
const LinkButton = ({ link, isConfigured, canEdit, onClick, onConfigure, onDelete, onReset, isCustom }) => {
    const { useState } = React;
    const [showMenu, setShowMenu] = useState(false);
    
    return (
        <div className="relative group">
            <button
                onClick={onClick}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border transition-all ${
                    isConfigured 
                        ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-blue-700'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-500'
                }`}
            >
                <div className="flex items-center gap-2">
                    {isConfigured ? (
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                    <span className="font-medium">{link.label}</span>
                    {isConfigured && link.page_number && (
                        <span className="text-xs bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded">
                            {String(link.page_number).includes(',') || String(link.page_number).includes('-') 
                                ? `Pages ${link.page_number}` 
                                : `Page ${link.page_number}`}
                        </span>
                    )}
                    {/* Extraction status indicator - only show "Fast" for pre-extracted links */}
                    {isConfigured && link.extraction_status === 'ready' && link.extracted_file_id && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded" title="Pre-extracted for instant access">
                            Fast
                        </span>
                    )}
                    {isConfigured && link.extraction_status === 'extracting' && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded animate-pulse">
                            Extracting...
                        </span>
                    )}
                </div>
                
                {!isConfigured && canEdit && (
                    <span className="text-xs text-gray-400">Click to configure</span>
                )}
            </button>
            
            {/* Edit/Delete menu for editable links */}
            {canEdit && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        className="p-1 hover:bg-white rounded"
                    >
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>
                    
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMenu(false); onConfigure(); }}
                                className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                            >
                                Configure
                            </button>
                            {isConfigured && onReset && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onReset(); }}
                                    className="w-full px-3 py-1.5 text-left text-sm text-orange-600 hover:bg-orange-50"
                                >
                                    Reset Link
                                </button>
                            )}
                            {isCustom && onDelete && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(); }}
                                    className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * Modal for configuring a link (selecting package and page)
 * Uses folder/tile navigation to browse disciplines and select drawings
 */
const ConfigureLinkModal = ({ link, projectId, onSave, onClose }) => {
    const { useState, useEffect } = React;
    
    // Navigation state: 'disciplines' -> 'drawings' -> 'configure'
    const [step, setStep] = useState('disciplines');
    const [disciplines, setDisciplines] = useState([]);
    const [selectedDiscipline, setSelectedDiscipline] = useState(null);
    const [drawings, setDrawings] = useState([]);
    const [selectedDrawing, setSelectedDrawing] = useState(null);
    const [pageNumber, setPageNumber] = useState(link.page_number || 1);
    const [description, setDescription] = useState(link.description || '');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Load disciplines (folders) for Permit Drawings category
    useEffect(() => {
        const loadDisciplines = async () => {
            if (!projectId || !window.MODA_SUPABASE_DRAWINGS) {
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            try {
                // Get custom folders for this project
                const folders = await window.MODA_SUPABASE_DRAWINGS.folders.getByProject(projectId);
                
                // Filter to only Permit Drawings disciplines
                const permitCategory = folders.find(f => 
                    f.folder_type === 'category' && 
                    (f.name === 'Permit Drawings' || f.name.toLowerCase().includes('permit'))
                );
                
                if (permitCategory) {
                    const permitDisciplines = folders.filter(f => 
                        f.folder_type === 'discipline' && f.parent_id === permitCategory.id
                    );
                    setDisciplines(permitDisciplines);
                } else {
                    // Use default permit disciplines
                    const defaultDisciplines = [
                        { id: 'modular-architecture', name: 'Modular Architect Submittal', isDefault: true },
                        { id: 'structural-plans', name: 'Structural Plans Submittal', isDefault: true },
                        { id: 'mechanical', name: 'Mechanical Submittal', isDefault: true },
                        { id: 'electrical', name: 'Electrical Submittal', isDefault: true },
                        { id: 'fire-alarm', name: 'Fire Alarm Data Submittal', isDefault: true },
                        { id: 'title-24', name: 'Title 24', isDefault: true },
                    ];
                    setDisciplines(defaultDisciplines);
                }
            } catch (error) {
                console.error('[ConfigureLinkModal] Error loading disciplines:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadDisciplines();
    }, [projectId]);
    
    // Load drawings when a discipline is selected
    const handleSelectDiscipline = async (discipline) => {
        setSelectedDiscipline(discipline);
        setIsLoading(true);
        
        try {
            // Fetch ALL drawings for this project, then filter by discipline
            // This handles cases where discipline is stored as ID or name
            const allDrawings = await window.MODA_SUPABASE_DRAWINGS.drawings.getByProject(projectId);
            
            // Filter by discipline - match by ID, name, or partial match
            const disciplineId = discipline.id || '';
            const disciplineName = discipline.name || '';
            
            const filteredDrawings = allDrawings.filter(d => {
                const drawingDiscipline = (d.discipline || '').toLowerCase();
                return drawingDiscipline === disciplineId.toLowerCase() ||
                       drawingDiscipline === disciplineName.toLowerCase() ||
                       disciplineName.toLowerCase().includes(drawingDiscipline) ||
                       drawingDiscipline.includes(disciplineName.toLowerCase().split(' ')[0]);
            });
            
            setDrawings(filteredDrawings);
            setStep('drawings');
        } catch (error) {
            console.error('[ConfigureLinkModal] Error loading drawings:', error);
            setDrawings([]);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handle selecting a drawing
    const handleSelectDrawing = (drawing) => {
        setSelectedDrawing(drawing);
        setStep('configure');
    };
    
    // Extraction progress state
    const [extractionProgress, setExtractionProgress] = useState(null);
    
    // Handle save with extraction progress
    const handleSave = async () => {
        if (!selectedDrawing) {
            alert('Please select a drawing package');
            return;
        }
        
        // Get the latest version's SharePoint file ID
        const latestVersion = selectedDrawing.versions?.sort((a, b) => 
            new Date(b.uploaded_at) - new Date(a.uploaded_at)
        )[0];
        
        setIsSaving(true);
        setExtractionProgress({ status: 'starting', percent: 0 });
        
        try {
            await onSave(link.id, {
                packagePath: latestVersion?.storage_path || '',
                sharepointFileId: latestVersion?.sharepoint_file_id || null,
                pageNumber: pageNumber || '1',
                description: description || null
            }, (progress) => {
                setExtractionProgress(progress);
            });
        } finally {
            setIsSaving(false);
            setExtractionProgress(null);
        }
    };
    
    // Go back one step
    const handleBack = () => {
        if (step === 'configure') {
            setStep('drawings');
            setSelectedDrawing(null);
        } else if (step === 'drawings') {
            setStep('disciplines');
            setSelectedDiscipline(null);
            setDrawings([]);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {step !== 'disciplines' && (
                            <button
                                onClick={handleBack}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                                Configure: {link.label}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {step === 'disciplines' && 'Select a discipline folder'}
                                {step === 'drawings' && `${selectedDiscipline?.name} - Select a drawing`}
                                {step === 'configure' && `${selectedDrawing?.name} - Set page number`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-500">Loading...</span>
                        </div>
                    ) : step === 'disciplines' ? (
                        /* Discipline Tiles */
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {disciplines.map(discipline => (
                                <button
                                    key={discipline.id}
                                    onClick={() => handleSelectDiscipline(discipline)}
                                    className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg hover:border-amber-400 hover:bg-amber-100 transition-all text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center">
                                            <span className="icon-folder w-5 h-5 text-amber-700"></span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 text-sm truncate">{discipline.name}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                            {disciplines.length === 0 && (
                                <div className="col-span-full text-center py-8 text-gray-500">
                                    No discipline folders found
                                </div>
                            )}
                        </div>
                    ) : step === 'drawings' ? (
                        /* Drawing Tiles */
                        <div className="space-y-2">
                            {drawings.map(drawing => (
                                <button
                                    key={drawing.id}
                                    onClick={() => handleSelectDrawing(drawing)}
                                    className="w-full p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left flex items-center gap-3"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800 truncate">{drawing.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {drawing.versions?.length || 0} version(s)
                                        </p>
                                    </div>
                                </button>
                            ))}
                            {drawings.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No drawings in this folder</p>
                                    <p className="text-sm mt-1">Upload drawings to this discipline first</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Configure Page Number */
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="font-medium text-blue-800">{selectedDrawing?.name}</p>
                                <p className="text-sm text-blue-600 mt-1">from {selectedDiscipline?.name}</p>
                                {/* Preview link to browse the PDF */}
                                <button
                                    onClick={async () => {
                                        const latestVersion = selectedDrawing.versions?.sort((a, b) => 
                                            new Date(b.uploaded_at) - new Date(a.uploaded_at)
                                        )[0];
                                        if (latestVersion?.sharepoint_file_id && window.MODA_SHAREPOINT?.getPreviewUrl) {
                                            const url = await window.MODA_SHAREPOINT.getPreviewUrl(latestVersion.sharepoint_file_id);
                                            window.open(url, '_blank');
                                        } else if (latestVersion?.file_url) {
                                            window.open(latestVersion.file_url, '_blank');
                                        }
                                    }}
                                    className="mt-2 text-sm text-blue-700 hover:text-blue-900 underline flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    Open PDF to find page numbers
                                </button>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Page Number(s) *
                                </label>
                                <input
                                    type="text"
                                    value={pageNumber}
                                    onChange={(e) => setPageNumber(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., 5 or 3,7,12 or 1-5"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Single page (5), multiple pages (3,7,12), or range (1-5)
                                </p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description (optional)
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Additional notes about this link"
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    {step === 'configure' && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !selectedDrawing}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[140px]"
                        >
                            {isSaving ? (
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {extractionProgress?.status === 'downloading' && 'Downloading...'}
                                    {extractionProgress?.status === 'extracting' && 'Extracting...'}
                                    {extractionProgress?.status === 'uploading' && 'Uploading...'}
                                    {(!extractionProgress?.status || extractionProgress?.status === 'starting') && 'Saving...'}
                                </span>
                            ) : 'Save Link'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Modal for adding a new custom link
 * Uses folder/tile navigation to browse disciplines and select drawings
 */
const AddLinkModal = ({ projectId, onAdd, onClose }) => {
    const { useState, useEffect } = React;
    
    // Navigation state: 'label' -> 'disciplines' -> 'drawings' -> 'configure'
    const [step, setStep] = useState('label');
    const [label, setLabel] = useState('');
    const [disciplines, setDisciplines] = useState([]);
    const [selectedDiscipline, setSelectedDiscipline] = useState(null);
    const [drawings, setDrawings] = useState([]);
    const [selectedDrawing, setSelectedDrawing] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Load disciplines when moving to that step
    const loadDisciplines = async () => {
        if (!projectId || !window.MODA_SUPABASE_DRAWINGS) return;
        
        setIsLoading(true);
        try {
            const folders = await window.MODA_SUPABASE_DRAWINGS.folders.getByProject(projectId);
            const permitCategory = folders.find(f => 
                f.folder_type === 'category' && 
                (f.name === 'Permit Drawings' || f.name.toLowerCase().includes('permit'))
            );
            
            if (permitCategory) {
                const permitDisciplines = folders.filter(f => 
                    f.folder_type === 'discipline' && f.parent_id === permitCategory.id
                );
                setDisciplines(permitDisciplines);
            } else {
                const defaultDisciplines = [
                    { id: 'modular-architecture', name: 'Modular Architect Submittal', isDefault: true },
                    { id: 'structural-plans', name: 'Structural Plans Submittal', isDefault: true },
                    { id: 'mechanical', name: 'Mechanical Submittal', isDefault: true },
                    { id: 'electrical', name: 'Electrical Submittal', isDefault: true },
                    { id: 'fire-alarm', name: 'Fire Alarm Data Submittal', isDefault: true },
                    { id: 'title-24', name: 'Title 24', isDefault: true },
                ];
                setDisciplines(defaultDisciplines);
            }
        } catch (error) {
            console.error('[AddLinkModal] Error loading disciplines:', error);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handle proceeding from label step
    const handleLabelNext = () => {
        if (!label.trim()) {
            alert('Please enter a label for the link');
            return;
        }
        setStep('disciplines');
        loadDisciplines();
    };
    
    // Load drawings when a discipline is selected
    const handleSelectDiscipline = async (discipline) => {
        setSelectedDiscipline(discipline);
        setIsLoading(true);
        
        try {
            // Fetch ALL drawings for this project, then filter by discipline
            const allDrawings = await window.MODA_SUPABASE_DRAWINGS.drawings.getByProject(projectId);
            
            const disciplineId = discipline.id || '';
            const disciplineName = discipline.name || '';
            
            const filteredDrawings = allDrawings.filter(d => {
                const drawingDiscipline = (d.discipline || '').toLowerCase();
                return drawingDiscipline === disciplineId.toLowerCase() ||
                       drawingDiscipline === disciplineName.toLowerCase() ||
                       disciplineName.toLowerCase().includes(drawingDiscipline) ||
                       drawingDiscipline.includes(disciplineName.toLowerCase().split(' ')[0]);
            });
            
            setDrawings(filteredDrawings);
            setStep('drawings');
        } catch (error) {
            console.error('[AddLinkModal] Error loading drawings:', error);
            setDrawings([]);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handle selecting a drawing
    const handleSelectDrawing = (drawing) => {
        setSelectedDrawing(drawing);
        setStep('configure');
    };
    
    // Extraction progress state
    const [extractionProgress, setExtractionProgress] = useState(null);
    
    // Handle add with extraction progress
    const handleAdd = async () => {
        if (!selectedDrawing) return;
        
        const latestVersion = selectedDrawing.versions?.sort((a, b) => 
            new Date(b.uploaded_at) - new Date(a.uploaded_at)
        )[0];
        
        setIsSaving(true);
        setExtractionProgress({ status: 'starting', percent: 0 });
        
        try {
            await onAdd({
                label: label.trim(),
                packagePath: latestVersion?.storage_path || '',
                sharepointFileId: latestVersion?.sharepoint_file_id || null,
                pageNumber: pageNumber || '1',
                description: description || null,
                isPreset: false
            }, (progress) => {
                setExtractionProgress(progress);
            });
        } finally {
            setIsSaving(false);
            setExtractionProgress(null);
        }
    };
    
    // Go back one step
    const handleBack = () => {
        if (step === 'configure') {
            setStep('drawings');
            setSelectedDrawing(null);
        } else if (step === 'drawings') {
            setStep('disciplines');
            setSelectedDiscipline(null);
            setDrawings([]);
        } else if (step === 'disciplines') {
            setStep('label');
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {step !== 'label' && (
                            <button
                                onClick={handleBack}
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800">
                                Add Custom Link
                            </h3>
                            <p className="text-sm text-gray-500">
                                {step === 'label' && 'Enter a label for the link'}
                                {step === 'disciplines' && 'Select a discipline folder'}
                                {step === 'drawings' && `${selectedDiscipline?.name} - Select a drawing`}
                                {step === 'configure' && `${selectedDrawing?.name} - Set page number`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-500">Loading...</span>
                        </div>
                    ) : step === 'label' ? (
                        /* Label Input */
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Link Label *
                                </label>
                                <input
                                    type="text"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., Foundation Plan, Roof Framing"
                                    autoFocus
                                />
                            </div>
                        </div>
                    ) : step === 'disciplines' ? (
                        /* Discipline Tiles */
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {disciplines.map(discipline => (
                                <button
                                    key={discipline.id}
                                    onClick={() => handleSelectDiscipline(discipline)}
                                    className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg hover:border-amber-400 hover:bg-amber-100 transition-all text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center">
                                            <span className="icon-folder w-5 h-5 text-amber-700"></span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800 text-sm truncate">{discipline.name}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : step === 'drawings' ? (
                        /* Drawing Tiles */
                        <div className="space-y-2">
                            {drawings.map(drawing => (
                                <button
                                    key={drawing.id}
                                    onClick={() => handleSelectDrawing(drawing)}
                                    className="w-full p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left flex items-center gap-3"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800 truncate">{drawing.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {drawing.versions?.length || 0} version(s)
                                        </p>
                                    </div>
                                </button>
                            ))}
                            {drawings.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No drawings in this folder</p>
                                    <p className="text-sm mt-1">Upload drawings to this discipline first</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Configure Page Number */
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-gray-600">Creating link:</p>
                                <p className="font-semibold text-blue-800">{label}</p>
                                <p className="text-sm text-blue-600 mt-1">{selectedDrawing?.name}</p>
                                {/* Preview link to browse the PDF */}
                                <button
                                    onClick={async () => {
                                        const latestVersion = selectedDrawing.versions?.sort((a, b) => 
                                            new Date(b.uploaded_at) - new Date(a.uploaded_at)
                                        )[0];
                                        if (latestVersion?.sharepoint_file_id && window.MODA_SHAREPOINT?.getPreviewUrl) {
                                            const url = await window.MODA_SHAREPOINT.getPreviewUrl(latestVersion.sharepoint_file_id);
                                            window.open(url, '_blank');
                                        } else if (latestVersion?.file_url) {
                                            window.open(latestVersion.file_url, '_blank');
                                        }
                                    }}
                                    className="mt-2 text-sm text-blue-700 hover:text-blue-900 underline flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    Open PDF to find page numbers
                                </button>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Page Number(s) *
                                </label>
                                <input
                                    type="text"
                                    value={pageNumber}
                                    onChange={(e) => setPageNumber(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., 5 or 3,7,12 or 1-5"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Single page (5), multiple pages (3,7,12), or range (1-5)
                                </p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description (optional)
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Additional notes"
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    {step === 'label' && (
                        <button
                            onClick={handleLabelNext}
                            disabled={!label.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    )}
                    {step === 'configure' && (
                        <button
                            onClick={handleAdd}
                            disabled={isSaving || !selectedDrawing}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[140px]"
                        >
                            {isSaving ? (
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {extractionProgress?.status === 'downloading' && 'Downloading...'}
                                    {extractionProgress?.status === 'extracting' && 'Extracting...'}
                                    {extractionProgress?.status === 'uploading' && 'Uploading...'}
                                    {(!extractionProgress?.status || extractionProgress?.status === 'starting') && 'Adding...'}
                                </span>
                            ) : 'Add Link'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// Export for use in other components
window.DrawingLinksPanel = DrawingLinksPanel;
