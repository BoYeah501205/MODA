# COMPONENT BREAKDOWN - Training Matrix
**For Windsurf Integration**  
**Date**: December 1, 2024

---

## 📦 MAIN COMPONENTS

The Training Matrix consists of 4 major components that work together:

### 1. TrainingMatrixView (Main Container)
### 2. SkillBuilderModal (Add/Edit Skills)
### 3. SkillDetailModal (View Skill Info)
### 4. StationManagementModal (Manage Station Skills)

---

## 1️⃣ TRAININGMATRIXVIEW COMPONENT

### Purpose:
Main container that displays the training matrix table with employees in rows and station/skills as columns.

### Location in Standalone File:
Lines ~450-800 in moda-training-matrix-FULL.html

### Key Sections:

#### A. State Management
```javascript
// Employees (filtered to Line Solutioneers)
const [employees, setEmployees] = useState([]);

// Training progress data
const [trainingData, setTrainingData] = useState({});

// Station configurations with skills
const [trainingStations, setTrainingStations] = useState(STATIONS);

// UI state (collapsed stations, filters, sort)
const [collapsedStations, setCollapsedStations] = useState({});
const [searchTerm, setSearchTerm] = useState('');
const [departmentFilter, setDepartmentFilter] = useState('all');
const [sortBy, setSortBy] = useState('name');
```

#### B. Data Loading (useEffect)
```javascript
useEffect(() => {
    // Load employees from autovol_employees
    const storedEmployees = localStorage.getItem('autovol_employees');
    if (storedEmployees) {
        const allEmployees = JSON.parse(storedEmployees);
        const lineSolutioneers = allEmployees.filter(emp => 
            emp.jobTitle === 'Line Solutioneer'
        );
        setEmployees(lineSolutioneers);
    }
    
    // Load training progress
    const storedTraining = localStorage.getItem('moda_training_progress');
    if (storedTraining) {
        setTrainingData(JSON.parse(storedTraining));
    }
    
    // Load stations config
    const storedStations = localStorage.getItem('moda_training_stations');
    if (storedStations) {
        setTrainingStations(JSON.parse(storedStations));
    }
}, []);
```

#### C. Data Persistence (useEffect)
```javascript
useEffect(() => {
    localStorage.setItem('moda_training_progress', JSON.stringify(trainingData));
}, [trainingData]);

useEffect(() => {
    localStorage.setItem('moda_training_stations', JSON.stringify(trainingStations));
}, [trainingStations]);
```

#### D. Key Functions

**updateProgress** - Updates employee progress for a skill:
```javascript
function updateProgress(employeeId, skillId, value) {
    const key = `${employeeId}-${skillId}`;
    setTrainingData(prev => ({
        ...prev,
        [key]: {
            employeeId,
            skillId,
            progress: value,
            lastUpdated: new Date().toISOString(),
            updatedBy: currentUser // Get from MODA auth
        }
    }));
}
```

**toggleStation** - Collapse/expand stations:
```javascript
function toggleStation(stationId) {
    setCollapsedStations(prev => ({
        ...prev,
        [stationId]: !prev[stationId]
    }));
}
```

**filteredEmployees** - Apply search/filter/sort:
```javascript
const filteredEmployees = useMemo(() => {
    let result = employees.filter(emp => {
        const matchesSearch = 
            emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.lastName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
        return matchesSearch && matchesDept;
    });
    
    result.sort((a, b) => {
        if (sortBy === 'name') {
            return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
        } else if (sortBy === 'department') {
            return a.department.localeCompare(b.department);
        } else if (sortBy === 'hireDate') {
            return new Date(a.hireDate) - new Date(b.hireDate);
        }
        return 0;
    });
    
    return result;
}, [employees, searchTerm, departmentFilter, sortBy]);
```

#### E. Table Rendering

