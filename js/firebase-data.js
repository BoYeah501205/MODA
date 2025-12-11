// MODA Firebase Data Layer
// Handles Firestore sync for projects, modules, and employees
// Provides localStorage fallback for offline functionality

(function() {
    'use strict';

    // Check if Firebase is available
    if (!window.firebase || !window.MODA_FIREBASE) {
        console.warn('[Firebase Data] Firebase not initialized, using localStorage only');
        return;
    }

    const db = window.MODA_FIREBASE.db;
    const isInitialized = () => window.MODA_FIREBASE.isInitialized;

    // ============================================================================
    // PROJECTS COLLECTION
    // ============================================================================

    const ProjectsAPI = {
        // Get all projects for current user's organization
        async getAll() {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                const snapshot = await db.collection('projects')
                    .orderBy('createdAt', 'desc')
                    .get();
                
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('[Projects] Error fetching:', error);
                throw error;
            }
        },

        // Get single project by ID
        async getById(projectId) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                const doc = await db.collection('projects').doc(projectId).get();
                if (!doc.exists) return null;
                return { id: doc.id, ...doc.data() };
            } catch (error) {
                console.error('[Projects] Error fetching project:', error);
                throw error;
            }
        },

        // Create new project
        async create(projectData) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                const newProject = {
                    ...projectData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                const docRef = await db.collection('projects').add(newProject);
                console.log('[Projects] Created:', docRef.id);
                
                return { id: docRef.id, ...newProject };
            } catch (error) {
                console.error('[Projects] Error creating:', error);
                throw error;
            }
        },

        // Update existing project
        async update(projectId, updates) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                const updateData = {
                    ...updates,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await db.collection('projects').doc(projectId).update(updateData);
                console.log('[Projects] Updated:', projectId);
                
                return { id: projectId, ...updateData };
            } catch (error) {
                console.error('[Projects] Error updating:', error);
                throw error;
            }
        },

        // Delete project
        async delete(projectId) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                await db.collection('projects').doc(projectId).delete();
                console.log('[Projects] Deleted:', projectId);
                return true;
            } catch (error) {
                console.error('[Projects] Error deleting:', error);
                throw error;
            }
        },

        // Listen to real-time updates
        onSnapshot(callback) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            return db.collection('projects')
                .orderBy('createdAt', 'desc')
                .onSnapshot(snapshot => {
                    const projects = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    callback(projects);
                }, error => {
                    console.error('[Projects] Snapshot error:', error);
                });
        }
    };

    // ============================================================================
    // MODULES SUBCOLLECTION
    // ============================================================================

    const ModulesAPI = {
        // Get all modules for a project
        async getAll(projectId) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                const snapshot = await db.collection('projects')
                    .doc(projectId)
                    .collection('modules')
                    .orderBy('serialNumber')
                    .get();
                
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('[Modules] Error fetching:', error);
                throw error;
            }
        },

        // Get single module
        async getById(projectId, moduleId) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                const doc = await db.collection('projects')
                    .doc(projectId)
                    .collection('modules')
                    .doc(moduleId)
                    .get();
                
                if (!doc.exists) return null;
                return { id: doc.id, ...doc.data() };
            } catch (error) {
                console.error('[Modules] Error fetching module:', error);
                throw error;
            }
        },

        // Create new module
        async create(projectId, moduleData) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                const newModule = {
                    ...moduleData,
                    projectId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                const docRef = await db.collection('projects')
                    .doc(projectId)
                    .collection('modules')
                    .add(newModule);
                
                console.log('[Modules] Created:', docRef.id);
                return { id: docRef.id, ...newModule };
            } catch (error) {
                console.error('[Modules] Error creating:', error);
                throw error;
            }
        },

        // Batch create modules
        async createBatch(projectId, modulesArray) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                const batch = db.batch();
                const modulesRef = db.collection('projects').doc(projectId).collection('modules');
                
                modulesArray.forEach(moduleData => {
                    const docRef = modulesRef.doc(); // Auto-generate ID
                    batch.set(docRef, {
                        ...moduleData,
                        projectId,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
                
                await batch.commit();
                console.log('[Modules] Batch created:', modulesArray.length, 'modules');
                return true;
            } catch (error) {
                console.error('[Modules] Error batch creating:', error);
                throw error;
            }
        },

        // Update module
        async update(projectId, moduleId, updates) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                const updateData = {
                    ...updates,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await db.collection('projects')
                    .doc(projectId)
                    .collection('modules')
                    .doc(moduleId)
                    .update(updateData);
                
                console.log('[Modules] Updated:', moduleId);
                return { id: moduleId, ...updateData };
            } catch (error) {
                console.error('[Modules] Error updating:', error);
                throw error;
            }
        },

        // Delete module
        async delete(projectId, moduleId) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                await db.collection('projects')
                    .doc(projectId)
                    .collection('modules')
                    .doc(moduleId)
                    .delete();
                
                console.log('[Modules] Deleted:', moduleId);
                return true;
            } catch (error) {
                console.error('[Modules] Error deleting:', error);
                throw error;
            }
        },

        // Listen to real-time updates for project modules
        onSnapshot(projectId, callback) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            return db.collection('projects')
                .doc(projectId)
                .collection('modules')
                .orderBy('serialNumber')
                .onSnapshot(snapshot => {
                    const modules = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    callback(modules);
                }, error => {
                    console.error('[Modules] Snapshot error:', error);
                });
        }
    };

    // ============================================================================
    // EMPLOYEES COLLECTION
    // ============================================================================

    const EmployeesAPI = {
        // Get all employees
        async getAll() {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                const snapshot = await db.collection('employees')
                    .orderBy('name')
                    .get();
                
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('[Employees] Error fetching:', error);
                throw error;
            }
        },

        // Get employees by department
        async getByDepartment(department) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                const snapshot = await db.collection('employees')
                    .where('department', '==', department)
                    .orderBy('name')
                    .get();
                
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (error) {
                console.error('[Employees] Error fetching by department:', error);
                throw error;
            }
        },

        // Create new employee
        async create(employeeData) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                const newEmployee = {
                    ...employeeData,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                const docRef = await db.collection('employees').add(newEmployee);
                console.log('[Employees] Created:', docRef.id);
                
                return { id: docRef.id, ...newEmployee };
            } catch (error) {
                console.error('[Employees] Error creating:', error);
                throw error;
            }
        },

        // Update employee
        async update(employeeId, updates) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                const updateData = {
                    ...updates,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                await db.collection('employees').doc(employeeId).update(updateData);
                console.log('[Employees] Updated:', employeeId);
                
                return { id: employeeId, ...updateData };
            } catch (error) {
                console.error('[Employees] Error updating:', error);
                throw error;
            }
        },

        // Delete employee
        async delete(employeeId) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                await db.collection('employees').doc(employeeId).delete();
                console.log('[Employees] Deleted:', employeeId);
                return true;
            } catch (error) {
                console.error('[Employees] Error deleting:', error);
                throw error;
            }
        },

        // Listen to real-time updates
        onSnapshot(callback) {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            return db.collection('employees')
                .orderBy('name')
                .onSnapshot(snapshot => {
                    const employees = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    callback(employees);
                }, error => {
                    console.error('[Employees] Snapshot error:', error);
                });
        }
    };

    // ============================================================================
    // MIGRATION UTILITIES
    // ============================================================================

    const MigrationAPI = {
        // Import projects from localStorage to Firestore
        async importProjectsFromLocalStorage() {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                const localProjects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
                console.log('[Migration] Found', localProjects.length, 'projects in localStorage');
                
                if (localProjects.length === 0) {
                    return { success: true, imported: 0, skipped: 0, message: 'No projects to import' };
                }
                
                // Get existing projects from Firestore
                const existingProjects = await ProjectsAPI.getAll();
                const existingNames = new Set(existingProjects.map(p => p.name?.toLowerCase().trim()));
                
                let imported = 0;
                let skipped = 0;
                
                for (const project of localProjects) {
                    // Check if project already exists (by name)
                    const projectName = project.name?.toLowerCase().trim();
                    if (existingNames.has(projectName)) {
                        console.log('[Migration] Skipping duplicate project:', project.name);
                        skipped++;
                        continue;
                    }
                    
                    // Remove local ID, let Firestore generate new one
                    const { id, ...projectData } = project;
                    await ProjectsAPI.create(projectData);
                    imported++;
                }
                
                console.log('[Migration] Imported', imported, 'projects, skipped', skipped, 'duplicates');
                return { 
                    success: true, 
                    imported, 
                    skipped,
                    message: `Imported ${imported} projects${skipped > 0 ? `, skipped ${skipped} duplicates` : ''}` 
                };
            } catch (error) {
                console.error('[Migration] Error importing projects:', error);
                throw error;
            }
        },

        // Import employees from localStorage to Firestore
        async importEmployeesFromLocalStorage() {
            if (!isInitialized()) throw new Error('Firebase not initialized');
            
            try {
                const localEmployees = JSON.parse(localStorage.getItem('autovol_employees') || '[]');
                console.log('[Migration] Found', localEmployees.length, 'employees in localStorage');
                
                if (localEmployees.length === 0) {
                    return { success: true, imported: 0, skipped: 0, message: 'No employees to import' };
                }
                
                // Get existing employees from Firestore
                const existingEmployees = await EmployeesAPI.getAll();
                const existingEmails = new Set(
                    existingEmployees
                        .map(e => e.email?.toLowerCase().trim())
                        .filter(Boolean)
                );
                
                let imported = 0;
                let skipped = 0;
                
                for (const employee of localEmployees) {
                    // Check if employee already exists (by email)
                    const email = employee.email?.toLowerCase().trim();
                    if (email && existingEmails.has(email)) {
                        console.log('[Migration] Skipping duplicate employee:', employee.email);
                        skipped++;
                        continue;
                    }
                    
                    // Also check by name if no email
                    if (!email) {
                        const fullName = `${employee.firstName} ${employee.lastName}`.toLowerCase().trim();
                        const nameExists = existingEmployees.some(e => 
                            `${e.firstName} ${e.lastName}`.toLowerCase().trim() === fullName
                        );
                        if (nameExists) {
                            console.log('[Migration] Skipping duplicate employee (by name):', fullName);
                            skipped++;
                            continue;
                        }
                    }
                    
                    const { id, ...employeeData } = employee;
                    await EmployeesAPI.create(employeeData);
                    imported++;
                }
                
                console.log('[Migration] Imported', imported, 'employees, skipped', skipped, 'duplicates');
                return { 
                    success: true, 
                    imported,
                    skipped,
                    message: `Imported ${imported} employees${skipped > 0 ? `, skipped ${skipped} duplicates` : ''}` 
                };
            } catch (error) {
                console.error('[Migration] Error importing employees:', error);
                throw error;
            }
        },

        // Full migration - import all data
        async importAll() {
            const results = {
                projects: await this.importProjectsFromLocalStorage(),
                employees: await this.importEmployeesFromLocalStorage()
            };
            
            return results;
        }
    };

    // ============================================================================
    // EXPORT API
    // ============================================================================

    window.MODA_FIREBASE_DATA = {
        projects: ProjectsAPI,
        modules: ModulesAPI,
        employees: EmployeesAPI,
        migration: MigrationAPI,
        
        // Utility to check if Firestore is available
        isAvailable: () => isInitialized()
    };

    console.log('[Firebase Data] MODA_FIREBASE_DATA initialized');
})();
