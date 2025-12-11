/**
 * useUrlNavigation.js - URL-based navigation hook
 * 
 * Syncs activeTab state with the URL hash for:
 * - Browser back/forward button support
 * - Bookmarkable/shareable URLs
 * - Deep linking to specific tabs
 * 
 * URL format: /#/tabName (e.g., /#/production, /#/projects, /#/home)
 */

(function() {
    'use strict';
    
    const { useState, useEffect, useCallback } = React;
    
    // Valid tab IDs that can be navigated to
    const VALID_TABS = [
        'home',
        'executive', 
        'production', 
        'projects', 
        'people', 
        'qa', 
        'transport', 
        'equipment', 
        'precon', 
        'onsite', 
        'engineering', 
        'automation', 
        'tracker',
        'admin'
    ];
    
    /**
     * Hook that syncs activeTab with URL hash
     * @param {string} defaultTab - Default tab if URL is empty or invalid
     * @returns {[string, function]} - [activeTab, setActiveTab]
     */
    function useUrlNavigation(defaultTab = 'production') {
        // Parse tab from current URL hash
        const getTabFromHash = useCallback(() => {
            const hash = window.location.hash;
            // Format: #/tabName or #tabName
            const match = hash.match(/^#\/?([a-zA-Z-]+)/);
            if (match && VALID_TABS.includes(match[1])) {
                return match[1];
            }
            return defaultTab;
        }, [defaultTab]);
        
        // Initialize state from URL
        const [activeTab, setActiveTabState] = useState(getTabFromHash);
        
        // Update URL when tab changes
        const setActiveTab = useCallback((newTab) => {
            if (VALID_TABS.includes(newTab)) {
                // Update URL hash without triggering a page reload
                const newHash = `#/${newTab}`;
                if (window.location.hash !== newHash) {
                    window.history.pushState(null, '', newHash);
                }
                setActiveTabState(newTab);
            } else {
                console.warn(`Invalid tab: ${newTab}`);
                setActiveTabState(newTab); // Still set it for backwards compatibility
            }
        }, []);
        
        // Listen for browser back/forward navigation
        useEffect(() => {
            const handlePopState = () => {
                const tab = getTabFromHash();
                setActiveTabState(tab);
            };
            
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }, [getTabFromHash]);
        
        // Set initial URL if empty
        useEffect(() => {
            if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
                window.history.replaceState(null, '', `#/${activeTab}`);
            }
        }, []);
        
        return [activeTab, setActiveTab];
    }
    
    // Export for use in components
    window.useUrlNavigation = useUrlNavigation;
    
    console.log('🔗 URL Navigation hook loaded');
    console.log('🔗 URLs: /#/home, /#/production, /#/projects, etc.');
})();
