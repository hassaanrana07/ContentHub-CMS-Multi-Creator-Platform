import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Toast } from '../../components/ui/Toast';
import { User, Save } from 'lucide-react';

export const ProfileSettings = () => {
  const { fetchCurrentUser } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    display_name: '',
    bio: '',
    profile_image: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/creator/profile');
      if (res.data.profile) {
        setProfile({
          name: res.data.profile.name || '',
          display_name: res.data.profile.display_name || '',
          bio: res.data.profile.bio || '',
          profile_image: res.data.profile.profile_image || ''
        });
      }
    } catch (err) {
      showToast('Failed to load profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put('/api/creator/profile', profile);
      await fetchCurrentUser();
      showToast('Creator profile updated successfully!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-3xl">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="flex items-center justify-between pb-4 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-brown/10 text-warm-brown text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <User className="w-3.5 h-3.5" /> Account & Profile
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-charcoal">Creator Profile</h1>
          <p className="text-sm text-warm-muted">Update your display name, bio, and avatar image shown across your website.</p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
      ) : (
        <form onSubmit={handleSubmit} className="bg-warm-surface border border-warm-border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-6 pb-4 border-b border-warm-border">
            {profile.profile_image ? (
              <img
                src={profile.profile_image}
                alt={profile.display_name}
                className="w-20 h-20 rounded-full object-cover border-2 border-warm-border shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-warm-brown text-white font-serif font-bold text-2xl flex items-center justify-center border-2 border-warm-border shadow-sm">
                {profile.display_name?.[0] || 'C'}
              </div>
            )}
            <div>
              <h3 className="font-serif font-bold text-lg text-warm-charcoal">{profile.display_name || 'Creator'}</h3>
              <p className="text-xs text-warm-muted">Your public creator identity</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                Full Account Name
              </label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                Public Display Name
              </label>
              <input
                type="text"
                required
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown font-serif"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
              Profile Avatar Image URL
            </label>
            <input
              type="url"
              value={profile.profile_image}
              onChange={(e) => setProfile({ ...profile, profile_image: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3.5 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
              Creator Bio / About Description
            </label>
            <textarea
              rows={4}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Write a brief bio introducing yourself..."
              className="w-full px-3.5 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-warm-border">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-warm-terracotta hover:bg-warm-terracotta/90 text-white font-semibold text-xs rounded-lg shadow-md transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
