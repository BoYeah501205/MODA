// ============================================================================
// Database Connection Module
// Provides singleton database connection and helper methods
// Uses sql.js (pure JavaScript SQLite - no native compilation required)
// ============================================================================

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'moda.db');

// Singleton database instance
let db = null;
let SQL = null;

// Initialize sql.js and load/create database
export async function initDatabase() {
    if (db) return db;
    
    SQL = await initSqlJs();
    
    // Try to load existing database
    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
        console.log('[DB] Loaded existing database:', DB_PATH);
    } else {
        db = new SQL.Database();
        console.log('[DB] Created new database');
    }
    
    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
    
    return db;
}

export function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

export function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
        console.log('[DB] Saved to:', DB_PATH);
    }
}

export function closeDatabase() {
    if (db) {
        saveDatabase();
        db.close();
        db = null;
        console.log('[DB] Connection closed');
    }
}

// Helper: Run a query and return all results
export function queryAll(sql, params = []) {
    const stmt = getDatabase().prepare(sql);
    stmt.bind(params);
    
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

// Helper: Run a query and return first result
export function queryOne(sql, params = []) {
    const stmt = getDatabase().prepare(sql);
    stmt.bind(params);
    
    let result = null;
    if (stmt.step()) {
        result = stmt.getAsObject();
    }
    stmt.free();
    return result;
}

// Helper: Run an insert/update/delete and return changes info
export function run(sql, params = []) {
    getDatabase().run(sql, params);
    const changes = getDatabase().getRowsModified();
    // Auto-save after modifications
    saveDatabase();
    return { changes };
}

// Helper: Run multiple statements in a transaction
export function transaction(fn) {
    const database = getDatabase();
    database.run('BEGIN TRANSACTION');
    try {
        fn();
        database.run('COMMIT');
        saveDatabase();
    } catch (err) {
        database.run('ROLLBACK');
        throw err;
    }
}

export default {
    initDatabase,
    getDatabase,
    saveDatabase,
    closeDatabase,
    queryAll,
    queryOne,
    run,
    transaction
};
