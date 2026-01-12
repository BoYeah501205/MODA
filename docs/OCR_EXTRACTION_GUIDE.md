# OCR Extraction & Module Linking Guide

## Overview

This document explains how the Sheet Browser extracts metadata from shop drawing PDFs and links sheets to modules from Project Directory.

---

## 📋 **OCR Extraction Priorities**

### **What We Extract**

Based on the title block format shown below:

```
┌─────────────────┬──────────────────────────┐
│ SHEET NUMBER:   │ XS-B1L2M15-01           │
├─────────────────┼──────────────────────────┤
│ SHEET TITLE:    │ FLOOR FRAMING PLAN      │
├─────────────────┼──────────────────────────┤
│ BLM (TYP):      │ B1L2M15                 │ ← SKIP (often erroneous)
├─────────────────┼──────────────────────────┤
│ SCALE:          │ As indicated            │
├─────────────────┼──────────────────────────┤
│ DATE:           │ 01/08/2026              │
└─────────────────┴──────────────────────────┘
```

**Priority Fields** (Claude Vision API focuses on these):
1. ✅ **Sheet Number** - `XS-B1L2M15-01` (contains module BLM ID)
2. ✅ **Sheet Title** - `FLOOR FRAMING PLAN`
3. ✅ **Date** - `01/08/2026` (converted to `2026-01-08`)

**Optional Fields**:
4. **Scale** - `As indicated`, `1/4"=1'-0"`, etc.
5. **Discipline** - Mechanical, Electrical, Plumbing, etc.
6. **Revision** - Revision letter/number

**Excluded Fields**:
- ❌ **BLM (TYP)** - Often erroneous, not reliable for linking

---

## 🔗 **Module Linking Logic**

### **How Sheets Link to Modules**

**Step 1: Extract BLM ID from Sheet Number**

The sheet number contains the module's BLM ID:

```
Sheet Number: XS-B1L2M15-01
              └─┬──────┘
                └─ BLM ID: B1L2M15
```

**Regex Pattern**: `([Bb]\d+[Ll]\d+[Mm]\d+)`

**Examples**:
- `XS-B1L2M15-01` → `B1L2M15`
- `B1L2M26-02` → `B1L2M26`
- `M-B2L3M08-01` → `B2L3M08`

**Step 2: Match to Module in Database**

Query the `modules` table to find a module where:
- `blm_id` matches the extracted BLM ID (case-insensitive)
- `project_id` matches the sheet's project

**Step 3: Link Sheet to Module**

If a match is found:
- Set `drawing_sheets.linked_module_id` = `modules.id`
- This enables filtering by module in Sheet Browser

---

## 📊 **Module Data Structure (Project Directory)**

### **What Data Comes from Modules**

From your Project Directory screenshot, each module has:

```javascript
{
  // Module Identification
  serialNumber: "25-0962",
  buildSequence: 1,
  
  // Physical Dimensions
  width: "13.667'",
  length: "41.708'",
  squareFootage: "570.02 SF",
  
  // HITCH Side
  hitch: {
    blmId: "B1L2M26",
    unit: "2 BEDROOM.C (HI)",
    room: "L-204",
    roomType: "BED / BA"
  },
  
  // REAR Side
  rear: {
    blmId: "B1L2M26",
    unit: "2 BEDROOM.C (HI)",
    room: "L-204",
    roomType: "BED / BA"
  },
  
  // Difficulty Indicators
  difficultyIndicators: ["Sidewall", "Short"]
}
```

### **How This Feeds into Sheet Browser Filters**

The SheetBrowser component extracts unique values from all modules:

```javascript
// Extract from modules array
modules.forEach(mod => {
  // Unit Types: "2 BEDROOM.C (HI)", "1 BEDROOM.A", etc.
  unitTypes.add(mod.hitch.unit);
  unitTypes.add(mod.rear.unit);
  
  // Room Types: "BED / BA", "LIV / KIT", etc.
  roomTypes.add(mod.hitch.roomType);
  roomTypes.add(mod.rear.roomType);
  
  // BLM IDs: "B1L2M26", "B1L2M15", etc.
  blmTypes.add(mod.hitch.blmId);
  blmTypes.add(mod.rear.blmId);
});
```

