/**
 * ModuleLinkSelector Component for MODA
 * 
 * Multi-select module picker with comprehensive search functionality.
 * Searches across: Serial Number, Hitch BLM, Rear BLM, Unit Type, 
 * Room Number, Room Type, Difficulty Indicators, and other module details.
 * 
 * Displays linked modules in format: "SERIAL - HITCH BLM / REAR BLM"
 */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

function ModuleLinkSelector({
    projectId,
    projects = [],
    selectedModuleIds = [],
    onSelectionChange,
    maxSelections = null,
    disabled = false,
    placeholder = "Search modules by serial, BLM, unit type, room..."
}) {
    // State
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);
    
    // Refs
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);
    const listRef = useRef(null);
    
    // Get modules from selected project
    const projectModules = useMemo(() => {
        if (!projectId) return [];
        const project = projects.find(p => p.id === projectId);
        return project?.modules || [];
    }, [projectId, projects]);
    
    // Get selected module objects
    const selectedModules = useMemo(() => {
        return projectModules.filter(m => selectedModuleIds.includes(m.id));
    }, [projectModules, selectedModuleIds]);
    
    // Format module display string: "SERIAL - HITCH BLM / REAR BLM" or "SERIAL - HITCH BLM" if identical
    const formatModuleDisplay = useCallback((module) => {
        if (!module) return '';
        const serial = module.serialNumber || module.serial_number || 'Unknown';
        const hitchBLM = module.hitchBLM || module.hitch_blm || '-';
        const rearBLM = module.rearBLM || module.rear_blm || '-';
        // If Hitch and Rear BLM are identical, only show one
        if (hitchBLM === rearBLM) {
            return `${serial} - ${hitchBLM}`;
        }
        return `${serial} - ${hitchBLM} / ${rearBLM}`;
    }, []);
    
    // Search/filter modules
    const filteredModules = useMemo(() => {
        if (!searchTerm.trim()) {
            return projectModules.sort((a, b) => (a.buildSequence || 0) - (b.buildSequence || 0));
        }
        
        const search = searchTerm.toLowerCase().trim();
        
        return projectModules.filter(m => {
            // Build searchable fields array
            const searchFields = [
                // Primary identifiers
                m.serialNumber || m.serial_number,
                m.hitchBLM || m.hitch_blm,
                m.rearBLM || m.rear_blm,
                m.blm_id || m.blmId,
                
                // Build sequence variations
                `M${m.buildSequence}`,
                `#${m.buildSequence}`,
                `${m.buildSequence}`,
                
                // Unit/Room info
                m.unitType || m.unit_type,
                m.roomNumber || m.room_number,
                m.roomType || m.room_type,
                m.hitchUnit || m.hitch_unit,
                m.rearUnit || m.rear_unit,
                
                // Difficulty indicators (if present)
                ...(m.difficultyIndicators || []),
                m.difficulty,
                
                // Additional searchable fields
                m.building,
                m.level,
                m.floor,
                m.wing,
                m.notes,
                m.description
            ].filter(Boolean).map(s => String(s).toLowerCase());
            
            // Check if any field contains the search term
            return searchFields.some(field => field.includes(search));
        }).sort((a, b) => (a.buildSequence || 0) - (b.buildSequence || 0));
    }, [projectModules, searchTerm]);
    
    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);
    
    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
            }
            return;
        }
        
        switch (e.key) {
            case 'Escape':
                setIsOpen(false);
                setFocusedIndex(-1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIndex(prev => 
                    prev < filteredModules.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case 'Enter':
                e.preventDefault();
                if (focusedIndex >= 0 && focusedIndex < filteredModules.length) {
                    toggleModule(filteredModules[focusedIndex]);
                }
                break;
        }
    };
    
    // Scroll focused item into view
    useEffect(() => {
        if (focusedIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll('[data-module-item]');
            if (items[focusedIndex]) {
                items[focusedIndex].scrollIntoView({ block: 'nearest' });
            }
        }
    }, [focusedIndex]);
    
    // Toggle module selection
    const toggleModule = (module) => {
        const isSelected = selectedModuleIds.includes(module.id);
        
        if (isSelected) {
            // Remove from selection
            onSelectionChange(selectedModuleIds.filter(id => id !== module.id));
        } else {
            // Add to selection (check max limit)
            if (maxSelections && selectedModuleIds.length >= maxSelections) {
                return; // At max capacity
            }
            onSelectionChange([...selectedModuleIds, module.id]);
        }
    };
    
    // Remove a specific module from selection
    const removeModule = (moduleId) => {
        onSelectionChange(selectedModuleIds.filter(id => id !== moduleId));
    };
    
    // Clear all selections
    const clearAll = () => {
        onSelectionChange([]);
    };
    
    // Get module details for display in dropdown
    const getModuleDetails = (module) => {
        const details = [];
        if (module.unitType || module.unit_type) {
            details.push(module.unitType || module.unit_type);
        }
        if (module.roomNumber || module.room_number) {
            details.push(`Room ${module.roomNumber || module.room_number}`);
        }
        if (module.roomType || module.room_type) {
            details.push(module.roomType || module.room_type);
        }
        return details.join(' | ');
    };
    
    // Render
    return (
        <div ref={containerRef} className="relative">
            {/* Trigger Button / Display Area */}
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                tabIndex={disabled ? -1 : 0}
                className={`
                    w-full min-h-[42px] px-3 py-2 border rounded-lg cursor-pointer
                    flex items-center justify-between gap-2
                    ${disabled 
                        ? 'bg-gray-100 border-gray-200 cursor-not-allowed' 
                        : 'bg-white border-gray-300 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                    }
                    ${isOpen ? 'border-blue-500 ring-2 ring-blue-500' : ''}
                `}
            >
                <div className="flex-1 min-w-0">
                    {selectedModuleIds.length === 0 ? (
                        <span className="text-gray-400 text-sm">{placeholder}</span>
                    ) : (
                        <span className="text-sm text-gray-700">
                            {selectedModuleIds.length} module{selectedModuleIds.length !== 1 ? 's' : ''} selected
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {selectedModuleIds.length > 0 && !disabled && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                clearAll();
                            }}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Clear all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            
            {/* Linked Modules Container */}
            {selectedModules.length > 0 && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-xs font-medium text-blue-700 mb-2">Linked Modules:</div>
                    <div className="flex flex-wrap gap-2">
                        {selectedModules.map(module => (
                            <div
                                key={module.id}
                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-blue-300 rounded-md text-sm"
                            >
                                <span className="text-gray-800 font-medium">
                                    {formatModuleDisplay(module)}
                                </span>
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={() => removeModule(module.id)}
                                        className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                                        title="Remove"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Dropdown */}
            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-200">
                        <div className="relative">
                            <svg 
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setFocusedIndex(-1);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="Search serial, BLM, unit type, room..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {/* Module List */}
                    <div 
                        ref={listRef}
                        className="max-h-64 overflow-y-auto"
                    >
                        {filteredModules.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500">
                                {searchTerm 
                                    ? 'No modules match your search' 
                                    : 'No modules available in this project'
                                }
                            </div>
                        ) : (
                            filteredModules.map((module, index) => {
                                const isSelected = selectedModuleIds.includes(module.id);
                                const isFocused = index === focusedIndex;
                                const details = getModuleDetails(module);
                                
                                return (
                                    <div
                                        key={module.id}
                                        data-module-item
                                        onClick={() => toggleModule(module)}
                                        className={`
                                            flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors
                                            ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                            ${isFocused ? 'bg-blue-100' : ''}
                                            border-b border-gray-100 last:border-b-0
                                        `}
                                    >
                                        {/* Checkbox */}
                                        <div className={`
                                            w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                                            ${isSelected 
                                                ? 'bg-blue-600 border-blue-600' 
                                                : 'border-gray-300'
                                            }
                                        `}>
                                            {isSelected && (
                                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        
                                        {/* Module Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-gray-500">
                                                    #{module.buildSequence || '?'}
                                                </span>
                                                <span className="text-sm font-semibold text-gray-900">
                                                    {formatModuleDisplay(module)}
                                                </span>
                                            </div>
                                            {details && (
                                                <div className="text-xs text-gray-500 mt-0.5 truncate">
                                                    {details}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Selected indicator */}
                                        {isSelected && (
                                            <span className="text-xs font-medium text-blue-600 flex-shrink-0">
                                                Selected
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                    
                    {/* Footer with count */}
                    <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                        <span>
                            {filteredModules.length} module{filteredModules.length !== 1 ? 's' : ''} 
                            {searchTerm && ' found'}
                        </span>
                        {maxSelections && (
                            <span>
                                {selectedModuleIds.length}/{maxSelections} selected
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Export to window for global access
window.ModuleLinkSelector = ModuleLinkSelector;
