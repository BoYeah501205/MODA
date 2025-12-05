// ============================================================================
// Sync API Routes
// Import/Export for migrating from localStorage to database
// ============================================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

const router = Router();

// POST /api/sync/import - Import data from localStorage export
router.post('/import', (req, res, next) => {
    try {
        const { projects, employees, departments, trashedProjects, trashedEmployees } = req.body;
        const now = new Date().toISOString();
        
        const stats = {
            projects: 0,
            modules: 0,
            employees: 0,
            departments: 0
        };
        
        db.transaction(() => {
            // Import projects
            if (projects && Array.isArray(projects)) {
                for (const project of projects) {
                    // Check if project exists
                    const existing = db.queryOne('SELECT id FROM projects WHERE id = ?', [project.id]);
                    
                    if (!existing) {
                        db.run(`
                            INSERT INTO projects (id, name, client, location, status, description, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            project.id || uuidv4(),
                            project.name,
                            project.client,
                            project.location,
                            project.status || 'Active',
                            project.description,
                            project.createdAt || now,
                            project.updatedAt || now
                        ]);
                        stats.projects++;
                    }
                    
                    // Import modules
                    if (project.modules && Array.isArray(project.modules)) {
                        for (const mod of project.modules) {
                            const modExists = db.queryOne('SELECT id FROM modules WHERE id = ?', [mod.id]);
                            
                            if (!modExists) {
                                const moduleId = mod.id || uuidv4();
                                
                                db.run(`
                                    INSERT INTO modules (id, project_id, serial_number, build_sequence, blm_hitch, blm_rear, unit, width, length, sqft, status, current_phase, created_at, updated_at)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                `, [
                                    moduleId,
                                    project.id,
                                    mod.serialNumber,
                                    mod.buildSequence,
                                    mod.blmHitch || mod.hitchBLM,
                                    mod.blmRear || mod.rearBLM,
                                    mod.unit || mod.hitchUnit,
                                    mod.width || mod.moduleWidth,
                                    mod.length || mod.moduleLength,
                                    mod.sqft || mod.squareFootage,
                                    mod.status || 'pending',
                                    mod.currentPhase || 'production',
                                    mod.createdAt || now,
                                    mod.updatedAt || now
                                ]);
                                
                                // Import difficulties
                                if (mod.difficulties) {
                                    db.run(`
                                        INSERT OR REPLACE INTO module_difficulties (module_id, sidewall, stair, hr3_wall, short, double_studio, sawbox)
                                        VALUES (?, ?, ?, ?, ?, ?, ?)
                                    `, [
                                        moduleId,
                                        mod.difficulties.sidewall ? 1 : 0,
                                        mod.difficulties.stair ? 1 : 0,
                                        mod.difficulties.hr3Wall ? 1 : 0,
                                        mod.difficulties.short ? 1 : 0,
                                        mod.difficulties.doubleStudio ? 1 : 0,
                                        mod.difficulties.sawbox ? 1 : 0
                                    ]);
                                }
                                
                                // Import stage progress
                                if (mod.stageProgress) {
                                    for (const [stageId, progress] of Object.entries(mod.stageProgress)) {
                                        db.run(`
                                            INSERT OR REPLACE INTO module_stage_progress (module_id, stage_id, progress, updated_at)
                                            VALUES (?, ?, ?, ?)
                                        `, [moduleId, stageId, progress, now]);
                                    }
                                }
                                
                                stats.modules++;
                            }
                        }
                    }
                }
            }
            
            // Import trashed projects
            if (trashedProjects && Array.isArray(trashedProjects)) {
                for (const project of trashedProjects) {
                    const existing = db.queryOne('SELECT id FROM projects WHERE id = ?', [project.id]);
                    
                    if (!existing) {
                        db.run(`
                            INSERT INTO projects (id, name, client, location, status, description, created_at, updated_at, deleted_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            project.id || uuidv4(),
                            project.name,
                            project.client,
                            project.location,
                            project.status || 'Active',
                            project.description,
                            project.createdAt || now,
                            project.updatedAt || now,
                            project.deletedAt ? new Date(project.deletedAt).toISOString() : now
                        ]);
                    }
                }
            }
            
            // Import employees
            if (employees && Array.isArray(employees)) {
                for (const emp of employees) {
                    const existing = db.queryOne('SELECT id FROM employees WHERE id = ?', [emp.id]);
                    
                    if (!existing) {
                        db.run(`
                            INSERT INTO employees (id, name, email, phone, role, department, hire_date, status, avatar_url, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            emp.id || uuidv4(),
                            emp.name,
                            emp.email,
                            emp.phone,
                            emp.role,
                            emp.department,
                            emp.hireDate,
                            emp.status || 'active',
                            emp.avatarUrl || emp.avatar,
                            emp.createdAt || now,
                            emp.updatedAt || now
                        ]);
                        stats.employees++;
                    }
                }
            }
            
            // Import trashed employees
            if (trashedEmployees && Array.isArray(trashedEmployees)) {
                for (const emp of trashedEmployees) {
                    const existing = db.queryOne('SELECT id FROM employees WHERE id = ?', [emp.id]);
                    
                    if (!existing) {
                        db.run(`
                            INSERT INTO employees (id, name, email, phone, role, department, hire_date, status, avatar_url, created_at, updated_at, deleted_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            emp.id || uuidv4(),
                            emp.name,
                            emp.email,
                            emp.phone,
                            emp.role,
                            emp.department,
                            emp.hireDate,
                            emp.status || 'active',
                            emp.avatarUrl || emp.avatar,
                            emp.createdAt || now,
                            emp.updatedAt || now,
                            emp.deletedAt ? new Date(emp.deletedAt).toISOString() : now
                        ]);
                    }
                }
            }
            
            // Import departments
            if (departments && Array.isArray(departments)) {
                for (const dept of departments) {
                    const existing = db.queryOne('SELECT id FROM departments WHERE id = ?', [dept.id]);
                    
                    if (!existing) {
                        db.run(`
                            INSERT INTO departments (id, name, supervisor_id)
                            VALUES (?, ?, ?)
                        `, [
                            dept.id || uuidv4(),
                            dept.name,
                            dept.supervisor || dept.supervisorId
                        ]);
                        stats.departments++;
                    }
                }
            }
        });
        
        res.json({
            message: 'Import completed',
            stats
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/sync/export - Export all data (for backup or localStorage sync)
router.get('/export', (req, res, next) => {
    try {
        // Get all projects with modules
        const projects = db.queryAll('SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC');
        
        const projectsWithModules = projects.map(project => {
            const modules = db.queryAll(
                'SELECT * FROM modules WHERE project_id = ? ORDER BY build_sequence',
                [project.id]
            );
            
            const modulesWithDetails = modules.map(mod => {
                const progress = db.queryAll(
                    'SELECT stage_id, progress FROM module_stage_progress WHERE module_id = ?',
                    [mod.id]
                );
                const difficulties = db.queryOne(
                    'SELECT * FROM module_difficulties WHERE module_id = ?',
                    [mod.id]
                );
                
                return {
                    id: mod.id,
                    serialNumber: mod.serial_number,
                    buildSequence: mod.build_sequence,
                    hitchBLM: mod.blm_hitch,
                    blmHitch: mod.blm_hitch,
                    rearBLM: mod.blm_rear,
                    blmRear: mod.blm_rear,
                    hitchUnit: mod.unit,
                    unit: mod.unit,
                    moduleWidth: mod.width,
                    width: mod.width,
                    moduleLength: mod.length,
                    length: mod.length,
                    squareFootage: mod.sqft,
                    sqft: mod.sqft,
                    status: mod.status,
                    currentPhase: mod.current_phase,
                    stageProgress: progress.reduce((acc, p) => {
                        acc[p.stage_id] = p.progress;
                        return acc;
                    }, {}),
                    difficulties: difficulties ? {
                        sidewall: !!difficulties.sidewall,
                        stair: !!difficulties.stair,
                        hr3Wall: !!difficulties.hr3_wall,
                        short: !!difficulties.short,
                        doubleStudio: !!difficulties.double_studio,
                        sawbox: !!difficulties.sawbox
                    } : {},
                    createdAt: mod.created_at,
                    updatedAt: mod.updated_at
                };
            });
            
            return {
                id: project.id,
                name: project.name,
                client: project.client,
                location: project.location,
                status: project.status,
                description: project.description,
                createdAt: project.created_at,
                updatedAt: project.updated_at,
                modules: modulesWithDetails
            };
        });
        
        // Get trashed projects
        const trashedProjects = db.queryAll('SELECT * FROM projects WHERE deleted_at IS NOT NULL').map(p => ({
            ...p,
            deletedAt: new Date(p.deleted_at).getTime()
        }));
        
        // Get employees
        const employees = db.queryAll('SELECT * FROM employees WHERE deleted_at IS NULL').map(e => ({
            id: e.id,
            name: e.name,
            email: e.email,
            phone: e.phone,
            role: e.role,
            department: e.department,
            hireDate: e.hire_date,
            status: e.status,
            avatar: e.avatar_url,
            avatarUrl: e.avatar_url
        }));
        
        // Get trashed employees
        const trashedEmployees = db.queryAll('SELECT * FROM employees WHERE deleted_at IS NOT NULL').map(e => ({
            id: e.id,
            name: e.name,
            email: e.email,
            phone: e.phone,
            role: e.role,
            department: e.department,
            hireDate: e.hire_date,
            status: e.status,
            avatar: e.avatar_url,
            deletedAt: new Date(e.deleted_at).getTime()
        }));
        
        // Get departments
        const departments = db.queryAll('SELECT * FROM departments').map(d => ({
            id: d.id,
            name: d.name,
            supervisor: d.supervisor_id,
            supervisorId: d.supervisor_id
        }));
        
        res.json({
            exportDate: new Date().toISOString(),
            version: '1.0',
            projects: projectsWithModules,
            trashedProjects,
            employees,
            trashedEmployees,
            departments
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/sync/stats - Get database statistics
router.get('/stats', (req, res, next) => {
    try {
        const stats = {
            projects: db.queryOne('SELECT COUNT(*) as count FROM projects WHERE deleted_at IS NULL')?.count || 0,
            trashedProjects: db.queryOne('SELECT COUNT(*) as count FROM projects WHERE deleted_at IS NOT NULL')?.count || 0,
            modules: db.queryOne('SELECT COUNT(*) as count FROM modules')?.count || 0,
            employees: db.queryOne('SELECT COUNT(*) as count FROM employees WHERE deleted_at IS NULL')?.count || 0,
            trashedEmployees: db.queryOne('SELECT COUNT(*) as count FROM employees WHERE deleted_at IS NOT NULL')?.count || 0,
            departments: db.queryOne('SELECT COUNT(*) as count FROM departments')?.count || 0,
            yards: db.queryOne('SELECT COUNT(*) as count FROM yards')?.count || 0,
            transportCompanies: db.queryOne('SELECT COUNT(*) as count FROM transport_companies')?.count || 0,
            transportModules: db.queryOne('SELECT COUNT(*) as count FROM transport_modules')?.count || 0,
            engineeringIssues: db.queryOne('SELECT COUNT(*) as count FROM engineering_issues')?.count || 0
        };
        
        res.json(stats);
    } catch (err) {
        next(err);
    }
});

export default router;
