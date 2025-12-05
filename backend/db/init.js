// ============================================================================
// Database Initialization Script
// Creates SQLite database and applies schema
// ============================================================================

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'moda.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

console.log('🗄️  Initializing MODA Database...\n');

// Create database
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Read and execute schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

// Split by semicolon and execute each statement
const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

let created = 0;
for (const statement of statements) {
    try {
        db.exec(statement);
        created++;
    } catch (err) {
        console.error(`❌ Error executing: ${statement.substring(0, 50)}...`);
        console.error(err.message);
    }
}

console.log(`✅ Executed ${created} schema statements`);
console.log(`📁 Database created at: ${DB_PATH}`);

// Verify tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('\n📋 Tables created:');
tables.forEach(t => console.log(`   - ${t.name}`));

db.close();
console.log('\n✅ Database initialization complete!');
