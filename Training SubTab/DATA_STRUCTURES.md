# DATA STRUCTURES REFERENCE
**Training Matrix - Windsurf Integration**  
**Date**: December 1, 2024

---

## 📊 COMPLETE DATA SCHEMAS

This document provides the exact data structure for every object in the Training Matrix system.

---

## 1. EMPLOYEE (From Main MODA)

**localStorage Key**: `autovol_employees`  
**Source**: Existing MODA People module

```javascript
{
  id: 15,                          // Unique employee ID
  firstName: "Jon",                // First name
  middleName: null,                // Middle name (optional)
  lastName: "Pope",                // Last name
  prefix: null,                    // Name prefix (optional)
  suffix: null,                    // Name suffix (optional)
  jobTitle: "Line Solutioneer",    // Job title (filter on this!)
  department: "AVICAB",            // Department code
  shift: "Shift-A",                // Shift assignment
  hireDate: "2023-12-18",          // Hire date (ISO format)
  email: null,                     // Email (optional)
  phone: null,                     // Phone (optional)
  permissions: "No Access",        // MODA permissions
  accessStatus: "none"             // Access status
}
```

**Note**: Training Matrix filters for `jobTitle === "Line Solutioneer"` only.

---

## 2. TRAINING STATION

**localStorage Key**: `moda_training_stations`  
**Array of Station Objects**

### Standard Station (Most Stations):
```javascript
{
  id: "wall-set",                  // Unique station ID (kebab-case)
  name: "Wall Set",                // Display name
  type: "standard",                // Type: "standard" or "hierarchical"
  order: 11,                       // Display order (1-19)
  skills: [                        // Array of skills for this station
    {
      skillId: "wall-set-0",       // Unique skill ID
      name: "Wall Framing",        // Skill display name
      expectations: {              // Expectations per level
        "25": "Learns basic wall framing techniques under direct supervision. Can identify common wall types and components.",
        "50": "Builds simple interior walls independently. Understands blueprint symbols. Needs occasional guidance on complex layouts.",
        "75": "Builds all wall types independently including load-bearing and shear walls. Can train others on basics. Troubleshoots common issues.",
        "100": "Expert-level wall framing. Certifies new employees. Handles all complex situations. Identifies and corrects code violations."
      },
      attachments: [               // Array of file attachments
        {
          filename: "wall_framing_sop_v2.pdf",
          url: "https://...",      // URL or base64 data
          uploadedDate: "2024-12-01T10:00:00Z",
          uploadedBy: "Trevor Fletcher"
        }
      ],
      createdDate: "2024-12-01T09:00:00Z",
      createdBy: "Trevor Fletcher",
      lastModified: "2024-12-01T14:30:00Z",
      modifiedBy: "Trevor Fletcher"
    }
    // ... more skills
  ]
}
```

### Hierarchical Station (Automation Only):
```javascript
{
  id: "automation",
  name: "Automation Stations",
  type: "hierarchical",            // Special type for nested structure
  order: 1,
  substations: [                   // Nested substations instead of skills
    {
      id: "walls",
      name: "Walls",
      skills: [                    // Skills under this substation
        {
          skillId: "automation-walls-0",
          name: "SE/SSE",
          expectations: {
            "25": "...",
            "50": "...",
            "75": "...",
            "100": "..."
          },
          attachments: [],
          createdDate: "2024-11-15T08:00:00Z",
          createdBy: "Chandra Automation Team"
        }
        // ... 5 total skills for Walls substation
      ]
    },
    {
      id: "floors-ceilings",
      name: "Floors/Ceilings",
      skills: [ /* 5 skills */ ]
    },
    {
      id: "mill",
      name: "Mill",
      skills: [ /* 3 skills */ ]
    },
    {
      id: "program-use",
      name: "Program Use",
      skills: [ /* 4 skills */ ]
    }
  ]
}
```

---

## 3. TRAINING PROGRESS

**localStorage Key**: `moda_training_progress`  
**Object with composite keys**

