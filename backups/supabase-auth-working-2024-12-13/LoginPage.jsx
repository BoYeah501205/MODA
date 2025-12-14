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
                                    {showPassword ? '🙈' : '👁'}
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
            return (
                <div className="min-h-screen flex items-center justify-center p-4 relative login-background">
                    <div className="production-lines"></div>
                    <div className="login-card w-full max-w-md p-8 relative z-10">
                        {view === 'login' && <LoginForm auth={auth} onForgotPassword={() => setView('forgot')} />}
                        {view === 'forgot' && <ForgotPasswordForm auth={auth} onBack={() => setView('login')} />}
                    </div>
                </div>
            );
        }
        // ===== END AUTHENTICATION SYSTEM =====

// Export for use in App.jsx
window.LoginPage = LoginPage;
window.LoginForm = LoginForm;
window.ForgotPasswordForm = ForgotPasswordForm;