**renderTableHead** - Generate station/skill headers:
```javascript
function renderTableHead() {
    const thead = document.getElementById('tableHead');
    thead.innerHTML = '';
    
    // Row 1: Station headers
    const stationRow = document.createElement('tr');
    stationRow.appendChild(createEmployeeHeaderCell());
    
    trainingStations.forEach(station => {
        const isCollapsed = collapsedStations[station.id];
        const skillCount = getSkillCount(station);
        
        const th = document.createElement('th');
        th.className = 'station-header';
        th.colSpan = isCollapsed ? 1 : Math.max(skillCount, 1);
        th.onclick = () => toggleStation(station.id);
        th.innerHTML = `${isCollapsed ? '▶' : '▼'} ${station.name}`;
        
        stationRow.appendChild(th);
    });
    
    thead.appendChild(stationRow);
    
    // Row 2: Skill headers
    const skillRow = document.createElement('tr');
    
    trainingStations.forEach(station => {
        if (collapsedStations[station.id]) return;
        
        if (station.skills.length === 0) {
            // "+ Add Skills" button
            skillRow.appendChild(createAddSkillCell(station.id));
        } else {
            // Skill columns
            station.skills.forEach(skill => {
                skillRow.appendChild(createSkillHeaderCell(skill, station.id));
            });
        }
    });
    
    thead.appendChild(skillRow);
}
```

**renderTableBody** - Generate employee rows:
```javascript
function renderTableBody() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    filteredEmployees.forEach(emp => {
        const row = tbody.insertRow();
        
        // Employee name cell
        row.appendChild(createEmployeeNameCell(emp));
        
        // Skill progress cells
        trainingStations.forEach(station => {
            if (collapsedStations[station.id]) {
                row.appendChild(createCollapsedCell());
                return;
            }
            
            if (station.skills.length === 0) {
                row.appendChild(createEmptyCell());
            } else {
                station.skills.forEach(skill => {
                    row.appendChild(createProgressCell(emp.id, skill.skillId));
                });
            }
        });
    });
}
```

---

## 2️⃣ SKILLBUILDERMODAL COMPONENT

### Purpose:
Modal dialog for adding or editing a skill with detailed expectations per level.

### Required Form Fields:
- Skill Name (text input)
- 25% Expectation (textarea)
- 50% Expectation (textarea)
- 75% Expectation (textarea)
- 100% Expectation (textarea)
- Attachments (file upload, optional)

### Component Structure:
```javascript
function SkillBuilderModal({ 
    show, 
    onClose, 
    stationId, 
    existingSkill = null,
    onSave 
}) {
    const [skillName, setSkillName] = useState(existingSkill?.name || '');
    const [expectations, setExpectations] = useState(
        existingSkill?.expectations || { '25': '', '50': '', '75': '', '100': '' }
    );
    const [attachments, setAttachments] = useState(existingSkill?.attachments || []);
    
    const handleSave = () => {
        const skill = {
            skillId: existingSkill?.skillId || generateSkillId(stationId),
            name: skillName,
            expectations,
            attachments,
            createdDate: existingSkill?.createdDate || new Date().toISOString(),
            createdBy: currentUser
        };
        
        onSave(stationId, skill);
        onClose();
    };
    
    return (
        <div className={`modal ${show ? 'active' : ''}`}>
            <div className="modal-content">
                <h2>{existingSkill ? 'Edit Skill' : 'Add New Skill'}</h2>
                
                <label>Skill Name:</label>
                <input 
                    type="text" 
                    value={skillName}
                    onChange={(e) => setSkillName(e.target.value)}
                    placeholder="e.g., Wall Framing"
                />
                
                <label>25% Expectation:</label>
                <textarea 
                    value={expectations['25']}
                    onChange={(e) => setExpectations({...expectations, '25': e.target.value})}
                    placeholder="What should employee know/do at 25% proficiency?"
                    rows="3"
                />
                
                <label>50% Expectation:</label>
                <textarea 
                    value={expectations['50']}
                    onChange={(e) => setExpectations({...expectations, '50': e.target.value})}
                    placeholder="What should employee know/do at 50% proficiency?"
                    rows="3"
                />
                
                <label>75% Expectation:</label>
                <textarea 
                    value={expectations['75']}
                    onChange={(e) => setExpectations({...expectations, '75': e.target.value})}
                    placeholder="What should employee know/do at 75% proficiency?"
                    rows="3"
                />
                
                <label>100% Expectation:</label>
                <textarea 
                    value={expectations['100']}
                    onChange={(e) => setExpectations({...expectations, '100': e.target.value})}
                    placeholder="What should employee know/do at 100% proficiency?"
                    rows="3"
                />
                
                <label>Attachments (optional):</label>
                <input 
                    type="file" 
                    multiple
                    onChange={handleFileUpload}
                />
                {attachments.map((file, idx) => (
                    <div key={idx}>{file.filename}</div>
                ))}
                
                <div className="modal-buttons">
                    <button onClick={onClose}>Cancel</button>
                    <button onClick={handleSave} className="btn-primary">
                        {existingSkill ? 'Update' : 'Add'} Skill
                    </button>
                </div>
            </div>
        </div>
    );
}
```

