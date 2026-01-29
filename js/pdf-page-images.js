// ============================================================================
// PDF Page Images Service
// Manages pre-rendered page images for fast mobile PDF viewing
// ============================================================================

window.MODA_PDF_IMAGES = (function() {
    'use strict';

    const getSupabase = () => window.MODA_SUPABASE?.client;

    // Check if page images exist for a drawing version
    async function checkImagesExist(versionId) {
        const supabase = getSupabase();
        if (!supabase) return { hasImages: false, pageCount: 0, jobStatus: null };

        try {
            const { data, error } = await supabase
                .rpc('check_page_images_exist', { p_version_id: versionId });

            if (error) {
                console.error('[PdfImages] Error checking images:', error);
                return { hasImages: false, pageCount: 0, jobStatus: null };
            }

            const result = data?.[0] || {};
            return {
                hasImages: result.has_images || false,
                pageCount: result.page_count || 0,
                jobStatus: result.job_status || null
            };
        } catch (err) {
            console.error('[PdfImages] Error:', err);
            return { hasImages: false, pageCount: 0, jobStatus: null };
        }
    }

    // Get all page images for a version
    async function getPageImages(versionId) {
        const supabase = getSupabase();
        if (!supabase) return [];

        try {
            const { data, error } = await supabase
                .from('pdf_page_images')
                .select('*')
                .eq('version_id', versionId)
                .order('page_number', { ascending: true });

            if (error) {
                console.error('[PdfImages] Error fetching images:', error);
                return [];
            }

            return data || [];
        } catch (err) {
            console.error('[PdfImages] Error:', err);
            return [];
        }
    }

    // Get signed URL for a page image
    async function getPageImageUrl(storagePath) {
        const supabase = getSupabase();
        if (!supabase) return null;

        try {
            const { data, error } = await supabase.storage
                .from('drawings')
                .createSignedUrl(storagePath, 3600); // 1 hour expiry

            if (error) {
                console.error('[PdfImages] Error getting signed URL:', error);
                return null;
            }

            return data?.signedUrl || null;
        } catch (err) {
            console.error('[PdfImages] Error:', err);
            return null;
        }
    }

    // Trigger image generation for a drawing version
    async function triggerGeneration(drawingId, versionId, pdfDownloadUrl) {
        const supabase = getSupabase();
        if (!supabase) {
            console.error('[PdfImages] Supabase not available');
            return { success: false, error: 'Supabase not available' };
        }

        try {
            console.log(`[PdfImages] Triggering generation for drawing ${drawingId}, version ${versionId}`);

            const { data, error } = await supabase.functions.invoke('generate-pdf-images', {
                body: {
                    drawingId,
                    versionId,
                    pdfDownloadUrl
                }
            });

            if (error) {
                console.error('[PdfImages] Generation error:', error);
                return { success: false, error: error.message };
            }

            console.log('[PdfImages] Generation triggered:', data);
            return { success: true, ...data };
        } catch (err) {
            console.error('[PdfImages] Error:', err);
            return { success: false, error: err.message };
        }
    }

    // Check job status
    async function getJobStatus(versionId) {
        const supabase = getSupabase();
        if (!supabase) return null;

        try {
            const { data, error } = await supabase
                .from('pdf_image_jobs')
                .select('*')
                .eq('version_id', versionId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
                console.error('[PdfImages] Error fetching job:', error);
                return null;
            }

            return data || null;
        } catch (err) {
            console.error('[PdfImages] Error:', err);
            return null;
        }
    }

    // Poll for job completion
    async function waitForCompletion(versionId, maxWaitMs = 120000, pollIntervalMs = 2000) {
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitMs) {
            const job = await getJobStatus(versionId);

            if (!job) {
                await new Promise(r => setTimeout(r, pollIntervalMs));
                continue;
            }

            if (job.status === 'completed') {
                return { success: true, job };
            }

            if (job.status === 'failed') {
                return { success: false, error: job.error_message, job };
            }

            // Still processing
            await new Promise(r => setTimeout(r, pollIntervalMs));
        }

        return { success: false, error: 'Timeout waiting for image generation' };
    }

    // Main function: Get page images, triggering generation if needed
    async function getOrGeneratePageImages(drawingId, versionId, pdfDownloadUrl) {
        // First check if images already exist
        const status = await checkImagesExist(versionId);

        if (status.hasImages && status.pageCount > 0) {
            console.log(`[PdfImages] Found ${status.pageCount} existing page images`);
            return {
                ready: true,
                images: await getPageImages(versionId)
            };
        }

        // Check if generation is already in progress
        if (status.jobStatus === 'processing' || status.jobStatus === 'pending') {
            console.log('[PdfImages] Generation already in progress, waiting...');
            const result = await waitForCompletion(versionId);
            if (result.success) {
                return {
                    ready: true,
                    images: await getPageImages(versionId)
                };
            }
            return { ready: false, error: result.error, generating: false };
        }

        // Trigger generation
        console.log('[PdfImages] No images found, triggering generation...');
        const triggerResult = await triggerGeneration(drawingId, versionId, pdfDownloadUrl);

        if (!triggerResult.success) {
            return { ready: false, error: triggerResult.error, generating: false };
        }

        // If cached (images already existed), return them
        if (triggerResult.cached) {
            return {
                ready: true,
                images: await getPageImages(versionId)
            };
        }

        // Return immediately - images are generating in background
        // Caller can poll or show fallback
        return {
            ready: false,
            generating: true,
            jobId: triggerResult.job_id,
            totalPages: triggerResult.total_pages
        };
    }

    return {
        checkImagesExist,
        getPageImages,
        getPageImageUrl,
        triggerGeneration,
        getJobStatus,
        waitForCompletion,
        getOrGeneratePageImages
    };
})();

console.log('[PdfImages] PDF Page Images service loaded');
