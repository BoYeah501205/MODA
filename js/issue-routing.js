/**
 * Issue Routing System for MODA
 * 
 * Routes issues to appropriate dashboards based on issue type/category.
 * Provides unified storage and retrieval across all operational dashboards.
 */

(function() {
    'use strict';

    // ===== ISSUE TYPE TO DASHBOARD MAPPING =====
    const ISSUE_ROUTING = {
        // Engineering Dashboard
        'shop-drawing': { dashboard: 'engineering', storageKey: 'moda_engineering_issues', label: 'Engineering' },
        'design-conflict': { dashboard: 'engineering', storageKey: 'moda_engineering_issues', label: 'Engineering' },
        'engineering-question': { dashboard: 'engineering', storageKey: 'moda_engineering_issues', label: 'Engineering' },
        
        // QA Dashboard
        'quality': { dashboard: 'qa', storageKey: 'moda_qa_issues', label: 'QA' },
        
        // Supply Chain Dashboard
        'material-supply': { dashboard: 'supply-chain', storageKey: 'moda_supply_chain_issues', label: 'Supply Chain' },
        
        // RFI Dashboard
        'rfi': { dashboard: 'rfi', storageKey: 'moda_rfi_issues', label: 'RFI' },
        
        // Default to Engineering
        'other': { dashboard: 'engineering', storageKey: 'moda_engineering_issues', label: 'Engineering' }
    };

    // ===== ISSUE TYPES (shared across all modals) =====
    const ISSUE_TYPES = [
        { id: 'shop-drawing', label: 'Shop Drawing', color: '#0057B8', icon: 'icon-document' },
        { id: 'design-conflict', label: 'Design Conflict', color: '#7C3AED', icon: 'icon-warning' },
        { id: 'material-supply', label: 'Material/Supply', color: '#EA580C', icon: 'icon-package' },
        { id: 'quality', label: 'Quality Issue', color: '#DC2626', icon: 'icon-alert' },
        { id: 'engineering-question', label: 'Engineering Question', color: '#0891B2', icon: 'icon-help' },
        { id: 'rfi', label: 'RFI Required', color: '#4F46E5', icon: 'icon-file-text' },
        { id: 'other', label: 'Other', color: '#6B7280', icon: 'icon-more' }
    ];

    // ===== PRIORITY LEVELS =====
    const PRIORITY_LEVELS = [
        { id: 'low', label: 'Low', color: '#10B981', description: 'Can wait' },
        { id: 'medium', label: 'Medium', color: '#F59E0B', description: 'Normal priority' },
        { id: 'high', label: 'High', color: '#EA580C', description: 'Needs attention' },
        { id: 'critical', label: 'Critical', color: '#DC2626', description: 'Blocking work' }
    ];

    // ===== ISSUE COUNTER =====
    function getNextIssueNumber() {
        const counter = parseInt(localStorage.getItem('moda_issue_counter') || '0') + 1;
        localStorage.setItem('moda_issue_counter', counter.toString());
        return counter;
    }

    // ===== GET ROUTING INFO =====
    function getRoutingInfo(issueType) {
        return ISSUE_ROUTING[issueType] || ISSUE_ROUTING['other'];
    }

    // ===== GET DASHBOARD LABEL =====
    function getDashboardLabel(issueType) {
        const routing = getRoutingInfo(issueType);
        return routing.label;
    }

    // ===== GET STORAGE KEY =====
    function getStorageKey(issueType) {
        const routing = getRoutingInfo(issueType);
        return routing.storageKey;
    }

    // ===== LOAD ISSUES FROM STORAGE =====
    function loadIssues(storageKey) {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved && saved !== 'undefined' && saved !== 'null') {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('[IssueRouting] Error loading issues:', e);
        }
        return [];
    }

    // ===== SAVE ISSUES TO STORAGE =====
    function saveIssues(storageKey, issues) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(issues));
        } catch (e) {
            console.error('[IssueRouting] Error saving issues:', e);
        }
    }

    // ===== CREATE ISSUE =====
    async function createIssue(issueData) {
        const issueType = issueData.issue_type || 'other';
        const routing = getRoutingInfo(issueType);
        
        // Wait for Supabase to be ready (up to 2 seconds)
        if (routing.dashboard === 'engineering') {
            let attempts = 0;
            while (attempts < 10 && !window.MODA_SUPABASE_ISSUES?.isAvailable?.()) {
                console.log('[IssueRouting] Waiting for Supabase... attempt', attempts + 1);
                await new Promise(resolve => setTimeout(resolve, 200));
                attempts++;
            }
        }
        
        // Try Supabase first for engineering issues (primary source for multi-user sync)
        if (routing.dashboard === 'engineering' && window.MODA_SUPABASE_ISSUES?.isAvailable?.()) {
            try {
                console.log('[IssueRouting] Creating issue via Supabase...');
                const created = await window.MODA_SUPABASE_ISSUES.issues.create(issueData);
                console.log(`[IssueRouting] Issue ${created.issue_display_id} created in Supabase and routed to ${routing.label}`);
                
                // Dispatch custom event for same-tab updates
                window.dispatchEvent(new CustomEvent('moda-issues-updated', { 
                    detail: { 
                        dashboard: routing.dashboard, 
                        issue: created 
                    } 
                }));
                
                return created;
            } catch (err) {
                console.error('[IssueRouting] Supabase create failed, falling back to localStorage:', err);
            }
        }
        
        // Fallback to localStorage
        const issueNumber = getNextIssueNumber();
        
        // Generate prefix based on dashboard
        const prefixMap = {
            'engineering': 'ENG',
            'qa': 'QA',
            'supply-chain': 'SC',
            'rfi': 'RFI'
        };
        const prefix = prefixMap[routing.dashboard] || 'ISS';
        
        const newIssue = {
            id: `issue-${Date.now()}`,
            issue_number: issueNumber,
            issue_display_id: `${prefix}-${String(issueNumber).padStart(4, '0')}`,
            routed_to: routing.dashboard,
            
            // Issue details
            issue_type: issueType,
            priority: issueData.priority || 'medium',
            title: issueData.title || '',
            description: issueData.description || '',
            
            // Context
            project_id: issueData.project_id || null,
            project_name: issueData.project_name || '',
            blm_id: issueData.blm_id || '',
            unit_type: issueData.unit_type || '',
            department: issueData.department || '',
            stage: issueData.stage || '',
            
            // Module linking (for shop-drawing issues)
            linked_module_id: issueData.linked_module_id || null,
            linked_module_serial: issueData.linked_module_serial || '',
            
            // Assignment
            submitted_by: issueData.submitted_by || 'Unknown',
            submitted_by_id: issueData.submitted_by_id || null,
            assigned_to: issueData.assigned_to || '',
            assigned_to_id: issueData.assigned_to_id || null,
            
            // Photos
            photo_urls: issueData.photo_urls || [],
            
            // Status
            status: 'open',
            comments: [],
            status_history: [{
                status: 'open',
                changed_by: issueData.submitted_by || 'Unknown',
                timestamp: new Date().toISOString(),
                note: `Issue created and routed to ${routing.label}`
            }],
            
            // Timestamps
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Save to appropriate storage
        const issues = loadIssues(routing.storageKey);
        issues.unshift(newIssue);
        saveIssues(routing.storageKey, issues);
        
        console.log(`[IssueRouting] Issue ${newIssue.issue_display_id} created (localStorage) and routed to ${routing.label}`);
        
        // Dispatch custom event for same-tab updates
        window.dispatchEvent(new CustomEvent('moda-issues-updated', { 
            detail: { 
                dashboard: routing.dashboard, 
                issue: newIssue 
            } 
        }));
        
        return newIssue;
    }

    // ===== GET ALL ISSUES FOR DASHBOARD =====
    function getIssuesForDashboard(dashboard) {
        const storageKeyMap = {
            'engineering': 'moda_engineering_issues',
            'qa': 'moda_qa_issues',
            'supply-chain': 'moda_supply_chain_issues',
            'rfi': 'moda_rfi_issues'
        };
        const storageKey = storageKeyMap[dashboard];
        if (!storageKey) return [];
        return loadIssues(storageKey);
    }

    // ===== GET ISSUE COUNTS BY DASHBOARD =====
    function getIssueCounts() {
        return {
            engineering: loadIssues('moda_engineering_issues').filter(i => i.status === 'open').length,
            qa: loadIssues('moda_qa_issues').filter(i => i.status === 'open').length,
            supplyChain: loadIssues('moda_supply_chain_issues').filter(i => i.status === 'open').length,
            rfi: loadIssues('moda_rfi_issues').filter(i => i.status === 'open').length
        };
    }

    // ===== GET OPEN SHOP-DRAWING ISSUES FOR MODULE =====
    // Returns open issues of type 'shop-drawing' linked to a specific module
    function getOpenShopDrawingIssuesForModule(moduleId) {
        if (!moduleId) return [];
        const issues = loadIssues('moda_engineering_issues');
        return issues.filter(issue => 
            issue.issue_type === 'shop-drawing' &&
            issue.status === 'open' &&
            issue.linked_module_id === moduleId
        );
    }

    // ===== CHECK IF MODULE HAS OPEN SHOP-DRAWING ISSUES =====
    function moduleHasOpenShopDrawingIssue(moduleId) {
        return getOpenShopDrawingIssuesForModule(moduleId).length > 0;
    }

    // ===== UPDATE ISSUE =====
    function updateIssue(issueId, updates, storageKey) {
        const issues = loadIssues(storageKey);
        const index = issues.findIndex(i => i.id === issueId);
        if (index === -1) return null;
        
        issues[index] = {
            ...issues[index],
            ...updates,
            updated_at: new Date().toISOString()
        };
        
        saveIssues(storageKey, issues);
        return issues[index];
    }

    // ===== DELETE ISSUE =====
    function deleteIssue(issueId, storageKey) {
        const issues = loadIssues(storageKey);
        const filtered = issues.filter(i => i.id !== issueId);
        saveIssues(storageKey, filtered);
        return filtered;
    }

    // ===== EXPORT API =====
    window.MODA_ISSUE_ROUTING = {
        ISSUE_TYPES,
        PRIORITY_LEVELS,
        ISSUE_ROUTING,
        
        getRoutingInfo,
        getDashboardLabel,
        getStorageKey,
        
        createIssue,
        loadIssues,
        saveIssues,
        updateIssue,
        deleteIssue,
        
        getIssuesForDashboard,
        getIssueCounts,
        getOpenShopDrawingIssuesForModule,
        moduleHasOpenShopDrawingIssue
    };

    console.log('[IssueRouting] Issue routing system initialized');
})();
