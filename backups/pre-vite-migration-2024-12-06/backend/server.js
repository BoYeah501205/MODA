// ============================================================================
// MODA Backend API Server
// Express server with SQLite database
// ============================================================================

import express from 'express';
import cors from 'cors';
import { initDatabase, getDatabase, closeDatabase, queryOne } from './db/database.js';

// Import route modules
import projectRoutes from './routes/projects.js';
import moduleRoutes from './routes/modules.js';
import employeeRoutes from './routes/employees.js';
import transportRoutes from './routes/transport.js';
import syncRoutes from './routes/sync.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Database initialization flag
let dbReady = false;

// ===== Middleware =====
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        
        // Allow localhost and any IP on common dev ports
        const allowedPatterns = [
            /^http:\/\/localhost(:\d+)?$/,
            /^http:\/\/127\.0\.0\.1(:\d+)?$/,
            /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/,  // Local network IPs
            /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,   // Private network IPs
        ];
        
        const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
        callback(null, isAllowed);
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ===== Health Check =====
app.get('/api/health', (req, res) => {
    try {
        if (!dbReady) {
            return res.status(503).json({ status: 'starting', message: 'Database initializing...' });
        }
        const result = queryOne('SELECT 1 as ok');
        res.json({ 
            status: 'healthy', 
            database: result && result.ok === 1 ? 'connected' : 'error',
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        res.status(500).json({ status: 'unhealthy', error: err.message });
    }
});

// ===== API Routes =====
app.use('/api/projects', projectRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/sync', syncRoutes);

// ===== Error Handler =====
app.use((err, req, res, next) => {
    console.error('[Error]', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ===== 404 Handler =====
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// ===== Graceful Shutdown =====
process.on('SIGINT', () => {
    console.log('\n[Server] Shutting down...');
    closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n[Server] Shutting down...');
    closeDatabase();
    process.exit(0);
});

// ===== Start Server =====
async function startServer() {
    try {
        console.log('[Server] Initializing database...');
        await initDatabase();
        dbReady = true;
        console.log('[Server] Database ready!');
        
        app.listen(PORT, () => {
            console.log(`
╔════════════════════════════════════════════════════════════╗
║                  MODA Backend API Server                   ║
╠════════════════════════════════════════════════════════════╣
║  Status:    Running                                        ║
║  Port:      ${PORT}                                           ║
║  API Base:  http://localhost:${PORT}/api                      ║
╚════════════════════════════════════════════════════════════╝

Endpoints:
  GET  /api/health          - Health check
  
  Projects:
  GET  /api/projects        - List all projects
  GET  /api/projects/:id    - Get project by ID
  POST /api/projects        - Create project
  PUT  /api/projects/:id    - Update project
  DEL  /api/projects/:id    - Delete project
  
  Modules:
  GET  /api/modules         - List all modules
  GET  /api/modules/:id     - Get module by ID
  POST /api/modules         - Create module
  PUT  /api/modules/:id     - Update module
  
  Employees:
  GET  /api/employees       - List all employees
  POST /api/employees       - Create employee
  PUT  /api/employees/:id   - Update employee
  
  Transport:
  GET  /api/transport       - List transport modules
  PUT  /api/transport/:id   - Update transport status
  
  Sync:
  POST /api/sync/import     - Import data from localStorage
  GET  /api/sync/export     - Export all data

Press Ctrl+C to stop
`);
        });
    } catch (err) {
        console.error('[Server] Failed to start:', err);
        process.exit(1);
    }
}

startServer();