```javascript
{
  // Key format: "employeeId-skillId"
  "15-wall-set-0": {
    employeeId: 15,                // Employee ID
    skillId: "wall-set-0",         // Skill ID
    stationId: "wall-set",         // Station ID (for reference)
    progress: 50,                  // Progress: 0, 25, 50, 75, or 100
    lastUpdated: "2024-12-01T14:30:00Z",
    updatedBy: "Team Leader John", // Who made the update
    notes: "Progressing well, needs more practice on corners"
  },
  
  "15-wall-set-1": {
    employeeId: 15,
    skillId: "wall-set-1",
    stationId: "wall-set",
    progress: 25,
    lastUpdated: "2024-11-28T10:15:00Z",
    updatedBy: "Team Leader John",
    notes: "Just started blueprint training"
  },
  
  "15-automation-walls-0": {
    employeeId: 15,
    skillId: "automation-walls-0",
    stationId: "automation",
    progress: 100,
    lastUpdated: "2024-11-20T16:45:00Z",
    updatedBy: "Automation Supervisor",
    notes: "Certified on SE/SSE operations"
  }
  
  // ... one entry per employee per skill
  // With 132 employees and ~150 skills = ~19,800 potential entries
}
```

**Composite Key Pattern**: `${employeeId}-${skillId}`

**Why This Structure?**
- Fast lookups: O(1) access by employee + skill
- Easy to check if progress exists
- Simple to update individual progress
- No nested arrays to traverse

---

## 4. UI STATE

**localStorage Key**: `moda_training_ui_state`  
**Single object tracking UI preferences**

```javascript
{
  collapsedStations: [             // Array of collapsed station IDs
    "automation",
    "roofing",
    "hvac-rough"
  ],
  
  selectedView: "matrix",          // Current view: "matrix" or "detail"
  
  filters: {
    searchTerm: "martinez",        // Search box value
    department: "AVIFCM",          // Selected department filter
    station: "all",                // Selected station filter (future)
    progressLevel: "all"           // Selected progress filter (future)
  },
  
  sortBy: "name",                  // Current sort: "name", "department", "hireDate"
  
  lastActiveStation: "wall-set",   // Last station user was working on (future)
  
  viewPreferences: {
    showCollapsedHint: true,       // Show hints for collapsed stations
    autoSave: true,                // Auto-save on progress change
    confirmDelete: true            // Confirm before deleting skills
  }
}
```

---

## 5. EXPORT DATA STRUCTURES

### Full Export (Complete Backup):
```javascript
{
  exportDate: "2024-12-01T15:00:00Z",
  version: "3.0",
  type: "complete-backup",
  employees: [ /* Array of employee objects */ ],
  stations: [ /* Array of station objects */ ],
  progress: { /* Progress object */ },
  uiState: { /* UI state object */ },
  metadata: {
    exportedBy: "Trevor Fletcher",
    employeeCount: 132,
    stationCount: 19,
    totalSkills: 147,
    progressEntries: 3245
  }
}
```

### Skills Config Export (Share/Restore Setup):
```javascript
{
  exportDate: "2024-12-01T15:00:00Z",
  version: "3.0",
  type: "skills-config",
  stations: [ /* Array of station objects with skills */ ],
  metadata: {
    exportedBy: "Trevor Fletcher",
    stationCount: 19,
    totalSkills: 147,
    purpose: "Share with Factory #2 setup"
  }
}
```

### Progress Report Export (Management View):
```javascript
{
  exportDate: "2024-12-01T15:00:00Z",
  version: "3.0",
  type: "progress-report",
  summary: {
    totalEmployees: 132,
    totalSkills: 147,
    overallCompletion: 67.5,       // Percentage
    byStation: {
      "wall-set": {
        employeeCount: 45,
        avgCompletion: 72.3,
        skillsCount: 8
      }
      // ... more stations
    },
    byEmployee: [
      {
        employeeId: 15,
        name: "Pope, Jon",
        department: "AVICAB",
        overallCompletion: 68.2,
        completedSkills: 45,
        totalSkills: 66,
        needsAttention: [            // Skills at 0% or 25%
          "wall-set-3",
          "plumb-rough-1"
        ]
      }
      // ... more employees
    ]
  },
  detailedProgress: [ /* Complete progress data */ ]
}
```

---

## 6. IMPORT DATA STRUCTURES

### Employee Import (Excel/JSON):
```javascript
// Accepted formats:
{
  employees: [ /* Array of employee objects */ ]
}

// OR direct array:
[ /* Array of employee objects */ ]

// OR Excel columns:
// id | firstName | lastName | jobTitle | department | ... 
```

### Skills Config Import:
```javascript
{
  type: "skills-config",
  version: "3.0",
  stations: [ /* Array of station objects */ ]
}
```

