/**
 * Firestore Service for MODA
 * 
 * Handles all Firestore database operations for projects, modules, employees, etc.
 * This replaces localStorage with cloud-based persistent storage.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  writeBatch,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from './config';

// ============================================================================
// PROJECTS
// ============================================================================

export const projectsService = {
  // Get all projects
  async getAll() {
    const snapshot = await getDocs(collection(db, 'projects'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  // Get single project
  async get(projectId) {
    const docRef = doc(db, 'projects', projectId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  // Create project
  async create(project) {
    const projectId = project.id || `project-${Date.now()}`;
    await setDoc(doc(db, 'projects', projectId), {
      ...project,
      id: projectId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return projectId;
  },

  // Update project
  async update(projectId, updates) {
    await updateDoc(doc(db, 'projects', projectId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  // Delete project (soft delete - move to trash)
  async delete(projectId) {
    const project = await this.get(projectId);
    if (project) {
      // Move to trashedProjects collection
      await setDoc(doc(db, 'trashedProjects', projectId), {
        ...project,
        trashedAt: serverTimestamp()
      });
      await deleteDoc(doc(db, 'projects', projectId));
    }
  },

  // Restore from trash
  async restore(projectId) {
    const trashedDoc = await getDoc(doc(db, 'trashedProjects', projectId));
    if (trashedDoc.exists()) {
      const project = trashedDoc.data();
      delete project.trashedAt;
      await setDoc(doc(db, 'projects', projectId), {
        ...project,
        restoredAt: serverTimestamp()
      });
      await deleteDoc(doc(db, 'trashedProjects', projectId));
    }
  },

  // Subscribe to real-time updates
  subscribe(callback) {
    return onSnapshot(collection(db, 'projects'), (snapshot) => {
      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(projects);
    });
  }
};

// ============================================================================
// EMPLOYEES
// ============================================================================

export const employeesService = {
  async getAll() {
    const snapshot = await getDocs(collection(db, 'employees'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async get(employeeId) {
    const docRef = doc(db, 'employees', employeeId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },

  async create(employee) {
    const employeeId = employee.id || `emp-${Date.now()}`;
    await setDoc(doc(db, 'employees', employeeId), {
      ...employee,
      id: employeeId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return employeeId;
  },

  async update(employeeId, updates) {
    await updateDoc(doc(db, 'employees', employeeId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  async delete(employeeId) {
    await deleteDoc(doc(db, 'employees', employeeId));
  },

  subscribe(callback) {
    return onSnapshot(collection(db, 'employees'), (snapshot) => {
      const employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(employees);
    });
  }
};

// ============================================================================
// WEEKLY SCHEDULE
// ============================================================================

export const scheduleService = {
  async getWeeks() {
    const snapshot = await getDocs(collection(db, 'weeks'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getCurrentWeek() {
    const weeks = await this.getWeeks();
    const today = new Date().toISOString().split('T')[0];
    return weeks.find(w => w.weekStart <= today && w.weekEnd >= today) || weeks[0];
  },

  async saveWeek(week) {
    const weekId = week.id || `week-${week.weekStart}`;
    await setDoc(doc(db, 'weeks', weekId), {
      ...week,
      id: weekId,
      updatedAt: serverTimestamp()
    });
    return weekId;
  },

  async getScheduleSetup() {
    const docRef = doc(db, 'config', 'scheduleSetup');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  },

  async saveScheduleSetup(setup) {
    await setDoc(doc(db, 'config', 'scheduleSetup'), {
      ...setup,
      updatedAt: serverTimestamp()
    });
  },

  async getStaggerConfig() {
    const docRef = doc(db, 'config', 'staggerConfig');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  },

  async saveStaggerConfig(config) {
    await setDoc(doc(db, 'config', 'staggerConfig'), {
      ...config,
      updatedAt: serverTimestamp()
    });
  },

  subscribe(callback) {
    return onSnapshot(collection(db, 'weeks'), (snapshot) => {
      const weeks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(weeks);
    });
  }
};

// ============================================================================
// DASHBOARD ROLES
// ============================================================================

export const rolesService = {
  async getAll() {
    const snapshot = await getDocs(collection(db, 'dashboardRoles'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async save(role) {
    await setDoc(doc(db, 'dashboardRoles', role.id), {
      ...role,
      updatedAt: serverTimestamp()
    });
  },

  async delete(roleId) {
    await deleteDoc(doc(db, 'dashboardRoles', roleId));
  }
};

// ============================================================================
// DATA MIGRATION (localStorage → Firestore)
// ============================================================================

export const migrationService = {
  // Import all localStorage data to Firestore
  async importFromLocalStorage() {
    const batch = writeBatch(db);
    const results = { projects: 0, employees: 0, weeks: 0, roles: 0 };

    // Import projects
    const projects = JSON.parse(localStorage.getItem('autovol_projects') || '[]');
    for (const project of projects) {
      const projectRef = doc(db, 'projects', project.id);
      batch.set(projectRef, { ...project, migratedAt: serverTimestamp() });
      results.projects++;
    }

    // Import trashed projects
    const trashedProjects = JSON.parse(localStorage.getItem('autovol_trashed_projects') || '[]');
    for (const project of trashedProjects) {
      const projectRef = doc(db, 'trashedProjects', project.id);
      batch.set(projectRef, { ...project, migratedAt: serverTimestamp() });
    }

    // Import employees
    const employees = JSON.parse(localStorage.getItem('autovol_employees') || '[]');
    for (const employee of employees) {
      const empRef = doc(db, 'employees', employee.id);
      batch.set(empRef, { ...employee, migratedAt: serverTimestamp() });
      results.employees++;
    }

    // Import weeks
    const weeks = JSON.parse(localStorage.getItem('autovol_weeks') || '[]');
    for (const week of weeks) {
      const weekRef = doc(db, 'weeks', week.id);
      batch.set(weekRef, { ...week, migratedAt: serverTimestamp() });
      results.weeks++;
    }

    // Import schedule setup
    const scheduleSetup = JSON.parse(localStorage.getItem('autovol_schedule_setup') || 'null');
    if (scheduleSetup) {
      const setupRef = doc(db, 'config', 'scheduleSetup');
      batch.set(setupRef, { ...scheduleSetup, migratedAt: serverTimestamp() });
    }

    // Import stagger config
    const staggerConfig = JSON.parse(localStorage.getItem('autovol_stagger_config') || 'null');
    if (staggerConfig) {
      const staggerRef = doc(db, 'config', 'staggerConfig');
      batch.set(staggerRef, { ...staggerConfig, migratedAt: serverTimestamp() });
    }

    // Import dashboard roles
    const roles = JSON.parse(localStorage.getItem('autovol_dashboard_roles') || '[]');
    for (const role of roles) {
      const roleRef = doc(db, 'dashboardRoles', role.id);
      batch.set(roleRef, { ...role, migratedAt: serverTimestamp() });
      results.roles++;
    }

    // Commit all writes
    await batch.commit();
    
    console.log('Migration complete:', results);
    return results;
  },

  // Export Firestore data to localStorage (backup/fallback)
  async exportToLocalStorage() {
    const projects = await projectsService.getAll();
    localStorage.setItem('autovol_projects', JSON.stringify(projects));

    const employees = await employeesService.getAll();
    localStorage.setItem('autovol_employees', JSON.stringify(employees));

    const weeks = await scheduleService.getWeeks();
    localStorage.setItem('autovol_weeks', JSON.stringify(weeks));

    const scheduleSetup = await scheduleService.getScheduleSetup();
    if (scheduleSetup) {
      localStorage.setItem('autovol_schedule_setup', JSON.stringify(scheduleSetup));
    }

    const staggerConfig = await scheduleService.getStaggerConfig();
    if (staggerConfig) {
      localStorage.setItem('autovol_stagger_config', JSON.stringify(staggerConfig));
    }

    const roles = await rolesService.getAll();
    localStorage.setItem('autovol_dashboard_roles', JSON.stringify(roles));

    console.log('Export to localStorage complete');
  }
};

export default {
  projects: projectsService,
  employees: employeesService,
  schedule: scheduleService,
  roles: rolesService,
  migration: migrationService
};
