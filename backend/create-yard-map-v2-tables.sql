-- ============================================
-- MODA Yard Map v2.0 - Database Schema
-- ============================================
-- Complete schema for integrated Transport → Yard Map workflow
-- Run this in Supabase SQL Editor
-- 
-- NOTE: This migration adds new tables and columns to support:
-- - Transport status tracking (ready_for_yard → in_yard → shipped → delivered)
-- - Module placement history/audit trail
-- - Real-time sync between Transport Board and Yard Map

-- ============================================
-- 1. TRANSPORT_STATUS TABLE (NEW)
-- ============================================
-- Tracks module status through transport workflow

CREATE TABLE IF NOT EXISTS transport_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_blm TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('ready_for_yard', 'in_yard', 'shipped', 'delivered')),
  yard_map_id UUID REFERENCES yard_maps(id) ON DELETE SET NULL,
  placed_in_yard_at TIMESTAMP WITH TIME ZONE,
  marked_shipped_at TIMESTAMP WITH TIME ZONE,
  removed_from_yard_at TIMESTAMP WITH TIME ZONE,
  kept_after_shipped BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for transport_status
CREATE INDEX IF NOT EXISTS idx_transport_status_blm ON transport_status(module_blm);
CREATE INDEX IF NOT EXISTS idx_transport_status_status ON transport_status(status);
CREATE INDEX IF NOT EXISTS idx_transport_status_yard ON transport_status(yard_map_id);

-- Trigger for updated_at (create function if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_transport_status_updated_at ON transport_status;
CREATE TRIGGER update_transport_status_updated_at
  BEFORE UPDATE ON transport_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. YARD_MAPS TABLE (UPDATE IF EXISTS)
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

CREATE INDEX IF NOT EXISTS idx_yard_maps_yard_type ON yard_maps(yard_type);
CREATE INDEX IF NOT EXISTS idx_yard_maps_name ON yard_maps(name);

DROP TRIGGER IF EXISTS update_yard_maps_updated_at ON yard_maps;
CREATE TRIGGER update_yard_maps_updated_at
  BEFORE UPDATE ON yard_maps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. YARD_MODULES TABLE (ADD NEW COLUMNS)
-- ============================================
-- Stores module placements on yard maps
-- Adding new columns for v2.0 workflow

-- Add new columns to existing table (safe - won't fail if they exist)
DO $$ 
BEGIN
  -- Add transport_status_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'yard_modules' AND column_name = 'transport_status_id') THEN
    ALTER TABLE yard_modules ADD COLUMN transport_status_id UUID REFERENCES transport_status(id) ON DELETE SET NULL;
  END IF;
  
  -- Add status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'yard_modules' AND column_name = 'status') THEN
    ALTER TABLE yard_modules ADD COLUMN status TEXT DEFAULT 'active' CHECK (status IN ('active', 'shipped_pending', 'shipped_kept', 'removed'));
  END IF;
  
  -- Add placed_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'yard_modules' AND column_name = 'placed_at') THEN
    ALTER TABLE yard_modules ADD COLUMN placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  -- Add shipped_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'yard_modules' AND column_name = 'shipped_at') THEN
    ALTER TABLE yard_modules ADD COLUMN shipped_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add removed_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'yard_modules' AND column_name = 'removed_at') THEN
    ALTER TABLE yard_modules ADD COLUMN removed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create table if it doesn't exist at all
CREATE TABLE IF NOT EXISTS yard_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  yard_map_id UUID NOT NULL REFERENCES yard_maps(id) ON DELETE CASCADE,
  transport_status_id UUID REFERENCES transport_status(id) ON DELETE SET NULL,
  blm TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  color TEXT NOT NULL,
  x NUMERIC NOT NULL,
  y NUMERIC NOT NULL,
  width NUMERIC NOT NULL,
  height NUMERIC NOT NULL,
  rotation NUMERIC DEFAULT 0,
  text_size INTEGER DEFAULT 14,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'shipped_pending', 'shipped_kept', 'removed')),
  placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shipped_at TIMESTAMP WITH TIME ZONE,
  removed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for yard_modules
CREATE INDEX IF NOT EXISTS idx_yard_modules_yard_map ON yard_modules(yard_map_id);
CREATE INDEX IF NOT EXISTS idx_yard_modules_blm ON yard_modules(blm);
CREATE INDEX IF NOT EXISTS idx_yard_modules_status ON yard_modules(status);
CREATE INDEX IF NOT EXISTS idx_yard_modules_abbreviation ON yard_modules(abbreviation);
CREATE INDEX IF NOT EXISTS idx_yard_modules_transport ON yard_modules(transport_status_id);

DROP TRIGGER IF EXISTS update_yard_modules_updated_at ON yard_modules;
CREATE TRIGGER update_yard_modules_updated_at
  BEFORE UPDATE ON yard_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. YARD_MODULE_HISTORY TABLE (NEW)
-- ============================================
-- Tracks all module actions for audit trail

CREATE TABLE IF NOT EXISTS yard_module_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_blm TEXT NOT NULL,
  yard_map_id UUID REFERENCES yard_maps(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('placed', 'moved', 'rotated', 'resized', 'shipped', 'removed', 'transferred', 'modified')),
  x NUMERIC,
  y NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for yard_module_history
CREATE INDEX IF NOT EXISTS idx_yard_history_blm ON yard_module_history(module_blm);
CREATE INDEX IF NOT EXISTS idx_yard_history_yard ON yard_module_history(yard_map_id);
CREATE INDEX IF NOT EXISTS idx_yard_history_date ON yard_module_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_yard_history_action ON yard_module_history(action);

