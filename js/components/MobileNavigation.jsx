// ============================================================================
// MOBILE NAVIGATION COMPONENT
// Responsive navigation drawer and bottom nav for mobile devices
// ============================================================================

/**
 * Mobile Navigation Drawer Component
 * Slides in from left on mobile/tablet devices
 */
window.MobileNavigation = function MobileNavigation({ 
    tabs, 
    activeTab, 
    onTabChange, 
    currentUser,
    onLogout 
}) {
    const [isOpen, setIsOpen] = React.useState(false);
    const isMobile = window.useIsMobile ? window.useIsMobile(1024) : true;
    
    // Close drawer when clicking overlay
    const handleOverlayClick = () => {
        setIsOpen(false);
    };
    
    // Close drawer when tab is selected
    const handleTabSelect = (tabId) => {
        onTabChange(tabId);
        setIsOpen(false);
    };
    
    // Prevent body scroll when drawer is open
    React.useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);
    
    // Don't render on desktop
    if (!isMobile) {
        return null;
    }
    
    return (
        <>
            {/* Hamburger Menu Button */}
            <button 
                className={`mobile-menu-button ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle menu"
                style={{ color: 'white' }}
            >
                <div className="mobile-menu-icon">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </button>
            
            {/* Overlay */}
            <div 
                className={`mobile-nav-overlay ${isOpen ? 'active' : ''}`}
                onClick={handleOverlayClick}
            />
            
            {/* Navigation Drawer */}
            <div className={`mobile-nav-drawer ${isOpen ? 'active' : ''}`}>
                {/* Header */}
                <div className="mobile-nav-header">
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>MODA</div>
                        {currentUser && (
                            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginTop: '0.25rem' }}>
                                {currentUser.email}
                            </div>
                        )}
                    </div>
                    <button 
                        className="mobile-nav-close"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close menu"
                    >
                        ×
                    </button>
                </div>
                
                {/* Navigation Items */}
                <div className="mobile-nav-items">
                    {tabs.map(tab => (
                        <div
                            key={tab.id}
                            className={`mobile-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => handleTabSelect(tab.id)}
                        >
                            <span className={`mobile-nav-item-icon ${tab.icon}`}></span>
                            <span className="mobile-nav-item-label">{tab.label}</span>
                        </div>
                    ))}
                    
                    {/* Divider */}
                    <div style={{ 
                        height: '1px', 
                        background: '#e5e7eb', 
                        margin: '1rem 1.5rem' 
                    }} />
                    
                    {/* Logout */}
                    {onLogout && (
                        <div
                            className="mobile-nav-item"
                            onClick={() => {
                                setIsOpen(false);
                                onLogout();
                            }}
                            style={{ color: '#dc2626' }}
                        >
                            <span className="mobile-nav-item-icon icon-logout"></span>
                            <span className="mobile-nav-item-label">Logout</span>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

/**
 * Bottom Navigation Component
 * Fixed bottom navigation for mobile devices (alternative to drawer)
 * Shows only the most important tabs
 */
window.BottomNavigation = function BottomNavigation({ 
    tabs, 
    activeTab, 
    onTabChange,
    maxItems = 5 
}) {
    const isMobile = window.useIsMobile ? window.useIsMobile(640) : true;
    
    // Don't render on tablet/desktop
    if (!isMobile) {
        return null;
    }
    
    // Show only the most important tabs
    const priorityTabs = tabs.slice(0, maxItems);
    
    return (
        <div className="bottom-nav">
            <div className="bottom-nav-items">
                {priorityTabs.map(tab => (
                    <div
                        key={tab.id}
                        className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        <span className="bottom-nav-item-icon">{tab.icon}</span>
                        <span className="bottom-nav-item-label">
                            {tab.label.replace(/^[^\s]+\s/, '').substring(0, 10)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * Responsive Tab Bar Component
 * Shows full tab bar on desktop, hamburger menu on mobile
 */
window.ResponsiveTabBar = function ResponsiveTabBar({
    tabs,
    activeTab,
    onTabChange,
    currentUser,
    onLogout,
    children
}) {
    const isMobile = window.useIsMobile ? window.useIsMobile(1024) : true;
    
    return (
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            width: '100%'
        }}>
            {/* Mobile: Show hamburger menu */}
            {isMobile && (
                <MobileNavigation
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={onTabChange}
                    currentUser={currentUser}
                    onLogout={onLogout}
                />
            )}
            
            {/* Desktop: Show full tab bar */}
            {!isMobile && children}
        </div>
    );
};

console.log('✅ Mobile navigation components loaded');
