/**
 * Supabase Client for MODA
 * 
 * This script integrates Supabase Auth and Database with the MODA application.
 * It provides a global MODA_SUPABASE object for authentication and data operations.
 * 
 * Usage:
 *   await MODA_SUPABASE.login(email, password)
 *   await MODA_SUPABASE.logout()
 *   MODA_SUPABASE.currentUser
 *   MODA_SUPABASE.userProfile
 */

(function() {
    'use strict';

    // Check if Supabase is already loaded
    if (window.MODA_SUPABASE) {
        console.log('[Supabase] Already initialized');
        return;
    }

    // Supabase configuration - UPDATE THESE WITH YOUR PROJECT VALUES
    const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // e.g., 'https://xxxxx.supabase.co'
    const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

    // State
    let supabase = null;
    let currentUser = null;
    let userProfile = null;
    let authStateListeners = [];
    let isInitialized = false;

    // Initialize Supabase
    async function initialize() {
        if (isInitialized) return;

        try {
            // Wait for Supabase SDK to be available
            if (!window.supabase) {
                console.error('[Supabase] SDK not loaded. Make sure supabase-js is included.');
                return;
            }

            // Initialize client
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            // Listen for auth state changes
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('[Supabase] Auth state changed:', event);
                
                if (session?.user) {
                    currentUser = session.user;
                    
                    // Fetch user profile from profiles table
                    try {
                        const { data: profile, error } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', session.user.id)
                            .single();
                        
                        if (error && error.code !== 'PGRST116') {
                            console.error('[Supabase] Error fetching profile:', error);
                        }
                        
                        if (profile) {
                            userProfile = profile;
                            console.log('[Supabase] Loaded user profile');
                        } else {
                            // Create profile if doesn't exist
                            const newProfile = {
                                id: session.user.id,
                                email: session.user.email,
                                name: session.user.user_metadata?.name || session.user.email.split('@')[0],
                                dashboard_role: 'employee',
                                is_protected: false
                            };
                            
                            const { data: created, error: createError } = await supabase
                                .from('profiles')
                                .insert(newProfile)
                                .select()
                                .single();
                            
                            if (createError) {
                                console.error('[Supabase] Error creating profile:', createError);
                            } else {
                                userProfile = created;
                                console.log('[Supabase] Created new profile');
                            }
                        }
                    } catch (err) {
                        console.error('[Supabase] Profile error:', err);
                    }
                } else {
                    currentUser = null;
                    userProfile = null;
                }

                // Notify listeners
                authStateListeners.forEach(listener => {
                    try {
                        listener(currentUser, userProfile);
                    } catch (err) {
                        console.error('[Supabase] Listener error:', err);
                    }
                });
            });

            isInitialized = true;
            console.log('[Supabase] Initialized successfully');

            // Check for existing session
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('[Supabase] Found existing session');
            }

        } catch (error) {
            console.error('[Supabase] Initialization error:', error);
        }
    }

    // Login with email/password
    async function login(email, password) {
        if (!supabase) {
            return { success: false, error: 'Supabase not initialized' };
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                console.error('[Supabase] Login error:', error);
                return { success: false, error: error.message };
            }

            console.log('[Supabase] Login successful');
            return { success: true, user: data.user };

        } catch (error) {
            console.error('[Supabase] Login exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Sign up with email/password
    async function signUp(email, password, metadata = {}) {
        if (!supabase) {
            return { success: false, error: 'Supabase not initialized' };
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata
                }
            });

            if (error) {
                console.error('[Supabase] Sign up error:', error);
                return { success: false, error: error.message };
            }

            console.log('[Supabase] Sign up successful');
            return { success: true, user: data.user };

        } catch (error) {
            console.error('[Supabase] Sign up exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Logout
    async function logout() {
        if (!supabase) {
            return { success: false, error: 'Supabase not initialized' };
        }

        try {
            const { error } = await supabase.auth.signOut();

            if (error) {
                console.error('[Supabase] Logout error:', error);
                return { success: false, error: error.message };
            }

            currentUser = null;
            userProfile = null;
            console.log('[Supabase] Logout successful');
            return { success: true };

        } catch (error) {
            console.error('[Supabase] Logout exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Reset password
    async function resetPassword(email) {
        if (!supabase) {
            return { success: false, error: 'Supabase not initialized' };
        }

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password'
            });

            if (error) {
                console.error('[Supabase] Reset password error:', error);
                return { success: false, error: error.message };
            }

            console.log('[Supabase] Password reset email sent');
            return { success: true, message: 'Password reset email sent' };

        } catch (error) {
            console.error('[Supabase] Reset password exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Update user profile
    async function updateProfile(updates) {
        if (!supabase || !currentUser) {
            return { success: false, error: 'Not authenticated' };
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', currentUser.id)
                .select()
                .single();

            if (error) {
                console.error('[Supabase] Update profile error:', error);
                return { success: false, error: error.message };
            }

            userProfile = data;
            console.log('[Supabase] Profile updated');
            return { success: true, profile: data };

        } catch (error) {
            console.error('[Supabase] Update profile exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Add auth state listener
    function onAuthStateChange(callback) {
        authStateListeners.push(callback);
        
        // Immediately call with current state
        if (isInitialized) {
            callback(currentUser, userProfile);
        }

        // Return unsubscribe function
        return () => {
            authStateListeners = authStateListeners.filter(l => l !== callback);
        };
    }

    // Get all users (admin only)
    async function getAllUsers() {
        if (!supabase) {
            return { success: false, error: 'Supabase not initialized' };
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[Supabase] Get users error:', error);
                return { success: false, error: error.message };
            }

            return { success: true, users: data };

        } catch (error) {
            console.error('[Supabase] Get users exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Update user role (admin only)
    async function updateUserRole(userId, role) {
        if (!supabase) {
            return { success: false, error: 'Supabase not initialized' };
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .update({ dashboard_role: role })
                .eq('id', userId)
                .select()
                .single();

            if (error) {
                console.error('[Supabase] Update role error:', error);
                return { success: false, error: error.message };
            }

            console.log('[Supabase] User role updated');
            return { success: true, user: data };

        } catch (error) {
            console.error('[Supabase] Update role exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Expose global API
    window.MODA_SUPABASE = {
        initialize,
        login,
        signUp,
        logout,
        resetPassword,
        updateProfile,
        onAuthStateChange,
        getAllUsers,
        updateUserRole,
        get client() { return supabase; },
        get currentUser() { return currentUser; },
        get userProfile() { return userProfile; },
        get isInitialized() { return isInitialized; }
    };

    // Auto-initialize when script loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    console.log('[Supabase] Client module loaded');
})();
