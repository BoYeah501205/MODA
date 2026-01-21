# MODA Changelog

All notable changes to MODA are documented in this file.

**Current Version: 1.3.15**

---

## [1.3.15] - 2025-01-21
### Prototype Scheduling UX Improvements
- **Place on Board Button**: Added green "Place on Board" button in Schedule Setup prototype section
- **Visual Placement Mode**: Click button to enter placement mode on Weekly Board with green line indicator
- **Green Line Indicator**: Hover over modules to see green placement line (similar to blue reorder line)
- **Week Navigation Arrows**: Added left/right arrows next to week dropdown for quick navigation between populated weeks
- **Placement Banner**: Shows active prototype being placed with cancel option

## [1.3.14] - 2025-01-21
### iPad PDF Viewer Fix
- **PDF.js Canvas Rendering**: On iPad/mobile, PDFs now render using PDF.js canvas instead of Google Docs Viewer iframe
- **Pinch-to-Zoom**: Added touch gesture support for pinch-to-zoom on mobile PDF viewer
- **Page Navigation**: Added page navigation controls (prev/next) for mobile PDF viewing
- **Zoom Controls**: Added zoom in/out buttons with percentage display
- **Memory Optimization**: Drawing Links on mobile now opens PDFs directly with page fragment instead of extracting pages (prevents Safari freezing)
- **Open in Browser**: Added fallback button to open PDF in Safari's native viewer

## [1.3.13] - 2025-01-20
### Project Modules Sort By Feature
- **Sort Dropdown**: Added "Sort By" dropdown in Project Detail view filters
- **Sort Options**: Build Sequence, Serial #, Unit Type, Hitch BLM, Rear BLM, Size, Stage, Progress
- **Bidirectional**: Each field supports ascending and descending sort
- **Grid & List**: Sorting now applies to both Grid and List views

## [1.3.12] - 2025-01-20
### iPad Mobile Fixes
- **Hamburger Menu**: Fixed menu not showing on iPad Gen 5 (1024px width) by adjusting breakpoint from 1024px to 1025px
- **Version Footer**: Added version number display at bottom of every page (MODA vX.Y.Z)
- **Breakpoint Fix**: Updated CSS and JavaScript hooks to include devices exactly 1024px wide

## [1.3.11] - 2025-01-20
### Drawing Links - Loading Indicator
- **Loading Spinner**: Opens new tab immediately with loading spinner while extracting pages
- **Popup Blocker Fix**: Pre-opens window to avoid browser popup blocking
- **User Feedback**: Shows "Extracting page X..." message during processing

## [1.3.10] - 2025-01-20
### Drawing Links Fix - Page Extraction
- **Fixed PDF URL**: Use getDownloadUrl instead of getPreviewUrl for pdf-lib extraction
- **Fallback Support**: Falls back to SharePoint preview with #page=N fragment if extraction fails

## [1.3.9] - 2025-01-20
### Drawing Links Enhancements
- **PDF Preview Link**: Added "Open PDF to find page numbers" hyperlink to browse the drawing package
- **Multiple Page Support**: Now supports single page (5), comma-separated (3,7,12), or ranges (1-5)
- **Smart Page Display**: Shows "Page X" for single pages, "Pages X,Y,Z" for multiple

## [1.3.8] - 2025-01-20
### Drawing Links Fix - Discipline Matching
- **Flexible Discipline Matching**: Fetch all project drawings and filter client-side to handle discipline ID/name mismatches
- **Improved Search**: Match drawings by discipline ID, name, or partial match

## [1.3.7] - 2025-01-20
### Drawing Links Fix
- **Folder Navigation**: Replaced dropdown with folder/tile navigation for selecting drawing packages
- **Direct Data Fetch**: Modals now fetch drawings directly from Supabase instead of relying on passed props
- **Step-by-Step Flow**: Configure link: Select Discipline -> Select Drawing -> Set Page Number

