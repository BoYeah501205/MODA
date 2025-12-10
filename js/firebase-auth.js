/**
 * Firebase Authentication for MODA
 * 
 * This script integrates Firebase Auth with the existing MODA application.
 * It provides a global MODA_FIREBASE object for authentication operations.
 * 
 * Usage:
 *   await MODA_FIREBASE.login(email, password)
 *   await MODA_FIREBASE.logout()
 *   MODA_FIREBASE.currentUser
 *   MODA_FIREBASE.userProfile
 */

// Firebase SDK URLs (loaded via CDN for compatibility with in-browser Babel)
const FIREBASE_VERSION = '10.7.1';

// Initialize Firebase when script loads
(function() {
  // Check if Firebase is already loaded
  if (window.MODA_FIREBASE) {
    console.log('[Firebase] Already initialized');
    return;
  }

  // Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDntnW81kWQND7lnVJK1Vzowin3naJNKqo",
    authDomain: "moda-9ee0f.firebaseapp.com",
    projectId: "moda-9ee0f",
    storageBucket: "moda-9ee0f.firebasestorage.app",
    messagingSenderId: "189785366880",
    appId: "1:189785366880:web:556705c3abdca5d692be05",
    measurementId: "G-BZQEHHXSYS"
  };

  // State
  let app = null;
  let auth = null;
  let db = null;
  let currentUser = null;
  let userProfile = null;
  let authStateListeners = [];
  let isInitialized = false;

  // Initialize Firebase
  async function initialize() {
    if (isInitialized) return;

    try {
      // Wait for Firebase SDK to be available
      if (!window.firebase) {
        console.error('[Firebase] SDK not loaded. Make sure firebase scripts are included.');
        return;
      }

      // Initialize app
      if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
      } else {
        app = firebase.apps[0];
      }

      auth = firebase.auth();
      db = firebase.firestore();

      // Listen for auth state changes
      auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        
        if (user) {
          // Fetch user profile from Firestore
          try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
              userProfile = { uid: user.uid, ...userDoc.data() };
              console.log('[Firebase] Loaded existing user profile');
            } else {
              // Check for pending profile (created by admin before user first login)
              const pendingId = 'pending_' + user.email.replace(/[^a-zA-Z0-9]/g, '_');
              const pendingDoc = await db.collection('users').doc(pendingId).get();
              
              if (pendingDoc.exists) {
                // Link pending profile to this user
                const pendingData = pendingDoc.data();
                const linkedProfile = {
                  ...pendingData,
                  uid: user.uid,
                  pendingLink: false,
                  linkedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                await db.collection('users').doc(user.uid).set(linkedProfile);
                await db.collection('users').doc(pendingId).delete();
                userProfile = { uid: user.uid, ...linkedProfile };
                console.log('[Firebase] Linked pending profile for:', user.email);
              } else {
                // Auto-create profile for new users
                console.log('[Firebase] Creating new user profile...');
                const newProfile = { 
                  uid: user.uid, 
                  email: user.email,
                  name: user.displayName || user.email.split('@')[0],
                  role: 'admin',  // First user gets admin by default
                  dashboardRole: 'admin',
                  department: '',
                  createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                  createdBy: 'auto-registration'
                };
                
                // Save to Firestore
                await db.collection('users').doc(user.uid).set(newProfile);
                userProfile = { ...newProfile, uid: user.uid };
                console.log('[Firebase] Created new user profile:', user.email);
              }
            }
          } catch (error) {
            console.error('[Firebase] Error with user profile:', error);
            userProfile = { 
              uid: user.uid, 
              email: user.email,
              name: user.email.split('@')[0],
              role: 'employee',
              dashboardRole: 'employee'
            };
          }
        } else {
          userProfile = null;
        }

        // Notify listeners
        authStateListeners.forEach(listener => {
          try {
            listener(user, userProfile);
          } catch (e) {
            console.error('[Firebase] Auth listener error:', e);
          }
        });

        console.log('[Firebase] Auth state changed:', user ? user.email : 'signed out');
      });

      isInitialized = true;
      console.log('[Firebase] Initialized successfully');
    } catch (error) {
      console.error('[Firebase] Initialization error:', error);
    }
  }

  // Login with email/password
  async function login(email, password) {
    if (!auth) {
      throw new Error('Firebase not initialized');
    }

    try {
      // Normalize email to lowercase for consistency
      const normalizedEmail = email.toLowerCase().trim();
      const userCredential = await auth.signInWithEmailAndPassword(normalizedEmail, password);
      
      // Wait for profile to be loaded by auth state listener
      // The onAuthStateChanged handler loads the profile asynchronously
      let attempts = 0;
      while (!userProfile && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }
      
      return { success: true, user: userCredential.user, profile: userProfile };
    } catch (error) {
      console.error('[Firebase] Login error:', error);
      throw error;
    }
  }

  // Logout
  async function logout() {
    if (!auth) {
      throw new Error('Firebase not initialized');
    }

    try {
      await auth.signOut();
    } catch (error) {
      console.error('[Firebase] Logout error:', error);
      throw error;
    }
  }

  // Send password reset email
  async function resetPassword(email) {
    if (!auth) {
      throw new Error('Firebase not initialized');
    }

    try {
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim();
      await auth.sendPasswordResetEmail(normalizedEmail);
    } catch (error) {
      console.error('[Firebase] Password reset error:', error);
      throw error;
    }
  }

  // Create new user (admin only)
  // Note: Firebase client SDK signs in as new user when creating - we handle re-auth
  async function createUser(email, password, profile) {
    if (!auth || !db) {
      throw new Error('Firebase not initialized');
    }

    if (!userProfile || userProfile.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Store current admin credentials to re-authenticate after
    const adminEmail = currentUser?.email;
    
    try {
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim();
      console.log('[Firebase] Creating new user:', normalizedEmail);
      
      // Create the user (this will sign us in as the new user temporarily)
      const userCredential = await auth.createUserWithEmailAndPassword(normalizedEmail, password);
      const newUserUid = userCredential.user.uid;
      
      // Create user profile in Firestore
      await db.collection('users').doc(newUserUid).set({
        email: normalizedEmail,
        name: profile.name || normalizedEmail.split('@')[0],
        role: profile.role || 'employee',
        dashboardRole: profile.dashboardRole || 'employee',
        department: profile.department || '',
        active: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: adminEmail || 'admin'
      });

      console.log('[Firebase] User created successfully:', email);
      
      // Sign out the new user so admin can re-authenticate
      await auth.signOut();
      
      return { 
        success: true, 
        uid: newUserUid, 
        email: email,
        message: 'User created. Please log back in as admin.'
      };
    } catch (error) {
      console.error('[Firebase] Create user error:', error);
      throw error;
    }
  }
  
  // Delete user profile (admin only) - Note: doesn't delete Firebase Auth user
  async function deleteUserProfile(uid) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    if (!userProfile || userProfile.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }
    
    if (uid === currentUser?.uid) {
      throw new Error('Cannot delete your own account');
    }

    try {
      await db.collection('users').doc(uid).delete();
      console.log('[Firebase] User profile deleted:', uid);
      return { success: true };
    } catch (error) {
      console.error('[Firebase] Delete user error:', error);
      throw error;
    }
  }
  
  // Deactivate user (admin only) - soft delete
  async function deactivateUser(uid) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    if (!userProfile || userProfile.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      await db.collection('users').doc(uid).update({ active: false });
      console.log('[Firebase] User deactivated:', uid);
      return { success: true };
    } catch (error) {
      console.error('[Firebase] Deactivate user error:', error);
      throw error;
    }
  }
  
  // Reactivate user (admin only)
  async function reactivateUser(uid) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    if (!userProfile || userProfile.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      await db.collection('users').doc(uid).update({ active: true });
      console.log('[Firebase] User reactivated:', uid);
      return { success: true };
    } catch (error) {
      console.error('[Firebase] Reactivate user error:', error);
      throw error;
    }
  }

  // Update user profile
  async function updateUserProfile(uid, updates) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    // Only admin can update others
    if (uid !== currentUser?.uid && userProfile?.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    try {
      await db.collection('users').doc(uid).set(updates, { merge: true });
      
      // Refresh current user's profile if updating self
      if (uid === currentUser?.uid) {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          userProfile = { uid, ...userDoc.data() };
        }
      }
    } catch (error) {
      console.error('[Firebase] Update profile error:', error);
      throw error;
    }
  }

  // Get all users (admin only)
  async function getAllUsers() {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    if (!userProfile || userProfile.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      const snapshot = await db.collection('users').get();
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('[Firebase] Get users error:', error);
      throw error;
    }
  }

  // Look up user profile by email (for debugging/admin)
  async function getUserByEmail(email) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const snapshot = await db.collection('users').where('email', '==', normalizedEmail).get();
      
      if (snapshot.empty) {
        console.log('[Firebase] No profile found for:', normalizedEmail);
        return null;
      }
      
      const doc = snapshot.docs[0];
      const profile = { uid: doc.id, ...doc.data() };
      console.log('[Firebase] Found profile:', profile);
      return profile;
    } catch (error) {
      console.error('[Firebase] getUserByEmail error:', error);
      throw error;
    }
  }

  // Check if user has required role
  function hasRole(requiredRole) {
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
  }

  // Add auth state listener
  function onAuthStateChanged(listener) {
    authStateListeners.push(listener);
    
    // Call immediately with current state
    if (isInitialized) {
      listener(currentUser, userProfile);
    }

    // Return unsubscribe function
    return () => {
      authStateListeners = authStateListeners.filter(l => l !== listener);
    };
  }

  // Create profile for existing Auth user (when user exists in Auth but not Firestore)
  async function createProfileForExistingUser(email, profileData) {
    if (!db) {
      throw new Error('Firebase not initialized');
    }

    if (!userProfile || userProfile.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      // Normalize email to lowercase
      const normalizedEmail = email.toLowerCase().trim();
      
      // We need to find the user's UID by having them sign in
      // Since we can't look up Auth users from client SDK, we'll create a placeholder
      // that will be linked when they first log in
      
      // Check if profile already exists by email
      const existingQuery = await db.collection('users').where('email', '==', normalizedEmail).get();
      if (!existingQuery.empty) {
        throw new Error('Profile already exists for this email');
      }

      // Create a pending profile with email as temporary ID
      const pendingId = 'pending_' + normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      await db.collection('users').doc(pendingId).set({
        email: normalizedEmail,
        name: profileData.name || normalizedEmail.split('@')[0],
        role: profileData.dashboardRole || 'employee',
        dashboardRole: profileData.dashboardRole || 'employee',
        department: profileData.department || '',
        jobTitle: profileData.jobTitle || '',
        phone: profileData.phone || '',
        active: true,
        pendingLink: true, // Flag to indicate this needs to be linked to Auth UID
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: userProfile?.email || 'admin'
      });

      console.log('[Firebase] Pending profile created for:', email);
      return { success: true, message: 'Profile created. User can now log in.' };
    } catch (error) {
      console.error('[Firebase] Create pending profile error:', error);
      throw error;
    }
  }

  // Link pending profile to actual Auth UID (called on login)
  async function linkPendingProfile(uid, email) {
    if (!db) return;

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const pendingId = 'pending_' + normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_');
      const pendingDoc = await db.collection('users').doc(pendingId).get();
      
      if (pendingDoc.exists) {
        const data = pendingDoc.data();
        // Create proper profile with real UID
        await db.collection('users').doc(uid).set({
          ...data,
          uid: uid,
          pendingLink: false,
          linkedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        // Delete pending profile
        await db.collection('users').doc(pendingId).delete();
        console.log('[Firebase] Pending profile linked to UID:', uid);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Firebase] Link pending profile error:', error);
      return false;
    }
  }

  // Get error message from Firebase error code
  function getErrorMessage(code) {
    const messages = {
      'auth/invalid-email': 'Invalid email address',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/invalid-credential': 'Invalid email or password',
      'auth/too-many-requests': 'Too many failed attempts. Try again later.',
      'auth/network-request-failed': 'Network error. Check your connection.',
      'auth/email-already-in-use': 'Email is already registered',
      'auth/weak-password': 'Password should be at least 6 characters'
    };
    return messages[code] || 'An error occurred. Please try again.';
  }

  // Expose global API
  window.MODA_FIREBASE = {
    // Initialization
    initialize,
    get isInitialized() { return isInitialized; },

    // Auth state
    get currentUser() { return currentUser; },
    get userProfile() { return userProfile; },
    get isAuthenticated() { return !!currentUser; },
    get isAdmin() { return userProfile?.role === 'admin'; },

    // Auth methods
    login,
    logout,
    resetPassword,
    
    // User management (admin only)
    createUser,
    createProfileForExistingUser,
    deleteUserProfile,
    deactivateUser,
    reactivateUser,
    
    // Profile methods
    updateUserProfile,
    getAllUsers,
    getUserByEmail,
    linkPendingProfile,

    // Permission checks
    hasRole,

    // Listeners
    onAuthStateChanged,

    // Utilities
    getErrorMessage,

    // Direct access to Firebase (for advanced use)
    get auth() { return auth; },
    get db() { return db; },
    get app() { return app; }
  };

  console.log('[Firebase] MODA_FIREBASE object created');
  
  // Auto-initialize Firebase
  initialize().then(() => {
    console.log('[Firebase] Auto-initialization complete');
  }).catch(err => {
    console.error('[Firebase] Auto-initialization failed:', err);
  });
})();