---

## 🔍 DATA VALIDATION RULES

### Employee:
- ✅ `id` must be unique integer
- ✅ `jobTitle` must be "Line Solutioneer" to appear in matrix
- ✅ `firstName` and `lastName` required
- ✅ `department` should match known departments
- ⚠️ `hireDate` should be valid date (ISO format preferred)

### Station:
- ✅ `id` must be unique string (kebab-case recommended)
- ✅ `name` required
- ✅ `type` must be "standard" or "hierarchical"
- ✅ `order` must be 1-19 (unique)
- ✅ `skills` must be array (can be empty)

### Skill:
- ✅ `skillId` must be unique string
- ✅ `name` required (non-empty string)
- ✅ `expectations` must have keys: "25", "50", "75", "100"
- ⚠️ `attachments` optional (can be empty array)

### Progress:
- ✅ `employeeId` must exist in employees
- ✅ `skillId` must exist in stations
- ✅ `progress` must be: 0, 25, 50, 75, or 100
- ✅ `lastUpdated` should be ISO date string
- ⚠️ `updatedBy` should match current user
- ⚠️ `notes` optional

---

## 📐 DATA RELATIONSHIPS

```
Employee (1) ←→ (Many) Progress Entries
Station (1) ←→ (Many) Skills
Skill (1) ←→ (Many) Progress Entries

Employee --has-many--> Progress
Progress --belongs-to--> Employee
Progress --belongs-to--> Skill
Skill --belongs-to--> Station
Station --has-many--> Skills
```

---

## 💾 STORAGE SIZE ESTIMATES

### Per Employee (avg):
- Employee object: ~300 bytes
- Progress data (all skills): ~150 entries × 200 bytes = 30 KB
- **Total per employee**: ~30 KB

### Full System (132 employees):
- Employees: 132 × 300 bytes = ~40 KB
- Stations config: ~50 KB
- Progress data: 132 × 30 KB = ~4 MB
- UI state: ~1 KB
- **Total**: ~4.1 MB

**LocalStorage Limit**: Typically 5-10 MB per domain  
**Headroom**: Good (can support growth to 200+ employees)

---

## 🔄 DATA MIGRATION HELPERS

### Convert Old Format to New:
```javascript
function migrateProgressData(oldFormat) {
  const newFormat = {};
  
  Object.entries(oldFormat).forEach(([key, value]) => {
    // Old format: "employeeId-skillIndex"
    // New format: "employeeId-skillId"
    
    if (typeof value === 'number') {
      // Old: just stored number
      // New: store object with metadata
      newFormat[key] = {
        employeeId: parseInt(key.split('-')[0]),
        skillId: key.split('-')[1],
        progress: value,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'Migration Script',
        notes: ''
      };
    }
  });
  
  return newFormat;
}
```

### Validate Data Integrity:
```javascript
function validateTrainingData(employees, stations, progress) {
  const errors = [];
  
  // Check all progress entries reference valid employees
  Object.values(progress).forEach(entry => {
    const empExists = employees.find(e => e.id === entry.employeeId);
    if (!empExists) {
      errors.push(`Progress entry for unknown employee: ${entry.employeeId}`);
    }
  });
  
  // Check all progress entries reference valid skills
  Object.values(progress).forEach(entry => {
    let skillExists = false;
    stations.forEach(station => {
      if (station.type === 'hierarchical') {
        station.substations.forEach(sub => {
          if (sub.skills.find(s => s.skillId === entry.skillId)) {
            skillExists = true;
          }
        });
      } else {
        if (station.skills.find(s => s.skillId === entry.skillId)) {
          skillExists = true;
        }
      }
    });
    if (!skillExists) {
      errors.push(`Progress entry for unknown skill: ${entry.skillId}`);
    }
  });
  
  return errors;
}
```

---

## ✅ REFERENCE CHECKLIST

When implementing, verify:

- [ ] Employee data structure matches
- [ ] Station structure supports both standard and hierarchical
- [ ] Progress uses composite keys correctly
- [ ] Skill IDs are unique across all stations
- [ ] Expectations object has all 4 keys (25/50/75/100)
- [ ] LocalStorage keys don't conflict
- [ ] Data validates before saving
- [ ] Import/export preserves all fields
- [ ] Relationships maintained (employee → progress → skill)

---

This reference should cover all data structure needs for Windsurf integration! 🎯
