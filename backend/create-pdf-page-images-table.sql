-- ============================================================================
-- PDF Page Images Table
-- Stores pre-rendered page images for fast mobile viewing
-- ============================================================================

-- Table to store page image references
CREATE TABLE IF NOT EXISTS pdf_page_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES drawing_versions(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    storage_path TEXT NOT NULL,  -- Path in Supabase Storage
    width INTEGER,               -- Image width in pixels
    height INTEGER,              -- Image height in pixels
    file_size INTEGER,           -- Image file size in bytes
    format TEXT DEFAULT 'webp',  -- Image format (webp, jpeg, png)
    quality TEXT DEFAULT 'preview', -- 'thumbnail' | 'preview' | 'full'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique page per version and quality level
    UNIQUE(version_id, page_number, quality)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_pdf_page_images_version ON pdf_page_images(version_id);
CREATE INDEX IF NOT EXISTS idx_pdf_page_images_drawing ON pdf_page_images(drawing_id);

-- Table to track image generation jobs
CREATE TABLE IF NOT EXISTS pdf_image_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
    version_id UUID NOT NULL REFERENCES drawing_versions(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
    total_pages INTEGER,
    processed_pages INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pdf_image_jobs_status ON pdf_image_jobs(status);
CREATE INDEX IF NOT EXISTS idx_pdf_image_jobs_version ON pdf_image_jobs(version_id);

-- RLS Policies
ALTER TABLE pdf_page_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_image_jobs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read page images
CREATE POLICY "Users can view page images" ON pdf_page_images
    FOR SELECT TO authenticated USING (true);

-- Allow service role to insert/update
CREATE POLICY "Service can manage page images" ON pdf_page_images
    FOR ALL TO service_role USING (true);

-- Allow authenticated users to read jobs
CREATE POLICY "Users can view image jobs" ON pdf_image_jobs
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to create jobs (trigger processing)
CREATE POLICY "Users can create image jobs" ON pdf_image_jobs
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow service role full access to jobs
CREATE POLICY "Service can manage image jobs" ON pdf_image_jobs
    FOR ALL TO service_role USING (true);

-- Function to check if page images exist for a drawing version
CREATE OR REPLACE FUNCTION check_page_images_exist(p_version_id UUID)
RETURNS TABLE (
    has_images BOOLEAN,
    page_count INTEGER,
    job_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(SELECT 1 FROM pdf_page_images WHERE version_id = p_version_id) as has_images,
        (SELECT COUNT(*)::INTEGER FROM pdf_page_images WHERE version_id = p_version_id) as page_count,
        (SELECT status FROM pdf_image_jobs WHERE version_id = p_version_id ORDER BY created_at DESC LIMIT 1) as job_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION check_page_images_exist TO authenticated;
