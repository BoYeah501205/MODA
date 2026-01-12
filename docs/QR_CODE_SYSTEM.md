# QR Code System for Module License Plates

## Overview

The QR code system generates scannable codes on module license plates that link directly to the shop drawing package for each module. When scanned, the QR code opens a dedicated viewer showing all shop drawings associated with that specific module.

## Features

- **QR Code Generation**: Automatically generate QR codes for module serial numbers
- **License Plate Integration**: Optional checkbox to include QR code on license plates
- **Module Drawings Viewer**: Dedicated page showing all shop drawings for a module
- **Authentication**: Requires MODA login to access drawings
- **Error Handling**: User-friendly messages when no drawings exist
- **Multi-Version Support**: View and download all versions of each drawing

## Architecture

### Database Layer

**SQL Function**: `get_module_shop_drawings(p_serial_number TEXT)`
- Queries `drawing_files` and `drawing_versions` tables
- Filters by Module Packages discipline in Shop Drawings category
- Matches module serial number in file name or SharePoint folder path
- Returns all drawings with their versions grouped by drawing ID

**Helper Functions**:
- `module_has_shop_drawings(p_serial_number TEXT)` - Check if drawings exist
- `get_module_by_serial(p_serial_number TEXT)` - Get module information

**Location**: `backend/create-module-drawings-function.sql`

### Data Access Layer

**Module**: `js/supabase-module-drawings.js`

**API Methods**:
- `getBySerialNumber(serialNumber)` - Get all shop drawings for a module
- `hasDrawings(serialNumber)` - Check if module has drawings
- `getModuleInfo(serialNumber)` - Get module metadata
- `getDownloadUrl(storagePath, sharePointFileId)` - Get download URL
- `getViewUrl(storagePath, sharePointFileId)` - Get view URL

**Utilities**:
- `formatFileSize(bytes)` - Format file size for display
- `formatDate(dateString)` - Format date for display
- `getLatestVersion(versions)` - Get most recent version

### QR Code Generation

**Module**: `js/qr-code-generator.js`

**Dependencies**: 
- `qrcode.js` library (loaded via CDN)

**API Methods**:
- `generateModuleQRCode(serialNumber, options)` - Generate QR code as Data URL
- `generateModuleQRCodeToCanvas(serialNumber, canvas, options)` - Render to canvas
- `downloadModuleQRCode(serialNumber, fileName, options)` - Download as PNG
- `getModuleDrawingsUrl(serialNumber)` - Get viewer URL
- `addQRCodeToPDF(pdfDoc, page, serialNumber, position)` - Add to PDF (for license plates)

**QR Code URL Format**:
```
https://moda.app/drawings/module/{serialNumber}
```

Example: `https://moda.app/drawings/module/25-0962`

### UI Components

**Module Drawings Viewer**: `js/components/ModuleDrawingsViewer.jsx`

**Features**:
- Displays module information (serial, BLM, project)
- Lists all shop drawings with versions
- View and download buttons for each version
- Expandable version history
- Error states for missing modules or drawings

## Setup Instructions

### 1. Run Database Migration

Execute the SQL migration in Supabase SQL Editor:

```bash
# File: backend/create-module-drawings-function.sql
```

This creates the necessary database functions for querying module drawings.

### 2. Add QR Code Library to HTML

Add the qrcode.js library to `index.html`:

```html
<!-- QR Code Library -->
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
```

### 3. Add Script Imports

Add the new JavaScript modules to `index.html`:

```html
<!-- QR Code System -->
<script src="js/qr-code-generator.js"></script>
<script src="js/supabase-module-drawings.js"></script>
<script src="js/components/ModuleDrawingsViewer.jsx" type="text/babel"></script>
```

### 4. Update App.jsx for Routing

Add route handling for `/drawings/module/:serialNumber` URL pattern in `App.jsx`.

### 5. Integrate with License Plate Generator

Add QR code checkbox and generation logic to the License Plate Generator component.

## Usage

### For End Users

1. **Generate License Plate with QR Code**:
   - Open License Plate Generator
   - Select modules
   - Check "Include QR Code" option
   - Generate PDF

2. **Scan QR Code**:
   - Use phone camera or QR scanner app
   - Scan QR code on physical license plate
   - Opens MODA in browser

3. **View Drawings**:
   - Login if not authenticated
   - View module information and drawings list
   - Click "View" to open in browser
   - Click "Download" to save locally