These populate the filter dropdowns automatically.

---

## 🔍 **Search & Filter Flow**

### **Complete User Journey**

**1. Upload PDF Package**
```
User uploads: "B1L2M15 - Mechanical Shops.pdf" (18 pages)
```

**2. OCR Processing** (Edge Function)
```
For each page:
  1. Extract to single-page PDF
  2. Upload to Supabase Storage
  3. Call Claude Vision API
  4. Extract: Sheet Number, Title, Date
  5. Parse BLM ID from Sheet Number
  6. Link to module via BLM ID match
  7. Save to drawing_sheets table
```

**3. Sheet Browser Filtering**
```
User opens Sheet Browser
  → Filters populate from Project Directory modules
  → User selects: Unit Type = "2 BEDROOM.C (HI)"
  → User selects: Room Type = "BED / BA"
  → User selects: Discipline = "Mechanical"
  
Search Query:
  WHERE (hitch_unit = '2 BEDROOM.C (HI)' OR rear_unit = '2 BEDROOM.C (HI)')
    AND (hitch_room_type = 'BED / BA' OR rear_room_type = 'BED / BA')
    AND discipline ILIKE '%Mechanical%'
    
Results: All mechanical sheets for 2-bedroom units with BED/BA rooms
```

---

## 🗄️ **Database Schema**

### **Modules Table** (from Project Directory)
```sql
CREATE TABLE modules (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  serial_number TEXT,           -- "25-0962"
  blm_id TEXT,                   -- "B1L2M26" (primary BLM ID)
  build_sequence INTEGER,
  
  -- Module data stored in JSONB
  -- Contains hitch/rear details, dimensions, etc.
  module_data JSONB
);
```

### **Drawing Sheets Table**
```sql
CREATE TABLE drawing_sheets (
  id UUID PRIMARY KEY,
  drawing_file_id UUID REFERENCES drawing_files(id),
  project_id UUID REFERENCES projects(id),
  
  -- OCR Extracted Fields
  sheet_number INTEGER,          -- Sequential number (1, 2, 3...)
  sheet_name TEXT,               -- "XS-B1L2M15-01" (from OCR)
  sheet_title TEXT,              -- "FLOOR FRAMING PLAN"
  discipline TEXT,               -- "Mechanical"
  scale TEXT,                    -- "As indicated"
  drawing_date DATE,             -- 2026-01-08
  
  -- Module Linking
  linked_module_id UUID REFERENCES modules(id),
  
  -- Hitch/Rear Data (populated from linked module)
  hitch_blm TEXT,                -- "B1L2M26"
  rear_blm TEXT,                 -- "B1L2M26"
  hitch_unit TEXT,               -- "2 BEDROOM.C (HI)"
  rear_unit TEXT,                -- "2 BEDROOM.C (HI)"
  hitch_room_type TEXT,          -- "BED / BA"
  rear_room_type TEXT,           -- "BED / BA"
  difficulty_notes TEXT[],       -- ["Sidewall", "Short"]
  
  -- OCR Metadata
  ocr_metadata JSONB,
  ocr_confidence DECIMAL(5,2),
  ocr_processed_at TIMESTAMPTZ
);
```

---

## 🎯 **Key Design Decisions**

### **Why Skip BLM (TYP) from Title Block?**

**Problem**: The BLM (TYP) field in title blocks is often erroneous or outdated.

**Solution**: Extract BLM ID from the **Sheet Number** instead, which is more reliable:
- Sheet numbers follow a consistent pattern: `XS-B1L2M15-01`
- The BLM ID is embedded in the sheet number
- This is the "source of truth" for linking

### **Why Search Both Hitch AND Rear?**

