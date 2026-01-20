# SharePoint Attachments Integration

## Overview

This document describes the SharePoint integration for storing photos and attachments from various MODA modules. Instead of storing large base64 images in Supabase, files are uploaded to SharePoint with only metadata (file IDs, URLs) stored in the database.

## Modules Covered

| Module | Attachment Type | Current Storage | SharePoint Folder |
|--------|----------------|-----------------|-------------------|
| **RFI** | Photos, PDFs, Documents | base64 in Supabase | `MODA Files/{Project}/RFI/{RFI-ID}/` |
| **On-Site Reports** | Module photos, General photos | base64 in Supabase | `MODA Files/{Project}/On-Site Reports/{Date_SetID}/` |
| **Issue Reports** | Issue photos | base64 in Supabase | `MODA Files/{Project}/Issue Reports/{Issue-ID}/` |
| **QA Inspections** | Inspection photos | base64 in Supabase | `MODA Files/{Project}/QA/Inspections/{Module-Serial}/` |
| **QA Deviations** | Deviation photos | base64 in Supabase | `MODA Files/{Project}/QA/Deviations/{Deviation-ID}/` |

## SharePoint Folder Structure

```
MODA Files/
├── {Project Name}/
│   ├── RFI/
│   │   ├── RFI-2025-001/
│   │   │   ├── photo1.jpg
│   │   │   └── spec_document.pdf
│   │   └── RFI-2025-002/
│   │       └── coordination_drawing.pdf
│   │
│   ├── On-Site Reports/
│   │   ├── 2025-01-20_SET-001/
│   │   │   ├── Module Photos/
│   │   │   │   ├── SN-12345/
│   │   │   │   │   ├── before_set.jpg
│   │   │   │   │   └── after_set.jpg
│   │   │   │   └── SN-12346/
│   │   │   │       └── crane_lift.jpg
│   │   │   └── General/
│   │   │       ├── site_overview.jpg
│   │   │       └── crew_photo.jpg
│   │   └── 2025-01-21_SET-002/
│   │       └── ...
│   │
│   ├── Issue Reports/
│   │   ├── ISS-2025-001/
│   │   │   ├── damage_photo1.jpg
│   │   │   └── damage_photo2.jpg
│   │   └── ISS-2025-002/
│   │       └── quality_defect.jpg
│   │
│   └── QA/
│       ├── Inspections/
│       │   ├── SN-12345/
│       │   │   ├── 2025-01-20_mezzanine_pass.jpg
│       │   │   └── 2025-01-21_drywall_pass.jpg
│       │   └── SN-12346/
│       │       └── 2025-01-20_inspection.jpg
│       │
│       └── Deviations/
│           ├── DEV-2025-001/
│           │   ├── nc_photo1.jpg
│           │   └── nc_photo2.jpg
│           └── DEV-2025-002/
│               └── deviation_evidence.jpg
```

## Client Library

### File: `js/sharepoint-attachments.js`

This library extends the base SharePoint client with module-specific upload functions.

### Usage Examples

#### RFI Attachments

```javascript
// Upload attachments when creating/updating an RFI
const rfi = {
    id: 'RFI-2025-001',
    project: 'Alvarado Creek',
    attachments: [base64Photo1, base64Photo2, pdfFile]
};

const results = await MODA_SHAREPOINT_ATTACHMENTS.uploadRFIAttachments(
    rfi.project,
    rfi.id,
    rfi.attachments,
    (uploaded, total, result) => {
        console.log(`Uploaded ${uploaded}/${total}: ${result.name}`);
    }
);

// Store SharePoint file IDs in Supabase instead of base64
rfi.attachmentRefs = results.map(r => ({
    id: r.id,
    name: r.name,
    webUrl: r.webUrl
}));
```

#### On-Site Report Photos

```javascript
// Upload module-specific photos
const modulePhotos = await MODA_SHAREPOINT_ATTACHMENTS.uploadOnSitePhotos(
    'Alvarado Creek',           // projectName
    '2025-01-20',               // reportDate
    'SET-001',                  // setId
    [photo1, photo2],           // photos (base64 or File)
    'SN-12345'                  // moduleSerial (optional)
);

// Upload general site photos (no module)
const generalPhotos = await MODA_SHAREPOINT_ATTACHMENTS.uploadOnSitePhotos(
    'Alvarado Creek',
    '2025-01-20',
    'SET-001',
    [sitePhoto1, sitePhoto2],
    null  // no module = goes to General folder
);
```

#### Issue Report Photos

```javascript
const issuePhotos = await MODA_SHAREPOINT_ATTACHMENTS.uploadIssuePhotos(
    'Alvarado Creek',
    'ISS-2025-001',
    [damagePhoto1, damagePhoto2]
);
```

