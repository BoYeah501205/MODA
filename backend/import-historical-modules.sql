-- ============================================================================
-- MODA Historical Modules Import
-- Generated from CSV: Historic Project Import - MODA.csv
-- Run this in the Supabase SQL Editor AFTER running import-historical-projects.sql
-- ============================================================================

-- This script imports module data for all 7 historical projects
-- Total modules: 1068


-- ============================================================================
-- Virginia Street Studios (162 modules)
-- ============================================================================
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0001', 'B1L2M04', NULL, 1
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0002', 'B1L3M04', NULL, 2
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0003', 'B1L5M32', NULL, 3
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0004', 'B1L5M09', NULL, 4
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0005', 'B1L2M36', NULL, 5
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0006', 'B1L3M36', NULL, 6
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0007', 'B1L4M36', NULL, 7
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0008', 'B1L5M36', NULL, 8
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0009', 'B1L2M28', NULL, 9
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0010', 'B1L6M36', NULL, 10
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0011', 'B1L2M35', NULL, 11
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0012', 'B1L3M35', NULL, 12
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0013', 'B1L4M35', NULL, 13
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0014', 'B1L5M35', NULL, 14
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0015', 'B1L6M35', NULL, 15
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0016', 'B1L3M28', NULL, 16
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0017', 'B1L2M34', NULL, 17
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0018', 'B1L3M34', NULL, 18
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0019', 'B1L4M34', NULL, 19
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0020', 'B1L5M34', NULL, 20
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0021', 'B1L6M34', NULL, 21
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0022', 'B1L2M37', NULL, 22
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0023', 'B1L4M28', NULL, 23
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0024', 'B1L3M37', NULL, 24
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0025', 'B1L4M37', NULL, 25
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0026', 'B1L5M37', NULL, 26
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0027', 'B1L6M37', NULL, 27
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0028', 'B1L2M33', NULL, 28
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0029', 'B1L3M33', NULL, 29
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0030', 'B1L5M28', NULL, 30
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0031', 'B1L4M33', NULL, 31
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0032', 'B1L5M33', NULL, 32
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0033', 'B1L6M33', NULL, 33
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0034', 'B1L2M32', NULL, 34
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0035', 'B1L3M32', NULL, 35
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0036', 'B1L4M32', NULL, 36
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0037', 'B1L6M28', NULL, 37
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0038', 'B1L6M32', NULL, 38
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0039', 'B1L2M39', NULL, 39
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0040', 'B1L3M39', NULL, 40
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0041', 'B1L4M39', NULL, 41
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0042', 'B1L5M39', NULL, 42
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0043', 'B1L6M39', NULL, 43
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0044', 'B1L2M27', NULL, 44
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0045', 'B1L2M41', NULL, 45
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0046', 'B1L3M41', NULL, 46
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0047', 'B1L4M41', NULL, 47
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0048', 'B1L5M41', NULL, 48
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0049', 'B1L6M41', NULL, 49
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0050', 'B1L3M27', NULL, 50
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0051', 'B1L2M31', NULL, 51
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0052', 'B1L6M42', NULL, 52
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0053', 'B1L3M31', NULL, 53
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0054', 'B1L4M31', NULL, 54
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0055', 'B1L2M42', NULL, 55
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0056', 'B1L5M31', NULL, 56
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0057', 'B1L6M31', NULL, 57
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0058', 'B1L4M27', NULL, 58
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0059', 'B1L2M30', NULL, 59
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0060', 'B1L3M30', NULL, 60
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0061', 'B1L4M30', NULL, 61
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0062', 'B1L4M42', NULL, 62
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0063', 'B1L5M30', NULL, 63
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0064', 'B1L6M30', NULL, 64
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0065', 'B1L2M29', NULL, 65
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0066', 'B1L5M27', NULL, 66
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0067', 'B1L3M29', NULL, 67
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0068', 'B1L4M29', NULL, 68
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0069', 'B1L5M29', NULL, 69
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0070', 'B1L6M29', NULL, 70
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0071', 'B1L2M26', NULL, 71
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0072', 'B1L3M26', NULL, 72
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0073', 'B1L6M27', NULL, 73
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0074', 'B1L4M26', NULL, 74
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0075', 'B1L5M26', NULL, 75
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0076', 'B1L6M26', NULL, 76
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0077', 'B1L2M25', NULL, 77
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0078', 'B1L2M20', NULL, 78
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0079', 'B1L3M25', NULL, 79
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0080', 'B1L4M25', NULL, 80
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0081', 'B1L5M25', NULL, 81
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0082', 'B1L6M25', NULL, 82
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0083', 'B1L2M12', NULL, 83
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0084', 'B1L2M24', NULL, 84
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0085', 'B1L3M24', NULL, 85
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0086', 'B1L4M24', NULL, 86
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0087', 'B1L2M19', NULL, 87
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0088', 'B1L5M24', NULL, 88
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0089', 'B1L6M24', NULL, 89
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0090', 'B1L2M22', NULL, 90
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0091', 'B1L3M12', NULL, 91
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0092', 'B1L3M22', NULL, 92
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0093', 'B1L4M22', NULL, 93
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0094', 'B1L5M22', NULL, 94
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0095', 'B1L6M22', NULL, 95
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0096', 'B1L5M20', NULL, 96
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0097', 'B1L4M12', NULL, 97
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0098', 'B1L6M19', NULL, 98
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0099', 'B1L2M14', NULL, 99
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0100', 'B1L5M12', NULL, 100
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0101', 'B1L2M13', NULL, 101
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0102', 'B1L3M13', NULL, 102
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0103', 'B1L3M19', NULL, 103
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0104', 'B1L4M13', NULL, 104
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0105', 'B1L5M13', NULL, 105
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0106', 'B1L6M13', NULL, 106
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0107', 'B1L2M18', NULL, 107
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0108', 'B1L3M18', NULL, 108
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0109', 'B1L6M12', NULL, 109
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0110', 'B1L4M18', NULL, 110
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0111', 'B1L5M18', NULL, 111
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0112', 'B1L6M18', NULL, 112
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0113', 'B1L4M19', NULL, 113
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0114', 'B1L2M17', NULL, 114
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0115', 'B1L3M17', NULL, 115
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0116', 'B1L4M17', NULL, 116
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0117', 'B1L5M17', NULL, 117
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0118', 'B1L2M11', NULL, 118
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0119', 'B1L6M17', NULL, 119
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0120', 'B1L2M10', NULL, 120
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0121', 'B1L5M19', NULL, 121
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0122', 'B1L3M10', NULL, 122
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0123', 'B1L4M10', NULL, 123
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0124', 'B1L5M10', NULL, 124
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '20-0125', 'B1L6M10', NULL, 125
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0001', 'B1L3M11', NULL, 126
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0002', 'B1L2M09', NULL, 127
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0003', 'B1L3M09', NULL, 128
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0004', 'B1L4M09', NULL, 129
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0005', 'B1L6M09', NULL, 130
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0006', 'B1L2M08', NULL, 131
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0007', 'B1L3M08', NULL, 132
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0008', 'B1L4M08', NULL, 133
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0009', 'B1L4M11', NULL, 134
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0010', 'B1L5M08', NULL, 135
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0011', 'B1L6M08', NULL, 136
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0012', 'B1L2M07', NULL, 137
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0013', 'B1L2M02', NULL, 138
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0014', 'B1L3M07', NULL, 139
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0015', 'B1L4M07', NULL, 140
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0016', 'B1L5M07', NULL, 141
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0017 (1)', 'B1L1M12', NULL, 142
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0018', 'B1L6M07', NULL, 143
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0019', 'B1L5M11', NULL, 144
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0020', 'B1L2M06', NULL, 145
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0021', 'B1L3M06', NULL, 146
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0022', 'B1L4M06', NULL, 147
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0023 (1)', 'B1L5M14', NULL, 148
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0024', 'B1L5M02', NULL, 149
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0025', 'B1L5M06', NULL, 150
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0026', 'B1L6M06', NULL, 151
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0027', 'B1L2M05', NULL, 152
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0028', 'B1L6M11', NULL, 153
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0029', 'B1L3M05', NULL, 154
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0030', 'B1L4M05', NULL, 155
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0031', 'B1L5M05', NULL, 156
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0032', 'B1L6M05', NULL, 157
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0033', 'B1L2M01', NULL, 158
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0034', 'B1L4M04', NULL, 159
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0035', 'B1L5M04', NULL, 160
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0036', 'B1L6M04', NULL, 161
FROM projects WHERE name = 'Virginia Street Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0037', 'B1L5M01', NULL, 162
FROM projects WHERE name = 'Virginia Street Studios';


