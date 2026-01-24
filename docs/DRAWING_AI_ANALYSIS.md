# AI Drawing Analysis System

## Overview

MODA's AI Drawing Analysis system uses Claude Vision to extract structured data from shop drawings stored in SharePoint. The system supports multiple extraction types and tracks changes between versions.

## Features

### 1. Title Block OCR (Current - Working)
Extracts from title block:
- Sheet Number (e.g., XE-B1L5M26-01)
- Sheet Title (e.g., ELEC ENLG PLAN)
- BLM Type (e.g., B1L5M26)
- Discipline (Electrical, Plumbing, Mechanical, Structural, Architectural)
- Scale, Date, Revision

**Edge Function:** `process-drawing-sheets`

### 2. Wall ID Extraction (New)
Extracts from structural/architectural sheets:
- Wall ID (e.g., W1, MW14.5, EW-01)
- Wall Type (Interior, Exterior, Shear, Partition)
- Height, Thickness, Stud Spacing, Gauge
- Grid Location, Orientation

**Use Case:** Track wall inventory, verify wall schedules, QA checks

### 3. MEP Fixture Counting (New)
Extracts from MEP sheets:
- Fixture Tag (e.g., P-1, E-101)
- Fixture Type (Outlet, Switch, Sink, HVAC, etc.)
- Category (Electrical, Plumbing, Mechanical, Fire)
- Quantity per sheet
- Room/Grid Location

**Use Case:** Material takeoffs, fixture verification, QA counts

### 4. Version Change Detection (New)
Compares two versions of the same drawing:
- Change Type (Added, Removed, Modified, Relocated)
- Change Category (Structural, MEP, Dimensional, Annotation)
- Severity (Minor, Moderate, Major, Critical)
- Affected Elements
- Revision Cloud tracking

**Use Case:** Track design changes, impact analysis, revision history

### 5. Trend Analytics (New)
Aggregates data over time:
- Changes by type/category/severity
- Wall counts by type
- Fixture counts by category
- OCR confidence trends
- Weekly/monthly reports

**Use Case:** Project health monitoring, design stability metrics

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `drawing_sheets` | Base sheet metadata + title block OCR |
| `sheet_walls` | Wall IDs and properties per sheet |
| `sheet_mep_fixtures` | MEP fixtures per sheet |
| `drawing_version_changes` | Changes between versions |
| `drawing_analytics` | Aggregated trend data |

### Key Relationships

```
drawings (1) → (N) drawing_versions
drawings (1) → (N) drawing_sheets
drawing_sheets (1) → (N) sheet_walls
drawing_sheets (1) → (N) sheet_mep_fixtures
drawings (1) → (N) drawing_version_changes
```

## Edge Functions

### 1. process-drawing-sheets
**Purpose:** Title block OCR extraction
**Input:**
```json
{
  "drawingFileId": "uuid",
  "pdfDownloadUrl": "https://..."
}
```

### 2. analyze-drawing (New)
**Purpose:** Extended analysis (walls, MEP, version compare)
**Input:**
```json
{
  "sheetId": "uuid",
  "extractionType": "walls|mep_fixtures|version_compare",
  "pdfDownloadUrl": "https://...",
  "compareWithVersionId": "uuid"  // For version_compare only
}
```

## Cost Estimates

| Extraction Type | Cost/Page | 100 Modules (~1,400 pages) |
|-----------------|-----------|---------------------------|
| Title Block OCR | $0.015 | $21 |
| Wall Extraction | $0.02 | $28 |
| MEP Fixtures | $0.03 | $42 |
| Version Compare | $0.05 | $70 |

**Monthly Estimate:** $20-50 for moderate usage

## Setup Instructions

### 1. Run Database Migration
```sql
-- In Supabase SQL Editor
-- Run: backend/create-drawing-analysis-tables.sql
```

### 2. Deploy Edge Functions
```bash
# Deploy analyze-drawing function
supabase functions deploy analyze-drawing

# Set secrets (if not already set)
supabase secrets set OCR_Reader=your-claude-api-key
```

### 3. Frontend Integration
The DrawingsModule.jsx includes:
- "Run OCR" button for title block extraction
- "Analyze Walls" button (to be added)
- "Count Fixtures" button (to be added)
- "Compare Versions" button (to be added)

## Usage Examples

### Extract Walls from a Sheet
```javascript
const response = await fetch(
  'https://syreuphexagezawjyjgt.supabase.co/functions/v1/analyze-drawing',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      sheetId: 'sheet-uuid',
      extractionType: 'walls',
      pdfDownloadUrl: 'https://sharepoint-download-url'
    })
  }
);
```

### Query Wall Data
```sql
-- Get all walls for a module
SELECT sw.* 
FROM sheet_walls sw
JOIN drawing_sheets ds ON sw.sheet_id = ds.id
WHERE ds.blm_type = 'B1L5M26';

-- Wall type summary
SELECT wall_type, COUNT(*) 
FROM sheet_walls 
WHERE project_id = 'xxx'
GROUP BY wall_type;
```

### Query Version Changes
```sql
-- Recent major changes
SELECT * FROM drawing_version_changes
WHERE project_id = 'xxx'
AND change_severity IN ('Major', 'Critical')
ORDER BY detected_at DESC
LIMIT 20;

-- Changes by category this week
SELECT change_category, COUNT(*)
FROM drawing_version_changes
WHERE detected_at > NOW() - INTERVAL '7 days'
GROUP BY change_category;
```

### Compute Analytics
```sql
-- Generate weekly analytics
SELECT compute_project_analytics(
  'project-uuid',
  '2026-01-20',
  '2026-01-27',
  'weekly'
);
```

## Future Enhancements

1. **Pattern Learning** - Store common patterns per project for validation
2. **Automated Alerts** - Notify on critical changes
3. **BIM Integration** - Export to Revit/IFC format
4. **Clash Detection** - Compare MEP vs Structural
5. **Material Takeoffs** - Generate BOMs from fixture counts

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| RangeError: Maximum call stack | Large PDF page | Fixed with chunked base64 |
| Model not found | Wrong model name | Use `claude-sonnet-4-20250514` |
| 401 Invalid JWT | Auth issue | Frontend gets SharePoint URL |

### Logs
Check Supabase Edge Function logs:
- Dashboard → Edge Functions → [function] → Logs
