# Module Import with Duplicate Detection - Integration Guide

## Overview

This feature adds intelligent CSV module import with duplicate detection, verification UI, and smart merge capabilities to replace placeholder data with detailed information.

## Files Created

### 1. Backend - Supabase Edge Function
**`supabase/functions/import-modules/index.ts`**
- Analyzes CSV data for duplicates and conflicts
- Executes smart imports with merge logic
- Supports two modes: analyze (preview) and execute (commit)

### 2. Frontend - Data Layer
**`js/supabase-module-import.js`**
- `analyzeModuleImport(projectId, modules)` - Preview import changes
- `executeModuleImport(projectId, modules, forceOverwrite)` - Execute import
- `parseModuleCSV(csvText)` - Parse CSV with flexible column mapping

### 3. Frontend - UI Component
**`js/components/ModuleImportModal.jsx`**
- Two-step wizard: Upload → Verify
- Shows summary: X new, Y updates, Z issues
- Expandable update details with old vs new comparison
- Force overwrite option for replacing existing data

### 4. Styling
**`css/module-import.css`**
- Complete styling for import modal
- Summary cards, update lists, verification UI

## Integration Steps

### Step 1: Update App.jsx

Find the existing ImportModal usage around line 2985-2991:

```javascript
{/* Import Modal */}
{showImportModal && (
    <ImportModal 
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
    />
)}
```

Replace with:

```javascript
{/* Import Modal */}
{showImportModal && (
    <ModuleImportModal 
        projectId={project.id}
        onClose={() => setShowImportModal(false)}
        onImportComplete={(result) => {
            setShowImportModal(false);
            loadModules();
            alert(`Import complete!\n${result.inserted} modules added\n${result.updated} modules updated${result.errors.length > 0 ? `\n${result.errors.length} errors` : ''}`);
        }}
    />
)}
```

**Note:** The old `ImportModal` component can be removed or kept as a fallback.

### Step 2: Deploy Supabase Edge Function

```bash
# Navigate to project root
cd "C:\Projects\Autovol MODA\Autovol MODA 12525 0543\MODA"

# Deploy the function
supabase functions deploy import-modules

# Verify deployment
supabase functions list
```

### Step 3: Test the Feature

1. Navigate to a project in MODA
2. Click "Import Modules" button
3. Upload a CSV file with module data
4. Review the analysis showing new/update/conflict counts
5. Expand update items to see field-by-field changes
6. Toggle "Force Overwrite" if needed
7. Click "Import X Modules" to execute

## CSV Format

### Required Column
- **Serial Number** (or variations: `serial_number`, `serial`)

### Optional Columns
- Build Sequence (`build_sequence`, `sequence`)
- BLM ID (`blm_id`, `blm`, `hitch blm id`)
- Unit Type (`unit_type`, `type`)
- Hitch Unit (`hitch_unit`)
- Rear Unit (`rear_unit`)
- Hitch Room (`hitch_room`)
- Rear Room (`rear_room`)
- Hitch Room Type (`hitch_room_type`)
- Rear Room Type (`rear_room_type`)

**Note:** Column headers are case-insensitive and flexible (spaces/underscores)

## Import Logic

### Duplicate Detection
- Matches by `serial_number` (exact match)
- Identifies duplicates within CSV file
- Prevents import if CSV contains duplicate serial numbers

### Smart Merge (Default)
- **Only updates empty/null fields** in existing modules
- Preserves manually entered data
- Example: If DB has `unit_type = "Studio"` and CSV has `unit_type = "1BR"`, DB value is kept

### Force Overwrite Mode
- Replaces all fields with CSV data
- Use when correcting errors in existing data
- Controlled by checkbox in verification UI

## Example Use Case: El Cerrito Plaza

### Initial Import (Placeholder Data)
```csv
Serial Number,Build Sequence
26-0101,1
26-0102,2
26-0103,3
```

Result: 3 new modules with only serial numbers and build sequence

### Second Import (Detailed Data)
```csv
Serial Number,Build Sequence,BLM ID,Unit Type,Hitch Unit
26-0101,1,B1L2M01,Studio,C1
26-0102,2,B1L2M02,1BR,C2
26-0103,3,B1L2M03,Studio,C1
```

Result with Smart Merge:
- 0 new modules
- 3 updates (adds BLM ID, Unit Type, Hitch Unit to existing records)
- Build Sequence unchanged (already had values)

## Error Handling

### CSV Parsing Errors
- Missing serial numbers → Shown in errors list
- Invalid row format → Shown with row number

### Duplicate Detection
- Duplicates in CSV → Blocks import, shows which serials are duplicated
- Existing modules → Shown as updates with change preview

### Import Errors
- Database errors → Shown per module with error message
- Partial success → Reports inserted/updated counts + errors

## UI Flow

```
┌─────────────────────────────────────┐
│  Step 1: Upload CSV                 │
│  - File picker                      │
│  - Format instructions              │
│  - Smart merge explanation          │
└──────────────┬──────────────────────┘
               │ Click "Analyze CSV"
               ▼
┌─────────────────────────────────────┐
│  Step 2: Verify Changes             │
│  ┌─────────────────────────────┐   │
│  │ 15 New │ 8 Updates │ 0 Issues│   │
│  └─────────────────────────────┘   │
│                                     │
│  Updates (expandable):              │
│  ▼ 26-0101 (3 fields will change)  │
│    ┌─────────────────────────┐     │
│    │ Field    │ Old  │ New   │     │
│    │ BLM ID   │ -    │ B1L2M01│    │
│    │ Unit Type│ -    │ Studio│     │
│    └─────────────────────────┘     │
│                                     │
│  □ Force Overwrite                  │
└──────────────┬──────────────────────┘
               │ Click "Import X Modules"
               ▼
┌─────────────────────────────────────┐
│  Success Notification               │
│  15 modules added                   │
│  8 modules updated                  │
└─────────────────────────────────────┘
```

## Troubleshooting

### Import button doesn't appear
- Check user role (Admin or Production Management required)
- Verify `canManageImports` logic in App.jsx

### "Import analysis failed" error
- Check Supabase Edge Function is deployed
- Verify function logs in Supabase dashboard
- Ensure project_id is valid

### Changes not showing in verification
- Check CSV column headers match expected format
- Verify serial numbers match exactly (case-sensitive)
- Ensure new values are different from existing values

### Smart merge not working as expected
- Review "Force Overwrite" checkbox state
- Check if existing fields actually have values (not null/empty)
- Verify field mapping in parseModuleCSV function

## Next Steps

1. Deploy the Supabase Edge Function
2. Test with sample CSV on a test project
3. Verify smart merge behavior
4. Test force overwrite mode
5. Import real data for El Cerrito Plaza
