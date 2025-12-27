-- ============================================
-- MODA Yard Map - Database Schema Migration
-- ============================================
-- Run this script in Supabase SQL Editor
-- Creates all required tables and indexes

-- ============================================
-- 1. YARD_MAPS TABLE
-- ============================================
-- Stores yard map PDFs and metadata

CREATE TABLE IF NOT EXISTS yard_maps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  yard_type TEXT NOT NULL,
  pdf_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for yard_maps
CREATE INDEX IF NOT EXISTS idx_yard_maps_yard_type ON yard_maps(yard_type);
CREATE INDEX IF NOT EXISTS idx_yard_maps_name ON yard_maps(name);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_yard_maps_updated_at
  BEFORE UPDATE ON yard_maps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. YARD_MODULES TABLE
-- ============================================
-- Stores module placements on yard maps

CREATE TABLE IF NOT EXISTS yard_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  yard_map_id UUID NOT NULL REFERENCES yard_maps(id) ON DELETE CASCADE,
  blm TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  color TEXT NOT NULL,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  rotation NUMERIC DEFAULT 0,
  text_size INTEGER DEFAULT 14,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for yard_modules
CREATE INDEX IF NOT EXISTS idx_yard_modules_yard_map_id ON yard_modules(yard_map_id);
CREATE INDEX IF NOT EXISTS idx_yard_modules_blm ON yard_modules(blm);
CREATE INDEX IF NOT EXISTS idx_yard_modules_abbreviation ON yard_modules(abbreviation);

-- Add trigger to update updated_at
CREATE TRIGGER update_yard_modules_updated_at
  BEFORE UPDATE ON yard_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. YARD_SETTINGS TABLE
-- ============================================
-- Global settings for yard map tool
-- Note: This table enforces a single row

CREATE TABLE IF NOT EXISTS yard_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  default_font_size INTEGER DEFAULT 14,
  default_yard_map_id UUID REFERENCES yard_maps(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Add trigger to update updated_at
CREATE TRIGGER update_yard_settings_updated_at
  BEFORE UPDATE ON yard_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial settings row
INSERT INTO yard_settings (id, default_font_size)
VALUES (1, 14)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. ROW LEVEL SECURITY (OPTIONAL)
-- ============================================
-- Uncomment if using RLS for multi-tenant setup

-- Enable RLS on all tables
-- ALTER TABLE yard_maps ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE yard_modules ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE yard_settings ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read yard maps
-- CREATE POLICY "Users can read yard maps"
--   ON yard_maps FOR SELECT
--   TO authenticated
--   USING (true);

-- Policy: All authenticated users can create yard maps
-- CREATE POLICY "Users can create yard maps"
--   ON yard_maps FOR INSERT
--   TO authenticated
--   WITH CHECK (true);

-- Policy: All authenticated users can update yard maps
-- CREATE POLICY "Users can update yard maps"
--   ON yard_maps FOR UPDATE
--   TO authenticated
--   USING (true);

-- Policy: All authenticated users can delete yard maps
-- CREATE POLICY "Users can delete yard maps"
--   ON yard_maps FOR DELETE
--   TO authenticated
--   USING (true);

-- Policy: All authenticated users can manage yard modules
-- CREATE POLICY "Users can manage yard modules"
--   ON yard_modules FOR ALL
--   TO authenticated
--   USING (true);

-- Policy: All authenticated users can read settings
-- CREATE POLICY "Users can read settings"
--   ON yard_settings FOR SELECT
--   TO authenticated
--   USING (true);

-- Policy: All authenticated users can update settings
-- CREATE POLICY "Users can update settings"
--   ON yard_settings FOR UPDATE
--   TO authenticated
--   USING (true);

-- ============================================
-- 5. HELPER FUNCTIONS (OPTIONAL)
-- ============================================

-- Function to get modules by BLM number
CREATE OR REPLACE FUNCTION get_modules_by_blm(blm_number TEXT)
RETURNS TABLE (
  id UUID,
  yard_map_name TEXT,
  abbreviation TEXT,
  color TEXT,
  x NUMERIC,
  y NUMERIC,
  rotation NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ym.id,
    ymap.name as yard_map_name,
    ym.abbreviation,
    ym.color,
    ym.x,
    ym.y,
    ym.rotation
  FROM yard_modules ym
  JOIN yard_maps ymap ON ym.yard_map_id = ymap.id
  WHERE ym.blm = blm_number
  ORDER BY ym.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get module count by yard map
CREATE OR REPLACE FUNCTION get_module_count_by_yard()
RETURNS TABLE (
  yard_map_id UUID,
  yard_map_name TEXT,
  module_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ymap.id as yard_map_id,
    ymap.name as yard_map_name,
    COUNT(ym.id) as module_count
  FROM yard_maps ymap
  LEFT JOIN yard_modules ym ON ymap.id = ym.yard_map_id
  GROUP BY ymap.id, ymap.name
  ORDER BY ymap.name;
END;
$$ LANGUAGE plpgsql;

-- Function to delete old yard modules (cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_yard_modules(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM yard_modules
  WHERE updated_at < NOW() - (days_old || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. INITIAL DATA (OPTIONAL)
-- ============================================
-- Add a sample yard map for testing
-- Remove this section in production

-- INSERT INTO yard_maps (name, yard_type, pdf_data)
-- VALUES (
--   'Front Yard - Sample',
--   'front',
--   'data:application/pdf;base64,<your_base64_pdf_here>'
-- );

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the schema was created correctly

-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('yard_maps', 'yard_modules', 'yard_settings');

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('yard_maps', 'yard_modules', 'yard_settings');

-- Check settings row exists
SELECT * FROM yard_settings;

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- Uncomment to drop all tables and start over

-- DROP TABLE IF EXISTS yard_modules CASCADE;
-- DROP TABLE IF EXISTS yard_maps CASCADE;
-- DROP TABLE IF EXISTS yard_settings CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
-- DROP FUNCTION IF EXISTS get_modules_by_blm(TEXT);
-- DROP FUNCTION IF EXISTS get_module_count_by_yard();
-- DROP FUNCTION IF EXISTS cleanup_old_yard_modules(INTEGER);