## [1.3.6] - 2025-01-20
### Drawing Links Feature (Permit Drawings)
- **Linked Details Panel**: New collapsible panel in Permit Drawings view for quick-access links to specific pages
- **Preset Links**: Default links for Shear Schedule, Window Schedule, Door Schedule, Set Sequence
- **Custom Links**: Add custom links with label, drawing package, and page number
- **Page Extraction**: Clicking a link extracts the specific page and opens it in a new browser tab
- **Permission Control**: Only Admin and Production Management roles can configure/add links
- **pdf-lib Integration**: Added pdf-lib library for client-side PDF page extraction

### Files Added
- `backend/create-drawing-links-table.sql` - Supabase migration for drawing_links table
- `js/supabase-drawing-links.js` - Data access layer for drawing links CRUD
- `js/components/DrawingLinksPanel.jsx` - UI component for linked details

## [1.3.5] - 2025-01-20
### Project Drawings
- **Project Number Sorting**: Project folder tiles now sorted by project number (highest first)
- **Project Number Badge**: Displays project number badge on folder tiles

## [1.3.4] - 2025-01-20
### Bug Fixes
- **Project Update Field Mapping**: Fixed Supabase update method to properly map frontend field names (camelCase) to database column names (snake_case)
- **Project Number Persistence**: project_number now correctly saves to database on edit

## [1.3.3] - 2025-01-20
### Keyboard Shortcuts
- **Removed Tab Navigation Shortcuts**: Disabled number keys (1-9) from switching tabs to prevent accidental navigation

## [1.3.2] - 2025-01-20
### Drawing Viewer Fix
- **Inline PDF Viewing**: Clicking drawing filenames now opens PDFs inline in browser instead of triggering download
- **SharePoint Preview Endpoint**: Uses Microsoft Graph preview API for proper browser display

### Bug Fixes
- **Project Number Supabase Persistence**: Fixed project_number and other fields not saving to Supabase database
- **Edit Project Supabase Sync**: Project edits now properly persist to Supabase (was only updating local state)

## [1.3.1] - 2025-01-19
### Project Directory Enhancements
- **Project Number Field**: Added new "Project #" column to Project Directory representing build-order for projects
- **Default Sort**: Projects now sort by Project Number descending by default (newest/current projects at top)
- **Edit/Create Support**: Project Number field added to both New Project and Edit Project modals

## [1.3.0] - 2025-01-19
### Build Sequence Management
- **Duplicate Detection**: Project Detail now shows warnings for duplicate Serial Numbers, Build Sequences, and BLM IDs within a project
- **Sequence History**: New "Sequence History" button in Project Detail to view and restore previous build sequence configurations
- **Confirmation Required**: WeeklyBoard now saves sequence history before reordering modules (drag-and-drop or move modal)
- **Prototype Preservation**: Prototype modules now store their original build sequence when inserted into schedule, allowing restoration
- **Update Sequences Only**: New import mode to update ONLY build sequence numbers without changing other module data

### Technical
- Created `build_sequence_history` table schema for Supabase
- Added `supabase-sequence-history.js` data layer for history operations
- Added `BuildSequenceHistory.jsx` component for viewing/restoring sequences

## [1.2.2] - 2025-01-18
### Bug Fixes
- **Time Estimate Display**: Added estimated time remaining to the UploadModal progress bar (was only showing in overlay)

## [1.2.1] - 2025-01-18
### Bug Fixes
- **Skip All Fix**: "Skip All" now properly skips all remaining duplicate files (was only skipping one)
- **Cancel Upload Fix**: Cancel button now immediately stops the upload loop (was continuing to upload)
- **Technical**: Changed from React state to useRef for cancel flag - refs update synchronously within async loops

## [1.2.0] - 2025-01-18
### Bulk Upload Improvements
- **Apply to All**: When duplicate files detected during bulk upload, "Apply to All" and "Skip All" buttons appear to handle all remaining duplicates with one click
- **Time Estimates**: Upload progress overlay now shows estimated time remaining based on average upload speed
- **Cancel Upload**: Added "Cancel Upload" button to stop bulk uploads mid-process without leaving stuck modals
- **Duplicate Count**: Shows how many more duplicates remain when prompting for action

