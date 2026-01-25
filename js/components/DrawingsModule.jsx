// ============================================================================
// MODA DRAWINGS MODULE
// Document management for project drawings with version control
// Uses Supabase for storage with localStorage fallback
// ============================================================================

const { useState, useEffect, useCallback, useMemo, useRef } = React;

const DrawingsModule = ({ projects = [], auth }) => {
    
    // Mobile detection - view-only mode on mobile devices
    const isMobile = useMemo(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }, []);
    
    // Navigation state
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedDiscipline, setSelectedDiscipline] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Drawing files state - flat array for current view
    const [currentDrawings, setCurrentDrawings] = useState([]);
    const [drawingCounts, setDrawingCounts] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [uploadProgress, setUploadProgress] = useState(null); // { current, total, fileName, percent, status, timeRemaining }
    
    // Sorting state for Module Packages view
    const [sortColumn, setSortColumn] = useState('buildSequence'); // Default sort by Build Seq
    const [sortDirection, setSortDirection] = useState('asc'); // Default ascending
    
    // Modal states
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
    const [showFolderModal, setShowFolderModal] = useState(null); // { mode: 'add'|'edit', type: 'category'|'discipline', folder?: existing }
    const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState(null);
    const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(null); // { file, existingDrawing, metadata, disciplineToUse, onAction }
    const [uploadStartTime, setUploadStartTime] = useState(null); // Track upload start time for estimates
    const uploadCancelledRef = useRef(false); // Ref for cancel flag (refs update synchronously, unlike state)
    const [showSheetBrowser, setShowSheetBrowser] = useState(false);
    const [showEditDrawing, setShowEditDrawing] = useState(null); // Drawing object to edit
    const [showDeletedDrawings, setShowDeletedDrawings] = useState(false); // Show deleted drawings for recovery
    const [showFileInfo, setShowFileInfo] = useState(null); // Drawing object for file info modal
    const [processingDrawing, setProcessingDrawing] = useState(null); // { drawingId, status, progress }
    const [selectedDrawings, setSelectedDrawings] = useState([]); // Array of drawing IDs selected for OCR
    const [drawingSearchTerm, setDrawingSearchTerm] = useState(''); // Search/filter for drawings list
    const [showBulkRenameModal, setShowBulkRenameModal] = useState(false); // Bulk rename unlinked drawings
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false); // Toggle advanced filter panel
    const [advancedFilters, setAdvancedFilters] = useState({ unitTypes: [], roomTypes: [], difficulties: [] }); // Multi-select filters
    const [pdfViewerData, setPdfViewerData] = useState(null); // { url, name, drawingId, versionId } for PDF viewer modal
    const [showDrawingStatusLog, setShowDrawingStatusLog] = useState(false); // Drawing status matrix modal
    const [showAIMenu, setShowAIMenu] = useState(false); // AI Analysis dropdown menu
    const [showAnalysisBrowser, setShowAnalysisBrowser] = useState(null); // 'walls' | 'fixtures' | 'changes' | null
    
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
                    console.log('[Drawings] Raw counts from Supabase:', counts);
                    const countsMap = {};
                    counts.forEach(c => { countsMap[c.discipline] = c.count; });
                    console.log('[Drawings] Counts map:', countsMap);
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
    
    // Get drawing count for a discipline - checks by ID and also by name-based static ID
    const getDrawingCount = useCallback((disciplineId, disciplineName) => {
        // Direct ID match
        if (drawingCounts[disciplineId]) {
            return drawingCounts[disciplineId];
        }
        
        // Try matching by static ID pattern based on discipline name
        // This handles the case where folders have UUID IDs but drawings were uploaded with static IDs
        if (disciplineName) {
            const staticIdMap = {
                'Module Packages': 'shop-module-packages',
                'Soffits': 'shop-soffits',
                'Reference Sheets': 'shop-reference',
                'Prototype Drawings': 'shop-prototype',
                'Interior Walls': 'shop-interior-walls',
                'End Walls': 'shop-endwalls',
                'Corridor Walls': 'shop-corridor-walls',
                '3HR Walls': 'shop-3hr-walls'
            };
            const staticId = staticIdMap[disciplineName];
            if (staticId && drawingCounts[staticId]) {
                return drawingCounts[staticId];
            }
        }
        
        return 0;
    }, [drawingCounts]);
    
    // Check if current discipline is Module Packages
    const isModulePackages = useMemo(() => {
        return selectedDiscipline === 'shop-module-packages' || 
               selectedDiscipline === 'Module Packages';
    }, [selectedDiscipline]);
    
    // Find module data from project by BLM ID
    // Handles partial matches: L6M08 matches B1L6M08, L6M08 matches B2L6M08, etc.
    const findModuleByBLM = useCallback((blmId) => {
        if (!blmId || !selectedProject?.modules) return null;
        const normalizedBLM = blmId.toUpperCase().replace(/[_\-\s]/g, '');
        
        // Extract just the L#M## part for partial matching
        const lmPattern = normalizedBLM.match(/L\d+M\d+/)?.[0];
        
        return selectedProject.modules.find(m => {
            const hitchBLM = (m.hitchBLM || '').toUpperCase().replace(/[_\-\s]/g, '');
            const rearBLM = (m.rearBLM || '').toUpperCase().replace(/[_\-\s]/g, '');
            
            // Exact match first
            if (hitchBLM === normalizedBLM || rearBLM === normalizedBLM) return true;
            
            // Partial match: L6M08 matches B1L6M08 (BLM ends with the pattern)
            if (lmPattern) {
                if (hitchBLM.endsWith(lmPattern) || rearBLM.endsWith(lmPattern)) return true;
            }
            
            return false;
        });
    }, [selectedProject]);
    
    // Get latest version of a drawing
    const getLatestVersion = useCallback((drawing) => {
        if (!drawing.versions || drawing.versions.length === 0) return null;
        // Sort by uploaded_at descending and return first
        const sorted = [...drawing.versions].sort((a, b) => 
            new Date(b.uploaded_at || b.uploadedAt) - new Date(a.uploaded_at || a.uploadedAt)
        );
        return sorted[0];
    }, []);
    
    // Handle column sort click
    const handleSort = useCallback((column) => {
        if (sortColumn === column) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    }, [sortColumn]);
    
    // Difficulty filter options
    const DIFFICULTY_OPTIONS = [
        { id: 'sidewall', label: 'Sidewall' },
        { id: 'stair', label: 'Stair' },
        { id: 'hr3Wall', label: '3HR Wall' },
        { id: 'short', label: 'Short' },
        { id: 'doubleStudio', label: 'Double Studio' },
        { id: 'sawbox', label: 'Sawbox' }
    ];
    
    // Compute available filter options from project modules
    const filterOptions = useMemo(() => {
        if (!selectedProject?.modules) return { unitTypes: [], roomTypes: [], topUnitTypes: [], topRoomTypes: [] };
        
        const unitTypeCounts = {};
        const roomTypeCounts = {};
        
        selectedProject.modules.forEach(m => {
            // Collect unit types from both hitch and rear
            [m.hitchUnit, m.rearUnit].forEach(ut => {
                if (ut && ut.trim()) {
                    const key = ut.trim().toUpperCase();
                    unitTypeCounts[key] = (unitTypeCounts[key] || 0) + 1;
                }
            });
            // Collect room types from both hitch and rear
            [m.hitchRoomType, m.rearRoomType].forEach(rt => {
                if (rt && rt.trim()) {
                    const key = rt.trim().toUpperCase();
                    roomTypeCounts[key] = (roomTypeCounts[key] || 0) + 1;
                }
            });
        });
        
        // Sort by frequency and get all unique values
        const unitTypes = Object.keys(unitTypeCounts).sort((a, b) => unitTypeCounts[b] - unitTypeCounts[a]);
        const roomTypes = Object.keys(roomTypeCounts).sort((a, b) => roomTypeCounts[b] - roomTypeCounts[a]);
        
        // Top 4 most common for quick chips
        const topUnitTypes = unitTypes.slice(0, 4);
        const topRoomTypes = roomTypes.slice(0, 4);
        
        return { unitTypes, roomTypes, topUnitTypes, topRoomTypes };
    }, [selectedProject]);
    
    // Load filters from localStorage on project change
    useEffect(() => {
        if (selectedProject?.id && isModulePackages) {
            try {
                const saved = localStorage.getItem(`moda_drawings_filters_${selectedProject.id}`);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    setAdvancedFilters(parsed);
                    if (parsed.unitTypes?.length || parsed.roomTypes?.length || parsed.difficulties?.length) {
                        setShowAdvancedFilters(true);
                    }
                }
            } catch (e) {
                console.warn('[Drawings] Error loading saved filters:', e);
            }
        }
    }, [selectedProject?.id, isModulePackages]);
    
    // Save filters to localStorage when they change
    useEffect(() => {
        if (selectedProject?.id && isModulePackages) {
            try {
                localStorage.setItem(`moda_drawings_filters_${selectedProject.id}`, JSON.stringify(advancedFilters));
            } catch (e) {
                console.warn('[Drawings] Error saving filters:', e);
            }
        }
    }, [advancedFilters, selectedProject?.id, isModulePackages]);
    
    // Clear all filters
    const clearAdvancedFilters = useCallback(() => {
        setAdvancedFilters({ unitTypes: [], roomTypes: [], difficulties: [] });
        if (selectedProject?.id) {
            try {
                localStorage.removeItem(`moda_drawings_filters_${selectedProject.id}`);
            } catch (e) {}
        }
    }, [selectedProject?.id]);
    
    // Toggle a filter value
    const toggleFilter = useCallback((category, value) => {
        setAdvancedFilters(prev => {
            const current = prev[category] || [];
            const updated = current.includes(value) 
                ? current.filter(v => v !== value)
                : [...current, value];
            return { ...prev, [category]: updated };
        });
    }, []);
    
    // Check if any advanced filters are active
    const hasActiveFilters = useMemo(() => {
        return advancedFilters.unitTypes.length > 0 || 
               advancedFilters.roomTypes.length > 0 || 
               advancedFilters.difficulties.length > 0;
    }, [advancedFilters]);
    
    // Filter drawings by search term AND advanced filters
    const filteredDrawings = useMemo(() => {
        let results = currentDrawings;
        
        // Text search filter
        if (drawingSearchTerm.trim()) {
            const term = drawingSearchTerm.toLowerCase().trim();
            results = results.filter(drawing => {
                if (drawing.name.toLowerCase().includes(term)) return true;
                
                if (isModulePackages) {
                    const parsedModule = window.MODA_SUPABASE_DRAWINGS?.utils?.parseModuleFromFilename?.(drawing.name);
                    const linkedModule = parsedModule ? findModuleByBLM(parsedModule) : null;
                    
                    if (linkedModule) {
                        if (linkedModule.serialNumber?.toLowerCase().includes(term)) return true;
                        if (linkedModule.hitchBLM?.toLowerCase().includes(term)) return true;
                        if (linkedModule.rearBLM?.toLowerCase().includes(term)) return true;
                        if (String(linkedModule.buildSequence).includes(term)) return true;
                    }
                    if (parsedModule?.toLowerCase().includes(term)) return true;
                }
                return false;
            });
        }
        
        // Advanced filters (only for Module Packages)
        if (isModulePackages && hasActiveFilters) {
            results = results.filter(drawing => {
                const parsedModule = window.MODA_SUPABASE_DRAWINGS?.utils?.parseModuleFromFilename?.(drawing.name);
                const linkedModule = parsedModule ? findModuleByBLM(parsedModule) : null;
                
                // If drawing is unlinked, hide it when filters are active
                if (!linkedModule) return false;
                
                // Unit Type filter (OR within - match if hitch OR rear has any selected type)
                if (advancedFilters.unitTypes.length > 0) {
                    const hitchUnit = (linkedModule.hitchUnit || '').trim().toUpperCase();
                    const rearUnit = (linkedModule.rearUnit || '').trim().toUpperCase();
                    const matchesUnit = advancedFilters.unitTypes.some(ut => 
                        hitchUnit === ut || rearUnit === ut
                    );
                    if (!matchesUnit) return false;
                }
                
                // Room Type filter (OR within - match if hitch OR rear has any selected type)
                if (advancedFilters.roomTypes.length > 0) {
                    const hitchRoom = (linkedModule.hitchRoomType || '').trim().toUpperCase();
                    const rearRoom = (linkedModule.rearRoomType || '').trim().toUpperCase();
                    const matchesRoom = advancedFilters.roomTypes.some(rt => 
                        hitchRoom === rt || rearRoom === rt
                    );
                    if (!matchesRoom) return false;
                }
                
                // Difficulty filter (must have ALL selected difficulties)
                if (advancedFilters.difficulties.length > 0) {
                    const matchesDifficulty = advancedFilters.difficulties.every(diff => 
                        linkedModule[diff] === true
                    );
                    if (!matchesDifficulty) return false;
                }
                
                return true;
            });
        }
        
        return results;
    }, [currentDrawings, drawingSearchTerm, isModulePackages, findModuleByBLM, hasActiveFilters, advancedFilters]);
    
    // Count unlinked drawings hidden by filters
    const hiddenUnlinkedCount = useMemo(() => {
        if (!isModulePackages || !hasActiveFilters) return 0;
        return currentDrawings.filter(drawing => {
            const parsedModule = window.MODA_SUPABASE_DRAWINGS?.utils?.parseModuleFromFilename?.(drawing.name);
            return !parsedModule || !findModuleByBLM(parsedModule);
        }).length;
    }, [currentDrawings, isModulePackages, hasActiveFilters, findModuleByBLM]);
    
    // Sort drawings (works for all views)
    const sortedDrawings = useMemo(() => {
        const drawingsToSort = [...filteredDrawings];
        
        // Sort by filename if that column is selected
        if (sortColumn === 'fileName') {
            drawingsToSort.sort((a, b) => {
                const cmp = a.name.localeCompare(b.name, undefined, { numeric: true });
                return sortDirection === 'asc' ? cmp : -cmp;
            });
            return drawingsToSort;
        }
        
        if (!isModulePackages) return drawingsToSort;
        
        return drawingsToSort.sort((a, b) => {
            const parsedA = window.MODA_SUPABASE_DRAWINGS?.utils?.parseModuleFromFilename?.(a.name);
            const parsedB = window.MODA_SUPABASE_DRAWINGS?.utils?.parseModuleFromFilename?.(b.name);
            const moduleA = parsedA ? findModuleByBLM(parsedA) : null;
            const moduleB = parsedB ? findModuleByBLM(parsedB) : null;
            
            let valA, valB;
            switch (sortColumn) {
                case 'serialNumber':
                    valA = moduleA?.serialNumber || '';
                    valB = moduleB?.serialNumber || '';
                    break;
                case 'buildSequence':
                    valA = moduleA?.buildSequence ?? 9999;
                    valB = moduleB?.buildSequence ?? 9999;
                    break;
                case 'hitchBLM':
                    valA = moduleA?.hitchBLM || parsedA || '';
                    valB = moduleB?.hitchBLM || parsedB || '';
                    break;
                case 'rearBLM':
                    valA = moduleA?.rearBLM || '';
                    valB = moduleB?.rearBLM || '';
                    break;
                default:
                    valA = moduleA?.buildSequence ?? 9999;
                    valB = moduleB?.buildSequence ?? 9999;
            }
            
            if (sortColumn === 'buildSequence') {
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            }
            
            const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true });
            return sortDirection === 'asc' ? cmp : -cmp;
        });
    }, [filteredDrawings, isModulePackages, sortColumn, sortDirection, findModuleByBLM]);
    
    // Compute unlinked drawings that need attention (only for Module Packages)
    const unlinkedDrawings = useMemo(() => {
        if (!isModulePackages || !selectedProject?.modules) return [];
        
        const projectModules = selectedProject.modules;
        const results = [];
        
        for (const drawing of currentDrawings) {
            const parsedBLM = window.MODA_SUPABASE_DRAWINGS?.utils?.parseModuleFromFilename?.(drawing.name);
            const linkedModule = parsedBLM ? findModuleByBLM(parsedBLM) : null;
            
            if (!linkedModule) {
                // Drawing is unlinked - try to find a recommended module
                // Check if filename contains any level-module pattern that partially matches
                const fileName = drawing.name.toUpperCase().replace(/[_\-\s]/g, '');
                let recommendedModule = null;
                let recommendedName = null;
                
                // Try to find a module whose BLM appears in the filename
                for (const mod of projectModules) {
                    const hitchLM = (mod.hitchBLM || '').match(/L\d+M\d+/)?.[0]?.toUpperCase();
                    const rearLM = (mod.rearBLM || '').match(/L\d+M\d+/)?.[0]?.toUpperCase();
                    
                    if (hitchLM && fileName.includes(hitchLM)) {
                        recommendedModule = mod;
                        // Generate recommended filename with full BLM
                        const ext = drawing.name.split('.').pop();
                        if (mod.hitchBLM !== mod.rearBLM && mod.rearBLM) {
                            recommendedName = `${mod.hitchBLM} - ${mod.rearBLM} - Shops.${ext}`;
                        } else {
                            recommendedName = `${mod.hitchBLM} - Shops.${ext}`;
                        }
                        break;
                    }
                    if (rearLM && fileName.includes(rearLM)) {
                        recommendedModule = mod;
                        const ext = drawing.name.split('.').pop();
                        if (mod.hitchBLM !== mod.rearBLM && mod.hitchBLM) {
                            recommendedName = `${mod.hitchBLM} - ${mod.rearBLM} - Shops.${ext}`;
                        } else {
                            recommendedName = `${mod.rearBLM} - Shops.${ext}`;
                        }
                        break;
                    }
                }
                
                // Check if recommended name would conflict with existing drawing
                const wouldConflict = recommendedName && currentDrawings.some(d => 
                    d.id !== drawing.id && d.name.toLowerCase() === recommendedName.toLowerCase()
                );
                
                results.push({
                    drawing,
                    parsedBLM,
                    recommendedModule,
                    recommendedName: wouldConflict ? null : recommendedName,
                    hasConflict: wouldConflict
                });
            }
        }
        
        return results;
    }, [currentDrawings, isModulePackages, selectedProject, findModuleByBLM]);
    
    // Handle file upload - accepts optional targetDiscipline for uploads from category level
    const handleFileUpload = useCallback(async (files, metadata = {}, targetDiscipline = null) => {
        const disciplineToUse = targetDiscipline || selectedDiscipline;
        if (!selectedProject || !disciplineToUse || !files.length) return;
        
        // Reset cancellation ref at start
        uploadCancelledRef.current = false;
        const startTime = Date.now();
        setUploadStartTime(startTime);
        
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
                // Fetch fresh drawings list to ensure accurate duplicate detection
                const freshDrawings = await window.MODA_SUPABASE_DRAWINGS.drawings.getByProjectAndDiscipline(
                    selectedProject.id, 
                    disciplineToUse
                );
                
                // Local variable for bulk action (React state won't update mid-loop)
                let localBulkAction = null;
                
                // Upload to Supabase (which now routes to SharePoint)
                for (let i = 0; i < files.length; i++) {
                    // Check if upload was cancelled (using ref for synchronous check)
                    if (uploadCancelledRef.current) {
                        console.log('[Drawings] Upload cancelled by user');
                        break;
                    }
                    
                    const file = files[i];
                    
                    // Calculate time estimate
                    const elapsed = Date.now() - startTime;
                    const avgTimePerFile = i > 0 ? elapsed / i : 0;
                    const remainingFiles = files.length - i;
                    const estimatedRemaining = avgTimePerFile * remainingFiles;
                    
                    setUploadProgress({ 
                        current: i + 1, 
                        total: files.length, 
                        fileName: file.name,
                        timeRemaining: estimatedRemaining > 0 ? estimatedRemaining : null
                    });
                    
                    // Check for existing drawing with same name (use fresh data)
                    const existingDrawing = freshDrawings.find(d => 
                        d.name.toLowerCase() === file.name.toLowerCase()
                    );
                    
                    if (existingDrawing) {
                        let userAction = localBulkAction; // Use local bulk action if set
                        
                        if (!userAction) {
                            // Show duplicate prompt and wait for user decision
                            userAction = await new Promise((resolve) => {
                                setShowDuplicatePrompt({
                                    file,
                                    existingDrawing,
                                    metadata,
                                    disciplineToUse,
                                    categoryName,
                                    disciplineName,
                                    remainingDuplicates: files.length - i - 1,
                                    onAction: resolve
                                });
                            });
                            setShowDuplicatePrompt(null);
                        }
                        
                        // Handle "Apply to All" actions - set local variable for subsequent iterations
                        if (userAction === 'skipAll') {
                            localBulkAction = 'skip';
                            continue; // Skip this file too
                        } else if (userAction === 'newVersionAll') {
                            localBulkAction = 'newVersion';
                            userAction = 'newVersion';
                        }
                        
                        if (userAction === 'skip') {
                            continue; // Skip this file
                        } else if (userAction === 'newVersion') {
                            // Add as new version to existing drawing
                            const nextVersion = window.MODA_SUPABASE_DRAWINGS.utils.getNextVersion(existingDrawing.versions || []);
                            await window.MODA_SUPABASE_DRAWINGS.versions.create(existingDrawing.id, file, {
                                version: nextVersion,
                                notes: metadata.notes || `Version ${nextVersion}`,
                                uploadedBy: auth?.currentUser?.name || 'Unknown',
                                projectName: selectedProject.name,
                                categoryName: categoryName,
                                disciplineName: disciplineName,
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
                            continue;
                        } else if (userAction === 'replace') {
                            // Delete existing and upload new
                            await window.MODA_SUPABASE_DRAWINGS.drawings.delete(existingDrawing.id);
                        }
                        // If 'replace', fall through to create new drawing below
                    }
                    
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
            uploadCancelledRef.current = false;
            setUploadStartTime(null);
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
    
    // Log drawing activity (upload, rename, delete, version add)
    const logDrawingActivity = useCallback(async (action, drawingId, details = {}) => {
        try {
            if (isSupabaseAvailable() && window.MODA_SUPABASE_DRAWINGS.activity?.log) {
                await window.MODA_SUPABASE_DRAWINGS.activity.log({
                    action,
                    drawing_id: drawingId,
                    project_id: selectedProject?.id,
                    user_name: auth?.currentUser?.name || 'Unknown',
                    user_id: auth?.currentUser?.id,
                    details: JSON.stringify(details),
                    created_at: new Date().toISOString()
                });
            }
        } catch (error) {
            console.warn('[Drawings] Activity log error:', error);
        }
    }, [selectedProject, auth]);
    
    // Handle view - opens file in new browser tab for viewing (not download)
    // Uses pre-authenticated download URL to avoid Microsoft login requirement
    const handleView = useCallback(async (version, e) => {
        // Prevent default for touch/click events
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // IMPORTANT: Open window SYNCHRONOUSLY before any async calls
        // Mobile browsers block window.open if called after await
        // Open with loading page first, then redirect to actual URL
        const newWindow = window.open('about:blank', '_blank');
        
        // If popup was blocked, fall back to same-window navigation
        const popupBlocked = !newWindow || newWindow.closed;
        
        try {
            const storagePath = version.storage_path || version.storagePath;
            const sharePointFileId = version.sharepoint_file_id || version.sharepointFileId;
            
            let url = null;
            
            if (isSupabaseAvailable() && storagePath) {
                // Use getPreviewUrl for SharePoint files - returns pre-authenticated URL
                // that doesn't require Microsoft login and opens PDFs inline in browser
                url = await window.MODA_SUPABASE_DRAWINGS.versions.getPreviewUrl(storagePath, sharePointFileId);
            } else {
                url = version.file_url || version.fileUrl;
            }
            
            if (url) {
                // Add cache-busting timestamp to prevent browser/mobile caching
                const cacheBuster = `_cb=${Date.now()}`;
                url = url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
                
                if (popupBlocked) {
                    // Popup was blocked - navigate in same window as fallback
                    window.location.href = url;
                } else {
                    // Redirect the pre-opened window to the actual URL
                    newWindow.location.href = url;
                }
            } else {
                if (!popupBlocked) newWindow.close();
                throw new Error('Could not generate view URL');
            }
        } catch (error) {
            console.error('[Drawings] View error:', error);
            if (!popupBlocked && newWindow) newWindow.close();
            alert('Error viewing file: ' + error.message);
        }
    }, []);
    
    // Handle open in PDF viewer with markup tools
    const handleOpenInViewer = useCallback(async (drawing, version) => {
        try {
            const storagePath = version.storage_path || version.storagePath;
            const sharePointFileId = version.sharepoint_file_id || version.sharepointFileId;
            
            let url = null;
            
            if (isSupabaseAvailable() && storagePath) {
                url = await window.MODA_SUPABASE_DRAWINGS.versions.getPreviewUrl(storagePath, sharePointFileId);
            } else {
                url = version.file_url || version.fileUrl;
            }
            
            if (url) {
                setPdfViewerData({
                    url,
                    name: drawing.name,
                    drawingId: drawing.id,
                    versionId: version.id
                });
            } else {
                throw new Error('Could not generate PDF URL');
            }
        } catch (error) {
            console.error('[Drawings] Open in viewer error:', error);
            alert('Error opening PDF viewer: ' + error.message);
        }
    }, []);
    
    // Check if user is admin (for OCR access)
    const isAdmin = useMemo(() => {
        const role = auth?.currentUser?.dashboardRole?.toLowerCase();
        return role === 'admin';
    }, [auth]);
    
    // Handle extract sheets - queue OCR processing for selected PDFs (background processing)
    const handleExtractSheets = useCallback(() => {
        // Admin-only check
        if (!isAdmin) {
            alert('OCR processing is restricted to Admin users only.');
            return;
        }
        
        if (!window.MODA_SUPABASE?.client) {
            alert('Supabase not available. Please refresh the page.');
            return;
        }
        
        if (!window.MODA_OCR_MANAGER) {
            alert('OCR Manager not available. Please refresh the page.');
            return;
        }
        
        if (selectedDrawings.length === 0) {
            alert('Please select at least one PDF file to process.');
            return;
        }
        
        // Get selected drawings that are PDFs
        const drawingsToProcess = currentDrawings.filter(d => 
            selectedDrawings.includes(d.id) && d.name.toLowerCase().endsWith('.pdf')
        );
        
        if (drawingsToProcess.length === 0) {
            alert('No PDF files selected. Please select PDF files to process.');
            return;
        }
        
        // Get cost estimate from OCR manager
        const estimate = window.MODA_OCR_MANAGER.estimateCost(drawingsToProcess);
        
        const confirmed = confirm(
            `Queue OCR for ${drawingsToProcess.length} PDF file(s)?\n\n` +
            `This will use Claude Vision AI to extract title block metadata:\n` +
            `- Sheet Number (e.g., XE-B1L6M17-01)\n` +
            `- Sheet Title (e.g., ELEC ENLG PLAN)\n` +
            `- BLM Type (e.g., B1L6M17)\n` +
            `- Scale, Date, Discipline\n\n` +
            `COST ESTIMATE:\n` +
            `- Files: ${estimate.fileCount}\n` +
            `- Est. pages: ~${estimate.estimatedPages} (avg 15/PDF)\n` +
            `- Est. cost: ~$${estimate.estimatedCost}\n` +
            `- Per file: ~$${estimate.costPerFile}\n\n` +
            `Processing runs in background - you can navigate away.\n` +
            `Progress shown in floating indicator (bottom-right).`
        );
        if (!confirmed) return;
        
        // Queue the job with OCR manager
        const jobId = window.MODA_OCR_MANAGER.queueJob(
            selectedProject?.id,
            selectedProject?.name || 'Unknown Project',
            drawingsToProcess
        );
        
        console.log(`[Drawings] Queued OCR job: ${jobId} with ${drawingsToProcess.length} files`);
        
        // Clear selection
        setSelectedDrawings([]);
        
    }, [currentDrawings, selectedDrawings, selectedProject, isAdmin]);
    
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
    
    // Handle process drawing sheets (split PDF and OCR)
    const handleProcessSheets = useCallback(async (drawing) => {
        if (!window.MODA_DRAWING_SHEETS?.processDrawingSheets) {
            alert('Sheet processing module not available');
            return;
        }
        
        const confirmed = confirm(
            `Process "${drawing.name}" to extract individual sheets?\n\n` +
            `This will split the PDF into individual pages and extract title block metadata using OCR. ` +
            `This may take several minutes for large files.`
        );
        
        if (!confirmed) return;
        
        setProcessingDrawing({ drawingId: drawing.id, status: 'processing', progress: 0 });
        
        try {
            const result = await window.MODA_DRAWING_SHEETS.processDrawingSheets(drawing.id);
            
            setProcessingDrawing(null);
            
            alert(
                `Successfully processed ${result.processed_sheets} sheet(s)!\n\n` +
                `You can now browse and filter individual sheets.`
            );
            
            // Refresh drawings to show updated state
            await loadDrawings();
        } catch (error) {
            console.error('[Drawings] Error processing sheets:', error);
            setProcessingDrawing(null);
            alert('Error processing sheets: ' + error.message);
        }
    }, []);
    
    // Filter and sort projects by search and project_number
    const filteredProjects = useMemo(() => {
        // First filter by search term
        let filtered = projects;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = projects.filter(p => 
                p.name?.toLowerCase().includes(term) ||
                p.location?.toLowerCase().includes(term)
            );
        }
        // Then sort by project_number (highest first, nulls at end)
        return [...filtered].sort((a, b) => {
            const aNum = parseInt(a.project_number) || 0;
            const bNum = parseInt(b.project_number) || 0;
            return bNum - aNum; // Descending order
        });
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
                            className="bg-white rounded-lg border-2 border-gray-200 p-6 text-left hover:border-blue-400 hover:shadow-lg transition-all group relative"
                        >
                            {/* Project Number Badge */}
                            {project.project_number && (
                                <div className="absolute top-2 right-2 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                                    #{project.project_number}
                                </div>
                            )}
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
                
                {/* Drawing Links Panel - Only show for Permit Drawings category */}
                {(currentCategory?.name === 'Permit Drawings' || selectedCategory === 'permit-drawings') && window.DrawingLinksPanel && (
                    <DrawingLinksPanel
                        projectId={selectedProject?.id}
                        projectName={selectedProject?.name}
                        drawings={currentDrawings}
                        auth={auth}
                    />
                )}
                
                {/* Disciplines Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {disciplines.map(discipline => {
                        const count = getDrawingCount(discipline.id, discipline.name);
                        
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
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--autovol-navy)' }}>
                            {currentDiscipline?.name}
                        </h1>
                        <p className="text-gray-600 mt-1">
                            {sortedDrawings.length}{drawingSearchTerm ? ` of ${currentDrawings.length}` : ''} drawing{sortedDrawings.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleBreadcrumbClick('disciplines')}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
                        >
                            <span className="icon-arrow-left w-4 h-4"></span>
                            Back
                        </button>
                        {isModulePackages && (
                            <button
                                onClick={() => setShowDrawingStatusLog(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg transition flex items-center gap-2 hover:bg-blue-700"
                                title="View drawing status for all modules"
                            >
                                <span className="icon-grid w-4 h-4"></span>
                                Status Log
                            </button>
                        )}
                        {!isMobile && isModulePackages && unlinkedDrawings.length > 0 && (
                            <button
                                onClick={() => setShowBulkRenameModal(true)}
                                className="px-4 py-2 bg-amber-500 text-white rounded-lg transition flex items-center gap-2 hover:bg-amber-600"
                            >
                                <span className="icon-alert-triangle w-4 h-4"></span>
                                Fix Unlinked ({unlinkedDrawings.length})
                            </button>
                        )}
                        {!isMobile && (
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="px-4 py-2 text-white rounded-lg transition flex items-center gap-2"
                                style={{ backgroundColor: 'var(--autovol-teal)' }}
                            >
                                <span className="icon-upload w-4 h-4"></span>
                                Upload Drawings
                            </button>
                        )}
                        {/* AI Analysis Dropdown */}
                        {!isMobile && isModulePackages && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowAIMenu(!showAIMenu)}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg transition flex items-center gap-2 hover:bg-purple-700"
                                    title="AI-powered drawing analysis"
                                >
                                    <span className="icon-cpu w-4 h-4"></span>
                                    AI Analysis
                                    <span className={`transform transition-transform ${showAIMenu ? 'rotate-180' : ''}`}>▼</span>
                                </button>
                                
                                {showAIMenu && (
                                    <div 
                                        className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
                                    >
                                        <div className="p-2">
                                            <div className="text-xs font-semibold text-gray-500 px-3 py-1 uppercase">Extract Data</div>
                                            
                                            {/* Run OCR - requires selection and admin role */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowAIMenu(false); handleExtractSheets(); }}
                                                disabled={!isAdmin || selectedDrawings.length === 0}
                                                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-purple-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                title={!isAdmin ? 'Admin only' : ''}
                                            >
                                                <span className="icon-scan w-4 h-4 text-purple-600"></span>
                                                <div>
                                                    <div className="font-medium flex items-center gap-1">
                                                        Run OCR
                                                        {!isAdmin && <span className="text-xs text-red-500">(Admin)</span>}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {!isAdmin 
                                                            ? 'Restricted to Admin users'
                                                            : selectedDrawings.length > 0 
                                                                ? `Extract title blocks (${selectedDrawings.length} selected)`
                                                                : 'Select PDFs first'}
                                                    </div>
                                                </div>
                                            </button>
                                            
                                            <div className="border-t border-gray-100 my-2"></div>
                                            <div className="text-xs font-semibold text-gray-500 px-3 py-1 uppercase">Browse Results</div>
                                            
                                            {/* Browse Sheets */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowAIMenu(false); setShowSheetBrowser(true); }}
                                                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-blue-50 flex items-center gap-2"
                                            >
                                                <span className="icon-layers w-4 h-4 text-blue-600"></span>
                                                <div>
                                                    <div className="font-medium">Browse Sheets</div>
                                                    <div className="text-xs text-gray-500">View extracted sheet metadata</div>
                                                </div>
                                            </button>
                                            
                                            {/* Browse Walls */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowAIMenu(false); setShowAnalysisBrowser('walls'); }}
                                                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-green-50 flex items-center gap-2"
                                            >
                                                <span className="icon-box w-4 h-4 text-green-600"></span>
                                                <div>
                                                    <div className="font-medium">Wall Schedule</div>
                                                    <div className="text-xs text-gray-500">View extracted wall IDs</div>
                                                </div>
                                            </button>
                                            
                                            {/* Browse Fixtures */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowAIMenu(false); setShowAnalysisBrowser('fixtures'); }}
                                                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-yellow-50 flex items-center gap-2"
                                            >
                                                <span className="icon-zap w-4 h-4 text-yellow-600"></span>
                                                <div>
                                                    <div className="font-medium">MEP Fixtures</div>
                                                    <div className="text-xs text-gray-500">View fixture counts by category</div>
                                                </div>
                                            </button>
                                            
                                            {/* Version Changes */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowAIMenu(false); setShowAnalysisBrowser('changes'); }}
                                                className="w-full px-3 py-2 text-left text-sm rounded hover:bg-red-50 flex items-center gap-2"
                                            >
                                                <span className="icon-git-compare w-4 h-4 text-red-600"></span>
                                                <div>
                                                    <div className="font-medium">Version Changes</div>
                                                    <div className="text-xs text-gray-500">Track design revisions</div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Search/Filter Bar */}
                <div className="mb-4">
                    <div className="relative">
                        <span className="icon-search w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></span>
                        <input
                            type="text"
                            value={drawingSearchTerm}
                            onChange={(e) => setDrawingSearchTerm(e.target.value)}
                            placeholder={isModulePackages ? "Search by filename, serial no., BLM ID, or sequence..." : "Search by filename..."}
                            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {drawingSearchTerm && (
                            <button
                                onClick={() => setDrawingSearchTerm('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    
                    {/* Advanced Filters (Module Packages only) */}
                    {isModulePackages && filterOptions.unitTypes.length > 0 && (
                        <div className="mt-3">
                            {/* Toggle Button */}
                            <button
                                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                            >
                                <span className={`transform transition-transform ${showAdvancedFilters ? 'rotate-90' : ''}`}>▶</span>
                                Advanced Filters
                                {hasActiveFilters && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                        {advancedFilters.unitTypes.length + advancedFilters.roomTypes.length + advancedFilters.difficulties.length} active
                                    </span>
                                )}
                            </button>
                            
                            {/* Expanded Filter Panel */}
                            {showAdvancedFilters && (
                                <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    {/* Quick Filter Chips */}
                                    <div className="mb-4">
                                        <div className="flex flex-wrap gap-2">
                                            {/* Top Unit Types */}
                                            {filterOptions.topUnitTypes.map(ut => (
                                                <button
                                                    key={`chip-ut-${ut}`}
                                                    onClick={() => toggleFilter('unitTypes', ut)}
                                                    className={`px-3 py-1 text-sm rounded-full border transition ${
                                                        advancedFilters.unitTypes.includes(ut)
                                                            ? 'bg-blue-500 text-white border-blue-500'
                                                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                                    }`}
                                                >
                                                    {ut}
                                                </button>
                                            ))}
                                            {/* Top Room Types */}
                                            {filterOptions.topRoomTypes.map(rt => (
                                                <button
                                                    key={`chip-rt-${rt}`}
                                                    onClick={() => toggleFilter('roomTypes', rt)}
                                                    className={`px-3 py-1 text-sm rounded-full border transition ${
                                                        advancedFilters.roomTypes.includes(rt)
                                                            ? 'bg-emerald-500 text-white border-emerald-500'
                                                            : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
                                                    }`}
                                                >
                                                    {rt}
                                                </button>
                                            ))}
                                            {/* Difficulty chips */}
                                            {DIFFICULTY_OPTIONS.slice(0, 3).map(diff => (
                                                <button
                                                    key={`chip-diff-${diff.id}`}
                                                    onClick={() => toggleFilter('difficulties', diff.id)}
                                                    className={`px-3 py-1 text-sm rounded-full border transition ${
                                                        advancedFilters.difficulties.includes(diff.id)
                                                            ? 'bg-amber-500 text-white border-amber-500'
                                                            : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                                                    }`}
                                                >
                                                    {diff.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Dropdowns Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        {/* Unit Type Dropdown */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Unit Types</label>
                                            <select
                                                multiple
                                                value={advancedFilters.unitTypes}
                                                onChange={(e) => {
                                                    const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                                                    setAdvancedFilters(prev => ({ ...prev, unitTypes: selected }));
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                style={{ minHeight: '80px' }}
                                            >
                                                {filterOptions.unitTypes.map(ut => (
                                                    <option key={ut} value={ut}>{ut}</option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">Ctrl+click to select multiple</p>
                                        </div>
                                        
                                        {/* Room Type Dropdown */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">Room Types</label>
                                            <select
                                                multiple
                                                value={advancedFilters.roomTypes}
                                                onChange={(e) => {
                                                    const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                                                    setAdvancedFilters(prev => ({ ...prev, roomTypes: selected }));
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                style={{ minHeight: '80px' }}
                                            >
                                                {filterOptions.roomTypes.map(rt => (
                                                    <option key={rt} value={rt}>{rt}</option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">Ctrl+click to select multiple</p>
                                        </div>
                                    </div>
                                    
                                    {/* Difficulty Checkboxes */}
                                    <div className="mb-4">
                                        <label className="block text-xs font-medium text-gray-600 mb-2">Difficulties</label>
                                        <div className="flex flex-wrap gap-4">
                                            {DIFFICULTY_OPTIONS.map(diff => (
                                                <label key={diff.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={advancedFilters.difficulties.includes(diff.id)}
                                                        onChange={() => toggleFilter('difficulties', diff.id)}
                                                        className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                                    />
                                                    {diff.label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Clear Filters Button */}
                                    {hasActiveFilters && (
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                            <span className="text-sm text-gray-600">
                                                Showing {sortedDrawings.length} of {currentDrawings.length} drawings
                                                {hiddenUnlinkedCount > 0 && (
                                                    <span className="text-amber-600 ml-2">
                                                        ({hiddenUnlinkedCount} unlinked hidden)
                                                    </span>
                                                )}
                                            </span>
                                            <button
                                                onClick={clearAdvancedFilters}
                                                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
                                            >
                                                Clear All Filters
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Drawings List */}
                {currentDrawings.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <span className="icon-file w-16 h-16 mx-auto mb-4 opacity-30" style={{ display: 'block' }}></span>
                        <h3 className="text-lg font-medium text-gray-600">No Drawings Yet</h3>
                        <p className="text-gray-500 mt-1 mb-4">{isMobile ? 'No drawings available' : 'Upload drawings to get started'}</p>
                        {!isMobile && (
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="px-4 py-2 text-white rounded-lg transition inline-flex items-center gap-2"
                                style={{ backgroundColor: 'var(--autovol-teal)' }}
                            >
                                <span className="icon-upload w-4 h-4"></span>
                                Upload Drawings
                            </button>
                        )}
                    </div>
                ) : sortedDrawings.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="icon-search w-12 h-12 mx-auto mb-3 opacity-30" style={{ display: 'block' }}></span>
                        <h3 className="text-lg font-medium text-gray-600">No Results Found</h3>
                        <p className="text-gray-500 mt-1">
                            {hasActiveFilters 
                                ? `No drawings match the selected filters${drawingSearchTerm ? ` and "${drawingSearchTerm}"` : ''}`
                                : `No drawings match "${drawingSearchTerm}"`
                            }
                        </p>
                        <div className="mt-3 flex items-center justify-center gap-3">
                            {drawingSearchTerm && (
                                <button
                                    onClick={() => setDrawingSearchTerm('')}
                                    className="text-blue-600 hover:underline"
                                >
                                    Clear search
                                </button>
                            )}
                            {hasActiveFilters && (
                                <button
                                    onClick={clearAdvancedFilters}
                                    className="text-red-600 hover:underline"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                        <table className="w-full min-w-max">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {window.MODA_SUPABASE?.client && (
                                        <th className="px-4 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={selectedDrawings.length > 0 && selectedDrawings.length === currentDrawings.filter(d => d.name.toLowerCase().endsWith('.pdf')).length}
                                                onChange={(e) => {
                                                    const pdfDrawings = currentDrawings.filter(d => d.name.toLowerCase().endsWith('.pdf'));
                                                    if (e.target.checked) {
                                                        setSelectedDrawings(pdfDrawings.map(d => d.id));
                                                    } else {
                                                        setSelectedDrawings([]);
                                                    }
                                                }}
                                                className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                                                title="Select all PDFs"
                                            />
                                        </th>
                                    )}
                                    {isModulePackages && (
                                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                                            Status
                                        </th>
                                    )}
                                    <th 
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                        onClick={() => handleSort('fileName')}
                                    >
                                        File Name {sortColumn === 'fileName' && (sortDirection === 'asc' ? '▲' : '▼')}
                                    </th>
                                    {isModulePackages && (
                                        <>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('serialNumber')}
                                            >
                                                Serial No. {sortColumn === 'serialNumber' && (sortDirection === 'asc' ? '▲' : '▼')}
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('buildSequence')}
                                            >
                                                Build Seq {sortColumn === 'buildSequence' && (sortDirection === 'asc' ? '▲' : '▼')}
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('hitchBLM')}
                                            >
                                                Hitch BLM {sortColumn === 'hitchBLM' && (sortDirection === 'asc' ? '▲' : '▼')}
                                            </th>
                                            <th 
                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                                                onClick={() => handleSort('rearBLM')}
                                            >
                                                Rear BLM {sortColumn === 'rearBLM' && (sortDirection === 'asc' ? '▲' : '▼')}
                                            </th>
                                        </>
                                    )}
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Version</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {sortedDrawings.map(drawing => {
                                    const latestVersion = getLatestVersion(drawing);
                                    // Parse module ID from filename
                                    const parsedModule = window.MODA_SUPABASE_DRAWINGS?.utils?.parseModuleFromFilename?.(drawing.name);
                                    // Find linked module data from project
                                    const linkedModule = parsedModule ? findModuleByBLM(parsedModule) : null;
                                    
                                    const isPdf = drawing.name.toLowerCase().endsWith('.pdf');
                                    const isSelected = selectedDrawings.includes(drawing.id);
                                    // Check if drawing is unlinked (has parsed BLM but no matching module)
                                    const isUnlinked = isModulePackages && parsedModule && !linkedModule;
                                    
                                    return (
                                        <tr key={drawing.id} className="hover:bg-gray-50">
                                            {window.MODA_SUPABASE?.client && (
                                                <td className="px-4 py-4">
                                                    {isPdf && (
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedDrawings([...selectedDrawings, drawing.id]);
                                                                } else {
                                                                    setSelectedDrawings(selectedDrawings.filter(id => id !== drawing.id));
                                                                }
                                                            }}
                                                            className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                                                            title="Select for Claude Vision OCR"
                                                        />
                                                    )}
                                                </td>
                                            )}
                                            {isModulePackages && (
                                                <td className="px-2 py-4 text-center">
                                                    {(() => {
                                                        // Check if this module has open shop-drawing issues
                                                        const hasOpenIssue = linkedModule?.id && 
                                                            window.MODA_ISSUE_ROUTING?.moduleHasOpenShopDrawingIssue?.(linkedModule.id);
                                                        const issueCount = hasOpenIssue ? 
                                                            window.MODA_ISSUE_ROUTING?.getOpenShopDrawingIssuesForModule?.(linkedModule.id)?.length || 0 : 0;
                                                        
                                                        return hasOpenIssue ? (
                                                            <span 
                                                                className="inline-block w-3 h-3 rounded-full bg-amber-400 border border-amber-500"
                                                                title={`${issueCount} open shop drawing issue${issueCount > 1 ? 's' : ''}`}
                                                            ></span>
                                                        ) : (
                                                            <span 
                                                                className="inline-block w-3 h-3 rounded-full bg-green-300/50 border border-green-400/30"
                                                                title="No issues reported"
                                                            ></span>
                                                        );
                                                    })()}
                                                </td>
                                            )}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="icon-file w-5 h-5 text-gray-400"></span>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => latestVersion && handleView(latestVersion, e)}
                                                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition cursor-pointer text-left touch-manipulation"
                                                                style={{ WebkitTapHighlightColor: 'transparent' }}
                                                                title="Click to view drawing"
                                                            >
                                                                {drawing.name}
                                                            </button>
                                                            {parsedModule && !isModulePackages && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800" title="Parsed module from filename">
                                                                    {parsedModule}
                                                                </span>
                                                            )}
                                                            {isUnlinked && (
                                                                <span 
                                                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 cursor-pointer hover:bg-red-200" 
                                                                    title="No matching module found in project. Click to link manually."
                                                                    onClick={() => setShowEditDrawing(drawing)}
                                                                >
                                                                    Unlinked
                                                                </span>
                                                            )}
                                                        </div>
                                                        {drawing.description && (
                                                            <div className="text-sm text-gray-500">{drawing.description}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            {isModulePackages && (
                                                <>
                                                    <td className="px-4 py-4 text-sm text-gray-700 font-medium">
                                                        {linkedModule?.serialNumber || <span className="text-gray-400">-</span>}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-gray-500">
                                                        {linkedModule?.buildSequence || <span className="text-gray-400">-</span>}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {linkedModule?.hitchBLM ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                                                {linkedModule.hitchBLM}
                                                            </span>
                                                        ) : parsedModule ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800" title="Parsed from filename">
                                                                {parsedModule}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {linkedModule?.rearBLM ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                {linkedModule.rearBLM}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                            <td className="px-3 py-3">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    v{latestVersion?.version || '1.0'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-gray-500">
                                                {formatDate(latestVersion?.uploaded_at || latestVersion?.uploadedAt || drawing.created_at || drawing.createdAt)}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => setShowFileInfo({ drawing, latestVersion, linkedModule, parsedModule })}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition touch-manipulation"
                                                        title="File Info"
                                                    >
                                                        <span className="icon-info-circle w-4 h-4"></span>
                                                    </button>
                                                    <button
                                                        onClick={() => setShowEditDrawing(drawing)}
                                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition touch-manipulation"
                                                        title="Edit / Rename"
                                                    >
                                                        <span className="icon-edit w-4 h-4"></span>
                                                    </button>
                                                    {latestVersion && (
                                                        <button
                                                            onClick={(e) => handleView(latestVersion, e)}
                                                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition touch-manipulation"
                                                            title="View in Browser"
                                                        >
                                                            <span className="icon-eye w-4 h-4"></span>
                                                        </button>
                                                    )}
                                                    {/* PDF Viewer with Markup - disabled for now, saved for future development
                                                    {latestVersion && isPdf && (
                                                        <button
                                                            onClick={() => handleOpenInViewer(drawing, latestVersion)}
                                                            className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition touch-manipulation"
                                                            title="Open with Markup Tools"
                                                        >
                                                            <span className="icon-markup w-4 h-4"></span>
                                                        </button>
                                                    )}
                                                    */}
                                                    <button
                                                        onClick={() => setShowDeleteConfirm(drawing)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition touch-manipulation"
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
    const BULK_UPLOAD_WARNING_THRESHOLD = 20; // Show warning when selecting more than this many files
    
    const UploadModal = () => {
        const [files, setFiles] = useState([]);
        const [description, setDescription] = useState('');
        const [notes, setNotes] = useState('');
        const [dragActive, setDragActive] = useState(false);
        const [uploadCategory, setUploadCategory] = useState(selectedCategory || '');
        const [uploadDiscipline, setUploadDiscipline] = useState(selectedDiscipline || '');
        const [bulkWarningAcknowledged, setBulkWarningAcknowledged] = useState(false);
        
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
                                {uploadProgress.timeRemaining && uploadProgress.timeRemaining > 1000 && (
                                    <p className="text-xs text-blue-600 mt-1">
                                        Est. time remaining: {Math.ceil(uploadProgress.timeRemaining / 60000)} min {Math.ceil((uploadProgress.timeRemaining % 60000) / 1000)} sec
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
                        
                        {/* Bulk Upload Warning */}
                        {files.length > BULK_UPLOAD_WARNING_THRESHOLD && !bulkWarningAcknowledged && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <span className="icon-alert-triangle w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"></span>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-medium text-amber-800">Large Batch Detected</h4>
                                        <p className="text-sm text-amber-700 mt-1">
                                            You've selected {files.length} files. For best reliability, consider uploading in batches of 20 or fewer.
                                        </p>
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={() => setBulkWarningAcknowledged(true)}
                                                className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 transition"
                                            >
                                                Continue Anyway
                                            </button>
                                            <button
                                                onClick={() => setFiles([])}
                                                className="px-3 py-1.5 text-sm bg-white border border-amber-300 text-amber-700 rounded hover:bg-amber-50 transition"
                                            >
                                                Clear Selection
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Selected Files */}
                        {files.length > 0 && (files.length <= BULK_UPLOAD_WARNING_THRESHOLD || bulkWarningAcknowledged) && (
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-medium text-gray-700">Selected Files ({files.length})</h4>
                                    <button
                                        onClick={() => { setFiles([]); setBulkWarningAcknowledged(false); }}
                                        className="text-xs text-gray-500 hover:text-red-600"
                                    >
                                        Clear all
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {files.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm">
                                            <span className="truncate">{file.name}</span>
                                            <span className="text-gray-400 ml-2">{formatFileSize(file.size)}</span>
                                        </div>
                                    ))}
                                </div>
                                {files.length > 5 && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        Total size: {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
                                    </p>
                                )}
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
    // RENDER: Duplicate File Prompt Modal
    // =========================================================================
    const DuplicatePromptModal = () => {
        if (!showDuplicatePrompt) return null;
        
        const { file, existingDrawing, onAction, remainingDuplicates } = showDuplicatePrompt;
        const existingVersion = existingDrawing.versions?.[0];
        const hasMoreFiles = remainingDuplicates > 0;
        
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                <span className="icon-file w-6 h-6 text-amber-600"></span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Duplicate File Detected</h2>
                                <p className="text-sm text-gray-600">A file with this name already exists</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6">
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <p className="font-medium text-gray-900 mb-2">{file.name}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">New File</p>
                                    <p className="text-gray-700">{formatFileSize(file.size)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Existing File</p>
                                    <p className="text-gray-700">
                                        {formatFileSize(existingVersion?.file_size)} • v{existingVersion?.version || '1.0'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <p className="text-gray-700 mb-4">What would you like to do?</p>
                        
                        <div className="space-y-3">
                            {/* Add as New Version */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onAction('newVersion')}
                                    className="flex-1 p-4 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200">
                                            <span className="icon-history w-5 h-5 text-blue-600"></span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Add as New Version</p>
                                            <p className="text-sm text-gray-500">Keep existing and add as new version</p>
                                        </div>
                                    </div>
                                </button>
                                {hasMoreFiles && (
                                    <button
                                        onClick={() => onAction('newVersionAll')}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium whitespace-nowrap"
                                        title="Apply to all remaining duplicates"
                                    >
                                        Apply to All
                                    </button>
                                )}
                            </div>
                            
                            {/* Skip This File */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onAction('skip')}
                                    className="flex-1 p-4 text-left border-2 border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200">
                                            <span className="icon-close w-5 h-5 text-gray-600"></span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Skip This File</p>
                                            <p className="text-sm text-gray-500">Don't upload, keep existing</p>
                                        </div>
                                    </div>
                                </button>
                                {hasMoreFiles && (
                                    <button
                                        onClick={() => onAction('skipAll')}
                                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-medium whitespace-nowrap"
                                        title="Skip all remaining duplicates"
                                    >
                                        Skip All
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        {hasMoreFiles && (
                            <p className="text-xs text-gray-500 mt-4 text-center">
                                {remainingDuplicates} more duplicate{remainingDuplicates > 1 ? 's' : ''} remaining
                            </p>
                        )}
                    </div>
                </div>
            </div>
        );
    };
    
    // =========================================================================
    // RENDER: Delete Confirmation Modal (Soft Delete with Recovery Option)
    // =========================================================================
    const DeleteConfirmModal = () => {
        if (!showDeleteConfirm) return null;
        
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                    <div className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                <span className="icon-trash w-6 h-6 text-amber-600"></span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Delete Drawing?</h2>
                                <p className="text-sm text-gray-600">File will be hidden but can be recovered</p>
                            </div>
                        </div>
                        <p className="text-gray-700 mb-2">
                            Are you sure you want to delete <strong>{showDeleteConfirm.name}</strong>?
                        </p>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                            <p className="text-sm text-blue-800">
                                <strong>Recovery Available:</strong> The file will remain in SharePoint and can be restored by an admin if needed.
                            </p>
                        </div>
                    </div>
                    <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                        <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                await handleDeleteDrawing(showDeleteConfirm.id);
                                await logDrawingActivity('delete', showDeleteConfirm.id, {
                                    name: showDeleteConfirm.name,
                                    versions: showDeleteConfirm.versions?.length || 1
                                });
                            }}
                            className="px-4 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-lg transition"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    // =========================================================================
    // RENDER: Edit Drawing Modal (Rename, Link to Module, View Activity)
    // =========================================================================
    const EditDrawingModal = () => {
        const [newName, setNewName] = useState(showEditDrawing?.name || '');
        const [linkedModuleId, setLinkedModuleId] = useState(showEditDrawing?.linked_module_id || '');
        const [isSaving, setIsSaving] = useState(false);
        
        if (!showEditDrawing) return null;
        
        const parsedModule = window.MODA_SUPABASE_DRAWINGS?.utils?.parseModuleFromFilename?.(showEditDrawing.name);
        const currentLinkedModule = parsedModule ? findModuleByBLM(parsedModule) : null;
        const projectModules = selectedProject?.modules || [];
        
        const handleSave = async () => {
            setIsSaving(true);
            try {
                // Update drawing name in database
                if (newName !== showEditDrawing.name) {
                    await window.MODA_SUPABASE_DRAWINGS.drawings.update(showEditDrawing.id, {
                        name: newName,
                        linked_module_id: linkedModuleId || null
                    });
                    
                    // Log activity
                    await logDrawingActivity('rename', showEditDrawing.id, {
                        oldName: showEditDrawing.name,
                        newName: newName,
                        linkedModuleId: linkedModuleId
                    });
                }
                
                // Refresh drawings list
                const drawings = await window.MODA_SUPABASE_DRAWINGS.drawings.getByProjectAndDiscipline(
                    selectedProject.id, 
                    selectedDiscipline
                );
                setCurrentDrawings(drawings);
                setShowEditDrawing(null);
            } catch (error) {
                console.error('[Drawings] Error updating drawing:', error);
                alert('Error updating drawing: ' + error.message);
            } finally {
                setIsSaving(false);
            }
        };
        
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="icon-edit w-6 h-6 text-blue-600"></span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Edit Drawing</h2>
                                <p className="text-sm text-gray-600">Rename or link to a module</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        {/* Current Status */}
                        {!currentLinkedModule && parsedModule && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-amber-800">
                                    <span className="icon-alert w-5 h-5"></span>
                                    <span className="font-medium">Unlinked Drawing</span>
                                </div>
                                <p className="text-sm text-amber-700 mt-1">
                                    Parsed BLM "{parsedModule}" does not match any module in this project.
                                    Rename the file or manually link to a module below.
                                </p>
                            </div>
                        )}
                        
                        {/* File Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                File Name
                            </label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., B1L3M18 - Shops.pdf"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Include the BLM ID in the filename for automatic linking (e.g., B1L3M18)
                            </p>
                        </div>
                        
                        {/* Manual Module Link */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Link to Module (Optional)
                            </label>
                            <select
                                value={linkedModuleId}
                                onChange={(e) => setLinkedModuleId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">-- Auto-detect from filename --</option>
                                {projectModules.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.serialNumber} - Seq #{m.buildSequence} ({m.hitchBLM}/{m.rearBLM})
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Override automatic BLM detection by selecting a specific module
                            </p>
                        </div>
                        
                        {/* Current Link Status */}
                        {currentLinkedModule && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-emerald-800">
                                    <span className="icon-check w-5 h-5"></span>
                                    <span className="font-medium">Currently Linked</span>
                                </div>
                                <p className="text-sm text-emerald-700 mt-1">
                                    {currentLinkedModule.serialNumber} - Build Seq #{currentLinkedModule.buildSequence}
                                </p>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                        <button
                            onClick={() => setShowEditDrawing(null)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            disabled={isSaving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !newName.trim()}
                            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    // =========================================================================
    // RENDER: Bulk Rename Modal (Fix Unlinked Drawings)
    // =========================================================================
    const BulkRenameModal = () => {
        const [selectedItems, setSelectedItems] = useState(
            // Pre-select items that have a recommended name
            unlinkedDrawings.filter(u => u.recommendedName).map(u => u.drawing.id)
        );
        const [isProcessing, setIsProcessing] = useState(false);
        const [processedCount, setProcessedCount] = useState(0);
        
        if (!showBulkRenameModal) return null;
        
        const itemsWithRecommendation = unlinkedDrawings.filter(u => u.recommendedName);
        const itemsWithoutRecommendation = unlinkedDrawings.filter(u => !u.recommendedName);
        
        const toggleItem = (drawingId) => {
            setSelectedItems(prev => 
                prev.includes(drawingId) 
                    ? prev.filter(id => id !== drawingId)
                    : [...prev, drawingId]
            );
        };
        
        const selectAll = () => {
            setSelectedItems(itemsWithRecommendation.map(u => u.drawing.id));
        };
        
        const selectNone = () => {
            setSelectedItems([]);
        };
        
        const handleApplyRenames = async () => {
            const itemsToRename = unlinkedDrawings.filter(u => 
                selectedItems.includes(u.drawing.id) && u.recommendedName
            );
            
            if (itemsToRename.length === 0) return;
            
            setIsProcessing(true);
            setProcessedCount(0);
            
            try {
                for (let i = 0; i < itemsToRename.length; i++) {
                    const { drawing, recommendedName, recommendedModule } = itemsToRename[i];
                    
                    // Only update the name - module linking is done by filename matching, not by ID
                    await window.MODA_SUPABASE_DRAWINGS.drawings.update(drawing.id, {
                        name: recommendedName
                    });
                    
                    await logDrawingActivity('rename', drawing.id, {
                        oldName: drawing.name,
                        newName: recommendedName,
                        linkedModuleSerial: recommendedModule?.serialNumber,
                        bulkRename: true
                    });
                    
                    setProcessedCount(i + 1);
                }
                
                // Refresh drawings list
                const drawings = await window.MODA_SUPABASE_DRAWINGS.drawings.getByProjectAndDiscipline(
                    selectedProject.id, 
                    selectedDiscipline
                );
                setCurrentDrawings(drawings);
                setShowBulkRenameModal(false);
            } catch (error) {
                console.error('[Drawings] Error in bulk rename:', error);
                alert('Error renaming files: ' + error.message);
            } finally {
                setIsProcessing(false);
            }
        };
        
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                <span className="icon-edit w-6 h-6 text-amber-600"></span>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-bold text-gray-900">Fix Unlinked Drawings</h2>
                                <p className="text-sm text-gray-600">
                                    {unlinkedDrawings.length} drawing{unlinkedDrawings.length !== 1 ? 's' : ''} not linked to project modules
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Items with recommendations */}
                        {itemsWithRecommendation.length > 0 && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-medium text-gray-900">
                                        Recommended Renames ({itemsWithRecommendation.length})
                                    </h3>
                                    <div className="flex gap-2 text-sm">
                                        <button onClick={selectAll} className="text-blue-600 hover:underline">Select All</button>
                                        <span className="text-gray-300">|</span>
                                        <button onClick={selectNone} className="text-gray-600 hover:underline">Select None</button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {itemsWithRecommendation.map(({ drawing, recommendedName, recommendedModule }) => (
                                        <div 
                                            key={drawing.id}
                                            className={`p-3 rounded-lg border transition cursor-pointer ${
                                                selectedItems.includes(drawing.id) 
                                                    ? 'border-blue-500 bg-blue-50' 
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                            onClick={() => toggleItem(drawing.id)}
                                        >
                                            <div className="flex items-start gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.includes(drawing.id)}
                                                    onChange={() => toggleItem(drawing.id)}
                                                    className="mt-1 w-4 h-4 rounded"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="text-gray-500 truncate">{drawing.name}</span>
                                                        <span className="text-gray-400">→</span>
                                                        <span className="font-medium text-gray-900 truncate">{recommendedName}</span>
                                                    </div>
                                                    {recommendedModule && (
                                                        <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                                            <span className="icon-check w-3 h-3"></span>
                                                            Links to: {recommendedModule.serialNumber} (Seq #{recommendedModule.buildSequence})
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Items without recommendations */}
                        {itemsWithoutRecommendation.length > 0 && (
                            <div>
                                <h3 className="font-medium text-gray-900 mb-3">
                                    Manual Review Required ({itemsWithoutRecommendation.length})
                                </h3>
                                <div className="space-y-2">
                                    {itemsWithoutRecommendation.map(({ drawing, parsedBLM, hasConflict }) => (
                                        <div 
                                            key={drawing.id}
                                            className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{drawing.name}</p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {hasConflict 
                                                            ? '⚠️ Recommended name conflicts with existing file'
                                                            : parsedBLM 
                                                                ? `Parsed BLM "${parsedBLM}" not found in project`
                                                                : 'No BLM pattern detected in filename'
                                                        }
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowBulkRenameModal(false);
                                                        setShowEditDrawing(drawing);
                                                    }}
                                                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="p-6 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            {selectedItems.length} of {itemsWithRecommendation.length} selected
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBulkRenameModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                disabled={isProcessing}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApplyRenames}
                                disabled={isProcessing || selectedItems.length === 0}
                                className="px-4 py-2 bg-amber-500 text-white hover:bg-amber-600 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {isProcessing ? (
                                    <>
                                        <span className="animate-spin">⏳</span>
                                        Renaming {processedCount}/{selectedItems.length}...
                                    </>
                                ) : (
                                    <>
                                        <span className="icon-check w-4 h-4"></span>
                                        Apply {selectedItems.length} Rename{selectedItems.length !== 1 ? 's' : ''}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    
    // =========================================================================
    // RENDER: File Info Modal (with Version History)
    // =========================================================================
    const FileInfoModal = () => {
        if (!showFileInfo) return null;
        
        const { drawing, latestVersion, linkedModule, parsedModule } = showFileInfo;
        
        // Sort versions by date descending (newest first)
        const sortedVersions = [...(drawing.versions || [])].sort((a, b) => 
            new Date(b.uploaded_at || b.uploadedAt) - new Date(a.uploaded_at || a.uploadedAt)
        );
        
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <span className="icon-info w-6 h-6 text-blue-600"></span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-bold text-gray-900 truncate">{drawing.name}</h2>
                                <p className="text-sm text-gray-600">File Information & Version History</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">File Size</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {formatFileSize(latestVersion?.file_size || latestVersion?.fileSize)}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Current Version</p>
                                <p className="text-sm font-medium text-gray-900">
                                    v{latestVersion?.version || '1.0'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">File Type</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {drawing.name.split('.').pop()?.toUpperCase() || 'Unknown'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Total Versions</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {drawing.versions?.length || 1}
                                </p>
                            </div>
                        </div>
                        
                        <div className="border-t border-gray-200 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Uploaded By</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {latestVersion?.uploaded_by || latestVersion?.uploadedBy || drawing.created_by || 'Unknown'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Last Updated</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {formatDate(latestVersion?.uploaded_at || latestVersion?.uploadedAt || drawing.created_at)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        {isModulePackages && (
                            <div className="border-t border-gray-200 pt-4">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Module Link</p>
                                {linkedModule ? (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <span className="text-emerald-600">Serial No:</span>
                                                <span className="ml-1 font-medium text-emerald-800">{linkedModule.serialNumber}</span>
                                            </div>
                                            <div>
                                                <span className="text-emerald-600">Build Seq:</span>
                                                <span className="ml-1 font-medium text-emerald-800">#{linkedModule.buildSequence}</span>
                                            </div>
                                            <div>
                                                <span className="text-emerald-600">Hitch BLM:</span>
                                                <span className="ml-1 font-medium text-emerald-800">{linkedModule.hitchBLM || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-emerald-600">Rear BLM:</span>
                                                <span className="ml-1 font-medium text-emerald-800">{linkedModule.rearBLM || '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : parsedModule ? (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                        <p className="text-sm text-amber-800">
                                            <span className="font-medium">Unlinked:</span> Parsed BLM "{parsedModule}" does not match any module.
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500">No module ID detected in filename</p>
                                )}
                            </div>
                        )}
                        
                        {/* Version History Section */}
                        <div className="border-t border-gray-200 pt-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Version History</p>
                            {sortedVersions.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {sortedVersions.map((version, index) => {
                                        const isLatest = index === 0;
                                        return (
                                            <div 
                                                key={version.id || index}
                                                className={`flex items-center justify-between p-3 rounded-lg border ${
                                                    isLatest ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                                                }`}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-medium ${isLatest ? 'text-blue-700' : 'text-gray-700'}`}>
                                                            v{version.version || '1.0'}
                                                        </span>
                                                        {isLatest && (
                                                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                                                Current
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {formatDate(version.uploaded_at || version.uploadedAt)} 
                                                        {(version.uploaded_by || version.uploadedBy) && (
                                                            <span> by {version.uploaded_by || version.uploadedBy}</span>
                                                        )}
                                                    </div>
                                                    {version.notes && (
                                                        <div className="text-xs text-gray-600 mt-1 italic">
                                                            {version.notes}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 ml-2">
                                                    <button
                                                        onClick={(e) => handleView(version, e)}
                                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition"
                                                        title="View this version"
                                                    >
                                                        <span className="icon-eye w-4 h-4"></span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 italic">No version history available</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="p-6 border-t border-gray-200 flex justify-end">
                        <button
                            onClick={() => setShowFileInfo(null)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition"
                        >
                            Close
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
        <div className={`bg-white rounded-lg shadow-sm ${isMobile ? 'p-2' : 'p-3'}`}>
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
                        {uploadProgress.timeRemaining && uploadProgress.timeRemaining > 1000 && (
                            <p className="text-xs text-blue-600 mt-2">
                                Est. time remaining: {Math.ceil(uploadProgress.timeRemaining / 60000)} min {Math.ceil((uploadProgress.timeRemaining % 60000) / 1000)} sec
                            </p>
                        )}
                        <button
                            onClick={() => {
                                uploadCancelledRef.current = true;
                                setUploadProgress(null);
                                setShowUploadModal(false);
                            }}
                            className="mt-4 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition border border-red-200"
                        >
                            Cancel Upload
                        </button>
                    </div>
                </div>
            )}
            
            {/* Sheet Processing Overlay */}
            {processingDrawing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
                        <h3 className="font-medium text-gray-900">Processing Sheets...</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Splitting PDF and extracting title block metadata
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                            This may take several minutes for large files
                        </p>
                    </div>
                </div>
            )}
            
            {/* Modals */}
            {showUploadModal && <UploadModal />}
            <VersionHistoryModal />
            <DeleteConfirmModal />
            <DuplicatePromptModal />
            <EditDrawingModal />
            <BulkRenameModal />
            <FileInfoModal />
            <FolderModal />
            <DeleteFolderConfirmModal />
            
            {/* PDF Viewer with Markup - disabled for now */}
            {pdfViewerData && window.PDFViewerModal && (
                <window.PDFViewerModal
                    isOpen={true}
                    onClose={() => setPdfViewerData(null)}
                    pdfUrl={pdfViewerData.url}
                    drawingName={pdfViewerData.name}
                    drawingId={pdfViewerData.drawingId}
                    versionId={pdfViewerData.versionId}
                />
            )}
            
            {/* Drawing Status Log Matrix */}
            {showDrawingStatusLog && window.DrawingStatusLog && (
                <window.DrawingStatusLog
                    project={selectedProject}
                    drawings={currentDrawings}
                    onClose={() => setShowDrawingStatusLog(false)}
                    onNavigateToDrawing={(drawing) => {
                        setShowDrawingStatusLog(false);
                        setDrawingSearchTerm(drawing.name);
                    }}
                />
            )}
            
            {/* Sheet Browser */}
            {showSheetBrowser && window.SheetBrowser && (
                <window.SheetBrowser
                    projectId={selectedProject?.id}
                    projectName={selectedProject?.name}
                    modules={selectedProject?.modules || []}
                    onClose={() => setShowSheetBrowser(false)}
                    auth={auth}
                />
            )}
            
            {/* Analysis Browser (Walls, Fixtures, Changes) */}
            {showAnalysisBrowser && window.AnalysisBrowser && (
                <window.AnalysisBrowser
                    projectId={selectedProject?.id}
                    projectName={selectedProject?.name}
                    analysisType={showAnalysisBrowser}
                    onClose={() => setShowAnalysisBrowser(null)}
                    auth={auth}
                />
            )}
            
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
