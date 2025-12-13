// ============================================================================
// MOBILE RESPONSIVENESS HOOKS
// Custom React hooks for detecting and responding to mobile devices
// ============================================================================

/**
 * Hook to detect if the current viewport is mobile-sized
 * @param {number} breakpoint - Width threshold in pixels (default: 768px)
 * @returns {boolean} - True if viewport width is below breakpoint
 */
window.useIsMobile = (breakpoint = 768) => {
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < breakpoint);
    
    React.useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [breakpoint]);
    
    return isMobile;
};

/**
 * Hook to get current viewport size category
 * @returns {'mobile' | 'tablet' | 'desktop'}
 */
window.useViewportSize = function() {
    const [viewportSize, setViewportSize] = React.useState(() => {
        if (typeof window === 'undefined') return 'desktop';
        
        const width = window.innerWidth;
        if (width < 640) return 'mobile';
        if (width < 1024) return 'tablet';
        return 'desktop';
    });

    React.useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 640) setViewportSize('mobile');
            else if (width < 1024) setViewportSize('tablet');
            else setViewportSize('desktop');
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return viewportSize;
};

/**
 * Hook to detect touch device capability
 * @returns {boolean} - True if device supports touch
 */
window.useIsTouchDevice = () => {
    const [isTouch, setIsTouch] = React.useState(false);
    
    React.useEffect(() => {
        const hasTouchSupport = (
            'ontouchstart' in window ||
            navigator.maxTouchPoints > 0 ||
            navigator.msMaxTouchPoints > 0
        );
        setIsTouch(hasTouchSupport);
    }, []);
    
    return isTouch;
};

/**
 * Hook to get responsive column count based on viewport
 * @param {Object} config - Column configuration { mobile: 1, tablet: 2, desktop: 4 }
 * @returns {number} - Number of columns
 */
window.useResponsiveColumns = function(config = { mobile: 1, tablet: 2, desktop: 4 }) {
    const viewportSize = window.useViewportSize();
    
    return React.useMemo(() => {
        switch (viewportSize) {
            case 'mobile': return config.mobile || 1;
            case 'tablet': return config.tablet || 2;
            case 'desktop': return config.desktop || 4;
            default: return config.desktop || 4;
        }
    }, [viewportSize, config.mobile, config.tablet, config.desktop]);
};

/**
 * Hook to detect device orientation
 * @returns {'portrait' | 'landscape'}
 */
window.useOrientation = function() {
    const [orientation, setOrientation] = React.useState(() => {
        if (typeof window === 'undefined') return 'portrait';
        return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    });

    React.useEffect(() => {
        const handleOrientationChange = () => {
            setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
        };

        window.addEventListener('resize', handleOrientationChange);
        window.addEventListener('orientationchange', handleOrientationChange);
        
        return () => {
            window.removeEventListener('resize', handleOrientationChange);
            window.removeEventListener('orientationchange', handleOrientationChange);
        };
    }, []);

    return orientation;
};

/**
 * Hook to detect if user prefers reduced motion (accessibility)
 * @returns {boolean}
 */
window.usePrefersReducedMotion = function() {
    const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(() => {
        if (typeof window === 'undefined') return false;
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        return mediaQuery.matches;
    });

    React.useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        const handleChange = (e) => {
            setPrefersReducedMotion(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return prefersReducedMotion;
};

console.log('✅ Mobile responsiveness hooks loaded');
