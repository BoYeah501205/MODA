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

    // Supabase configuration
    const SUPABASE_URL = 'https://syreuphexagezawjyjgt.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5cmV1cGhleGFnZXphd2p5amd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Mzc1MDEsImV4cCI6MjA4MTIxMzUwMX0.-0Th_v-LDCXER9v06-mjfdEUZtRxZZSHHWypmTQXmbs';

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
                    
                    // Fetch user profile using direct fetch API (SDK has hanging issues)
                    try {
                        console.log('[Supabase] Fetching profile for user:', session.user.id);
                        const profileResponse = await fetch(
                            `${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=*`,
                            {
                                headers: {
                                    'apikey': SUPABASE_ANON_KEY,
                                    'Authorization': `Bearer ${session.access_token}`
                                }
                            }
                        );
                        const profiles = await profileResponse.json();
                        console.log('[Supabase] Profile response:', profiles);
                        
                        if (profiles && profiles.length > 0) {
                            userProfile = profiles[0];
                            console.log('[Supabase] Loaded user profile, role:', userProfile.dashboard_role);
                            // Dispatch event to notify components that profile is loaded
                            window.dispatchEvent(new CustomEvent('moda-profile-loaded', { detail: userProfile }));
                        } else {
                            // Profile doesn't exist - use default values
                            console.log('[Supabase] No profile found, using defaults');
                            userProfile = {
                                id: session.user.id,
                                email: session.user.email,
                                name: session.user.user_metadata?.name || session.user.email.split('@')[0],
                                dashboard_role: 'employee',
                                is_protected: false
                            };
                            // Still dispatch event with defaults so UI updates
                            window.dispatchEvent(new CustomEvent('moda-profile-loaded', { detail: userProfile }));
                        }
                    } catch (err) {
                        console.error('[Supabase] Profile fetch error:', err);
                        // Use defaults on error
                        userProfile = {
                            id: session.user.id,
                            email: session.user.email,
                            name: session.user.user_metadata?.name || session.user.email.split('@')[0],
                            dashboard_role: 'employee',
                            is_protected: false
                        };
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
    // Note: signInWithPassword Promise doesn't resolve reliably, so we use auth state listener
    // Email is normalized to lowercase for case-insensitive login
    async function login(email, password) {
        // Ensure initialized
        if (!supabase) {
            console.log('[Supabase] Not initialized, initializing now...');
            await initialize();
        }
        
        if (!supabase) {
            return { success: false, error: 'Supabase not initialized' };
        }

        // Normalize email to lowercase for case-insensitive login
        const normalizedEmail = email.trim().toLowerCase();
        console.log('[Supabase] Calling signInWithPassword with:', normalizedEmail);
        
        try {
            // Use fetch API directly to avoid SDK Promise hanging issues
            const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY
                },
                body: JSON.stringify({ email: normalizedEmail, password })
            });
            
            const result = await response.json();
            console.log('[Supabase] Auth response status:', response.status);
            
            if (!response.ok || result.error) {
                console.error('[Supabase] Login error:', result.error_description || result.error || result.msg);
                return { success: false, error: result.error_description || result.error || result.msg || 'Login failed' };
            }
            
            if (!result.user) {
                console.error('[Supabase] No user in response');
                return { success: false, error: 'Login failed - no user returned' };
            }
            
            console.log('[Supabase] Login succeeded, user:', result.user.email);
            currentUser = result.user;
            
            // Fetch profile using fetch API to avoid SDK hanging
            let profileData = null;
            try {
                console.log('[Supabase] Fetching profile...');
                const profileResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${result.user.id}&select=*`,
                    {
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${result.access_token}`
                        }
                    }
                );
                const profiles = await profileResponse.json();
                console.log('[Supabase] Profile response:', profiles);
                if (profiles && profiles.length > 0) {
                    profileData = profiles[0];
                    userProfile = profileData;
                    console.log('[Supabase] Loaded profile, role:', profileData.dashboard_role);
                } else {
                    console.log('[Supabase] No profile found, using defaults');
                    userProfile = {
                        id: result.user.id,
                        email: result.user.email,
                        name: result.user.email.split('@')[0],
                        dashboard_role: 'employee',
                        is_protected: false
                    };
                    profileData = userProfile;
                }
            } catch (err) {
                console.error('[Supabase] Profile fetch error:', err);
                userProfile = {
                    id: result.user.id,
                    email: result.user.email,
                    name: result.user.email.split('@')[0],
                    dashboard_role: 'employee',
                    is_protected: false
                };
                profileData = userProfile;
            }
            
            console.log('[Supabase] Login complete, user:', result.user.email, 'role:', profileData?.dashboard_role);
            
            // Dispatch event to notify components that profile is loaded
            window.dispatchEvent(new CustomEvent('moda-profile-loaded', { detail: profileData }));
            
            return { success: true, user: result.user, profile: profileData };
            
        } catch (error) {
            console.error('[Supabase] Login exception:', error);
            return { success: false, error: error.message || 'Login failed' };
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

    // Invite user by email (sends magic link)
    // This calls a Supabase Edge Function that uses service_role key
    async function inviteUser(email, metadata = {}) {
        if (!supabase) {
            return { success: false, error: 'Supabase not initialized' };
        }

        try {
            console.log('[Supabase] Sending invite to:', email);
            
            // Use direct fetch to avoid SDK Promise hanging issues
            const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    email,
                    metadata,
                    redirectTo: window.location.origin
                })
            });

            const data = await response.json();
            console.log('[Supabase] Invite response:', response.status, data);

            if (!response.ok || data.error) {
                console.error('[Supabase] Invite error:', data.error);
                return { success: false, error: data.error || 'Failed to send invite' };
            }

            console.log('[Supabase] Invite sent to:', email);
            return { success: true, message: `Invite sent to ${email}` };

        } catch (error) {
            console.error('[Supabase] Invite exception:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if a user exists by email (uses profiles table)
    // Uses direct fetch API to avoid SDK Promise hanging
    async function checkUserByEmail(email) {
        if (!supabase) {
            return { success: false, exists: false, error: 'Supabase not initialized' };
        }

        try {
            console.log('[Supabase] Checking user by email via direct API:', email);
            
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/profiles?select=id,email,name,dashboard_role,created_at&email=eq.${encodeURIComponent(email)}`,
                {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = await response.json();
            console.log('[Supabase] Check user response:', response.status, data);

            if (!response.ok) {
                console.error('[Supabase] Check user error:', data);
                return { success: false, exists: false, error: data.message || 'Check failed' };
            }

            const user = Array.isArray(data) && data.length > 0 ? data[0] : null;
            
            return { 
                success: true, 
                exists: !!user, 
                user: user 
            };

        } catch (error) {
            console.error('[Supabase] Check user exception:', error);
            return { success: false, exists: false, error: error.message };
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
        inviteUser,
        checkUserByEmail,
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