#### QA Photos

```javascript
// Inspection photos (organized by module)
const inspectionPhotos = await MODA_SHAREPOINT_ATTACHMENTS.uploadQAInspectionPhotos(
    'Alvarado Creek',
    'SN-12345',
    [inspectionPhoto]
);

// Deviation photos (organized by deviation ID)
const deviationPhotos = await MODA_SHAREPOINT_ATTACHMENTS.uploadQADeviationPhotos(
    'Alvarado Creek',
    'DEV-2025-001',
    [ncPhoto1, ncPhoto2]
);
```

### Retrieving Files

```javascript
// List files in a folder
const files = await MODA_SHAREPOINT_ATTACHMENTS.listFiles(
    'MODA Files/Alvarado Creek/RFI/RFI-2025-001'
);

// Get download URL
const downloadUrl = await MODA_SHAREPOINT_ATTACHMENTS.getDownloadUrl(fileId);

// Get preview URL (opens in browser)
const previewUrl = await MODA_SHAREPOINT_ATTACHMENTS.getPreviewUrl(fileId);

// Delete a file
await MODA_SHAREPOINT_ATTACHMENTS.deleteFile(fileId);
```

## Database Schema Changes

To support SharePoint references instead of base64 storage, update the relevant tables:

### RFIs Table

```sql
-- Add column for SharePoint attachment references
ALTER TABLE rfis ADD COLUMN attachment_refs JSONB DEFAULT '[]';

-- attachment_refs structure:
-- [
--   { "id": "sharepoint-file-id", "name": "photo.jpg", "webUrl": "https://..." },
--   { "id": "sharepoint-file-id", "name": "document.pdf", "webUrl": "https://..." }
-- ]
```

### On-Site Reports / Issues

```sql
-- Similar pattern for other tables
ALTER TABLE onsite_reports ADD COLUMN photo_refs JSONB DEFAULT '[]';
ALTER TABLE issues ADD COLUMN photo_refs JSONB DEFAULT '[]';
ALTER TABLE qa_deviations ADD COLUMN photo_refs JSONB DEFAULT '[]';
```

## Integration Steps

### Phase 1: Preparation (Current)
- [x] Create `sharepoint-attachments.js` client library
- [x] Define folder structure conventions
- [x] Document integration patterns

### Phase 2: RFI Integration
- [ ] Update `RFIManager.jsx` to use SharePoint uploads
- [ ] Add `attachment_refs` column to RFIs table
- [ ] Update RFI view modal to display SharePoint files
- [ ] Add migration for existing base64 attachments

### Phase 3: On-Site Reports Integration
- [ ] Update `PhotoCapture.jsx` with SharePoint upload option
- [ ] Update `IssueLogger.jsx` to upload to SharePoint
- [ ] Update `ReportsTab.jsx` to display SharePoint photos
- [ ] Add photo_refs columns to relevant tables

### Phase 4: QA Integration
- [ ] Update `QAInspectionModal.jsx` with photo upload
- [ ] Update deviation forms with SharePoint upload
- [ ] Add photo_refs to QA tables

## Configuration Required

### SharePoint Secrets (Supabase Edge Function)

The following secrets must be configured in Supabase:

```
SHAREPOINT_TENANT_ID=your-tenant-id
SHAREPOINT_CLIENT_ID=your-client-id
SHAREPOINT_CLIENT_SECRET=your-client-secret
SHAREPOINT_SITE_ID=your-site-id
```

### Testing Connection

```javascript
// Test SharePoint connectivity
const result = await MODA_SHAREPOINT_ATTACHMENTS.testConnection();
console.log(result.success ? 'Connected!' : result.error);
```

## Benefits

1. **Reduced Database Size** - Photos stored in SharePoint, only metadata in Supabase
2. **Better Performance** - No large base64 strings in API responses
3. **Native Viewing** - SharePoint preview URLs work in browser
4. **Version History** - SharePoint maintains file versions automatically
5. **Access Control** - SharePoint permissions can be configured separately
6. **Searchable** - SharePoint content is searchable
7. **Integration** - Files accessible via Microsoft 365 apps

## Fallback Behavior

If SharePoint is unavailable:
- Photos continue to be stored as base64 in Supabase (existing behavior)
- UI shows warning that SharePoint sync is pending
- Background job can migrate photos when connection restored

```javascript
// Check availability before upload
if (MODA_SHAREPOINT_ATTACHMENTS.isAvailable()) {
    // Upload to SharePoint
    const refs = await MODA_SHAREPOINT_ATTACHMENTS.uploadRFIAttachments(...);
    rfi.attachmentRefs = refs;
} else {
    // Fallback to base64 storage
    rfi.attachments = base64Photos;
    rfi.pendingSharePointSync = true;
}
```
