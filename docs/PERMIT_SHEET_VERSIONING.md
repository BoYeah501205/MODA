# Permit Sheet Versioning System

## Overview

The Permit Sheet Versioning System enables tracking of individual sheet updates within permit drawing packages. When abbreviated update packages are uploaded, the system uses OCR to extract sheet numbers from title blocks and automatically manages version chains.

## Key Concepts

- **Package**: A PDF upload (full set or update set)
- **Sheet**: Individual page within a package, identified by sheet number (e.g., `S0.01M`)
- **Sheet Version**: A specific revision of a sheet (tracked by revision field like `A`, `B`, `1`, `2`)
- **Compiled Package**: Virtual assembly of the latest version of each sheet

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERMIT DRAWING PACKAGES                       │
├─────────────────────────────────────────────────────────────────┤
│ Package v1.0 (Full Set)     │ Package v1.1 (Update)            │
│ ├── S0.01M Cover Sheet      │ ├── S0.01M Cover Sheet (REV A)   │
│ ├── S1.01 Foundation        │ └── S2.03 Framing (REV A)        │
│ ├── S2.01 Framing           │                                   │
│ ├── S2.02 Framing           │ Package v1.2 (Update)            │
│ ├── S2.03 Framing           │ └── S1.01 Foundation (REV B)     │
│ └── S3.01 Details           │                                   │
├─────────────────────────────────────────────────────────────────┤
│              COMPILED CURRENT PACKAGE (Auto-generated)           │
│ ├── S0.01M Cover Sheet      ← from v1.1 (REV A)                 │
│ ├── S1.01 Foundation        ← from v1.2 (REV B)                 │
│ ├── S2.01 Framing           ← from v1.0 (original)              │
│ ├── S2.02 Framing           ← from v1.0 (original)              │
│ ├── S2.03 Framing           ← from v1.1 (REV A)                 │
│ └── S3.01 Details           ← from v1.0 (original)              │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Tables

1. **`permit_packages`** - Tracks uploaded packages
   - `id`, `project_id`, `discipline`
   - `package_name`, `package_version`, `package_type` (full/update)
   - `job_number`, `package_date`
   - `storage_path`, `file_size`, `total_sheets`
   - `ocr_status`, `ocr_processed_at`, `ocr_error`

2. **`permit_sheet_versions`** - Individual sheets with version tracking
   - `id`, `package_id`, `project_id`
   - `sheet_number`, `sheet_number_normalized` (for matching)
   - `sheet_title`, `revision`, `revision_date`
   - `drawn_by`, `checked_by`, `designed_by`
   - `discipline_code`, `discipline_name`
   - `page_number`, `storage_path`, `file_size`
   - `ocr_confidence`, `ocr_metadata`
   - `is_current`, `superseded_by`, `supersedes` (version chain)

### Key Functions

- `normalize_sheet_number(text)` - Normalizes for matching (uppercase, no spaces)
- `parse_discipline_from_sheet_number(text)` - Extracts discipline from prefix
- `get_current_sheets(project_id, discipline)` - Returns compiled current set
- `get_sheet_history(project_id, sheet_number)` - Returns all versions of a sheet
- `process_sheet_update(sheet_id)` - Manages version chain when new sheet uploaded

## Files Created

### Backend
- `backend/create-permit-sheet-versioning.sql` - Database migration

### Edge Function
- `supabase/functions/process-permit-sheets/index.ts` - OCR processing

### Frontend
- `js/supabase-permit-sheets.js` - Data access layer
- `js/components/PermitPackageBrowser.jsx` - UI component

## Setup

### 1. Run Database Migration

In Supabase SQL Editor, run:
```sql
-- Run: backend/create-permit-sheet-versioning.sql
```

### 2. Deploy Edge Function

```bash
supabase functions deploy process-permit-sheets
```

Ensure the `OCR_Reader` secret is set (Claude API key).

### 3. Build JSX Components

```bash
node scripts/build-jsx.cjs
```

