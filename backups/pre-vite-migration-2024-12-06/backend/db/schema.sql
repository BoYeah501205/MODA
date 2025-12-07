-- ============================================================================
-- MODA Database Schema
-- SQLite database for persistent storage
-- ============================================================================

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client TEXT,
    location TEXT,
    status TEXT DEFAULT 'Active',
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT
);

-- Modules table (linked to projects)
CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    serial_number TEXT,
    build_sequence INTEGER,
    blm_hitch TEXT,
    blm_rear TEXT,
    unit TEXT,
    width TEXT,
    length TEXT,
    sqft TEXT,
    status TEXT DEFAULT 'pending',
    current_phase TEXT DEFAULT 'production',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Module difficulties (flags for special handling)
CREATE TABLE IF NOT EXISTS module_difficulties (
    module_id TEXT PRIMARY KEY,
    sidewall INTEGER DEFAULT 0,
    stair INTEGER DEFAULT 0,
    hr3_wall INTEGER DEFAULT 0,
    short INTEGER DEFAULT 0,
    double_studio INTEGER DEFAULT 0,
    sawbox INTEGER DEFAULT 0,
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

-- Module stage progress (production stations)
CREATE TABLE IF NOT EXISTS module_stage_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    module_id TEXT NOT NULL,
    stage_id TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(module_id, stage_id),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT,
    department TEXT,
    hire_date TEXT,
    status TEXT DEFAULT 'active',
    avatar_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    deleted_at TEXT
);

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    supervisor_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (supervisor_id) REFERENCES employees(id)
);

-- Users table (authentication)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT
);

-- Transport modules (yard/shipping tracking)
CREATE TABLE IF NOT EXISTS transport_modules (
    id TEXT PRIMARY KEY,
    module_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    stage TEXT DEFAULT 'ready',
    yard_id TEXT,
    transport_company_id TEXT,
    scheduled_date TEXT,
    shuttle_destination_yard_id TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (module_id) REFERENCES modules(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Yards table
CREATE TABLE IF NOT EXISTS yards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    capacity INTEGER,
    is_autovol INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Transport companies
CREATE TABLE IF NOT EXISTS transport_companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Engineering issues (RFI tracking)
CREATE TABLE IF NOT EXISTS engineering_issues (
    id TEXT PRIMARY KEY,
    module_id TEXT,
    project_id TEXT,
    station TEXT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    reported_by TEXT,
    assigned_to TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    resolved_at TEXT,
    FOREIGN KEY (module_id) REFERENCES modules(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Issue history (audit trail)
CREATE TABLE IF NOT EXISTS issue_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    performed_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (issue_id) REFERENCES engineering_issues(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_modules_project ON modules(project_id);
CREATE INDEX IF NOT EXISTS idx_modules_status ON modules(status);
CREATE INDEX IF NOT EXISTS idx_stage_progress_module ON module_stage_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_transport_stage ON transport_modules(stage);
CREATE INDEX IF NOT EXISTS idx_issues_status ON engineering_issues(status);
