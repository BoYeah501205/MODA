/**
 * MODA Feature Flags
 * 
 * Controls gradual rollout of new navigation and dashboard features.
 * These flags are TEMPORARY - remove once migration is complete.
 * 
 * ROLLBACK: Set useNewNavigation = false to instantly revert to old system
 */

const featureFlags = {
    // ===== MASTER SWITCH =====
    // Controls entire new navigation system
    useNewNavigation: false,
    
    // ===== PHASE 2: Dashboard Home =====
    enableDashboardHome: true,       // Show new Dashboard Home tab
    enableRoleBasedViews: true,      // Role-adaptive dashboard content (Phase 5)
    
    // ===== PHASE 3: Navigation Grouping =====
    enableNavGroups: true,           // Collapsible navigation sections
    
    // ===== PHASE 4: URL Navigation =====
    enableUrlNavigation: true,       // URL-based navigation (back/forward, bookmarks)
    
    // ===== PHASE 4: Individual Group Migrations =====
    enableProductionGroup: false,    // Production + Projects + Tracker + Weekly Board
    enablePeopleGroup: false,        // People + Training
    enablePreconGroup: false,        // Precon + Engineering
    enableQualityGroup: false,       // QA
    enableLogisticsGroup: false,     // Transport + Materials
    enableFieldGroup: false,         // On-Site
    
    // ===== ANALYTICS FEATURES =====
    enableHeatMapMatrix: true,       // Heat Map Matrix for labor forecasting
    
    // ===== YARD MAP V2 =====
    enableYardMapV2: true,           // New Yard Map with Transport integration
    
    // ===== TESTING =====
    // Users in this list see new features regardless of flags above
    testUsers: [
        // 'trevor@autovol.com'  // Uncomment to test in production
    ]
};

/**
 * Check if a feature is enabled for the current user
 * @param {string} featureName - Name of the feature flag
 * @param {string|null} userEmail - Current user's email (for test user override)
 * @returns {boolean}
 */
function isFeatureEnabled(featureName, userEmail = null) {
    // Test users get all features
    if (userEmail && featureFlags.testUsers.includes(userEmail)) {
        return true;
    }
    
    // Master switch must be on for any new navigation features
    if (featureName !== 'useNewNavigation' && !featureFlags.useNewNavigation) {
        // Exceptions: Features that can be tested independently
        const independentFeatures = ['enableDashboardHome', 'enableNavGroups', 'enableUrlNavigation'];
        if (!independentFeatures.includes(featureName)) {
            return false;
        }
    }
    
    return featureFlags[featureName] || false;
}

/**
 * Get all enabled features for debugging
 * @returns {Object}
 */
function getEnabledFeatures() {
    const enabled = {};
    for (const [key, value] of Object.entries(featureFlags)) {
        if (key !== 'testUsers' && value === true) {
            enabled[key] = true;
        }
    }
    return enabled;
}

// Export for use in components
window.MODA_FEATURE_FLAGS = {
    flags: featureFlags,
    isEnabled: isFeatureEnabled,
    getEnabled: getEnabledFeatures
};

// ===== DEBUG LOGGING SYSTEM =====
// Set to true to see verbose console output, false for production
const MODA_DEBUG = localStorage.getItem('MODA_DEBUG') === 'true' || false;

// Logging utility - only logs in debug mode
const modaLog = {
    debug: (...args) => MODA_DEBUG && console.log(...args),
    info: (...args) => MODA_DEBUG && console.info(...args),
    warn: (...args) => console.warn(...args), // Always show warnings
    error: (...args) => console.error(...args), // Always show errors
    // Force log regardless of debug mode (for critical info)
    force: (...args) => console.log(...args)
};

// Export debug utilities
window.MODA_DEBUG = MODA_DEBUG;
window.modaLog = modaLog;

// Enable debug mode: localStorage.setItem('MODA_DEBUG', 'true'); location.reload();
// Disable debug mode: localStorage.setItem('MODA_DEBUG', 'false'); location.reload();

// Only log feature flags in debug mode
if (MODA_DEBUG) {
    console.log('🚩 MODA Feature Flags loaded');
    console.log('🚩 To check flags: MODA_FEATURE_FLAGS.getEnabled()');
    console.log('🚩 To check specific: MODA_FEATURE_FLAGS.isEnabled("featureName", userEmail)');
}
