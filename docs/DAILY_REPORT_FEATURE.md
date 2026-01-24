# Daily Set Report Feature

## Overview

Mobile-first daily reporting tool for on-site technicians to document module sets, issues, and photos during construction.

## Features

### 1. Daily Report Wizard
- **5-step mobile-optimized wizard**:
  1. **Setup** - Select project, date, fetch/enter weather
  2. **Modules** - Select modules, mark set status, set sequence
  3. **Issues** - Log issues with categories, severity, action taken
  4. **Photos** - Add general site photos
  5. **Review** - Summary and submit

### 2. Issue Tracking
- **Categorized issues** for data collection:
  - Quality Defect (drywall, paint, flooring, cabinets, trim, structural)
  - Transit Damage (exterior, interior, roof, window/door)
  - Site Condition (foundation, access, weather delay, crane)
  - Missing/Wrong (missing material, wrong material, missing hardware)
  - Drawing/Design (dimension error, conflict, missing info, RFI needed)
  - MEP (electrical, plumbing, HVAC, fire protection)
  - Other

- **Severity levels**: Critical, Major, Minor
- **Action tracking**: Document what was done to address issues
- **Comments/responses**: Team can discuss issues

### 3. Weather Integration
- **Auto-fetch** from Open-Meteo API (free, no API key)
- **Manual entry** option with common conditions
- Captures: high/low temp, conditions, wind, precipitation

### 4. Photo Management
- **SharePoint folder structure**: `On-Site/{Project}/{Date}/Module_{BLM}` or `General/`
- **Module-specific photos**: Linked to individual modules
- **General photos**: Site-wide documentation
- **Offline support**: Photos stored locally until sync

### 5. Export Options
- **PDF generation** with jsPDF
- **Word document** with docx library
- Photo links (not embedded) to keep file sizes manageable

### 6. Module Integration
- View report history from Project Directory
- See all issues, photos, set history per module
- Comments on issues for team discussion

## Database Schema

### Tables Created
- `daily_reports` - Main report record
- `report_modules` - Module set status per report
- `report_issues` - Issues found during set
- `report_issue_comments` - Discussion on issues
- `report_photos` - Photo metadata and links
- `report_distribution_lists` - Email distribution lists
- `report_distribution_recipients` - List members

### Key Functions
- `get_module_issues(module_id)` - All issues for a module
- `get_report_summary(report_id)` - Statistics for a report
- `get_module_report_history(module_id)` - All reports containing module

## Files Created

### Backend
- `backend/create-daily-reports-tables.sql` - Supabase migration

### JavaScript
- `js/supabase-daily-reports.js` - Data access layer
- `js/report-export.js` - PDF/Word generation

### Components
- `js/components/onsite/DailyReportWizard.jsx` - Main wizard
- `js/components/onsite/ReportIssueLogger.jsx` - Issue entry form
- `js/components/onsite/IssueComments.jsx` - Comment system
- `js/components/onsite/ModuleReportHistory.jsx` - Module history view

### Styles
- `css/daily-report.css` - Mobile-first styles

## Setup Instructions

### 1. Run Database Migration
```sql
-- In Supabase SQL Editor, run:
-- backend/create-daily-reports-tables.sql
```

### 2. Verify Script Imports
Scripts are already added to `index.html`:
- `supabase-daily-reports.js`
- `report-export.js`
- `DailyReportWizard.jsx`
- `ReportIssueLogger.jsx`
- `IssueComments.jsx`
- `ModuleReportHistory.jsx`

### 3. CSS Import
Already added to `index.html`:
- `css/daily-report.css`

## Usage

### Creating a Daily Report
1. Navigate to On-Site tab
2. Click "Create Daily Report"
3. Follow 5-step wizard
4. Submit when complete

### Viewing Module History
1. Go to Projects tab
2. Select a project
3. Click on a module
4. View "Report History" section

### Exporting Reports
1. Open a completed report
2. Click "Export PDF" or "Export Word"
3. File downloads automatically

## SharePoint Integration

### Folder Structure (Option A)
```
On-Site/
├── {Project Name}/
│   ├── {YYYY-MM-DD}/
│   │   ├── Module_{BLM}/
│   │   │   ├── photo1.jpg
│   │   │   └── photo2.jpg
│   │   └── General/
│   │       └── site_photo.jpg
```

### Photo Upload Flow
1. Photos captured in app
2. Stored locally with base64 data
3. On sync, uploaded to SharePoint
4. URL stored in `report_photos` table
5. Local data cleared after successful upload

## Offline Support

### How It Works
1. Reports can be created offline
2. Data stored in localStorage
3. `syncPendingReports()` uploads when online
4. Photos queued separately with `sync_status`

### Checking Pending Items
```javascript
// Get pending reports
const pending = MODA_DAILY_REPORTS.getPendingReports();

// Sync all pending
const results = await MODA_DAILY_REPORTS.syncPendingReports();
```

## API Reference

### Reports
```javascript
// Create
const report = await MODA_DAILY_REPORTS.createReport(projectId, date, options);

// Get with full details
const report = await MODA_DAILY_REPORTS.getReport(reportId);

// Update
await MODA_DAILY_REPORTS.updateReport(reportId, { general_notes: '...' });

// Submit
await MODA_DAILY_REPORTS.submitReport(reportId);
```

### Issues
```javascript
// Create
const issue = await MODA_DAILY_REPORTS.createIssue(reportId, {
    moduleId: '...',
    category: 'quality_defect',
    subcategory: 'drywall',
    severity: 'major',
    description: '...',
    actionTaken: '...'
});

// Add comment
await MODA_DAILY_REPORTS.addComment(issueId, 'Comment text');

// Resolve
await MODA_DAILY_REPORTS.resolveIssue(issueId, 'Resolution notes');
```

### Export
```javascript
// Generate PDF
await MODA_REPORT_EXPORT.generatePDF(report);

// Generate Word
await MODA_REPORT_EXPORT.generateWord(report);
```

## Future Enhancements

1. **Email distribution** - Auto-send reports to stakeholder lists
2. **SharePoint auto-upload** - Direct integration with SharePoint API
3. **Signature capture** - Digital signatures on reports
4. **GPS location** - Auto-capture coordinates
5. **Voice notes** - Audio descriptions for issues
6. **Real-time sync** - Supabase realtime for multi-user updates
