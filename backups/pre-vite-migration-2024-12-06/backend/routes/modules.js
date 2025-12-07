// ============================================================================
// Modules API Routes
// CRUD operations for modules and stage progress
// ============================================================================

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database.js';

const router = Router();

// GET /api/modules - List all modules
router.get('/', (req, res, next) => {
    try {
        const { projectId, status, phase } = req.query;
        
        let sql = `
            SELECT m.*, p.name as project_name
            FROM modules m
            JOIN projects p ON p.id = m.project_id
            WHERE p.deleted_at IS NULL
        `;
        const params = [];
        
        if (projectId) {
            sql += ' AND m.project_id = ?';
            params.push(projectId);
        }
        if (status) {
            sql += ' AND m.status = ?';
            params.push(status);
        }
        if (phase) {
            sql += ' AND m.current_phase = ?';
            params.push(phase);
        }
        
        sql += ' ORDER BY m.build_sequence';
        
        const modules = db.queryAll(sql, params);
        
        // Enrich with stage progress and difficulties
        const enrichedModules = modules.map(mod => {
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
                difficulties: difficulties ? {
                    sidewall: !!difficulties.sidewall,
                    stair: !!difficulties.stair,
                    hr3Wall: !!difficulties.hr3_wall,
                    short: !!difficulties.short,
                    doubleStudio: !!difficulties.double_studio,
                    sawbox: !!difficulties.sawbox
                } : {}
            };
        });
        
        res.json(enrichedModules);
    } catch (err) {
        next(err);
    }
});

// GET /api/modules/:id - Get single module
router.get('/:id', (req, res, next) => {
    try {
        const module = db.queryOne(`
            SELECT m.*, p.name as project_name
            FROM modules m
            JOIN projects p ON p.id = m.project_id
            WHERE m.id = ?
        `, [req.params.id]);
        
        if (!module) {
            return res.status(404).json({ error: 'Module not found' });
        }
        
        const progress = db.queryAll(
            'SELECT stage_id, progress FROM module_stage_progress WHERE module_id = ?',
            [module.id]
        );
        const difficulties = db.queryOne(
            'SELECT * FROM module_difficulties WHERE module_id = ?',
            [module.id]
        );
        
        res.json({
            ...module,
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
            } : {}
        });
    } catch (err) {
        next(err);
    }
});

// POST /api/modules - Create module
router.post('/', (req, res, next) => {
    try {
        const { projectId, serialNumber, buildSequence, blmHitch, blmRear, unit, width, length, sqft, status, difficulties, stageProgress } = req.body;
        
        if (!projectId) {
            return res.status(400).json({ error: 'projectId is required' });
        }
        
        const moduleId = req.body.id || uuidv4();
        const now = new Date().toISOString();
        
        db.transaction(() => {
            db.run(`
                INSERT INTO modules (id, project_id, serial_number, build_sequence, blm_hitch, blm_rear, unit, width, length, sqft, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [moduleId, projectId, serialNumber, buildSequence, blmHitch, blmRear, unit, width, length, sqft, status || 'pending', now, now]);
            
            // Insert difficulties
            if (difficulties) {
                db.run(`
                    INSERT INTO module_difficulties (module_id, sidewall, stair, hr3_wall, short, double_studio, sawbox)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [moduleId, difficulties.sidewall ? 1 : 0, difficulties.stair ? 1 : 0, difficulties.hr3Wall ? 1 : 0, difficulties.short ? 1 : 0, difficulties.doubleStudio ? 1 : 0, difficulties.sawbox ? 1 : 0]);
            }
            
            // Insert stage progress
            if (stageProgress) {
                for (const [stageId, progress] of Object.entries(stageProgress)) {
                    db.run(`
                        INSERT INTO module_stage_progress (module_id, stage_id, progress)
                        VALUES (?, ?, ?)
                    `, [moduleId, stageId, progress]);
                }
            }
        });
        
        res.status(201).json({ id: moduleId, message: 'Module created' });
    } catch (err) {
        next(err);
    }
});

// PUT /api/modules/:id - Update module
router.put('/:id', (req, res, next) => {
    try {
        const { serialNumber, buildSequence, blmHitch, blmRear, unit, width, length, sqft, status, currentPhase, difficulties, stageProgress } = req.body;
        const now = new Date().toISOString();
        
        const existing = db.queryOne('SELECT id FROM modules WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Module not found' });
        }
        
        db.transaction(() => {
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
                    current_phase = COALESCE(?, current_phase),
                    updated_at = ?
                WHERE id = ?
            `, [serialNumber, buildSequence, blmHitch, blmRear, unit, width, length, sqft, status, currentPhase, now, req.params.id]);
            
            // Update difficulties
            if (difficulties) {
                db.run(`
                    INSERT OR REPLACE INTO module_difficulties (module_id, sidewall, stair, hr3_wall, short, double_studio, sawbox)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [req.params.id, difficulties.sidewall ? 1 : 0, difficulties.stair ? 1 : 0, difficulties.hr3Wall ? 1 : 0, difficulties.short ? 1 : 0, difficulties.doubleStudio ? 1 : 0, difficulties.sawbox ? 1 : 0]);
            }
            
            // Update stage progress
            if (stageProgress) {
                for (const [stageId, progress] of Object.entries(stageProgress)) {
                    db.run(`
                        INSERT OR REPLACE INTO module_stage_progress (module_id, stage_id, progress, updated_at)
                        VALUES (?, ?, ?, ?)
                    `, [req.params.id, stageId, progress, now]);
                }
            }
        });
        
        res.json({ message: 'Module updated' });
    } catch (err) {
        next(err);
    }
});

// PUT /api/modules/:id/progress - Update stage progress only
router.put('/:id/progress', (req, res, next) => {
    try {
        const { stageId, progress } = req.body;
        const now = new Date().toISOString();
        
        if (!stageId || progress === undefined) {
            return res.status(400).json({ error: 'stageId and progress are required' });
        }
        
        db.run(`
            INSERT OR REPLACE INTO module_stage_progress (module_id, stage_id, progress, updated_at)
            VALUES (?, ?, ?, ?)
        `, [req.params.id, stageId, progress, now]);
        
        // Also update module's updated_at
        db.run('UPDATE modules SET updated_at = ? WHERE id = ?', [now, req.params.id]);
        
        res.json({ message: 'Progress updated' });
    } catch (err) {
        next(err);
    }
});

// DELETE /api/modules/:id - Delete module
router.delete('/:id', (req, res, next) => {
    try {
        const result = db.run('DELETE FROM modules WHERE id = ?', [req.params.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Module not found' });
        }
        
        res.json({ message: 'Module deleted' });
    } catch (err) {
        next(err);
    }
});

export default router;