-- ============================================================================
-- Santa Maria Studios (105 modules)
-- ============================================================================
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0017 (2)', 'B1L1M12', NULL, 1
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0023 (2)', 'B1L5M14', NULL, 2
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0038', 'B1L1M20', NULL, 3
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0039', 'B1L1M14', NULL, 4
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0040', 'B1L2M20', NULL, 5
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0041', 'B1L5M18', NULL, 6
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0042', 'B1L3M20', NULL, 7
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0043', 'B1L1M21', NULL, 8
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0044', 'B1L4M20', NULL, 9
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0045', 'B1L1M18', NULL, 10
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0046', 'B1L5M20', NULL, 11
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0047', 'B1L1M19', NULL, 12
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0048', 'B1L2M19', NULL, 13
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0049', 'B1L3M07', NULL, 14
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0050', 'B1L3M19', NULL, 15
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0051', 'B1L2M14', NULL, 16
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0052', 'B1L4M19', NULL, 17
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0053', 'B1L4M07', NULL, 18
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0054', 'B1L5M19', NULL, 19
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0055', 'B1L2M21', NULL, 20
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0056', 'B1L2M16', NULL, 21
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0057', 'B1L1M06', NULL, 22
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0058', 'B1L3M16', NULL, 23
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0059', 'B1L3M14', NULL, 24
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0060', 'B1L4M16', NULL, 25
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0061', 'B1L5M04', NULL, 26
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0062', 'B1L5M16', NULL, 27
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0063', 'B1L2M12', NULL, 28
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0064', 'B1L3M12', NULL, 29
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0065', 'B1L4M04', NULL, 30
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0066', 'B1L2M17', NULL, 31
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0067', 'B1L4M14', NULL, 32
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0068', 'B1L3M17', NULL, 33
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0069', 'B1L3M06', NULL, 34
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0070', 'B1L4M12', NULL, 35
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0071', 'B1L3M21', NULL, 36
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0072', 'B1L5M12', NULL, 37
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0073', 'B1L1M07', NULL, 38
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0074', 'B1L5M17', NULL, 39
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0075', 'B1L1M13', NULL, 40
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0076', 'B1L4M17', NULL, 41
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0077', 'B1L1M05', NULL, 42
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0078', 'B1L1M11', NULL, 43
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0079', 'B1L1M15', NULL, 44
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0080', 'B1L2M15', NULL, 45
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0081', 'B1L4M06', NULL, 46
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0082', 'B1L3M15', NULL, 47
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0083', 'B1L2M13', NULL, 48
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0084', 'B1L4M15', NULL, 49
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0085', 'B1L5M05', NULL, 50
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0086', 'B1L2M11', NULL, 51
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0087', 'B1L4M21', NULL, 52
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0088', 'B1L5M15', NULL, 53
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0089', 'B1L2M04', NULL, 54
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0090', 'B1L3M11', NULL, 55
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0091', 'B1L3M13', NULL, 56
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0092', 'B1L4M11', NULL, 57
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0094', 'B1L3M04', NULL, 58
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0095', 'B1L1M10', NULL, 59
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0096', 'B1L5M21', NULL, 60
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0097', 'B1L5M11', NULL, 61
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0098', 'B1L1M04', NULL, 62
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0099', 'B1L2M10', NULL, 63
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0101', 'B1L3M03', NULL, 64
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0102', 'B1L3M10', NULL, 65
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0103', 'B1L3M18', NULL, 66
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0104', 'B1L4M10', NULL, 67
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0105', 'B1L1M01', NULL, 68
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0106', 'B1L5M10', NULL, 69
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0107', 'B1L2M07', NULL, 70
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0108', 'B1L1M09', NULL, 71
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0109', 'B1L5M13', NULL, 72
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0110', 'B1L2M09', NULL, 73
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0111', 'B1L4M18', NULL, 74
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0112', 'B1L3M09', NULL, 75
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0113', 'B1L3M01', NULL, 76
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0114', 'B1L4M09', NULL, 77
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0115', 'B1L2M06', NULL, 78
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0116', 'B1L5M09', NULL, 79
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0117', 'B1L1M08', NULL, 80
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0118', 'B1L2M08', NULL, 81
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0119', 'B1L2M18', NULL, 82
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0120', 'B1L3M08', NULL, 83
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0121', 'B1L2M01', NULL, 84
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0122', 'B1L4M08', NULL, 85
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0123', 'B1L4M05', NULL, 86
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0124', 'B1L5M08', NULL, 87
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0125', 'B1L2M03', NULL, 88
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0126', 'B1L4M13', NULL, 89
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0127', 'B1L1M16', NULL, 90
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0128', 'B1L4M03', NULL, 91
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0129', 'B1L5M03', NULL, 92
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0130', 'B1L2M02', NULL, 93
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0131', 'B1L2M05', NULL, 94
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0132', 'B1L3M02', NULL, 95
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0133', 'B1L4M01', NULL, 96
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0134', 'B1L4M02', NULL, 97
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0135', 'B1L5M06', NULL, 98
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0136', 'B1L5M02', NULL, 99
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0137', 'B1L5M01', NULL, 100
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0138', 'B1L3M05', NULL, 101
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0139', 'B1L1M17', NULL, 102
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0140', 'B1L1M03', NULL, 103
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0141', 'B1L5M07', NULL, 104
FROM projects WHERE name = 'Santa Maria Studios';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0142', 'B1L1M02', NULL, 105
FROM projects WHERE name = 'Santa Maria Studios';