### For Developers

**Generate QR Code Programmatically**:

```javascript
// Generate as Data URL
const qrDataUrl = await window.MODA_QR_CODE.generateModuleQRCode('25-0962', {
    size: 200,
    errorCorrectionLevel: 'M'
});

// Check if module has drawings
const hasDrawings = await window.MODA_MODULE_DRAWINGS.hasDrawings('25-0962');

// Get module drawings
const drawings = await window.MODA_MODULE_DRAWINGS.getBySerialNumber('25-0962');
```

**Add QR Code to PDF**:

```javascript
// Requires pdf-lib
await window.MODA_QR_CODE.addQRCodeToPDF(pdfDoc, page, '25-0962', {
    x: 515,  // Bottom-right corner
    y: 15,
    size: 70 // ~1 inch at 72 DPI
});
```

## Error Handling

### Module Not Found
- **Cause**: Serial number doesn't exist in database
- **Message**: "Module '{serialNumber}' not found"
- **Action**: Verify serial number is correct

### No Shop Drawings Found
- **Cause**: Module exists but has no shop drawings in Module Packages folder
- **Message**: "No shop drawing package exists for module {serialNumber}"
- **Action**: Upload drawings to Shop Drawings > Module Packages folder

### Authentication Required
- **Cause**: User not logged in
- **Action**: Redirect to login page with return URL

### SharePoint Unavailable
- **Cause**: SharePoint integration not configured or offline
- **Message**: "SharePoint is not available. Please check your connection and try again."
- **Action**: Check SharePoint configuration and network connection

## QR Code Specifications

### Size and Position on License Plate
- **Size**: 70 points (~1 inch) at 72 DPI
- **Position**: Bottom-right corner (x: 515, y: 15)
- **Resolution**: 140px for PDF (2x for clarity)
- **Error Correction**: Level M (15% recovery)

### Scanning Requirements
- **Minimum Size**: 0.75 inches for reliable scanning
- **Contrast**: Black on white background
- **Quiet Zone**: Automatic 1-module margin
- **Print Quality**: 300 DPI or higher recommended

## Data Flow

```
1. User generates license plate with QR code
   ↓
2. QR code encodes URL: /drawings/module/{serialNumber}
   ↓
3. User scans QR code with phone
   ↓
4. Browser opens MODA at encoded URL
   ↓
5. App checks authentication
   ↓
6. If not authenticated → redirect to login
   ↓
7. If authenticated → load ModuleDrawingsViewer
   ↓
8. Query database for module info and drawings
   ↓
9. Display drawings with view/download options
   ↓
10. User clicks View/Download
    ↓
11. Fetch SharePoint URL and open in new tab
```

## Security Considerations

- **No Tokens in QR Code**: QR code only contains serial number, not auth tokens
- **Authentication Required**: All drawing access requires valid login
- **RLS Policies**: Supabase Row Level Security enforces access control
- **SharePoint Integration**: Files stored in SharePoint with proper permissions

## Troubleshooting

### QR Code Not Generating
- Check if `qrcode.js` library is loaded: `typeof QRCode !== 'undefined'`
- Check browser console for errors
- Verify serial number is provided

### Viewer Shows "No Drawings"
- Verify drawings exist in Shop Drawings > Module Packages folder
- Check file naming matches module serial number pattern
- Verify `drawing_files.category = 'shop-drawings'`
- Verify `drawing_files.discipline` contains "module" and "package"

### SharePoint Files Not Opening
- Check SharePoint integration is configured
- Verify `sharepoint_file_id` is stored in `drawing_versions` table
- Check network connectivity to SharePoint
- Verify user has SharePoint permissions

## Future Enhancements

- **Offline Support**: Cache drawings for offline viewing
- **Batch Download**: Download all module drawings as ZIP
- **Print Preview**: Preview QR code before printing
- **Analytics**: Track QR code scans and drawing views
- **Custom QR Styling**: Add logo or color to QR codes
- **Multi-Module QR**: Link to multiple modules (e.g., stacked units)

## Related Documentation

- `SETUP_DRAWINGS_SYSTEM.md` - Drawing system setup guide
- `DRAWING_OCR_SETUP.md` - Sheet extraction and OCR setup
- Drawing system database schema in `backend/create-drawing-sheets-tables.sql`
