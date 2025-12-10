# On-Site Tab Structure - MODA

## Priority Sub-Tabs (Phase 1)

### 1. Dashboard
### 2. Set Schedule  
### 3. Reports

---

## Daily Site Report Requirements (from Current Word Doc)

### Header Fields
| Field | Source | Notes |
|-------|--------|-------|
| **Autovol Rep** | Auto-fill from logged-in user or set lead | Was "Superintendent" |
| **Date** | Auto-fill (prior day) | Report sent morning after |
| **Job Site (Building)** | Auto-fill from project | Project name |
| **Temperature** | Weather API by site address | AM/PM temps, editable |
| **Precipitation** | Weather API | Editable if inaccurate |
| **Wind** | Weather API → Light/Moderate/High/Other | Editable |
| **Start Date** | Auto-fill from first set date | When project sets began |
| **Finish Date** | Projected from schedule | Filled when complete |
| **Weather Days Total** | Auto-calculate | Count of non-set weather days |
| **Set-Crew** | Auto-fill from scheduled crew | |
| **General Contractor** | Auto-fill from project data | |

### Report Types
1. **Set Day Report** - Modules set, issues, photos
2. **Weather Day Report** - No sets, but crew may still be on-site
3. **Non-Work Day** - No activity (weekend, holiday)

### Distribution
- Internal only (nearly entire company)
- Sent morning after the work day

### Key Improvements Over Word Doc
1. **Real-time logging** - Data entered during the day, not compiled after
2. **Embedded photos** - No separate email attachments
3. **Auto-populated fields** - Weather, crew, project info
4. **One-click generation** - Report builds automatically from logged data
5. **Weather day tracking** - Built-in function for non-set days

### Issue Categories (Keep Simple)
| Category | Use Case |
|----------|----------|
| **Quality Defect** | Damage, defects found during set |
| **Question** | Needs clarification or decision |
| **Site-Issue** | Site conditions, access, GC coordination |
| **Drawing Issue** | Discrepancy with plans/specs |
| **Other** | Free-text fill-in for edge cases |

*Categories can be expanded in future as patterns emerge*

### Global Items Priority Levels
| Priority | Use Case |
|----------|----------|
| **Attention** | Needs action or awareness |
| **FYI** | Informational only |
| **Resolved** | Previously flagged, now resolved |

### Sawbox / Unit Tracking
- Sawboxes already flagged in Module Details as difficulty item
- Unit count = Module count + Sawbox splits (1 sawbox = 2 units)
- Auto-calculate from existing data

---

## Core Workflow

```
Projects Tab                    On-Site Tab
     │                              │
     │  "Schedule Set" action       │
     └──────────────────────────────┼──► Set Schedule
                                    │         │
                                    │         ▼
                                    │    Dashboard (active sets)
                                    │         │
                                    │         ▼
                                    │    Field Crew Mobile
                                    │    - Log module set complete
                                    │    - Log issues during inspection
                                    │    - View production notes
                                    │    - Capture photos
                                    │         │
                                    │         ▼
                                    │    Reports
```

---

## Sub-Tab 1: Set Schedule

### Purpose
Schedule module sets and link project/module data into On-Site workflow.

### Features

#### Schedule Set Modal (triggered from Projects or Set Schedule)
- **Select Project** - Dropdown of Active projects
- **Select Modules** - Multi-select modules ready for set (completed Close-Up)
- **Set Date** - Date picker
- **Set Time** - Start time
- **Site Address** - Auto-populated from project, editable
- **Crane Info** - Crane company, operator, contact
- **Crew Assignment** - Select crew members for this set
- **Notes** - Pre-set notes/instructions

#### Calendar View
- Month/Week/Day toggle
- Color-coded by project
- Click date to see scheduled sets
- Drag to reschedule (with confirmation)

#### List View
- Sortable table of upcoming sets
- Columns: Date, Project, Modules, Crew, Status
- Quick filters: This Week, Next Week, All Upcoming
- Status: Scheduled, In Progress, Complete, Delayed, Cancelled

