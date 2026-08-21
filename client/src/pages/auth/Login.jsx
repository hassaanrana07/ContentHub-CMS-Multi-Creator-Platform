import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, ArrowRight, Lock, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const successMessage = location.state?.successMessage || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(identifier, password);
      if (data.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (quickId, quickPass) => {
    setIdentifier(quickId);
    setPassword(quickPass);
  };

  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-warm-surface border border-warm-border rounded-2xl shadow-xl overflow-hidden p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-warm-charcoal text-white font-serif font-bold text-xl shadow-md mb-2">
            C
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-charcoal tracking-tight">ContentHub CMS</h1>
          <p className="text-sm text-warm-muted">Sign in to manage your creator website & content</p>
        </div>

        {/* Success Banner from Signup Redirect */}
        {successMessage && (
          <div className="flex items-center gap-3 p-3.5 rounded-lg bg-warm-gold/10 border border-warm-gold/30 text-warm-charcoal text-xs font-medium leading-relaxed">
            <CheckCircle2 className="w-5 h-5 text-warm-brown shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-3.5 rounded-lg bg-warm-terracotta/10 border border-warm-terracotta/20 text-warm-terracotta text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
              Username or Email Address
            </label>
            <div className="relative">
              <UserCheck className="w-5 h-5 text-warm-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="hassan or hassan@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-warm-text focus:outline-none focus:border-warm-brown focus:ring-1 focus:ring-warm-brown text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-warm-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-warm-text focus:outline-none focus:border-warm-brown focus:ring-1 focus:ring-warm-brown text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-warm-charcoal hover:bg-warm-black text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Credentials Assistant */}
        <div className="pt-4 border-t border-warm-border space-y-3">
          <p className="text-xs font-mono uppercase tracking-wider text-warm-gold text-center">
            Demo Accounts (Click to Fill)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@contenthub.com', 'Admin123!')}
              className="px-2.5 py-1.5 rounded bg-warm-bg hover:bg-warm-hover border border-warm-border text-warm-charcoal font-medium text-left truncate"
            >
              👑 Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('hassan', 'Creator123!')}
              className="px-2.5 py-1.5 rounded bg-warm-bg hover:bg-warm-hover border border-warm-border text-warm-charcoal font-medium text-left truncate"
            >
              🎨 Creator: hassan
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('sarah', 'Creator123!')}
              className="px-2.5 py-1.5 rounded bg-warm-bg hover:bg-warm-hover border border-warm-border text-warm-charcoal font-medium text-left truncate"
            >
              🎨 Creator: sarah
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('ali', 'Creator123!')}
              className="px-2.5 py-1.5 rounded bg-warm-bg hover:bg-warm-hover border border-warm-border text-warm-charcoal font-medium text-left truncate"
            >
              🎨 Creator: ali
            </button>
          </div>
        </div>

        {/* Footer link to register */}
        <div className="text-center text-xs text-warm-muted">
          Don't have a creator profile yet?{' '}
          <Link to="/register" className="font-semibold text-warm-terracotta hover:underline">
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
};
