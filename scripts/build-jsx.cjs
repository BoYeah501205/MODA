/**
 * MODA JSX Pre-Compiler
 * 
 * This script compiles all JSX files to plain JavaScript at build time,
 * eliminating the need for Babel Standalone in the browser (~2.5MB savings).
 * 
 * The compiled output preserves the global window.X = pattern used throughout
 * the codebase, so no architectural changes are needed.
 * 
 * Usage: node scripts/build-jsx.cjs
 */

const fs = require('fs');
const path = require('path');
const { transformSync } = require('@babel/core');

// Configuration
const JSX_SOURCE_DIR = path.join(__dirname, '..', 'js', 'components');
// Output to root level - Vite will copy to dist/ during build
const OUTPUT_FILE = path.join(__dirname, '..', 'moda-components.js');
const CONTEXTS_DIR = path.join(__dirname, '..', 'js', 'contexts');

// Files to compile in order (dependencies first)
// This order matches the script loading order in index.html
const FILE_ORDER = [
    // Contexts
    '../js/contexts/ProjectContext.jsx',
    
    // UI Components (shared, load first)
    'ui/Modal.jsx',
    'ui/StatusBadge.jsx',
    'ui/DifficultyBadge.jsx',
    'ui/ProgressBar.jsx',
    'ui/ErrorBoundary.jsx',
    
    // Auth Components
    'auth/AuthConstants.jsx',
    'auth/AuthModule.jsx',
    'auth/LoginPage.jsx',
    'auth/RoleManager.jsx',
    'auth/CustomPermissionsEditor.jsx',
    'auth/UserPermissionsManager.jsx',
    
    // Core Components
    'MobileNavigation.jsx',
    'TrainingMatrix.jsx',
    'WeeklyBoard.jsx',
    'RFIManager.jsx',
    'PreconModule.jsx',
    'ExecutiveDashboard.jsx',
    'DashboardHome.jsx',
    'NavigationGroups.jsx',
    'UserProfileModal.jsx',
    
    // QA Module
    'QAModule.jsx',
    'qa/QADashboard.jsx',
    'qa/TravelersPanel.jsx',
    'qa/InspectionsPanel.jsx',
    'qa/DeviationsPanel.jsx',
    'qa/TestingPanel.jsx',
    'qa/QAReportsPanel.jsx',
    'qa/TravelerDetailModal.jsx',
    'qa/QAInspectionModal.jsx',
    
    // Feature Modules
    'YardMap.jsx',
    'YardMapV2.jsx',
    'TransportModule.jsx',
    'EquipmentModule.jsx',
    'PeopleModule.jsx',
    'ProjectsModule.jsx',
    'TrackerModule.jsx',
    'AutomationModule.jsx',
    'HeatMapMatrix.jsx',
    'WeeklyHeatMapReport.jsx',
    'WeeklyBoardPrintReport.jsx',
    'WeeklyBoardManagementReport.jsx',
    'ReportsHub.jsx',
    
    // Drawings Module
    'DrawingLinksPanel.jsx',
    'DrawingsModule.jsx',
    'PDFViewerModal.jsx',
    'DrawingStatusLog.jsx',
    'SheetBrowser.jsx',
    'AnalysisBrowser.jsx',
    'OCRProgressIndicator.jsx',
    'ModuleDrawingsViewer.jsx',
    'ModuleMenuPage.jsx',
    
    // Toast & Issues
    'ToastNotification.jsx',
    'IssueTypesManager.jsx',
    'IssueCategoriesManager.jsx',
    'IssueSubmissionModal.jsx',
    'IssueDetailModal.jsx',
    'EngineeringModule.jsx',
    
    // Procurement
    'ProcurementBoard.jsx',
    
    // On-Site Module
    'onsite/PhotoCapture.jsx',
    'onsite/IssueLogger.jsx',
    'onsite/ReportIssueLogger.jsx',
    'onsite/IssueComments.jsx',
    'onsite/DailyReportWizard.jsx',
    'onsite/ModuleReportHistory.jsx',
    'onsite/OnSiteTab.jsx',
    
    // Admin
    'AdminPanel.jsx',
    
    // Activity Log
    'ActivityLogViewer.jsx',
    
    // Build Sequence
    'BuildSequenceHistory.jsx',
    
    // Main App (must be last)
    'App.jsx'
];

