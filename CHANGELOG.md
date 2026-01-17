# MODA Changelog

All notable changes to MODA are documented in this file.

**Current Version: 1.0.8**

---

## [1.0.8] - 2025-01-17
- Drawings Module: Add Serial No., Build Sequence, Hitch BLM, Rear BLM columns to Module Packages folder
- Drawings Module: Auto-parse BLM from uploaded file names and link to module data
- Drawings Module: Add cache-busting to file URLs to ensure current version always loads
- Drawings Module: Remove redundant download button (file name link already opens file)
- Drawings Module: Fix mobile file link click issue with touch-manipulation
- WeeklyBoard: Shop Drawing button now directly opens current version with cache-busting
- WeeklyBoard: Improved error messages with instructions for adding shop drawings

## [1.0.7] - 2025-01-16
- Move menu button to bottom-right, remove ellipse styling, make smaller

## [1.0.6] - 2025-01-16
- Bump version for cache testing

## [1.0.5] - 2025-01-16
- Add version footer to all pages
- FAB menu button at bottom-left
- Cache-busting meta tags

## [1.0.4] - 2025-01-16
- Fix mobile UI: sticky header with iOS safe area
- Larger hamburger touch target
- Content spacing fixes

## [1.0.3] - 2025-01-15
- Optimize load time: remove Tesseract.js, defer heavy libraries (xlsx, jspdf, pdf.js, qrcode)

## [1.0.2] - 2025-01-15
- Fix Tesseract.js CDN URL - use browser UMD build

## [1.0.1] - 2025-01-15
- Fix Supabase insert issues (routed_to, issue_category columns)
- Fix login page cutoff
- Fix UUID fields for Supabase

## [1.0.0] - 2025-01-14
- Initial versioned release
- Issue Types Manager with export
- Engineering issues data flow improvements
- Mobile localStorage redirect to memory storage
- iOS Safari quota error fixes
- Toast notifications system
- iOS Safari error handling and ErrorBoundary
- Issues section in Supply Chain Board

---

## Pre-1.0 Notable Features

### Weekly Board
- Keyboard navigation (arrow keys, 0-4 for progress)
- Pop-out window for focused production view
- Modules On Board sidebar panel
- Prototype scheduling improvements
- Full-width Production tab mode

### Admin & Settings
- Consolidated Admin tab with accordion sections
- Issue Categories Manager
- User management improvements

### Mobile
- Mobile-first responsive design
- Hamburger navigation drawer
- iOS Safari compatibility fixes
- Debug console for mobile troubleshooting

### Drawings System
- SharePoint integration for file storage
- OCR sheet extraction (Tesseract.js)
- Module drawings viewer with QR codes
- License plate generation

### Engineering
- Issue Tracker with Supabase sync
- Multi-user support

### Infrastructure
- Supabase backend (PostgreSQL + Auth)
- Vercel deployment
- Real-time data sync

---

*To check current version: Look at footer of any MODA page or check `index.html` line 15*
