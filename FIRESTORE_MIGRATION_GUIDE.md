# 🔄 Firestore Migration Guide

## Overview
This guide explains how to migrate your MODA data from browser localStorage to Firebase Firestore cloud storage.

---

## ✅ What's Been Set Up

### 1. **Firebase Data Layer** (`js/firebase-data.js`)
- CRUD operations for Projects, Modules, and Employees
- Real-time sync with Firestore
- Automatic fallback to localStorage if Firebase unavailable

### 2. **React Hooks** (`js/hooks/useFirestoreSync.js`)
- `useProjects()` - Syncs projects with Firestore
- `useEmployees()` - Syncs employees with Firestore
- Automatic real-time updates across all users

### 3. **Migration Tool** (`js/components/FirestoreMigration.jsx`)
- Admin panel to import localStorage data to Firestore
- One-click migration
- Progress tracking and error handling

---

## 🚀 How to Migrate Your Data

### Step 1: Access Migration Tool
1. Log in as Admin (trevor@autovol.com)
2. Go to **Admin** tab
3. Look for **"Migrate to Firestore"** button
4. Click to open migration panel

### Step 2: Review Your Data
The migration panel will show:
- Number of projects in localStorage
- Number of employees in localStorage

### Step 3: Run Migration
Choose one of:
- **Migrate All Data** - Imports projects AND employees
- **Projects Only** - Just imports projects
- **Employees Only** - Just imports employees

### Step 4: Verify Success
- Migration panel will show success message
- Click **"Refresh Page"** to see Firestore-synced data
- Check browser console for sync confirmation

---

## 📊 Data Structure in Firestore

```
firestore/
├── projects/                    # All projects
│   ├── {projectId}/
│   │   ├── name
│   │   ├── client
│   │   ├── status
│   │   ├── startDate
│   │   ├── endDate
│   │   ├── createdAt
│   │   ├── updatedAt
│   │   └── modules/            # Subcollection
│   │       └── {moduleId}/
│   │           ├── serialNumber
│   │           ├── status
│   │           ├── station
│   │           └── ...
│
├── employees/                   # Company directory
│   └── {employeeId}/
│       ├── name
│       ├── department
│       ├── role
│       ├── createdAt
│       └── updatedAt
│
└── users/                       # User profiles (already exists)
    └── {userId}/
        ├── email
        ├── name
        ├── dashboardRole
        └── ...
```

---

## 🔧 Integration with Existing Code

### Before Migration (localStorage only)
```javascript
const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('autovol_projects');
    return saved ? JSON.parse(saved) : [];
});
```

### After Migration (Firestore + localStorage fallback)
```javascript
const { 
    projects, 
    addProject, 
    updateProject, 
    deleteProject,
    loading,
    synced 
} = window.FirestoreHooks.useProjects();
```

---

## ⚡ Benefits After Migration

| Feature | localStorage | Firestore |
|---------|-------------|-----------|
| **Persistence** | ❌ Lost on cache clear | ✅ Permanent cloud storage |
| **Multi-user** | ❌ Each user separate | ✅ All users see same data |
| **Real-time sync** | ❌ Manual refresh | ✅ Automatic updates |
| **Survives deploys** | ❌ Resets each time | ✅ Data intact |
| **Backup** | ❌ Manual export | ✅ Automatic cloud backup |
| **Offline support** | ✅ Works offline | ✅ Syncs when back online |

---

## 🛡️ Safety Features

### 1. **Non-Destructive**
- localStorage data is NOT deleted
- Acts as backup if Firestore fails
- Can always revert to localStorage

### 2. **Automatic Fallback**
- If Firebase unavailable, uses localStorage
- No data loss if connection fails
- Seamless user experience

### 3. **Real-time Sync**
- All users see updates instantly
- No manual refresh needed
- Prevents data conflicts

---

## 🧪 Testing the Migration

### Test 1: Data Persistence
1. Add a test project in MODA
2. Clear browser cache
3. Refresh page
4. ✅ Project should still be there

### Test 2: Multi-User Sync
1. Open MODA in two different browsers
2. Add project in Browser A
3. ✅ Should appear in Browser B within seconds

### Test 3: Deployment Survival
1. Add test data to Firestore
2. Deploy new version to Firebase Hosting
3. ✅ Data should remain intact

---

## 🔍 Monitoring & Debugging

### Check Firestore Status
Open browser console and run:
```javascript
// Check if Firestore is connected
console.log('Firestore available:', window.MODA_FIREBASE_DATA?.isAvailable());

// Check current projects
window.MODA_FIREBASE_DATA.projects.getAll().then(console.log);

// Check current employees
window.MODA_FIREBASE_DATA.employees.getAll().then(console.log);
```

### View Real-Time Sync Logs
Look for these console messages:
- `[Projects] Firestore sync: X projects`
- `[Employees] Firestore sync: X employees`
- `[Projects] Created in Firestore: {id}`

---

## ⚠️ Important Notes

### 1. **Run Migration Once**
- Running multiple times creates duplicates
- Check Firestore first before re-running
- Use Firebase Console to view/delete duplicates

### 2. **Modules Migration**
- Modules are stored as subcollections under projects
- Will be migrated when you integrate module sync
- Currently in Phase 3 (pending)

### 3. **localStorage Remains**
- Don't delete localStorage data yet
- Acts as backup during testing
- Can remove after confirming Firestore works

---

## 📝 Next Steps

### Phase 3: Module Sync (Pending)
- Integrate modules with Firestore
- Real-time production tracking
- Multi-user module updates

### Phase 4: Additional Collections (Future)
- QA records
- Transport logs
- Equipment tracking
- Production stages

---

## 🆘 Troubleshooting

### "Firebase not initialized"
- Check that Firebase config is correct in `firebase-auth.js`
- Verify internet connection
- Check browser console for Firebase errors

### "Migration failed"
- Check Firebase Console for permission errors
- Verify Firestore rules allow writes
- Check browser console for detailed error

### Data not syncing
- Refresh the page
- Check console for sync errors
- Verify Firebase connection in Network tab

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify Firebase Console shows data
3. Test with simple data first
4. Contact support with console logs

---

**Ready to migrate? Follow Step 1 above to get started!** 🚀