-- ============================================================================
-- MacArthur (136 modules)
-- ============================================================================
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0093', 'B1L5M21', NULL, 1
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0100', 'B1L1M14', NULL, 2
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0143', 'B1L1M24', NULL, 3
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0144', 'B1L2M28', NULL, 4
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0145', 'B1L5M02', NULL, 5
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0146', 'B1L1M13', NULL, 6
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0147', 'B1L1M02', NULL, 7
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0148', 'B1L1M12', NULL, 8
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0149', 'B1L2M24', NULL, 9
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0150', 'B1L2M02', NULL, 10
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0151', 'B1L2M12', NULL, 11
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0152', 'B1L3M12', NULL, 12
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0153', 'B1L3M28', NULL, 13
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0154', 'B1L5M12', NULL, 14
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0155', 'B1L2M13', NULL, 15
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0156', 'B1L4M12', NULL, 16
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0157', 'B1L3M02', NULL, 17
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0158', 'B1L1M18', NULL, 18
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0159', 'B1L5M06', NULL, 19
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0160', 'B1L2M06', NULL, 20
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0161', 'B1L3M24', NULL, 21
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0162', 'B1L4M02', NULL, 22
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0163', 'B1L3M06', NULL, 23
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0164', 'B1L4M28', NULL, 24
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0165', 'B1L4M06', NULL, 25
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0166', 'B1L5M08', NULL, 26
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0167', 'B1L3M13', NULL, 27
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0168', 'B1L2M18', NULL, 28
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0169', 'B1L1M11', NULL, 29
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0170', 'B1L1M08', NULL, 30
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0171', 'B1L5M09', NULL, 31
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0172', 'B1L2M11', NULL, 32
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0173', 'B1L4M24', NULL, 33
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0174', 'B1L5M31', NULL, 34
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0175', 'B1L1M27', NULL, 35
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0176', 'B1L3M11', NULL, 36
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0177', 'B1L5M10', NULL, 37
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0178', 'B1L4M13', NULL, 38
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0179', 'B1L2M26', NULL, 39
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0180', 'B1L4M11', NULL, 40
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0181', 'B1L2M08', NULL, 41
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0182', 'B1L5M28', NULL, 42
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0183', 'B1L5M15', NULL, 43
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0184', 'B1L1M19', NULL, 44
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0185', 'B1L5M24', NULL, 45
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0186', 'B1L3M08', NULL, 46
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0187', 'B1L5M11', NULL, 47
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0188', 'B1L5M16', NULL, 48
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0189', 'B1L1M26', NULL, 49
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0190', 'B1L5M13', NULL, 50
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0191', 'B1L2M19', NULL, 51
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0192', 'B1L4M08', NULL, 52
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0193', 'B1L1M09', NULL, 53
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0194', 'B1L3M19', NULL, 54
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0195', 'B1L2M27', NULL, 55
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0196', 'B1L1M25', NULL, 56
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0197', 'B1L2M09', NULL, 57
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0198', 'B1L4M19', NULL, 58
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0199', 'B1L3M09', NULL, 59
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0200', 'B1L3M26', NULL, 60
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0201', 'B1L5M19', NULL, 61
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0202', 'B1L4M09', NULL, 62
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0203', 'B1L1M10', NULL, 63
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0204', 'B1L1M28', NULL, 64
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0205', 'B1L2M10', NULL, 65
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0206', 'B1L1M20', NULL, 66
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0207', 'B1L2M25', NULL, 67
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0208', 'B1L3M10', NULL, 68
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0209', 'B1L3M18', NULL, 69
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0210', 'B1L2M20', NULL, 70
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0211', 'B1L4M10', NULL, 71
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0212', 'B1L2M14', NULL, 72
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0213', 'B1L3M20', NULL, 73
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0214', 'B1L1M15', NULL, 74
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0215', 'B1L3M27', NULL, 75
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0216', 'B1L2M15', NULL, 76
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0217', 'B1L4M20', NULL, 77
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0218', 'B1L3M25', NULL, 78
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0219', 'B1L3M15', NULL, 79
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0220', 'B1L4M26', NULL, 80
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0221', 'B1L5M20', NULL, 81
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0222', 'B1L4M15', NULL, 82
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0223', 'B1L3M14', NULL, 83
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0224', 'B1L1M21', NULL, 84
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0225', 'B1L1M16', NULL, 85
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0226', 'B1L2M16', NULL, 86
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0227', 'B1L2M21', NULL, 87
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0228', 'B1L4M18', NULL, 88
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0229', 'B1L4M25', NULL, 89
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0230', 'B1L3M16', NULL, 90
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0231', 'B1L3M21', NULL, 91
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0232', 'B1L4M16', NULL, 92
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0233', 'B1L1M17', NULL, 93
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0234', 'B1L4M14', NULL, 94
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0235', 'B1L4M21', NULL, 95
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0236', 'B1L4M27', NULL, 96
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0237', 'B1L2M17', NULL, 97
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0238', 'B1L1M22', NULL, 98
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0239', 'B1L3M17', NULL, 99
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0240', 'B1L5M25', NULL, 100
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0241', 'B1L2M22', NULL, 101
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0242', 'B1L5M03', NULL, 102
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0243', 'B1L4M17', NULL, 103
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0244', 'B1L5M14', NULL, 104
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0245', 'B1L5M07', NULL, 105
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0246', 'B1L3M22', NULL, 106
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0247', 'B1L5M18', NULL, 107
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0248', 'B1L1M07', NULL, 108
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0249', 'B1L4M22', NULL, 109
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0250', 'B1L4M32', NULL, 110
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0251', 'B1L5M17', NULL, 111
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0252', 'B1L2M07', NULL, 112
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0253', 'B1L3M07', NULL, 113
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0254', 'B1L1M23', NULL, 114
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0255', 'B1L5M26', NULL, 115
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0256', 'B1L2M29', NULL, 116
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0257', 'B1L2M23', NULL, 117
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0258', 'B1L3M29', NULL, 118
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0259', 'B1L4M07', NULL, 119
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0260', 'B1L3M23', NULL, 120
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0261', 'B1L2M03', NULL, 121
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0262', 'B1L5M27', NULL, 122
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0263', 'B1L5M22', NULL, 123
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0264', 'B1L4M29', NULL, 124
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0265', 'B1L5M29', NULL, 125
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0266', 'B1L1M29', NULL, 126
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0267', 'B1L4M23', NULL, 127
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0268', 'B1L3M30', NULL, 128
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0269', 'B1L4M30', NULL, 129
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0270', 'B1L1M06', NULL, 130
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0271', 'B1L5M23', NULL, 131
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0272', 'B1L4M03', NULL, 132
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0273', 'B1L5M30', NULL, 133
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0274', 'B1L3M31', NULL, 134
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0275', 'B1L4M31', NULL, 135
FROM projects WHERE name = 'MacArthur';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0276', 'B1L5M32', NULL, 136
FROM projects WHERE name = 'MacArthur';


