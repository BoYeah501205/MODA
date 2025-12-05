# MODA Dashboard - Fixes Needed

## Date: November 30, 2025

### 1. Station Board - "View Details" Button Does Nothing
**Location:** `App.jsx` ~line 3007
**Problem:** The "👁️ Details" button in the Station Board module cards calls `setSelectedModuleDetail` which doesn't exist in the `ProductionDashboard` component scope.
**Fix:** Need to either:
- Add state `const [selectedModuleDetail, setSelectedModuleDetail] = useState(null);` to ProductionDashboard
- Add a `ModuleDetailModal` render in ProductionDashboard when `selectedModuleDetail` is set
- OR pass the module to a shared detail view function

```jsx
// Current (broken):
onClick={(e) => { e.stopPropagation(); setSelectedModuleDetail && setSelectedModuleDetail(module); }}

// Need to add state and modal render to ProductionDashboard
```

---

### 2. Project Modules - "Report Issue" Button Does Nothing
**Location:** `App.jsx` ~line 4576
**Problem:** The "⚠️ Report Issue" button in Project Detail module cards has an empty handler `/* Report issue */`
**Fix:** Need to:
- Pass `openReportIssue` function to `ProjectDetail` component
- OR add local state for report issue modal in `ProjectDetail`
- Wire up the button to open the ReportIssueModal with proper context

```jsx
// Current (broken):
onClick={(e) => { e.stopPropagation(); /* Report issue */ }}

// Should be:
onClick={(e) => { e.stopPropagation(); openReportIssue(module, null); }}
```

---

## Quick Reference
- **ReportIssueModal component:** ~line 3431
- **openReportIssue function:** ~line 2746 (inside ProductionDashboard)
- **ProjectDetail component:** ~line 4271
- **Station Board module cards:** ~line 2986
