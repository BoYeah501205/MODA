# MODA Dashboard Migration Guide

## Overview
Migrating from flat tab-based navigation to a hub-and-spoke dashboard model with role-based views.

## Migration Phases

### Phase 1: Foundation ✅ COMPLETE
- [x] Feature flags system (`js/config/featureFlags.js`)
- [x] React Router integration (HashRouter for Firebase compatibility)
- [x] No behavior changes - old system remains default

### Phase 2: Dashboard Home (NEXT)
- [ ] Create `DashboardHome.jsx` component
- [ ] Supervisor view with key metrics widgets
- [ ] Add as new "Home" tab (additive, not replacing)

### Phase 3: Navigation Grouping
- [ ] Collapsible navigation sections
- [ ] Group related tabs under categories

### Phase 4: Gradual Consolidation
- [ ] Migrate tabs into grouped views one at a time
- [ ] Remove old code paths after verification

---

## Tab Groupings (Planned)

| Group | Tabs |
|-------|------|
| **Production** | Production, Projects, Tracker, Weekly Board |
| **People** | People, Training |
| **Precon** | Precon, Engineering |
| **Quality** | QA |
| **Logistics** | Transport, Materials |
| **Field** | On-Site |
| **Admin** | Admin, Data Management, Settings |

---

## Feature Flags

Located in `js/config/featureFlags.js`

### Master Switch
```javascript
useNewNavigation: false  // Set true to enable new navigation
```

### Individual Flags
- `enableDashboardHome` - Show Dashboard Home tab
- `enableRoleBasedViews` - Role-adaptive content
- `enableNavGroups` - Collapsible navigation
- `enableProductionGroup` - Production group migration
- `enablePeopleGroup` - People group migration
- etc.

### Testing in Production
Add your email to `testUsers` array to see new features:
```javascript
testUsers: ['trevor@autovol.com']
```

### Console Commands
```javascript
// Check enabled flags
MODA_FEATURE_FLAGS.getEnabled()

// Check specific flag
MODA_FEATURE_FLAGS.isEnabled('enableDashboardHome', 'user@email.com')
```

---

## Rollback Procedure

If anything breaks:
1. Set `useNewNavigation: false` in `featureFlags.js`
2. Commit and deploy
3. Old system is immediately restored

---

## Files Added/Modified

### Phase 1
- **Added:** `js/config/featureFlags.js`
- **Added:** `docs/DASHBOARD_MIGRATION.md`
- **Modified:** `index.html` (added feature flags script, React Router CDN)
- **Modified:** `js/components/App.jsx` (Router wrapper, feature flag helper)

---

## URL Structure (Future)

With React Router enabled, URLs will be:
- `/#/` - Dashboard Home
- `/#/production` - Production view
- `/#/production/weekly-board` - Weekly Board
- `/#/projects` - Projects directory
- `/#/projects/:id` - Project detail
- `/#/people` - People module
- `/#/admin` - Admin panel

HashRouter (`/#/`) is used for Firebase static hosting compatibility.