-- ============================================================================
-- Lemos Pointe (258 modules)
-- ============================================================================
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0277', 'BC1L1M05', NULL, 1
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0278', 'BC1L1M07', NULL, 2
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0279', 'BC1L1M06', NULL, 3
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0280', 'BC1L1M08', NULL, 4
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0281', 'BC1L3M07', NULL, 5
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0282', 'BC1L1M10', NULL, 6
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0283', 'BC1L2M07', NULL, 7
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0284', 'BC1L3M09', NULL, 8
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0285', 'BC1L1M11', NULL, 9
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0286', 'BC1L2M11', NULL, 10
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0287', 'BC1L3M11', NULL, 11
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0288', 'BC1L1M12', NULL, 12
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0289', 'BC1L2M09', NULL, 13
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0290', 'BC1L2M06', NULL, 14
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0291', 'BC1L2M10', NULL, 15
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0292', 'BC1L1M01', NULL, 16
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0293', 'BC1L2M08', NULL, 17
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0294', 'BC1L1M09', NULL, 18
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0295', 'BC1L1M03', NULL, 19
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0296', 'BC1L2M03', NULL, 20
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0297', 'BC1L2M12', NULL, 21
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0298', 'BC1L3M10', NULL, 22
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0299', 'BC1L3M04', NULL, 23
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0300', 'BC1L3M08', NULL, 24
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0301', 'BC1L3M12', NULL, 25
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0302', 'BC1L2M05', NULL, 26
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0303', 'BC1L2M04', NULL, 27
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0304', 'BC1L1M02', NULL, 28
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0305', 'BC1L2M01', NULL, 29
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0306', 'BC1L1M04', NULL, 30
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0307', 'BC1L2M02', NULL, 31
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0308', 'BC1L3M01', NULL, 32
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0309', 'BC1L3M06', NULL, 33
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0310', 'BC1L3M05', NULL, 34
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0311', 'BC1L3M03', NULL, 35
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0312', 'BC1L3M02', NULL, 36
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0313', 'BC2L2M10', NULL, 37
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0314', 'BC2L3M12', NULL, 38
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0315', 'BC2L1M11', NULL, 39
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0316', 'BC2L2M11', NULL, 40
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0317', 'BC2L3M09', NULL, 41
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0318', 'BC2L3M11', NULL, 42
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0319', 'BC2L1M10', NULL, 43
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0320', 'BC2L1M12', NULL, 44
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0321', 'BC2L1M07', NULL, 45
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0322', 'BC2L2M09', NULL, 46
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0323', 'BC2L3M10', NULL, 47
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0324', 'BC2L3M08', NULL, 48
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0325', 'BC2L2M08', NULL, 49
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0326', 'BC2L1M08', NULL, 50
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0327', 'BC2L3M06', NULL, 51
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0328', 'BC2L3M04', NULL, 52
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0329', 'BC2L2M12', NULL, 53
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0330', 'BC2L2M07', NULL, 54
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0331', 'BC2L3M07', NULL, 55
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0332', 'BC2L3M05', NULL, 56
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0333', 'BC2L1M09', NULL, 57
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0334', 'BC2L1M06', NULL, 58
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0335', 'BC2L1M01', NULL, 59
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0336', 'BC2L1M05', NULL, 60
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0337', 'BC2L3M02', NULL, 61
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0338', 'BC2L3M03', NULL, 62
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0339', 'BC2L2M05', NULL, 63
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0340', 'BC2L2M04', NULL, 64
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0341', 'BC2L3M01', NULL, 65
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0342', 'BB1L3M09', NULL, 66
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0343', 'BC2L1M03', NULL, 67
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0344', 'BC2L2M03', NULL, 68
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0345', 'BB1L3M08', NULL, 69
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0346', 'BB1L3M10', NULL, 70
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0347', 'BC2L1M02', NULL, 71
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0348', 'BC2L1M04', NULL, 72
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0349', 'BC2L2M02', NULL, 73
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0350', 'BC2L2M06', NULL, 74
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0351', 'BB1L3M03', NULL, 75
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0352', 'BB1L3M06', NULL, 76
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0353', 'BC2L2M01', NULL, 77
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0354', 'BB1L1M09', NULL, 78
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0355', 'BB1L3M07', NULL, 79
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0356', 'BB1L3M05', NULL, 80
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0357', 'BB1L1M07', NULL, 81
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0358', 'BB1L1M05', NULL, 82
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0359', 'BB1L3M04', NULL, 83
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0360', 'BB1L3M02', NULL, 84
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0361', 'BB1L2M09', NULL, 85
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0362', 'BB1L1M10', NULL, 86
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0363', 'BB1L1M08', NULL, 87
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0364', 'BB1L2M07', NULL, 88
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0365', 'BB1L3M01', NULL, 89
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0366', 'BB2L3M09', NULL, 90
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0367', 'BB1L2M08', NULL, 91
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0368', 'BB1L1M06', NULL, 92
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0369', 'BB2L3M10', NULL, 93
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0370', 'BB2L3M06', NULL, 94
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0371', 'BB1L2M06', NULL, 95
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0372', 'BB1L2M05', NULL, 96
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0373', 'BB2L3M07', NULL, 97
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0374', 'BB2L3M05', NULL, 98
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0375', 'BB1L1M03', NULL, 99
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0376', 'BB1L2M10', NULL, 100
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0377', 'BB1L2M04', NULL, 101
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0378', 'BB1L2M02', NULL, 102
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0379', 'BB1L1M02', NULL, 103
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0380', 'BB2L3M04', NULL, 104
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0381', 'BB2L3M08', NULL, 105
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0382', 'BB1L1M04', NULL, 106
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0383', 'BB1L1M01', NULL, 107
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0384', 'BB3L3M09', NULL, 108
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0385', 'BB2L3M02', NULL, 109
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0386', 'BB2L1M07', NULL, 110
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0387', 'BB2L1M08', NULL, 111
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0388', 'BB2L1M05', NULL, 112
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0389', 'BB3L3M06', NULL, 113
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0390', 'BB2L3M03', NULL, 114
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0391', 'BB1L2M01', NULL, 115
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0392', 'BB2L1M09', NULL, 116
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0393 (1)', 'BRL1M03', NULL, 117
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0394', 'BB3L3M07', NULL, 118
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0395', 'BB2L2M09', NULL, 119
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0396', 'BB2L1M03', NULL, 120
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0397 (1)', 'BRL2M06', NULL, 121
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0398', 'BB3L3M08', NULL, 122
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0399', 'BB2L1M10', NULL, 123
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0400', 'BB2L1M06', NULL, 124
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0401', 'BB2L2M06', NULL, 125
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0402 (1)', 'BRL1M02', NULL, 126
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0403', 'BB3L3M05', NULL, 127
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0404', 'BB2L2M05', NULL, 128
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0405', 'BB2L2M04', NULL, 129
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0406', 'BB2L2M10', NULL, 130
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0407', 'BB2L2M08', NULL, 131
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0408', 'BB2L2M02', NULL, 132
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0409', 'BB2L2M07', NULL, 133
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0410', 'BB3L1M09', NULL, 134
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0411', 'BB3L1M06', NULL, 135
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0412', 'BB2L3M01', NULL, 136
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0413', 'BB3L3M03', NULL, 137
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0414', 'BB2L1M04', NULL, 138
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0415', 'BB2L1M01', NULL, 139
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0416', 'BB3L3M04', NULL, 140
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0417', 'BB3L3M02', NULL, 141
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0418', 'BB2L2M01', NULL, 142
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0419', 'BB1L2M03', NULL, 143
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0420', 'BB4L3M09', NULL, 144
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0421', 'BB3L2M06', NULL, 145
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0422', 'BB2L1M02', NULL, 146
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0423', 'BB2L2M03', NULL, 147
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0424', 'BB3L2M09', NULL, 148
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0425', 'BB3L3M10', NULL, 149
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0426', 'BB3L1M07', NULL, 150
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0427', 'BB3L2M07', NULL, 151
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0428', 'BB3L2M08', NULL, 152
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0429', 'BB3L2M04', NULL, 153
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0430', 'BB3L1M05', NULL, 154
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0431', 'BB3L3M01', NULL, 155
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0432', 'BB3L1M02', NULL, 156
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0433', 'BB3L1M08', NULL, 157
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0434', 'BB4L1M06', NULL, 158
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0435', 'BB3L2M05', NULL, 159
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0436', 'BB3L1M04', NULL, 160
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0437', 'BB3L1M10', NULL, 161
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0438', 'BB3L2M02', NULL, 162
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0439', 'BB4L1M07', NULL, 163
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0440', 'BB3L2M03', NULL, 164
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0441', 'BB4L3M06', NULL, 165
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0442', 'BB4L1M05', NULL, 166
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0443', 'BB4L2M07', NULL, 167
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0444', 'BB4L2M02', NULL, 168
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0445', 'BB3L1M03', NULL, 169
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0446', 'BB4L3M07', NULL, 170
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0447', 'BB3L2M10', NULL, 171
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0448', 'BB4L1M09', NULL, 172
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0449', 'BB4L2M06', NULL, 173
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0450', 'BB4L2M05', NULL, 174
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0451', 'BB4L1M04', NULL, 175
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0452', 'BB4L1M02', NULL, 176
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0453', 'BB4L3M04', NULL, 177
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0454', 'BB4L3M08', NULL, 178
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0455', 'BB4L2M04', NULL, 179
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0456', 'BB3L1M01', NULL, 180
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0457', 'BB4L3M02', NULL, 181
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0458', 'BB5L2M09', NULL, 182
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0459', 'BB5L2M06', NULL, 183
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0460', 'BB4L3M05', NULL, 184
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0461', 'BB4L2M08', NULL, 185
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0462', 'BB3L2M01', NULL, 186
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0463', 'BB4L2M09', NULL, 187
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0464', 'BB5L1M07', NULL, 188
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0465', 'BB4L1M08', NULL, 189
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0466', 'BB5L2M07', NULL, 190
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0467', 'BB5L1M09', NULL, 191
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0468', 'BB5L1M06', NULL, 192
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0469', 'BB4L3M10', NULL, 193
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0470', 'BB4L3M03', NULL, 194
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0471', 'BB5L1M05', NULL, 195
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0472', 'BB5L2M05', NULL, 196
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0473', 'BB5L3M09', NULL, 197
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0474', 'BB5L3M08', NULL, 198
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0475', 'BB4L2M10', NULL, 199
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0476', 'BB5L1M04', NULL, 200
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0477', 'BB5L3M06', NULL, 201
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0478', 'BB4L3M01', NULL, 202
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0479', 'BB5L2M02', NULL, 203
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0480', 'BB4L1M03', NULL, 204
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0481', 'BB5L1M10', NULL, 205
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0482', 'BB5L3M03', NULL, 206
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0483', 'BAL1M10', NULL, 207
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0484', 'BB4L1M10', NULL, 208
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0485', 'BB5L1M08', NULL, 209
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0486', 'BB5L3M07', NULL, 210
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0487', 'BB5L2M04', NULL, 211
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0488', 'BB4L1M01', NULL, 212
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0489', 'BB5L1M02', NULL, 213
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0490', 'BB5L3M05', NULL, 214
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0491', 'BAL3M09', NULL, 215
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0492', 'BB5L3M04', NULL, 216
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0493', 'BB4L2M01', NULL, 217
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0494', 'BAL2M10', NULL, 218
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0495', 'BB4L2M03', NULL, 219
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0496', 'BAL1M08', NULL, 220
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0497', 'BAL2M08', NULL, 221
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0498', 'BB5L1M01', NULL, 222
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0499', 'BAL3M03', NULL, 223
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0500', 'BB5L3M02', NULL, 224
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0501', 'BAL2M05', NULL, 225
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0502', 'BB5L3M10', NULL, 226
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0503', 'BAL2M02', NULL, 227
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0504', 'BB5L1M03', NULL, 228
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0505', 'BAL3M02', NULL, 229
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0506', 'BB5L2M10', NULL, 230
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0507', 'BAL3M10', NULL, 231
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0508', 'BAL1M07', NULL, 232
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0509', 'BAL3M08', NULL, 233
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0510', 'BB5L3M01', NULL, 234
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0511', 'BB5L2M03', NULL, 235
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0512', 'BAL2M07', NULL, 236
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0513', 'BAL1M11', NULL, 237
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0514', 'BB5L2M08', NULL, 238
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0515', 'BAL3M07', NULL, 239
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0516', 'BB5L2M01', NULL, 240
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0517', 'BAL1M06', NULL, 241
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0518', 'BAL1M05', NULL, 242
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0519', 'BAL2M04', NULL, 243
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0520', 'BAL3M11', NULL, 244
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0521', 'BAL2M09', NULL, 245
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0522', 'BAL3M06', NULL, 246
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0523', 'BAL1M02', NULL, 247
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0524', 'BAL2M11', NULL, 248
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0525', 'BAL1M09', NULL, 249
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0526', 'BAL2M06', NULL, 250
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0527', 'BAL3M05', NULL, 251
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0528', 'BAL1M01', NULL, 252
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0529', 'BAL1M04', NULL, 253
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0530', 'BAL2M03', NULL, 254
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0531', 'BAL2M01', NULL, 255
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0001', 'BAL3M04', NULL, 256
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0002', 'BAL1M03', NULL, 257
FROM projects WHERE name = 'Lemos Pointe';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0003', 'BAL3M01', NULL, 258
FROM projects WHERE name = 'Lemos Pointe';


