# Sheet Browser Improvements - Implementation Plan

## Overview
This document outlines the 4 key improvements requested for the OCR-based Sheet Browser system.

## 1. Project Directory Data Integration ✅

### Current Status
- Module data is now properly feeding into Sheet Browser via props
- Filter options (unit types, room types, BLM types) are extracted from project modules
- Modules array passed from DrawingsModule contains full module data

### Implementation
- **File**: `js/components/SheetBrowser.jsx`
- **Changes**: 
  - Added `useEffect` hook to extract unique values from modules array
  - Unit types (S1, A1, C1, B2, etc.) extracted from `hitchUnit` and `rearUnit`
  - Room types (LIV/KIT, BED/BA, etc.) extracted from `hitchRoomType` and `rearRoomType`
  - BLM types extracted from `hitchBLM` and `rearBLM`

### Database Schema Updates
- **File**: `backend/update-drawing-sheets-schema.sql`
- **New Columns Added**:
  - `hitch_blm` - BLM type for hitch side
  - `rear_blm` - BLM type for rear side
  - `hitch_unit` - Unit type for hitch side
  - `rear_unit` - Unit type for rear side
  - `hitch_room_type` - Room type for hitch side (LIV/KIT, BED/BA, etc.)
  - `rear_room_type` - Room type for rear side
  - `difficulty_notes` - Array of difficulty indicators

### Search Function Updates
- Updated `search_drawing_sheets()` function to:
  - Search across both hitch and rear BLM types
  - Search across both hitch and rear unit types
  - Search across both hitch and rear room types
  - Return combined data instead of separate hitch/rear results

## 2. Unit Type & Room Type Filters ✅

### Unit Type Filter
- **Purpose**: Filter sheets by unit type codes (S1, A1, C1, B2, SW, ST, etc.)
- **Data Source**: Extracted from project modules (`hitchUnit`, `rearUnit`)
- **Behavior**: Shows all sheets where either hitch or rear unit matches the selected type

### Room Type Filter (NEW)
- **Purpose**: Filter sheets by room configuration (LIV/KIT, BED/BA, etc.)
- **Data Source**: Extracted from project modules (`hitchRoomType`, `rearRoomType`)
- **Behavior**: Shows all sheets where either hitch or rear room type matches
- **Location**: Added between Unit Type and Discipline filters

### Filter Grid Layout
Now displays 6 filters in responsive grid:
1. Module (dropdown of all modules)
2. Unit Type (S1, A1, C1, B2, etc.)
3. Room Type (LIV/KIT, BED/BA, etc.) - **NEW**
4. Discipline (Mechanical, Electrical, etc.)
5. BLM Type (combined hitch/rear BLM codes)
6. Search (text search in sheet names/titles)

### Data Compilation
- **Hitch/Rear Combination**: All filters now search across BOTH hitch and rear data
- **No Separation**: Results are not split by hitch/rear - all matching sheets are shown together
- **Example**: Searching for "C1" unit type will return sheets where EITHER hitch_unit OR rear_unit is "C1"

## 3. Exit Button ✅

### Current Status
**Already Implemented** - Close button exists in header at line 567-572

### Implementation Details
- **Location**: Top-right corner of Sheet Browser modal
- **Icon**: X icon (`icon-x` class)
- **Behavior**: Calls `onClose()` prop to dismiss modal
- **Styling**: Gray with hover effects

```jsx
<button
    onClick={onClose}
    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
>
    <span className="icon-x w-6 h-6"></span>
</button>
```

## 4. OCR Process Optimization ⚠️ PENDING

### Current Approach
- OCR processing happens when user clicks "Extract Sheets" button
- Blocks UI with processing overlay during extraction
- Can take 1-10 minutes depending on PDF size

### Recommended Approach
**Two-Phase Upload Process**:

#### Phase 1: Immediate Upload (Fast)
1. User uploads PDF package
2. File is immediately saved to Supabase Storage
3. Drawing file record created in database
4. User can view/download the full package immediately
5. UI shows "Processing pending" badge

