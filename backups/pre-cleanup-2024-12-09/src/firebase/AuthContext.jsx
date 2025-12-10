/**
 * Firebase Authentication Context for MODA
 * 
 * Provides authentication state and methods throughout the app.
 * Integrates with Firestore for user roles and permissions.
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from './config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sign in with email/password
  const login = async (email, password) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Password reset
  const resetPassword = async (email) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Create new user (admin only)
  const createUser = async (email, password, profile) => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: email,
        name: profile.name || '',
        role: profile.role || 'employee',
        dashboardRole: profile.dashboardRole || 'employee',
        department: profile.department || '',
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.uid || 'system'
      });
      
      return userCredential;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Fetch user profile from Firestore
  const fetchUserProfile = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return { uid, ...userDoc.data() };
      }
      // Return default profile if not found
      return { 
        uid, 
        role: 'employee', 
        dashboardRole: 'employee',
        name: '',
        email: ''
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { 
        uid, 
        role: 'employee', 
        dashboardRole: 'employee',
        name: '',
        email: ''
      };
    }
  };

  // Check if user has specific role level
  const hasRole = (requiredRole) => {
    const roleHierarchy = {
      'admin': 4,
      'supervisor': 3,
      'coordinator': 2,
      'employee': 1,
      'viewer': 0
    };
    
    const userLevel = roleHierarchy[userProfile?.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  };

  // Check specific capability
  const hasCapability = (capability) => {
    if (!userProfile) return false;
    
    // Admin has all capabilities
    if (userProfile.role === 'admin') return true;
    
    // Check role-based capabilities
    const roleCapabilities = {
      'supervisor': ['canEdit', 'canManageUsers', 'canExportData'],
      'coordinator': ['canEdit', 'canExportData'],
      'employee': ['canEdit'],
      'viewer': []
    };
    
    return roleCapabilities[userProfile.role]?.includes(capability) || false;
  };

  // Get all users (admin only)
  const getAllUsers = async () => {
    if (!hasRole('admin')) {
      throw new Error('Unauthorized: Admin access required');
    }
    
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      return usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  };

  // Update user profile (admin or self)
  const updateUserProfile = async (uid, updates) => {
    // Only admin can update others, users can update themselves
    if (uid !== currentUser?.uid && !hasRole('admin')) {
      throw new Error('Unauthorized');
    }
    
    try {
      await setDoc(doc(db, 'users', uid), updates, { merge: true });
      
      // If updating self, refresh profile
      if (uid === currentUser?.uid) {
        const updated = await fetchUserProfile(uid);
        setUserProfile(updated);
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        const profile = await fetchUserProfile(user.uid);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    // State
    currentUser,
    userProfile,
    loading,
    error,
    
    // Auth methods
    login,
    logout,
    resetPassword,
    createUser,
    
    // Profile methods
    fetchUserProfile,
    updateUserProfile,
    getAllUsers,
    
    // Permission checks
    hasRole,
    hasCapability,
    
    // Convenience getters
    isAuthenticated: !!currentUser,
    isAdmin: userProfile?.role === 'admin',
    isSupervisor: hasRole('supervisor'),
    canEdit: hasCapability('canEdit'),
    canManageUsers: hasCapability('canManageUsers'),
    canExportData: hasCapability('canExportData')
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
