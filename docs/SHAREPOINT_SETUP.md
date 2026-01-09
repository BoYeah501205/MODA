# SharePoint Integration Setup for MODA

## Overview
MODA uses SharePoint for storing large drawing files (PDFs, DWGs, etc.) that exceed Supabase Storage limits. The integration uses Microsoft Graph API via a Supabase Edge Function.

## Architecture
```
MODA Frontend ΓåÆ Supabase Edge Function ΓåÆ Microsoft Graph API ΓåÆ SharePoint
```

## Credentials (Stored in Supabase Edge Function Secrets)

| Variable | Value |
|----------|-------|
| `SHAREPOINT_TENANT_ID` | `6ee66277-8a4f-4a88-9d45-19de12a7e405` |
| `SHAREPOINT_CLIENT_ID` | `53b37c86-226e-4a3b-85f2-3103aa0e4a75` |
| `SHAREPOINT_CLIENT_SECRET` | (stored securely in Supabase) |
| `SHAREPOINT_SITE_ID` | `48e2dd37-a8f1-456c-9370-c5db4c670c72` |

## Setup Steps

### 1. Deploy Supabase Edge Function

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref syreuphexagezawjyjgt

# Set secrets (replace with actual values from Azure App Registration)
supabase secrets set SHAREPOINT_TENANT_ID=your-tenant-id
supabase secrets set SHAREPOINT_CLIENT_ID=your-client-id
supabase secrets set SHAREPOINT_CLIENT_SECRET=your-client-secret
supabase secrets set SHAREPOINT_SITE_ID=your-site-id

# Deploy the function
supabase functions deploy sharepoint
```

### 2. Azure App Permissions

Ensure your Azure App Registration has these Microsoft Graph API permissions:
- `Sites.ReadWrite.All` (Application permission)
- `Files.ReadWrite.All` (Application permission)

To add permissions:
1. Go to Azure Portal ΓåÆ App Registrations ΓåÆ MODA Drawings Integration
2. Click "API permissions"
3. Click "Add a permission" ΓåÆ "Microsoft Graph" ΓåÆ "Application permissions"
4. Search for and add: `Sites.ReadWrite.All`, `Files.ReadWrite.All`
5. Click "Grant admin consent for [Your Organization]"

### 3. SharePoint Site Structure

Files are organized in SharePoint as:
```
MODA Drawings/
Γö£ΓöÇΓöÇ [Project Name]/
Γöé   Γö£ΓöÇΓöÇ Permit Drawings/
Γöé   Γöé   Γö£ΓöÇΓöÇ Electrical Submittal/
Γöé   Γöé   Γöé   ΓööΓöÇΓöÇ drawing.pdf
Γöé   Γöé   ΓööΓöÇΓöÇ Mechanical Submittal/
Γöé   ΓööΓöÇΓöÇ Shop Drawings/
Γöé       Γö£ΓöÇΓöÇ Soffits/
Γöé       ΓööΓöÇΓöÇ Interior Walls/
```

## Usage in Code

```javascript
// Test connection
const result = await window.MODA_SHAREPOINT.testConnection();

// Upload a file
const file = document.querySelector('input[type="file"]').files[0];
const result = await window.MODA_SHAREPOINT.uploadFile(
    file,
    'Project Name',
    'Permit Drawings',
    'Electrical Submittal'
);

// Get download URL
const url = await window.MODA_SHAREPOINT.getDownloadUrl(fileId);

// List files in a folder
const files = await window.MODA_SHAREPOINT.getDrawingFiles(
    'Project Name',
    'Permit Drawings',
    'Electrical Submittal'
);
```

## Troubleshooting

### "Access denied" errors
- Ensure Azure app has admin consent for permissions
- Check that the app is registered in the correct tenant

### "Site not found" errors
- Verify the Site ID is correct
- Ensure the SharePoint site exists and is accessible

### Large file upload failures
- Files over 4MB use chunked upload automatically
- Maximum file size is 250GB (SharePoint limit)

## Security Notes

- Client secret is stored only in Supabase Edge Function secrets (never in frontend code)
- All SharePoint API calls go through the Edge Function
- Edge Function validates requests before forwarding to SharePoint
