import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Process Permit Sheets Edge Function
 * 
 * Handles permit drawing packages with sheet-level version tracking.
 * Uses OCR to extract sheet numbers from title blocks for matching.
 * 
 * Actions:
 * - process: Split PDF and OCR each sheet, create version chain
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { packageId, action = 'process', pdfDownloadUrl } = await req.json();

    if (!packageId) {
      throw new Error('packageId is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('OCR_Reader') ?? '',
    });

    console.log(`[ProcessPermitSheets] Processing package: ${packageId}, action: ${action}`);

    // Get package metadata
    const { data: pkg, error: pkgError } = await supabaseClient
      .from('permit_packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (pkgError || !pkg) {
      throw new Error(`Package not found: ${pkgError?.message}`);
    }

    // Update status to processing
    await supabaseClient
      .from('permit_packages')
      .update({ ocr_status: 'processing' })
      .eq('id', packageId);

    console.log(`[ProcessPermitSheets] Package: ${pkg.package_name} v${pkg.package_version}`);

    try {
      // Download PDF
      let pdfBytes;

      if (pdfDownloadUrl) {
        console.log(`[ProcessPermitSheets] Using provided download URL`);
        const fileResponse = await fetch(pdfDownloadUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to download from URL: ${fileResponse.status}`);
        }
        const pdfBuffer = await fileResponse.arrayBuffer();
        pdfBytes = new Uint8Array(pdfBuffer);
      } else if (pkg.storage_path) {
        console.log(`[ProcessPermitSheets] Downloading from Supabase: ${pkg.storage_path}`);
        const { data: pdfData, error: downloadError } = await supabaseClient.storage
          .from('drawings')
          .download(pkg.storage_path);

        if (downloadError || !pdfData) {
          throw new Error(`Failed to download PDF: ${JSON.stringify(downloadError)}`);
        }

        const pdfBuffer = await pdfData.arrayBuffer();
        pdfBytes = new Uint8Array(pdfBuffer);
      } else {
        throw new Error('No storage_path or pdfDownloadUrl provided');
      }

      console.log(`[ProcessPermitSheets] Downloaded PDF, size: ${pdfBytes.length} bytes`);

      // Split PDF into pages
      const { PDFDocument } = await import('https://esm.sh/pdf-lib@1.17.1');

      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      } catch (loadError) {
        pdfDoc = await PDFDocument.load(pdfBytes, { 
          ignoreEncryption: true,
          updateMetadata: false 
        });
      }

      const totalPages = pdfDoc.getPageCount();
      console.log(`[ProcessPermitSheets] PDF has ${totalPages} pages`);

      // Update package with total sheets
      await supabaseClient
        .from('permit_packages')
        .update({ total_sheets: totalPages })
        .eq('id', packageId);

      const sheets = [];
      const startTime = Date.now();

      // Process each page
      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        const pageIndex = pageNum + 1;
        console.log(`[ProcessPermitSheets] Processing page ${pageIndex}/${totalPages}`);

        // Create single-page PDF
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageNum]);
        singlePagePdf.addPage(copiedPage);
        const singlePageBytes = await singlePagePdf.save();

        // Upload individual sheet to storage
        const sheetStoragePath = `permit-sheets/${pkg.project_id}/${pkg.discipline}/${packageId}/sheet_${pageIndex.toString().padStart(3, '0')}.pdf`;
        
        const { error: uploadError } = await supabaseClient.storage
          .from('drawings')
          .upload(sheetStoragePath, singlePageBytes, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (uploadError) {
          console.error(`[ProcessPermitSheets] Upload failed for page ${pageIndex}:`, uploadError);
        }

        // OCR the sheet for title block extraction
        let ocrResult = {
          sheet_number: null,
          sheet_title: null,
          revision: null,
          revision_date: null,
          drawn_by: null,
          checked_by: null,
          designed_by: null,
          job_number: null,
          discipline_code: null,
          discipline_name: null,
          confidence: null,
          raw_text: null
        };

        try {
          const base64Pdf = btoa(String.fromCharCode(...singlePageBytes));

          const message = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'document',
                    source: {
                      type: 'base64',
                      media_type: 'application/pdf',
                      data: base64Pdf,
                    },
                  },
                  {
                    type: 'text',
                    text: `Extract title block information from this PERMIT DRAWING sheet. Look for a title block (usually bottom-right corner) containing sheet identification.

COMMON PERMIT DRAWING TITLE BLOCK FORMAT:
┌─────────────────┬──────────────────┐
│ REVISION:       │ DATE:            │
│ A               │ 10/07/2025       │
├─────────────────┼──────────────────┤
│ DRAWN BY:       │ CHECKED BY:      │
│ BP              │ KR               │
├─────────────────┼──────────────────┤
│ DESIGNED BY:    │ JOB NUMBER:      │
│ AM              │ A24-082          │
├─────────────────┴──────────────────┤
│     STRUCTURAL COVER SHEET         │  ← Sheet title
├────────────────────────────────────┤
│           S0.01M                   │  ← Sheet number (PRIMARY KEY)
└────────────────────────────────────┘

SHEET NUMBER FORMATS:
- S0.01M, S1.01, S2.03 (Structural)
- A1.01, A2.01 (Architectural)
- M1.01, M2.01 (Mechanical)
- P1.01, P2.01 (Plumbing)
- E1.01, E2.01 (Electrical)
- FA1.01 (Fire Alarm)
- FS1.01 (Fire Sprinkler)

DISCIPLINE CODES (first letter(s)):
- S = Structural
- A = Architectural
- M = Mechanical
- P = Plumbing
- E = Electrical
- FA = Fire Alarm
- FS = Fire Sprinkler
- T = Title 24
- C = Civil

Return a JSON object with these exact fields:
{
  "sheet_number": "Sheet number exactly as shown (e.g., S0.01M)",
  "sheet_title": "Sheet title/description (e.g., STRUCTURAL COVER SHEET)",
  "revision": "Revision letter/number if present (e.g., A, B, 1, 2)",
  "revision_date": "Date in YYYY-MM-DD format (convert from MM/DD/YYYY)",
  "drawn_by": "Initials of person who drew (e.g., BP)",
  "checked_by": "Initials of checker (e.g., KR)",
  "designed_by": "Initials of designer (e.g., AM)",
  "job_number": "Job/project number (e.g., A24-082)",
  "discipline_code": "Discipline code from sheet number (e.g., S, A, M, P, E, FA)",
  "discipline_name": "Full discipline name (e.g., Structural, Mechanical)",
  "confidence": 0-100
}

Return ONLY the JSON object, no other text.`,
                  },
                ],
              },
            ],
          });

          const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
          console.log(`[ProcessPermitSheets] OCR response for page ${pageIndex}:`, responseText.substring(0, 200));

          // Parse JSON response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const extracted = JSON.parse(jsonMatch[0]);
            ocrResult = {
              sheet_number: extracted.sheet_number || null,
              sheet_title: extracted.sheet_title || null,
              revision: extracted.revision || null,
              revision_date: extracted.revision_date || null,
              drawn_by: extracted.drawn_by || null,
              checked_by: extracted.checked_by || null,
              designed_by: extracted.designed_by || null,
              job_number: extracted.job_number || null,
              discipline_code: extracted.discipline_code || null,
              discipline_name: extracted.discipline_name || null,
              confidence: extracted.confidence || null,
              raw_text: responseText
            };
          }
        } catch (ocrError: any) {
          console.error(`[ProcessPermitSheets] OCR failed for page ${pageIndex}:`, ocrError);
          ocrResult.raw_text = `OCR Error: ${ocrError?.message || ocrError}`;
        }

        // Insert sheet version record
        const { data: sheet, error: sheetError } = await supabaseClient
          .from('permit_sheet_versions')
          .insert({
            package_id: packageId,
            project_id: pkg.project_id,
            sheet_number: ocrResult.sheet_number || `Page ${pageIndex}`,
            sheet_title: ocrResult.sheet_title,
            revision: ocrResult.revision,
            revision_date: ocrResult.revision_date,
            drawn_by: ocrResult.drawn_by,
            checked_by: ocrResult.checked_by,
            designed_by: ocrResult.designed_by,
            discipline_code: ocrResult.discipline_code,
            discipline_name: ocrResult.discipline_name,
            page_number: pageIndex,
            storage_path: sheetStoragePath,
            file_size: singlePageBytes.length,
            ocr_confidence: ocrResult.confidence,
            ocr_raw_text: ocrResult.raw_text,
            ocr_metadata: ocrResult
          })
          .select()
          .single();

        if (sheetError) {
          console.error(`[ProcessPermitSheets] Failed to insert sheet ${pageIndex}:`, sheetError);
          continue;
        }

        // Process version chain (mark previous versions as superseded)
        if (sheet && ocrResult.sheet_number) {
          await supabaseClient.rpc('process_sheet_update', { p_new_sheet_id: sheet.id });
        }

        sheets.push(sheet);
      }

      // Update package as completed
      const processingTime = Date.now() - startTime;

      await supabaseClient
        .from('permit_packages')
        .update({
          ocr_status: 'completed',
          ocr_processed_at: new Date().toISOString(),
          total_sheets: totalPages
        })
        .eq('id', packageId);

      console.log(`[ProcessPermitSheets] Completed ${sheets.length} sheets in ${processingTime}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          package_id: packageId,
          total_sheets: totalPages,
          sheets_processed: sheets.length,
          processing_time_ms: processingTime,
          sheets: sheets
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } catch (processingError: any) {
      // Mark package as failed
      await supabaseClient
        .from('permit_packages')
        .update({
          ocr_status: 'failed',
          ocr_error: String(processingError?.message || processingError)
        })
        .eq('id', packageId);

      throw processingError;
    }

  } catch (error: any) {
    console.error('[ProcessPermitSheets] Error:', error);
    return new Response(
      JSON.stringify({
        error: String(error?.message || error),
        details: String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
