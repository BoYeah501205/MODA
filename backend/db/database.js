// ============================================================================
// Database Connection Module
// Provides singleton database connection and helper methods
// ============================================================================

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'moda.db');

// Singleton database instance
let db = null;

export function getDatabase() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('foreign_keys = ON');
        db.pragma('journal_mode = WAL'); // Better performance for concurrent reads
        console.log('[DB] Connected to:', DB_PATH);
    }
    return db;
}

export function closeDatabase() {
    if (db) {
        db.close();
        db = null;
        console.log('[DB] Connection closed');
    }
}

// Helper: Run a query and return all results
export function queryAll(sql, params = []) {
    const stmt = getDatabase().prepare(sql);
    return stmt.all(...params);
}

// Helper: Run a query and return first result
export function queryOne(sql, params = []) {
    const stmt = getDatabase().prepare(sql);
    return stmt.get(...params);
}

// Helper: Run an insert/update/delete and return changes info
export function run(sql, params = []) {
    const stmt = getDatabase().prepare(sql);
    return stmt.run(...params);
}

// Helper: Run multiple statements in a transaction
export function transaction(fn) {
    const db = getDatabase();
    return db.transaction(fn)();
}

export default {
    getDatabase,
    closeDatabase,
    queryAll,
    queryOne,
    run,
    transaction
};
