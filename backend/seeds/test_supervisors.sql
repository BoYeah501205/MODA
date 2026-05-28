-- ============================================================================
-- MODA Test Supervisor Profiles
-- Creates supervisor_profiles and department_supervisors records for testing
-- NOTE: Supabase auth accounts must be created separately in Supabase dashboard
-- These UUIDs are placeholders — replace with actual auth.users UUIDs after
-- creating the auth accounts
-- ============================================================================

-- Clean up existing test supervisors if re-running
DELETE FROM department_supervisors WHERE supervisor_id LIKE 'a1000001%';
DELETE FROM supervisor_profiles WHERE id LIKE 'a1000001%';

-- ── SHIFT 1 SUPERVISORS ───────────────────────────────────────────────────────

INSERT INTO supervisor_profiles (id, email, full_name, phone, shift_assignment, role, is_active, avatar_color) VALUES
('a1000001-0000-0000-0000-000000000001', 'auto.sup@autovol.com',       'Auto Supervisor',       '208-555-0101', 1, 'supervisor', TRUE, '#7C3AED'),
('a1000001-0000-0000-0000-000000000002', 'mezz.sup@autovol.com',       'Mezz Supervisor',       '208-555-0102', 1, 'supervisor', TRUE, '#0891B2'),
('a1000001-0000-0000-0000-000000000003', 'framing.sup@autovol.com',    'Framing Supervisor',    '208-555-0103', 1, 'supervisor', TRUE, '#0D9488'),
('a1000001-0000-0000-0000-000000000004', 'electrical.sup@autovol.com', 'Electrical Supervisor', '208-555-0104', 1, 'supervisor', TRUE, '#DC2626'),
('a1000001-0000-0000-0000-000000000005', 'mechanical.sup@autovol.com', 'Mechanical Supervisor', '208-555-0105', 1, 'supervisor', TRUE, '#EA580C'),
('a1000001-0000-0000-0000-000000000006', 'plumbing.sup@autovol.com',   'Plumbing Supervisor',   '208-555-0106', 1, 'supervisor', TRUE, '#0369A1'),
('a1000001-0000-0000-0000-000000000007', 'exteriors.sup@autovol.com',  'Exteriors Supervisor',  '208-555-0107', 1, 'supervisor', TRUE, '#92400E'),
('a1000001-0000-0000-0000-000000000008', 'drywall.sup@autovol.com',    'Drywall Supervisor',    '208-555-0108', 1, 'supervisor', TRUE, '#6B21A8'),
('a1000001-0000-0000-0000-000000000009', 'finish.sup@autovol.com',     'Finish Supervisor',     '208-555-0109', 1, 'supervisor', TRUE, '#059669'),
('a1000001-0000-0000-0000-000000000010', 'closeout.sup@autovol.com',   'Closeout Supervisor',   '208-555-0110', 1, 'supervisor', TRUE, '#475569');

-- ── SHIFT 2 SUPERVISORS ───────────────────────────────────────────────────────

INSERT INTO supervisor_profiles (id, email, full_name, phone, shift_assignment, role, is_active, avatar_color) VALUES
('a1000001-0000-0000-0000-000000000011', 's2.auto.sup@autovol.com',        'S2 Auto Supervisor',       '208-555-0201', 2, 'supervisor', TRUE, '#7C3AED'),
('a1000001-0000-0000-0000-000000000012', 's2.electrical.sup@autovol.com',  'S2 Electrical Supervisor', '208-555-0202', 2, 'supervisor', TRUE, '#DC2626'),
('a1000001-0000-0000-0000-000000000013', 's2.mechanical.sup@autovol.com',  'S2 Mechanical Supervisor', '208-555-0203', 2, 'supervisor', TRUE, '#EA580C'),
('a1000001-0000-0000-0000-000000000014', 's2.plumbing.sup@autovol.com',    'S2 Plumbing Supervisor',   '208-555-0204', 2, 'supervisor', TRUE, '#0369A1'),
('a1000001-0000-0000-0000-000000000015', 's2.finish.sup@autovol.com',      'S2 Finish Supervisor',     '208-555-0205', 2, 'supervisor', TRUE, '#059669');

-- ── DEPARTMENT ASSIGNMENTS ────────────────────────────────────────────────────

-- Auto Supervisor (Shift 1)
INSERT INTO department_supervisors (supervisor_id, department_id, is_primary) VALUES
('a1000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', TRUE),
('a1000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000002', FALSE);

-- Mezz Supervisor (Shift 1)
INSERT INTO department_supervisors (supervisor_id, department_id, is_primary) VALUES
('a1000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000003', TRUE);

