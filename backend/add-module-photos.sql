-- ============================================================================
-- MIGRATION: Add module_photos table for QA Photo Hub
-- Run this manually in the Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- TABLE: module_photos
-- Photos associated with a module and organized by QA category
-- ============================================================================
CREATE TABLE IF NOT EXISTS module_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    serial_number TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',

    sharepoint_file_id TEXT,
    sharepoint_url TEXT,
    sharepoint_path TEXT,
    thumbnail_url TEXT,

    -- Local storage fallback (base64 for offline mode)
    local_data TEXT,

    file_name TEXT NOT NULL,
    file_size INTEGER,
    caption TEXT,

    uploaded_by UUID REFERENCES profiles(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),

    sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_photos_module_id ON module_photos(module_id);
CREATE INDEX IF NOT EXISTS idx_module_photos_project_id ON module_photos(project_id);
CREATE INDEX IF NOT EXISTS idx_module_photos_serial ON module_photos(serial_number);

-- Enable Row Level Security
ALTER TABLE module_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view module photos"
    ON module_photos FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert module photos"
    ON module_photos FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can delete their own photos or admins can delete any"
    ON module_photos FOR DELETE TO authenticated
    USING (
        uploaded_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND dashboard_role = 'admin'
        )
    );

-- Trigger for updated_at (reuses the existing update_updated_at_column function)
CREATE TRIGGER IF NOT EXISTS update_module_photos_updated_at
    BEFORE UPDATE ON module_photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE module_photos;
