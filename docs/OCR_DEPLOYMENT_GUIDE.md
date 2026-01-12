# 🚀 OCR Edge Function Deployment Guide

## Overview
This guide will walk you through deploying the `process-drawing-sheets` Edge Function to Supabase using the Dashboard (no CLI required).

---

## Prerequisites

1. **Supabase Account**: Access to https://supabase.com/dashboard/project/syreuphexagezawjyjgt
2. **Claude API Key**: Get one from https://console.anthropic.com/
3. **Database Tables**: Ensure all drawing tables are created (run migrations first)

---

## Step 1: Deploy the Edge Function

### 1.1 Navigate to Edge Functions

1. Go to: https://supabase.com/dashboard/project/syreuphexagezawjyjgt
2. Click **"Edge Functions"** in the left sidebar
3. Click **"Create a new function"** button

### 1.2 Create the Function

1. **Function Name**: `process-drawing-sheets`
2. **Copy the code** from the file below into the editor
3. Click **"Deploy function"**

**Code Location**: `supabase/functions/process-drawing-sheets/index.ts`

---

## Step 2: Set Environment Variables

### 2.1 Add Claude API Key

1. In Supabase Dashboard, go to **Project Settings** (gear icon)
2. Click **"Edge Functions"** in the left menu
3. Scroll to **"Function Secrets"** section
4. Click **"Add new secret"**
5. Enter:
   - **Name**: `CLAUDE_API_KEY`
   - **Value**: Your Anthropic API key (starts with `sk-ant-`)
6. Click **"Save"**

### 2.2 Verify Environment Variables

The function automatically has access to:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (auto-injected)
- `CLAUDE_API_KEY` - The key you just added

---

## Step 3: Test the Deployment

### 3.1 Check Function Status

1. Go to **Edge Functions** in Supabase Dashboard
2. You should see `process-drawing-sheets` listed
3. Status should show as **"Deployed"** with a green indicator

### 3.2 Test with a Sample Upload

1. Go to your Vercel deployment: https://your-app.vercel.app
2. Navigate to: **Drawings → Select Project → Shop Drawings → Module Packages**
3. Upload a multi-page PDF (e.g., "B1L2M15 - Mechanical Shops.pdf")
4. Click **"Extract Sheets"** button
5. Watch for:
   - Processing overlay appears
   - Progress indicator updates
   - Sheets appear in Sheet Browser after completion

### 3.3 Verify in Database

1. Go to **Table Editor** in Supabase Dashboard
2. Check `drawing_sheets` table
3. Verify:
   - New rows were created
   - `sheet_name`, `sheet_title`, `drawing_date` are populated
   - `ocr_confidence` shows a value (0-100)
   - `linked_module_id` is set (if module match found)

---

## Step 4: Monitor and Debug

### 4.1 View Function Logs

1. Go to **Edge Functions** → `process-drawing-sheets`
2. Click **"Logs"** tab
3. You'll see:
   - Request/response logs
   - OCR extraction results
   - Error messages (if any)

### 4.2 Common Issues

**Issue**: Function returns 404
- **Fix**: Ensure function is deployed and shows "Deployed" status

**Issue**: "CLAUDE_API_KEY is not set"
- **Fix**: Add the secret in Project Settings → Edge Functions → Function Secrets

**Issue**: "Drawing file not found"
- **Fix**: Ensure the PDF was uploaded to Supabase Storage first

**Issue**: OCR returns low confidence
- **Fix**: Check PDF quality - ensure title blocks are clear and readable

---

## How It Works

### 1. PDF Upload Flow

```
User uploads PDF
    ↓
Saved to Supabase Storage (drawings bucket)
    ↓
Drawing file record created in database
    ↓
User clicks "Extract Sheets"
    ↓
Edge Function is called
```

### 2. Edge Function Process

```
1. Download PDF from storage
2. Split into individual pages using pdf-lib
3. For each page:
   a. Save as separate PDF
   b. Convert to base64
   c. Send to Claude Vision API
   d. Extract: Sheet Number, Title, Date
   e. Parse BLM ID from Sheet Number
   f. Link to module (if match found)
   g. Save to drawing_sheets table
4. Mark job as complete
```

### 3. Module Linking

```
Sheet Number: XS-B1L2M15-01
    ↓
Extract BLM ID: B1L2M15
    ↓
Query modules table: WHERE blm_id = 'B1L2M15'
    ↓
If found: Set linked_module_id
```

---

## Cost Estimation

### Claude API Costs

- **Model**: claude-3-5-sonnet-20241022
- **Cost**: ~$0.01-0.02 per sheet
- **Example**: 18-page PDF = ~$0.18-0.36

### Supabase Costs

- **Edge Functions**: Free tier includes 500K invocations/month
- **Storage**: Free tier includes 1GB
- **Database**: Free tier includes unlimited API requests

**Total for typical project**: < $5/month

---

## Troubleshooting

### Function Won't Deploy

1. Check for syntax errors in the code
2. Ensure all imports are valid
3. Try deploying a simple "Hello World" function first

### OCR Not Extracting Data

1. Check Claude API key is valid
2. Verify PDF is not password-protected
3. Ensure title blocks are clearly visible
4. Check function logs for Claude API errors

### Sheets Not Linking to Modules

1. Verify `auto_link_sheet_to_module` function exists in database
2. Check sheet number format (should contain BLM ID like B1L2M15)
3. Verify modules table has matching `blm_id` values
4. Check function logs for linking errors

---

## Next Steps

After successful deployment:

1. ✅ Test with a real shop drawing package
2. ✅ Verify OCR accuracy on title blocks
3. ✅ Check module linking works correctly
4. ✅ Test Sheet Browser filters with extracted data
5. ✅ Monitor function performance and costs

---

## Support

If you encounter issues:

1. Check Supabase function logs
2. Verify all database migrations are run
3. Ensure Claude API key is valid
4. Review the `docs/OCR_EXTRACTION_GUIDE.md` for detailed system documentation

---

## Summary

You've successfully deployed the OCR Edge Function! The system will now:

- ✅ Split multi-page PDFs into individual sheets
- ✅ Extract title block metadata (Sheet Number, Title, Date)
- ✅ Automatically link sheets to modules
- ✅ Enable intelligent searching and filtering in Sheet Browser

**Ready to test!** Upload a shop drawing package and watch the magic happen.
