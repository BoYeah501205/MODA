# QR Code System - Setup Instructions

## Quick Start Guide

Follow these steps to enable the QR code system for module license plates.

## Step 1: Database Setup

### Run SQL Migration in Supabase

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/syreuphexagezawjyjgt
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `backend/create-module-drawings-function.sql`
5. Click **Run**
6. Verify success message

**What this does**:
- Creates `get_module_shop_drawings()` function
- Creates `module_has_shop_drawings()` function
- Creates `get_module_by_serial()` function
- Grants permissions to authenticated users

## Step 2: Add QR Code Library

### Update index.html

Add the qrcode.js library CDN link to `index.html` in the `<head>` section:

```html
<!-- QR Code Library -->
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
```

**Location**: Before the closing `</head>` tag, after other library imports.

## Step 3: Add JavaScript Modules

### Update index.html

Add the new JavaScript modules to `index.html` before the closing `</body>` tag:

```html
<!-- QR Code System -->
<script src="js/qr-code-generator.js"></script>
<script src="js/supabase-module-drawings.js"></script>
<script src="js/components/ModuleDrawingsViewer.jsx" type="text/babel"></script>
```

**Location**: After existing script imports, before `</body>`.

## Step 4: Update App.jsx for Routing

### Add Module Drawings Viewer State

In `js/components/App.jsx`, add state for the module drawings viewer:

```javascript
// Add to state declarations
const [showModuleDrawingsViewer, setShowModuleDrawingsViewer] = useState(null); // { serialNumber }
```

### Add URL Route Handling

Add route detection in `useEffect` or routing logic:

```javascript
// Check for module drawings route: /drawings/module/:serialNumber
useEffect(() => {
    const path = window.location.pathname;
    const moduleDrawingsMatch = path.match(/^\/drawings\/module\/([^\/]+)$/);
    
    if (moduleDrawingsMatch) {
        const serialNumber = decodeURIComponent(moduleDrawingsMatch[1]);
        setShowModuleDrawingsViewer({ serialNumber });
        // Update URL without reload
        window.history.replaceState({}, '', path);
    }
}, []);
```

### Add Viewer Rendering

Add the viewer component to the render section:

```javascript
{/* Module Drawings Viewer (from QR code scan) */}
{showModuleDrawingsViewer && (
    <ModuleDrawingsViewer
        serialNumber={showModuleDrawingsViewer.serialNumber}
        onClose={() => {
            setShowModuleDrawingsViewer(null);
            window.history.pushState({}, '', '/');
        }}
        auth={auth}
    />
)}
```

## Step 5: Integrate with License Plate Generator

### Option A: Find Existing License Plate Generator

If you already have a License Plate Generator component:

1. Locate the component file (likely in `js/components/`)
2. Add QR code checkbox to the UI
3. Add QR code generation to PDF export

### Option B: Create New Integration

If you need to create the integration:

**Add to License Plate Generator Component**:

```javascript
// State
const [includeQRCode, setIncludeQRCode] = useState(false);

// In the form/options section
<label className="flex items-center gap-2">
    <input
        type="checkbox"
        checked={includeQRCode}
        onChange={(e) => setIncludeQRCode(e.target.checked)}
        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
    />
    <span className="text-sm text-gray-700">Include QR Code</span>
</label>

// In PDF generation function (requires pdf-lib)
if (includeQRCode && module.serialNumber) {
    await window.MODA_QR_CODE.addQRCodeToPDF(pdfDoc, page, module.serialNumber, {
        x: 515,  // Bottom-right corner (adjust for your layout)
        y: 15,
        size: 70 // ~1 inch at 72 DPI
    });
}
```

## Step 6: Test the System

### Test Database Functions

Open Supabase SQL Editor and run:

```sql
-- Test getting module info
SELECT * FROM get_module_by_serial('25-0962');

-- Test checking for drawings
SELECT module_has_shop_drawings('25-0962');

-- Test getting drawings
SELECT * FROM get_module_shop_drawings('25-0962');
```

### Test QR Code Generation

Open browser console on MODA app and run:

```javascript
// Check if QR library loaded
console.log('QRCode available:', typeof QRCode !== 'undefined');

// Check if MODA QR module loaded
console.log('MODA_QR_CODE available:', window.MODA_QR_CODE?.isQRCodeLibraryAvailable());

// Generate test QR code
window.MODA_QR_CODE.generateModuleQRCode('25-0962')
    .then(dataUrl => console.log('QR Code generated:', dataUrl.substring(0, 50) + '...'))
    .catch(err => console.error('QR Code error:', err));
```

### Test Module Drawings API

```javascript
// Check if module drawings API loaded
console.log('MODA_MODULE_DRAWINGS available:', window.MODA_MODULE_DRAWINGS?.isAvailable());

// Test getting module info
window.MODA_MODULE_DRAWINGS.getModuleInfo('25-0962')
    .then(info => console.log('Module info:', info))
    .catch(err => console.error('Error:', err));

// Test checking for drawings
window.MODA_MODULE_DRAWINGS.hasDrawings('25-0962')
    .then(has => console.log('Has drawings:', has))
    .catch(err => console.error('Error:', err));
```

### Test Viewer Component

1. Navigate to: `https://your-moda-app.vercel.app/drawings/module/25-0962`
2. Should show module drawings viewer
3. Verify module information displays correctly
4. Test View and Download buttons

## Step 7: Deploy

### Push to GitHub

```bash
git add -A
git commit -m "Add QR code system for module license plates"
git push
```

### Verify Vercel Deployment

1. Wait for Vercel auto-deployment
2. Check deployment logs for errors
3. Test on deployed URL

## Troubleshooting

### QR Code Library Not Loading

**Symptom**: `QRCode is not defined` error

**Solution**:
- Verify CDN link is correct in `index.html`
- Check browser console for network errors
- Try alternative CDN: `https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js`

### Database Functions Not Found

**Symptom**: `function get_module_shop_drawings does not exist`

**Solution**:
- Re-run SQL migration in Supabase
- Check for SQL syntax errors
- Verify you're connected to correct Supabase project

### Module Drawings Viewer Not Showing

**Symptom**: Blank page or no modal when accessing `/drawings/module/:serialNumber`

**Solution**:
- Check browser console for React errors
- Verify `ModuleDrawingsViewer.jsx` is imported in `index.html`
- Verify routing logic is added to `App.jsx`
- Check that `showModuleDrawingsViewer` state is properly set

### No Drawings Found (But They Exist)

**Symptom**: Viewer shows "No shop drawings found" but files exist

**Solution**:
- Verify files are in **Shop Drawings > Module Packages** folder
- Check file naming includes module serial number
- Verify `drawing_files.category = 'shop-drawings'`
- Check `drawing_files.discipline` contains "module" and "package"
- Run SQL query manually to debug:
  ```sql
  SELECT * FROM drawing_files 
  WHERE category = 'shop-drawings' 
  AND discipline ILIKE '%module%package%';
  ```

### QR Code Not Appearing on License Plate PDF

**Symptom**: PDF generates but no QR code visible

**Solution**:
- Verify `includeQRCode` checkbox is checked
- Check browser console for QR generation errors
- Verify `pdf-lib` is loaded (required for PDF integration)
- Adjust QR code position if it's off-page
- Check that `module.serialNumber` is defined

## Files Created

- `backend/create-module-drawings-function.sql` - Database functions
- `js/qr-code-generator.js` - QR code generation utilities
- `js/supabase-module-drawings.js` - Data access layer
- `js/components/ModuleDrawingsViewer.jsx` - Viewer component
- `docs/QR_CODE_SYSTEM.md` - Full documentation
- `docs/QR_CODE_SETUP_INSTRUCTIONS.md` - This file

## Next Steps

After setup is complete:

1. **Upload Shop Drawings**: Ensure module packages are uploaded to Shop Drawings > Module Packages folder
2. **Test with Real Data**: Generate license plates for actual modules
3. **Print Test**: Print a license plate and test QR code scanning
4. **User Training**: Train users on how to scan and use QR codes

## Support

For issues or questions:
- Check `docs/QR_CODE_SYSTEM.md` for detailed documentation
- Review browser console for error messages
- Check Supabase logs for database errors
- Verify all files are committed and deployed