---

## 3️⃣ SKILLDETAILMODAL COMPONENT

### Purpose:
Display full skill information when user clicks "..." button on a skill header.

### Component Structure:
```javascript
function SkillDetailModal({ show, onClose, skill }) {
    if (!skill) return null;
    
    return (
        <div className={`modal ${show ? 'active' : ''}`}>
            <div className="modal-content skill-detail">
                <div className="modal-header">
                    <h2>{skill.name}</h2>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                
                <div className="skill-detail-body">
                    <div className="expectation-section">
                        <h3>🔴 25% - Basic Exposure</h3>
                        <p>{skill.expectations['25'] || 'No expectations defined yet.'}</p>
                    </div>
                    
                    <div className="expectation-section">
                        <h3>🟡 50% - In Progress</h3>
                        <p>{skill.expectations['50'] || 'No expectations defined yet.'}</p>
                    </div>
                    
                    <div className="expectation-section">
                        <h3>🟠 75% - Proficient</h3>
                        <p>{skill.expectations['75'] || 'No expectations defined yet.'}</p>
                    </div>
                    
                    <div className="expectation-section">
                        <h3>🟢 100% - Certified</h3>
                        <p>{skill.expectations['100'] || 'No expectations defined yet.'}</p>
                    </div>
                    
                    {skill.attachments?.length > 0 && (
                        <div className="attachments-section">
                            <h3>📎 Attachments</h3>
                            {skill.attachments.map((file, idx) => (
                                <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer">
                                    {file.filename}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="modal-footer">
                    <button onClick={onClose} className="btn-gray">Close</button>
                </div>
            </div>
        </div>
    );
}
```

---

## 4️⃣ STATIONMANAGEMENTMODAL COMPONENT

### Purpose:
List all skills in a station with options to edit or remove each skill.

### Component Structure:
```javascript
function StationManagementModal({ 
    show, 
    onClose, 
    station,
    onEditSkill,
    onRemoveSkill,
    onAddSkill
}) {
    return (
        <div className={`modal ${show ? 'active' : ''}`}>
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Manage Skills: {station?.name}</h2>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>
                
                <div className="skills-list">
                    {station?.skills.length === 0 ? (
                        <p>No skills added yet.</p>
                    ) : (
                        station.skills.map((skill, idx) => (
                            <div key={skill.skillId} className="skill-item">
                                <span className="skill-number">{idx + 1}.</span>
                                <span className="skill-name">{skill.name}</span>
                                <div className="skill-actions">
                                    <button 
                                        onClick={() => onEditSkill(skill)}
                                        className="btn-secondary btn-small"
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (confirm(`Remove "${skill.name}"? Progress data will be lost.`)) {
                                                onRemoveSkill(station.id, skill.skillId);
                                            }
                                        }}
                                        className="btn-danger btn-small"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="modal-footer">
                    <button 
                        onClick={() => onAddSkill(station.id)}
                        className="btn-primary"
                    >
                        + Add New Skill
                    </button>
                    <button onClick={onClose} className="btn-gray">Close</button>
                </div>
            </div>
        </div>
    );
}
```

---

## 🔧 HELPER FUNCTIONS