## [1.1.9] - 2025-01-17
### Drawings Module Advanced Filters
- **Advanced Filters Panel**: Expandable filter section in Module Packages view
- **Unit Type Filter**: Multi-select dropdown with OR logic (matches hitch OR rear)
- **Room Type Filter**: Multi-select dropdown with OR logic (matches hitch OR rear)
- **Difficulty Checkboxes**: Filter by Sidewall, Stair, 3HR Wall, Short, Double Studio, Sawbox
- **Quick Filter Chips**: Dynamic chips showing top 4 most common unit/room types per project
- **localStorage Persistence**: Filters saved per project, restored on return
- **Clear Filters**: One-click reset with localStorage cleanup
- **Unlinked Handling**: Unlinked drawings hidden when filters active (with count shown)

## [1.1.8] - 2025-01-17
### Weekly Board Popout Week Sync (localStorage)
- **localStorage Sync**: Main app saves selected week ID to localStorage when navigating weeks
- **Popout Reads localStorage**: Popout reads the saved week ID on load to display same week as main app
- **No URL Parameters**: Avoids the routing issues from v1.1.6

## [1.1.7] - 2025-01-17
### Revert Popout Changes
- **Reverted v1.1.6**: URL parameter approach broke popout window opening
- **Kept Supabase Loading**: Popout still loads weeks/staggers from Supabase (v1.1.5 fix)
- **Investigation Needed**: Week sync between main app and popout requires different approach

## [1.1.6] - 2025-01-17
### Weekly Board Popout Week Sync (Reverted)
- **Week ID Passed via URL**: Popout now receives the currently displayed week ID from main app via URL parameter
- **Correct Week Display**: Popout shows the exact same week that was being viewed in main app when "Pop Out" was clicked
- **Fallback to Current Week**: If no week ID in URL, defaults to calendar current week

## [1.1.5] - 2025-01-17
### Weekly Board Popout Fix
- **Fixed Data Sync**: Popout window now loads weeks and staggers from Supabase instead of stale localStorage data
- **Consistent Module Display**: Popout now shows same modules and starting positions as main browser window

## [1.1.4] - 2025-01-17
### Shop Drawing Linking & Bulk Rename
- **Fixed Shop Drawing Button**: WeeklyBoard shop drawing button now correctly finds drawings with partial BLM matches (e.g., L4M08 matches B1L4M08)
- **Fix Unlinked Button**: New button in Module Packages header shows count of unlinked drawings
- **Bulk Rename Modal**: Review and apply recommended filename changes to link drawings to modules
- **Duplicate Detection**: Warns if recommended name would conflict with existing file
- **Manual Edit Fallback**: Items without recommendations can be edited individually

## [1.1.3] - 2025-01-17
### Drawings Module Layout & Bulk Upload
- **Full-Width Layout**: Drawings tab now uses full-width layout like Production tab (reduced side padding)
- **Bulk Upload Warning**: Shows warning when selecting >20 files with option to continue or clear
- **Clear All Button**: Added "Clear all" button to selected files list
- **Total Size Display**: Shows total file size when selecting more than 5 files

## [1.1.2] - 2025-01-17
### Drawings Module Fixes
- **Removed Replace Existing**: Duplicate file prompt now only shows "Add as New Version" and "Skip"
- **Fixed Drawing Counts**: Soft-deleted drawings no longer counted in folder badges
- **Removed Browse Sheets**: Button temporarily removed pending feature completion
- **Removed Size/Uploaded By Columns**: Moved to File Info modal to reduce table width

## [1.1.1] - 2025-01-17
### Drawings Module UX Improvements
- **Mobile View-Only Mode**: On mobile devices, upload/edit/delete buttons are hidden - view and search only
- **Search/Filter**: New search bar to filter drawings by filename, serial no., BLM ID, or build sequence
- **Sortable File Name**: Click "File Name" column header to sort A-Z or Z-A
- **File Info Modal**: New info button shows file size, version count, upload details, and module link status
- **Reduced Padding**: Less side padding on the module for better table display and less text wrapping
- **Horizontal Scroll**: Table scrolls horizontally on mobile to show all columns

