// ============================================================================
// MODA UNIFIED DATA LAYER - Single Source of Truth
// Consolidates the dual storage system into one optimized layer
// ============================================================================
// Unified Data Layer for MODA
window.MODA_UNIFIED = (function() {
    'use strict';
    
    // ===== MODULE LIFECYCLE MANAGEMENT =====
    
    return {
        
        // Create a unified module record from project module
        createUnifiedModule: function(projectModule, projectId, projectName) {
            const now = new Date().toISOString();
            
            // Determine current phase based on stageProgress
            const stageProgress = projectModule.stageProgress || {};
            const allStagesComplete = Object.values(stageProgress).every(v => v === 100);
            
            let currentPhase = MODA_CONSTANTS.PHASES.PRODUCTION;
            if (allStagesComplete) {
                currentPhase = MODA_CONSTANTS.PHASES.YARD;
            }
            
            return {
                // Core Identity
                id: projectModule.id,
                serialNumber: projectModule.serialNumber,
                projectId: projectId,
                projectName: projectName,
                
                // Module Specifications
                specs: {
                    blmHitch: projectModule.blmHitch || projectModule.hitchBLM || '',
                    blmRear: projectModule.blmRear || projectModule.rearBLM || '',
                    unit: projectModule.unit || projectModule.hitchUnit || '',
                    width: projectModule.width || projectModule.moduleWidth || '',
                    length: projectModule.length || projectModule.moduleLength || '',
                    sqft: projectModule.sqft || projectModule.squareFootage || '',
                    difficulties: projectModule.difficulties || {
                        sidewall: false,
                        stair: false,
                        hr3Wall: false,
                        short: false,
                        doubleStudio: false,
                        sawbox: false,
                        proto: false
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
                    status: MODA_CONSTANTS.TRANSPORT_STAGES.NOT_STARTED,
                    yardId: null,
                    transportCompanyId: null,
                    scheduledDate: null,
                    departureTime: null,
                    arrivalTime: null,
                    notes: ''
                },
                
                // On-Site Data
                onsite: {
                    status: MODA_CONSTANTS.ONSITE_STAGES.NOT_STARTED,
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
        
        // Sync projects to unified modules (optimized migration)
        syncFromProjects: function() {
            const projects = MODA_STATE.get('projects');
            const unifiedModules = MODA_STATE.get('unifiedModules');
            
            let syncedCount = 0;
            let updatedCount = 0;
            
            projects.forEach(project => {
                (project.modules || []).forEach(mod => {
                    if (!unifiedModules[mod.id]) {
                        // New module - create unified record
                        unifiedModules[mod.id] = this.createUnifiedModule(mod, project.id, project.name);
                        syncedCount++;
                    } else {
                        // Existing module - sync production data only
                        unifiedModules[mod.id].production.stageProgress = mod.stageProgress;
                        unifiedModules[mod.id].production.status = mod.status;
                        unifiedModules[mod.id].specs = {
                            blmHitch: mod.blmHitch || mod.hitchBLM || '',
                            blmRear: mod.blmRear || mod.rearBLM || '',
                            unit: mod.unit || mod.hitchUnit || '',
                            width: mod.width || mod.moduleWidth || '',
                            length: mod.length || mod.moduleLength || '',
                            sqft: mod.sqft || mod.squareFootage || '',
                            difficulties: mod.difficulties || unifiedModules[mod.id].specs.difficulties
                        };
                        unifiedModules[mod.id].updatedAt = new Date().toISOString();
                        
                        // Update phase if production complete
                        const allComplete = Object.values(mod.stageProgress || {}).every(v => v === 100);
                        if (allComplete && unifiedModules[mod.id].currentPhase === MODA_CONSTANTS.PHASES.PRODUCTION) {
                            unifiedModules[mod.id].currentPhase = MODA_CONSTANTS.PHASES.YARD;
                            unifiedModules[mod.id].production.completedAt = new Date().toISOString();
                        }
                        
                        updatedCount++;
                    }
                });
            });
            
            MODA_STATE.set('unifiedModules', unifiedModules);
            
            console.log(`[Data Layer] Synced ${syncedCount} new, updated ${updatedCount} existing modules`);
            return { synced: syncedCount, updated: updatedCount };
        },
        
        // Sync unified modules back to projects (for backward compatibility)
        syncToProjects: function() {
            const projects = MODA_STATE.get('projects');
            const unifiedModules = MODA_STATE.get('unifiedModules');
            
            projects.forEach(project => {
                (project.modules || []).forEach(mod => {
                    const unifiedMod = unifiedModules[mod.id];
                    if (unifiedMod) {
                        // Sync specs back
                        mod.blmHitch = unifiedMod.specs.blmHitch;
                        mod.hitchBLM = unifiedMod.specs.blmHitch;
                        mod.blmRear = unifiedMod.specs.blmRear;
                        mod.rearBLM = unifiedMod.specs.blmRear;
                        mod.unit = unifiedMod.specs.unit;
                        mod.hitchUnit = unifiedMod.specs.unit;
                        mod.width = unifiedMod.specs.width;
                        mod.moduleWidth = unifiedMod.specs.width;
                        mod.length = unifiedMod.specs.length;
                        mod.moduleLength = unifiedMod.specs.length;
                        mod.sqft = unifiedMod.specs.sqft;
                        mod.squareFootage = unifiedMod.specs.sqft;
                        mod.difficulties = unifiedMod.specs.difficulties;
                        mod.stageProgress = unifiedMod.production.stageProgress;
                        mod.status = unifiedMod.production.status;
                    }
                });
            });
            
            MODA_STATE.set('projects', projects);
            console.log('[Data Layer] Synced unified modules back to projects');
        },
        
        // Get all unified modules
        getAllModules: function() {
            return MODA_STATE.get('unifiedModules');
        },
        
        // Get module by ID
        getModuleById: function(moduleId) {
            return MODA_STATE.getModuleById(moduleId);
        },
        
        // Get modules by phase
        getModulesByPhase: function(phase) {
            const modules = this.getAllModules();
            return Object.values(modules).filter(m => m.currentPhase === phase);
        },
        
        // Get modules by project
        getModulesByProject: function(projectId) {
            const modules = this.getAllModules();
            return Object.values(modules).filter(m => m.projectId === projectId);
        },
        
        // Migrate from projects (called by Dashboard component)
        migrateFromProjects: function() {
            try {
                return this.syncFromProjects();
            } catch (error) {
                console.warn('[Data Layer] Migration from projects failed:', error);
                return { synced: 0, updated: 0 };
            }
        },
        
        // Get modules by phase (alias for getModulesByPhase)
        getByPhase: function(phase) {
            return this.getModulesByPhase(phase);
        },
        
        // Get all modules (alias for getAllModules)
        getAll: function() {
            return this.getAllModules();
        },
        
        // Get module by ID (alias)
        getById: function(moduleId) {
            return this.getModuleById(moduleId);
        },
        
        // Update transport status
        updateTransportStatus: function(moduleId, status, userId = 'system') {
            const modules = this.getAllModules();
            const module = modules[moduleId];
            
            if (!module) {
                console.warn(`[Data Layer] Module ${moduleId} not found for transport update`);
                return null;
            }
            
            // Update transport status
            module.transport.status = status;
            module.updatedAt = new Date().toISOString();
            
            // Add to history
            module.history.push({
                timestamp: new Date().toISOString(),
                action: 'transport_status_updated',
                user: userId,
                details: `Transport status changed to ${status}`
            });
            
            // Update phase based on transport status
            if (status === 'arrived' && module.currentPhase === 'transport') {
                module.currentPhase = 'onsite';
            }
            
            // Save back to storage
            MODA_STATE.set('unifiedModules', modules);
            
            return module;
        },
        
        // Update onsite status
        updateOnsiteStatus: function(moduleId, status, userId = 'system') {
            const modules = this.getAllModules();
            const module = modules[moduleId];
            
            if (!module) {
                console.warn(`[Data Layer] Module ${moduleId} not found for onsite update`);
                return null;
            }
            
            // Update onsite status
            module.onsite.status = status;
            module.updatedAt = new Date().toISOString();
            
            // Add to history
            module.history.push({
                timestamp: new Date().toISOString(),
                action: 'onsite_status_updated',
                user: userId,
                details: `Onsite status changed to ${status}`
            });
            
            // Update phase based on onsite status
            if (status === 'complete' && module.currentPhase === 'onsite') {
                module.currentPhase = 'complete';
            }
            
            // Save back to storage
            MODA_STATE.set('unifiedModules', modules);
            
            return module;
        },
        
        // Aliases for original API compatibility
        updateTransport: function(moduleId, transportData, userId = 'system') {
            const modules = this.getAllModules();
            const module = modules[moduleId];
            
            if (!module) {
                console.warn(`[Data Layer] Module ${moduleId} not found for transport update`);
                return null;
            }
            
            const now = new Date().toISOString();
            
            // Update transport data
            module.transport = {
                ...module.transport,
                ...transportData
            };
            module.updatedAt = now;
            
            // Update phase based on transport status
            if (transportData.status === 'arrived') {
                module.currentPhase = 'onsite';
                module.transport.arrivalTime = now;
            } else if (transportData.status === 'in-transit' || transportData.status === 'scheduled') {
                module.currentPhase = 'transport';
            } else if (transportData.status === 'ready' || transportData.status === 'staged') {
                if (module.currentPhase === 'production') {
                    module.currentPhase = 'yard';
                }
            }
            
            // Add to history
            module.history.push({
                timestamp: now,
                action: 'transport_updated',
                user: userId,
                details: `Transport status: ${transportData.status || 'updated'}`
            });
            
            // Save back to storage
            MODA_STATE.set('unifiedModules', modules);
            
            return module;
        },
        
        updateOnsite: function(moduleId, onsiteData, userId = 'system') {
            const modules = this.getAllModules();
            const module = modules[moduleId];
            
            if (!module) {
                console.warn(`[Data Layer] Module ${moduleId} not found for onsite update`);
                return null;
            }
            
            const now = new Date().toISOString();
            
            // Update onsite data
            module.onsite = {
                ...module.onsite,
                ...onsiteData
            };
            module.updatedAt = now;
            
            // Update phase based on onsite status
            if (onsiteData.status === 'complete') {
                module.currentPhase = 'complete';
                module.onsite.completionDate = now;
            }
            
            // Add to history
            module.history.push({
                timestamp: now,
                action: 'onsite_updated',
                user: userId,
                details: `Onsite status: ${onsiteData.status || 'updated'}`
            });
            
            // Save back to storage
            MODA_STATE.set('unifiedModules', modules);
            
            return module;
        },
        
        // Update module
        updateModule: function(moduleId, updates, userId = 'system') {
            const modules = this.getAllModules();
            const module = modules[moduleId];
            
            if (!module) {
                console.error(`[Data Layer] Module ${moduleId} not found`);
                return null;
            }
            
            const now = new Date().toISOString();
            
            // Deep merge updates
            modules[moduleId] = {
                ...module,
                ...updates,
                updatedAt: now,
                history: [
                    ...module.history,
                    {
                        timestamp: now,
                        action: 'updated',
                        user: userId,
                        details: JSON.stringify(updates)
                    }
                ]
            };
            
            MODA_STATE.set('unifiedModules', modules);
            return modules[moduleId];
        },
        
        // Update transport status
        updateTransport: function(moduleId, transportData, userId = 'system') {
            const modules = this.getAllModules();
            const module = modules[moduleId];
            
            if (!module) return null;
            
            const now = new Date().toISOString();
            
            module.transport = {
                ...module.transport,
                ...transportData
            };
            module.updatedAt = now;
            
            // Update phase based on transport status
            if (transportData.status === MODA_CONSTANTS.TRANSPORT_STAGES.ARRIVED) {
                module.currentPhase = MODA_CONSTANTS.PHASES.ONSITE;
                module.transport.arrivalTime = now;
            } else if (
                transportData.status === MODA_CONSTANTS.TRANSPORT_STAGES.SCHEDULED_TRANSIT ||
                transportData.status === MODA_CONSTANTS.TRANSPORT_STAGES.SCHEDULED_SHUTTLE ||
                transportData.status === MODA_CONSTANTS.TRANSPORT_STAGES.IN_TRANSIT
            ) {
                module.currentPhase = MODA_CONSTANTS.PHASES.TRANSPORT;
            } else if (
                transportData.status === MODA_CONSTANTS.TRANSPORT_STAGES.READY ||
                transportData.status === MODA_CONSTANTS.TRANSPORT_STAGES.STAGED
            ) {
                if (module.currentPhase === MODA_CONSTANTS.PHASES.PRODUCTION) {
                    module.currentPhase = MODA_CONSTANTS.PHASES.YARD;
                }
            }
            
            module.history.push({
                timestamp: now,
                action: 'transport_updated',
                user: userId,
                details: `Transport status: ${transportData.status || 'updated'}`
            });
            
            MODA_STATE.set('unifiedModules', modules);
            return module;
        },
        
        // Update on-site status
        updateOnsite: function(moduleId, onsiteData, userId = 'system') {
            const modules = this.getAllModules();
            const module = modules[moduleId];
            
            if (!module) return null;
            
            const now = new Date().toISOString();
            
            module.onsite = {
                ...module.onsite,
                ...onsiteData
            };
            module.updatedAt = now;
            
            // Update phase if complete
            if (onsiteData.status === MODA_CONSTANTS.ONSITE_STAGES.COMPLETE) {
                module.currentPhase = MODA_CONSTANTS.PHASES.COMPLETE;
                module.onsite.signOffDate = now;
            }
            
            module.history.push({
                timestamp: now,
                action: 'onsite_updated',
                user: userId,
                details: `On-site status: ${onsiteData.status || 'updated'}`
            });
            
            MODA_STATE.set('unifiedModules', modules);
            return module;
        },
        
        // Get lifecycle statistics
        getStats: function() {
            const modules = Object.values(this.getAllModules());
            return {
                total: modules.length,
                byPhase: {
                    production: modules.filter(m => m.currentPhase === MODA_CONSTANTS.PHASES.PRODUCTION).length,
                    yard: modules.filter(m => m.currentPhase === MODA_CONSTANTS.PHASES.YARD).length,
                    transport: modules.filter(m => m.currentPhase === MODA_CONSTANTS.PHASES.TRANSPORT).length,
                    onsite: modules.filter(m => m.currentPhase === MODA_CONSTANTS.PHASES.ONSITE).length,
                    complete: modules.filter(m => m.currentPhase === MODA_CONSTANTS.PHASES.COMPLETE).length
                }
            };
        }
    };
})();

// MODA_UNIFIED is now globally available

// Initialize data layer
console.log('[Data Layer] Initialized');
