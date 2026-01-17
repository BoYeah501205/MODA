-- Migration: Add activity logging and soft delete support for drawings
-- Run this in Supabase SQL Editor

-- Add soft delete column to drawings table
ALTER TABLE drawings 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add linked_module_id column for manual module linking
ALTER TABLE drawings 
ADD COLUMN IF NOT EXISTS linked_module_id UUID DEFAULT NULL;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_drawings_deleted_at ON drawings(deleted_at);

-- Create drawing_activity table for audit logging
CREATE TABLE IF NOT EXISTS drawing_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(50) NOT NULL, -- 'upload', 'rename', 'delete', 'restore', 'version_add', 'link'
    drawing_id UUID REFERENCES drawings(id) ON DELETE SET NULL,
    project_id UUID NOT NULL,
    user_name VARCHAR(255),
    user_id VARCHAR(255),
    details JSONB, -- Additional context (old name, new name, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for activity queries
CREATE INDEX IF NOT EXISTS idx_drawing_activity_drawing_id ON drawing_activity(drawing_id);
CREATE INDEX IF NOT EXISTS idx_drawing_activity_project_id ON drawing_activity(project_id);
CREATE INDEX IF NOT EXISTS idx_drawing_activity_created_at ON drawing_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drawing_activity_action ON drawing_activity(action);

-- Enable RLS on drawing_activity
ALTER TABLE drawing_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read activity logs
CREATE POLICY "Anyone can read drawing activity" ON drawing_activity
    FOR SELECT USING (true);

-- Policy: Anyone can insert activity logs
CREATE POLICY "Anyone can insert drawing activity" ON drawing_activity
    FOR INSERT WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE drawing_activity IS 'Audit log for drawing operations (upload, rename, delete, restore, version add)';
COMMENT ON COLUMN drawings.deleted_at IS 'Soft delete timestamp - NULL means not deleted';
COMMENT ON COLUMN drawings.linked_module_id IS 'Manual override for module linking (bypasses filename parsing)';
