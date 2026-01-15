// ============================================================================
// MODA SHARED PROGRESS BAR COMPONENT
// Reusable progress indicators for consistency across the app
// ============================================================================

const ProgressBar = React.memo(function ProgressBar({ 
    value, 
    max = 100, 
    size = 'md',
    showLabel = false,
    labelPosition = 'right',
    color = 'auto',
    animate = true,
    className = ''
}) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    
    const sizeClasses = {
        xs: 'h-1',
        sm: 'h-1.5',
        md: 'h-2',
        lg: 'h-3',
        xl: 'h-4'
    };
    
    // Auto color based on percentage
    const getAutoColor = () => {
        if (percentage === 100) return 'bg-green-500';
        if (percentage >= 75) return 'bg-teal-500';
        if (percentage >= 50) return 'bg-blue-500';
        if (percentage >= 25) return 'bg-yellow-500';
        return 'bg-gray-400';
    };
    
    const colorClasses = {
        auto: getAutoColor(),
        teal: percentage === 100 ? 'bg-green-500' : 'bg-teal-500',
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        red: 'bg-red-500',
        yellow: 'bg-yellow-500',
        orange: 'bg-orange-500',
        purple: 'bg-purple-500',
        gray: 'bg-gray-500'
    };
    
    const barColor = colorClasses[color] || colorClasses.auto;
    
    const label = (
        <span className="text-xs text-gray-500 tabular-nums">
            {Math.round(percentage)}%
        </span>
    );
    
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {showLabel && labelPosition === 'left' && label}
            
            <div className={`flex-1 bg-gray-200 rounded-full ${sizeClasses[size]} overflow-hidden`}>
                <div 
                    className={`
                        ${sizeClasses[size]} rounded-full 
                        ${barColor}
                        ${animate ? 'transition-all duration-300 ease-out' : ''}
                    `.trim()}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            
            {showLabel && labelPosition === 'right' && label}
        </div>
    );
});

// ============================================================================
// STAGE PROGRESS BAR
// Specialized for production stage progress (0-100 per stage)
// ============================================================================

const StageProgressBar = React.memo(function StageProgressBar({ 
    progress = 0,
    stageName = '',
    size = 'sm',
    showPercentage = true,
    onClick,
    className = ''
}) {
    const percentage = Math.min(100, Math.max(0, progress));
    
    // Color based on progress
    const getColor = () => {
        if (percentage === 100) return 'bg-green-500';
        if (percentage > 0) return 'bg-teal-500';
        return 'bg-gray-300';
    };
    
    const sizeClasses = {
        xs: 'h-1',
        sm: 'h-2',
        md: 'h-3',
        lg: 'h-4'
    };
    
    return (
        <div 
            className={`group ${onClick ? 'cursor-pointer' : ''} ${className}`}
            onClick={onClick}
            title={stageName ? `${stageName}: ${percentage}%` : `${percentage}%`}
        >
            <div className={`bg-gray-200 rounded-full ${sizeClasses[size]} overflow-hidden ${onClick ? 'group-hover:bg-gray-300' : ''}`}>
                <div 
                    className={`${sizeClasses[size]} rounded-full transition-all duration-200 ${getColor()}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showPercentage && (
                <div className="text-xs text-gray-500 text-center mt-0.5">
                    {percentage}%
                </div>
            )}
        </div>
    );
});

// ============================================================================
// MULTI-STAGE PROGRESS
// Shows progress across multiple production stages
// ============================================================================

const MultiStageProgress = React.memo(function MultiStageProgress({ 
    stageProgress = {},
    stages = [],
    size = 'sm',
    showLabels = false,
    compact = false,
    className = ''
}) {
    // Calculate overall progress
    const stageCount = stages.length || Object.keys(stageProgress).length;
    const totalProgress = Object.values(stageProgress).reduce((sum, val) => sum + (val || 0), 0);
    const overallPercentage = stageCount > 0 ? Math.round(totalProgress / stageCount) : 0;
    
    if (compact) {
        // Single bar showing overall progress
        return (
            <ProgressBar 
                value={overallPercentage} 
                size={size}
                showLabel={showLabels}
                className={className}
            />
        );
    }
    
    // Individual bars for each stage
    const stageList = stages.length > 0 
        ? stages 
        : Object.keys(stageProgress).map(id => ({ id, name: id }));
    
    return (
        <div className={`flex gap-1 ${className}`}>
            {stageList.map(stage => {
                const stageId = typeof stage === 'string' ? stage : stage.id;
                const stageName = typeof stage === 'string' ? stage : stage.name;
                const progress = stageProgress[stageId] || 0;
                
                return (
                    <div key={stageId} className="flex-1" title={`${stageName}: ${progress}%`}>
                        <StageProgressBar 
                            progress={progress}
                            stageName={stageName}
                            size={size}
                            showPercentage={false}
                        />
                    </div>
                );
            })}
        </div>
    );
});

// ============================================================================
// CIRCULAR PROGRESS
// Circular/ring progress indicator
// ============================================================================

const CircularProgress = React.memo(function CircularProgress({ 
    value, 
    max = 100, 
    size = 40,
    strokeWidth = 4,
    color = 'teal',
    showLabel = true,
    className = ''
}) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    
    const colorClasses = {
        teal: 'text-teal-500',
        blue: 'text-blue-500',
        green: 'text-green-500',
        red: 'text-red-500',
        yellow: 'text-yellow-500',
        purple: 'text-purple-500'
    };
    
    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-gray-200"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className={`${colorClasses[color] || colorClasses.teal} transition-all duration-300`}
                />
            </svg>
            {showLabel && (
                <span className="absolute text-xs font-medium text-gray-700">
                    {Math.round(percentage)}%
                </span>
            )}
        </div>
    );
});

// Export to window for global access
window.ProgressBar = ProgressBar;
window.StageProgressBar = StageProgressBar;
window.MultiStageProgress = MultiStageProgress;
window.CircularProgress = CircularProgress;
