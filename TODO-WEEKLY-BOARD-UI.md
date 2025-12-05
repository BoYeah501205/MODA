# Weekly Board UI/UX Improvements - TODO

**Created:** December 2, 2025  
**Updated:** December 2, 2025 - All priority items completed  
**Status:** ✅ Polished  
**Backup:** `Backups\Autovol MODA - Backup 12.2.25 - Weekly Board Functional`

---

## Priority Items

### 1. Date Marker Alignment ✅ COMPLETED
- [x] Daily assignment markers now align horizontally with module cards
- [x] Monday marker at same height as first module in Auto-FC
- [x] Each day's marker matches the corresponding module row
- [x] Used fixed height (72px) for both date markers and module cards
- [x] Used flexbox with consistent gap (8px) for alignment

### 2. Prompt Box Positioning (ModuleCardPrompt) ✅ COMPLETED
- [x] Changed from `absolute` to `fixed` positioning
- [x] Added viewport boundary detection
- [x] Menu now appears near button regardless of scroll position
- [x] Auto-adjusts if would go off-screen (flips above, shifts left/right)
- [x] Increased z-index to z-[100] for proper layering

### 3. Progress Buttons Overflow ✅ COMPLETED
- [x] Reduced button size to w-6 h-5 with text-[9px]
- [x] Changed to `justify-between` for even spacing
- [x] Added percentage display next to progress bar
- [x] Replaced "•••" with proper SVG vertical dots icon
- [x] Compact but still clickable and readable

---

## General Polish

### Visual Improvements
- [ ] Consistent spacing and padding throughout
- [ ] Better visual hierarchy
- [ ] Cleaner borders and shadows
- [ ] Professional color scheme refinement

### Responsiveness
- [ ] Test at different screen sizes
- [ ] Ensure horizontal scroll works smoothly
- [ ] Sticky date column should not overlap content

---

## Technical Notes

**Files to modify:**
- `js/components/WeeklyBoard.jsx`
  - `renderModuleCard()` - for progress button sizing
  - `renderDateMarkerColumn()` - for alignment
  - `ModuleCardPrompt` - for positioning fix
  - `renderStationColumn()` - for card sizing

**Current card width:** `w-40` (160px)  
**Current date column width:** `w-20` (80px)

---

## Testing Checklist
- [ ] Verify all progress buttons work
- [ ] Verify "..." menu opens correctly at all scroll positions
- [ ] Verify "View Module Details" opens correct modal
- [ ] Verify "Report Issue" works
- [ ] Verify date markers show correct dates
- [ ] Test with different line balance values
