// ============================================================================
// Transport API Routes
// Yard management and shipping/transport tracking
// ============================================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

const router = Router();

// ===== Transport Modules =====

// GET /api/transport - List all transport modules
router.get('/', (req, res, next) => {
    try {
        const { stage, projectId, yardId } = req.query;
        
        let sql = `
            SELECT tm.*, 
                   m.serial_number, m.blm_hitch, m.blm_rear, m.unit,
                   p.name as project_name,
                   y.name as yard_name,
                   tc.name as transport_company_name,
                   dy.name as shuttle_destination_name
            FROM transport_modules tm
            JOIN modules m ON m.id = tm.module_id
            JOIN projects p ON p.id = tm.project_id
            LEFT JOIN yards y ON y.id = tm.yard_id
            LEFT JOIN transport_companies tc ON tc.id = tm.transport_company_id
            LEFT JOIN yards dy ON dy.id = tm.shuttle_destination_yard_id
            WHERE 1=1
        `;
        const params = [];
        
        if (stage) {
            sql += ' AND tm.stage = ?';
            params.push(stage);
        }
        if (projectId) {
            sql += ' AND tm.project_id = ?';
            params.push(projectId);
        }
        if (yardId) {
            sql += ' AND tm.yard_id = ?';
            params.push(yardId);
        }
        
        sql += ' ORDER BY tm.updated_at DESC';
        
        const modules = db.queryAll(sql, params);
        res.json(modules);
    } catch (err) {
        next(err);
    }
});

// GET /api/transport/:id - Get single transport module
router.get('/:id', (req, res, next) => {
    try {
        const module = db.queryOne(`
            SELECT tm.*, 
                   m.serial_number, m.blm_hitch, m.blm_rear, m.unit,
                   p.name as project_name,
                   y.name as yard_name,
                   tc.name as transport_company_name
            FROM transport_modules tm
            JOIN modules m ON m.id = tm.module_id
            JOIN projects p ON p.id = tm.project_id
            LEFT JOIN yards y ON y.id = tm.yard_id
            LEFT JOIN transport_companies tc ON tc.id = tm.transport_company_id
            WHERE tm.id = ?
        `, [req.params.id]);
        
        if (!module) {
            return res.status(404).json({ error: 'Transport module not found' });
        }
        
        res.json(module);
    } catch (err) {
        next(err);
    }
});

