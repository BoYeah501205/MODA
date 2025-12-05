// ============================================================================
// Projects API Routes
// CRUD operations for projects and their modules
// ============================================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

const router = Router();

// GET /api/projects - List all projects
router.get('/', (req, res, next) => {
    try {
        const includeDeleted = req.query.includeDeleted === 'true';
        
        let sql = `
            SELECT p.*, 
                   COUNT(m.id) as module_count
            FROM projects p
            LEFT JOIN modules m ON m.project_id = p.id
        `;
        
        if (!includeDeleted) {
            sql += ' WHERE p.deleted_at IS NULL';
        }
        
        sql += ' GROUP BY p.id ORDER BY p.created_at DESC';
        
        const projects = db.queryAll(sql);
        
        // Fetch modules for each project
        const projectsWithModules = projects.map(project => {
            const modules = db.queryAll(
                'SELECT * FROM modules WHERE project_id = ? ORDER BY build_sequence',
                [project.id]
            );
            
            // Fetch stage progress for each module
            const modulesWithProgress = modules.map(mod => {
                const progress = db.queryAll(
                    'SELECT stage_id, progress FROM module_stage_progress WHERE module_id = ?',
                    [mod.id]
                );
                const difficulties = db.queryOne(
                    'SELECT * FROM module_difficulties WHERE module_id = ?',
                    [mod.id]
                );
                
                return {
                    ...mod,
                    stageProgress: progress.reduce((acc, p) => {
                        acc[p.stage_id] = p.progress;
                        return acc;
                    }, {}),
                    difficulties: difficulties || {}
                };
            });
            
            return {
                ...project,
                modules: modulesWithProgress
            };
        });
        
        res.json(projectsWithModules);
    } catch (err) {
        next(err);
    }
});

