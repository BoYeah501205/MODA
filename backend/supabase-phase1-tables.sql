-- ============================================================================
-- MODA Supabase Phase 1 Tables
-- Run this in Supabase SQL Editor to create tables for:
-- 1. QA Data (travelers, deviations, test results)
-- 2. RFIs
-- 3. Transport (modules, yards, companies)
-- 4. Equipment (tools, vendors, inventory logs)
-- ============================================================================

-- ============================================================================
-- 1. QA MODULE TABLES
-- ============================================================================

-- QA Travelers (inspection checklists per module)
CREATE TABLE IF NOT EXISTS qa_travelers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id TEXT NOT NULL,
    project_id TEXT,
    station_id TEXT,
    checklist JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending',
    inspector_id UUID REFERENCES auth.users(id),
    inspected_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QA Deviations (non-conformance items)
CREATE TABLE IF NOT EXISTS qa_deviations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id TEXT,
    project_id TEXT,
    station_id TEXT,
    deviation_type TEXT,
    severity TEXT DEFAULT 'minor',
    description TEXT,
    root_cause TEXT,
    corrective_action TEXT,
    status TEXT DEFAULT 'open',
    reported_by UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    photos JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QA Test Results
CREATE TABLE IF NOT EXISTS qa_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id TEXT,
    project_id TEXT,
    test_type TEXT NOT NULL,
    test_name TEXT,
    result TEXT,
    pass_fail BOOLEAN,
    measured_value TEXT,
    expected_value TEXT,
    tester_id UUID REFERENCES auth.users(id),
    tested_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. RFI TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS rfis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfi_number TEXT UNIQUE,
    project_id TEXT,
    module_id TEXT,
    subject TEXT NOT NULL,
    description TEXT,
    category TEXT,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'open',
    requested_by UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),
    due_date DATE,
    response TEXT,
    responded_by UUID REFERENCES auth.users(id),
    responded_at TIMESTAMPTZ,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. TRANSPORT MODULE TABLES
-- ============================================================================

-- Transport Yards
CREATE TABLE IF NOT EXISTS transport_yards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    capacity INTEGER DEFAULT 0,
    current_count INTEGER DEFAULT 0,
    contact_name TEXT,
    contact_phone TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transport Companies
CREATE TABLE IF NOT EXISTS transport_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transport Module Tracking
CREATE TABLE IF NOT EXISTS transport_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id TEXT NOT NULL,
    project_id TEXT,
    serial_number TEXT,
    current_location TEXT,
    yard_id UUID REFERENCES transport_yards(id),
    status TEXT DEFAULT 'in_production',
    ship_date DATE,
    delivery_date DATE,
    transport_company_id UUID REFERENCES transport_companies(id),
    truck_number TEXT,
    driver_name TEXT,
    tracking_notes TEXT,
    history JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. EQUIPMENT MODULE TABLES
-- ============================================================================

-- Equipment/Tools Inventory
CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    serial_number TEXT,
    asset_tag TEXT,
    status TEXT DEFAULT 'available',
    condition TEXT DEFAULT 'good',
    location TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    assigned_department TEXT,
    purchase_date DATE,
    purchase_price DECIMAL(10,2),
    vendor_id UUID,
    warranty_expiry DATE,
    last_maintenance DATE,
    next_maintenance DATE,
    notes TEXT,
    photos JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment Vendors
CREATE TABLE IF NOT EXISTS equipment_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    address TEXT,
    website TEXT,
    account_number TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment Inventory Logs (check-in/check-out)
CREATE TABLE IF NOT EXISTS equipment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES equipment(id),
    action TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    notes TEXT,
    condition_before TEXT,
    condition_after TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Missing Equipment Resolutions
CREATE TABLE IF NOT EXISTS equipment_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES equipment(id),
    reported_by UUID REFERENCES auth.users(id),
    resolved_by UUID REFERENCES auth.users(id),
    resolution_type TEXT,
    resolution_notes TEXT,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. TRAINING MATRIX TABLE (Phase 2 but including for completeness)
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID,
    station_id TEXT NOT NULL,
    substation_id TEXT,
    skill_id TEXT NOT NULL,
    proficiency_level INTEGER DEFAULT 0,
    certified_at TIMESTAMPTZ,
    certified_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, station_id, skill_id)
);

-- Training Stations Configuration
CREATE TABLE IF NOT EXISTS training_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    substations JSONB DEFAULT '[]',
    skills JSONB DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. PRODUCTION WEEKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS production_weeks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    starting_serial TEXT,
    line_balance INTEGER DEFAULT 21,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Station Staggers Configuration
CREATE TABLE IF NOT EXISTS station_staggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config JSONB NOT NULL,
    description TEXT,
    changed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_qa_travelers_module ON qa_travelers(module_id);
CREATE INDEX IF NOT EXISTS idx_qa_deviations_module ON qa_deviations(module_id);
CREATE INDEX IF NOT EXISTS idx_qa_deviations_status ON qa_deviations(status);
CREATE INDEX IF NOT EXISTS idx_qa_tests_module ON qa_tests(module_id);
CREATE INDEX IF NOT EXISTS idx_rfis_project ON rfis(project_id);
CREATE INDEX IF NOT EXISTS idx_rfis_status ON rfis(status);
CREATE INDEX IF NOT EXISTS idx_transport_modules_project ON transport_modules(project_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_training_progress_employee ON training_progress(employee_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Enable for all tables
-- ============================================================================

ALTER TABLE qa_travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_deviations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_yards ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_staggers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write all data (adjust as needed for your security model)
CREATE POLICY "Allow authenticated access" ON qa_travelers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON qa_deviations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON qa_tests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON rfis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON transport_yards FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON transport_companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON transport_modules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON equipment_vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON equipment_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON equipment_resolutions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON training_progress FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON training_stations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON production_weeks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated access" ON station_staggers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- DONE! Run this SQL in your Supabase SQL Editor
-- ============================================================================
