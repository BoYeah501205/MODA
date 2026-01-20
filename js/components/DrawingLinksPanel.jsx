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
    
    // Handle saving link configuration
    const handleSaveLink = useCallback(async (linkId, updates) => {
        try {
            await window.MODA_DRAWING_LINKS.update(linkId, updates);
            // Refresh links
            const data = await window.MODA_DRAWING_LINKS.getByProject(projectId);
            setLinks(data);
            setShowConfigureModal(null);
        } catch (error) {
            console.error('[DrawingLinksPanel] Error saving link:', error);
            alert('Error saving link: ' + error.message);
        }
    }, [projectId]);
    
    // Handle adding a new custom link
    const handleAddLink = useCallback(async (linkData) => {
        try {
            await window.MODA_DRAWING_LINKS.create({
                projectId,
                ...linkData,
                createdBy: auth?.currentUser?.name || 'Unknown'
            });
            // Refresh links
            const data = await window.MODA_DRAWING_LINKS.getByProject(projectId);
            setLinks(data);
            setShowAddModal(false);
        } catch (error) {
            console.error('[DrawingLinksPanel] Error adding link:', error);
            alert('Error adding link: ' + error.message);
        }
    }, [projectId, auth]);
    
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
                    drawings={drawings}
                    onSave={handleSaveLink}
                    onClose={() => setShowConfigureModal(null)}
                />
            )}
            
            {/* Add Link Modal */}
            {showAddModal && (
                <AddLinkModal
                    drawings={drawings}
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
const LinkButton = ({ link, isConfigured, canEdit, onClick, onConfigure, onDelete, isCustom }) => {
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
                            Page {link.page_number}
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
 */
const ConfigureLinkModal = ({ link, drawings, onSave, onClose }) => {
    const { useState, useMemo } = React;
    
    const [selectedDrawing, setSelectedDrawing] = useState(
        link.sharepoint_file_id ? drawings.find(d => {
            const latestVersion = d.versions?.sort((a, b) => 
                new Date(b.uploaded_at) - new Date(a.uploaded_at)
            )[0];
            return latestVersion?.sharepoint_file_id === link.sharepoint_file_id;
        })?.id : ''
    );
    const [pageNumber, setPageNumber] = useState(link.page_number || 1);
    const [description, setDescription] = useState(link.description || '');
    const [isSaving, setIsSaving] = useState(false);
    
    // Get permit drawings only (filter by discipline containing 'permit' or in permit category)
    const permitDrawings = useMemo(() => {
        return drawings.filter(d => {
            const discipline = (d.discipline || '').toLowerCase();
            return !discipline.includes('shop') && !discipline.includes('module');
        });
    }, [drawings]);
    
    const handleSave = async () => {
        if (!selectedDrawing) {
            alert('Please select a drawing package');
            return;
        }
        
        const drawing = drawings.find(d => d.id === selectedDrawing);
        if (!drawing) return;
        
        // Get the latest version's SharePoint file ID
        const latestVersion = drawing.versions?.sort((a, b) => 
            new Date(b.uploaded_at) - new Date(a.uploaded_at)
        )[0];
        
        setIsSaving(true);
        try {
            await onSave(link.id, {
                packagePath: latestVersion?.storage_path || '',
                sharepointFileId: latestVersion?.sharepoint_file_id || null,
                pageNumber: parseInt(pageNumber) || 1,
                description: description || null
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">
                        Configure: {link.label}
                    </h3>
                </div>
                
                <div className="p-6 space-y-4">
                    {/* Drawing Package Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Drawing Package
                        </label>
                        <select
                            value={selectedDrawing}
                            onChange={(e) => setSelectedDrawing(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select a drawing package...</option>
                            {permitDrawings.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                        {permitDrawings.length === 0 && (
                            <p className="text-xs text-amber-600 mt-1">
                                No permit drawings uploaded yet. Upload drawings first.
                            </p>
                        )}
                    </div>
                    
                    {/* Page Number */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Page Number
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={pageNumber}
                            onChange={(e) => setPageNumber(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter page number"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            The specific page within the PDF to link to
                        </p>
                    </div>
                    
                    {/* Description (optional) */}
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
                
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !selectedDrawing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Modal for adding a new custom link
 */
const AddLinkModal = ({ drawings, onAdd, onClose }) => {
    const { useState, useMemo } = React;
    
    const [label, setLabel] = useState('');
    const [selectedDrawing, setSelectedDrawing] = useState('');
    const [pageNumber, setPageNumber] = useState(1);
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // Get permit drawings only
    const permitDrawings = useMemo(() => {
        return drawings.filter(d => {
            const discipline = (d.discipline || '').toLowerCase();
            return !discipline.includes('shop') && !discipline.includes('module');
        });
    }, [drawings]);
    
    const handleAdd = async () => {
        if (!label.trim()) {
            alert('Please enter a label for the link');
            return;
        }
        if (!selectedDrawing) {
            alert('Please select a drawing package');
            return;
        }
        
        const drawing = drawings.find(d => d.id === selectedDrawing);
        if (!drawing) return;
        
        // Get the latest version's SharePoint file ID
        const latestVersion = drawing.versions?.sort((a, b) => 
            new Date(b.uploaded_at) - new Date(a.uploaded_at)
        )[0];
        
        setIsSaving(true);
        try {
            await onAdd({
                label: label.trim(),
                packagePath: latestVersion?.storage_path || '',
                sharepointFileId: latestVersion?.sharepoint_file_id || null,
                pageNumber: parseInt(pageNumber) || 1,
                description: description || null,
                isPreset: false
            });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">
                        Add Custom Link
                    </h3>
                </div>
                
                <div className="p-6 space-y-4">
                    {/* Link Label */}
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
                        />
                    </div>
                    
                    {/* Drawing Package Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Drawing Package *
                        </label>
                        <select
                            value={selectedDrawing}
                            onChange={(e) => setSelectedDrawing(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select a drawing package...</option>
                            {permitDrawings.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Page Number */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Page Number
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={pageNumber}
                            onChange={(e) => setPageNumber(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter page number"
                        />
                    </div>
                    
                    {/* Description (optional) */}
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
                
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAdd}
                        disabled={isSaving || !label.trim() || !selectedDrawing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSaving ? 'Adding...' : 'Add Link'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Export for use in other components
window.DrawingLinksPanel = DrawingLinksPanel;
