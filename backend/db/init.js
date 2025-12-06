// ============================================================================
// Database Initialization Script
// Creates SQLite database and applies schema
// ============================================================================

import { initDatabase, closeDatabase, saveDatabase, queryAll } from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

console.log('🗄️  Initializing MODA Database...\n');

async function init() {
    // Initialize database
    const db = await initDatabase();
    
    // Read and execute schema
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    
    // Remove SQL comments and split by semicolon
    const cleanedSchema = schema
        .split('\n')
        .map(line => line.replace(/--.*$/, '').trim()) // Remove -- comments
        .join('\n');
    
    const statements = cleanedSchema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    
    let created = 0;
    for (const statement of statements) {
        try {
            // sql.js uses exec for DDL statements
            db.exec(statement);
            created++;
        } catch (err) {
            console.error(`❌ Error executing: ${statement.substring(0, 50)}...`);
            console.error(err.message);
        }
    }
    
    console.log(`✅ Executed ${created} schema statements`);
    
    // Save database after schema creation
    saveDatabase();
    
    // Verify tables
    const tables = queryAll("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log('\n📋 Tables created:');
    tables.forEach(t => console.log(`   - ${t.name}`));
    
    closeDatabase();
    console.log('\n✅ Database initialization complete!');
}

init().catch(err => {
    console.error('❌ Initialization failed:', err);
    process.exit(1);
});