// GET /api/projects/:id - Get single project
router.get('/:id', (req, res, next) => {
    try {
        const project = db.queryOne('SELECT * FROM projects WHERE id = ?', [req.params.id]);
        
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        // Fetch modules
        const modules = db.queryAll(
            'SELECT * FROM modules WHERE project_id = ? ORDER BY build_sequence',
            [project.id]
        );
        
        // Fetch stage progress and difficulties for each module
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
                ...mod,
                stageProgress: progress.reduce((acc, p) => {
                    acc[p.stage_id] = p.progress;
                    return acc;
                }, {}),
                difficulties: difficulties || {}
            };
        });
        
        res.json({
            ...project,
            modules: modulesWithDetails
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/projects - Create project
router.post('/', (req, res, next) => {
    try {
        const { id, name, client, location, status, description, modules } = req.body;
        const projectId = id || uuidv4();
        const now = new Date().toISOString();
        
        db.transaction(() => {
            // Insert project
            db.run(`
                INSERT INTO projects (id, name, client, location, status, description, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [projectId, name, client, location, status || 'Active', description, now, now]);
            
            // Insert modules if provided
            if (modules && modules.length > 0) {
                for (const mod of modules) {
                    const moduleId = mod.id || uuidv4();
                    
                    db.run(`
                        INSERT INTO modules (id, project_id, serial_number, build_sequence, blm_hitch, blm_rear, unit, width, length, sqft, status, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [moduleId, projectId, mod.serialNumber, mod.buildSequence, mod.blmHitch || mod.hitchBLM, mod.blmRear || mod.rearBLM, mod.unit || mod.hitchUnit, mod.width || mod.moduleWidth, mod.length || mod.moduleLength, mod.sqft || mod.squareFootage, mod.status || 'pending', now, now]);
                    
                    // Insert difficulties
                    if (mod.difficulties) {
                        db.run(`
                            INSERT INTO module_difficulties (module_id, sidewall, stair, hr3_wall, short, double_studio, sawbox)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `, [moduleId, mod.difficulties.sidewall ? 1 : 0, mod.difficulties.stair ? 1 : 0, mod.difficulties.hr3Wall ? 1 : 0, mod.difficulties.short ? 1 : 0, mod.difficulties.doubleStudio ? 1 : 0, mod.difficulties.sawbox ? 1 : 0]);
                    }
                    
                    // Insert stage progress
                    if (mod.stageProgress) {
                        for (const [stageId, progress] of Object.entries(mod.stageProgress)) {
                            db.run(`
                                INSERT INTO module_stage_progress (module_id, stage_id, progress)
                                VALUES (?, ?, ?)
                            `, [moduleId, stageId, progress]);
                        }
                    }
                }
            }
        });
        
        res.status(201).json({ id: projectId, message: 'Project created' });
    } catch (err) {
        next(err);
    }
});

// PUT /api/projects/:id - Update project
router.put('/:id', (req, res, next) => {
    try {
        const { name, client, location, status, description, modules } = req.body;
        const now = new Date().toISOString();
        
        const existing = db.queryOne('SELECT id FROM projects WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        db.transaction(() => {
            // Update project
            db.run(`
                UPDATE projects 
                SET name = COALESCE(?, name),
                    client = COALESCE(?, client),
                    location = COALESCE(?, location),
                    status = COALESCE(?, status),
                    description = COALESCE(?, description),
                    updated_at = ?
                WHERE id = ?
            `, [name, client, location, status, description, now, req.params.id]);
            
            // Update modules if provided
            if (modules) {
                for (const mod of modules) {
                    const moduleExists = db.queryOne('SELECT id FROM modules WHERE id = ?', [mod.id]);
                    
                    if (moduleExists) {
                        // Update existing module
                        db.run(`
                            UPDATE modules 
                            SET serial_number = COALESCE(?, serial_number),
                                build_sequence = COALESCE(?, build_sequence),
                                blm_hitch = COALESCE(?, blm_hitch),
                                blm_rear = COALESCE(?, blm_rear),
                                unit = COALESCE(?, unit),
                                width = COALESCE(?, width),
                                length = COALESCE(?, length),
                                sqft = COALESCE(?, sqft),
                                status = COALESCE(?, status),
                                updated_at = ?
                            WHERE id = ?
                        `, [mod.serialNumber, mod.buildSequence, mod.blmHitch || mod.hitchBLM, mod.blmRear || mod.rearBLM, mod.unit || mod.hitchUnit, mod.width || mod.moduleWidth, mod.length || mod.moduleLength, mod.sqft || mod.squareFootage, mod.status, now, mod.id]);
                    } else {
                        // Insert new module
                        const moduleId = mod.id || uuidv4();
                        db.run(`
                            INSERT INTO modules (id, project_id, serial_number, build_sequence, blm_hitch, blm_rear, unit, width, length, sqft, status, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [moduleId, req.params.id, mod.serialNumber, mod.buildSequence, mod.blmHitch || mod.hitchBLM, mod.blmRear || mod.rearBLM, mod.unit || mod.hitchUnit, mod.width || mod.moduleWidth, mod.length || mod.moduleLength, mod.sqft || mod.squareFootage, mod.status || 'pending', now, now]);
                    }
                    
                    // Update stage progress
                    if (mod.stageProgress) {
                        for (const [stageId, progress] of Object.entries(mod.stageProgress)) {
                            db.run(`
                                INSERT OR REPLACE INTO module_stage_progress (module_id, stage_id, progress, updated_at)
                                VALUES (?, ?, ?, ?)
                            `, [mod.id, stageId, progress, now]);
                        }
                    }
                    
                    // Update difficulties
                    if (mod.difficulties) {
                        db.run(`
                            INSERT OR REPLACE INTO module_difficulties (module_id, sidewall, stair, hr3_wall, short, double_studio, sawbox)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `, [mod.id, mod.difficulties.sidewall ? 1 : 0, mod.difficulties.stair ? 1 : 0, mod.difficulties.hr3Wall ? 1 : 0, mod.difficulties.short ? 1 : 0, mod.difficulties.doubleStudio ? 1 : 0, mod.difficulties.sawbox ? 1 : 0]);
                    }
                }
            }
        });
        
        res.json({ message: 'Project updated' });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/projects/:id - Soft delete project
router.delete('/:id', (req, res, next) => {
    try {
        const now = new Date().toISOString();
        const result = db.run(
            'UPDATE projects SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL',
            [now, req.params.id]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Project not found or already deleted' });
        }
        
        res.json({ message: 'Project deleted' });
    } catch (err) {
        next(err);
    }
});

// POST /api/projects/:id/restore - Restore deleted project
router.post('/:id/restore', (req, res, next) => {
    try {
        const result = db.run(
            'UPDATE projects SET deleted_at = NULL WHERE id = ?',
            [req.params.id]
        );
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        res.json({ message: 'Project restored' });
    } catch (err) {
        next(err);
    }
});

export default router;
