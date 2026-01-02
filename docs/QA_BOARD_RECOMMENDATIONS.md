# QA Board Refinement - Recommendations & Implementation Plan

## Completed Fixes (This Session)

### 1. Project Selection - Active Projects Only
**File:** `js/components/QAModule.jsx`
- Changed dropdown to show only active projects (status === 'Active')
- Label updated to "All Active Projects"
- Consistent with WeeklyBoard, DashboardHome behavior

### 2. Deviations Module Selection Fix
**File:** `js/components/qa/DeviationsPanel.jsx`
- Fixed `parseInt()` issue that broke with UUID module IDs from Supabase
- Now uses string comparison for module ID matching
- Module name fallback to `serialNumber` if `name` is undefined

### 3. Project-Specific QA Configurations
**File:** `js/qa/projectQAConfig.js` (NEW)
- Created extensible configuration system for per-project QA requirements
- Locke Lofts example with enhanced photo documentation
- Functions: `getProjectQAConfig()`, `getStationPhotoRequirements()`, etc.

---

## Recommendations for Functional QA Dashboard

### Priority 1: Core Functionality (Immediate)

#### A. Photo Capture Integration
**Current State:** Photo fields exist in traveler checklist items but no capture UI
**Recommendation:** Create `QAPhotoCapture.jsx` component
- Camera integration for mobile devices
- Photo upload for desktop
- Thumbnail gallery per checklist item
- Store in Supabase Storage bucket
- Link photos to specific module/station/checklist item

```jsx
// Suggested component structure
function QAPhotoCapture({ 
    moduleId, 
    stationId, 
    checklistItemId,
    projectConfig, // From projectQAConfig.js
    onPhotoAdded 
})
```

#### B. Deviation Workflow Enhancement
**Current State:** Basic status workflow (open → assigned → in-progress → ready-reinspect → closed)
**Recommendations:**
1. Add assignee selection from employees list
2. Add due date field with overdue highlighting
3. Add photo attachment to deviations
4. Email/notification when deviation assigned
5. Filter by assignee in Deviations panel

#### C. Traveler Detail Modal Improvements
**Current State:** Basic checklist view
**Recommendations:**
1. Add project-specific photo requirements indicator
2. Show required vs optional items
3. Progress bar per department
4. Quick-action buttons for common operations
5. Print/export traveler as PDF

### Priority 2: Inspector Workflow (Short-term)

#### A. Mobile-First Inspection View
**Recommendation:** Create dedicated inspector mode
- Large touch targets for PASS/NC/NA buttons
- Swipe gestures for navigation between items
- Offline capability with sync when connected
- Voice notes option for quick documentation

#### B. Station-Based View
**Current:** Module-centric view
**Recommendation:** Add station-centric inspection view
- "What modules are at Station 8 right now?"
- Batch inspection for multiple modules at same station
- Station completion dashboard

#### C. Quick Deviation Entry
**Recommendation:** Streamlined deviation creation
- Pre-fill module/station from current context
- Common issue templates (dropdown)
- Photo-first workflow (take photo, then add details)
- Voice-to-text for description

### Priority 3: Management Features (Medium-term)

#### A. QA Analytics Dashboard
**Recommendations:**
1. Deviation trends over time (chart)
2. Pass rate by department/station
3. Average time to close deviations
4. Top deviation categories
5. Inspector productivity metrics

#### B. Stop Station Enforcement
**Current:** Stop stations defined but not enforced
**Recommendation:** 
- Block module advancement at stop stations until QA approval
- Integration with Weekly Board progression
- Approval workflow with digital signature

#### C. Test Results Integration
**Current:** Test results stored but minimal UI
**Recommendations:**
1. Test scheduling calendar
2. Test result entry forms with pass/fail criteria
3. Certificate generation for passed tests
4. Integration with third-party inspection agencies (NTA)

### Priority 4: Project-Specific Features (Locke Lofts)

#### A. Enhanced Photo Documentation
Using the new `projectQAConfig.js`:
1. Display required photos per station
2. Photo completion checklist
3. Missing photo alerts
4. Photo gallery organized by milestone

#### B. Client Portal View
**Recommendation:** Read-only view for client stakeholders
- Progress dashboard
- Photo galleries
- Test certificates
- Deviation summary (closed only)

#### C. Custom Hold Points
Per-project hold points requiring specific approvals:
- MEP coordination sign-off
- Pre-finish inspection hold
- Client witness points

---

## Database Schema Additions (Supabase)

```sql
-- QA Photos table
CREATE TABLE qa_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES modules(id),
    project_id UUID REFERENCES projects(id),
    station TEXT,
    checklist_item_id TEXT,
    milestone_id TEXT,
    deviation_id TEXT,
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    taken_by TEXT,
    taken_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QA Deviations enhancements
ALTER TABLE qa_deviations ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id);
ALTER TABLE qa_deviations ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE qa_deviations ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';
ALTER TABLE qa_deviations ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE qa_deviations ADD COLUMN IF NOT EXISTS resolved_by TEXT;
ALTER TABLE qa_deviations ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Project QA configurations (optional - can also use JS config)
CREATE TABLE project_qa_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) UNIQUE,
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Implementation Phases

### Phase 1: Foundation (1-2 weeks)
- [x] Fix project selection (active only)
- [x] Fix deviation module selection
- [x] Create project QA config system
- [ ] Add photo capture component
- [ ] Enhance deviation form (assignee, due date)

### Phase 2: Inspector Tools (2-3 weeks)
- [ ] Mobile-optimized inspection view
- [ ] Station-based inspection mode
- [ ] Quick deviation entry
- [ ] Offline support

### Phase 3: Management (2-3 weeks)
- [ ] Analytics dashboard
- [ ] Stop station enforcement
- [ ] Test results UI
- [ ] PDF export

### Phase 4: Project-Specific (1-2 weeks)
- [ ] Locke Lofts photo requirements UI
- [ ] Custom hold points
- [ ] Client portal (if needed)

---

## Files Modified This Session

1. `js/components/QAModule.jsx` - Active projects filter, ID handling
2. `js/components/qa/DeviationsPanel.jsx` - Module ID string comparison
3. `js/qa/projectQAConfig.js` - NEW: Project-specific QA configurations
4. `index.html` - Added projectQAConfig.js script
5. `docs/QA_BOARD_RECOMMENDATIONS.md` - This document

---

## Next Steps

1. **Test the fixes** - Push to Git, verify on Vercel deployment
2. **Discuss priorities** - Which features are most critical for your inspectors?
3. **Photo storage** - Set up Supabase Storage bucket for QA photos
4. **Mobile testing** - Test QA board on tablets/phones used by inspectors
