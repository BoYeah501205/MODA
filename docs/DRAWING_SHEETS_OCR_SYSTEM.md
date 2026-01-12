# Drawing Sheets OCR & Extraction System

## Overview

The Drawing Sheets OCR & Extraction System extends MODA's drawing management capabilities to support multi-page PDF shop drawing packages. It automatically splits PDFs into individual sheets, extracts title block metadata using Claude Vision API, and enables advanced filtering by module, unit type, discipline, and BLM type.

## Features

### 1. PDF Splitting
- Automatically splits multi-page PDF packages into individual sheet PDFs
- Preserves original quality and formatting
- Stores each sheet separately in Supabase Storage

### 2. OCR Title Block Extraction
- Uses Claude 3.5 Sonnet Vision API to analyze each sheet
- Extracts structured metadata from title blocks:
  - **Sheet Name/Number** (e.g., "Cover Sheet", "M-1", "E-2")
  - **Sheet Title** (e.g., "HITCH / PULL-POINT LOCATIONS")
  - **BLM Type** (module type code: C1, B2, SW, etc.)
  - **Discipline** (Mechanical, Electrical, Plumbing, Structural, Architectural)
  - **Scale** (e.g., "1/4\" = 1'-0\"", "N/A")
  - **Date**
  - **Revision**
  - **Drawn By**
  - **Checked By**
- Confidence scoring for OCR accuracy

### 3. Auto-Linking to Modules
- Parses module identifiers from filenames (e.g., B1L2M15)
- Matches sheets to project modules based on:
  - Filename patterns (B1L2M15, B1-L2-M15, etc.)
  - BLM type matching
- Updates module relationships automatically

### 4. Advanced Filtering & Search
- **Filter by Module**: View sheets for specific modules
- **Filter by Unit Type**: Find all sheets for a unit type (e.g., all C1 units)
- **Filter by Discipline**: Get all Mechanical, Electrical, etc. sheets
- **Filter by BLM Type**: Search by module type code
- **Text Search**: Search sheet names and titles
- **Combined Filters**: Use multiple filters simultaneously

### 5. Bulk Operations
- Select multiple sheets for batch download
- View individual sheets in browser
- Download sheets as ZIP (planned)

## Architecture

### Database Schema

#### `drawing_sheets`
Stores individual sheets extracted from PDF packages.

```sql
- id: UUID (primary key)
- drawing_file_id: UUID (references parent PDF)
- project_id: UUID
- sheet_number: INTEGER (page number in original PDF)
- sheet_name: TEXT (parsed from title block)
- sheet_title: TEXT (description)
- storage_path: TEXT (Supabase Storage path)
- file_size: BIGINT
- ocr_metadata: JSONB (full OCR result)
- ocr_confidence: DECIMAL (0-100)
- blm_type: TEXT (module type code)
- discipline: TEXT
- scale: TEXT
- drawing_date: DATE
- revision: TEXT
- linked_module_id: UUID (auto-linked module)
```

#### `sheet_extraction_jobs`
Tracks PDF processing jobs.

```sql
- id: UUID
- drawing_file_id: UUID
- status: TEXT (pending, processing, completed, failed)
- total_sheets: INTEGER
- processed_sheets: INTEGER
- error_message: TEXT
- processing_time_ms: INTEGER
```

#### `module_unit_types`
Reference table for unit type codes.

```sql
- id: UUID
- code: TEXT (e.g., "C1", "B2", "SW")
- name: TEXT (e.g., "Corner Unit Type 1")
- category: TEXT (e.g., "Living", "Bathroom", "Stair")
```

### Edge Function: `process-drawing-sheets`

Supabase Edge Function that handles PDF splitting and OCR processing.

**Endpoint**: `https://syreuphexagezawjyjgt.supabase.co/functions/v1/process-drawing-sheets`

**Process**:
1. Downloads PDF from Supabase Storage
2. Uses pdf-lib to split into individual pages
3. Uploads each page as separate PDF
4. Calls Claude Vision API for OCR on each sheet
5. Parses JSON response and stores metadata
6. Auto-links sheets to modules
7. Updates job status

**Cost**: ~$0.01-0.02 per sheet (Claude API)