// Babel configuration for JSX transformation
const babelConfig = {
    presets: [
        ['@babel/preset-react', {
            runtime: 'classic', // Use React.createElement, not jsx runtime
            pragma: 'React.createElement',
            pragmaFrag: 'React.Fragment'
        }]
    ],
    plugins: [],
    sourceMaps: false,
    compact: false // Keep readable for debugging
};

// React hooks and classes that are commonly destructured at file top
// We'll extract these once at the bundle top and remove duplicates
const REACT_HOOKS = [
    'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 
    'useContext', 'useReducer', 'useLayoutEffect', 'useImperativeHandle',
    'useDebugValue', 'useDeferredValue', 'useTransition', 'useId',
    'createContext', 'forwardRef', 'memo', 'lazy', 'Suspense', 'Fragment',
    'Component', 'PureComponent'
];

// Remove duplicate React destructuring statements
function removeDuplicateReactDestructuring(code) {
    // Pattern matches: const { useState, useEffect, ... } = React;
    // Also matches variations with different spacing/newlines
    const destructurePattern = /^\s*const\s*\{\s*([^}]+)\s*\}\s*=\s*React\s*;?\s*$/gm;
    
    return code.replace(destructurePattern, (match, hooks) => {
        // Return empty string to remove the duplicate declaration
        return '// [Removed duplicate React destructuring]';
    });
}

function compileJSX(filePath) {
    const code = fs.readFileSync(filePath, 'utf-8');
    
    try {
        const result = transformSync(code, {
            ...babelConfig,
            filename: filePath
        });
        return result.code;
    } catch (error) {
        console.error(`Error compiling ${filePath}:`, error.message);
        throw error;
    }
}

function build() {
    console.log('MODA JSX Pre-Compiler');
    console.log('=====================\n');
    
    // Ensure dist directory exists
    const distDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }
    
    const compiledParts = [];
    let totalSize = 0;
    let fileCount = 0;
    
    // Add header with React hooks extracted once
    compiledParts.push(`/**
 * MODA Pre-Compiled Components
 * Generated: ${new Date().toISOString()}
 * 
 * This file contains all JSX components pre-compiled to JavaScript.
 * DO NOT EDIT - regenerate with: node scripts/build-jsx.cjs
 */

// Extract React hooks and classes once at bundle top (prevents duplicate declarations)
const { 
    useState, useEffect, useCallback, useMemo, useRef, 
    useContext, useReducer, useLayoutEffect, useImperativeHandle,
    useDebugValue, useDeferredValue, useTransition, useId,
    createContext, forwardRef, memo, lazy, Suspense, Fragment,
    Component, PureComponent
} = React;
`);
    
    // Compile each file in order
    for (const relativePath of FILE_ORDER) {
        let fullPath;
        if (relativePath.startsWith('../')) {
            fullPath = path.join(__dirname, '..', relativePath.replace('../', ''));
        } else {
            fullPath = path.join(JSX_SOURCE_DIR, relativePath);
        }
        
        if (!fs.existsSync(fullPath)) {
            console.warn(`  SKIP: ${relativePath} (not found)`);
            continue;
        }
        
        console.log(`  Compiling: ${relativePath}`);
        
        let compiled = compileJSX(fullPath);
        
        // Remove duplicate React destructuring statements
        compiled = removeDuplicateReactDestructuring(compiled);
        
        const size = Buffer.byteLength(compiled, 'utf-8');
        totalSize += size;
        fileCount++;
        
        // Add file marker for debugging
        compiledParts.push(`\n// ============================================================================`);
        compiledParts.push(`// FILE: ${relativePath}`);
        compiledParts.push(`// ============================================================================`);
        
        // Wrap in IIFE to prevent variable collisions between files
        // But expose window.X assignments to global scope
        compiledParts.push(`(function() {`);
        compiledParts.push(compiled);
        compiledParts.push(`})();\n`);
    }
    
    // Write output
    const output = compiledParts.join('\n');
    fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');
    
    const outputSize = Buffer.byteLength(output, 'utf-8');
    
    console.log('\n=====================');
    console.log(`Compiled ${fileCount} files`);
    console.log(`Output: ${OUTPUT_FILE}`);
    console.log(`Size: ${(outputSize / 1024).toFixed(1)} KB`);
    console.log('\nNext steps:');
    console.log('1. Update index.html to use dist/moda-components.js');
    console.log('2. Remove Babel Standalone script tag');
    console.log('3. Remove type="text/babel" from script tags');
}

// Run build
build();