-- ============================================
-- 5. YARD_SETTINGS TABLE (UPDATE IF EXISTS)
-- ============================================
-- Global settings for yard map tool

CREATE TABLE IF NOT EXISTS yard_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  default_font_size INTEGER DEFAULT 14,
  default_yard_map_id UUID REFERENCES yard_maps(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

DROP TRIGGER IF EXISTS update_yard_settings_updated_at ON yard_settings;
CREATE TRIGGER update_yard_settings_updated_at
  BEFORE UPDATE ON yard_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings row
INSERT INTO yard_settings (id, default_font_size)
VALUES (1, 14)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function: Get modules by BLM
CREATE OR REPLACE FUNCTION get_modules_by_blm(blm_number TEXT)
RETURNS TABLE (
  id UUID,
  yard_map_name TEXT,
  abbreviation TEXT,
  color TEXT,
  x NUMERIC,
  y NUMERIC,
  rotation NUMERIC,
  status TEXT,
  placed_at TIMESTAMP WITH TIME ZONE
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
    ym.rotation,
    ym.status,
    ym.placed_at
  FROM yard_modules ym
  JOIN yard_maps ymap ON ym.yard_map_id = ymap.id
  WHERE ym.blm = blm_number
  ORDER BY ym.placed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get module count by yard
CREATE OR REPLACE FUNCTION get_module_count_by_yard()
RETURNS TABLE (
  yard_map_id UUID,
  yard_map_name TEXT,
  active_count BIGINT,
  shipped_kept_count BIGINT,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ymap.id as yard_map_id,
    ymap.name as yard_map_name,
    COUNT(ym.id) FILTER (WHERE ym.status = 'active') as active_count,
    COUNT(ym.id) FILTER (WHERE ym.status = 'shipped_kept') as shipped_kept_count,
    COUNT(ym.id) as total_count
  FROM yard_maps ymap
  LEFT JOIN yard_modules ym ON ymap.id = ym.yard_map_id
  GROUP BY ymap.id, ymap.name
  ORDER BY ymap.name;
END;
$$ LANGUAGE plpgsql;

-- Function: Get module count by project
CREATE OR REPLACE FUNCTION get_module_count_by_project(p_yard_map_id UUID)
RETURNS TABLE (
  abbreviation TEXT,
  active_count BIGINT,
  shipped_kept_count BIGINT,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ym.abbreviation,
    COUNT(*) FILTER (WHERE ym.status = 'active') as active_count,
    COUNT(*) FILTER (WHERE ym.status = 'shipped_kept') as shipped_kept_count,
    COUNT(*) as total_count
  FROM yard_modules ym
  WHERE ym.yard_map_id = p_yard_map_id
  GROUP BY ym.abbreviation
  ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get ready-for-yard queue
CREATE OR REPLACE FUNCTION get_ready_for_yard_queue()
RETURNS TABLE (
  id UUID,
  module_blm TEXT,
  status TEXT,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ts.id,
    ts.module_blm,
    ts.status,
    ts.updated_at
  FROM transport_status ts
  WHERE ts.status = 'ready_for_yard'
  ORDER BY ts.updated_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function: Mark module as shipped (with history)
CREATE OR REPLACE FUNCTION mark_module_shipped(
  p_module_blm TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Update transport status
  UPDATE transport_status
  SET 
    status = 'shipped',
    marked_shipped_at = NOW(),
    updated_at = NOW()
  WHERE module_blm = p_module_blm;
  
  -- Log to history
  INSERT INTO yard_module_history (
    module_blm,
    yard_map_id,
    action,
    notes,
    created_by
  )
  SELECT 
    p_module_blm,
    yard_map_id,
    'shipped',
    'Module marked as shipped',
    p_user_id
  FROM yard_modules
  WHERE blm = p_module_blm;
END;
$$ LANGUAGE plpgsql;

-- Function: Remove module from yard (with history)
CREATE OR REPLACE FUNCTION remove_module_from_yard(
  p_module_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_blm TEXT;
  v_yard_map_id UUID;
BEGIN
  -- Get module details
  SELECT blm, yard_map_id INTO v_blm, v_yard_map_id
  FROM yard_modules
  WHERE id = p_module_id;
  
  -- Update module status
  UPDATE yard_modules
  SET 
    status = 'removed',
    removed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_module_id;
  
  -- Update transport status
  UPDATE transport_status
  SET 
    removed_from_yard_at = NOW(),
    updated_at = NOW()
  WHERE module_blm = v_blm;
  
  -- Log to history
  INSERT INTO yard_module_history (
    module_blm,
    yard_map_id,
    action,
    notes,
    created_by
  )
  VALUES (
    v_blm,
    v_yard_map_id,
    'removed',
    'Module removed from yard map',
    p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. ENABLE REALTIME (Required for live updates)
-- ============================================
-- Run these to enable realtime on the tables

ALTER PUBLICATION supabase_realtime ADD TABLE transport_status;
ALTER PUBLICATION supabase_realtime ADD TABLE yard_modules;
ALTER PUBLICATION supabase_realtime ADD TABLE yard_module_history;

-- ============================================
-- 8. VERIFICATION QUERIES
-- ============================================
-- Run these to verify schema is correct

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('transport_status', 'yard_maps', 'yard_modules', 'yard_module_history', 'yard_settings')
ORDER BY table_name;

-- Check all indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('transport_status', 'yard_maps', 'yard_modules', 'yard_module_history')
ORDER BY tablename, indexname;

-- Verify settings row exists
SELECT * FROM yard_settings;

-- ============================================
-- SCHEMA COMPLETE
-- ============================================
