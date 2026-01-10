// ============================================================================
// MODA DRAWINGS MODULE
// Document management for project drawings with version control
// Uses Supabase for storage with localStorage fallback
// ============================================================================

const { useState, useEffect, useCallback, useMemo } = React;

const DrawingsModule = ({ projects = [], auth }) => {
    
    // Navigation state
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedDiscipline, setSelectedDiscipline] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Drawing files state - flat array for current view
    const [currentDrawings, setCurrentDrawings] = useState([]);
    const [drawingCounts, setDrawingCounts] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [uploadProgress, setUploadProgress] = useState(null); // { current, total, fileName, percent, status }
    
    // Modal states
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [showFolderModal, setShowFolderModal] = useState(null); // { mode: 'add'|'edit', type: 'category'|'discipline', folder?: existing }
    const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState(null);
    
    // Custom folders state (loaded from Supabase)
    const [customCategories, setCustomCategories] = useState([]);
    const [customDisciplines, setCustomDisciplines] = useState({});
    const [foldersLoading, setFoldersLoading] = useState(false);
    
    // Check if Supabase drawings module is available
    const isSupabaseAvailable = () => window.MODA_SUPABASE_DRAWINGS?.isAvailable?.();
    
    // Check if user can manage folders (Admin role only)
    const canManageFolders = useMemo(() => {
        const role = auth?.currentUser?.dashboardRole;
        return role === 'admin' || role === 'Admin';
    }, [auth]);
    
    // Available folder colors
    const FOLDER_COLORS = [
        { id: 'gray', label: 'Gray', value: 'bg-gray-100 border-gray-400' },
        { id: 'red', label: 'Red', value: 'bg-red-100 border-red-400' },
        { id: 'orange', label: 'Orange', value: 'bg-orange-100 border-orange-400' },
        { id: 'amber', label: 'Amber', value: 'bg-amber-100 border-amber-400' },
        { id: 'yellow', label: 'Yellow', value: 'bg-yellow-100 border-yellow-400' },
        { id: 'lime', label: 'Lime', value: 'bg-lime-100 border-lime-400' },
        { id: 'green', label: 'Green', value: 'bg-green-100 border-green-400' },
        { id: 'teal', label: 'Teal', value: 'bg-teal-100 border-teal-400' },
        { id: 'cyan', label: 'Cyan', value: 'bg-cyan-100 border-cyan-400' },
        { id: 'blue', label: 'Blue', value: 'bg-blue-100 border-blue-400' },
        { id: 'indigo', label: 'Indigo', value: 'bg-indigo-100 border-indigo-400' },
        { id: 'purple', label: 'Purple', value: 'bg-purple-100 border-purple-400' },
        { id: 'pink', label: 'Pink', value: 'bg-pink-100 border-pink-400' },
        { id: 'slate', label: 'Slate', value: 'bg-slate-100 border-slate-400' }
    ];
    
    // Drawing Categories (top-level folders)
    const DRAWING_CATEGORIES = [
        { id: 'permit-drawings', name: 'Permit Drawings', icon: 'icon-folder', color: 'bg-blue-100 border-blue-500', description: 'Official permit and submittal drawings' },
        { id: 'shop-drawings', name: 'Shop Drawings', icon: 'icon-folder', color: 'bg-amber-100 border-amber-500', description: 'Fabrication and shop drawings' }
    ];
    
    // Disciplines within Permit Drawings category
    const PERMIT_DISCIPLINES = [
        { id: 'aor-reference', name: 'AOR Reference Submittal', icon: 'icon-folder', color: 'bg-amber-100 border-amber-400' },
        { id: 'architectural-general', name: 'Architectural General Submittal', icon: 'icon-folder', color: 'bg-blue-100 border-blue-400' },
        { id: 'assembly-book', name: 'Assembly Book Submittal', icon: 'icon-folder', color: 'bg-purple-100 border-purple-400' },
        { id: 'electrical', name: 'Electrical Submittal', icon: 'icon-folder', color: 'bg-yellow-100 border-yellow-400' },
        { id: 'fire-alarm-data', name: 'Fire Alarm Data Submittal', icon: 'icon-folder', color: 'bg-red-100 border-red-400' },
        { id: 'fire-alarm', name: 'Fire Alarm Submittal', icon: 'icon-folder', color: 'bg-red-100 border-red-400' },
        { id: 'fire-sprinkler', name: 'Fire Sprinkler Submittal', icon: 'icon-folder', color: 'bg-orange-100 border-orange-400' },
        { id: 'mechanical', name: 'Mechanical Submittal', icon: 'icon-folder', color: 'bg-cyan-100 border-cyan-400' },
        { id: 'modular-architect', name: 'Modular Architect Submittal', icon: 'icon-folder', color: 'bg-indigo-100 border-indigo-400' },
        { id: 'plumbing', name: 'Plumbing Submittal', icon: 'icon-folder', color: 'bg-teal-100 border-teal-400' },
        { id: 'sprinkler-plans', name: 'Sprinkler Submittal Plans', icon: 'icon-folder', color: 'bg-orange-100 border-orange-400' },
        { id: 'structural-documents', name: 'Structural Documents', icon: 'icon-folder', color: 'bg-gray-100 border-gray-400' },
        { id: 'structural-plans', name: 'Structural Plans Submittal', icon: 'icon-folder', color: 'bg-slate-100 border-slate-400' },
        { id: 'title-24', name: 'Title 24', icon: 'icon-folder', color: 'bg-green-100 border-green-400' }
    ];
    
    // Disciplines within Shop Drawings category
    const SHOP_DISCIPLINES = [
        { id: 'shop-module-packages', name: 'Module Packages', icon: 'icon-folder', color: 'bg-emerald-100 border-emerald-400' },
        { id: 'shop-soffits', name: 'Soffits', icon: 'icon-folder', color: 'bg-slate-100 border-slate-400' },
        { id: 'shop-reference', name: 'Reference Sheets', icon: 'icon-folder', color: 'bg-blue-100 border-blue-400' },
        { id: 'shop-prototype', name: 'Prototype Drawings', icon: 'icon-folder', color: 'bg-purple-100 border-purple-400' },
        { id: 'shop-interior-walls', name: 'Interior Walls', icon: 'icon-folder', color: 'bg-cyan-100 border-cyan-400' },
        { id: 'shop-end-walls', name: 'End Walls', icon: 'icon-folder', color: 'bg-teal-100 border-teal-400' },
        { id: 'shop-corridor-walls', name: 'Corridor Walls', icon: 'icon-folder', color: 'bg-amber-100 border-amber-400' },
        { id: 'shop-3hr-walls', name: '3HR Walls', icon: 'icon-folder', color: 'bg-red-100 border-red-400' }
    ];
    
    // Get disciplines for current category
    const getCurrentDisciplines = () => {
        if (selectedCategory === 'permit-drawings') return PERMIT_DISCIPLINES;
        if (selectedCategory === 'shop-drawings') return SHOP_DISCIPLINES;
        return [];
    };
    
    // Legacy: All disciplines combined for backwards compatibility
    const DISCIPLINES = [...PERMIT_DISCIPLINES, ...SHOP_DISCIPLINES];
    
    // Storage key for localStorage fallback
    const STORAGE_KEY = 'moda_drawings_data';
    
    // Load drawing counts when project is selected
    useEffect(() => {
        const loadDrawingCounts = async () => {
            if (!selectedProject) {
                setDrawingCounts({});
                return;
            }
            
            try {
                if (isSupabaseAvailable()) {
                    const counts = await window.MODA_SUPABASE_DRAWINGS.drawings.getCountsByProject(selectedProject.id);
                    const countsMap = {};
                    counts.forEach(c => { countsMap[c.discipline] = c.count; });
                    setDrawingCounts(countsMap);
                } else {
                    // Fallback to localStorage
                    const stored = localStorage.getItem(STORAGE_KEY);
                    if (stored) {
                        const data = JSON.parse(stored);
                        const projectDrawings = data[selectedProject.id] || {};
                        const countsMap = {};
                        Object.keys(projectDrawings).forEach(discipline => {
                            countsMap[discipline] = (projectDrawings[discipline] || []).length;
                        });
                        setDrawingCounts(countsMap);
                    }
                }
            } catch (error) {
                console.error('[Drawings] Error loading counts:', error);
            }
        };
        
        loadDrawingCounts();
    }, [selectedProject]);
    
    // Load drawings when discipline is selected
    useEffect(() => {
        const loadDrawings = async () => {
            if (!selectedProject || !selectedDiscipline) {
                setCurrentDrawings([]);
                return;
            }
            
            setIsLoading(true);
            try {
                if (isSupabaseAvailable()) {
                    const drawings = await window.MODA_SUPABASE_DRAWINGS.drawings.getByProjectAndDiscipline(
                        selectedProject.id, 
                        selectedDiscipline
                    );
                    setCurrentDrawings(drawings);
                } else {
                    // Fallback to localStorage
                    const stored = localStorage.getItem(STORAGE_KEY);
                    if (stored) {
                        const data = JSON.parse(stored);
                        const projectDrawings = data[selectedProject.id] || {};
                        setCurrentDrawings(projectDrawings[selectedDiscipline] || []);
                    } else {
                        setCurrentDrawings([]);
                    }
                }
            } catch (error) {
                console.error('[Drawings] Error loading drawings:', error);
                setCurrentDrawings([]);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadDrawings();
    }, [selectedProject, selectedDiscipline]);
    
    // Load custom folders when project is selected
    useEffect(() => {
        const loadCustomFolders = async () => {
            if (!selectedProject) {
                setCustomCategories([]);
                setCustomDisciplines({});
                return;
            }
            
            setFoldersLoading(true);
            try {
                if (isSupabaseAvailable() && window.MODA_SUPABASE_DRAWINGS.folders) {
                    // Try to load custom folders from Supabase
                    let folders = await window.MODA_SUPABASE_DRAWINGS.folders.getByProject(selectedProject.id);
                    
                    // If no folders exist, initialize defaults
                    if (folders.length === 0) {
                        folders = await window.MODA_SUPABASE_DRAWINGS.folders.initializeDefaults(
                            selectedProject.id,
                            auth?.currentUser?.name || 'System'
                        );
                    }
                    
                    // Separate categories and disciplines
                    const categories = folders.filter(f => f.folder_type === 'category');
                    const disciplines = {};
                    
                    categories.forEach(cat => {
                        disciplines[cat.id] = folders.filter(f => 
                            f.folder_type === 'discipline' && f.parent_id === cat.id
                        );
                    });
                    
                    setCustomCategories(categories);
                    setCustomDisciplines(disciplines);
                }
            } catch (error) {
                console.error('[Drawings] Error loading custom folders:', error);
                // Fall back to static folders on error
            } finally {
                setFoldersLoading(false);
            }
        };
        
        loadCustomFolders();
    }, [selectedProject, auth]);
    
    // Get categories - use custom if available, otherwise static
    const getCategories = useCallback(() => {
        if (customCategories.length > 0) {
            return customCategories.map(c => ({
                id: c.id,
                name: c.name,
                color: c.color,
                description: c.is_default ? 'Default category' : 'Custom category',
                isCustom: true
            }));
        }
        return DRAWING_CATEGORIES;
    }, [customCategories]);
    
    // Get disciplines for a category - use custom if available
    const getDisciplinesForCategory = useCallback((categoryId) => {
        // Check if we have custom disciplines for this category
        if (customDisciplines[categoryId] && customDisciplines[categoryId].length > 0) {
            return customDisciplines[categoryId].map(d => ({
                id: d.id,
                name: d.name,
                color: d.color,
                isCustom: true
            }));
        }
        // Fall back to static disciplines based on category name
        const category = customCategories.find(c => c.id === categoryId);
        if (category?.name === 'Permit Drawings' || categoryId === 'permit-drawings') {
            return PERMIT_DISCIPLINES;
        }
        if (category?.name === 'Shop Drawings' || categoryId === 'shop-drawings') {
            return SHOP_DISCIPLINES;
        }
        return [];
    }, [customCategories, customDisciplines]);
    
    // Handle folder create/update
    const handleSaveFolder = useCallback(async (folderData) => {
        if (!selectedProject || !canManageFolders) return;
        
        try {
            if (isSupabaseAvailable() && window.MODA_SUPABASE_DRAWINGS.folders) {
                if (folderData.id) {
                    // Update existing folder
                    await window.MODA_SUPABASE_DRAWINGS.folders.update(folderData.id, {
                        name: folderData.name,
                        color: folderData.color
                    });
                } else {
                    // Create new folder
                    await window.MODA_SUPABASE_DRAWINGS.folders.create({
                        projectId: selectedProject.id,
                        parentId: folderData.parentId || null,
                        name: folderData.name,
                        folderType: folderData.folderType,
                        color: folderData.color,
                        sortOrder: folderData.sortOrder || 999,
                        createdBy: auth?.currentUser?.name || 'Unknown'
                    });
                }
                
                // Reload folders
                const folders = await window.MODA_SUPABASE_DRAWINGS.folders.getByProject(selectedProject.id);
                const categories = folders.filter(f => f.folder_type === 'category');
                const disciplines = {};
                categories.forEach(cat => {
                    disciplines[cat.id] = folders.filter(f => 
                        f.folder_type === 'discipline' && f.parent_id === cat.id
                    );
                });
                setCustomCategories(categories);
                setCustomDisciplines(disciplines);
            }
        } catch (error) {
            console.error('[Drawings] Error saving folder:', error);
            alert('Error saving folder: ' + error.message);
        } finally {
            setShowFolderModal(null);
        }
    }, [selectedProject, auth, canManageFolders]);
    
    // Handle folder delete
    const handleDeleteFolder = useCallback(async (folderId) => {
        if (!selectedProject || !canManageFolders) return;
        
        try {
            if (isSupabaseAvailable() && window.MODA_SUPABASE_DRAWINGS.folders) {
                await window.MODA_SUPABASE_DRAWINGS.folders.delete(folderId);
                
                // Reload folders
                const folders = await window.MODA_SUPABASE_DRAWINGS.folders.getByProject(selectedProject.id);
                const categories = folders.filter(f => f.folder_type === 'category');
                const disciplines = {};
                categories.forEach(cat => {
                    disciplines[cat.id] = folders.filter(f => 
                        f.folder_type === 'discipline' && f.parent_id === cat.id
                    );
                });
                setCustomCategories(categories);
                setCustomDisciplines(disciplines);
            }
        } catch (error) {
            console.error('[Drawings] Error deleting folder:', error);
            alert('Error deleting folder: ' + error.message);
        } finally {
            setShowDeleteFolderConfirm(null);
        }
    }, [selectedProject, canManageFolders]);
    
    // Handle reset folders to defaults
    const handleResetFolders = useCallback(async () => {
        if (!selectedProject || !canManageFolders) return;
        
        if (!confirm('Reset all folders to defaults? This will delete any custom folders you have created.')) {
            return;
        }
        
        setFoldersLoading(true);
        try {
            if (isSupabaseAvailable() && window.MODA_SUPABASE_DRAWINGS.folders) {
                const folders = await window.MODA_SUPABASE_DRAWINGS.folders.resetToDefaults(
                    selectedProject.id,
                    auth?.currentUser?.name || 'System'
                );
                
                // Separate categories and disciplines
                const categories = folders.filter(f => f.folder_type === 'category');
                const disciplines = {};
                categories.forEach(cat => {
                    disciplines[cat.id] = folders.filter(f => 
                        f.folder_type === 'discipline' && f.parent_id === cat.id
                    );
                });
                
                setCustomCategories(categories);
                setCustomDisciplines(disciplines);
                
                // Reset navigation to categories level
                setSelectedCategory(null);
                setSelectedDiscipline(null);
            }
        } catch (error) {
            console.error('[Drawings] Error resetting folders:', error);
            alert('Error resetting folders: ' + error.message);
        } finally {
            setFoldersLoading(false);
        }
    }, [selectedProject, auth, canManageFolders]);
    
    // Get drawing count for a discipline
    const getDrawingCount = useCallback((disciplineId) => {
        return drawingCounts[disciplineId] || 0;
    }, [drawingCounts]);
    
    // Get latest version of a drawing
    const getLatestVersion = useCallback((drawing) => {
        if (!drawing.versions || drawing.versions.length === 0) return null;
        // Sort by uploaded_at descending and return first
        const sorted = [...drawing.versions].sort((a, b) => 
            new Date(b.uploaded_at || b.uploadedAt) - new Date(a.uploaded_at || a.uploadedAt)
        );
        return sorted[0];
    }, []);
    
    // Handle file upload - accepts optional targetDiscipline for uploads from category level
    const handleFileUpload = useCallback(async (files, metadata = {}, targetDiscipline = null) => {
        const disciplineToUse = targetDiscipline || selectedDiscipline;
        if (!selectedProject || !disciplineToUse || !files.length) return;
        
        setUploadProgress({ current: 0, total: files.length });
        
        // Get category and discipline names for SharePoint folder path
        const categoryObj = getCategories().find(c => c.id === selectedCategory);
        const categoryName = categoryObj?.name || 'Shop Drawings';
        
        // Get discipline name - check custom disciplines first, then static
        let disciplineName = disciplineToUse;
        const disciplines = getDisciplinesForCategory(selectedCategory);
        const disciplineObj = disciplines.find(d => d.id === disciplineToUse || d.name === disciplineToUse);
        if (disciplineObj) disciplineName = disciplineObj.name;
        
        try {
            if (isSupabaseAvailable()) {
                // Upload to Supabase (which now routes to SharePoint)
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    setUploadProgress({ current: i + 1, total: files.length, fileName: file.name });
                    
                    // Create drawing record
                    const drawing = await window.MODA_SUPABASE_DRAWINGS.drawings.create({
                        projectId: selectedProject.id,
                        discipline: disciplineToUse,
                        name: file.name,
                        description: metadata.description || '',
                        createdBy: auth?.currentUser?.name || 'Unknown'
                    });
                    
                    // Upload first version (now routes to SharePoint if available)
                    await window.MODA_SUPABASE_DRAWINGS.versions.create(drawing.id, file, {
                        version: '1.0',
                        notes: metadata.notes || 'Initial upload',
                        uploadedBy: auth?.currentUser?.name || 'Unknown',
                        // Pass context for SharePoint folder structure
                        projectName: selectedProject.name,
                        categoryName: categoryName,
                        disciplineName: disciplineName,
                        // Progress callback for upload progress bar
                        onProgress: (progress) => {
                            setUploadProgress(prev => ({
                                ...prev,
                                percent: progress.percent || 0,
                                status: progress.status || 'uploading',
                                uploaded: progress.uploaded,
                                totalBytes: progress.total,
                                speed: progress.speed
                            }));
                        }
                    });
                }
                
                // Reload drawings
                const drawings = await window.MODA_SUPABASE_DRAWINGS.drawings.getByProjectAndDiscipline(
                    selectedProject.id, 
                    selectedDiscipline
                );
                setCurrentDrawings(drawings);
                
                // Update counts
                const counts = await window.MODA_SUPABASE_DRAWINGS.drawings.getCountsByProject(selectedProject.id);
                const countsMap = {};
                counts.forEach(c => { countsMap[c.discipline] = c.count; });
                setDrawingCounts(countsMap);
            } else {
                // Fallback to localStorage
                const stored = localStorage.getItem(STORAGE_KEY);
                const data = stored ? JSON.parse(stored) : {};
                
                if (!data[selectedProject.id]) data[selectedProject.id] = {};
                if (!data[selectedProject.id][selectedDiscipline]) data[selectedProject.id][selectedDiscipline] = [];
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    setUploadProgress({ current: i + 1, total: files.length, fileName: file.name });
                    
                    const fileData = {
                        id: `drawing-${Date.now()}-${i}`,
                        name: file.name,
                        description: metadata.description || '',
                        created_by: auth?.currentUser?.name || 'Unknown',
                        created_at: new Date().toISOString(),
                        versions: [{
                            id: `v1-${Date.now()}`,
                            version: '1.0',
                            file_name: file.name,
                            file_size: file.size,
                            file_type: file.type,
                            uploaded_at: new Date().toISOString(),
                            uploaded_by: auth?.currentUser?.name || 'Unknown',
                            notes: metadata.notes || 'Initial upload',
                            file_url: URL.createObjectURL(file)
                        }]
                    };
                    
                    data[selectedProject.id][selectedDiscipline].push(fileData);
                }
                
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                setCurrentDrawings(data[selectedProject.id][selectedDiscipline]);
                
                // Update counts
                const countsMap = {};
                Object.keys(data[selectedProject.id]).forEach(discipline => {
                    countsMap[discipline] = (data[selectedProject.id][discipline] || []).length;
                });
                setDrawingCounts(countsMap);
            }
        } catch (error) {
            console.error('[Drawings] Upload error:', error);
            alert('Error uploading files: ' + error.message);
        } finally {
            setUploadProgress(null);
            setShowUploadModal(false);
        }
    }, [selectedProject, selectedDiscipline, auth]);
    
    // Handle new version upload
    const handleVersionUpload = useCallback(async (drawingId, file, notes) => {
        if (!selectedProject || !selectedDiscipline || !file) return;
        
        // Get category and discipline names for SharePoint folder path
        const categoryObj = getCategories().find(c => c.id === selectedCategory);
        const categoryName = categoryObj?.name || 'Shop Drawings';
        
        let disciplineName = selectedDiscipline;
        const disciplines = getDisciplinesForCategory(selectedCategory);
        const disciplineObj = disciplines.find(d => d.id === selectedDiscipline || d.name === selectedDiscipline);
        if (disciplineObj) disciplineName = disciplineObj.name;
        
        try {
            if (isSupabaseAvailable()) {
                // Get existing versions to calculate next version number
                const versions = await window.MODA_SUPABASE_DRAWINGS.versions.getByDrawing(drawingId);
                const nextVersion = window.MODA_SUPABASE_DRAWINGS.utils.getNextVersion(versions);
                
                // Upload new version (now routes to SharePoint if available)
                await window.MODA_SUPABASE_DRAWINGS.versions.create(drawingId, file, {
                    version: nextVersion,
                    notes: notes || `Version ${nextVersion}`,
                    uploadedBy: auth?.currentUser?.name || 'Unknown',
                    // Pass context for SharePoint folder structure
                    projectName: selectedProject.name,
                    categoryName: categoryName,
                    disciplineName: disciplineName
                });
                
                // Reload drawings to get updated versions
                const drawings = await window.MODA_SUPABASE_DRAWINGS.drawings.getByProjectAndDiscipline(
                    selectedProject.id, 
                    selectedDiscipline
                );
                setCurrentDrawings(drawings);
                
                // Update version history modal with refreshed data
                const updatedDrawing = drawings.find(d => d.id === drawingId);
                if (updatedDrawing) setShowVersionHistory(updatedDrawing);
            } else {
                // Fallback to localStorage
                const stored = localStorage.getItem(STORAGE_KEY);
                const data = stored ? JSON.parse(stored) : {};
                const disciplineDrawings = data[selectedProject.id]?.[selectedDiscipline] || [];
                const drawingIndex = disciplineDrawings.findIndex(d => d.id === drawingId);
                
                if (drawingIndex === -1) return;
                
                const drawing = disciplineDrawings[drawingIndex];
                const currentVersion = drawing.versions.length;
                const newVersionNum = (currentVersion + 1).toFixed(1);
                
                const newVersion = {
                    id: `v${newVersionNum}-${Date.now()}`,
                    version: newVersionNum,
                    file_name: file.name,
                    file_size: file.size,
                    file_type: file.type,
                    uploaded_at: new Date().toISOString(),
                    uploaded_by: auth?.currentUser?.name || 'Unknown',
                    notes: notes || `Version ${newVersionNum}`,
                    file_url: URL.createObjectURL(file)
                };
                
                drawing.versions.push(newVersion);
                drawing.updated_at = new Date().toISOString();
                
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                setCurrentDrawings([...disciplineDrawings]);
                setShowVersionHistory(drawing);
            }
        } catch (error) {
            console.error('[Drawings] Version upload error:', error);
            alert('Error uploading version: ' + error.message);
        }
    }, [selectedProject, selectedDiscipline, auth]);
    
    // Handle delete drawing
    const handleDeleteDrawing = useCallback(async (drawingId) => {
        if (!selectedProject || !selectedDiscipline) return;
        
        try {
            if (isSupabaseAvailable()) {
                await window.MODA_SUPABASE_DRAWINGS.drawings.delete(drawingId);
                
                // Reload drawings
                const drawings = await window.MODA_SUPABASE_DRAWINGS.drawings.getByProjectAndDiscipline(
                    selectedProject.id, 
                    selectedDiscipline
                );
                setCurrentDrawings(drawings);
                
                // Update counts
                const counts = await window.MODA_SUPABASE_DRAWINGS.drawings.getCountsByProject(selectedProject.id);
                const countsMap = {};
                counts.forEach(c => { countsMap[c.discipline] = c.count; });
                setDrawingCounts(countsMap);
            } else {
                // Fallback to localStorage
                const stored = localStorage.getItem(STORAGE_KEY);
                const data = stored ? JSON.parse(stored) : {};
                const disciplineDrawings = data[selectedProject.id]?.[selectedDiscipline] || [];
                data[selectedProject.id][selectedDiscipline] = disciplineDrawings.filter(d => d.id !== drawingId);
                
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                setCurrentDrawings(data[selectedProject.id][selectedDiscipline]);
                
                // Update counts
                const countsMap = {};
                Object.keys(data[selectedProject.id]).forEach(discipline => {
                    countsMap[discipline] = (data[selectedProject.id][discipline] || []).length;
                });
                setDrawingCounts(countsMap);
            }
        } catch (error) {
            console.error('[Drawings] Delete error:', error);
            alert('Error deleting drawing: ' + error.message);
        } finally {
            setShowDeleteConfirm(null);
        }
    }, [selectedProject, selectedDiscipline]);
    
    // Handle view - opens file in new browser tab for viewing (not download)
    const handleView = useCallback(async (version) => {
        try {
            const storagePath = version.storage_path || version.storagePath;
            const sharePointFileId = version.sharepoint_file_id || version.sharepointFileId;
            
            if (isSupabaseAvailable() && storagePath) {
                // Use getViewUrl for SharePoint files to open in browser
                const url = await window.MODA_SUPABASE_DRAWINGS.versions.getViewUrl(storagePath, sharePointFileId);
                if (url) {
                    window.open(url, '_blank');
                } else {
                    throw new Error('Could not generate view URL');
                }
            } else {
                const fileUrl = version.file_url || version.fileUrl;
                if (fileUrl) {
                    window.open(fileUrl, '_blank');
                }
            }
        } catch (error) {
            console.error('[Drawings] View error:', error);
            alert('Error viewing file: ' + error.message);
        }
    }, []);
    
    // Handle download - forces file download
    const handleDownload = useCallback(async (version) => {
        try {
            const storagePath = version.storage_path || version.storagePath;
            const fileName = version.file_name || version.fileName;
            
            if (isSupabaseAvailable() && storagePath) {
                const url = await window.MODA_SUPABASE_DRAWINGS.versions.getDownloadUrl(storagePath);
                if (url) {
                    // Fetch and force download
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = fileName || 'download';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(blobUrl);
                } else {
                    throw new Error('Could not generate download URL');
                }
            } else {
                const fileUrl = version.file_url || version.fileUrl;
                if (fileUrl) {
                    const link = document.createElement('a');
                    link.href = fileUrl;
                    link.download = fileName || 'download';
                    link.click();
                }
            }
        } catch (error) {
            console.error('[Drawings] Download error:', error);
            alert('Error downloading file: ' + error.message);
        }
    }, []);
    
    // Format file size
    const formatFileSize = (bytes) => {
        if (!bytes) return 'Unknown';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };
    
    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    // Filter projects by search
    const filteredProjects = useMemo(() => {
        if (!searchTerm) return projects;
        const term = searchTerm.toLowerCase();
        return projects.filter(p => 
            p.name?.toLowerCase().includes(term) ||
            p.location?.toLowerCase().includes(term)
        );
    }, [projects, searchTerm]);
    
    // Breadcrumb navigation
    const handleBreadcrumbClick = (level) => {
        if (level === 'projects') {
            setSelectedProject(null);
            setSelectedCategory(null);
            setSelectedDiscipline(null);
        } else if (level === 'categories') {
            setSelectedCategory(null);
            setSelectedDiscipline(null);
        } else if (level === 'disciplines') {
            setSelectedDiscipline(null);
        }
    };
    
    // =========================================================================
    // RENDER: Projects Grid View
    // =========================================================================
    const renderProjectsView = () => (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                        Project Drawings
                    </h1>
                    <p className="text-gray-600 mt-1">Select a project to view drawings</p>
                </div>
                
                {/* Search */}
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                    />
                    <span className="icon-search absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50"></span>
                </div>
            </div>
            
            {/* Projects Grid */}
            {filteredProjects.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-lg">
                    <span className="icon-folder w-16 h-16 mx-auto mb-4 opacity-30" style={{ display: 'block' }}></span>
                    <h3 className="text-lg font-medium text-gray-600">No Projects Found</h3>
                    <p className="text-gray-500 mt-1">
                        {searchTerm ? 'Try a different search term' : 'Create a project first to add drawings'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProjects.map(project => (
                        <button
                            key={project.id}
                            onClick={() => setSelectedProject(project)}
                            className="bg-white rounded-lg border-2 border-gray-200 p-6 text-left hover:border-blue-400 hover:shadow-lg transition-all group"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition">
                                    <span className="icon-folder w-6 h-6" style={{ filter: 'invert(50%) sepia(90%) saturate(500%) hue-rotate(5deg)' }}></span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition">
                                        {project.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 truncate mt-1">
                                        {project.location || 'No location'}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
    
    // =========================================================================
    // RENDER: Categories Grid View (Permit Drawings, Shop Drawings)
    // =========================================================================
    const renderCategoriesView = () => (
        <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm mb-6">
                <button 
                    onClick={() => handleBreadcrumbClick('projects')}
                    className="text-blue-600 hover:underline"
                >
                    Projects
                </button>
                <span className="text-gray-400">/</span>
                <span className="text-gray-700 font-medium">{selectedProject?.name}</span>
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                        {selectedProject?.name}
                    </h1>
                    <p className="text-gray-600 mt-1">Select a drawing category</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {canManageFolders && (
                        <button
                            onClick={handleResetFolders}
                            disabled={foldersLoading}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition flex items-center gap-2 disabled:opacity-50"
                            title="Reset folder structure to defaults"
                        >
                            <span className="icon-refresh w-4 h-4"></span>
                            Reset Folders
                        </button>
                    )}
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="px-4 py-2 text-white rounded-lg transition flex items-center gap-2"
                        style={{ backgroundColor: 'var(--autovol-teal)' }}
                    >
                        <span className="icon-upload w-4 h-4"></span>
                        Upload
                    </button>
                    <button
                        onClick={() => handleBreadcrumbClick('projects')}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
                    >
                        <span className="icon-arrow-left w-4 h-4"></span>
                        Back to Projects
                    </button>
                </div>
            </div>
            
            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {getCategories().map(category => (
                    <div key={category.id} className="relative group/card">
                        <button
                            onClick={() => setSelectedCategory(category.id)}
                            className={`w-full bg-white rounded-xl border-2 p-8 text-left hover:shadow-xl transition-all ${category.color}`}
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-xl bg-white/80 flex items-center justify-center flex-shrink-0 shadow-md group-hover/card:shadow-lg transition">
                                    <span className="icon-folder w-8 h-8" style={{ filter: 'invert(50%) sepia(90%) saturate(500%) hue-rotate(5deg)' }}></span>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-xl text-gray-900 group-hover/card:text-blue-600 transition">
                                        {category.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {category.description || 'Drawing category'}
                                    </p>
                                </div>
                            </div>
                        </button>
                        {/* Edit/Delete buttons for admins */}
                        {canManageFolders && category.isCustom && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition flex gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowFolderModal({ mode: 'edit', type: 'category', folder: category }); }}
                                    className="p-2 bg-white rounded-lg shadow hover:bg-blue-50 transition"
                                    title="Edit Category"
                                >
                                    <span className="icon-edit w-4 h-4"></span>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowDeleteFolderConfirm(category); }}
                                    className="p-2 bg-white rounded-lg shadow hover:bg-red-50 transition"
                                    title="Delete Category"
                                >
                                    <span className="icon-trash w-4 h-4"></span>
                                </button>
                            </div>
                        )}
                    </div>
                ))}
                
                {/* Add Category Button - Admin only */}
                {canManageFolders && (
                    <button
                        onClick={() => setShowFolderModal({ mode: 'add', type: 'category' })}
                        className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8 text-left hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-4"
                    >
                        <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center">
                            <span className="text-3xl text-gray-400">+</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-600">Add Category</h3>
                            <p className="text-sm text-gray-400">Create a new folder category</p>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
    
    // =========================================================================
    // RENDER: Disciplines Grid View (within a category)
    // =========================================================================
    const renderDisciplinesView = () => {
        const categories = getCategories();
        const currentCategory = categories.find(c => c.id === selectedCategory);
        const disciplines = getDisciplinesForCategory(selectedCategory);
        
        return (
            <div>
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm mb-6">
                    <button 
                        onClick={() => handleBreadcrumbClick('projects')}
                        className="text-blue-600 hover:underline"
                    >
                        Projects
                    </button>
                    <span className="text-gray-400">/</span>
                    <button 
                        onClick={() => handleBreadcrumbClick('categories')}
                        className="text-blue-600 hover:underline"
                    >
                        {selectedProject?.name}
                    </button>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-700 font-medium">{currentCategory?.name}</span>
                </div>
                
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                            {currentCategory?.name}
                        </h1>
                        <p className="text-gray-600 mt-1">Select a discipline to view drawings</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="px-4 py-2 text-white rounded-lg transition flex items-center gap-2"
                            style={{ backgroundColor: 'var(--autovol-teal)' }}
                        >
                            <span className="icon-upload w-4 h-4"></span>
                            Upload
                        </button>
                        <button
                            onClick={() => handleBreadcrumbClick('categories')}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
                        >
                            <span className="icon-arrow-left w-4 h-4"></span>
                            Back
                        </button>
                    </div>
                </div>
                
                {/* Disciplines Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {disciplines.map(discipline => {
                        const count = getDrawingCount(discipline.id);
                        
                        return (
                            <div key={discipline.id} className="relative group/card">
                                <button
                                    onClick={() => setSelectedDiscipline(discipline.id)}
                                    className={`w-full bg-white rounded-lg border-2 p-5 text-left hover:shadow-lg transition-all ${discipline.color}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <span className="icon-folder w-5 h-5" style={{ filter: 'invert(50%) sepia(90%) saturate(500%) hue-rotate(5deg)' }}></span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-gray-900 text-sm leading-tight">
                                                {discipline.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {count} file{count !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                                {/* Edit/Delete buttons for admins */}
                                {canManageFolders && discipline.isCustom && (
                                    <div className="absolute top-1 right-1 opacity-0 group-hover/card:opacity-100 transition flex gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowFolderModal({ mode: 'edit', type: 'discipline', folder: discipline, parentId: selectedCategory }); }}
                                            className="p-1.5 bg-white rounded shadow hover:bg-blue-50 transition"
                                            title="Edit Discipline"
                                        >
                                            <span className="icon-edit w-3 h-3"></span>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowDeleteFolderConfirm(discipline); }}
                                            className="p-1.5 bg-white rounded shadow hover:bg-red-50 transition"
                                            title="Delete Discipline"
                                        >
                                            <span className="icon-trash w-3 h-3"></span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    
                    {/* Add Discipline Button - Admin only */}
                    {canManageFolders && (
                        <button
                            onClick={() => setShowFolderModal({ mode: 'add', type: 'discipline', parentId: selectedCategory })}
                            className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-5 text-left hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center gap-4"
                        >
                            <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                <span className="text-xl text-gray-400">+</span>
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-600 text-sm">Add Discipline</h3>
                                <p className="text-xs text-gray-400">Create new folder</p>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        );
    };
    
    // =========================================================================
    // RENDER: Drawings List View
    // =========================================================================
    const renderDrawingsView = () => {
        const categories = getCategories();
        const currentCategory = categories.find(c => c.id === selectedCategory);
        const disciplines = getDisciplinesForCategory(selectedCategory);
        const currentDiscipline = disciplines.find(d => d.id === selectedDiscipline);
        
        return (
            <div>
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm mb-6">
                    <button 
                        onClick={() => handleBreadcrumbClick('projects')}
                        className="text-blue-600 hover:underline"
                    >
                        Projects
                    </button>
                    <span className="text-gray-400">/</span>
                    <button 
                        onClick={() => handleBreadcrumbClick('categories')}
                        className="text-blue-600 hover:underline"
                    >
                        {selectedProject?.name}
                    </button>
                    <span className="text-gray-400">/</span>
                    <button 
                        onClick={() => handleBreadcrumbClick('disciplines')}
                        className="text-blue-600 hover:underline"
                    >
                        {currentCategory?.name}
                    </button>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-700 font-medium">{currentDiscipline?.name}</span>
                </div>
                
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                            {currentDiscipline?.name}
                        </h1>
                        <p className="text-gray-600 mt-1">{currentDrawings.length} drawing{currentDrawings.length !== 1 ? 's' : ''}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleBreadcrumbClick('disciplines')}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
                        >
                            <span className="icon-arrow-left w-4 h-4"></span>
                            Back
                        </button>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="px-4 py-2 text-white rounded-lg transition flex items-center gap-2"
                            style={{ backgroundColor: 'var(--autovol-teal)' }}
                        >
                            <span className="icon-upload w-4 h-4"></span>
                            Upload Drawings
                        </button>
                    </div>
                </div>
                
                {/* Drawings List */}
                {currentDrawings.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <span className="icon-file w-16 h-16 mx-auto mb-4 opacity-30" style={{ display: 'block' }}></span>
                        <h3 className="text-lg font-medium text-gray-600">No Drawings Yet</h3>
                        <p className="text-gray-500 mt-1 mb-4">Upload drawings to get started</p>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="px-4 py-2 text-white rounded-lg transition inline-flex items-center gap-2"
                            style={{ backgroundColor: 'var(--autovol-teal)' }}
                        >
                            <span className="icon-upload w-4 h-4"></span>
                            Upload Drawings
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded By</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {currentDrawings.map(drawing => {
                                    const latestVersion = getLatestVersion(drawing);
                                    // Parse module ID from filename
                                    const parsedModule = window.MODA_SUPABASE_DRAWINGS?.utils?.parseModuleFromFilename?.(drawing.name);
                                    
                                    return (
                                        <tr key={drawing.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="icon-file w-5 h-5 text-gray-400"></span>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-gray-900">{drawing.name}</span>
                                                            {parsedModule && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800" title="Parsed module from filename">
                                                                    {parsedModule}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {drawing.description && (
                                                            <div className="text-sm text-gray-500">{drawing.description}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    v{latestVersion?.version || '1.0'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-500">
                                                {formatFileSize(latestVersion?.file_size || latestVersion?.fileSize)}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-500">
                                                {formatDate(latestVersion?.uploaded_at || latestVersion?.uploadedAt || drawing.created_at || drawing.createdAt)}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-500">
                                                {latestVersion?.uploaded_by || latestVersion?.uploadedBy || drawing.created_by || drawing.uploadedBy}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setShowVersionHistory(drawing)}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                                        title="Version History"
                                                    >
                                                        <span className="icon-history w-4 h-4"></span>
                                                    </button>
                                                    {latestVersion && (
                                                        <>
                                                            <button
                                                                onClick={() => handleView(latestVersion)}
                                                                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition"
                                                                title="View in Browser"
                                                            >
                                                                <span className="icon-eye w-4 h-4"></span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownload(latestVersion)}
                                                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition"
                                                                title="Download"
                                                            >
                                                                <span className="icon-download w-4 h-4"></span>
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(drawing)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                        title="Delete"
                                                    >
                                                        <span className="icon-trash w-4 h-4"></span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };
    
    // =========================================================================
    // RENDER: Upload Modal
    // =========================================================================
    const UploadModal = () => {
        const [files, setFiles] = useState([]);
        const [description, setDescription] = useState('');
        const [notes, setNotes] = useState('');
        const [dragActive, setDragActive] = useState(false);
        const [uploadCategory, setUploadCategory] = useState(selectedCategory || '');
        const [uploadDiscipline, setUploadDiscipline] = useState(selectedDiscipline || '');
        
        // Get disciplines for selected upload category
        const getUploadDisciplines = () => {
            if (uploadCategory === 'permit-drawings') return PERMIT_DISCIPLINES;
            if (uploadCategory === 'shop-drawings') return SHOP_DISCIPLINES;
            return [];
        };
        
        const handleDrag = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.type === 'dragenter' || e.type === 'dragover') {
                setDragActive(true);
            } else if (e.type === 'dragleave') {
                setDragActive(false);
            }
        };
        
        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                setFiles(Array.from(e.dataTransfer.files));
            }
        };
        
        const handleFileSelect = (e) => {
            if (e.target.files && e.target.files.length > 0) {
                setFiles(Array.from(e.target.files));
            }
        };
        
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                                Upload Drawings
                            </h2>
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                                <span className="icon-close w-5 h-5"></span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        {/* Upload Progress Bar */}
                        {uploadProgress && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-blue-900">
                                        {uploadProgress.status === 'preparing' && 'Preparing upload...'}
                                        {uploadProgress.status === 'creating session' && 'Creating upload session...'}
                                        {uploadProgress.status === 'uploading' && `Uploading: ${uploadProgress.fileName || 'file'}`}
                                        {uploadProgress.status === 'complete' && 'Upload complete!'}
                                        {!uploadProgress.status && `Uploading ${uploadProgress.current} of ${uploadProgress.total}...`}
                                    </span>
                                    <span className="text-sm text-blue-700">{uploadProgress.percent || 0}%</span>
                                </div>
                                <div className="w-full bg-blue-200 rounded-full h-3 overflow-hidden">
                                    <div 
                                        className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${uploadProgress.percent || 0}%` }}
                                    ></div>
                                </div>
                                {uploadProgress.uploaded && uploadProgress.totalBytes && (
                                    <p className="text-xs text-blue-600 mt-1">
                                        {formatFileSize(uploadProgress.uploaded)} / {formatFileSize(uploadProgress.totalBytes)}
                                        {uploadProgress.speed && <span className="ml-2">({uploadProgress.speed})</span>}
                                    </p>
                                )}
                            </div>
                        )}
                        
                        {/* Drop Zone */}
                        {!uploadProgress && (
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                            }`}
                        >
                            <span className="icon-upload w-12 h-12 mx-auto mb-4 opacity-50" style={{ display: 'block' }}></span>
                            <p className="text-gray-600 mb-2">Drag and drop files here, or</p>
                            <label className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition">
                                <span>Browse Files</span>
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.tif,.tiff"
                                />
                            </label>
                            <p className="text-xs text-gray-400 mt-2">
                                Supported: PDF, DWG, DXF, PNG, JPG, TIFF
                            </p>
                        </div>
                        )}
                        
                        {/* Selected Files */}
                        {files.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Files ({files.length})</h4>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {files.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm">
                                            <span className="truncate">{file.name}</span>
                                            <span className="text-gray-400 ml-2">{formatFileSize(file.size)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Category Selection - show if not already in a discipline */}
                        {!selectedDiscipline && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Drawing Category <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={uploadCategory}
                                    onChange={(e) => { setUploadCategory(e.target.value); setUploadDiscipline(''); }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select a category...</option>
                                    {DRAWING_CATEGORIES.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        {/* Discipline Selection - show if category selected but not in a discipline */}
                        {!selectedDiscipline && uploadCategory && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Discipline <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={uploadDiscipline}
                                    onChange={(e) => setUploadDiscipline(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select a discipline...</option>
                                    {getUploadDisciplines().map(disc => (
                                        <option key={disc.id} value={disc.id}>{disc.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description (optional)
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of these drawings"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        
                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Version Notes (optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notes about this version..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    
                    <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                        <button
                            onClick={() => setShowUploadModal(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                const targetDiscipline = selectedDiscipline || uploadDiscipline;
                                if (!targetDiscipline) {
                                    alert('Please select a category and discipline');
                                    return;
                                }
                                handleFileUpload(files, { description, notes }, targetDiscipline);
                            }}
                            disabled={files.length === 0 || (!selectedDiscipline && !uploadDiscipline)}
                            className="px-4 py-2 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: 'var(--autovol-teal)' }}
                        >
                            Upload {files.length > 0 ? `(${files.length})` : ''}
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    // =========================================================================
    // RENDER: Version History Modal
    // =========================================================================
    const VersionHistoryModal = () => {
        const [newVersionFile, setNewVersionFile] = useState(null);
        const [newVersionNotes, setNewVersionNotes] = useState('');
        const [showUploadNew, setShowUploadNew] = useState(false);
        
        if (!showVersionHistory) return null;
        
        const drawing = showVersionHistory;
        const versions = [...(drawing.versions || [])].reverse();
        
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                                    Version History
                                </h2>
                                <p className="text-gray-600 text-sm mt-1">{drawing.name}</p>
                            </div>
                            <button
                                onClick={() => setShowVersionHistory(null)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                                <span className="icon-close w-5 h-5"></span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-6">
                        {/* Upload New Version */}
                        {!showUploadNew ? (
                            <button
                                onClick={() => setShowUploadNew(true)}
                                className="w-full mb-6 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition flex items-center justify-center gap-2"
                            >
                                <span className="icon-upload w-5 h-5"></span>
                                Upload New Version
                            </button>
                        ) : (
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <h4 className="font-medium text-blue-900 mb-3">Upload New Version</h4>
                                <div className="space-y-3">
                                    <label className="block">
                                        <span className="text-sm text-gray-700">Select File</span>
                                        <input
                                            type="file"
                                            onChange={(e) => setNewVersionFile(e.target.files?.[0] || null)}
                                            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                                            accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg,.tif,.tiff"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-sm text-gray-700">Version Notes</span>
                                        <textarea
                                            value={newVersionNotes}
                                            onChange={(e) => setNewVersionNotes(e.target.value)}
                                            placeholder="What changed in this version?"
                                            rows={2}
                                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </label>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => {
                                                setShowUploadNew(false);
                                                setNewVersionFile(null);
                                                setNewVersionNotes('');
                                            }}
                                            className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (newVersionFile) {
                                                    handleVersionUpload(drawing.id, newVersionFile, newVersionNotes);
                                                    setShowUploadNew(false);
                                                    setNewVersionFile(null);
                                                    setNewVersionNotes('');
                                                }
                                            }}
                                            disabled={!newVersionFile}
                                            className="px-3 py-1.5 text-white rounded transition disabled:opacity-50"
                                            style={{ backgroundColor: 'var(--autovol-teal)' }}
                                        >
                                            Upload
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Version Timeline */}
                        <div className="space-y-4">
                            {versions.map((version, index) => (
                                <div 
                                    key={version.id} 
                                    className={`relative pl-6 pb-4 ${index < versions.length - 1 ? 'border-l-2 border-gray-200' : ''}`}
                                >
                                    {/* Timeline dot */}
                                    <div className={`absolute left-0 top-0 w-3 h-3 rounded-full -translate-x-[7px] ${
                                        index === 0 ? 'bg-blue-500' : 'bg-gray-300'
                                    }`}></div>
                                    
                                    <div className={`bg-white rounded-lg border p-4 ${
                                        index === 0 ? 'border-blue-200 shadow-sm' : 'border-gray-200'
                                    }`}>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                        index === 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        v{version.version}
                                                    </span>
                                                    {index === 0 && (
                                                        <span className="text-xs text-green-600 font-medium">Current</span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">{version.notes || 'No notes'}</p>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                                    <span>{formatDate(version.uploadedAt)}</span>
                                                    <span>by {version.uploadedBy}</span>
                                                    <span>{formatFileSize(version.fileSize)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleView(version)}
                                                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition"
                                                    title="View this version"
                                                >
                                                    <span className="icon-eye w-4 h-4"></span>
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(version)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                                    title="Download this version"
                                                >
                                                    <span className="icon-download w-4 h-4"></span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="p-6 border-t border-gray-200 flex justify-end">
                        <button
                            onClick={() => setShowVersionHistory(null)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    // =========================================================================
    // RENDER: Delete Confirmation Modal
    // =========================================================================
    const DeleteConfirmModal = () => {
        if (!showDeleteConfirm) return null;
        
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                    <div className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <span className="icon-trash w-6 h-6 text-red-600"></span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Delete Drawing?</h2>
                                <p className="text-sm text-gray-600">This action cannot be undone.</p>
                            </div>
                        </div>
                        <p className="text-gray-700 mb-2">
                            Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>?
                        </p>
                        <p className="text-sm text-gray-500">
                            All {showDeleteConfirm.versions?.length || 1} version(s) will be permanently removed.
                        </p>
                    </div>
                    <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                        <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => handleDeleteDrawing(showDeleteConfirm.id)}
                            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    // =========================================================================
    // RENDER: Folder Modal (Add/Edit with Color Picker)
    // =========================================================================
    const FolderModal = () => {
        const [folderName, setFolderName] = useState(showFolderModal?.folder?.name || '');
        const [folderColor, setFolderColor] = useState(showFolderModal?.folder?.color || 'bg-gray-100 border-gray-400');
        
        if (!showFolderModal) return null;
        
        const isEdit = showFolderModal.mode === 'edit';
        const isCategory = showFolderModal.type === 'category';
        
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                            {isEdit ? 'Edit' : 'Add'} {isCategory ? 'Category' : 'Discipline'}
                        </h2>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        {/* Folder Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {isCategory ? 'Category' : 'Discipline'} Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={folderName}
                                onChange={(e) => setFolderName(e.target.value)}
                                placeholder={isCategory ? 'e.g., Construction Documents' : 'e.g., HVAC Drawings'}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                autoFocus
                            />
                        </div>
                        
                        {/* Color Picker */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Folder Color
                            </label>
                            <div className="grid grid-cols-7 gap-2">
                                {FOLDER_COLORS.map(color => (
                                    <button
                                        key={color.id}
                                        onClick={() => setFolderColor(color.value)}
                                        className={`w-8 h-8 rounded-lg border-2 transition ${color.value} ${
                                            folderColor === color.value ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                                        }`}
                                        title={color.label}
                                    />
                                ))}
                            </div>
                        </div>
                        
                        {/* Preview */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Preview
                            </label>
                            <div className={`rounded-lg border-2 p-4 ${folderColor}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">
                                        <span className="icon-folder w-5 h-5" style={{ filter: 'invert(50%) sepia(90%) saturate(500%) hue-rotate(5deg)' }}></span>
                                    </div>
                                    <span className="font-medium text-gray-900">{folderName || 'Folder Name'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                        <button
                            onClick={() => setShowFolderModal(null)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                if (!folderName.trim()) {
                                    alert('Please enter a folder name');
                                    return;
                                }
                                handleSaveFolder({
                                    id: showFolderModal.folder?.id,
                                    name: folderName.trim(),
                                    color: folderColor,
                                    folderType: showFolderModal.type,
                                    parentId: showFolderModal.parentId
                                });
                            }}
                            disabled={!folderName.trim()}
                            className="px-4 py-2 text-white rounded-lg transition disabled:opacity-50"
                            style={{ backgroundColor: 'var(--autovol-teal)' }}
                        >
                            {isEdit ? 'Save Changes' : 'Create Folder'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    // =========================================================================
    // RENDER: Delete Folder Confirmation Modal
    // =========================================================================
    const DeleteFolderConfirmModal = () => {
        if (!showDeleteFolderConfirm) return null;
        
        const isCategory = showDeleteFolderConfirm.folder_type === 'category' || !showDeleteFolderConfirm.parent_id;
        
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                    <div className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <span className="icon-trash w-6 h-6 text-red-600"></span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">
                                    Delete {isCategory ? 'Category' : 'Discipline'}?
                                </h2>
                                <p className="text-sm text-gray-600">This action cannot be undone.</p>
                            </div>
                        </div>
                        <p className="text-gray-700 mb-2">
                            Are you sure you want to delete <strong>{showDeleteFolderConfirm.name}</strong>?
                        </p>
                        {isCategory && (
                            <p className="text-sm text-red-600">
                                Warning: This will also delete all disciplines within this category.
                            </p>
                        )}
                    </div>
                    <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                        <button
                            onClick={() => setShowDeleteFolderConfirm(null)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => handleDeleteFolder(showDeleteFolderConfirm.id)}
                            className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    // =========================================================================
    // MAIN RENDER
    // =========================================================================
    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            {/* Upload Progress Overlay */}
            {uploadProgress && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <h3 className="font-medium text-gray-900">Uploading...</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {uploadProgress.current} of {uploadProgress.total}
                        </p>
                        {uploadProgress.fileName && (
                            <p className="text-xs text-gray-400 mt-2 truncate">{uploadProgress.fileName}</p>
                        )}
                    </div>
                </div>
            )}
            
            {/* Modals */}
            {showUploadModal && <UploadModal />}
            <VersionHistoryModal />
            <DeleteConfirmModal />
            <FolderModal />
            <DeleteFolderConfirmModal />
            
            {/* Main Content */}
            {!selectedProject && renderProjectsView()}
            {selectedProject && !selectedCategory && renderCategoriesView()}
            {selectedProject && selectedCategory && !selectedDiscipline && renderDisciplinesView()}
            {selectedProject && selectedCategory && selectedDiscipline && renderDrawingsView()}
        </div>
    );
};

// Export to window for use in App.jsx
window.DrawingsModule = DrawingsModule;