### Frontend Components

#### `supabase-drawing-sheets.js`
Data access layer for sheet operations.

**Key Functions**:
- `processDrawingSheets(drawingFileId)` - Trigger processing
- `searchSheets(filters)` - Advanced filtering
- `getSheetsByUnitTypeAndDiscipline(projectId, unitType, discipline)` - Specific query
- `downloadSheet(sheet)` - Download individual sheet
- `getProjectSheetStats(projectId)` - Statistics

#### `SheetBrowser.jsx`
React component for browsing and filtering sheets.

**Features**:
- Filter panel with 5 filter types
- Grid and list view modes
- Multi-select for bulk operations
- Statistics dashboard
- Sort by sheet number, name, or discipline

#### `DrawingsModule.jsx` (Enhanced)
Added sheet processing integration:
- "Extract Sheets" button on each drawing
- "Browse Sheets" button in discipline view
- Processing status overlay
- Integration with SheetBrowser component

## Usage

### 1. Setup Database

Run the SQL migration in Supabase:

```bash
# In Supabase SQL Editor
# Run: backend/create-drawing-sheets-tables.sql
```

### 2. Deploy Edge Function

```bash
# Deploy the OCR processing function
supabase functions deploy process-drawing-sheets

# Set Claude API key secret
supabase secrets set CLAUDE_API_KEY=your_api_key_here
```

Get your Claude API key from: https://console.anthropic.com/

### 3. Upload Shop Drawing Package

1. Navigate to **Drawings** module
2. Select project → Shop Drawings → Module Packages
3. Upload multi-page PDF (e.g., "B1L2M15 - Shops.pdf")

### 4. Process Sheets

1. Click the **layers icon** (Extract Sheets) on the uploaded drawing
2. Confirm the processing dialog
3. Wait for processing to complete (progress overlay shown)
4. System will:
   - Split PDF into individual sheets
   - Extract title block metadata via OCR
   - Auto-link to modules
   - Store sheets in database

### 5. Browse & Filter Sheets

1. Click **"Browse Sheets"** button in drawings view
2. Use filters to find specific sheets:
   - **Module**: Select specific module (e.g., B1L2M15)
   - **Unit Type**: Filter by type (e.g., C1, B2)
   - **Discipline**: Filter by trade (e.g., Mechanical)
   - **BLM Type**: Filter by module type code
   - **Search**: Text search in names/titles

### 6. View or Download Sheets

**Individual Sheet**:
- Click sheet card or row to select
- Click **View** to open in browser
- Click **Download** to save locally

**Multiple Sheets**:
- Check boxes to select multiple sheets
- Click **Download Selected** for batch download

## Example Use Cases

### Use Case 1: Review All C1 Mechanical Sheets

**Scenario**: Need to review all mechanical shop drawings for C1 unit type modules across the project.

**Steps**:
1. Open Sheet Browser
2. Set filters:
   - Unit Type: **C1**
   - Discipline: **Mechanical**
3. View results (all C1 mechanical sheets from all modules)
4. Select sheets for review or download

**Result**: Quickly access all relevant sheets without manually searching through dozens of PDF packages.

### Use Case 2: Extract Specific Sheet from Package

**Scenario**: Need just the electrical sheet from module B1L2M15's shop drawing package.

**Steps**:
1. Open Sheet Browser
2. Set filters:
   - Module: **B1L2M15**
   - Discipline: **Electrical**
3. View/download the specific sheet

**Result**: Get individual sheet without downloading entire 18MB package.

### Use Case 3: Audit Sheet Coverage

**Scenario**: Verify all modules have required shop drawing disciplines.

**Steps**:
1. Open Sheet Browser
2. View statistics dashboard:
   - Total sheets
   - Sheets linked to modules
   - Unlinked sheets
   - Disciplines count
3. Filter by discipline to check coverage

**Result**: Identify missing drawings or modules needing attention.

## Title Block Format Support

The OCR system is designed to extract from standard modular construction title blocks:

```
┌─────────────────────────────────────┐
│ SHEET NAME:    Cover Sheet          │
│ SHEET TITLE:   HITCH / PULL-POINT   │
│ BLM (TYP):     C1                    │
│ SCALE:         N/A                   │
│ DATE:          2024-01-15            │
│ REVISION:      A                     │
│ DRAWN BY:      JD                    │
│ CHECKED BY:    MS                    │
└─────────────────────────────────────┘
```