**Problem**: A module has two sides (hitch and rear) with potentially different configurations.

**Solution**: Search across both to avoid missing relevant sheets:
- Filter: Unit Type = "2 BEDROOM.C (HI)"
- Matches if **either** hitch OR rear has this unit type
- User doesn't need to know which side - they get all relevant sheets

### **Why Auto-Link Sheets to Modules?**

**Problem**: Users shouldn't manually link hundreds of sheets.

**Solution**: Automatic linking via BLM ID pattern matching:
1. Extract BLM ID from sheet number
2. Find module with matching `blm_id`
3. Link automatically during OCR processing
4. Enables filtering by module, unit type, room type

---

## 📝 **Example Scenarios**

### **Scenario 1: Find All Sheets for a Specific Module**

**User Action**:
- Open Sheet Browser
- Select Module = "25-0962"

**Query**:
```sql
WHERE linked_module_id = (SELECT id FROM modules WHERE serial_number = '25-0962')
```

**Result**: All sheets linked to module 25-0962

---

### **Scenario 2: Find All 2-Bedroom Mechanical Sheets**

**User Action**:
- Unit Type = "2 BEDROOM.C (HI)"
- Discipline = "Mechanical"

**Query**:
```sql
WHERE (hitch_unit = '2 BEDROOM.C (HI)' OR rear_unit = '2 BEDROOM.C (HI)')
  AND discipline ILIKE '%Mechanical%'
```

**Result**: All mechanical sheets for 2-bedroom units across all modules

---

### **Scenario 3: Find All BED/BA Room Type Sheets**

**User Action**:
- Room Type = "BED / BA"

**Query**:
```sql
WHERE (hitch_room_type = 'BED / BA' OR rear_room_type = 'BED / BA')
```

**Result**: All sheets for bedroom/bathroom configurations

---

## 🚀 **Deployment Checklist**

### **Database Setup**
- [x] Run `update-drawing-sheets-schema.sql` - Add hitch/rear columns
- [ ] Run `update-auto-link-function.sql` - Improved BLM ID extraction

### **Edge Function**
- [x] Update OCR prompt to focus on Sheet Number, Title, Date
- [x] Update auto-link call to use sheet_number
- [ ] Deploy to Supabase: `supabase functions deploy process-drawing-sheets`
- [ ] Set Claude API key: `supabase secrets set CLAUDE_API_KEY=your_key`

### **Frontend**
- [x] SheetBrowser extracts filters from modules
- [x] Room Type filter added
- [x] Search function updated
- [x] Pushed to Git → Auto-deployed to Vercel

---

## 🔧 **Troubleshooting**

### **Sheets Not Linking to Modules**

**Check**:
1. Does sheet number contain BLM ID pattern? (e.g., `XS-B1L2M15-01`)
2. Does a module exist with matching `blm_id`?
3. Check Supabase logs for auto-link function output

**Fix**: Run manual link query:
```sql
SELECT auto_link_sheet_to_module(
  'sheet-uuid',
  'project-uuid',
  'XS-B1L2M15-01'
);
```

### **Filters Not Populating**

**Check**:
1. Are modules passed to SheetBrowser component?
2. Do modules have `hitch.unit`, `hitch.roomType`, etc.?
3. Check browser console for errors

**Fix**: Verify module data structure in Project Directory

### **OCR Extraction Failing**

**Check**:
1. Is Claude API key set in Supabase?
2. Check Edge Function logs in Supabase Dashboard
3. Verify PDF is valid and not corrupted

**Fix**: Re-process drawing with "Extract Sheets" button

---

## 📚 **Related Documentation**

- `SHEET_BROWSER_IMPROVEMENTS.md` - Feature overview and implementation plan
- `DRAWING_SHEETS_OCR_SYSTEM.md` - Complete system architecture
- `update-drawing-sheets-schema.sql` - Database schema updates
- `update-auto-link-function.sql` - Auto-linking logic
