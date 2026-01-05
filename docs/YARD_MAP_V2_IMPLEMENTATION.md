# Yard Map v2.0 Implementation

## Overview

Replaced the standalone yard map tool with an integrated MODA module that connects:
**Transport workflow → Yard Map → Project tracking**

## Files Created

### 1. Database Migration
`backend/create-yard-map-v2-tables.sql`

Run this in Supabase SQL Editor to create:
- `transport_status` - Module workflow status tracking
- `yard_maps` - PDF backgrounds (updated with new columns)
- `yard_modules` - Module placements (updated with status tracking)
- `yard_module_history` - Audit trail for all actions
- `yard_settings` - Global configuration

Also creates helper functions:
- `get_modules_by_blm()` - Find modules by BLM number
- `get_module_count_by_yard()` - Stats per yard
- `get_module_count_by_project()` - Stats per project
- `get_ready_for_yard_queue()` - Transport queue
- `mark_module_shipped()` - Mark shipped with history
- `remove_module_from_yard()` - Remove with history

### 2. Data Access Layer
`js/supabase-yard-map.js`

Exports `window.MODA_YARD_MAP_DATA` with:
- `YardMapData` - CRUD for yard maps
- `YardModuleData` - CRUD for modules with history logging
- `TransportStatusData` - Transport workflow status
- `YardHistoryData` - Audit trail queries
- `YardSettingsData` - Settings management
- `YardMapRealtime` - Real-time subscriptions

### 3. React Component
`js/components/YardMapV2.jsx`

Exports `window.YardMapV2` - Full replacement for YardMapComponent

## Files Modified

### 1. `index.html`
- Added `supabase-yard-map.js` script
- Added `YardMapV2.jsx` script

### 2. `js/config/featureFlags.js`
- Added `enableYardMapV2: true` flag

### 3. `js/components/TransportModule.jsx`
- Updated to use YardMapV2 when feature flag enabled

## Module Lifecycle Workflow

```
WeeklyBoard (Complete)
        ↓
Transport Board (Ready for Yard)
        ↓
Yard Map (Placed) ← User draws rectangle on map
        ↓
Transport Board (Shipped)
        ↓
Yard Map (Confirmation Modal)
        ↓
Remove from Map OR Keep (grayed out)
```

## Key Features

### 1. Transport Queue Integration
- Modules marked "ready_for_yard" appear in sidebar queue
- Click module → enter draw mode → drag on canvas to place
- Auto-updates transport status to "in_yard"

### 2. Real-Time Sync
- Supabase Realtime subscriptions for live updates
- Multi-user support - changes appear instantly
- Fallback to polling if Realtime unavailable

### 3. Shipped Confirmation Modal
- When Transport marks module "shipped"
- Modal appears: "Remove from map?"
- **Yes**: Module removed, status = "delivered"
- **No**: Module kept with gray/dashed styling

### 4. Statistics Widgets
- Total modules count
- Active vs Shipped breakdown
- By-project breakdown with colors

### 5. Module Log
- Searchable list of all modules
- Separate sections: Active / Shipped (Kept)
- Click to select on canvas
- Manual remove button

### 6. Canvas Features
- PDF background from Supabase
- Zoom (mouse wheel) and pan (drag)
- Module drag, rotate, resize
- Auto-save on modification
- Selection handles

## Feature Flag

Toggle between old and new Yard Map:

```javascript
// js/config/featureFlags.js
enableYardMapV2: true   // Use new v2
enableYardMapV2: false  // Use old YardMapComponent
```

## Database Setup

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/syreuphexagezawjyjgt
2. Open SQL Editor
3. Paste contents of `backend/create-yard-map-v2-tables.sql`
4. Run the migration
5. Verify tables created with verification queries at bottom of file

## Testing Checklist

- [ ] Database tables created in Supabase
- [ ] Yard Map loads in Transport module
- [ ] Can upload new yard map PDF
- [ ] Can select yard map from dropdown
- [ ] PDF renders on canvas
- [ ] Can zoom and pan canvas
- [ ] Transport queue shows ready modules
- [ ] Can place module from queue (draw mode)
- [ ] Module appears on canvas after placement
- [ ] Can drag/move modules
- [ ] Changes auto-save to database
- [ ] Stats update after changes
- [ ] Module log shows all modules
- [ ] Search filters modules
- [ ] Can delete modules
- [ ] Shipped confirmation modal appears (when transport marks shipped)
- [ ] "Yes, Remove" removes module
- [ ] "No, Keep" grays out module
- [ ] Settings tab works (upload, delete, set default)

## Next Steps

1. **Run SQL migration** in Supabase
2. **Test** the new Yard Map in Transport module
3. **Integrate with WeeklyBoard** - Auto-mark modules "ready_for_yard" on completion
4. **Add Fabric.js** for better canvas controls (optional enhancement)
5. **Add PDF export** functionality

## Rollback

To revert to old Yard Map:
```javascript
// js/config/featureFlags.js
enableYardMapV2: false
```

The old `YardMap.jsx` component remains unchanged and will be used as fallback.
