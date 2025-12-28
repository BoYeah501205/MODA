-- Heat Map Matrix Tables for Labor Forecasting Analytics
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. DIFFICULTY INDICATORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS difficulty_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_easier BOOLEAN DEFAULT false,
  affects_all_stations BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE difficulty_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "difficulty_indicators_select" ON difficulty_indicators
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "difficulty_indicators_admin" ON difficulty_indicators
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.dashboard_role IN ('admin', 'production_management')
    )
  );

-- ============================================
-- 2. PROJECT HEAT MAPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_heat_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  difficulty_indicator_id UUID REFERENCES difficulty_indicators(id) ON DELETE CASCADE,
  station_id TEXT NOT NULL,
  difficulty_category TEXT DEFAULT 'average' 
    CHECK (difficulty_category IN ('easy', 'average', 'medium', 'hard', 'very_hard')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, difficulty_indicator_id, station_id)
);

ALTER TABLE project_heat_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_heat_maps_select" ON project_heat_maps
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "project_heat_maps_modify" ON project_heat_maps
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.dashboard_role IN ('admin', 'production_management')
    )
  );

CREATE INDEX IF NOT EXISTS idx_project_heat_maps_project ON project_heat_maps(project_id);

-- ============================================
-- 3. MODULE DIFFICULTY ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS module_difficulty_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  difficulty_indicator_id UUID REFERENCES difficulty_indicators(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, project_id, difficulty_indicator_id)
);

ALTER TABLE module_difficulty_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_difficulty_assignments_select" ON module_difficulty_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "module_difficulty_assignments_modify" ON module_difficulty_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.dashboard_role IN ('admin', 'production_management')
    )
  );

CREATE INDEX IF NOT EXISTS idx_module_difficulty_module ON module_difficulty_assignments(module_id, project_id);
CREATE INDEX IF NOT EXISTS idx_module_difficulty_project ON module_difficulty_assignments(project_id);

-- ============================================
-- 4. SEED DATA - DIFFICULTY INDICATORS
-- ============================================
INSERT INTO difficulty_indicators (name, description, is_easier, affects_all_stations, display_order)
VALUES 
  ('Sidewall', 'Adds difficulty to Mezzanine, Wall Set, Exteriors', false, false, 1),
  ('Stair', 'Adds difficulty to Automation, Mezzanine, Wall Set, Exteriors', false, false, 2),
  ('3HR-Wall', 'Adds difficulty to Exteriors and Drywall-BackPanel', false, false, 3),
  ('Short', 'Easier for ALL departments', true, true, 4),
  ('Dbl Studio', 'Adds difficulty to many stations', false, false, 5),
  ('Sawbox', 'Adds difficulty to Exteriors', false, false, 6)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 5. INITIALIZE HEAT MAP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION initialize_project_heat_map(p_project_id TEXT)
RETURNS void AS $$
DECLARE
  v_indicator RECORD;
  v_stations TEXT[] := ARRAY[
    'auto-fc', 'auto-walls', 'mezzanine', 'elec-ceiling', 'wall-set',
    'ceiling-set', 'soffits', 'mech-rough', 'elec-rough', 'plumb-rough',
    'exteriors', 'drywall-bp', 'drywall-ttp', 'roofing', 'pre-finish',
    'mech-trim', 'elec-trim', 'plumb-trim', 'final-finish', 'sign-off', 'close-up'
  ];
  v_station TEXT;
  v_difficulty TEXT;
BEGIN
  FOR v_indicator IN SELECT * FROM difficulty_indicators LOOP
    FOREACH v_station IN ARRAY v_stations LOOP
      v_difficulty := 'average';
      
      IF v_indicator.name = 'Sidewall' THEN
        IF v_station IN ('mezzanine', 'wall-set', 'exteriors') THEN
          v_difficulty := 'hard';
        END IF;
      ELSIF v_indicator.name = 'Stair' THEN
        IF v_station IN ('auto-fc', 'mezzanine', 'wall-set', 'exteriors') THEN
          v_difficulty := 'hard';
        END IF;
      ELSIF v_indicator.name = '3HR-Wall' THEN
        IF v_station IN ('exteriors', 'drywall-bp') THEN
          v_difficulty := 'hard';
        END IF;
      ELSIF v_indicator.name = 'Short' THEN
        v_difficulty := 'easy';
      ELSIF v_indicator.name = 'Dbl Studio' THEN
        IF v_station IN ('auto-fc', 'auto-walls', 'wall-set', 'ceiling-set', 
                         'mech-rough', 'elec-rough', 'plumb-rough', 
                         'drywall-bp', 'drywall-ttp', 'pre-finish', 'final-finish') THEN
          v_difficulty := 'hard';
        END IF;
      ELSIF v_indicator.name = 'Sawbox' THEN
        IF v_station = 'exteriors' THEN
          v_difficulty := 'hard';
        END IF;
      END IF;
      
      INSERT INTO project_heat_maps (project_id, difficulty_indicator_id, station_id, difficulty_category)
      VALUES (p_project_id, v_indicator.id, v_station, v_difficulty)
      ON CONFLICT (project_id, difficulty_indicator_id, station_id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