#### Set Record Data Model
```javascript
const SetSchedule = {
    id: 'SET-001',
    projectId: 'proj-123',
    projectName: 'Alvarado Creek',  // Denormalized for quick display
    siteAddress: '123 Main St, San Diego, CA',
    
    // Modules being set
    modules: [
        {
            moduleId: 'mod-001',
            serialNumber: '101',
            hitchBLM: 'B1L1M01',
            status: 'Scheduled'  // Scheduled, Set, Issue
        }
    ],
    
    // Schedule
    scheduledDate: '2024-12-15',
    scheduledTime: '07:00',
    estimatedDuration: 4,  // hours
    
    // Crew & Equipment
    crew: [
        { employeeId: 'emp-001', name: 'John Doe', role: 'Lead' }
    ],
    crane: {
        company: 'ABC Crane',
        operator: 'Mike Johnson',
        phone: '555-1234',
        craneType: '100-ton'
    },
    
    // Status
    status: 'Scheduled',  // Scheduled, In Progress, Complete, Delayed, Cancelled
    
    // Completion Data (filled during/after set)
    actualStartTime: null,
    actualEndTime: null,
    weather: null,
    
    // Notes
    preSetNotes: '',
    
    // Metadata
    createdAt: '2024-12-01T10:00:00Z',
    createdBy: 'Trevor Fletcher',
    updatedAt: null
};
```

---

## Sub-Tab 2: Dashboard

### Purpose
Real-time overview of on-site operations. Primary view for supervisors.

### Sections

#### Today's Sets (Hero Section)
- Large cards for each set scheduled today
- Shows: Project, Module count, Crew, Start time, Status
- Quick action: "Start Set" / "View Details"
- Color-coded status indicator

#### Active Set Panel (when a set is in progress)
- Expanded view of current set
- Module checklist with status
- Live issue count
- Photo count
- Timer showing duration

#### Upcoming Sets (Next 7 Days)
- Compact list view
- Date, Project, Module count
- Weather forecast icon (future enhancement)

#### Recent Activity Feed
- Last 10 actions across all sets
- "Module B1L2M03 marked as Set - John D."
- "Issue logged: Drywall damage - Jane S."
- "Photo uploaded - Mike J."

#### Quick Stats
- Sets This Week: X
- Modules Set This Month: X
- Open Issues: X
- Avg Set Time: X hrs

---

## Sub-Tab 3: Reports

### Purpose
View and export set documentation and field reports.

### Report Types

#### Daily Field Report
- Auto-generated summary of day's activities
- Sets completed
- Issues logged
- Photos captured
- Crew hours

#### Set Report (Per Set)
- Complete documentation of a single set
- All modules with status
- All issues with photos
- Timeline of events
- Crew signatures (future)
- Export to PDF

#### Module Set Profile
- Individual module's set history
- Production notes (pulled from Production tab)
- Set date/time
- Issues found
- Photos
- Resolution status

#### Issue Summary Report
- All open issues across sets
- Filter by project, severity, status
- Export for GC/owner

### Export Options
- PDF (formatted report)
- Excel (raw data)
- Photo package (ZIP of all photos)

---

## Mobile Field Crew Experience

### Primary Use Case
Field crew on mobile device during module set.

### Mobile-Optimized Views

#### 1. Active Set View
When crew member opens On-Site tab during a scheduled set:
- Auto-detects if they're assigned to an active set
- Shows module checklist
- Large touch-friendly buttons

#### 2. Module Set Actions
For each module in the set:

```
┌─────────────────────────────────────┐
│  Module: B1L2M03 (Serial: 103)      │
│  Unit: 2BR-A | Room: Living         │
├─────────────────────────────────────┤
│  📋 Production Notes                │
│  ┌─────────────────────────────────┐│
│  │ "Watch corner drywall - minor  ││
│  │  repair needed before set"     ││
│  │  - QA Team, 12/14              ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  [  ✓ Mark as Set  ]               │
│                                     │
│  [  ⚠ Log Issue  ]                 │
│                                     │
│  [  📷 Take Photo  ]               │
└─────────────────────────────────────┘
```

#### 3. Log Issue Flow
```
┌─────────────────────────────────────┐
│  Log Issue - B1L2M03                │
├─────────────────────────────────────┤
│  Issue Type:                        │
│  ○ Damage During Transport          │
│  ○ Damage During Set                │
│  ○ Pre-existing (from factory)      │
│  ○ Site Condition Issue             │
│  ○ Alignment/Fit Issue              │
│  ○ Other                            │
├─────────────────────────────────────┤
│  Severity:                          │
│  [Critical] [Major] [Minor]         │
├─────────────────────────────────────┤
│  Trade/Category:                    │
│  [Drywall ▼]                        │
├─────────────────────────────────────┤
│  Description:                       │
│  ┌─────────────────────────────────┐│
│  │                                 ││
│  │                                 ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  Photos:                            │
│  [📷 Add Photo]  [+] [+] [+]       │
├─────────────────────────────────────┤
│  [ Cancel ]        [ Submit Issue ] │
└─────────────────────────────────────┘
```

