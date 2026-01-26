// On-Site Tab - Field Operations Management
// Placeholder - rebuilding from scratch

const { useState, useEffect, useMemo, useRef, useCallback } = React;

/**
 * OnSiteTab - Main container for field operations
 * 
 * PLANNED FEATURES (to be implemented):
 * - Daily Set Reports
 * - Module tracking on-site
 * - Issue logging with photos
 * - Weather integration
 * - PDF report generation
 * 
 * This is a placeholder while we rebuild the tab from scratch.
 */
function OnSiteTab({ projects = [], employees = [], currentUser = null }) {
    return (
        <div className="onsite-tab-placeholder" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '40px 20px',
            textAlign: 'center'
        }}>
            <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#f0f9ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px'
            }}>
                <span className="icon-construction" style={{ 
                    width: '40px', 
                    height: '40px', 
                    display: 'block',
                    opacity: 0.6
                }}></span>
            </div>
            
            <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '12px'
            }}>
                On-Site Tab - Coming Soon
            </h2>
            
            <p style={{ 
                fontSize: '16px', 
                color: '#64748b',
                maxWidth: '400px',
                lineHeight: '1.5'
            }}>
                This section is being rebuilt with an improved workflow for field operations and daily reporting.
            </p>
            
            <div style={{
                marginTop: '32px',
                padding: '16px 24px',
                backgroundColor: '#fefce8',
                borderRadius: '8px',
                border: '1px solid #fef08a'
            }}>
                <p style={{ 
                    fontSize: '14px', 
                    color: '#854d0e',
                    margin: 0
                }}>
                    <strong>Status:</strong> Awaiting new implementation plan
                </p>
            </div>
        </div>
    );
}

// Export for use
window.OnSiteTab = OnSiteTab;