-- ============================================================================
-- Enlightenment Plaza (139 modules)
-- ============================================================================
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0393 (2)', 'BRL1M03', NULL, 1
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0397 (2)', 'BRL2M06', NULL, 2
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '21-0402 (2', 'BRL1M02', NULL, 3
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0004', 'BRL1M07', NULL, 4
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0005', 'BRL5M08', NULL, 5
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0006', 'BRL5M06', NULL, 6
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0007', 'BRL3M04', NULL, 7
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0008', 'BRL1M11', NULL, 8
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0009', 'BRL1M01', NULL, 9
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0010', 'BRL1M04', NULL, 10
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0011', 'BRL2M09', NULL, 11
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0012', 'BRL2M05', NULL, 12
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0013', 'BRL3M11', NULL, 13
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0014', 'BRL2M04', NULL, 14
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0015', 'BRL2M03', NULL, 15
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0016', 'BRL3M08', NULL, 16
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0017', 'BRL2M02', NULL, 17
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0018', 'BRL3M01', NULL, 18
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0019', 'BRL3M06', NULL, 19
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0020', 'BRL3M07', NULL, 20
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0021', 'BRL4M01', NULL, 21
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0022', 'BRL3M05', NULL, 22
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0023', 'BRL1M05', NULL, 23
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0024', 'BRL5M09', NULL, 24
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0025', 'BRL3M03', NULL, 25
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0026', 'BRL2M07', NULL, 26
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0027', 'BRL3M02', NULL, 27
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0028', 'BRL4M09', NULL, 28
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0029', 'BRL4M06', NULL, 29
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0030', 'BRL4M05', NULL, 30
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0031', 'BRL4M07', NULL, 31
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0032', 'BRL5M01', NULL, 32
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0033', 'BRL4M04', NULL, 33
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0034', 'BRL4M03', NULL, 34
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0035', 'BRL1M08', NULL, 35
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0036', 'BRL4M02', NULL, 36
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0037', 'BRL1M06', NULL, 37
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0038', 'BRL5M11', NULL, 38
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0039', 'BRL2M01', NULL, 39
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0040', 'BRL5M05', NULL, 40
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0041', 'BRL5M04', NULL, 41
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0042', 'BRL5M02', NULL, 42
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0043', 'BRL5M07', NULL, 43
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0044', 'BRL5M03', NULL, 44
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0045', 'BRL1M10', NULL, 45
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0046', 'BML2M03', NULL, 46
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0047', 'BML2M02', NULL, 47
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0048', 'BML2M06', NULL, 48
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0049', 'BML2M07', NULL, 49
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0050', 'BML2M04', NULL, 50
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0051', 'BML3M03', NULL, 51
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0052', 'BML3M02', NULL, 52
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0053', 'BML3M05', NULL, 53
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0054', 'BML2M01', NULL, 54
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0055', 'BML4M03', NULL, 55
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0056', 'BML3M07', NULL, 56
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0057', 'BML4M05', NULL, 57
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0058', 'BML3M04', NULL, 58
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0060', 'BML3M06', NULL, 60
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0061', 'BML4M02', NULL, 61
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0063', 'BML5M03', NULL, 63
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0064', 'BML3M01', NULL, 64
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0066', 'BML4M06', NULL, 66
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0067', 'BML4M07', NULL, 67
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0069', 'BML4M04', NULL, 69
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0070', 'BML5M05', NULL, 70
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0072', 'BML5M07', NULL, 72
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0073', 'BML5M06', NULL, 73
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0075', 'BML6M03', NULL, 75
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0076', 'BML5M02', NULL, 76
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0077', 'BML6M04', NULL, 77
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0078', 'BML2M05', NULL, 78
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0079', 'BML6M02', NULL, 79
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0080', 'BML5M04', NULL, 80
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0081', 'BML6M05', NULL, 81
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0082', 'BML4M01', NULL, 82
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0083', 'BML6M06', NULL, 83
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0084', 'BML5M01', NULL, 84
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0085', 'BML6M07', NULL, 85
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0086', 'BML6M01', NULL, 86
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0087', 'BVL1M08', NULL, 87
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0088', 'BVL1M01', NULL, 88
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0089', 'BVL1M07', NULL, 89
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0090', 'BVL1M06', NULL, 90
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0091', 'BVL1M09', NULL, 91
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0092', 'BVL1M14', NULL, 92
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0093', 'BVL2M08', NULL, 93
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0094', 'BVL1M03', NULL, 94
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0095', 'BVL2M07', NULL, 95
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0096', 'BVL2M06', NULL, 96
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0097', 'BVL1M11', NULL, 97
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0098', 'BVL1M05', NULL, 98
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0099', 'BVL1M04', NULL, 99
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0100', 'BVL1M02', NULL, 100
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0101', 'BVL1M10', NULL, 101
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0102', 'BVL1M12', NULL, 102
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0103', 'BVL2M04', NULL, 103
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0104', 'BVL2M09', NULL, 104
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0105', 'BVL2M01', NULL, 105
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0106', 'BVL2M03', NULL, 106
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0107', 'BVL2M02', NULL, 107
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0108', 'BVL2M11', NULL, 108
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0109', 'BVL3M08', NULL, 109
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0110', 'BVL3M09', NULL, 110
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0111', 'BVL3M14', NULL, 111
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0112', 'BVL3M07', NULL, 112
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0113', 'BVL3M06', NULL, 113
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0114', 'BVL3M11', NULL, 114
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0115', 'BVL4M07', NULL, 115
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0116', 'BVL4M06', NULL, 116
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0117', 'BVL2M05', NULL, 117
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0118', 'BVL5M14', NULL, 118
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0119', 'BVL3M03', NULL, 119
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0120', 'BVL4M08', NULL, 120
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0121', 'BVL3M02', NULL, 121
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0122', 'BVL3M10', NULL, 122
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0123', 'BVL3M05', NULL, 123
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0124', 'BVL4M04', NULL, 124
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0125', 'BVL4M02', NULL, 125
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0126', 'BVL4M01', NULL, 126
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0127', 'BVL4M09', NULL, 127
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0128', 'BVL3M12', NULL, 128
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0129', 'BVL5M01', NULL, 129
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0130', 'BVL5M07', NULL, 130
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0131', 'BVL5M06', NULL, 131
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0132', 'BVL4M11', NULL, 132
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0133', 'BVL5M08', NULL, 133
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0134', 'BVL4M05', NULL, 134
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0135', 'BVL5M12', NULL, 135
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0136', 'BVL5M04', NULL, 136
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0137', 'BVL3M01', NULL, 137
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0138', 'BVL5M09', NULL, 138
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0139', 'BVL5M03', NULL, 139
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0140', 'BVL5M02', NULL, 140
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0141', 'BVL5M11', NULL, 141
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0142', 'BVL3M04', NULL, 142
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0143', 'BVL5M05', NULL, 143
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0144', 'BVL4M03', NULL, 144
FROM projects WHERE name = 'Enlightenment Plaza';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0145', 'BVL5M10', NULL, 145
FROM projects WHERE name = 'Enlightenment Plaza';


