// MODA Core - Unified Data Layer and Dashboard Roles
// Extracted from index.html for optimization

        // ===== UNIFIED MODULE SYSTEM =====
        // This layer provides a consistent data structure for tracking Modules
        // throughout their entire lifecycle: Production → Transport → On-Site → Complete
        
        const MODA_UNIFIED = {
            VERSION: '1.0.0',
            STORAGE_KEY: 'autovol_unified_modules',
            
            // Lifecycle phases
            PHASES: {
                PRODUCTION: 'production',
                YARD: 'yard',           // Module complete, sitting in staging yard
                TRANSPORT: 'transport', // Scheduled for transit
                ONSITE: 'onsite',
                COMPLETE: 'complete'
            },
            
            // Transport stages (matching Transportation Program)
            TRANSPORT_STAGES: {
                NOT_STARTED: 'not-started',
                READY: 'ready',
                STAGED: 'staged',
                SCHEDULED_TRANSIT: 'scheduledTransit',
                SCHEDULED_SHUTTLE: 'scheduledShuttle',
                IN_TRANSIT: 'inTransit',
                ARRIVED: 'arrived'
            },
            
            // On-Site stages
            ONSITE_STAGES: {
                NOT_STARTED: 'not-started',
                DELIVERED: 'delivered',
                SET: 'set',
                STITCHED: 'stitched',
                COMPLETE: 'complete'
            },
            
            // Create a new unified Module record from existing project module
            createUnifiedModule: function(projectModule, projectId, projectName) {
                const now = new Date().toISOString();
                
                // Determine current phase based on stageProgress
                const stageProgress = projectModule.stageProgress || {};
                const allStagesComplete = Object.values(stageProgress).every(v => v === 100);
                const hasAnyProgress = Object.values(stageProgress).some(v => v > 0);
                
                let currentPhase = this.PHASES.PRODUCTION;
                if (allStagesComplete) {
                    currentPhase = this.PHASES.YARD; // Production complete, in staging yard
                }
                
                return {
                    // Core Identity
                    id: projectModule.id,
                    serialNumber: projectModule.serialNumber,
                    projectId: projectId,
                    projectName: projectName,
                    
                    // Module Specifications
                    specs: {
                        blmHitch: projectModule.blmHitch || '',
                        blmRear: projectModule.blmRear || '',
                        unit: projectModule.unit || '',
                        width: projectModule.width || '',
                        length: projectModule.length || '',
                        sqft: projectModule.sqft || '',
                        difficulties: projectModule.difficulties || {
                            sidewall: false,
                            stair: false,
                            hr3Wall: false,
                            short: false,
                            doubleStudio: false,
                            sawbox: false
                        }
                    },
                    
                    // Current Lifecycle Phase
                    currentPhase: currentPhase,
                    
                    // Production Data
                    production: {
                        buildSequence: projectModule.buildSequence || 0,
                        status: projectModule.status || 'scheduled',
                        stageProgress: stageProgress,
                        completedAt: allStagesComplete ? now : null
                    },
                    
                    // Transport Data
                    transport: {
                        status: this.TRANSPORT_STAGES.NOT_STARTED,
                        yardId: null,
                        transportCompanyId: null,
                        scheduledDate: null,
                        departureTime: null,
                        arrivalTime: null,
                        notes: ''
                    },
                    
                    // On-Site Data
                    onsite: {
                        status: this.ONSITE_STAGES.NOT_STARTED,
                        setDate: null,
                        setBy: null,
                        stitchComplete: false,
                        punchItems: [],
                        signOffDate: null,
                        notes: ''
                    },
                    
                    // Audit Trail
                    history: [{
                        timestamp: now,
                        action: 'created',
                        user: 'system',
                        details: 'Unified module record created'
                    }],
                    
                    // Metadata
                    createdAt: now,
                    updatedAt: now
                };
            },
            
            // Migrate existing project modules to unified format
            migrateFromProjects: function() {
                let projects = [];
                let existingUnified = {};
                const projectsStr = localStorage.getItem('autovol_projects');
                const unifiedStr = localStorage.getItem(this.STORAGE_KEY);
                if (projectsStr && projectsStr !== 'undefined' && projectsStr !== 'null') {
                    try { projects = JSON.parse(projectsStr); } catch (e) { projects = []; }
                }
                if (unifiedStr && unifiedStr !== 'undefined' && unifiedStr !== 'null') {
                    try { existingUnified = JSON.parse(unifiedStr); } catch (e) { existingUnified = {}; }
                }
                
                const unifiedModules = { ...existingUnified };
                let migratedCount = 0;
                
                projects.forEach(project => {
                    (project.modules || []).forEach(mod => {
                        // Only migrate if not already in unified storage
                        if (!unifiedModules[mod.id]) {
                            unifiedModules[mod.id] = this.createUnifiedModule(mod, project.id, project.name);
                            migratedCount++;
                        } else {
                            // Sync production data from project to unified
                            unifiedModules[mod.id].production.stageProgress = mod.stageProgress;
                            unifiedModules[mod.id].production.status = mod.status;
                            unifiedModules[mod.id].specs = {
                                blmHitch: mod.blmHitch || '',
                                blmRear: mod.blmRear || '',
                                unit: mod.unit || '',
                                width: mod.width || '',
                                length: mod.length || '',
                                sqft: mod.sqft || '',
                                difficulties: mod.difficulties || unifiedModules[mod.id].specs.difficulties
                            };
                            unifiedModules[mod.id].updatedAt = new Date().toISOString();
                            
                            // Update phase based on production completion
                            const allComplete = Object.values(mod.stageProgress || {}).every(v => v === 100);
                            if (allComplete && unifiedModules[mod.id].currentPhase === this.PHASES.PRODUCTION) {
                                unifiedModules[mod.id].currentPhase = this.PHASES.YARD;
                                unifiedModules[mod.id].production.completedAt = new Date().toISOString();
                            }
                        }
                    });
                });
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(unifiedModules));
                console.log(`[MODA Unified] Migrated ${migratedCount} new modules. Total: ${Object.keys(unifiedModules).length}`);
                return unifiedModules;
            },
            
            // Get all unified modules
            getAll: function() {
                const str = localStorage.getItem(this.STORAGE_KEY);
                if (str && str !== 'undefined' && str !== 'null') {
                    try { return JSON.parse(str); } catch (e) { return {}; }
                }
                return {};
            },
            
            // Get module by ID
            getById: function(moduleId) {
                const modules = this.getAll();
                return modules[moduleId] || null;
            },
            
            // Get module by serial number
            getBySerial: function(serialNumber) {
                const modules = this.getAll();
                return Object.values(modules).find(m => m.serialNumber === serialNumber) || null;
            },
            
            // Get modules by phase
            getByPhase: function(phase) {
                const modules = this.getAll();
                return Object.values(modules).filter(m => m.currentPhase === phase);
            },
            
            // Get modules by project
            getByProject: function(projectId) {
                const modules = this.getAll();
                return Object.values(modules).filter(m => m.projectId === projectId);
            },
            
            // Update module
            update: function(moduleId, updates, userId = 'system') {
                const modules = this.getAll();
                if (!modules[moduleId]) {
                    console.error(`[MODA Unified] Module ${moduleId} not found`);
                    return null;
                }
                
                const now = new Date().toISOString();
                const oldModule = { ...modules[moduleId] };
                
                // Deep merge updates
                modules[moduleId] = {
                    ...modules[moduleId],
                    ...updates,
                    updatedAt: now,
                    history: [
                        ...modules[moduleId].history,
                        {
                            timestamp: now,
                            action: 'updated',
                            user: userId,
                            details: JSON.stringify(updates)
                        }
                    ]
                };
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(modules));
                return modules[moduleId];
            },
            
            // Update transport status
            updateTransport: function(moduleId, transportData, userId = 'system') {
                const modules = this.getAll();
                if (!modules[moduleId]) return null;
                
                const now = new Date().toISOString();
                modules[moduleId].transport = {
                    ...modules[moduleId].transport,
                    ...transportData
                };
                modules[moduleId].updatedAt = now;
                
                // Update phase based on transport status
                if (transportData.status === this.TRANSPORT_STAGES.ARRIVED) {
                    modules[moduleId].currentPhase = this.PHASES.ONSITE;
                    modules[moduleId].transport.arrivalTime = now;
                } else if (transportData.status === this.TRANSPORT_STAGES.SCHEDULED_TRANSIT ||
                           transportData.status === this.TRANSPORT_STAGES.SCHEDULED_SHUTTLE ||
                           transportData.status === this.TRANSPORT_STAGES.IN_TRANSIT) {
                    // Module is scheduled or in transit - move to TRANSPORT phase
                    modules[moduleId].currentPhase = this.PHASES.TRANSPORT;
                } else if (transportData.status === this.TRANSPORT_STAGES.READY ||
                           transportData.status === this.TRANSPORT_STAGES.STAGED) {
                    // Module is in yard (ready or staged) - keep in YARD phase
                    if (modules[moduleId].currentPhase === this.PHASES.PRODUCTION) {
                        modules[moduleId].currentPhase = this.PHASES.YARD;
                    }
                }
                
                modules[moduleId].history.push({
                    timestamp: now,
                    action: 'transport_updated',
                    user: userId,
                    details: `Transport status: ${transportData.status || 'updated'}`
                });
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(modules));
                return modules[moduleId];
            },
            
            // Update on-site status
            updateOnsite: function(moduleId, onsiteData, userId = 'system') {
                const modules = this.getAll();
                if (!modules[moduleId]) return null;
                
                const now = new Date().toISOString();
                modules[moduleId].onsite = {
                    ...modules[moduleId].onsite,
                    ...onsiteData
                };
                modules[moduleId].updatedAt = now;
                
                // Update phase if complete
                if (onsiteData.status === this.ONSITE_STAGES.COMPLETE) {
                    modules[moduleId].currentPhase = this.PHASES.COMPLETE;
                    modules[moduleId].onsite.signOffDate = now;
                }
                
                modules[moduleId].history.push({
                    timestamp: now,
                    action: 'onsite_updated',
                    user: userId,
                    details: `On-site status: ${onsiteData.status || 'updated'}`
                });
                
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(modules));
                return modules[moduleId];
            },
            
            // Get lifecycle summary stats
            getStats: function() {
                const modules = Object.values(this.getAll());
                return {
                    total: modules.length,
                    byPhase: {
                        production: modules.filter(m => m.currentPhase === this.PHASES.PRODUCTION).length,
                        yard: modules.filter(m => m.currentPhase === this.PHASES.YARD).length,
                        transport: modules.filter(m => m.currentPhase === this.PHASES.TRANSPORT).length,
                        onsite: modules.filter(m => m.currentPhase === this.PHASES.ONSITE).length,
                        complete: modules.filter(m => m.currentPhase === this.PHASES.COMPLETE).length
                    }
                };
            },
            
            // Sync unified modules back to project modules (for backwards compatibility)
            syncToProjects: function() {
                const unified = this.getAll();
                let projects = [];
                const projectsStr = localStorage.getItem('autovol_projects');
                if (projectsStr && projectsStr !== 'undefined' && projectsStr !== 'null') {
                    try { projects = JSON.parse(projectsStr); } catch (e) { projects = []; }
                }
                
                projects.forEach(project => {
                    (project.modules || []).forEach(mod => {
                        const unifiedMod = unified[mod.id];
                        if (unifiedMod) {
                            // Sync specs back
                            mod.blmHitch = unifiedMod.specs.blmHitch;
                            mod.blmRear = unifiedMod.specs.blmRear;
                            mod.unit = unifiedMod.specs.unit;
                            mod.width = unifiedMod.specs.width;
                            mod.length = unifiedMod.specs.length;
                            mod.sqft = unifiedMod.specs.sqft;
                            mod.difficulties = unifiedMod.specs.difficulties;
                            mod.stageProgress = unifiedMod.production.stageProgress;
                            mod.status = unifiedMod.production.status;
                        }
                    });
                });
                
                localStorage.setItem('autovol_projects', JSON.stringify(projects));
                console.log('[MODA Unified] Synced to projects');
            }
        };
        
        // Initialize unified modules on page load
        MODA_UNIFIED.migrateFromProjects();
        console.log('[MODA Unified] Data layer initialized', MODA_UNIFIED.getStats());