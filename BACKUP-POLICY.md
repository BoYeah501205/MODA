# 🔒 Backup Policy - MODA Project

**Last Updated:** December 2, 2025

---

## 📋 General Rule

**ALWAYS CREATE A BACKUP BEFORE MAJOR IMPLEMENTATIONS**

This prevents losing progress due to file corruption or failed edits during complex changes.

---

## 🎯 When to Create Backups

### **MANDATORY Backups:**
1. ✅ **Before major feature implementations** (e.g., Production Weeks, Training Sub-Tab)
2. ✅ **Before large refactoring** (e.g., converting to ES6 modules)
3. ✅ **Before editing critical files** (e.g., App.jsx with 9000+ lines)
4. ✅ **Before making multiple related edits** (e.g., menu system changes)
5. ✅ **At end of successful work session** (daily backups)

### **OPTIONAL Backups:**
- After completing a major milestone
- Before experimenting with new approaches
- When requested by user

---

## 🔧 How to Create Backups

### **Method 1: Using BACKUP_PROJECT.bat**
```batch
cd "C:\Projects\Autovol MODA\Autovol MODA - Optimized 12.1.25"
.\BACKUP_PROJECT.bat
```

**Backup Location:** `C:\Projects\Autovol MODA\Backups\MODA-Backup-YYYY-MM-DD_HHMM`

### **Method 2: Manual PowerShell**
```powershell
$date = Get-Date -Format "yyyy-MM-dd_HHmm"
robocopy "C:\Projects\Autovol MODA\Autovol MODA - Optimized 12.1.25" `
         "C:\Projects\Autovol MODA\Backups\MODA-Backup-$date" `
         /E /XD node_modules .git /XF *.log /R:1 /W:1
```

---

## 📂 Backup Naming Convention

**Format:** `MODA-Backup-YYYY-MM-DD_HHMM`

**Examples:**
- `MODA-Backup-2025-12-02_0450` - Automatic timestamp
- `MODA-Backup-2025-12-02_PreProductionWeeks` - Named milestone
- `MODA-Backup-2025-12-02_BeforeMenuRefactor` - Named feature

---

## 🔄 Restoration Process

### **If Corruption Occurs:**

1. **Stop immediately** - Don't make more edits
2. **Identify last good backup:**
   ```powershell
   dir "C:\Projects\Autovol MODA\Backups" | Sort-Object LastWriteTime -Descending
   ```
3. **Restore the file(s):**
   ```powershell
   Copy-Item "C:\Projects\Autovol MODA\Backups\MODA-Backup-YYYY-MM-DD_HHMM\js\components\App.jsx" `
             "C:\Projects\Autovol MODA\Autovol MODA - Optimized 12.1.25\js\components\App.jsx" -Force
   ```
4. **Verify restoration** - Check file integrity
5. **Resume work** - Try a different approach

---

## 📊 Backup Retention

- **Keep last 10 backups** minimum
- **Keep milestone backups** indefinitely
- **Clean up old backups** monthly (keep 1 per week for older backups)

---

## ✅ Pre-Implementation Checklist

Before starting ANY major implementation:

- [ ] Create backup using `BACKUP_PROJECT.bat`
- [ ] Verify backup completed successfully
- [ ] Note backup timestamp in TODO or notes
- [ ] Proceed with implementation
- [ ] If corruption occurs, restore from backup immediately

---

## 🎓 Lessons Learned

### **Session: December 2, 2025 - Station Board Menu**
- **Issue:** Multiple failed edit attempts corrupted App.jsx
- **Cause:** Complex whitespace/indentation matching issues
- **Solution:** Restored from `MODA-Backup-2025-12-02_0450`
- **Lesson:** Always backup before editing large files with complex structure

### **Best Practices:**
1. ✅ Create backup BEFORE starting work
2. ✅ Use simpler edits (remove entire sections rather than complex replacements)
3. ✅ Test after each significant change
4. ✅ Restore immediately if corruption detected

---

## 🚨 Emergency Contacts

**Backup Location:** `C:\Projects\Autovol MODA\Backups\`  
**Project Location:** `C:\Projects\Autovol MODA\Autovol MODA - Optimized 12.1.25\`  
**Backup Script:** `BACKUP_PROJECT.bat`

---

**Remember: 5 minutes creating a backup can save hours of lost work!** 🛡️
