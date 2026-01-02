/**
 * Generate SQL to import historical module data from CSV
 * Run with: node generate-module-import-sql.cjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the CSV file
const csvPath = 'C:\\Projects\\Autovol MODA\\Project Imports\\Historic Project Import - MODA.csv';
const outputPath = path.join(__dirname, 'import-historical-modules.sql');

// Read and parse CSV
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');
const header = lines[0].split(',');

// Find column indices
const colIndex = {
    projectName: header.indexOf('Project Name'),
    serialNumber: header.indexOf('Serial Number'),
    buildSequence: header.indexOf('Build Sequence'),
    hitchBlmId: header.indexOf('HITCH BLM ID'),
    hitchUnit: header.indexOf('HITCH Unit'),
    hitchRoom: header.indexOf('HITCH Room'),
    hitchRoomType: header.indexOf('HITCH Room Type'),
    rearBlmId: header.indexOf('REAR BLM ID'),
    rearUnit: header.indexOf('REAR Unit'),
    rearRoom: header.indexOf('REAR Room'),
    rearRoomType: header.indexOf('REAR Room Type')
};

console.log('Column indices:', colIndex);

// Group modules by project
const projectModules = {};

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line (handle commas in quoted fields)
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());
    
    const projectName = values[colIndex.projectName];
    const serialNumber = values[colIndex.serialNumber];
    const buildSequence = parseInt(values[colIndex.buildSequence]) || 0;
    const hitchBlmId = values[colIndex.hitchBlmId] || '';
    const hitchUnit = values[colIndex.hitchUnit] || '';
    const hitchRoom = values[colIndex.hitchRoom] || '';
    const hitchRoomType = values[colIndex.hitchRoomType] || '';
    const rearBlmId = values[colIndex.rearBlmId] || '';
    const rearUnit = values[colIndex.rearUnit] || '';
    const rearRoom = values[colIndex.rearRoom] || '';
    const rearRoomType = values[colIndex.rearRoomType] || '';
    
    if (!projectName || !serialNumber) continue;
    
    if (!projectModules[projectName]) {
        projectModules[projectName] = [];
    }
    
    projectModules[projectName].push({
        serialNumber,
        buildSequence,
        hitchBlmId,
        hitchUnit,
        hitchRoom,
        hitchRoomType,
        rearBlmId,
        rearUnit,
        rearRoom,
        rearRoomType
    });
}

// Generate SQL
let sql = `-- ============================================================================
-- MODA Historical Modules Import
-- Generated from CSV: Historic Project Import - MODA.csv
-- Run this in the Supabase SQL Editor AFTER running import-historical-projects.sql
-- ============================================================================

-- This script imports module data for all 7 historical projects
-- Total modules: ${Object.values(projectModules).reduce((sum, arr) => sum + arr.length, 0)}

`;

// Generate INSERT statements for each project using simple INSERT with subquery
for (const [projectName, modules] of Object.entries(projectModules)) {
    const escapedName = projectName.replace(/'/g, "''");
    
    sql += `
-- ============================================================================
-- ${projectName} (${modules.length} modules)
-- ============================================================================
`;
    
    // Generate individual INSERT statements (more reliable for PostgreSQL)
    for (const mod of modules) {
        const sn = mod.serialNumber.replace(/'/g, "''");
        const blmId = mod.hitchBlmId.replace(/'/g, "''");
        const unitType = (mod.hitchRoomType || mod.rearRoomType || '').replace(/'/g, "''");
        
        // Use NULL for empty strings, otherwise use the value
        const blmIdValue = blmId ? `'${blmId}'` : 'NULL';
        const unitTypeValue = unitType ? `'${unitType}'` : 'NULL';
        
        sql += `INSERT INTO modules (project_id, serial_number, blm_id, unit_type, build_sequence)
SELECT id, '${sn}', ${blmIdValue}, ${unitTypeValue}, ${mod.buildSequence}
FROM projects WHERE name = '${escapedName}';
`;
    }
    
    sql += '\n';
}

// Add verification query
sql += `
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
`;

// Write output
fs.writeFileSync(outputPath, sql, 'utf-8');

console.log(`\nGenerated SQL file: ${outputPath}`);
console.log('\nProject summary:');
for (const [name, modules] of Object.entries(projectModules)) {
    console.log(`  ${name}: ${modules.length} modules`);
}
console.log(`\nTotal: ${Object.values(projectModules).reduce((sum, arr) => sum + arr.length, 0)} modules`);
