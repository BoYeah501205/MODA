-- Add SharePoint storage columns to drawing_versions table
-- Run this in Supabase SQL Editor

-- Add storage_type column to track where file is stored
ALTER TABLE drawing_versions 
ADD COLUMN IF NOT EXISTS storage_type TEXT DEFAULT 'supabase';

-- Add sharepoint_file_id column for SharePoint file reference
ALTER TABLE drawing_versions 
ADD COLUMN IF NOT EXISTS sharepoint_file_id TEXT;

-- Add index for faster lookups by SharePoint file ID
CREATE INDEX IF NOT EXISTS idx_drawing_versions_sharepoint_file_id 
ON drawing_versions(sharepoint_file_id) 
WHERE sharepoint_file_id IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN drawing_versions.storage_type IS 'Where the file is stored: supabase or sharepoint';
COMMENT ON COLUMN drawing_versions.sharepoint_file_id IS 'SharePoint file ID for files stored in SharePoint';
