import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Lock, UserCheck, ArrowRight, AlertCircle } from 'lucide-react';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await register(formData);
      // Redirect to /login with success message (NO AUTO LOGIN)
      navigate('/login', {
        state: {
          successMessage: res.message || 'Account created successfully. Please log in to access your dashboard.'
        }
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4 font-sans py-12">
      <div className="w-full max-w-lg bg-warm-surface border border-warm-border rounded-2xl shadow-xl overflow-hidden p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-warm-terracotta text-white font-serif font-bold text-xl shadow-md mb-2">
            C
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-charcoal tracking-tight">Create Creator Account</h1>
          <p className="text-sm text-warm-muted">Join ContentHub CMS to launch your custom public website</p>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-3.5 rounded-lg bg-warm-terracotta/10 border border-warm-terracotta/20 text-warm-terracotta text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-warm-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Hassan Ali"
                  className="w-full pl-10 pr-4 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-warm-text focus:outline-none focus:border-warm-brown focus:ring-1 focus:ring-warm-brown text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                Username
              </label>
              <div className="relative">
                <UserCheck className="w-5 h-5 text-warm-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  name="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="hassan"
                  className="w-full pl-10 pr-4 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-warm-text focus:outline-none focus:border-warm-brown focus:ring-1 focus:ring-warm-brown text-sm"
                />
              </div>
              <p className="text-[11px] text-warm-muted mt-1">Public URL: /{formData.username || 'username'}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-warm-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="hassan@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-warm-text focus:outline-none focus:border-warm-brown focus:ring-1 focus:ring-warm-brown text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-warm-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-warm-text focus:outline-none focus:border-warm-brown focus:ring-1 focus:ring-warm-brown text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-warm-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-warm-text focus:outline-none focus:border-warm-brown focus:ring-1 focus:ring-warm-brown text-sm"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-warm-terracotta hover:bg-warm-terracotta/90 text-white font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating Account & Launching Website...' : 'Create Account & Launch Website'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center text-xs text-warm-muted pt-2 border-t border-warm-border">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-warm-terracotta hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
