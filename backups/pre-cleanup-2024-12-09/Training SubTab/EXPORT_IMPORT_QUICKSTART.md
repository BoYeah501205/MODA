# QUICK START: Export Directory → Import to Training Matrix

## 🎯 Two-Step Process

### Step 1: Export Your Employee Directory

**[Open moda-export-employee-directory.html](computer:///mnt/user-data/outputs/moda-export-employee-directory.html)**

This utility will:
- Read your employee data from localStorage (either `autovol_employees` or `moda_employees`)
- Show you how many employees and Line Solutioneers you have
- Let you export as JSON or CSV

**What to do:**
1. Open the export utility in the SAME browser where you use your main MODA app
2. Verify the employee counts look correct
3. Click **"Export as JSON"** button
4. Save the file (will be named like `Employee_Directory_2024-12-01.json`)

---

### Step 2: Import into Training Matrix

**[Open moda-training-matrix-v2.html](computer:///mnt/user-data/outputs/moda-training-matrix-v2.html)**

This is your Training Matrix with working import!

**What to do:**
1. Click **"📥 Import Employees"** button (top right)
2. Select the JSON file you just exported
3. You'll see a confirmation showing how many Line Solutioneers were imported
4. The matrix will refresh with your actual employee data!

---

## ✅ What You Should See

**After Import:**
- Employee names in the first column (sorted by last name)
- Their departments shown under their names
- All the production stations as column headers
- Ready to add skills and track progress!

**Sample Data Indicator:**
- If you see "📋 Using Sample Data" badge, you're on sample data
- After import, this badge will disappear (you're using real data)
- Employee count will change from 12 to your actual Line Solutioneer count

---

## 🧪 Testing the Import Workflow

**Option A: Test with Your Real Data**
1. Export → Import (steps above)
2. Verify your employees show up correctly

**Option B: Test with Sample Data First**
1. Skip the export step
2. Open Training Matrix
3. Click **"👥 Load Sample Data"** to see 12 test employees
4. Play around with adding skills, updating progress
5. Then later import your real data

---

## 💾 Where Data is Stored

### Export Utility:
- **Reads from**: `autovol_employees` or `moda_employees` (localStorage)
- **Creates**: JSON or CSV file on your computer

### Training Matrix:
- **Loads from**: `moda_employees` (localStorage) OR imported file
- **Saves to**: `moda_training_matrix` (localStorage) for progress data
- **Also saves**: Imported employees to `moda_employees` for persistence

---

## 🔄 Workflow Summary

```
Your MODA App (People Module)
    ↓
localStorage: autovol_employees
    ↓
Export Utility → Downloads JSON
    ↓
Training Matrix: Import Button
    ↓
Training Matrix displays your Line Solutioneers
    ↓
Add skills, track progress
    ↓
Export from Training Matrix (saves progress + employees)
```

---

## ⚠️ Important Notes

1. **Same Browser Required** for Step 1
   - Export utility needs access to localStorage
   - Must use same browser where your MODA app runs

2. **Line Solutioneers Only**
   - Import filters to show ONLY Line Solutioneer positions
   - Other job titles won't appear in the matrix (by design)

3. **Progress Data Separate**
   - Employee data: from your People module
   - Training progress: stored separately in Training Matrix
   - Export from Training Matrix includes both

4. **Testing Won't Affect Real Data**
   - Playing with Training Matrix won't change your People module
   - They're separate until you decide to integrate

---

## 🚀 Next Steps After Import Works

Once you confirm import is working:
1. ✅ Start adding skills to production stations
2. ✅ Begin tracking actual training progress
3. ✅ Test collapsing/expanding departments
4. ✅ Try the sort and filter features
5. ✅ Export training data to save your work

Then we'll integrate the Training Matrix as a sub-tab in your main MODA People module!

---

## 🐛 Troubleshooting

**"No employee data found"** in Export Utility:
- Make sure you're using the same browser as your MODA app
- Try opening your main MODA app first, then open Export Utility
- Check that you have employees in your People module

**Import shows "No Line Solutioneers found"**:
- Verify your employees have job title exactly as "Line Solutioneer" (case-sensitive)
- Check the exported JSON file - look for "jobTitle" field

**Import doesn't do anything**:
- Check browser console (F12) for errors
- Make sure you selected a .json file
- Try exporting again and re-importing

---

Ready to test! 🎯

**Start here**: [Export Employee Directory](computer:///mnt/user-data/outputs/moda-export-employee-directory.html)