-- Framing Supervisor (Shift 1)
INSERT INTO department_supervisors (supervisor_id, department_id, is_primary) VALUES
('a1000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000004', TRUE),
('a1000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000005', FALSE),
('a1000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000006', FALSE);

-- Electrical Supervisor (Shift 1)
INSERT INTO department_supervisors (supervisor_id, department_id, is_primary) VALUES
('a1000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000016', TRUE),
('a1000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000017', FALSE),
('a1000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000018', FALSE);

-- Mechanical Supervisor (Shift 1)
INSERT INTO department_supervisors (supervisor_id, department_id, is_primary) VALUES
('a1000001-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000019', TRUE),
('a1000001-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000020', FALSE);

-- Plumbing Supervisor (Shift 1)
INSERT INTO department_supervisors (supervisor_id, department_id, is_primary) VALUES
('a1000001-0000-0000-0000-000000000006', 'd0000001-0000-0000-0000-000000000021', TRUE),
('a1000001-0000-0000-0000-000000000006', 'd0000001-0000-0000-0000-000000000022', FALSE),
('a1000001-0000-0000-0000-000000000006', 'd0000001-0000-0000-0000-000000000023', FALSE);

-- Exteriors Supervisor (Shift 1)
INSERT INTO department_supervisors (supervisor_id, department_id, is_primary) VALUES
('a1000001-0000-0000-0000-000000000007', 'd0000001-0000-0000-0000-000000000010', TRUE);

-- Drywall Supervisor (Shift 1)
INSERT INTO department_supervisors (supervisor_id, department_id, is_primary) VALUES
('a1000001-0000-0000-0000-000000000008', 'd0000001-0000-0000-0000-000000000011', TRUE),
('a1000001-0000-0000-0000-000000000008', 'd0000001-0000-0000-0000-000000000012', FALSE);

-- Finish Supervisor (Shift 1)
INSERT INTO department_supervisors (supervisor_id, department_id, is_primary) VALUES
('a1000001-0000-0000-0000-000000000009', 'd0000001-0000-0000-0000-000000000013', TRUE),
('a1000001-0000-0000-0000-000000000009', 'd0000001-0000-0000-0000-000000000014', FALSE);

-- Closeout Supervisor (Shift 1)
INSERT INTO department_supervisors (supervisor_id, department_id, is_primary) VALUES
('a1000001-0000-0000-0000-000000000010', 'd0000001-0000-0000-0000-000000000015', TRUE);

-- S2 Auto Supervisor (Shift 2)
INSERT INTO department_supervisors (supervisor_id, department_id, is_primary) VALUES
('a1000001-0000-0000-0000-000000000011', 'd0000001-0000-0000-0000-000000000001', TRUE),
('a1000001-0000-0000-0000-000000000011', 'd0000001-0000-0000-0000-000000000002', FALSE);

-- S2 Electrical Supervisor (Shift 2)
INSERT INTO department_supervisors (supervisor_id, department_id, is_primary) VALUES
('a1000001-0000-0000-0000-000000000012', 'd0000001-0000-0000-0000-000000000016', TRUE),
('a1000001-0000-0000-0000-000000000012', 'd0000001-0000-0000-0000-000000000017', FALSE),
('a1000001-0000-0000-0000-000000000012', 'd0000001-0000-0000-0000-000000000018', FALSE);

-- S2 Mechanical Supervisor (Shift 2)
INSERT INTO department_supervisors (supervisor_id, department_id, is_primary) VALUES
('a1000001-0000-0000-0000-000000000013', 'd0000001-0000-0000-0000-000000000019', TRUE),
('a1000001-0000-0000-0000-000000000013', 'd0000001-0000-0000-0000-000000000020', FALSE);

-- S2 Plumbing Supervisor (Shift 2)
INSERT INTO department_supervisors (supervisor_id, department_id, is_primary) VALUES
('a1000001-0000-0000-0000-000000000014', 'd0000001-0000-0000-0000-000000000021', TRUE),
('a1000001-0000-0000-0000-000000000014', 'd0000001-0000-0000-0000-000000000022', FALSE),
('a1000001-0000-0000-0000-000000000014', 'd0000001-0000-0000-0000-000000000023', FALSE);

-- S2 Finish Supervisor (Shift 2)
INSERT INTO department_supervisors (supervisor_id, department_id, is_primary) VALUES
('a1000001-0000-0000-0000-000000000015', 'd0000001-0000-0000-0000-000000000013', TRUE),
('a1000001-0000-0000-0000-000000000015', 'd0000001-0000-0000-0000-000000000014', FALSE),
('a1000001-0000-0000-0000-000000000015', 'd0000001-0000-0000-0000-000000000015', FALSE);
