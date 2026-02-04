/**
 * Issue Submission Modal for MODA Engineering Issue Tracker
 * 
 * Modal form for submitting new engineering issues.
 * Can be opened with context (from module card) or standalone.
 * Supports photo attachments and priority/type selection.
 */

const { useState, useEffect, useRef, useCallback } = React;

function IssueSubmissionModal({
    context = null,
    projects = [],
    employees = [],
    auth = {},
    onSubmit,
    onClose
}) {
    // ===== CONSTANTS (from routing system) =====
    const ISSUE_TYPES = window.MODA_ISSUE_ROUTING?.ISSUE_TYPES || [
        { id: 'shop-drawing', label: 'Shop Drawing', color: '#0057B8' },
        { id: 'design-conflict', label: 'Design Conflict', color: '#7C3AED' },
        { id: 'material-supply', label: 'Material/Supply', color: '#EA580C' },
        { id: 'quality', label: 'Quality Issue', color: '#DC2626' },
        { id: 'engineering-question', label: 'Engineering Question', color: '#0891B2' },
        { id: 'rfi', label: 'RFI Required', color: '#4F46E5' },
        { id: 'automation', label: 'Automation', color: '#059669' },
        { id: 'other', label: 'Other', color: '#6B7280' }
    ];
    
    // Issue types that should show the module selector
    const MODULE_SELECTOR_TYPES = ['shop-drawing', 'design-conflict', 'engineering-question', 'rfi', 'automation'];
    
    // Issue types that should show the drawing discipline selector
    const DRAWING_DISCIPLINE_TYPES = ['shop-drawing', 'design-conflict', 'engineering-question', 'rfi'];
    
    // Drawing discipline options (from permit drawings folders)
    const DRAWING_DISCIPLINES = [
        'AOR Reference Submittal',
        'Architectural General Submittal',
        'Assembly Book Submittal',
        'Electrical Submittal',
        'Fire Alarm Data Submittal',
        'Fire Alarm Submittal',
        'Fire Sprinkler Submittal',
        'Mechanical Submittal',
        'Modular Architect Submittal',
        'Plumbing Submittal',
        'Sprinkler Submittal Plans',
        'Structural Documents',
        'Structural Plans Submittal',
        'Title 24'
    ];

    const PRIORITY_LEVELS = window.MODA_ISSUE_ROUTING?.PRIORITY_LEVELS || [
        { id: 'low', label: 'Low', color: '#10B981', description: 'Can wait' },
        { id: 'medium', label: 'Medium', color: '#F59E0B', description: 'Normal priority' },
        { id: 'high', label: 'High', color: '#EA580C', description: 'Needs attention' },
        { id: 'critical', label: 'Critical', color: '#DC2626', description: 'Blocking work' }
    ];
    
    // Get routing destination for selected issue type
    const getRoutingDestination = (issueType) => {
        if (!issueType) return null;
        return window.MODA_ISSUE_ROUTING?.getDashboardLabel?.(issueType) || 'Engineering';
    };

    // ===== STATE =====
    const [formData, setFormData] = useState({
        project_id: context?.project_id || '',
        project_name: context?.project_name || '',
        blm_id: context?.blm_id || '',
        unit_type: context?.unit_type || '',
        department: context?.department || '',
        stage: context?.stage || '',
        issue_type: '',
        issue_category: '',  // New: category within the issue type
        priority: 'medium',
        title: '',
        description: '',
        assigned_to_id: '',
        assigned_to: '',
        linked_module_ids: [],      // Array of module IDs for Shop Drawing issues
        linked_modules_display: '', // Display string for selected modules
        applies_to_unit_type: false, // If true, applies to all modules of selected unit type
        drawing_discipline: ''      // Drawing discipline for permit drawing linkage
    });

    const [photos, setPhotos] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [showProjectSelect, setShowProjectSelect] = useState(!context?.project_id);
    const [issueCategories, setIssueCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [titleSuggestions, setTitleSuggestions] = useState([]);
    const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
    // moduleSearchTerm removed - now handled by ModuleLinkSelector component

    const fileInputRef = useRef(null);
    const modalRef = useRef(null);

    // Get current user info
    const currentUser = {
        id: auth.userId || window.MODA_SUPABASE?.userProfile?.id || null,
        name: auth.userName || window.MODA_SUPABASE?.userProfile?.name || 
              window.MODA_SUPABASE?.userProfile?.email?.split('@')[0] || 'Unknown User'
    };

    // Engineering team members for assignment
    const engineeringTeam = employees.filter(e => 
        e.department?.toLowerCase().includes('engineering') ||
        e.role?.toLowerCase().includes('engineer')
    );

    // ===== EFFECTS =====
    useEffect(() => {
        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    useEffect(() => {
        // Lock body scroll
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    // Load issue categories from Supabase
    useEffect(() => {
        const loadCategories = async () => {
            setLoadingCategories(true);
            try {
                const supabase = window.MODA_SUPABASE?.client;
                if (supabase) {
                    const { data, error: fetchError } = await supabase
                        .from('issue_categories')
                        .select('*')
                        .eq('is_active', true)
                        .order('issue_type')
                        .order('sort_order');

                    if (fetchError) throw fetchError;
                    setIssueCategories(data || []);
                    localStorage.setItem('moda_issue_categories', JSON.stringify(data || []));
                } else {
                    // Fallback to localStorage
                    const saved = localStorage.getItem('moda_issue_categories');
                    if (saved) {
                        setIssueCategories(JSON.parse(saved));
                    }
                }
            } catch (err) {
                console.error('[IssueSubmissionModal] Error loading categories:', err);
                // Try localStorage fallback
                const saved = localStorage.getItem('moda_issue_categories');
                if (saved) {
                    setIssueCategories(JSON.parse(saved));
                }
            } finally {
                setLoadingCategories(false);
            }
        };
        loadCategories();
    }, []);

    // Get categories for the currently selected issue type
    const getCategoriesForType = useCallback((issueType) => {
        if (!issueType) return [];
        return issueCategories.filter(c => c.issue_type === issueType);
    }, [issueCategories]);
    
    // Generate title suggestions based on form data
    const generateTitleSuggestions = useCallback(() => {
        const suggestions = [];
        const issueTypeLabel = ISSUE_TYPES.find(t => t.id === formData.issue_type)?.label || '';
        const categoryObj = issueCategories.find(c => c.id === formData.issue_category);
        const categoryLabel = categoryObj?.name || '';
        
        // Get selected modules info
        const selectedProject = projects.find(p => p.id === formData.project_id);
        const modules = selectedProject?.modules || [];
        const selectedModules = modules.filter(m => formData.linked_module_ids.includes(m.id));
        const moduleCount = selectedModules.length;
        
        // Extract common BLM pattern (e.g., "M23" from B1L2M23, B1L3M23)
        const blmSuffixes = selectedModules.map(m => {
            const blm = m.hitchBLM || m.hitch_blm || '';
            const match = blm.match(/M\d+$/i);
            return match ? match[0].toUpperCase() : null;
        }).filter(Boolean);
        const uniqueSuffixes = [...new Set(blmSuffixes)];
        const commonSuffix = uniqueSuffixes.length === 1 ? uniqueSuffixes[0] : null;
        
        // Option 1: Issue Type + Category (primary recommendation)
        if (issueTypeLabel && categoryLabel) {
            suggestions.push(`${issueTypeLabel}: ${categoryLabel}`);
        }
        
        // Option 2: Category + Module info
        if (categoryLabel && moduleCount > 0) {
            if (moduleCount === 1) {
                const m = selectedModules[0];
                const serial = m.serialNumber || m.serial_number || '';
                suggestions.push(`${categoryLabel} - ${serial}`);
            } else if (commonSuffix) {
                suggestions.push(`${categoryLabel} - ${commonSuffix} modules (${moduleCount})`);
            } else {
                suggestions.push(`${categoryLabel} - ${moduleCount} modules`);
            }
        }
        
        // Option 3: Issue Type + Module pattern
        if (issueTypeLabel && commonSuffix && moduleCount > 1) {
            suggestions.push(`${issueTypeLabel}: ${commonSuffix} series`);
        }
        
        // Option 4: Just category if no modules
        if (categoryLabel && moduleCount === 0) {
            suggestions.push(categoryLabel);
        }
        
        // Option 5: Description-based (first 50 chars if description exists)
        if (formData.description && formData.description.length >= 10) {
            const descPreview = formData.description.substring(0, 50).trim();
            const truncated = descPreview.length < formData.description.length ? descPreview + '...' : descPreview;
            if (!suggestions.includes(truncated)) {
                suggestions.push(truncated);
            }
        }
        
        return suggestions.filter(Boolean).slice(0, 4); // Max 4 suggestions
    }, [formData, issueCategories, projects, ISSUE_TYPES]);
    
    // Update suggestions when relevant fields change
    useEffect(() => {
        const suggestions = generateTitleSuggestions();
        setTitleSuggestions(suggestions);
    }, [formData.issue_type, formData.issue_category, formData.linked_module_ids, formData.description, generateTitleSuggestions]);

    // ===== HANDLERS =====
    const handleChange = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            // Clear category when issue type changes
            if (field === 'issue_type') {
                updated.issue_category = '';
            }
            return updated;
        });
        setError(null);
    };

    const handleProjectChange = (projectId) => {
        const project = projects.find(p => p.id === projectId);
        setFormData(prev => ({
            ...prev,
            project_id: projectId,
            project_name: project?.name || ''
        }));
    };

    const handleAssigneeChange = (employeeId) => {
        const employee = employees.find(e => e.id === employeeId);
        setFormData(prev => ({
            ...prev,
            assigned_to_id: employeeId,
            assigned_to: employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : ''
        }));
    };

    const handlePhotoCapture = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Limit to 5 photos total
        const remaining = 5 - photos.length;
        const filesToProcess = files.slice(0, remaining);

        for (const file of filesToProcess) {
            try {
                // Compress and convert to base64
                const compressed = await compressImage(file);
                setPhotos(prev => [...prev, compressed]);
            } catch (err) {
                console.error('Error processing photo:', err);
            }
        }

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const compressImage = (file) => {
        return new Promise((resolve, reject) => {
            // Use MODA's photo compression if available
            if (window.compressPhoto) {
                window.compressPhoto(file, { maxWidth: 1200, quality: 0.8 })
                    .then(resolve)
                    .catch(reject);
                return;
            }

            // Fallback: simple base64 conversion
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const removePhoto = (index) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!formData.issue_type) {
            setError('Please select an issue type');
            return;
        }
        if (!formData.description.trim() || formData.description.trim().length < 5) {
            setError('Please provide a description (at least 5 characters)');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const issueData = {
                ...formData,
                photo_urls: photos,
                submitted_by: currentUser.name,
                submitted_by_id: currentUser.id
            };

            // Use routing system if available, otherwise fall back to onSubmit
            if (window.MODA_ISSUE_ROUTING?.createIssue) {
                console.log('[IssueSubmissionModal] Using routing system to create issue');
                const newIssue = await window.MODA_ISSUE_ROUTING.createIssue(issueData);
                const destination = getRoutingDestination(formData.issue_type);
                console.log('[IssueSubmissionModal] Issue created:', newIssue);
                setIsSubmitting(false);
                
                // Use toast notification instead of alert
                if (window.MODA_TOAST) {
                    window.MODA_TOAST.success(
                        `Issue ${newIssue.issue_display_id} submitted successfully!`,
                        { subtitle: `Routed to: ${destination}` }
                    );
                }
                onClose();
            } else if (onSubmit) {
                console.log('[IssueSubmissionModal] Using onSubmit callback');
                await onSubmit(issueData);
                setIsSubmitting(false);
                onClose();
            } else {
                console.error('[IssueSubmissionModal] No routing system or onSubmit available');
                setError('Issue routing system not available. Please refresh and try again.');
                setIsSubmitting(false);
            }
        } catch (err) {
            console.error('[IssueSubmissionModal] Error submitting issue:', err);
            setError(err.message || 'Failed to submit issue. Please try again.');
            setIsSubmitting(false);
        }
    };

    const handleBackdropClick = (e) => {
        // Intentionally disabled - clicking outside should NOT close this modal
        // Users must use Cancel button or X button to close
        // This prevents accidental data loss when filling out the form
    };

    // ===== RENDER =====
    return (
        <div 
            ref={modalRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Report Issue</h2>
                        {context?.blm_id && (
                            <p className="text-sm text-gray-500 mt-1">
                                Module: {context.blm_id} {context.unit_type && `(${context.unit_type})`}
                            </p>
                        )}
                        {formData.issue_type && (
                            <p className="text-sm text-blue-600 mt-1">
                                Will be routed to: <span className="font-semibold">{getRoutingDestination(formData.issue_type)}</span>
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        type="button"
                    >
                        <span className="icon-close" style={{ width: '20px', height: '20px', display: 'block' }}></span>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Context Info (if provided) */}
                    {context && (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-sm font-medium text-blue-800 mb-2">Issue Context</div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                {context.project_name && (
                                    <div>
                                        <span className="text-blue-600">Project:</span>{' '}
                                        <span className="text-blue-900">{context.project_name}</span>
                                    </div>
                                )}
                                {context.blm_id && (
                                    <div>
                                        <span className="text-blue-600">Module:</span>{' '}
                                        <span className="text-blue-900">{context.blm_id}</span>
                                    </div>
                                )}
                                {context.department && (
                                    <div>
                                        <span className="text-blue-600">Department:</span>{' '}
                                        <span className="text-blue-900">{context.department}</span>
                                    </div>
                                )}
                                {context.stage && (
                                    <div>
                                        <span className="text-blue-600">Stage:</span>{' '}
                                        <span className="text-blue-900">{context.stage}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Project Selection (if no context) */}
                    {showProjectSelect && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Project
                            </label>
                            <select
                                value={formData.project_id}
                                onChange={(e) => handleProjectChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a project...</option>
                                {(() => {
                                    // Separate active and completed projects, sort by project number (# column) descending
                                    const sortByProjectNumber = (a, b) => {
                                        const numA = parseInt(a.project_number) || 0;
                                        const numB = parseInt(b.project_number) || 0;
                                        if (numA !== numB) return numB - numA; // Descending (highest first)
                                        return (a.name || '').localeCompare(b.name || '');
                                    };
                                    const activeProjects = projects
                                        .filter(p => p.status !== 'Completed' && p.status !== 'completed')
                                        .sort(sortByProjectNumber);
                                    const completedProjects = projects
                                        .filter(p => p.status === 'Completed' || p.status === 'completed')
                                        .sort(sortByProjectNumber);
                                    
                                    return (
                                        <>
                                            {activeProjects.length > 0 && (
                                                <optgroup label="Active Projects">
                                                    {activeProjects.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.project_number ? `#${p.project_number} - ` : ''}{p.name}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {completedProjects.length > 0 && (
                                                <optgroup label="Completed Projects">
                                                    {completedProjects.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.project_number ? `#${p.project_number} - ` : ''}{p.name}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </>
                                    );
                                })()}
                            </select>
                        </div>
                    )}


                    {/* Issue Type */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Issue Type <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {ISSUE_TYPES.map(type => {
                                const destination = getRoutingDestination(type.id);
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => handleChange('issue_type', type.id)}
                                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                                            formData.issue_type === type.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        title={`Routes to ${destination}`}
                                    >
                                        <div 
                                            className="w-3 h-3 rounded-full mx-auto mb-1"
                                            style={{ backgroundColor: type.color }}
                                        ></div>
                                        <div className="text-xs font-medium text-gray-700">{type.label}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Issue Category - shown when issue type is selected */}
                    {formData.issue_type && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Issue Category
                            </label>
                            {loadingCategories ? (
                                <div className="text-sm text-gray-500 py-2">Loading categories...</div>
                            ) : getCategoriesForType(formData.issue_type).length > 0 ? (
                                <select
                                    value={formData.issue_category}
                                    onChange={(e) => handleChange('issue_category', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select a category...</option>
                                    {getCategoriesForType(formData.issue_type).map(cat => (
                                        <option key={cat.id} value={cat.name}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-sm text-gray-400 py-2 italic">
                                    No categories defined for this issue type
                                </div>
                            )}
                            {formData.issue_category && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {getCategoriesForType(formData.issue_type).find(c => c.name === formData.issue_category)?.description}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Module Link Selector - shown for all issue types when project is selected */}
                    {formData.project_id && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Link to Module(s) <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            {window.ModuleLinkSelector ? (
                                <ModuleLinkSelector
                                    projectId={formData.project_id}
                                    projects={projects}
                                    selectedModuleIds={formData.linked_module_ids}
                                    onSelectionChange={(newIds) => {
                                        // Get selected modules for display and auto-populate blm_id
                                        const selectedProject = projects.find(p => p.id === formData.project_id);
                                        const modules = selectedProject?.modules || [];
                                        const selectedModules = modules.filter(m => newIds.includes(m.id));
                                        const firstModule = selectedModules[0];
                                        
                                        // Build display string: "SERIAL - HITCH / REAR"
                                        const displayStr = selectedModules.map(m => {
                                            const serial = m.serialNumber || m.serial_number || 'Unknown';
                                            const hitch = m.hitchBLM || m.hitch_blm || '-';
                                            const rear = m.rearBLM || m.rear_blm || '-';
                                            return `${serial} - ${hitch} / ${rear}`;
                                        }).join(', ');
                                        
                                        setFormData(prev => ({
                                            ...prev,
                                            linked_module_ids: newIds,
                                            linked_modules_display: displayStr,
                                            blm_id: firstModule?.hitchBLM || firstModule?.hitch_blm || firstModule?.serialNumber || prev.blm_id
                                        }));
                                    }}
                                    placeholder="Search by serial, BLM, unit type, room..."
                                />
                            ) : (
                                <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">
                                    Module selector loading...
                                </div>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                Link this issue to specific modules. Issues will appear in module history and can be traced to shop drawings.
                            </p>
                        </div>
                    )}

                    {/* Drawing Discipline Selector - shown for specific issue types */}
                    {formData.project_id && DRAWING_DISCIPLINE_TYPES.includes(formData.issue_type) && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Link to Drawing Discipline <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <select
                                value={formData.drawing_discipline}
                                onChange={(e) => handleChange('drawing_discipline', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select a drawing discipline...</option>
                                {DRAWING_DISCIPLINES.map(discipline => (
                                    <option key={discipline} value={discipline}>
                                        {discipline}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Link this issue to a specific permit drawing discipline for reference.
                            </p>
                        </div>
                    )}

                    {/* Priority */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {PRIORITY_LEVELS.map(level => (
                                <button
                                    key={level.id}
                                    type="button"
                                    onClick={() => handleChange('priority', level.id)}
                                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                                        formData.priority === level.id
                                            ? 'border-current'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    style={{
                                        borderColor: formData.priority === level.id ? level.color : undefined,
                                        backgroundColor: formData.priority === level.id ? `${level.color}10` : undefined
                                    }}
                                >
                                    <div className="text-sm font-medium" style={{ color: level.color }}>
                                        {level.label}
                                    </div>
                                    <div className="text-xs text-gray-500">{level.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title with Suggestions */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title (optional)
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                onFocus={() => setShowTitleSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowTitleSuggestions(false), 200)}
                                placeholder="Brief summary of the issue"
                                maxLength={100}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {/* Title Suggestions Dropdown */}
                            {showTitleSuggestions && titleSuggestions.length > 0 && !formData.title && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                                        <span className="text-xs font-medium text-gray-500">Suggested titles:</span>
                                    </div>
                                    {titleSuggestions.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleChange('title', suggestion);
                                                setShowTitleSuggestions(false);
                                            }}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                                        >
                                            <span className="text-gray-800">{suggestion}</span>
                                            {idx === 0 && (
                                                <span className="ml-2 text-xs text-blue-600 font-medium">Recommended</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {titleSuggestions.length > 0 && !formData.title && !showTitleSuggestions && (
                            <p className="text-xs text-gray-500 mt-1">
                                Click to see suggested titles based on your selections
                            </p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description <span className="text-red-500">*</span>
                            <span className="text-gray-400 font-normal ml-2">
                                ({formData.description.length}/500)
                            </span>
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value.slice(0, 500))}
                            placeholder="Describe the issue in detail. What's wrong? Where is it? What impact does it have?"
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        {formData.description.length < 10 && formData.description.length > 0 && (
                            <p className="text-xs text-orange-600 mt-1">
                                Please provide at least 10 characters
                            </p>
                        )}
                    </div>

                    {/* Assign To */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Assign To (optional)
                        </label>
                        <select
                            value={formData.assigned_to_id}
                            onChange={(e) => handleAssigneeChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Unassigned - Engineering will triage</option>
                            {engineeringTeam.length > 0 && (
                                <optgroup label="Engineering Team">
                                    {engineeringTeam.map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.firstName} {e.lastName}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                            {employees.filter(e => !engineeringTeam.includes(e)).length > 0 && (
                                <optgroup label="Other Team Members">
                                    {employees.filter(e => !engineeringTeam.includes(e)).map(e => (
                                        <option key={e.id} value={e.id}>
                                            {e.firstName} {e.lastName}
                                        </option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    {/* Photos */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Photos (optional, max 5)
                        </label>
                        
                        {/* Photo Grid */}
                        {photos.length > 0 && (
                            <div className="grid grid-cols-5 gap-2 mb-3">
                                {photos.map((photo, index) => (
                                    <div key={index} className="relative aspect-square">
                                        <img
                                            src={photo}
                                            alt={`Photo ${index + 1}`}
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removePhoto(index)}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                                        >
                                            X
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Photo Button */}
                        {photos.length < 5 && (
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    multiple
                                    onChange={handlePhotoCapture}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="icon-camera" style={{ width: '20px', height: '20px', display: 'inline-block' }}></span>
                                    Add Photo ({photos.length}/5)
                                </button>
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        Submitting as: <span className="font-medium">{currentUser.name}</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !formData.issue_type || formData.description.trim().length < 5}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="animate-spin">...</span>
                                    Submitting...
                                </>
                            ) : (
                                'Submit Issue'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Export to window for global access
window.IssueSubmissionModal = IssueSubmissionModal;
