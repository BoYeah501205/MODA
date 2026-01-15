// ============================================================================
// MODA SHARED STATUS BADGE COMPONENT
// Reusable status/priority badges to replace 36+ duplicate implementations
// ============================================================================

const STATUS_VARIANTS = {
    // General statuses
    active: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    complete: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    completed: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    error: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    warning: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    info: { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200' },
    neutral: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
    
    // Production statuses
    scheduled: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
    inprogress: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
    'in-progress': { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
    
    // Project statuses
    planning: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    production: { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
    transport: { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
    onsite: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    
    // Priority levels
    low: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    high: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
    critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    urgent: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    
    // Boolean states
    yes: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    no: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
    true: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    false: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
    
    // QA statuses
    pass: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    fail: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
    hold: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
    
    // Transport statuses
    ready: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    staged: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
    intransit: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    'in-transit': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
    arrived: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
    delivered: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' }
};

const StatusBadge = React.memo(function StatusBadge({ 
    status, 
    label, 
    variant, 
    size = 'sm',
    showBorder = false,
    className = ''
}) {
    // Normalize the variant key
    const variantKey = (variant || status || 'neutral')
        .toString()
        .toLowerCase()
        .replace(/[\s_]+/g, '');
    
    const colors = STATUS_VARIANTS[variantKey] || STATUS_VARIANTS.neutral;
    
    const sizeClasses = {
        xs: 'px-1.5 py-0.5 text-xs',
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm'
    };
    
    // Format display label
    const displayLabel = label || status || 'Unknown';
    
    return (
        <span className={`
            inline-flex items-center rounded font-medium whitespace-nowrap
            ${colors.bg} ${colors.text}
            ${showBorder ? `border ${colors.border}` : ''}
            ${sizeClasses[size] || sizeClasses.sm}
            ${className}
        `.trim()}>
            {displayLabel}
        </span>
    );
});

// ============================================================================
// PRIORITY BADGE - Specialized for priority levels
// ============================================================================

const PriorityBadge = React.memo(function PriorityBadge({ 
    priority, 
    size = 'sm',
    showIcon = false,
    className = ''
}) {
    const priorityConfig = {
        low: { label: 'Low', icon: '↓', variant: 'low' },
        medium: { label: 'Medium', icon: '→', variant: 'medium' },
        high: { label: 'High', icon: '↑', variant: 'high' },
        critical: { label: 'Critical', icon: '!!', variant: 'critical' },
        urgent: { label: 'Urgent', icon: '!!', variant: 'urgent' }
    };
    
    const config = priorityConfig[priority?.toLowerCase()] || priorityConfig.medium;
    
    return (
        <StatusBadge
            status={config.label}
            variant={config.variant}
            size={size}
            label={showIcon ? `${config.icon} ${config.label}` : config.label}
            className={className}
        />
    );
});

// ============================================================================
// BOOLEAN BADGE - For yes/no, true/false, pass/fail
// ============================================================================

const BooleanBadge = React.memo(function BooleanBadge({ 
    value, 
    trueLabel = 'Yes',
    falseLabel = 'No',
    size = 'sm',
    className = ''
}) {
    const isTrue = value === true || value === 'yes' || value === 'true' || value === 'pass';
    
    return (
        <StatusBadge
            status={isTrue ? trueLabel : falseLabel}
            variant={isTrue ? 'yes' : 'no'}
            size={size}
            className={className}
        />
    );
});

// Export to window for global access
window.StatusBadge = StatusBadge;
window.PriorityBadge = PriorityBadge;
window.BooleanBadge = BooleanBadge;
window.STATUS_VARIANTS = STATUS_VARIANTS;
