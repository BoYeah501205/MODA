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
    enableRoleBasedViews: false,     // Role-adaptive dashboard content
    
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

// Console helper for debugging
console.log('🚩 MODA Feature Flags loaded');
console.log('🚩 To check flags: MODA_FEATURE_FLAGS.getEnabled()');
console.log('🚩 To check specific: MODA_FEATURE_FLAGS.isEnabled("featureName", userEmail)');
