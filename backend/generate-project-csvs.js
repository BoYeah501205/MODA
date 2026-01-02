/**
 * Generate individual CSV files for each historical project
 * These can be imported using MODA's built-in module import functionality
 * Run with: node backend/generate-project-csvs.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the CSV file
const csvPath = 'C:\\Projects\\Autovol MODA\\Project Imports\\Historic Project Import - MODA.csv';
const outputDir = path.join(__dirname, 'project-module-imports');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Read and parse CSV
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');
const header = lines[0].split(',');

// Find column indices from the source CSV
const colIndex = {
    projectName: header.indexOf('Project Name'),
    abbreviation: header.indexOf('Abbrev.'),
    serialNumber: header.indexOf('Serial Number'),
    buildSequence: header.indexOf('Build Sequence'),
    moduleWidth: header.indexOf('Module Width'),
    moduleLength: header.indexOf('Module Length'),
    squareFootage: header.indexOf('Square Footage'),
    hitchBlmId: header.indexOf('HITCH BLM ID'),
    hitchUnit: header.indexOf('HITCH Unit'),
    hitchRoom: header.indexOf('HITCH Room'),
    hitchRoomType: header.indexOf('HITCH Room Type'),
    rearBlmId: header.indexOf('REAR BLM ID'),
    rearUnit: header.indexOf('REAR Unit'),
    rearRoom: header.indexOf('REAR Room'),
    rearRoomType: header.indexOf('REAR Room Type'),
    sidewall: header.indexOf('Sidewall (X)'),
    stair: header.indexOf('Stair (X)'),
    hr3Wall: header.indexOf('3HR-Wall (X)'),
    short: header.indexOf('Short (X)'),
    doubleStudio: header.indexOf('Double Studio (X)'),
    sawbox: header.indexOf('Sawbox (X)'),
    proto: header.indexOf('Proto (X)')
};

console.log('Source column indices:', colIndex);

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
    const abbreviation = values[colIndex.abbreviation];
    
    if (!projectName) continue;
    
    if (!projectModules[projectName]) {
        projectModules[projectName] = {
            abbreviation: abbreviation,
            modules: []
        };
    }
    
    projectModules[projectName].modules.push({
        serialNumber: values[colIndex.serialNumber] || '',
        buildSequence: values[colIndex.buildSequence] || '',
        moduleWidth: values[colIndex.moduleWidth] || '',
        moduleLength: values[colIndex.moduleLength] || '',
        squareFootage: values[colIndex.squareFootage] || '',
        hitchBlmId: values[colIndex.hitchBlmId] || '',
        hitchUnit: values[colIndex.hitchUnit] || '',
        hitchRoom: values[colIndex.hitchRoom] || '',
        hitchRoomType: values[colIndex.hitchRoomType] || '',
        rearBlmId: values[colIndex.rearBlmId] || '',
        rearUnit: values[colIndex.rearUnit] || '',
        rearRoom: values[colIndex.rearRoom] || '',
        rearRoomType: values[colIndex.rearRoomType] || '',
        sidewall: values[colIndex.sidewall] || '',
        stair: values[colIndex.stair] || '',
        hr3Wall: values[colIndex.hr3Wall] || '',
        short: values[colIndex.short] || '',
        doubleStudio: values[colIndex.doubleStudio] || '',
        sawbox: values[colIndex.sawbox] || '',
        proto: values[colIndex.proto] || ''
    });
}

// MODA import template header
const modaHeader = 'Serial Number,Build Sequence,Module Width,Module Length,Square Footage,HITCH BLM ID,HITCH Unit,HITCH Room,HITCH Room Type,REAR BLM ID,REAR Unit,REAR Room,REAR Room Type,Sidewall (X),Stair (X),3HR-Wall (X),Short (X),Double Studio (X),Sawbox (X),Proto (X)';

// Generate CSV for each project
for (const [projectName, data] of Object.entries(projectModules)) {
    const { abbreviation, modules } = data;
    const safeFileName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
    const filePath = path.join(outputDir, `${safeFileName}_modules.csv`);
    
    let csvContent = modaHeader + '\n';
    
    for (const mod of modules) {
        // Escape fields that might contain commas
        const escapeField = (val) => {
            if (val && (val.includes(',') || val.includes('"'))) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        };
        
        const row = [
            escapeField(mod.serialNumber),
            escapeField(mod.buildSequence),
            escapeField(mod.moduleWidth),
            escapeField(mod.moduleLength),
            escapeField(mod.squareFootage),
            escapeField(mod.hitchBlmId),
            escapeField(mod.hitchUnit),
            escapeField(mod.hitchRoom),
            escapeField(mod.hitchRoomType),
            escapeField(mod.rearBlmId),
            escapeField(mod.rearUnit),
            escapeField(mod.rearRoom),
            escapeField(mod.rearRoomType),
            escapeField(mod.sidewall),
            escapeField(mod.stair),
            escapeField(mod.hr3Wall),
            escapeField(mod.short),
            escapeField(mod.doubleStudio),
            escapeField(mod.sawbox),
            escapeField(mod.proto)
        ].join(',');
        
        csvContent += row + '\n';
    }
    
    fs.writeFileSync(filePath, csvContent, 'utf-8');
    console.log(`Created: ${filePath} (${modules.length} modules)`);
}

console.log(`\nGenerated ${Object.keys(projectModules).length} CSV files in: ${outputDir}`);
console.log('\nTo import:');
console.log('1. Open each project in MODA');
console.log('2. Click "Import Modules" button');
console.log('3. Select the corresponding CSV file');
