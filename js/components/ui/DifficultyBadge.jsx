// ============================================================================
// MODA SHARED DIFFICULTY BADGE COMPONENT
// Centralized difficulty colors/labels to replace 116+ duplicate definitions
// ============================================================================

const DIFFICULTY_CONFIG = {
    sidewall: { 
        label: 'Sidewall', 
        abbrev: 'SW', 
        bg: 'bg-orange-100', 
        text: 'text-orange-800',
        border: 'border-orange-200',
        description: 'Module with sidewall construction'
    },
    stair: { 
        label: 'Stair', 
        abbrev: 'STAIR', 
        bg: 'bg-purple-100', 
        text: 'text-purple-800',
        border: 'border-purple-200',
        description: 'Module contains stairwell'
    },
    hr3Wall: { 
        label: '3HR Wall', 
        abbrev: '3HR', 
        bg: 'bg-red-100', 
        text: 'text-red-800',
        border: 'border-red-200',
        description: '3-hour fire-rated wall'
    },
    short: { 
        label: 'Short', 
        abbrev: 'SHORT', 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        description: 'Short module (reduced height)'
    },
    doubleStudio: { 
        label: 'Dbl Studio', 
        abbrev: 'DBL', 
        bg: 'bg-blue-100', 
        text: 'text-blue-800',
        border: 'border-blue-200',
        description: 'Double studio unit'
    },
    sawbox: { 
        label: 'Sawbox', 
        abbrev: 'SAWBOX', 
        bg: 'bg-green-100', 
        text: 'text-green-800',
        border: 'border-green-200',
        description: 'Sawbox construction type'
    },
    proto: { 
        label: 'Prototype', 
        abbrev: 'PROTO', 
        bg: 'bg-pink-100', 
        text: 'text-pink-800',
        border: 'border-pink-200',
        description: 'Prototype/first-of-kind module'
    }
};

// Heat map difficulty categories (for labor calculations)
const HEAT_MAP_CATEGORIES = {
    easy: { 
        label: 'Easy', 
        multiplier: 0.8, 
        bg: 'bg-green-100', 
        text: 'text-green-800',
        color: '#86efac'
    },
    average: { 
        label: 'Average', 
        multiplier: 1.0, 
        bg: 'bg-blue-100', 
        text: 'text-blue-800',
        color: '#93c5fd'
    },
    medium: { 
        label: 'Medium', 
        multiplier: 1.2, 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800',
        color: '#fde047'
    },
    hard: { 
        label: 'Hard', 
        multiplier: 1.4, 
        bg: 'bg-orange-100', 
        text: 'text-orange-800',
        color: '#fdba74'
    },
    very_hard: { 
        label: 'Very Hard', 
        multiplier: 1.6, 
        bg: 'bg-red-100', 
        text: 'text-red-800',
        color: '#fca5a5'
    }
};

// ============================================================================
// SINGLE DIFFICULTY BADGE
// ============================================================================

const DifficultyBadge = React.memo(function DifficultyBadge({ 
    type, 
    compact = false, 
    showBorder = false,
    className = '' 
}) {
    const config = DIFFICULTY_CONFIG[type];
    if (!config) return null;
    
    return (
        <span 
            className={`
                inline-flex items-center px-2 py-0.5 text-xs rounded font-medium
                ${config.bg} ${config.text}
                ${showBorder ? `border ${config.border}` : ''}
                ${className}
            `.trim()}
            title={config.description}
        >
            {compact ? config.abbrev : config.label}
        </span>
    );
});

// ============================================================================
// MULTIPLE DIFFICULTY BADGES
// Renders all active difficulties for a module
// ============================================================================

