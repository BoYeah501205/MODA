import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { drawingId, versionId, pdfDownloadUrl } = await req.json();

    if (!drawingId || !versionId) {
      throw new Error('drawingId and versionId are required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`[GeneratePdfImages] Processing drawing: ${drawingId}, version: ${versionId}`);

    // Check if images already exist for this version
    const { data: existingImages } = await supabaseClient
      .from('pdf_page_images')
      .select('id')
      .eq('version_id', versionId)
      .limit(1);

    if (existingImages && existingImages.length > 0) {
      console.log(`[GeneratePdfImages] Images already exist for version ${versionId}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Images already exist', cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if there's already a job in progress
    const { data: existingJob } = await supabaseClient
      .from('pdf_image_jobs')
      .select('*')
      .eq('version_id', versionId)
      .in('status', ['pending', 'processing'])
      .limit(1);

    if (existingJob && existingJob.length > 0) {
      console.log(`[GeneratePdfImages] Job already in progress for version ${versionId}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Job already in progress', job_id: existingJob[0].id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get version info
    const { data: version, error: versionError } = await supabaseClient
      .from('drawing_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (versionError || !version) {
      throw new Error(`Version not found: ${versionError?.message}`);
    }

    // Create job record
    const { data: job, error: jobError } = await supabaseClient
      .from('pdf_image_jobs')
      .insert({
        drawing_id: drawingId,
        version_id: versionId,
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) {
      throw new Error(`Failed to create job: ${jobError.message}`);
    }

    console.log(`[GeneratePdfImages] Created job: ${job.id}`);

    try {
      // Download PDF
      let pdfBytes: Uint8Array;

      if (pdfDownloadUrl) {
        console.log(`[GeneratePdfImages] Downloading from provided URL`);
        const response = await fetch(pdfDownloadUrl);
        if (!response.ok) {
          throw new Error(`Failed to download PDF: ${response.status}`);
        }
        pdfBytes = new Uint8Array(await response.arrayBuffer());
      } else {
        console.log(`[GeneratePdfImages] Downloading from Supabase Storage: ${version.storage_path}`);
        const { data: pdfData, error: downloadError } = await supabaseClient.storage
          .from('drawings')
          .download(version.storage_path);

        if (downloadError || !pdfData) {
          throw new Error(`Failed to download PDF: ${downloadError?.message}`);
        }
        pdfBytes = new Uint8Array(await pdfData.arrayBuffer());
      }

      console.log(`[GeneratePdfImages] Downloaded PDF, size: ${pdfBytes.length} bytes`);

      // Use pdf-lib to get page count and dimensions
      const { PDFDocument } = await import('https://esm.sh/pdf-lib@1.17.1');
      
      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      } catch {
        pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, updateMetadata: false });
      }

      const totalPages = pdfDoc.getPageCount();
      console.log(`[GeneratePdfImages] PDF has ${totalPages} pages`);

      // Update job with total pages
      await supabaseClient
        .from('pdf_image_jobs')
        .update({ total_pages: totalPages })
        .eq('id', job.id);

      // Use pdf2pic alternative: pdfjs-dist for rendering
      // Since Deno doesn't have canvas natively, we'll use a different approach:
      // Convert each page to a standalone PDF and use an external service or
      // store the single-page PDFs for client-side rendering
      
      // For now, we'll create lightweight single-page PDFs that load faster
      // The client can render these individually
      const pageImages = [];

      for (let pageNum = 0; pageNum < totalPages; pageNum++) {
        const pageIndex = pageNum + 1;
        console.log(`[GeneratePdfImages] Processing page ${pageIndex}/${totalPages}`);

        // Create single-page PDF
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageNum]);
        singlePagePdf.addPage(copiedPage);

        // Get page dimensions
        const page = pdfDoc.getPage(pageNum);
        const { width, height } = page.getSize();

        const singlePageBytes = await singlePagePdf.save();

        // Upload to Supabase Storage
        const storagePath = `page-images/${drawingId}/${versionId}/page-${pageIndex.toString().padStart(3, '0')}.pdf`;
        
        const { error: uploadError } = await supabaseClient.storage
          .from('drawings')
          .upload(storagePath, singlePageBytes, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadError) {
          console.error(`[GeneratePdfImages] Failed to upload page ${pageIndex}:`, uploadError);
          continue;
        }

        // Insert page record
        const { data: pageImage, error: insertError } = await supabaseClient
          .from('pdf_page_images')
          .insert({
            drawing_id: drawingId,
            version_id: versionId,
            page_number: pageIndex,
            storage_path: storagePath,
            width: Math.round(width),
            height: Math.round(height),
            file_size: singlePageBytes.length,
            format: 'pdf',  // Single-page PDF for now
            quality: 'preview',
          })
          .select()
          .single();

        if (insertError) {
          console.error(`[GeneratePdfImages] Failed to insert page record:`, insertError);
          continue;
        }

        pageImages.push(pageImage);

        // Update progress
        await supabaseClient
          .from('pdf_image_jobs')
          .update({ processed_pages: pageIndex })
          .eq('id', job.id);
      }

      // Mark job as completed
      await supabaseClient
        .from('pdf_image_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      console.log(`[GeneratePdfImages] Completed processing ${pageImages.length} pages`);

      return new Response(
        JSON.stringify({
          success: true,
          job_id: job.id,
          total_pages: totalPages,
          processed_pages: pageImages.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } catch (processingError) {
      // Mark job as failed
      await supabaseClient
        .from('pdf_image_jobs')
        .update({
          status: 'failed',
          error_message: String(processingError),
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      throw processingError;
    }

  } catch (error) {
    console.error('[GeneratePdfImages] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
