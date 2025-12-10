/**
 * Firebase Login Page for MODA
 * 
 * Provides email/password authentication with Autovol branding.
 * Includes password reset functionality.
 */

import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const LoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  
  const { login, resetPassword } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      if (onLoginSuccess) onLoginSuccess();
    } catch (error) {
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await resetPassword(email);
      setResetMessage('Password reset email sent! Check your inbox.');
      setTimeout(() => {
        setResetMode(false);
        setResetMessage('');
      }, 3000);
    } catch (error) {
      setError(getErrorMessage(error.code));
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (code) => {
    switch (code) {
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/invalid-credential':
        return 'Invalid email or password';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection.';
      default:
        return 'Login failed. Please try again.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0f172a 100%)' }}>
      <div className="w-full max-w-md p-8">
        {/* Autovol Logo/Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-2xl shadow-lg mb-4">
            <img 
              src="/autovol-logo.png" 
              alt="Autovol" 
              className="w-20 h-20 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="hidden items-center justify-center w-full h-full">
              <span className="text-4xl font-bold" style={{ color: '#1E3A5F' }}>M</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">MODA</h1>
          <p className="text-gray-300">Modular Operations Dashboard</p>
          <p className="text-gray-400 text-sm mt-1">Autovol Volumetric Modular</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {resetMode ? 'Reset Password' : 'Sign In'}
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
              <span>⚠️</span>
              {error}
            </div>
          )}

          {/* Success Message */}
          {resetMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm flex items-center gap-2">
              <span>✅</span>
              {resetMessage}
            </div>
          )}

          <form onSubmit={resetMode ? handlePasswordReset : handleLogin}>
            {/* Email Input */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-semibold mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                placeholder="you@autovol.com"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>

            {/* Password Input (hidden in reset mode) */}
            {!resetMode && (
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                background: 'linear-gradient(135deg, #1E3A5F 0%, #2DD4BF 100%)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Please wait...
                </span>
              ) : (
                resetMode ? 'Send Reset Link' : 'Sign In'
              )}
            </button>
          </form>

          {/* Toggle Reset Mode */}
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setResetMode(!resetMode);
                setError('');
                setResetMessage('');
              }}
              className="text-sm text-blue-600 hover:text-blue-700 transition"
            >
              {resetMode ? '← Back to Sign In' : 'Forgot Password?'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>Need access? Contact your supervisor</p>
          <p className="mt-2 text-gray-500 text-xs">
            © {new Date().getFullYear()} Autovol Volumetric Modular
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