#### Phase 2: Background OCR (Async)
1. After upload completes, automatically trigger OCR job
2. Edge Function processes in background
3. User can continue working - no blocking
4. UI shows progress indicator (e.g., "Processing: 5/18 sheets")
5. When complete, sheets become available for filtering

### Implementation Plan

#### A. Update DrawingsModule Upload Handler
```javascript
// After successful upload
const uploadResult = await uploadDrawing(file);

// Automatically trigger OCR processing (non-blocking)
if (uploadResult.id) {
    triggerSheetExtraction(uploadResult.id).catch(err => {
        console.error('Background OCR failed:', err);
        // Show notification but don't block user
    });
}
```

#### B. Add Processing Status Indicator
- Show badge on drawing file: "🔄 Processing sheets (5/18)"
- Update in real-time using Supabase Realtime subscriptions
- When complete: "✅ 18 sheets available"

#### C. Remove Blocking Overlay
- Remove `processingDrawing` state that blocks UI
- Replace with non-blocking notification toast
- Allow user to browse other drawings while OCR runs

#### D. Edge Function Optimization
- Add progress updates to `sheet_extraction_jobs` table
- Emit progress events for real-time UI updates
- Handle failures gracefully with retry logic

### Benefits
1. **Faster UX**: Users can continue working immediately after upload
2. **No Blocking**: UI remains responsive during OCR
3. **Better Feedback**: Real-time progress updates
4. **Scalability**: Multiple PDFs can be processed simultaneously

### Files to Modify
1. `js/components/DrawingsModule.jsx` - Remove blocking overlay, add auto-trigger
2. `js/supabase-drawing-sheets.js` - Add progress subscription
3. `supabase/functions/process-drawing-sheets/index.ts` - Add progress updates
4. `backend/create-drawing-sheets-tables.sql` - Already has progress tracking

## Testing Checklist

### Database Setup
- [ ] Run `backend/update-drawing-sheets-schema.sql` in Supabase
- [ ] Verify new columns exist in `drawing_sheets` table
- [ ] Test `search_drawing_sheets()` function with room type filter
- [ ] Test `get_sheet_room_types()` function

### Frontend Testing
- [ ] Verify module data is passed to SheetBrowser
- [ ] Test Unit Type filter with real module data
- [ ] Test Room Type filter with real module data
- [ ] Verify filters search across both hitch and rear data
- [ ] Test combined filtering (e.g., Unit Type + Room Type + Discipline)
- [ ] Verify close button works
- [ ] Test with project that has no modules (graceful handling)

### OCR Process (After Implementation)
- [ ] Upload PDF package
- [ ] Verify immediate availability for download
- [ ] Verify background OCR starts automatically
- [ ] Test progress indicator updates
- [ ] Verify sheets become available after processing
- [ ] Test with multiple simultaneous uploads

## Deployment Steps

1. **Push to Git**:
   ```bash
   git add -A
   git commit -m "Add room type filters and improve module data integration"
   git push
   ```

2. **Run Database Migration**:
   - Open Supabase SQL Editor
   - Run `backend/update-drawing-sheets-schema.sql`

3. **Deploy Edge Function** (if modified):
   ```bash
   supabase functions deploy process-drawing-sheets
   ```

4. **Test on Vercel Deployment**:
   - Upload a shop drawing package
   - Test all filter combinations
   - Verify room type filter works with real data

## Known Limitations

1. **Module Data Dependency**: Filters only work if project has modules with populated data
2. **OCR Accuracy**: Room types and unit types depend on accurate OCR extraction
3. **Manual Linking**: If auto-linking fails, sheets won't have module data for filtering

## Future Enhancements

1. **Manual Sheet Editing**: Allow users to correct OCR mistakes
2. **Bulk Re-OCR**: Re-process sheets with improved OCR prompts
3. **Custom Room Type Mapping**: Define project-specific room type codes
4. **Difficulty Filter**: Add filter for difficulty indicators
5. **Advanced Search**: Full-text search across all metadata fields
