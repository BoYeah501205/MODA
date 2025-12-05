// ============================================================================
// MODA CONSTANTS - Centralized Configuration
// ============================================================================

const MODA_CONSTANTS = {
    VERSION: '2.0.0',
    APP_NAME: 'Modular Operations Dashboard Application',
    
    // Storage Keys
    STORAGE_KEYS: {
        PROJECTS: 'autovol_projects',
        UNIFIED_MODULES: 'autovol_unified_modules',
        EMPLOYEES: 'autovol_employees',
        DEPARTMENTS: 'autovol_departments',
        USERS: 'autovol_users',
        EQUIPMENT: 'autovol_equipment',
        TRASH_PROJECTS: 'autovol_trash_projects',
        TRASH_EMPLOYEES: 'autovol_trash_employees',
        DASHBOARD_ROLES: 'autovol_dashboard_roles',
        DASHBOARD_ROLES_VERSION: 'autovol_dashboard_roles_version'
    },
    
    // Module Lifecycle Phases
    PHASES: {
        PRODUCTION: 'production',
        YARD: 'yard',
        TRANSPORT: 'transport',
        ONSITE: 'onsite',
        COMPLETE: 'complete'
    },
    
    // Transport Stages
    TRANSPORT_STAGES: {
        NOT_STARTED: 'not-started',
        READY: 'ready',
        STAGED: 'staged',
        SCHEDULED_TRANSIT: 'scheduledTransit',
        SCHEDULED_SHUTTLE: 'scheduledShuttle',
        IN_TRANSIT: 'inTransit',
        ARRIVED: 'arrived'
    },
    
    // On-Site Stages
    ONSITE_STAGES: {
        NOT_STARTED: 'not-started',
        DELIVERED: 'delivered',
        SET: 'set',
        STITCHED: 'stitched',
        COMPLETE: 'complete'
    },
    
    // Production Stages
    PRODUCTION_STAGES: [
        { id: 'auto-fc', name: 'Auto Floor/Ceiling', color: '#3B82F6' },
        { id: 'auto-walls', name: 'Auto Walls', color: '#8B5CF6' },
        { id: 'mezzanine', name: 'Mezzanine', color: '#EC4899' },
        { id: 'elec-ceiling', name: 'Electrical Ceiling', color: '#F59E0B' },
        { id: 'wall-set', name: 'Wall Set', color: '#10B981' },
        { id: 'ceiling-set', name: 'Ceiling Set', color: '#06B6D4' },
        { id: 'soffits', name: 'Soffits', color: '#6366F1' },
        { id: 'mech-rough', name: 'Mechanical Rough', color: '#EF4444' },
        { id: 'elec-rough', name: 'Electrical Rough', color: '#F59E0B' },
        { id: 'plumb-rough', name: 'Plumbing Rough', color: '#3B82F6' },
        { id: 'exteriors', name: 'Exteriors', color: '#8B5CF6' },
        { id: 'drywall-bp', name: 'Drywall B&P', color: '#EC4899' },
        { id: 'drywall-ttp', name: 'Drywall TTP', color: '#F59E0B' },
        { id: 'roofing', name: 'Roofing', color: '#10B981' },
        { id: 'pre-finish', name: 'Pre-Finish', color: '#06B6D4' },
        { id: 'mech-trim', name: 'Mechanical Trim', color: '#EF4444' },
        { id: 'elec-trim', name: 'Electrical Trim', color: '#F59E0B' },
        { id: 'plumb-trim', name: 'Plumbing Trim', color: '#3B82F6' },
        { id: 'final-finish', name: 'Final Finish', color: '#8B5CF6' },
        { id: 'sign-off', name: 'Sign-Off', color: '#10B981' },
        { id: 'close-up', name: 'Close-Up', color: '#22C55E' }
    ],
    
    // Dashboard Tabs
    ALL_AVAILABLE_TABS: [
        { id: 'executive', label: '📊 Executive', icon: '📊', description: 'High-level operational overview' },
        { id: 'production', label: '🏭 Production', icon: '🏭', description: 'Production floor management' },
        { id: 'projects', label: '📋 Projects', icon: '📋', description: 'Project directory and tracking' },
        { id: 'people', label: '👥 People', icon: '👥', description: 'Workforce management' },
        { id: 'qa', label: '✅ QA', icon: '✅', description: 'Quality assurance tracking' },
        { id: 'transport', label: '🚛 Transport', icon: '🚛', description: 'Transportation & logistics' },
        { id: 'equipment', label: '🔧 Equipment', icon: '🔧', description: 'Tools & equipment tracking' },
        { id: 'onsite', label: '🏗️ On-Site', icon: '🏗️', description: 'Field operations & reporting' },
        { id: 'engineering', label: '📐 Engineering', icon: '📐', description: 'Engineering documentation' },
        { id: 'automation', label: '🤖 Automation', icon: '🤖', description: 'Automation systems' },
        { id: 'tracker', label: '📦 Tracker', icon: '📦', description: 'Module tracking system' },
        { id: 'admin', label: '⚙️ Admin', icon: '⚙️', description: 'System administration' }
    ],
    
    // Difficulty Labels
    DIFFICULTY_LABELS: {
        sidewall: 'Sidewall',
        stair: 'Stair',
        hr3Wall: '3-Hour Wall',
        short: 'Short Module',
        doubleStudio: 'Double Studio',
        sawbox: 'Sawbox',
        proto: 'Prototype'
    },
    
    // Difficulty Colors
    DIFFICULTY_COLORS: {
        'PROTO': 'pink',
        'STAIR': 'purple',
        '3HR': 'red',
        'SW': 'orange',
        'SHORT': 'yellow',
        'DBL': 'blue',
        'SAWBOX': 'green'
    },
    
    // Page Sizes for PDF Generation
    PAGE_SIZES: {
        letter: { label: 'Letter (8.5" × 11")', width: 612, height: 792 },
        legal: { label: 'Legal (8.5" × 14")', width: 612, height: 1008 },
        tabloid: { label: 'Tabloid (11" × 17")', width: 792, height: 1224 },
        a4: { label: 'A4 (210mm × 297mm)', width: 595, height: 842 }
    },
    
    // Data Retention
    TRASH_RETENTION_DAYS: 90,
    
    // Performance Settings
    DEBOUNCE_DELAY: 300,
    STORAGE_BATCH_DELAY: 500,
    MAX_RENDER_ITEMS: 100
};

// Freeze to prevent modifications
Object.freeze(MODA_CONSTANTS);
Object.freeze(MODA_CONSTANTS.STORAGE_KEYS);
Object.freeze(MODA_CONSTANTS.PHASES);
Object.freeze(MODA_CONSTANTS.TRANSPORT_STAGES);
Object.freeze(MODA_CONSTANTS.ONSITE_STAGES);
