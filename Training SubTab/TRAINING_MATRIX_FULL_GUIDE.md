# MODA TRAINING MATRIX - FULL BUILD GUIDE
**Version**: 2.0 - Complete Station Build  
**Date**: December 1, 2024  
**Status**: ✅ READY TO USE

---

## 🎯 What's Built

**[Open moda-training-matrix-FULL.html](computer:///mnt/user-data/outputs/moda-training-matrix-FULL.html)**

### ✅ Complete Feature Set:

**All 19 Production Stations:**
1. ✅ Automation Stations (hierarchical - 4 substations, 18 tasks)
2. ✅ Floor-Ceiling Mezzanine (8 skills pre-loaded)
3. ⚪ Plumbing Rough-In - Floors (empty - ready for skills)
4. ⚪ Plumbing Rough-In (empty)
5. ⚪ Plumbing Trim (empty)
6. ⚪ HVAC Rough-In (empty)
7. ⚪ HVAC Trim (empty)
8. ⚪ Electrical Rough-In - Ceilings (empty)
9. ⚪ Electrical Rough-In (empty)
10. ⚪ Electrical Trim (empty)
11. ⚪ Wall Set (empty)
12. ⚪ Ceiling Set (empty)
13. ⚪ Soffits (empty)
14. ⚪ Exteriors (empty)
15. ⚪ Drywall (empty)
16. ⚪ Roofing (empty)
17. ⚪ Pre-Finish (empty)
18. ⚪ Final Finish (empty)
19. ⚪ Close-Up/Transport (empty)

**Skill Management:**
- ✅ "+ Add Skills" button on every empty station
- ✅ Bulk skill entry (paste list, one per line)
- ✅ "Manage" button to edit/remove skills
- ✅ Import/Export skills configuration

**Employee Management:**
- ✅ Import from Excel or JSON (your 132 employees)
- ✅ Search by name
- ✅ Filter by department
- ✅ Sort by name/department/hire date

**Progress Tracking:**
- ✅ 0/25/50/75/100% dropdowns
- ✅ Color-coded cells (Gray/Red/Yellow/Orange/Green)
- ✅ Auto-save to localStorage
- ✅ Export all data

**UI Features:**
- ✅ Collapsible stations (click header to collapse)
- ✅ Sticky employee name column
- ✅ Sticky station headers
- ✅ Responsive design

---

## 🚀 Quick Start (5 Steps)

### **Step 1: Import Your Employees** ✅ (You already did this!)
```
Click "📥 Import Employees"
→ Select your Excel file
→ See 132 Line Solutioneers load
```

### **Step 2: Add Skills to Your First Station**
```
Find a station (e.g., "Wall Set")
→ Click "+ Add Skills" button
→ Paste your skill list (one per line):
   Wall Framing
   Blueprint Reading
   Measurement & Layout
   Power Tools
   Structural Specs
   Quality Check
→ Click "Add Skills"
→ Skills appear as columns!
```

### **Step 3: Update Some Progress**
```
Pick any employee
→ Click dropdown under a skill
→ Select 50%
→ Watch cell turn yellow
→ Try all levels (0/25/50/75/100)
```

### **Step 4: Collapse Stations You're Not Using**
```
Click any station header (blue bar)
→ Station collapses to single column
→ Click again to expand
→ Keeps table manageable!
```

### **Step 5: Export Your Work**
```
Click "💾 Export Skills Config"
→ Saves your skill setup
→ Can import later to restore
```

---

## 📝 Building Out Skills - Workflow

### **Recommended Approach:**

**Week 1: Build 3 Priority Stations**
1. Pick your 3 most important stations
2. List 6-10 skills for each
3. Add them using "+ Add Skills" button
4. Test with a few employees

**Week 2: Build 3 More Stations**
5. Add next 3 stations
6. Continue testing

**Week 3: Complete Remaining Stations**
7. Build out rest of stations
8. Export skills config for backup

**Week 4: Start Real Data Entry**
9. Begin tracking actual training progress
10. Train Team Leaders on updating progress

---

## 🎨 Bulk Skill Entry Format

When you click "+ Add Skills", paste skills **one per line**:

```
Wall Framing Basics
Advanced Wall Framing
Blueprint Reading
Measurement & Layout
Power Tool Operations
Pneumatic Tool Safety
Structural Specifications
Quality Inspection
Safety & PPE
```

**Pro Tips:**
- Keep skill names short (2-4 words)
- Use consistent naming (e.g., all end with "Basics", "Advanced", "Safety")
- Order from basic → advanced
- Always include "Safety" and "Quality" skills

---

## 💾 Data Management

### **Three Types of Exports:**

**1. Export All** (`📤 Export All`)
- Employees + Skills + Progress data
- Complete backup
- Use for full restore

**2. Export Skills Config** (`💾 Export Skills Config`)
- Just the skills setup
- Share with other locations
- Restore if you mess up skills

**3. Auto-Save**
- Everything saves to localStorage automatically
- Works offline
- Survives browser refresh

### **Import Options:**

**Import Employees:**
- Excel (.xlsx, .xls)
- JSON format
- Filters to Line Solutioneers only

**Import Skills Config:**
- JSON only
- Restores station skill setups
- Doesn't affect employee data

---

## 🎯 Example: Building Out Wall Set Station

**Step-by-Step:**

1. **Click the station header** "Wall Set" to find the "+ Add Skills" button
2. **Click "+ Add Skills"**
3. **Paste this list:**
```
Safety & PPE
Wall Framing - Interior
Wall Framing - Exterior
Blueprint Reading
Measurement & Layout
Chalk Line & Layout
Power Tool Operations
Nail Gun Safety
Framing Nailer
Structural Specifications
Header Installation
Shear Wall Construction
Quality Inspection
```
4. **Click "Add Skills"**
5. **Result:** 13 new columns appear under Wall Set!
6. **Now:** You can track progress for all 132 employees across these 13 skills

---

## 🔧 Managing Skills After Adding

### **To Edit/Remove Skills:**
1. Find the station with skills
2. Click "Manage" button in any skill header
3. See list of all skills
4. Click "Remove" on any skill (careful - deletes progress!)
5. Click "+ Add More Skills" to add additional skills

### **To Reorganize Skills:**
Currently: Remove and re-add in desired order
Future: Drag-and-drop reordering (coming soon)

---

## 📊 Station Types Explained

### **Type 1: Hierarchical (Automation Only)**
```
AUTOMATION STATIONS
├── Walls (5 tasks)
├── Floors/Ceilings (5 tasks)
├── Mill (3 tasks)
└── Program Use (4 tasks)
```
- Pre-built structure
- Can't add/remove (it's set)
- Tracks automation-specific training

