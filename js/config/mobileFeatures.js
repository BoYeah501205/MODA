// ============================================================================
// MODA MOBILE FEATURE CONFIGURATION
// Controls which tabs and features are visible/hidden on mobile devices
// ============================================================================

(function() {
    'use strict';

    // Mobile detection helper (matches useMobile.js logic)
    const isMobileDevice = () => {
        const ua = navigator.userAgent || '';
        return /iPhone|iPad|iPod|Android/i.test(ua) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
               window.innerWidth <= 1025;
    };

    window.MODA_MOBILE_CONFIG = {
        // =====================================================================
        // TABS COMPLETELY HIDDEN ON MOBILE
        // These tabs are desktop-only administrative/planning functions
        // =====================================================================
        hiddenTabs: [
            'people',       // HR/workforce admin - desktop only
            'supplychain',  // Inventory management - desktop only
            'equipment',    // Equipment tracking - desktop only
            'precon',       // Preconstruction planning - desktop only
            'rfi',          // RFI management - desktop only
            'engineering',  // Engineering docs - desktop only
            'automation',   // Automation monitoring - desktop only
            'admin'         // System administration - desktop only
        ],

        // =====================================================================
        // TABS SHOWN ON MOBILE (with simplifications)
        // =====================================================================
        visibleTabs: [
            'executive',    // Simplified KPIs
            'production',   // Weekly Board (with edit for key items)
            'projects',     // Project/module viewing
            'qa',           // Inspections on tablets
            'transport',    // Yard workers on tablets
            'onsite',       // Field workers primary use case
            'drawings',     // View drawings (read-only)
            'tracker'       // Module scanning
        ],

        // =====================================================================
        // PER-TAB FEATURE VISIBILITY
        // hideOnMobile: features to hide
        // showOnMobile: features to explicitly show
        // editableOnMobile: features that allow editing on mobile
        // =====================================================================
        tabFeatures: {
            production: {
                hideOnMobile: [
                    'scheduleSetup',        // Complex week configuration
                    'stationStagger',       // Station timing configuration
                    'prototypePlacement',   // Prototype placement mode
                    'popoutWindow',         // Pop-out to separate window
                    'pdfExport',            // PDF generation
                    'bulkOperations',       // Bulk status changes
                    'reorderMode',          // Drag-to-reorder modules
                    'weekNavArrows',        // Week navigation arrows (use dropdown)
                    'editWeekButton',       // Edit week in Schedule Setup
                    'completeWeekButton'    // Complete week action
                ],
                showOnMobile: [
                    'weeklyBoard',          // Main board view
                    'moduleCards',          // Module status cards
                    'weekSelector',         // Week dropdown selector
                    'projectFilter',        // Filter by project
                    'stationFilter',        // Filter by station
                    'moduleDetail',         // Tap to view module details
                    'statusUpdate'          // Update module status (key edit)
                ],
                editableOnMobile: [
                    'moduleStatus',         // Can update module progress
                    'moduleNotes'           // Can add notes to modules
                ]
            },

            projects: {
                hideOnMobile: [
                    'moduleImport',         // CSV import
                    'moduleExport',         // CSV export
                    'gridView',             // Grid layout (use list only)
                    'heatMapMatrix',        // Difficulty heat map
                    'drawingLinksConfig',   // Configure drawing links
                    'bulkEdit',             // Bulk module editing
                    'sortDropdown',         // Complex sorting
                    'addProject',           // Create new project
                    'deleteProject',        // Delete project
                    'editProjectDetails'    // Edit project metadata
                ],
                showOnMobile: [
                    'projectList',          // List of projects
                    'projectCard',          // Project summary cards
                    'moduleList',           // Modules within project
                    'moduleDetail',         // Module detail view
                    'searchBar',            // Basic search
                    'statusFilter',         // Filter by status
                    'viewDrawings',         // View drawing links (read-only)
                    'licensePlate'          // View license plate
                ],
                editableOnMobile: []        // View-only on mobile
            },

            executive: {
                hideOnMobile: [
                    'detailedCharts',       // Complex analytics charts
                    'exportButtons',        // Data export
                    'dateRangePicker',      // Complex date filtering
                    'drillDown'             // Drill-down analytics
                ],
                showOnMobile: [
                    'kpiCards',             // Key metric cards
                    'projectSummary',       // Project status summary
                    'progressBars',         // Simple progress indicators
                    'alertsBanner'          // Important alerts
                ],
                editableOnMobile: []        // View-only
            },

            qa: {
                hideOnMobile: [
                    'bulkInspection',       // Bulk inspection operations
                    'reportGeneration',     // Complex reporting
                    'inspectionHistory',    // Full history view
                    'exportData'            // Data export
                ],
                showOnMobile: [
                    'inspectionChecklist',  // Checklist for current module
                    'passFailButtons',      // Pass/Fail actions
                    'photoCapture',         // Take photos
                    'issueLogging',         // Log issues
                    'moduleSearch'          // Find module to inspect
                ],
                editableOnMobile: [
                    'inspectionResult',     // Log pass/fail
                    'issueReport',          // Report issues
                    'photoUpload'           // Upload photos
                ]
            },

            transport: {
                hideOnMobile: [
                    'yardMapEdit',          // Edit yard layout
                    'scheduleManagement',   // Complex scheduling
                    'routePlanning',        // Route planning
                    'exportData'            // Data export
                ],
                showOnMobile: [
                    'moduleLocation',       // Find module location
                    'shippingStatus',       // View shipping status
                    'yardView',             // Simple yard view
                    'deliveryList'          // Upcoming deliveries
                ],
                editableOnMobile: [
                    'moduleLocation'        // Update module location
                ]
            },

            drawings: {
                hideOnMobile: [
                    'uploadDrawings',       // Upload new drawings
                    'folderManagement',     // Manage folders
                    'versionManagement',    // Version control
                    'markupTools',          // Drawing markup
                    'drawingLinksConfig'    // Configure quick links
                ],
                showOnMobile: [
                    'browseDrawings',       // Browse drawing list
                    'viewPDF',              // View PDFs (PDF.js viewer)
                    'drawingLinks',         // Quick access links
                    'searchDrawings'        // Search for drawings
                ],
                editableOnMobile: []        // View-only
            },

            onsite: {
                // On-Site is designed for mobile - show everything
                hideOnMobile: [],
                showOnMobile: [
                    'deliveryTracking',
                    'siteReports',
                    'photoCapture',
                    'issueLogging',
                    'moduleStatus'
                ],
                editableOnMobile: [
                    'deliveryStatus',
                    'siteReport',
                    'issueReport',
                    'photoUpload'
                ]
            },

            tracker: {
                hideOnMobile: [
                    'bulkScan',             // Bulk scanning operations
                    'exportHistory'         // Export scan history
                ],
                showOnMobile: [
                    'qrScanner',            // QR code scanning
                    'moduleLookup',         // Manual module lookup
                    'statusDisplay',        // Current module status
                    'locationHistory'       // Where module has been
                ],
                editableOnMobile: []        // View-only
            }
        },

        // =====================================================================
        // HELPER METHODS
        // =====================================================================

        /**
         * Check if current device is mobile
         */
        isMobile: isMobileDevice,

        /**
         * Check if a tab should be hidden on mobile
         * @param {string} tabId - Tab identifier
         * @returns {boolean} True if tab should be hidden
         */
        isTabHidden(tabId) {
            if (!isMobileDevice()) return false;
            return this.hiddenTabs.includes(tabId);
        },

        /**
         * Check if a feature should be hidden on mobile for a specific tab
         * @param {string} tabId - Tab identifier
         * @param {string} featureId - Feature identifier
         * @returns {boolean} True if feature should be hidden
         */
        isFeatureHidden(tabId, featureId) {
            if (!isMobileDevice()) return false;
            const tabConfig = this.tabFeatures[tabId];
            if (!tabConfig) return false;
            return tabConfig.hideOnMobile?.includes(featureId) || false;
        },

        /**
         * Check if a feature is editable on mobile
         * @param {string} tabId - Tab identifier
         * @param {string} featureId - Feature identifier
         * @returns {boolean} True if feature is editable on mobile
         */
        isFeatureEditable(tabId, featureId) {
            if (!isMobileDevice()) return true; // Desktop always editable
            const tabConfig = this.tabFeatures[tabId];
            if (!tabConfig) return false;
            return tabConfig.editableOnMobile?.includes(featureId) || false;
        },

        /**
         * Get visible tabs for mobile
         * @returns {string[]} Array of visible tab IDs
         */
        getVisibleTabs() {
            if (!isMobileDevice()) return null; // Return null to show all tabs
            return this.visibleTabs;
        },

        /**
         * Filter tabs array for mobile visibility
         * @param {Array} tabs - Array of tab objects with 'id' property
         * @returns {Array} Filtered tabs for current device
         */
        filterTabs(tabs) {
            if (!isMobileDevice()) return tabs;
            return tabs.filter(tab => !this.hiddenTabs.includes(tab.id));
        }
    };

    console.log('[Mobile Config] Loaded. Device is mobile:', isMobileDevice());
})();
