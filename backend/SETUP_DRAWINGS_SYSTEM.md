# Drawing System Setup Guide

## Overview

The MODA drawing system consists of two layers:
1. **Base Drawing Management** - File and version tracking
2. **Sheet Extraction & OCR** - Individual sheet extraction with metadata

## Setup Order

Run these SQL migrations in Supabase SQL Editor **in this exact order**:

### Step 1: Create Storage Bucket
```sql
-- File: create-drawings-storage.sql
-- Creates the 'drawings' storage bucket with RLS policies
```

### Step 2: Create Base Drawing Tables
```sql
-- File: create-drawings-base-tables.sql
-- Creates:
--   - drawing_files (main file registry)
--   - drawing_versions (version history)
--   - drawing_folders (custom folder definitions)
```

### Step 3: Create Sheet Extraction Tables
```sql
-- File: create-drawing-sheets-tables.sql
-- Creates:
--   - drawing_sheets (individual extracted sheets)
--   - sheet_extraction_jobs (processing job tracking)
--   - module_unit_types (reference data)
--   - search_drawing_sheets() function
--   - get_sheets_by_unit_type_and_discipline() function
--   - auto_link_sheet_to_module() function
```

## Quick Setup Commands

Copy and paste each block into Supabase SQL Editor:

### 1. Storage Bucket
```sql
-- Create drawings storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'drawings',
    'drawings',
    true,
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'image/tif', 'application/x-dwg', 'image/vnd.dwg']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- RLS policies for storage
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'drawings');

CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'drawings');

CREATE POLICY "Allow public read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'drawings');

CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'drawings');
```

### 2. Base Tables
Open and run: `backend/create-drawings-base-tables.sql`

### 3. Sheet Extraction Tables
Open and run: `backend/create-drawing-sheets-tables.sql`

## Verification

After running all migrations, verify the tables exist:

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'drawing%'
ORDER BY table_name;

-- Expected output:
-- drawing_files
-- drawing_folders
-- drawing_sheets
-- drawing_versions
-- module_unit_types
-- sheet_extraction_jobs
```

## Deploy Edge Function

After database setup, deploy the OCR processing function:

```bash
# Deploy function
supabase functions deploy process-drawing-sheets

# Set Claude API key
supabase secrets set CLAUDE_API_KEY=your_anthropic_api_key_here
```

Get your Claude API key from: https://console.anthropic.com/

## Troubleshooting

### Error: relation "drawing_files" does not exist
**Solution**: Run `create-drawings-base-tables.sql` first

### Error: relation "projects" does not exist
**Solution**: The base MODA project tables need to be created first. Check if projects table exists:
```sql
SELECT * FROM projects LIMIT 1;
```

### Error: relation "modules" does not exist
**Solution**: The modules table is required for auto-linking. Ensure project setup is complete.

### Storage bucket already exists
**Solution**: This is fine - the `ON CONFLICT DO UPDATE` will update the existing bucket settings.

## Testing

After setup, test the system:

1. **Upload a drawing**:
   - Go to Drawings module
   - Select project → Shop Drawings → Module Packages
   - Upload a multi-page PDF

2. **Process sheets**:
   - Click the layers icon on the uploaded drawing
   - Wait for processing to complete

3. **Browse sheets**:
   - Click "Browse Sheets" button
   - Use filters to search sheets
   - Verify OCR metadata was extracted

## Cost Estimate

- **Storage**: ~$0.021/GB/month (Supabase)
- **OCR Processing**: ~$0.01-0.02 per sheet (Claude API)
- **Edge Function**: Free tier includes 500K invocations/month

Example: Processing a 20-sheet drawing package costs ~$0.20-0.40 in OCR fees (one-time cost).
