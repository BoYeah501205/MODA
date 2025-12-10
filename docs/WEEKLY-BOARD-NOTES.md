# Weekly Board Development Notes
**Last Updated:** December 2, 2025

## Current Status
Weekly Board feature refactored. Week configuration moved to Schedule Setup tab. Station Stagger tab is now editable.

## Refactoring Complete (Dec 2, 2025)

### Changes Made:
1. **Schedule Setup Tab** - Now contains:
   - Production Week Schedule section with "+ Add Week" button
   - Starting module selection for each week
   - Week edit/delete functionality
   - Shift 1 and Shift 2 daily module quantity configuration

2. **Station Stagger Tab** - Now editable:
   - Stagger offset values can be changed via input fields
   - Changes save automatically to localStorage
   - Removed "Starting Module" column (now in Schedule Setup)

3. **Weekly Board Tab** - Navigation updated:
   - "Go to Schedule Setup" button when no week configured
   - "Edit Week" button navigates to Schedule Setup tab
   - Configuration prompt directs users to Schedule Setup

4. **App.jsx Updates**:
   - `useProductionWeeks()` now exposes `addWeek`, `updateWeek`, `deleteWeek`, `updateStagger`, `validateWeek`
   - `ScheduleSetupTab` receives all week management props
   - Station Stagger uses `staggerConfig` and `updateStagger` for editable inputs

## Issue to Resolve
**Module Cards not populating into Weekly Board even once week is set.**

### Root Cause Analysis
The `WeeklyBoardTab` component in `WeeklyBoard.jsx` relies on:
1. `currentWeek?.startingModule` - from `useProductionWeeks()` hook
2. `staggerConfig` - station offsets
3. `getLineBalance()` - total modules per week from schedule setup

**Problem:** The `getStationStartingModule()` function looks for `currentWeek.startingModule`, but:
- `currentWeek` comes from `useProductionWeeks()` which manages production week schedules
- The starting module is set in the "Station Stagger" tab's week configuration
- If no week is configured or no starting module is set, modules won't appear

### Recommended Solutions

#### Option A: Add "Load Schedule" Button
Add a button in Weekly Board that lets user:
1. Select a starting module for the week
2. Confirm the line balance from Schedule Setup
3. This creates a "loaded" state that populates the board

#### Option B: Auto-Load from Production Week
Ensure the Weekly Board reads from the existing production week configuration:
- Check if `currentWeek` exists and has `startingModule`
- If not, show a prompt to configure in Station Stagger tab

#### Option C: Integrate Schedule Setup with Production Weeks
Merge the schedule setup (shift assignments) with the production week configuration:
- When user creates a production week, also set the shift schedule
- Weekly Board then has all data it needs

### Files to Review
- `js/components/WeeklyBoard.jsx` - Lines 213-240 (`getStationStartingModule`, `getModulesForStation`)
- `js/components/App.jsx` - Lines 2740-2755 (weeklySchedule integration)
- `js/components/App.jsx` - Lines 760-835 (`useProductionWeeks` hook)

### Quick Fix Suggestion
In `WeeklyBoardTab`, add a fallback or UI prompt when `currentWeek?.startingModule` is missing:
```jsx
if (!currentWeek?.startingModule) {
    return (
        <div className="text-center py-8">
            <p>No starting module configured for this week.</p>
            <button onClick={() => /* navigate to Station Stagger */}>
                Configure Week Schedule
            </button>
        </div>
    );
}
```

## Session Backup
- Backup created: `MODA-Backup-2025-12-02_1753`
