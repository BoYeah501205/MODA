# MODA Dashboard - Accomplishments Log

## December 3, 2024

### Shop Drawing Integration
- **Shop Drawing Links System**: Added manual BLM-to-URL mapping for shop drawings
  - New projects: Can add shop drawing links in NewProjectModal
  - Existing projects: Can edit links in EditProjectModal
  - Format: `BLM, URL` (one per line, comma or tab separated)
  - Validation and parsing with error feedback

- **Open Shop Drawing Button**: Added to ModuleDetailModal
  - Looks up hitchBLM and rearBLM for mapped URLs
  - Opens in new tab if found, shows alert if not

- **License Plate QR Codes**: Modified to link to shop drawings
  - QR code links directly to shop drawing URL (not module details)
  - "Shop Drawing Package Link" label above QR code
  - "Scan to open shop drawing" text below
  - QR code hidden if no URL exists for that BLM
  - Updated both PDF generation and preview components

### Weekly Board Improvements (Prior Work)
- Module card redesign with larger cards and teal borders
- Date marker alignment fixes
- ModuleCardPrompt positioning (fixed, left-aligned)
- Escape key handlers for modals
- Station stagger logic fix (subtraction for downstream stations)
- Shop drawing handler in WeeklyBoard module cards

---

## Backups Created
- `App.jsx.backup_20241203` - Before License Plate QR changes
- `App.jsx.backup_20241203_night` - End of day backup
