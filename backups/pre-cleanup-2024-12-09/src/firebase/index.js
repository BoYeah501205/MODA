/**
 * Firebase Module Exports
 * 
 * Central export point for all Firebase-related functionality.
 */

// Core Firebase
export { auth, db } from './config';
export { default as app } from './config';

// Authentication
export { AuthProvider, useAuth } from './AuthContext';
export { default as LoginPage } from './LoginPage';

// Firestore Services
export { 
  projectsService, 
  employeesService, 
  scheduleService, 
  rolesService,
  migrationService 
} from './FirestoreService';

export { default as FirestoreService } from './FirestoreService';