-- ============================================================================
-- Osgood Fremont (155 modules)
-- ============================================================================
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0059', 'B1L2M05', 'BATH/BED', 150
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0062', 'B1L2M22', 'BED/BATH', 151
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0065', 'B1L2M04', 'KITCHEN PEN', 152
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0068', 'B1L2M21', 'KITCHEN PEN', 153
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0071', 'B1L2M26', 'STUDIO', 154
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0074', 'B1L2M20', 'BED/BATH', 155
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0146', 'B1L2M01', 'STAIR', 1
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0147', 'B1L2M02', 'STUDIO', 2
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0148', 'B1L3M02', 'STUDIO', 3
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0149', 'B1L2M13', 'BED/BATH', 4
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0150', 'B1L3M04', 'KITCHEN PEN', 5
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0151', 'B1L4M02', 'STUDIO', 6
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0152', 'B1L2M03', 'STUDIO', 7
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0153', 'B1L6M04', 'KITCHEN PEN', 8
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0154', 'B1L5M02', 'STUDIO', 9
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0155', 'B1L3M13', 'BED/BATH', 10
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0156', 'B1L5M04', 'KITCHEN PEN', 11
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0157', 'B1L6M02', 'STUDIO', 12
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0158', 'B1L4M04', 'KITCHEN PEN', 13
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0159', 'B1L3M01', 'STAIR', 14
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0160', 'B1L2M11', 'BED/BATH', 15
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0161', 'B1L3M11', 'BED/BATH', 16
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0162', 'B1L4M13', 'BED/BATH', 17
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0163', 'B1L3M05', 'BATH/BED', 18
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0164', 'B1L4M11', 'BED/BATH', 19
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0165', 'B1L3M03', 'STUDIO', 20
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0166', 'B1L6M05', 'BATH/BED', 21
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0167', 'B1L4M05', 'BATH/BED', 22
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0168', 'B1L5M11', 'BED/BATH', 23
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0169', 'B1L5M05', 'BATH/BED', 24
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0170', 'B1L5M13', 'BED/BATH', 25
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0171', 'B1L2M12', 'KITCHEN PEN', 26
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0172', 'B1L2M06', 'STUDIO', 27
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0173', 'B1L4M01', 'STAIR', 28
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0174', 'B1L6M11', 'BED/BATH', 29
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0175', 'B1L3M06', 'STUDIO', 30
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0176', 'B1L3M12', 'KITCHEN PEN', 31
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0177', 'B1L6M13', 'BED/BATH', 32
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0178', 'B1L4M06', 'STUDIO', 33
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0179', 'B1L4M12', 'KITCHEN PEN', 34
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0180', 'B1L4M03', 'STUDIO', 35
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0181', 'B1L5M06', 'STUDIO', 36
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0182', 'B1L5M12', 'KITCHEN PEN', 37
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0183', 'B1L6M06', 'STUDIO', 38
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0184', 'B1L2M14', 'BED/BATH', 39
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0185', 'B1L2M07', 'COMMON', 40
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0186', 'B1L6M12', 'KITCHEN PEN', 41
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0187', 'B1L3M07', 'COMMON', 42
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0188', 'B1L5M01', 'STAIR', 43
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0189', 'B1L2M09', 'KITCHEN PEN', 44
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0190', 'B1L2M15', 'KITCHEN PEN', 45
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0191', 'B1L3M09', 'KITCHEN PEN', 46
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0192', 'B1L3M14', 'BED/BATH', 47
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0193', 'B1L4M07', 'COMMON', 48
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0194', 'B1L3M15', 'KITCHEN PEN', 49
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0195', 'B1L5M03', 'STUDIO', 50
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0196', 'B1L4M09', 'KITCHEN PEN', 51
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0197', 'B1L6M15', 'KITCHEN PEN', 52
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0198', 'B1L4M15', 'KITCHEN PEN', 53
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0199', 'B1L5M09', 'KITCHEN PEN', 54
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0200', 'B1L4M14', 'BED/BATH', 55
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0201', 'B1L5M07', 'COMMON', 56
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0202', 'B1L5M15', 'KITCHEN PEN', 57
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0203', 'B1L6M07', 'COMMON', 58
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0204', 'B1L6M01', 'STAIR', 59
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0205', 'B1L2M08', 'COMMON', 60
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0206', 'B1L5M14', 'BED/BATH', 61
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0207', 'B1L3M08', 'COMMON', 62
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0208', 'B1L2M16', 'BED/BATH', 63
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0209', 'B1L6M03', 'STUDIO', 64
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0210', 'B1L3M16', 'BED/BATH', 65
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0211', 'B1L2M10', 'BED/BATH', 66
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0212', 'B1L4M08', 'COMMON', 67
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0213', 'B1L6M014', 'BED/BATH', 68
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0214', 'B1L4M16', 'BED/BATH', 69
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0215', 'B1L3M10', 'BED/BATH', 70
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0216', 'B1L6M09', 'KITCHEN PEN', 71
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0217', 'B1L2M31', 'COMMON', 72
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0218', 'B1L5M16', 'BED/BATH', 73
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0219', 'B1L4M10', 'BED/BATH', 74
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0220', 'B1L6M16', 'BED/BATH', 75
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0221', 'B1L2M19', 'BED/BATH', 76
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0222', 'B1L2M17', 'BED/BATH', 77
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0223', 'B1L5M10', 'BED/BATH', 78
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0224', 'B1L3M17', 'BED/BATH', 79
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0225', 'B1L6M10', 'BED/BATH', 80
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0226', 'B1L5M08', 'COMMON', 81
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0227', 'B1L4M17', 'BED/BATH', 82
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0228', 'B1L3M19', 'BED/BATH', 83
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0229', 'B1L5M17', 'BED/BATH', 84
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0230', 'B1L3M26', 'STUDIO', 85
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0231', 'B1L3M31', 'COMMON', 86
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0232', 'B1L6M08', 'COMMON', 87
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0233', 'B1L2M29', 'BED/BATH', 88
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0234', 'B1L2M23', 'STUDIO', 89
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0235', 'B1L4M26', 'STUDIO', 90
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0236', 'B1L4M19', 'BED/BATH', 91
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0237', 'B1L6M17', 'BED/BATH', 92
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0238', 'B1L2M24', 'COMMON', 93
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0239', 'B1L3M29', 'BED/BATH', 94
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0240', 'B1L5M26', 'STUDIO', 95
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0241', 'B1L2M18', 'KITCHEN PEN', 96
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0242', 'B1L6M26', 'STUDIO', 97
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0243', 'B1L5M19', 'BED/BATH', 98
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0244', 'B1L3M24', 'COMMON', 99
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0245', 'B1L3M23', 'STUDIO', 100
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0246', 'B1L3M18', 'KITCHEN PEN', 101
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0247', 'B1L6M21', 'KITCHEN PEN', 102
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0248', 'B1L4M31', 'COMMON', 103
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0249', 'B1L2M27', 'STUDIO', 104
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0250', 'B1L4M18', 'KITCHEN PEN', 105
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0251', 'B1L4M24', 'COMMON', 106
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0252', 'B1L6M19', 'BED/BATH', 107
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0253', 'B1L3M27', 'STUDIO', 108
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0254', 'B1L4M23', 'STUDIO', 109
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0255', 'B1L5M18', 'KITCHEN PEN', 110
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0256', 'B1L4M29', 'BED/BATH', 111
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0257', 'B1L5M24', 'COMMON', 112
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0258', 'B1L6M18', 'KITCHEN PEN', 113
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0259', 'B1L3M21', 'KITCHEN PEN', 114
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0260', 'B1L4M27', 'STUDIO', 115
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0261', 'B1L2M30', 'KITCHEN PEN', 116
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0262', 'B1L5M27', 'STUDIO', 117
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0263', 'B1L5M31', 'COMMON', 118
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0264', 'B1L6M24', 'COMMON', 119
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0265', 'B1L5M23', 'STUDIO', 120
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0266', 'B1L3M30', 'KITCHEN PEN', 121
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0267', 'B1L3M20', 'BED/BATH', 122
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0268', 'B1L2M28', 'STUDIO', 123
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0269', 'B1L6M27', 'STUDIO', 124
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0270', 'B1L4M21', 'KITCHEN PEN', 125
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0271', 'B1L2M25', 'COMMON', 126
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0272', 'B1L5M29', 'BED/BATH', 127
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0273', 'B1L4M30', 'KITCHEN PEN', 128
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0274', 'B1L6M28', 'STUDIO', 129
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0275', 'B1L4M20', 'BED/BATH', 130
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0276', 'B1L4M28', 'STUDIO', 131
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0277', 'B1L3M25', 'COMMON', 132
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0278', 'B1L5M30', 'KITCHEN PEN', 133
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0279', 'B1L6M31', 'COMMON', 134
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0280', 'B1L3M28', 'STUDIO', 135
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0281', 'B1L6M23', 'STUDIO', 136
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0282', 'B1L3M22', 'BED/BATH', 137
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0283', 'B1L5M20', 'BED/BATH', 138
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0284', 'B1L6M30', 'KITCHEN PEN', 139
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0285', 'B1L4M25', 'COMMON', 140
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0286', 'B1L5M21', 'KITCHEN PEN', 141
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0287', 'B1L6M29', 'BED/BATH', 142
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0288', 'B1L4M22', 'BED/BATH', 143
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0289', 'B1L5M25', 'COMMON', 144
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0290', 'B1L6M20', 'BED/BATH', 145
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0291', 'B1L5M22', 'BED/BATH', 146
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0292', 'B1L6M25', 'COMMON', 147
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0293', 'B1L5M28', 'STUDIO', 148
FROM projects WHERE name = 'Osgood Fremont';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0294', 'B1L6M22', 'BED/BATH', 149
FROM projects WHERE name = 'Osgood Fremont';