### generateSkillId
```javascript
function generateSkillId(stationId) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${stationId}-skill-${timestamp}-${random}`;
}
```

### getSkillCount
```javascript
function getSkillCount(station) {
    if (station.type === 'hierarchical') {
        return station.substations.reduce((sum, sub) => sum + sub.skills.length, 0);
    }
    return station.skills.length;
}
```

### exportAllData
```javascript
function exportAllData() {
    const data = {
        exportDate: new Date().toISOString(),
        version: '3.0',
        employees: employees,
        stations: trainingStations,
        progress: trainingData
    };
    
    downloadJSON(data, `Training_Matrix_${getDateString()}.json`);
}
```

### exportSkillsConfig
```javascript
function exportSkillsConfig() {
    const data = {
        exportDate: new Date().toISOString(),
        version: '3.0',
        type: 'skills-config',
        stations: trainingStations
    };
    
    downloadJSON(data, `Training_Skills_Config_${getDateString()}.json`);
}
```

### downloadJSON
```javascript
function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
```

---

## 📊 COMPONENT INTERACTION FLOW

```
User Action → Component → Data Change → Re-render

1. ADD SKILL:
   User clicks "+ Add Skills"
   → Opens SkillBuilderModal
   → User fills form
   → Clicks "Add Skill"
   → Updates trainingStations state
   → Saves to localStorage
   → Re-renders table with new column

2. EDIT SKILL:
   User clicks "..." on skill header
   → Opens SkillDetailModal (view)
   → User clicks "Edit" (if implemented)
   → Opens SkillBuilderModal with existing data
   → User updates form
   → Clicks "Update Skill"
   → Updates trainingStations state
   → Re-renders table

3. UPDATE PROGRESS:
   User selects progress dropdown
   → Triggers updateProgress()
   → Updates trainingData state
   → Saves to localStorage
   → Cell re-renders (color change removed per feedback)

4. TOGGLE STATION:
   User clicks station header
   → Triggers toggleStation()
   → Updates collapsedStations state
   → Saves to localStorage
   → Table re-renders (collapsed/expanded)
```

---

## 🎨 CSS CLASSES REFERENCE

### Table Classes:
- `.training-table` - Main table
- `.employee-name` - Sticky first column
- `.station-header` - Blue station headers (clickable)
- `.skill-header` - Dark blue skill headers
- `.progress-cell` - Progress dropdown cells
- `.add-skill-cell` - Empty cell with "+ Add Skills" button

### Modal Classes:
- `.modal` - Modal overlay
- `.modal.active` - Shown modal
- `.modal-content` - Modal inner content
- `.modal-header` - Modal title bar
- `.modal-footer` - Modal button area

### Button Classes:
- `.btn-primary` - Red Autovol button
- `.btn-secondary` - Blue Autovol button
- `.btn-success` - Green button
- `.btn-gray` - Gray button
- `.btn-danger` - Red delete button
- `.btn-small` - Smaller button variant

---

## 🔍 CODE LOCATIONS IN STANDALONE FILE

**For reference when copying code:**

| Component | Line Range (approx) |
|-----------|-------------------|
| State initialization | 450-500 |
| useEffect hooks | 500-550 |
| Helper functions | 550-650 |
| updateProgress | 650-680 |
| toggleStation | 680-700 |
| filteredEmployees | 700-750 |
| renderTableHead | 750-850 |
| renderTableBody | 850-950 |
| Modal components | 950-1100 |
| Export functions | 1100-1150 |
| Styles | 50-450 |

---

## ✅ INTEGRATION CHECKLIST

When copying components:

- [ ] Copy state declarations
- [ ] Copy useEffect hooks for loading
- [ ] Copy useEffect hooks for saving
- [ ] Copy all helper functions
- [ ] Copy main render logic
- [ ] Copy modal components
- [ ] Copy CSS styles
- [ ] Update localStorage keys if needed
- [ ] Connect to existing MODA employee data
- [ ] Test each function individually
- [ ] Test complete workflow end-to-end

---

This breakdown should help you understand each piece when integrating into Windsurf! 🎯