## Usage

### Uploading a Full Package

1. Navigate to Drawings > Permit Drawings > [Discipline]
2. Click "Upload Package"
3. Select "Full Set" and upload PDF
4. System will:
   - Split PDF into individual sheets
   - OCR each sheet to extract title block data
   - Store sheets with version tracking

### Uploading an Update Package

1. Navigate to same discipline folder
2. Click "Upload Package"
3. Select "Update Package" and upload PDF
4. System will:
   - Split PDF and OCR each sheet
   - Match sheets by sheet number
   - Mark previous versions as superseded
   - New sheets become "current"

### Viewing Current Sheets

The "Current Sheets" tab shows the latest version of each unique sheet number - this is the compiled current package.

### Viewing Sheet History

Click the history icon on any sheet to see all versions of that sheet across packages.

### Downloading

- **Individual Sheet**: Click download icon on any sheet
- **All Current Sheets**: Click "Download All" in Current Sheets tab

## Title Block OCR

The system extracts these fields from permit drawing title blocks:

| Field | Example | Notes |
|-------|---------|-------|
| Sheet Number | `S0.01M` | Primary matching key |
| Sheet Title | `STRUCTURAL COVER SHEET` | Description |
| Revision | `A`, `B`, `1` | Revision indicator |
| Revision Date | `10/07/2025` | Converted to YYYY-MM-DD |
| Drawn By | `BP` | Initials |
| Checked By | `KR` | Initials |
| Designed By | `AM` | Initials |
| Job Number | `A24-082` | Project reference |

### Sheet Number Formats

- `S0.01M`, `S1.01`, `S2.03` - Structural
- `A1.01`, `A2.01` - Architectural
- `M1.01`, `M2.01` - Mechanical
- `P1.01`, `P2.01` - Plumbing
- `E1.01`, `E2.01` - Electrical
- `FA1.01` - Fire Alarm
- `FS1.01` - Fire Sprinkler

### Discipline Detection

First letter(s) of sheet number determine discipline:
- `S` = Structural
- `A` = Architectural
- `M` = Mechanical
- `P` = Plumbing
- `E` = Electrical
- `FA` = Fire Alarm
- `FS` = Fire Sprinkler
- `T` = Title 24
- `C` = Civil

## API Reference

### JavaScript (Frontend)

```javascript
// Get all packages for a discipline
const packages = await MODA_PERMIT_SHEETS.getPackages(projectId, discipline);

// Get current (compiled) sheets
const currentSheets = await MODA_PERMIT_SHEETS.getCurrentSheets(projectId, discipline);

// Get sheet version history
const history = await MODA_PERMIT_SHEETS.getSheetHistory(projectId, 'S0.01M');

// Get package with its sheets
const pkg = await MODA_PERMIT_SHEETS.getPackageWithSheets(packageId);

// Upload and process new package
const pkg = await MODA_PERMIT_SHEETS.createPackage({
    projectId,
    discipline,
    packageName: 'Structural Plans',
    packageVersion: 'v1.1',
    packageType: 'update',
    storagePath,
    uploadedBy: 'John Doe'
});
await MODA_PERMIT_SHEETS.processPackage(pkg.id);

// Download sheet
await MODA_PERMIT_SHEETS.downloadSheet(sheet);

// Get statistics
const stats = await MODA_PERMIT_SHEETS.getStats(projectId, discipline);
```

## Cost Considerations

- **OCR**: ~$0.01-0.02 per sheet (Claude API)
- **Storage**: Individual sheet PDFs stored in Supabase Storage
- **Processing Time**: ~2-5 seconds per sheet

## Future Enhancements

1. **Side-by-side comparison** - Compare two versions of same sheet
2. **Markup/annotations** - Add comments to sheets
3. **Batch download as ZIP** - Download compiled package as single ZIP
4. **Email notifications** - Notify team when sheets are updated
5. **Integration with RFI system** - Link sheet updates to RFIs