-- ============================================================================
-- 355 Sango Court (113 modules)
-- ============================================================================
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0295', 'B1L2M08', 'KIT/BATH', 1
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0296', 'B1L2M12', 'BED/BATH', 2
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0297', 'B1L2M13', 'KIT', 3
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0298', 'B1L2M14', 'BED/BATH', 4
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0350', 'B1L4M01-B', 'BED/BATH', 5
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0349', 'B1L2M03-A', 'KIT', 6
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0347', 'B1L4M03-B', 'CORRIDOR', 7
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0346', 'B1L4M02-B', 'KIT', 8
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0344', 'B1L4M03-A', 'KIT', 9
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0343', 'B1L2M05-A', 'KIT/BATH', 10
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0342', 'B1L3M02', 'KIT', 11
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0341', 'B1L2M03-B', 'CORRIDOR', 12
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0340', 'B1L2M02', 'KIT', 13
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0338', 'B1L3M01', 'BED/BATH', 14
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0337', 'B1L5M03-A', 'KIT', 15
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0336', 'B1L5M04', 'BED/BATH', 16
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0335', 'B1L5M06', 'BED/BATH', 17
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0334', 'B1L4M06', 'BED/BATH', 18
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0333', 'B1L3M06', 'BED/BATH', 19
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0332', 'B1L2M06', 'BED/BATH', 20
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0331', 'B1L4M04', 'BED/BATH', 21
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0355', 'B1L5M11', 'KIT/BATH', 22
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0329', 'B1L2M01', 'BED/BATH', 23
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0328', 'B1L5M07', 'KIT', 24
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0327', 'B1L4M07', 'KIT', 25
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0326', 'B1L3M07', 'KIT', 26
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0325', 'B1L3M04', 'BED/BATH', 27
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0324', 'B1L2M07', 'KIT', 28
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0323', 'B1L5M08', 'KIT/BATH', 29
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0322', 'B1L5M14', 'BED/BATH', 30
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0321', 'B1L4M08', 'KIT/BATH', 31
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0320', 'B1L2M04', 'BED/BATH', 32
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0319', 'B1L3M08', 'KIT/BATH', 33
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0318', 'B1L5M09', 'BED/BATH', 34
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0348', 'B1L4M11', 'KIT/BATH', 35
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0317', 'B1L4M14', 'BED/BATH', 36
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0316', 'B1L5M05', 'KIT/BATH', 37
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0315', 'B1L4M09', 'BED/BATH', 38
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0314', 'B1L3M09', 'BED/BATH', 39
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0313', 'B1L2M09', 'BED/BATH', 40
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0312', 'B1L5M10', 'KIT', 41
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0311', 'B1L4M10', 'KIT', 42
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0310', 'B1L4M05', 'KIT/BATH', 43
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0309', 'B1L3M10', 'KIT', 44
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0308', 'B1L3M14', 'BED/BATH', 45
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0307', 'B1L2M10', 'KIT', 46
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0306', 'B1L5M12', 'BED/BATH', 47
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0305', 'B1L3M05', 'KIT/BATH', 48
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0304', 'B1L4M12', 'BED/BATH', 49
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0339', 'B1L3M11', 'KIT/BATH', 50
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0303', 'B1L3M12', 'BED/BATH', 51
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0302', 'B1L2M05-B', 'LDRY', 52
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0301', 'B1L5M13', 'KIT', 53
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0300', 'B1L4M13', 'KIT', 54
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0299', 'B1L3M13', 'KIT', 55
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0407', 'B2L5M01', 'BED/BATH', 56
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0406', 'B2L5M02', 'KIT', 57
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0405', 'B2L4M02', 'KIT', 58
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0330', 'B1L2M11', 'KIT/BATH', 59
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0403', 'B2L3M02', 'KIT', 60
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0402', 'B2L2M02', 'KIT', 61
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0401', 'B2L5M04', 'BED/TRASH', 62
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0400', 'B2L4M01', 'BED/BATH', 63
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0399', 'B2L5M03', 'KIT/BATH', 64
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0398', 'B2L4M03', 'KIT/BATH', 65
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0397', 'B2L3M03', 'KIT/BATH', 66
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0396', 'B2L2M03', 'KIT/BATH', 67
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0395', 'B2L5M06', 'LIV', 68
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0394', 'B2L3M01', 'BED/BATH', 69
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0393', 'B2L4M06', 'LIV', 70
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0392', 'B2L3M06', 'LIV', 71
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0391', 'B2L4M04', 'BR/TRASH', 72
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0404', 'B2L5M12', 'BED/BATH', 73
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0389', 'B2L2M06', 'LIV', 74
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0388', 'B2L5M07', 'KIT/BED', 75
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0387', 'B2L2M01', 'BED/BATH', 76
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0386', 'B2L4M07', 'KIT/BED', 77
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0385', 'B2L3M07', 'KIT/BED', 78
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0384', 'B2L2M07', 'KIT/BED', 79
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0383', 'B2L5M08', 'BED/BATH', 80
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0382', 'B2L2M04', 'BED/TRASH', 81
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0381', 'B2L4M08', 'BED/BATH', 82
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0380', 'B2L5M14', 'BED/BATH', 83
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0379', 'B2L3M08', 'BED/BATH', 84
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0390', 'B2L4M12', 'BED/BATH', 85
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0377', 'B2L2M08', 'KIT/BED', 86
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0376', 'B2L3M04', 'BR/TRASH', 87
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0375', 'B2L5M09', 'KIT', 88
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0374', 'B2L4M09', 'KIT', 89
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0373', 'B2L4M14', 'BED/BATH', 90
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0372', 'B2L3M09', 'KIT', 91
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0371', 'B2L5M05', 'BED/BATH', 92
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0370', 'B2L2M09', 'KIT', 93
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0369', 'B2L5M10', 'BED/BATH', 94
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0368', 'B2L4M10', 'BED/BATH', 95
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0367', 'B2L3M10', 'BED/BATH', 96
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0366', 'B2L4M05', 'BED/BATH', 97
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0365', 'B2L3M14', 'BED/BATH', 98
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0378', 'B2L3M12', 'BED/BATH', 99
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0363', 'B2L2M10', 'BED/BATH', 100
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0362', 'B2L5M11', 'KIT', 101
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0361', 'B2L4M11', 'KIT', 102
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0360', 'B2L3M05', 'BED/BATH', 103
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0359', 'B2L3M11', 'KIT', 104
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0358', 'B2L2M14', 'BED/BATH', 105
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0357', 'B2L2M11', 'KIT', 106
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0356', 'B2L5M13', 'KIT', 107
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0354', 'B2L2M05', 'BED/BATH', 108
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0353', 'B2L4M13', 'KIT', 109
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0352', 'B2L3M13', 'KIT', 110
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0351', 'B2L2M13', 'KIT', 111
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0364', 'B2L2M12', 'BED/BATH', 112
FROM projects WHERE name = '355 Sango Court';
INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '22-0345', 'B1L5M03-B', 'CORRIDOR', 113
FROM projects WHERE name = '355 Sango Court';


-- ============================================================================
-- Verify the import
-- ============================================================================
SELECT 
    p.name as project_name,
    p.abbreviation,
    COUNT(m.id) as module_count
FROM projects p
LEFT JOIN modules m ON m.project_id = p.id
WHERE p.status = 'Complete'
GROUP BY p.id, p.name, p.abbreviation
ORDER BY p.name;
