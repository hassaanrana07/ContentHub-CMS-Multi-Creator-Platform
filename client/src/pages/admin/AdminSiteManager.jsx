import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Toast } from '../../components/ui/Toast';
import { Globe, Save, ExternalLink, Palette, Layers, Sparkles } from 'lucide-react';

export const AdminSiteManager = () => {
  const [settings, setSettings] = useState({
    site_title: '',
    site_description: '',
    logo_url: '',
    primary_color: '#171513',
    secondary_color: '#6B4F3A',
    accent_color: '#A65F46'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    fetchAdminSite();
  }, []);

  const fetchAdminSite = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/site/settings');
      if (res.data.settings) {
        setSettings(res.data.settings);
      }
    } catch (err) {
      showToast('Failed to load Admin site settings.', 'error');
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
      const res = await axios.put('/api/admin/site/settings', settings);
      setSettings(res.data.settings);
      showToast('Main ContentHub Website (contenthub.com /) updated successfully!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update site settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-4xl">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-terracotta/10 text-warm-terracotta text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <Globe className="w-3.5 h-3.5" /> ContentHub Root Website Management
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-charcoal">Main ContentHub Public Website (/)</h1>
          <p className="text-sm text-warm-muted">Control the content, metadata, and branding of the main ContentHub public landing page.</p>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-warm-surface border border-warm-border hover:bg-warm-hover text-warm-charcoal text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <span>Preview Main Website (/)</span>
          <ExternalLink className="w-3.5 h-3.5 text-warm-terracotta" />
        </a>
      </div>

      {loading ? (
        <div className="h-64 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
      ) : (
        <form onSubmit={handleSubmit} className="bg-warm-surface border border-warm-border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="space-y-4">
            <h3 className="text-base font-serif font-bold text-warm-charcoal border-b border-warm-border pb-2">
              Main Platform Metadata & Identity
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                  Platform Title (Header Name)
                </label>
                <input
                  type="text"
                  required
                  value={settings.site_title || ''}
                  onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
                  placeholder="ContentHub CMS — Multi-Creator Platform"
                  className="w-full px-3.5 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown font-serif"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                  Platform Logo URL (Optional)
                </label>
                <input
                  type="url"
                  value={settings.logo_url || ''}
                  onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3.5 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                Main Site Tagline & SEO Description
              </label>
              <textarea
                rows={3}
                value={settings.site_description || ''}
                onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
                placeholder="The ultimate multi-creator platform..."
                className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-warm-border">
            <h3 className="text-base font-serif font-bold text-warm-charcoal border-b border-warm-border pb-2">
              Platform Brand Color Tokens
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.primary_color || '#171513'}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="w-10 h-10 rounded border border-warm-border cursor-pointer bg-warm-bg p-1"
                  />
                  <input
                    type="text"
                    value={settings.primary_color || '#171513'}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="w-full px-3 py-2 bg-warm-bg border border-warm-border rounded-lg text-xs font-mono uppercase text-warm-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                  Secondary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.secondary_color || '#6B4F3A'}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    className="w-10 h-10 rounded border border-warm-border cursor-pointer bg-warm-bg p-1"
                  />
                  <input
                    type="text"
                    value={settings.secondary_color || '#6B4F3A'}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    className="w-full px-3 py-2 bg-warm-bg border border-warm-border rounded-lg text-xs font-mono uppercase text-warm-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.accent_color || '#A65F46'}
                    onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                    className="w-10 h-10 rounded border border-warm-border cursor-pointer bg-warm-bg p-1"
                  />
                  <input
                    type="text"
                    value={settings.accent_color || '#A65F46'}
                    onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                    className="w-full px-3 py-2 bg-warm-bg border border-warm-border rounded-lg text-xs font-mono uppercase text-warm-text"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-4 border-t border-warm-border">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-warm-terracotta hover:bg-warm-terracotta/90 text-white font-semibold text-xs rounded-lg shadow-md transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Main Website Settings'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