### **Type 2: Standard (All Other Stations)**
```
WALL SET
├── Wall Framing (you add)
├── Blueprint Reading (you add)
├── Measurement (you add)
└── ... (you add)
```
- Completely flexible
- You define all skills
- Build as needed

---

## 🎨 Color System

| Progress | Color | Cell Background | Meaning |
|----------|-------|----------------|---------|
| **0%** | Gray | #E5E7EB | Not Started |
| **25%** | Red | #FEE2E2 | Basic Exposure |
| **50%** | Yellow | #FEF3C7 | In Progress |
| **75%** | Orange | #FFEDD5 | Proficient |
| **100%** | Green | #D1FAE5 | Certified/Mastered |

---

## ⚙️ Advanced Features

### **Collapse Stations**
- Click station header to collapse
- Reduces horizontal scroll
- Great for focusing on specific stations
- Stays collapsed until you expand

### **Department Filter**
- Auto-populated from your employees
- Shows count per department
- Filters table instantly

### **Search**
- Searches first and last names
- Real-time filtering
- Case-insensitive

### **Sort Options**
- By Name (last name, first name)
- By Department (groups employees)
- By Hire Date (seniority order)

---

## 🐛 Troubleshooting

**"Import doesn't work"**
- Make sure file is .xlsx, .xls, or .json
- Check that employees have "Line Solutioneer" as jobTitle
- Try exporting from main MODA first

**"Skills don't save"**
- Check browser localStorage is enabled
- Try clicking "Export Skills Config" as backup
- Refresh page to verify persistence

**"Table is too wide"**
- Collapse stations you're not working on
- Only expand 2-3 stations at a time
- Use horizontal scroll

**"Progress doesn't save"**
- Auto-saves on every change
- Refresh to verify
- Export periodically as backup

---

## 📋 Next Steps

### **Today:**
1. ✅ Import your 132 employees (DONE!)
2. ⚪ Pick 3 priority stations
3. ⚪ Write 6-10 skills for each
4. ⚪ Add skills using "+ Add Skills" buttons
5. ⚪ Test progress tracking

### **This Week:**
6. ⚪ Build out 5-10 stations total
7. ⚪ Export skills config for backup
8. ⚪ Train Team Leaders on tool usage

### **Next Week:**
9. ⚪ Complete remaining stations
10. ⚪ Begin entering real training data
11. ⚪ Generate progress reports

### **Future:**
12. ⚪ Integrate into main MODA as sub-tab
13. ⚪ Add progress summary dashboard
14. ⚪ Build automated reporting

---

## 🎯 Ready to Build!

**[Open moda-training-matrix-FULL.html](computer:///mnt/user-data/outputs/moda-training-matrix-FULL.html)**

Your 132 employees are waiting. Now you just need to add the skills!

**Pro tip:** Start with one station completely built out. Test it thoroughly. Then replicate that approach for the rest.

---

**Need Help?** 
- Check if employees loaded (should show count)
- Test adding skills to one station first
- Try collapsing/expanding stations
- Export early and often!

Good luck! 🚀
