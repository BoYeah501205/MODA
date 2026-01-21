# MODA Mobile Feature Guide

This document tracks which features are available, hidden, or simplified on mobile/iPad devices.

**Last Updated:** 2025-01-21  
**Configuration File:** `js/config/mobileFeatures.js`

---

## Overview

MODA provides a simplified mobile experience optimized for:
- **Production floor workers** checking module status
- **QA inspectors** performing inspections on tablets
- **Yard/transport workers** tracking module locations
- **Field workers** using On-Site features

Desktop-only features (admin, planning, bulk operations) are hidden on mobile to reduce complexity and improve performance.

---

## Tab Visibility

### Tabs HIDDEN on Mobile (8 tabs)

| Tab | Reason |
|-----|--------|
| **People** | HR/workforce administration - desktop only |
| **Supply Chain** | Inventory management - desktop only |
| **Equipment** | Equipment tracking - desktop only |
| **Precon** | Preconstruction planning - desktop only |
| **RFI** | Request for Information management - desktop only |
| **Engineering** | Engineering documentation - desktop only |
| **Automation** | Automation system monitoring - desktop only |
| **Admin** | System administration - desktop only |

### Tabs VISIBLE on Mobile (8 tabs)

| Tab | Mobile Experience |
|-----|-------------------|
| **Executive** | Simplified KPIs and progress bars |
| **Production** | Weekly Board with status updates |
| **Projects** | Project/module viewing (read-only) |
| **QA** | Inspection checklists, pass/fail, photos |
| **Transport** | Module location, shipping status |
| **On-Site** | Full functionality (designed for mobile) |
| **Drawings** | View PDFs with PDF.js viewer |
| **Tracker** | QR scanning, module lookup |

---

## Per-Tab Feature Details

### Production Tab

#### Hidden on Mobile
| Feature | Reason |
|---------|--------|
| Schedule Setup | Complex week configuration |
| Station Stagger | Station timing configuration |
| Prototype Placement | Complex drag-and-drop workflow |
| Pop-out Window | Desktop multi-monitor feature |
| PDF Export | Resource-intensive operation |
| Bulk Operations | Batch status changes |
| Reorder Mode | Drag-to-reorder modules |
| Week Navigation Arrows | Simplified to dropdown only |
| Edit Week Button | Links to Schedule Setup |
| Complete Week Button | Admin action |

#### Shown on Mobile
| Feature | Editable? |
|---------|-----------|
| Weekly Board | View |
| Module Cards | View |
| Week Selector (dropdown) | View |
| Project Filter | View |
| Station Filter | View |
| Module Detail (tap) | View |
| **Module Status Update** | **YES** |
| **Module Notes** | **YES** |

---

### Projects Tab

#### Hidden on Mobile
| Feature | Reason |
|---------|--------|
| Module Import (CSV) | Desktop admin function |
| Module Export (CSV) | Desktop admin function |
| Grid View | List view only on mobile |
| Heat Map Matrix | Complex visualization |
| Drawing Links Config | Configuration is desktop-only |
| Bulk Edit | Batch operations |
| Sort Dropdown | Simplified filtering |
| Add Project | Admin function |
| Delete Project | Admin function |
| Edit Project Details | Admin function |

#### Shown on Mobile
| Feature | Editable? |
|---------|-----------|
| Project List | View |
| Project Cards | View |
| Module List | View |
| Module Detail | View |
| Search Bar | View |
| Status Filter | View |
| View Drawings | View |
| License Plate | View |

---

### Executive Dashboard

#### Hidden on Mobile
| Feature | Reason |
|---------|--------|
| Detailed Charts | Complex visualizations |
| Export Buttons | Desktop function |
| Date Range Picker | Simplified view |
| Drill-down Analytics | Complex navigation |

#### Shown on Mobile
| Feature | Editable? |
|---------|-----------|
| KPI Cards | View |
| Project Summary | View |
| Progress Bars | View |
| Alerts Banner | View |

---

### QA Tab

#### Hidden on Mobile
| Feature | Reason |
|---------|--------|
| Bulk Inspection | Batch operations |
| Report Generation | Desktop function |
| Full Inspection History | Simplified view |
| Export Data | Desktop function |

#### Shown on Mobile
| Feature | Editable? |
|---------|-----------|
| Inspection Checklist | View |
| **Pass/Fail Buttons** | **YES** |
| **Photo Capture** | **YES** |
| **Issue Logging** | **YES** |
| Module Search | View |

---

### Transport Tab

#### Hidden on Mobile
| Feature | Reason |
|---------|--------|
| Yard Map Edit | Desktop admin function |
| Schedule Management | Complex scheduling |
| Route Planning | Desktop function |
| Export Data | Desktop function |

#### Shown on Mobile
| Feature | Editable? |
|---------|-----------|
| **Module Location** | **YES** |
| Shipping Status | View |
| Yard View | View |
| Delivery List | View |

---

### Drawings Tab

#### Hidden on Mobile
| Feature | Reason |
|---------|--------|
| Upload Drawings | Desktop admin function |
| Folder Management | Desktop admin function |
| Version Management | Desktop admin function |
| Markup Tools | Desktop function |
| Drawing Links Config | Desktop admin function |

#### Shown on Mobile
| Feature | Editable? |
|---------|-----------|
| Browse Drawings | View |
| View PDF (PDF.js) | View |
| Drawing Links | View |
| Search Drawings | View |

---

### On-Site Tab

**Full functionality on mobile** - This tab is designed for field workers on tablets/phones.

| Feature | Editable? |
|---------|-----------|
| Delivery Tracking | **YES** |
| Site Reports | **YES** |
| Photo Capture | **YES** |
| Issue Logging | **YES** |
| Module Status | **YES** |

---

### Tracker Tab

#### Hidden on Mobile
| Feature | Reason |
|---------|--------|
| Bulk Scan | Batch operations |
| Export History | Desktop function |

#### Shown on Mobile
| Feature | Editable? |
|---------|-----------|
| QR Scanner | View |
| Module Lookup | View |
| Status Display | View |
| Location History | View |

---

## Implementation Notes

### How to Check Mobile Status in Code

```javascript
// Check if device is mobile
if (window.MODA_MOBILE_CONFIG?.isMobile()) {
    // Mobile-specific code
}

// Check if a tab should be hidden
if (window.MODA_MOBILE_CONFIG?.isTabHidden('admin')) {
    return null; // Don't render
}

// Check if a feature should be hidden
if (window.MODA_MOBILE_CONFIG?.isFeatureHidden('production', 'scheduleSetup')) {
    return null; // Don't render
}

// Check if a feature is editable on mobile
const canEdit = window.MODA_MOBILE_CONFIG?.isFeatureEditable('production', 'moduleStatus');
```

### Adding New Features

When adding new features, update `js/config/mobileFeatures.js`:

1. Add to `hideOnMobile` array if feature should be hidden on mobile
2. Add to `showOnMobile` array if feature should be visible
3. Add to `editableOnMobile` array if feature allows editing on mobile
4. Update this documentation

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-21 | Initial mobile feature configuration |
