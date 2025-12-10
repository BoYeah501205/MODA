# MODA Dashboard - Development Roadmap

## In Progress / Next Up

### PreCon RFI System - Future Enhancements
- [ ] Add RFI indicators to module cards on Dashboard
- [ ] Mobile testing on iOS devices
- [ ] Email notifications for RFI assignments
- [ ] RFI export to PDF/Excel
- [ ] Integration with SharePoint for file attachments

### Shop Drawing QR Codes
- [ ] Test `&web=1` parameter to force Safari browser on mobile
- [ ] If successful, auto-append parameter to all shop drawing URLs in QR codes

### Microsoft Graph API Integration (Future)
- [ ] Create guide for Graph API setup
- [ ] Auto-fetch shop drawing PDFs from SharePoint
- [ ] Replace manual BLM-to-URL mapping with dynamic lookup

---

## Planned Features

### Production Tracking
- [x] Real-time station progress updates ✅ (Dec 8, 2025)
- [x] Module completion notifications ✅ (Dec 8, 2025)
- [x] Production metrics dashboard ✅ (Dec 8, 2025)

### Weekly Board Enhancements
- [x] Drag-and-drop module reordering ✅ (Dec 8, 2025)
- [x] Station capacity indicators ✅ (Dec 8, 2025)
- [x] Schedule conflict warnings ✅ (Dec 8, 2025)

### Reporting
- [ ] Export production reports
- [ ] Module history/audit trail
- [ ] Performance analytics

### Mobile Experience
- [ ] Responsive design improvements
- [ ] QR code scanning from within app
- [ ] Offline capability for shop floor

---

## Completed Features
See [ACCOMPLISHMENTS.md](./ACCOMPLISHMENTS.md) for detailed history.

### Weekly Board & Production Tracking Enhancements ✅ (Dec 8, 2025)
- [x] Station capacity indicators with visual load bars (green/yellow/red)
- [x] Module completion toast notifications with auto-dismiss
- [x] Production metrics dashboard with KPI cards (This Week, In Progress, Completion Rate, Station Status)
- [x] Schedule conflict warnings banner for overloaded stations
- [x] Quick Move via right-click menu with "Apply to ALL stations" confirmation
- [x] Reorder Mode with drag-and-drop and bulk apply confirmation
- [x] Dark mode support (Ctrl+D toggle)
- [x] Keyboard shortcuts with help modal (?)

### PreCon RFI System Integration ✅ (Dec 4, 2025)
- [x] Created `RFIManager.jsx` component with full CRUD functionality
- [x] Added RFI tab to `ALL_AVAILABLE_TABS` and Admin role
- [x] Integrated RFI tab into main navigation
- [x] RFIManager receives `projects` and `employees` props
- [x] localStorage persistence for RFI data
- [x] Create, view, filter, respond to, and close RFIs
- [x] Autovol brand styling consistent with MODA

---

## Notes
- SharePoint site: `autovolcom.sharepoint.com`
- Test site: `/s/TestSite`
- Production site: `/s/ProductDevelopmentAutovolPrefab`