#### 4. Photo Capture
- Direct camera access
- Auto-timestamps
- Auto-tags with module ID and set ID
- Thumbnail preview before save
- Photos stored in Module Set Profile

---

## Data Models

### Set Issue
```javascript
const SetIssue = {
    id: 'ISS-001',
    setId: 'SET-001',
    moduleId: 'mod-001',
    serialNumber: '103',
    
    // Issue Details
    issueType: 'Damage During Set',
    severity: 'Minor',  // Critical, Major, Minor
    trade: 'Drywall',
    description: 'Corner bead damaged during crane lift',
    
    // Photos
    photos: [
        {
            id: 'photo-001',
            url: 'data:image/jpeg;base64,...',  // or blob URL
            timestamp: '2024-12-15T08:45:00Z',
            caption: ''
        }
    ],
    
    // Status
    status: 'Open',  // Open, In Progress, Resolved
    resolution: null,
    resolvedBy: null,
    resolvedAt: null,
    
    // Metadata
    reportedBy: 'John Doe',
    reportedAt: '2024-12-15T08:45:00Z'
};
```

### Module Set Record (per module within a set)
```javascript
const ModuleSetRecord = {
    moduleId: 'mod-001',
    serialNumber: '103',
    setId: 'SET-001',
    
    // Status
    status: 'Set',  // Pending, Set, Issue
    setTime: '2024-12-15T08:30:00Z',
    setBy: 'John Doe',
    
    // Production Notes (pulled from Production tab)
    productionNotes: [
        {
            note: 'Watch corner drywall - minor repair needed',
            author: 'QA Team',
            date: '2024-12-14'
        }
    ],
    
    // Field Notes
    fieldNotes: '',
    
    // Photos
    photos: [],
    
    // Issues
    issues: ['ISS-001']
};
```

---

## Integration with Projects Tab

### "Schedule Set" Action
Add button/action to Projects tab (in module list or project detail):
- "Schedule Set" button appears for modules that have completed Close-Up
- Opens Schedule Set modal pre-populated with project data

### Project Data Pulled into On-Site
- Project name
- Project location/address
- Module list with:
  - Serial number
  - BLM ID
  - Unit type
  - Dimensions
  - Production notes
  - QA notes

---

## Future Enhancements (Noted for Later)

1. **Offline Capability** - Cache active set data, sync when online
2. **Weather Integration** - Auto-fetch forecast for set dates
3. **GPS/Geofencing** - Auto-detect when crew arrives at site
4. **Digital Signatures** - Crew sign-off on completed sets
5. **Push Notifications** - Schedule changes, issue assignments
6. **Transport Integration** - Track module location in transit
7. **Crane Scheduling** - Dedicated crane availability calendar
8. **Site Maps** - Visual module placement on site plan

---

## File Structure (When Building Offline)

```
OnSiteTab/
├── OnSiteTab.jsx           # Main container with sub-tab routing
├── Dashboard.jsx           # Dashboard sub-tab
├── SetSchedule.jsx         # Set Schedule sub-tab
├── Reports.jsx             # Reports sub-tab
├── components/
│   ├── ScheduleSetModal.jsx
│   ├── SetCard.jsx
│   ├── ModuleSetChecklist.jsx
│   ├── IssueLogger.jsx
│   ├── PhotoCapture.jsx
│   ├── SetCalendar.jsx
│   └── ActivityFeed.jsx
├── hooks/
│   ├── useSetSchedule.js   # CRUD for set schedules
│   ├── useSetIssues.js     # Issue management
│   └── useOnSiteData.js    # Combined data hook
└── styles/
    └── onsite.css          # Mobile-optimized styles
```

---

## Ready to Build

**Phase 1 Components:**
1. `SetSchedule.jsx` - Calendar + list view + Schedule Set modal
2. `Dashboard.jsx` - Today's sets + active set panel
3. `Reports.jsx` - Set reports + module profiles

**Shall I start building the offline prototype?**
