// ============================================================================
// PROJECT-SPECIFIC QA CONFIGURATIONS
// ============================================================================
// Each project can have custom QA requirements including:
// - Required photo documentation at specific stations/checkpoints
// - Custom inspection items beyond the standard checklist
// - Project-specific milestones or hold points
// - Client-specific documentation requirements
// ============================================================================

// Default configuration applied to all projects
const DEFAULT_QA_CONFIG = {
    photoRequirements: {
        // Standard photos required at key milestones
        milestones: [
            { milestone: 'ready-to-insulate', required: true, minPhotos: 2, description: 'Document insulation readiness' },
            { milestone: 'ready-to-back-panel', required: true, minPhotos: 2, description: 'Document before back panel' },
            { milestone: 'ready-to-deck', required: true, minPhotos: 2, description: 'Document before decking' },
            { milestone: 'buyback-complete', required: true, minPhotos: 4, description: 'Final internal inspection photos' },
            { milestone: 'final-walk-complete', required: true, minPhotos: 4, description: 'Client walkthrough documentation' }
        ],
        // Standard station photos
        stations: []
    },
    customChecklistItems: [],
    holdPoints: [],
    clientRequirements: null
};

// Project-specific configurations
// Key = project name (case-insensitive match) or project ID
const PROJECT_QA_CONFIGS = {
    // =========================================================================
    // LOCKE LOFTS - Enhanced photo documentation requirements
    // =========================================================================
    'locke lofts': {
        projectName: 'Locke Lofts',
        description: 'Enhanced documentation for Locke Lofts project',
        photoRequirements: {
            milestones: [
                { milestone: 'ready-to-insulate', required: true, minPhotos: 4, description: 'Insulation cavity prep - all walls' },
                { milestone: 'ready-to-back-panel', required: true, minPhotos: 4, description: 'MEP rough-in complete' },
                { milestone: 'ready-to-deck', required: true, minPhotos: 3, description: 'Roof structure ready' },
                { milestone: 'buyback-complete', required: true, minPhotos: 6, description: 'Complete interior documentation' },
                { milestone: 'final-walk-complete', required: true, minPhotos: 8, description: 'Full walkthrough documentation' }
            ],
            stations: [
                // Automation stations
                { station: 'Automation', items: [
                    { id: 'll-auto-1', description: 'Floor frame assembly', required: true },
                    { id: 'll-auto-2', description: 'Wall panel assembly', required: true }
                ]},
                // Mezzanine
                { station: 'Floor Mez', items: [
                    { id: 'll-mez-1', description: 'Plumbing rough-in under floor', required: true },
                    { id: 'll-mez-2', description: 'Floor insulation installed', required: true }
                ]},
                // MEP Rough
                { station: '8', items: [
                    { id: 'll-mep-1', description: 'Electrical panel installation', required: true },
                    { id: 'll-mep-2', description: 'HVAC ductwork routing', required: true },
                    { id: 'll-mep-3', description: 'Plumbing vertical risers', required: true }
                ]},
                // Drywall
                { station: '14', items: [
                    { id: 'll-dw-1', description: 'Drywall installation complete', required: true },
                    { id: 'll-dw-2', description: 'Tape and texture complete', required: true }
                ]},
                // Trim
                { station: '22', items: [
                    { id: 'll-trim-1', description: 'Cabinet installation', required: true },
                    { id: 'll-trim-2', description: 'Fixture installation', required: true },
                    { id: 'll-trim-3', description: 'Appliance installation', required: true }
                ]},
                // Final
                { station: '28', items: [
                    { id: 'll-final-1', description: 'Kitchen complete', required: true },
                    { id: 'll-final-2', description: 'Bathroom(s) complete', required: true },
                    { id: 'll-final-3', description: 'Living areas complete', required: true },
                    { id: 'll-final-4', description: 'Exterior complete', required: true }
                ]}
            ],
            // Special items requiring photo documentation
            specialItems: [
                { id: 'll-spec-1', description: 'Fire stopping at all penetrations', category: 'fire-safety' },
                { id: 'll-spec-2', description: 'Acoustic sealant application', category: 'acoustic' },
                { id: 'll-spec-3', description: 'Window flashing details', category: 'waterproofing' },
                { id: 'll-spec-4', description: 'Balcony/deck connections', category: 'structural' }
            ]
        },
        customChecklistItems: [
            { id: 'll-custom-1', department: 'exteriors', description: 'Verify balcony waterproofing membrane', station: '15' },
            { id: 'll-custom-2', department: 'electrical-rough', description: 'EV charging rough-in verification', station: '10' },
            { id: 'll-custom-3', department: 'plumbing-rough-verts', description: 'Greywater system rough-in', station: '11' }
        ],
        holdPoints: [
            { station: '8', description: 'MEP coordination sign-off required', requiresApproval: ['QA Manager', 'MEP Coordinator'] },
            { station: '20', description: 'Pre-finish inspection hold', requiresApproval: ['QA Manager'] }
        ],
        clientRequirements: {
            name: 'Locke Development',
            inspectionNotice: 48, // hours notice required
            requiredDocuments: ['Daily progress photos', 'Test certificates', 'Material certifications']
        }
    },

    // =========================================================================
    // ALVARADO CREEK - Standard configuration with some customizations
    // =========================================================================
    'alvarado creek': {
        projectName: 'Alvarado Creek',
        description: 'Standard QA with enhanced structural documentation',
        photoRequirements: {
            milestones: DEFAULT_QA_CONFIG.photoRequirements.milestones,
            stations: [
                { station: 'Automation', items: [
                    { id: 'ac-auto-1', description: 'Floor framing connections', required: true }
                ]},
                { station: '6', items: [
                    { id: 'ac-wall-1', description: 'Shear wall installation', required: true }
                ]}
            ]
        },
        customChecklistItems: [],
        holdPoints: [],
        clientRequirements: null
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get QA configuration for a specific project
 * @param {Object} project - Project object with name and/or id
 * @returns {Object} Merged configuration (default + project-specific)
 */
function getProjectQAConfig(project) {
    if (!project) return DEFAULT_QA_CONFIG;
    
    // Try to find by project name (case-insensitive)
    const projectName = (project.name || '').toLowerCase().trim();
    const projectConfig = PROJECT_QA_CONFIGS[projectName];
    
    if (projectConfig) {
        // Merge with defaults
        return {
            ...DEFAULT_QA_CONFIG,
            ...projectConfig,
            photoRequirements: {
                ...DEFAULT_QA_CONFIG.photoRequirements,
                ...projectConfig.photoRequirements
            }
        };
    }
    
    return DEFAULT_QA_CONFIG;
}

/**
 * Get required photos for a specific station
 * @param {Object} project - Project object
 * @param {string} station - Station name/number
 * @returns {Array} Array of required photo items
 */
function getStationPhotoRequirements(project, station) {
    const config = getProjectQAConfig(project);
    const stationConfig = config.photoRequirements.stations.find(
        s => s.station === station || s.station === String(station)
    );
    return stationConfig?.items || [];
}

/**
 * Get required photos for a milestone
 * @param {Object} project - Project object
 * @param {string} milestoneId - Milestone ID
 * @returns {Object|null} Milestone photo requirement
 */
function getMilestonePhotoRequirements(project, milestoneId) {
    const config = getProjectQAConfig(project);
    return config.photoRequirements.milestones.find(m => m.milestone === milestoneId) || null;
}

/**
 * Get custom checklist items for a project
 * @param {Object} project - Project object
 * @param {string} departmentId - Optional department filter
 * @returns {Array} Custom checklist items
 */
function getCustomChecklistItems(project, departmentId = null) {
    const config = getProjectQAConfig(project);
    if (!departmentId) return config.customChecklistItems || [];
    return (config.customChecklistItems || []).filter(item => item.department === departmentId);
}

/**
 * Check if station is a hold point for the project
 * @param {Object} project - Project object
 * @param {string} station - Station name/number
 * @returns {Object|null} Hold point configuration or null
 */
function getHoldPoint(project, station) {
    const config = getProjectQAConfig(project);
    return (config.holdPoints || []).find(
        hp => hp.station === station || hp.station === String(station)
    ) || null;
}

/**
 * Get all projects with custom QA configurations
 * @returns {Array} Array of project names with custom configs
 */
function getProjectsWithCustomConfig() {
    return Object.keys(PROJECT_QA_CONFIGS);
}

// Export for use in QA Module
window.PROJECT_QA_CONFIG = {
    DEFAULT_QA_CONFIG,
    PROJECT_QA_CONFIGS,
    getProjectQAConfig,
    getStationPhotoRequirements,
    getMilestonePhotoRequirements,
    getCustomChecklistItems,
    getHoldPoint,
    getProjectsWithCustomConfig
};
