/**
 * Import historical project modules directly to Supabase
 * Run with: node backend/import-modules-to-supabase.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const SUPABASE_URL = 'https://syreuphexagezawjyjgt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5cmV1cGhleGFnZXphd2p5amd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Mzc1MDEsImV4cCI6MjA4MTIxMzUwMX0.-0Th_v-LDCXER9v06-mjfdEUZtRxZZSHHWypmTQXmbs';

// Project name to CSV file mapping
const projectFiles = [
    { name: 'Virginia Street Studios', file: 'Virginia_Street_Studios_modules.csv' },
    { name: 'Santa Maria Studios', file: 'Santa_Maria_Studios_modules.csv' },
    { name: 'MacArthur', file: 'MacArthur_modules.csv' },
    { name: 'Lemos Pointe', file: 'Lemos_Pointe_modules.csv' },
    { name: 'Enlightenment Plaza', file: 'Enlightenment_Plaza_modules.csv' },
    { name: 'Osgood Fremont', file: 'Osgood_Fremont_modules.csv' },
    { name: '355 Sango Court', file: '355_Sango_Court_modules.csv' }
];

const csvDir = path.join(__dirname, 'project-module-imports');

// Parse CSV file
function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const modules = [];
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
        
        const getVal = (idx) => values[idx] || null;
        
        modules.push({
            serial_number: getVal(0),
            build_sequence: parseInt(getVal(1)) || 0,
            blm_id: getVal(5) || null,  // HITCH BLM ID
            unit_type: getVal(8) || getVal(12) || null  // HITCH Room Type or REAR Room Type
        });
    }
    
    return modules;
}

// Get project ID by name
async function getProjectId(projectName) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/projects?name=eq.${encodeURIComponent(projectName)}&select=id`,
        {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        }
    );
    
    const data = await response.json();
    if (data && data.length > 0) {
        return data[0].id;
    }
    return null;
}

// Insert modules for a project
async function insertModules(projectId, modules) {
    const modulesWithProjectId = modules.map(m => ({
        project_id: projectId,
        serial_number: m.serial_number,
        build_sequence: m.build_sequence,
        blm_id: m.blm_id,
        unit_type: m.unit_type
    }));
    
    // Insert in batches of 100
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < modulesWithProjectId.length; i += batchSize) {
        const batch = modulesWithProjectId.slice(i, i + batchSize);
        
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/modules`,
            {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(batch)
            }
        );
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to insert modules: ${response.status} - ${error}`);
        }
        
        inserted += batch.length;
        console.log(`  Inserted ${inserted}/${modulesWithProjectId.length} modules...`);
    }
    
    return inserted;
}

// Main import function
async function importAllProjects() {
    console.log('Starting module import to Supabase...\n');
    
    let totalImported = 0;
    
    for (const project of projectFiles) {
        console.log(`\nProcessing: ${project.name}`);
        
        // Get project ID
        const projectId = await getProjectId(project.name);
        if (!projectId) {
            console.log(`  ERROR: Project "${project.name}" not found in Supabase. Skipping.`);
            continue;
        }
        console.log(`  Found project ID: ${projectId}`);
        
        // Parse CSV
        const csvPath = path.join(csvDir, project.file);
        if (!fs.existsSync(csvPath)) {
            console.log(`  ERROR: CSV file not found: ${csvPath}`);
            continue;
        }
        
        const modules = parseCSV(csvPath);
        console.log(`  Parsed ${modules.length} modules from CSV`);
        
        // Insert modules
        try {
            const count = await insertModules(projectId, modules);
            console.log(`  SUCCESS: Imported ${count} modules`);
            totalImported += count;
        } catch (err) {
            console.log(`  ERROR: ${err.message}`);
        }
    }
    
    console.log(`\n========================================`);
    console.log(`Total modules imported: ${totalImported}`);
    console.log(`========================================`);
}

// Run the import
importAllProjects().catch(console.error);
