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
- [ ] Real-time station progress updates
- [ ] Module completion notifications
- [ ] Production metrics dashboard

### Weekly Board Enhancements
- [ ] Drag-and-drop module reordering
- [ ] Station capacity indicators
- [ ] Schedule conflict warnings

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