const DifficultyBadges = React.memo(function DifficultyBadges({ 
    difficulties, 
    compact = false,
    maxVisible = null,
    className = '' 
}) {
    // Get active difficulties
    const activeDifficulties = Object.entries(difficulties || {})
        .filter(([_, active]) => active)
        .map(([type]) => type);
    
    if (activeDifficulties.length === 0) return null;
    
    // Limit visible badges if maxVisible is set
    const visibleDifficulties = maxVisible 
        ? activeDifficulties.slice(0, maxVisible)
        : activeDifficulties;
    const hiddenCount = activeDifficulties.length - visibleDifficulties.length;
    
    return (
        <div className={`flex flex-wrap gap-1 ${className}`}>
            {visibleDifficulties.map(type => (
                <DifficultyBadge key={type} type={type} compact={compact} />
            ))}
            {hiddenCount > 0 && (
                <span 
                    className="inline-flex items-center px-2 py-0.5 text-xs rounded font-medium bg-gray-100 text-gray-600"
                    title={activeDifficulties.slice(maxVisible).map(t => DIFFICULTY_CONFIG[t]?.label).join(', ')}
                >
                    +{hiddenCount}
                </span>
            )}
        </div>
    );
});

// ============================================================================
// HEAT MAP CATEGORY BADGE
// For labor difficulty ratings
// ============================================================================

const HeatMapBadge = React.memo(function HeatMapBadge({ 
    category, 
    showMultiplier = false,
    className = '' 
}) {
    const config = HEAT_MAP_CATEGORIES[category];
    if (!config) return null;
    
    return (
        <span 
            className={`
                inline-flex items-center px-2 py-0.5 text-xs rounded font-medium
                ${config.bg} ${config.text}
                ${className}
            `.trim()}
        >
            {config.label}
            {showMultiplier && (
                <span className="ml-1 opacity-75">({config.multiplier}x)</span>
            )}
        </span>
    );
});

// ============================================================================
// DIFFICULTY COUNT SUMMARY
// Shows count of each difficulty type
// ============================================================================

const DifficultySummary = React.memo(function DifficultySummary({ 
    modules,
    className = '' 
}) {
    // Count difficulties across all modules
    const counts = React.useMemo(() => {
        const result = {};
        Object.keys(DIFFICULTY_CONFIG).forEach(key => {
            result[key] = 0;
        });
        
        (modules || []).forEach(module => {
            const difficulties = module.difficulties || {};
            Object.entries(difficulties).forEach(([type, active]) => {
                if (active && result[type] !== undefined) {
                    result[type]++;
                }
            });
        });
        
        return result;
    }, [modules]);
    
    // Filter to only show non-zero counts
    const activeCounts = Object.entries(counts).filter(([_, count]) => count > 0);
    
    if (activeCounts.length === 0) {
        return <span className="text-gray-400 text-sm">No difficulties</span>;
    }
    
    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {activeCounts.map(([type, count]) => {
                const config = DIFFICULTY_CONFIG[type];
                return (
                    <span 
                        key={type}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${config.bg} ${config.text}`}
                    >
                        <span className="font-bold">{count}</span>
                        <span>{config.abbrev}</span>
                    </span>
                );
            })}
        </div>
    );
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Get difficulty label by type
function getDifficultyLabel(type) {
    return DIFFICULTY_CONFIG[type]?.label || type;
}

// Get difficulty abbreviation by type
function getDifficultyAbbrev(type) {
    return DIFFICULTY_CONFIG[type]?.abbrev || type;
}

// Get all difficulty types
function getDifficultyTypes() {
    return Object.keys(DIFFICULTY_CONFIG);
}

// Check if module has any difficulties
function hasAnyDifficulty(difficulties) {
    return Object.values(difficulties || {}).some(v => v === true);
}

// Count active difficulties
function countDifficulties(difficulties) {
    return Object.values(difficulties || {}).filter(v => v === true).length;
}

// Export to window for global access
window.DifficultyBadge = DifficultyBadge;
window.DifficultyBadges = DifficultyBadges;
window.HeatMapBadge = HeatMapBadge;
window.DifficultySummary = DifficultySummary;
window.DIFFICULTY_CONFIG = DIFFICULTY_CONFIG;
window.HEAT_MAP_CATEGORIES = HEAT_MAP_CATEGORIES;
window.getDifficultyLabel = getDifficultyLabel;
window.getDifficultyAbbrev = getDifficultyAbbrev;
window.getDifficultyTypes = getDifficultyTypes;
window.hasAnyDifficulty = hasAnyDifficulty;
window.countDifficulties = countDifficulties;
