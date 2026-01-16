// ============================================================================
// MODA LOGIN PAGE COMPONENT
// Extracted from App.jsx for better maintainability
// ============================================================================

const { useState } = React;

// Use AUTOVOL_LOGO from App.jsx (loaded before this file)
const AUTOVOL_LOGO = window.AUTOVOL_LOGO || "./public/autovol-logo.png";

        function LoginForm({ auth, onForgotPassword }) {
            const [email, setEmail] = useState('');
            const [password, setPassword] = useState('');
            const [showPassword, setShowPassword] = useState(false);
            const [rememberMe, setRememberMe] = useState(false);
            const [error, setError] = useState('');
            const [loading, setLoading] = useState(false);

            const handleSubmit = async (e) => {
                e.preventDefault();
                setError(''); setLoading(true);
                await new Promise(r => setTimeout(r, 500));
                const result = await auth.login(email, password, rememberMe);
                if (!result.success) setError(result.error);
                setLoading(false);
            };

            return (
                <>
                    <div className="text-center mb-8">
                        <img 
                            src={AUTOVOL_LOGO} 
                            alt="Autovol Volumetric Modular" 
                            style={{height: '60px', width: 'auto', margin: '0 auto'}}
                        />
                        <p className="text-gray-500 text-xs mt-3">Making Smart Construction Brilliant™</p>
                    </div>
                    <h2 style={{color: '#1E3A5F'}} className="text-xl font-semibold text-center mb-6">Sign in to MODA</h2>
                    {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{backgroundColor: '#FDEAEA', color: '#E31B23'}}>{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@autovol.com" required /></div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? 'text' : 'password'} 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    className="input-field pr-10" 
                                    placeholder="••••••••" 
                                    required 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded" /><span className="text-sm text-gray-600">Remember me</span></label>
                            <button type="button" onClick={onForgotPassword} className="text-sm font-medium" style={{color: '#007B8A'}}>Forgot password?</button>
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-semibold btn-primary">{loading ? 'Signing in...' : 'Sign In'}</button>
                    </form>
                    <div className="mt-6 pt-6 border-t text-center">
                        <p className="text-xs text-gray-400">Modular Operations Dashboard Application</p>
                    </div>
                </>
            );
        }

        // Set Password Form - shown when user clicks invite link
        function SetPasswordForm({ auth, onComplete }) {
            const [password, setPassword] = useState('');
            const [confirmPassword, setConfirmPassword] = useState('');
            const [showPassword, setShowPassword] = useState(false);
            const [error, setError] = useState('');
            const [loading, setLoading] = useState(false);

            const handleSubmit = async (e) => {
                e.preventDefault();
                setError('');

                if (password.length < 6) {
                    setError('Password must be at least 6 characters');
                    return;
                }

                if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    return;
                }

                setLoading(true);
                try {
                    // Get access token from localStorage (avoids SDK Promise hanging)
                    const SUPABASE_URL = 'https://syreuphexagezawjyjgt.supabase.co';
                    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5cmV1cGhleGFnZXphd2p5amd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2Mzc1MDEsImV4cCI6MjA4MTIxMzUwMX0.-0Th_v-LDCXER9v06-mjfdEUZtRxZZSHHWypmTQXmbs';
                    
                    let accessToken = null;
                    try {
                        const storageKey = 'sb-syreuphexagezawjyjgt-auth-token';
                        const stored = localStorage.getItem(storageKey);
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            accessToken = parsed?.access_token;
                        }
                    } catch (e) {
                        console.warn('[SetPasswordForm] Could not get token from storage:', e);
                    }
                    
                    console.log('[SetPasswordForm] Got access token:', !!accessToken);
                    
                    if (!accessToken) {
                        setError('Session expired. Please use the invite link again.');
                        setLoading(false);
                        return;
                    }

                    console.log('[SetPasswordForm] Updating password via fetch API...');
                    
                    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${accessToken}`
                        },
                        body: JSON.stringify({ password: password })
                    });

                    const result = await response.json();
                    console.log('[SetPasswordForm] Update response:', response.status, result);

                    if (!response.ok || result.error) {
                        setError(result.error_description || result.error || result.msg || 'Failed to set password');
                        setLoading(false);
                        return;
                    }

                    console.log('[SetPasswordForm] Password updated successfully');
                    
                    // Ensure profile exists - create if missing
                    const userId = result.id;
                    const userEmail = result.email;
                    const userName = result.user_metadata?.name || userEmail?.split('@')[0] || 'User';
                    
                    if (userId) {
                        try {
                            // Check if profile exists
                            const profileCheck = await fetch(
                                `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=id`,
                                {
                                    headers: {
                                        'apikey': SUPABASE_ANON_KEY,
                                        'Authorization': `Bearer ${accessToken}`
                                    }
                                }
                            );
                            const profiles = await profileCheck.json();
                            
                            if (!profiles || profiles.length === 0) {
                                console.log('[SetPasswordForm] Profile missing, creating...');
                                // Profile doesn't exist, create it
                                const createProfile = await fetch(
                                    `${SUPABASE_URL}/rest/v1/profiles`,
                                    {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'apikey': SUPABASE_ANON_KEY,
                                            'Authorization': `Bearer ${accessToken}`,
                                            'Prefer': 'return=minimal'
                                        },
                                        body: JSON.stringify({
                                            id: userId,
                                            email: userEmail,
                                            name: userName,
                                            dashboard_role: result.user_metadata?.dashboard_role || 'employee',
                                            is_protected: false
                                        })
                                    }
                                );
                                console.log('[SetPasswordForm] Profile create response:', createProfile.status);
                            } else {
                                console.log('[SetPasswordForm] Profile already exists');
                            }
                        } catch (profileErr) {
                            console.warn('[SetPasswordForm] Profile check/create error (non-fatal):', profileErr);
                        }
                    }

                    // Password set successfully - complete the flow
                    if (onComplete) onComplete();
                } catch (err) {
                    console.error('[SetPasswordForm] Exception:', err);
                    setError(err.message || 'Failed to set password');
                }
                setLoading(false);
            };

            return (
                <>
                    <div className="text-center mb-8">
                        <img 
                            src={AUTOVOL_LOGO} 
                            alt="Autovol Volumetric Modular" 
                            style={{height: '60px', width: 'auto', margin: '0 auto'}}
                        />
                        <p className="text-gray-500 text-xs mt-3">Making Smart Construction Brilliant™</p>
                    </div>
                    <h2 style={{color: '#1E3A5F'}} className="text-xl font-semibold text-center mb-2">Welcome to MODA!</h2>
                    <p className="text-gray-500 text-sm text-center mb-6">Set your password to complete your account setup.</p>
                    {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{backgroundColor: '#FDEAEA', color: '#E31B23'}}>{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? 'text' : 'password'} 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    className="input-field pr-10" 
                                    placeholder="At least 6 characters" 
                                    required 
                                    minLength={6}
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <input 
                                type={showPassword ? 'text' : 'password'} 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                className="input-field" 
                                placeholder="Re-enter your password" 
                                required 
                            />
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-semibold btn-primary">
                            {loading ? 'Setting up...' : 'Set Password & Continue'}
                        </button>
                    </form>
                    <div className="mt-6 pt-6 border-t text-center">
                        <p className="text-xs text-gray-400">Modular Operations Dashboard Application</p>
                    </div>
                </>
            );
        }

        function ForgotPasswordForm({ auth, onBack }) {
            const [email, setEmail] = useState('');
            const [message, setMessage] = useState('');
            const [error, setError] = useState('');
            const [loading, setLoading] = useState(false);

            const handleSubmit = async (e) => {
                e.preventDefault();
                setError(''); setMessage(''); setLoading(true);
                const result = await auth.resetPassword(email);
                if (result.success) setMessage(result.message);
                else setError(result.error);
                setLoading(false);
            };

            return (
                <>
                    <button onClick={onBack} className="mb-4 text-sm flex items-center gap-1" style={{color: '#007B8A'}}>← Back to login</button>
                    <h2 style={{color: '#1E3A5F'}} className="text-xl font-semibold mb-2">Reset Password</h2>
                    <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send you a reset link.</p>
                    {error && <div className="mb-4 p-3 rounded-lg text-sm" style={{backgroundColor: '#FDEAEA', color: '#E31B23'}}>{error}</div>}
                    {message && <div className="mb-4 p-3 rounded-lg text-sm" style={{backgroundColor: '#E6F4F5', color: '#007B8A'}}>{message}</div>}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@autovol.com" required /></div>
                        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-semibold btn-primary">{loading ? 'Sending...' : 'Send Reset Link'}</button>
                    </form>
                </>
            );
        }

        function LoginPage({ auth }) {
            const [view, setView] = useState('login');
            const [isInviteFlow, setIsInviteFlow] = useState(false);

            // Check for invite/recovery tokens in URL on mount
            React.useEffect(() => {
                const checkForInviteToken = async () => {
                    // Supabase puts tokens in the URL hash after redirect
                    const hash = window.location.hash;
                    const params = new URLSearchParams(hash.replace('#', ''));
                    
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');
                    const type = params.get('type');
                    
                    console.log('[LoginPage] Checking URL for tokens, type:', type);
                    
                    // If this is an invite or recovery flow
                    if (accessToken && (type === 'invite' || type === 'recovery' || type === 'signup')) {
                        console.log('[LoginPage] Invite/recovery token detected, setting session');
                        setIsInviteFlow(true);
                        
                        // Set the session with the tokens from the URL
                        try {
                            const { error } = await window.MODA_SUPABASE.client.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken
                            });
                            
                            if (error) {
                                console.error('[LoginPage] Error setting session:', error);
                                setIsInviteFlow(false);
                            } else {
                                // Clear the hash from URL for cleaner look
                                window.history.replaceState(null, '', window.location.pathname);
                            }
                        } catch (err) {
                            console.error('[LoginPage] Exception setting session:', err);
                            setIsInviteFlow(false);
                        }
                    }
                };
                
                checkForInviteToken();
            }, []);

            const handlePasswordSetComplete = () => {
                // Password was set, user should now be logged in via Supabase auth state change
                setIsInviteFlow(false);
                // Force a page reload to pick up the new auth state
                window.location.reload();
            };

            return (
                <div className="min-h-screen flex items-center justify-center py-8 px-4 relative login-background" style={{minHeight: '100vh', overflowY: 'auto'}}>
                    <div className="production-lines"></div>
                    <div className="login-card w-full max-w-md p-8 relative z-10">
                        {isInviteFlow && <SetPasswordForm auth={auth} onComplete={handlePasswordSetComplete} />}
                        {!isInviteFlow && view === 'login' && <LoginForm auth={auth} onForgotPassword={() => setView('forgot')} />}
                        {!isInviteFlow && view === 'forgot' && <ForgotPasswordForm auth={auth} onBack={() => setView('login')} />}
                    </div>
                </div>
            );
        }
        // ===== END AUTHENTICATION SYSTEM =====

// Export for use in App.jsx
window.LoginPage = LoginPage;
window.LoginForm = LoginForm;
window.ForgotPasswordForm = ForgotPasswordForm;
window.SetPasswordForm = SetPasswordForm;
