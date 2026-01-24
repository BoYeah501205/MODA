import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { drawingFileId, action = 'split_and_ocr', pdfDownloadUrl } = await req.json();

    if (!drawingFileId) {
      throw new Error('drawingFileId is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('OCR_Reader') ?? '',
    });

    console.log(`[ProcessSheets] Processing drawing file: ${drawingFileId}, action: ${action}`);

    // Get drawing file metadata (table is 'drawings' not 'drawing_files')
    const { data: drawingFile, error: fileError } = await supabaseClient
      .from('drawings')
      .select('*')
      .eq('id', drawingFileId)
      .single();

    if (fileError || !drawingFile) {
      throw new Error(`Drawing file not found: ${fileError?.message}`);
    }

    // Get versions separately (avoids schema cache relationship issues)
    const { data: versions, error: versionsError } = await supabaseClient
      .from('drawing_versions')
      .select('*')
      .eq('drawing_id', drawingFileId)
      .order('version', { ascending: false });

    if (versionsError || !versions || versions.length === 0) {
      throw new Error(`No versions found: ${versionsError?.message}`);
    }

    // Get latest version
    const latestVersion = versions[0];

    console.log(`[ProcessSheets] Latest version: ${latestVersion.version}, path: ${latestVersion.storage_path}`);

    // Create extraction job
    const { data: job, error: jobError } = await supabaseClient
      .from('sheet_extraction_jobs')
      .insert({
        drawing_id: drawingFileId,
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(`Failed to create extraction job: ${jobError.message}`);
    }

    console.log(`[ProcessSheets] Created extraction job: ${job.id}`);

    try {
      // Download PDF from storage (handle both Supabase and SharePoint)
      let pdfBytes;
      const storagePath = latestVersion.storage_path;

      // If frontend provided a download URL (for SharePoint files), use it directly
      if (pdfDownloadUrl) {
        console.log(`[ProcessSheets] Using provided download URL from frontend`);
        const fileResponse = await fetch(pdfDownloadUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to download from provided URL: ${fileResponse.status}`);
        }
        const pdfBuffer = await fileResponse.arrayBuffer();
        pdfBytes = new Uint8Array(pdfBuffer);
        console.log(`[ProcessSheets] Downloaded PDF, size: ${pdfBytes.length} bytes`);
      } else {
        // Download from Supabase Storage (fallback for non-SharePoint files)
        console.log(`[ProcessSheets] Downloading from Supabase Storage: ${storagePath}`);
        const { data: pdfData, error: downloadError } = await supabaseClient.storage
          .from('drawings')
          .download(storagePath);

        if (downloadError || !pdfData) {
          throw new Error(`Failed to download PDF: ${JSON.stringify(downloadError)}`);
        }

        const pdfBuffer = await pdfData.arrayBuffer();
        pdfBytes = new Uint8Array(pdfBuffer);
        console.log(`[ProcessSheets] Downloaded PDF from Supabase, size: ${pdfBytes.length} bytes`);
      }

      // Use pdf-lib to split PDF into individual pages
      // Note: We'll use a dynamic import for pdf-lib
      const { PDFDocument } = await import('https://esm.sh/pdf-lib@1.17.1');

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const totalPages = pdfDoc.getPageCount();

      console.log(`[ProcessSheets] PDF has ${totalPages} pages`);

      // Update job with total sheets
      await supabaseClient
        .from('sheet_extraction_jobs')
        .update({ total_sheets: totalPages })
        .eq('id', job.id);

      const sheets = [];

      // Process each page
      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        const sheetNumber = pageNum + 1;
        console.log(`[ProcessSheets] Processing sheet ${sheetNumber}/${totalPages}`);

        // Create a new PDF with just this page
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageNum]);
        singlePagePdf.addPage(copiedPage);

        const singlePageBytes = await singlePagePdf.save();

        // NOTE: We do NOT upload individual sheet PDFs to storage
        // PDFs stay in SharePoint, we only store metadata in Supabase
        // This allows re-running OCR for different purposes (Wall IDs, MEP fixtures, etc.)

        // Perform OCR on the sheet using Claude Vision
        let ocrMetadata = {};
        let ocrConfidence = null;
        let parsedFields = {
          sheet_name: null,
          sheet_title: null,
          blm_type: null,
          discipline: null,
          scale: null,
          drawing_date: null,
          revision: null,
          drawn_by: null,
          checked_by: null,
        };

        try {
          // Convert PDF page to base64 for Claude
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
                    text: `Extract title block information from this shop drawing sheet. Look for a title block table (usually bottom-right) with these fields:

EXPECTED TITLE BLOCK FORMAT:
┌─────────────────┬──────────────────────────┐
│ SHEET NUMBER:   │ XE-B1L6M17-01            │  ← Format: XX-B#L#M##-## (discipline-building-level-module-sheet)
├─────────────────┼──────────────────────────┤
│ SHEET TITLE:    │ ELEC ENLG PLAN           │  ← Description of the sheet content
├─────────────────┼──────────────────────────┤
│ BLM (TYP):      │ B1L6M17                  │  ← Building-Level-Module identifier
├─────────────────┼──────────────────────────┤
│ SCALE:          │ As indicated             │  ← Drawing scale
├─────────────────┼──────────────────────────┤
│ DATE:           │ 01/08/2026               │  ← Drawing date
└─────────────────┴──────────────────────────┘

DISCIPLINE CODES (first 2 chars of sheet number):
- XE = Electrical, XP = Plumbing, XM = Mechanical
- XS = Structural, XA = Architectural, XF = Fire Protection

Return a JSON object with these exact fields:
{
  "sheet_number": "Full sheet number (e.g., XE-B1L6M17-01)",
  "sheet_title": "Sheet title/description (e.g., ELEC ENLG PLAN)",
  "blm_type": "BLM identifier (e.g., B1L6M17)",
  "scale": "Scale value (e.g., As indicated)",
  "date": "Date in YYYY-MM-DD format (convert from MM/DD/YYYY if needed)",
  "discipline": "Full discipline name based on code (Electrical, Plumbing, Mechanical, Structural, Architectural, Fire Protection)",
  "revision": "Revision if present, otherwise null",
  "confidence": 0-100
}

Return ONLY the JSON object, no other text.`,
                  },
                ],
              },
            ],
          });

          const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
          console.log(`[ProcessSheets] OCR response for sheet ${sheetNumber}:`, responseText);

          // Parse JSON response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const extracted = JSON.parse(jsonMatch[0]);
            ocrMetadata = extracted;
            ocrConfidence = extracted.confidence || null;

            // Map to parsed fields
            parsedFields = {
              sheet_name: extracted.sheet_number || null,
              sheet_title: extracted.sheet_title || null,
              blm_type: extracted.blm_type || null,
              discipline: extracted.discipline || null,
              scale: extracted.scale || null,
              drawing_date: extracted.date || null,
              revision: extracted.revision || null,
              drawn_by: null,
              checked_by: null,
            };
          }
        } catch (ocrError) {
          console.error(`[ProcessSheets] OCR failed for sheet ${sheetNumber}:`, ocrError);
          ocrMetadata = { error: ocrError.message };
        }

        // Insert sheet record (metadata only - no individual PDF storage)
        // storage_path references the parent drawing's SharePoint path + page number
        const sheetStoragePath = `${storagePath}#page=${sheetNumber}`;
        
        const { data: sheet, error: sheetError } = await supabaseClient
          .from('drawing_sheets')
          .insert({
            drawing_id: drawingFileId,
            project_id: drawingFile.project_id,
            sheet_number: sheetNumber,
            sheet_name: parsedFields.sheet_name,
            sheet_title: parsedFields.sheet_title,
            storage_path: sheetStoragePath,
            file_size: singlePageBytes.length,
            ocr_metadata: ocrMetadata,
            ocr_confidence: ocrConfidence,
            ocr_processed_at: new Date().toISOString(),
            blm_type: parsedFields.blm_type,
            discipline: parsedFields.discipline,
            scale: parsedFields.scale,
            drawing_date: parsedFields.drawing_date,
            revision: parsedFields.revision,
            drawn_by: parsedFields.drawn_by,
            checked_by: parsedFields.checked_by,
          })
          .select()
          .single();

        if (sheetError) {
          console.error(`[ProcessSheets] Failed to insert sheet ${sheetNumber}:`, sheetError);
          continue;
        }

        // Auto-link to module by extracting BLM ID from sheet number
        // Example: XS-B1L2M15-01 -> B1L2M15
        await supabaseClient.rpc('auto_link_sheet_to_module', {
          p_sheet_id: sheet.id,
          p_project_id: drawingFile.project_id,
          p_sheet_number: parsedFields.sheet_name || '',
        });

        sheets.push(sheet);

        // Update job progress
        await supabaseClient
          .from('sheet_extraction_jobs')
          .update({ processed_sheets: sheetNumber })
          .eq('id', job.id);
      }

      // Mark job as completed
      const completedAt = new Date();
      const processingTime = completedAt.getTime() - new Date(job.started_at).getTime();

      await supabaseClient
        .from('sheet_extraction_jobs')
        .update({
          status: 'completed',
          completed_at: completedAt.toISOString(),
          processing_time_ms: processingTime,
        })
        .eq('id', job.id);

      console.log(`[ProcessSheets] Completed processing ${sheets.length} sheets in ${processingTime}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          job_id: job.id,
          total_sheets: totalPages,
          processed_sheets: sheets.length,
          sheets: sheets,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (processingError) {
      // Mark job as failed
      await supabaseClient
        .from('sheet_extraction_jobs')
        .update({
          status: 'failed',
          error_message: String(processingError),
          error_details: { stack: String(processingError) },
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      throw processingError;
    }
  } catch (error) {
    console.error('[ProcessSheets] Error:', error);
    return new Response(
      JSON.stringify({
        error: String(error),
        details: String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