// POST /api/transport - Create transport module entry
router.post('/', (req, res, next) => {
    try {
        const { moduleId, projectId, stage, yardId, transportCompanyId, scheduledDate, shuttleDestinationYardId, notes } = req.body;
        
        if (!moduleId || !projectId) {
            return res.status(400).json({ error: 'moduleId and projectId are required' });
        }
        
        const id = req.body.id || uuidv4();
        const now = new Date().toISOString();
        
        db.run(`
            INSERT INTO transport_modules (id, module_id, project_id, stage, yard_id, transport_company_id, scheduled_date, shuttle_destination_yard_id, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [id, moduleId, projectId, stage || 'ready', yardId, transportCompanyId, scheduledDate, shuttleDestinationYardId, notes, now, now]);
        
        res.status(201).json({ id, message: 'Transport module created' });
    } catch (err) {
        next(err);
    }
});

// PUT /api/transport/:id - Update transport module
router.put('/:id', (req, res, next) => {
    try {
        const { stage, yardId, transportCompanyId, scheduledDate, shuttleDestinationYardId, notes } = req.body;
        const now = new Date().toISOString();
        
        const existing = db.queryOne('SELECT id FROM transport_modules WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Transport module not found' });
        }
        
        db.run(`
            UPDATE transport_modules 
            SET stage = COALESCE(?, stage),
                yard_id = ?,
                transport_company_id = ?,
                scheduled_date = ?,
                shuttle_destination_yard_id = ?,
                notes = COALESCE(?, notes),
                updated_at = ?
            WHERE id = ?
        `, [stage, yardId, transportCompanyId, scheduledDate, shuttleDestinationYardId, notes, now, req.params.id]);
        
        res.json({ message: 'Transport module updated' });
    } catch (err) {
        next(err);
    }
});

// ===== Yards =====

// GET /api/transport/yards/list - List all yards
router.get('/yards/list', (req, res, next) => {
    try {
        const yards = db.queryAll('SELECT * FROM yards ORDER BY name');
        
        // Add module counts
        const yardsWithCounts = yards.map(yard => {
            const count = db.queryOne(
                'SELECT COUNT(*) as count FROM transport_modules WHERE yard_id = ? AND stage NOT IN (?, ?)',
                [yard.id, 'inTransit', 'arrived']
            );
            return {
                ...yard,
                isAutovol: !!yard.is_autovol,
                moduleCount: count?.count || 0
            };
        });
        
        res.json(yardsWithCounts);
    } catch (err) {
        next(err);
    }
});

// POST /api/transport/yards - Create yard
router.post('/yards', (req, res, next) => {
    try {
        const { name, location, capacity, isAutovol } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'name is required' });
        }
        
        const id = req.body.id || uuidv4();
        
        db.run(`
            INSERT INTO yards (id, name, location, capacity, is_autovol)
            VALUES (?, ?, ?, ?, ?)
        `, [id, name, location, capacity, isAutovol ? 1 : 0]);
        
        res.status(201).json({ id, message: 'Yard created' });
    } catch (err) {
        next(err);
    }
});

// PUT /api/transport/yards/:id - Update yard
router.put('/yards/:id', (req, res, next) => {
    try {
        const { name, location, capacity, isAutovol } = req.body;
        
        db.run(`
            UPDATE yards 
            SET name = COALESCE(?, name),
                location = COALESCE(?, location),
                capacity = COALESCE(?, capacity),
                is_autovol = ?
            WHERE id = ?
        `, [name, location, capacity, isAutovol ? 1 : 0, req.params.id]);
        
        res.json({ message: 'Yard updated' });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/transport/yards/:id - Delete yard
router.delete('/yards/:id', (req, res, next) => {
    try {
        // Check if yard has modules
        const count = db.queryOne(
            'SELECT COUNT(*) as count FROM transport_modules WHERE yard_id = ?',
            [req.params.id]
        );
        
        if (count?.count > 0) {
            return res.status(400).json({ error: 'Cannot delete yard with modules' });
        }
        
        db.run('DELETE FROM yards WHERE id = ?', [req.params.id]);
        res.json({ message: 'Yard deleted' });
    } catch (err) {
        next(err);
    }
});

// ===== Transport Companies =====

// GET /api/transport/companies/list - List all transport companies
router.get('/companies/list', (req, res, next) => {
    try {
        const companies = db.queryAll('SELECT * FROM transport_companies ORDER BY name');
        res.json(companies);
    } catch (err) {
        next(err);
    }
});

// POST /api/transport/companies - Create transport company
router.post('/companies', (req, res, next) => {
    try {
        const { name, contactName, phone, email } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'name is required' });
        }
        
        const id = req.body.id || uuidv4();
        
        db.run(`
            INSERT INTO transport_companies (id, name, contact_name, phone, email)
            VALUES (?, ?, ?, ?, ?)
        `, [id, name, contactName, phone, email]);
        
        res.status(201).json({ id, message: 'Transport company created' });
    } catch (err) {
        next(err);
    }
});

// PUT /api/transport/companies/:id - Update transport company
router.put('/companies/:id', (req, res, next) => {
    try {
        const { name, contactName, phone, email } = req.body;
        
        db.run(`
            UPDATE transport_companies 
            SET name = COALESCE(?, name),
                contact_name = COALESCE(?, contact_name),
                phone = COALESCE(?, phone),
                email = COALESCE(?, email)
            WHERE id = ?
        `, [name, contactName, phone, email, req.params.id]);
        
        res.json({ message: 'Transport company updated' });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/transport/companies/:id - Delete transport company
router.delete('/companies/:id', (req, res, next) => {
    try {
        db.run('DELETE FROM transport_companies WHERE id = ?', [req.params.id]);
        res.json({ message: 'Transport company deleted' });
    } catch (err) {
        next(err);
    }
});

export default router;