## [1.1.0] - 2025-01-17
### Drawing Management Enhancements
- **Unlinked Warning Badge**: Red "Unlinked" badge appears on drawings where parsed BLM doesn't match any project module
- **Edit Drawing Modal**: New edit button to rename drawings and manually link to modules
- **Soft Delete with Recovery**: Deleted drawings are hidden but remain in SharePoint for admin recovery
- **Activity Logging**: All drawing operations (upload, rename, delete, restore) are logged for audit trail
- **SharePoint Folder Structure**: Module Packages now create subfolders per module with versioned filenames (e.g., `B1L3M18 - Shops/B1L3M18 - Shops_v1.0.pdf`)

### Database Migration Required
Run `backend/add-drawing-activity-and-soft-delete.sql` in Supabase to add:
- `deleted_at` column for soft delete
- `linked_module_id` column for manual module linking
- `drawing_activity` table for audit logging

## [1.0.9] - 2025-01-17
- Fix: App.jsx Shop Drawing button now correctly finds newly uploaded drawings (uses direct query instead of RPC)
- Fix: Duplicate file detection now fetches fresh data before checking (prevents duplicate uploads)
- Feature: Module Packages columns (Serial No., Build Seq, Hitch BLM, Rear BLM) are now sortable
- Feature: Default sort by Build Seq ascending when opening Module Packages
- Feature: SharePoint folder structure for Module Packages - creates subfolder per module with versioned filenames
- Linked module data automatically updates when project Build Seq changes (live lookup from project data)

## [1.0.8] - 2025-01-17
- Drawings Module: Add Serial No., Build Sequence, Hitch BLM, Rear BLM columns to Module Packages folder
- Drawings Module: Auto-parse BLM from uploaded file names and link to module data
- Drawings Module: Add cache-busting to file URLs to ensure current version always loads
- Drawings Module: Remove redundant download button (file name link already opens file)
- Drawings Module: Fix mobile file link click issue with touch-manipulation
- WeeklyBoard: Shop Drawing button now directly opens current version with cache-busting
- WeeklyBoard: Improved error messages with instructions for adding shop drawings

## [1.0.7] - 2025-01-16
- Move menu button to bottom-right, remove ellipse styling, make smaller

## [1.0.6] - 2025-01-16
- Bump version for cache testing

## [1.0.5] - 2025-01-16
- Add version footer to all pages
- FAB menu button at bottom-left
- Cache-busting meta tags

## [1.0.4] - 2025-01-16
- Fix mobile UI: sticky header with iOS safe area
- Larger hamburger touch target
- Content spacing fixes

## [1.0.3] - 2025-01-15
- Optimize load time: remove Tesseract.js, defer heavy libraries (xlsx, jspdf, pdf.js, qrcode)

## [1.0.2] - 2025-01-15
- Fix Tesseract.js CDN URL - use browser UMD build

## [1.0.1] - 2025-01-15
- Fix Supabase insert issues (routed_to, issue_category columns)
- Fix login page cutoff
- Fix UUID fields for Supabase

## [1.0.0] - 2025-01-14
- Initial versioned release
- Issue Types Manager with export
- Engineering issues data flow improvements
- Mobile localStorage redirect to memory storage
- iOS Safari quota error fixes
- Toast notifications system
- iOS Safari error handling and ErrorBoundary
- Issues section in Supply Chain Board

---

## Pre-1.0 Notable Features

### Weekly Board
- Keyboard navigation (arrow keys, 0-4 for progress)
- Pop-out window for focused production view
- Modules On Board sidebar panel
- Prototype scheduling improvements
- Full-width Production tab mode

### Admin & Settings
- Consolidated Admin tab with accordion sections
- Issue Categories Manager
- User management improvements

### Mobile
- Mobile-first responsive design
- Hamburger navigation drawer
- iOS Safari compatibility fixes
- Debug console for mobile troubleshooting

### Drawings System
- SharePoint integration for file storage
- OCR sheet extraction (Tesseract.js)
- Module drawings viewer with QR codes
- License plate generation

### Engineering
- Issue Tracker with Supabase sync
- Multi-user support

### Infrastructure
- Supabase backend (PostgreSQL + Auth)
- Vercel deployment
- Real-time data sync

---

*To check current version: Look at footer of any MODA page or check `index.html` line 15*
