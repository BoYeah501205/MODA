// ============================================================================
// Employees API Routes
// CRUD operations for employees and departments
// ============================================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

const router = Router();

// GET /api/employees - List all employees
router.get('/', (req, res, next) => {
    try {
        const { department, status, includeDeleted } = req.query;
        
        let sql = 'SELECT * FROM employees WHERE 1=1';
        const params = [];
        
        if (!includeDeleted || includeDeleted !== 'true') {
            sql += ' AND deleted_at IS NULL';
        }
        if (department) {
            sql += ' AND department = ?';
            params.push(department);
        }
        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }
        
        sql += ' ORDER BY name';
        
        const employees = db.queryAll(sql, params);
        res.json(employees);
    } catch (err) {
        next(err);
    }
});

// GET /api/employees/:id - Get single employee
router.get('/:id', (req, res, next) => {
    try {
        const employee = db.queryOne('SELECT * FROM employees WHERE id = ?', [req.params.id]);
        
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        res.json(employee);
    } catch (err) {
        next(err);
    }
});

// POST /api/employees - Create employee
router.post('/', (req, res, next) => {
    try {
        const { name, email, phone, role, department, hireDate, status, avatarUrl } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'name is required' });
        }
        
        const employeeId = req.body.id || uuidv4();
        const now = new Date().toISOString();
        
        db.run(`
            INSERT INTO employees (id, name, email, phone, role, department, hire_date, status, avatar_url, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [employeeId, name, email, phone, role, department, hireDate, status || 'active', avatarUrl, now, now]);
        
        res.status(201).json({ id: employeeId, message: 'Employee created' });
    } catch (err) {
        next(err);
    }
});

// PUT /api/employees/:id - Update employee
router.put('/:id', (req, res, next) => {
    try {
        const { name, email, phone, role, department, hireDate, status, avatarUrl } = req.body;
        const now = new Date().toISOString();
        
        const existing = db.queryOne('SELECT id FROM employees WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        db.run(`
            UPDATE employees 
            SET name = COALESCE(?, name),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                role = COALESCE(?, role),
                department = COALESCE(?, department),
                hire_date = COALESCE(?, hire_date),
                status = COALESCE(?, status),
                avatar_url = COALESCE(?, avatar_url),
                updated_at = ?
            WHERE id = ?
        `, [name, email, phone, role, department, hireDate, status, avatarUrl, now, req.params.id]);
        
        res.json({ message: 'Employee updated' });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/employees/:id - Soft delete employee
router.delete('/:id', (req, res, next) => {
    try {
        const now = new Date().toISOString();
        const result = db.run(
            'UPDATE employees SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL',
            [now, req.params.id]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Employee not found or already deleted' });
        }
        
        res.json({ message: 'Employee deleted' });
    } catch (err) {
        next(err);
    }
});

// POST /api/employees/:id/restore - Restore deleted employee
router.post('/:id/restore', (req, res, next) => {
    try {
        const result = db.run(
            'UPDATE employees SET deleted_at = NULL WHERE id = ?',
            [req.params.id]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        
        res.json({ message: 'Employee restored' });
    } catch (err) {
        next(err);
    }
});

// ===== Departments =====

// GET /api/employees/departments/list - List all departments
router.get('/departments/list', (req, res, next) => {
    try {
        const departments = db.queryAll(`
            SELECT d.*, e.name as supervisor_name
            FROM departments d
            LEFT JOIN employees e ON e.id = d.supervisor_id
            ORDER BY d.name
        `);
        res.json(departments);
    } catch (err) {
        next(err);
    }
});

// POST /api/employees/departments - Create department
router.post('/departments', (req, res, next) => {
    try {
        const { name, supervisorId } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'name is required' });
        }
        
        const deptId = req.body.id || uuidv4();
        
        db.run(`
            INSERT INTO departments (id, name, supervisor_id)
            VALUES (?, ?, ?)
        `, [deptId, name, supervisorId]);
        
        res.status(201).json({ id: deptId, message: 'Department created' });
    } catch (err) {
        next(err);
    }
});

// PUT /api/employees/departments/:id - Update department
router.put('/departments/:id', (req, res, next) => {
    try {
        const { name, supervisorId } = req.body;
        
        db.run(`
            UPDATE departments 
            SET name = COALESCE(?, name),
                supervisor_id = ?
            WHERE id = ?
        `, [name, supervisorId, req.params.id]);
        
        res.json({ message: 'Department updated' });
    } catch (err) {
        next(err);
    }
});

export default router;