## Integration with Project Directory

The system integrates with the Project Directory module data:

1. **Module Matching**: Uses module IDs from project modules list
2. **Unit Type Filtering**: Leverages unit_type field from modules table
3. **Cross-Reference**: Links sheets to modules for bidirectional navigation

**Example Query**:
```javascript
// Get all C1 Mechanical sheets
const sheets = await MODA_DRAWING_SHEETS.getSheetsByUnitTypeAndDiscipline(
    projectId,
    'C1',      // unit type from modules
    'Mechanical'
);
```

## Performance Considerations

### Processing Time
- **Small PDFs** (5-10 pages): 1-2 minutes
- **Medium PDFs** (10-20 pages): 2-5 minutes
- **Large PDFs** (20+ pages): 5-10 minutes

Processing is asynchronous - users can continue working while sheets are extracted.

### Storage
- Each sheet stored as individual PDF in Supabase Storage
- Typical sheet size: 0.5-2 MB
- 100-sheet package: ~50-200 MB storage

### OCR Costs
- Claude API: ~$0.01-0.02 per sheet
- 100-sheet package: ~$1-2 processing cost
- One-time cost per drawing upload

## Troubleshooting

### OCR Extraction Failed
**Symptoms**: Sheet has no metadata, low confidence score

**Solutions**:
- Check title block is clearly visible and legible
- Ensure PDF is not scanned at too low resolution
- Manually edit sheet metadata if needed

### Module Auto-Linking Failed
**Symptoms**: Sheet shows as "unlinked"

**Solutions**:
- Verify filename contains module identifier (e.g., B1L2M15)
- Check module exists in project
- Manually link sheet to module via UI (planned feature)

### Processing Job Stuck
**Symptoms**: Job status shows "processing" for extended time

**Solutions**:
- Check Edge Function logs in Supabase dashboard
- Verify Claude API key is set correctly
- Check for PDF corruption or unusual format

## Future Enhancements

1. **ZIP Download**: Batch download selected sheets as ZIP file
2. **Manual Metadata Editing**: Edit OCR results if incorrect
3. **Sheet Comparison**: Compare revisions of same sheet
4. **Drawing Markup**: Annotate sheets with comments/issues
5. **Sheet Templates**: Define custom title block formats
6. **Batch Processing**: Process multiple drawings simultaneously
7. **OCR Reprocessing**: Re-run OCR with improved prompts

## API Reference

### Search Sheets

```javascript
const sheets = await MODA_DRAWING_SHEETS.searchSheets({
    projectId: 'uuid',
    moduleId: 'uuid',        // optional
    unitType: 'C1',          // optional
    discipline: 'Mechanical', // optional
    blmType: 'C1',           // optional
    searchText: 'hitch',     // optional
    limit: 100               // optional
});
```

### Get Project Statistics

```javascript
const stats = await MODA_DRAWING_SHEETS.getProjectSheetStats(projectId);
// Returns:
// {
//   total_sheets: 150,
//   by_discipline: { Mechanical: 50, Electrical: 40, ... },
//   by_blm_type: { C1: 30, B2: 25, ... },
//   linked_modules: 140,
//   unlinked_sheets: 10
// }
```

### Process Drawing

```javascript
const result = await MODA_DRAWING_SHEETS.processDrawingSheets(drawingFileId);
// Returns:
// {
//   success: true,
//   job_id: 'uuid',
//   total_sheets: 15,
//   processed_sheets: 15,
//   sheets: [...]
// }
```

## Security & Permissions

- All operations require Supabase authentication
- RLS policies enforce project-level access control
- Edge Function uses service role key for storage operations
- Claude API key stored as Supabase secret (not exposed to frontend)

## Conclusion

The Drawing Sheets OCR & Extraction System transforms how teams work with multi-page shop drawing packages. By automatically extracting and indexing individual sheets with intelligent metadata parsing, it enables rapid access to specific drawings and powerful filtering capabilities that would be impossible with traditional PDF packages.
