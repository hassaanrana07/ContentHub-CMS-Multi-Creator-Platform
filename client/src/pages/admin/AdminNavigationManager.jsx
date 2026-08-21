import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Toast } from '../../components/ui/Toast';
import { SlidersHorizontal, Save, ExternalLink } from 'lucide-react';

export const AdminNavigationManager = () => {
  const [navSettings, setNavSettings] = useState({
    footer_text: '',
    copyright_text: '',
    social_links: { twitter: '', github: '', linkedin: '', facebook: '' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    fetchNavigationSettings();
  }, []);

  const fetchNavigationSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/site/navigation');
      if (res.data.navigation) {
        const nav = res.data.navigation;
        let parsedSocial = { twitter: '', github: '', linkedin: '', facebook: '' };
        if (typeof nav.social_links === 'string') {
          try { parsedSocial = JSON.parse(nav.social_links); } catch(e) {}
        } else if (typeof nav.social_links === 'object' && nav.social_links !== null) {
          parsedSocial = nav.social_links;
        }

        setNavSettings({
          footer_text: nav.footer_text || '',
          copyright_text: nav.copyright_text || '',
          social_links: parsedSocial
        });
      }
    } catch (err) {
      showToast('Failed to load navigation settings.', 'error');
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
      await axios.put('/api/admin/site/navigation', navSettings);
      showToast('Main ContentHub navigation & footer settings updated!');
    } catch (err) {
      showToast('Failed to update navigation settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-4xl">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-gold/10 text-warm-gold text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Platform Layout CMS
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-charcoal">Navigation & Footer Settings</h1>
          <p className="text-sm text-warm-muted">Manage footer text, copyright notices, and platform social links on contenthub.com /.</p>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-warm-surface border border-warm-border hover:bg-warm-hover text-warm-charcoal text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <span>Preview Footer (/)</span>
          <ExternalLink className="w-3.5 h-3.5 text-warm-terracotta" />
        </a>
      </div>

      {loading ? (
        <div className="h-64 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
      ) : (
        <form onSubmit={handleSubmit} className="bg-warm-surface border border-warm-border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
          <div className="space-y-4">
            <h3 className="text-base font-serif font-bold text-warm-charcoal border-b border-warm-border pb-2">
              Platform Footer Information
            </h3>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                Footer Tagline / Text
              </label>
              <textarea
                rows={3}
                value={navSettings.footer_text}
                onChange={(e) => setNavSettings({ ...navSettings, footer_text: e.target.value })}
                placeholder="ContentHub CMS empowers independent authors..."
                className="w-full px-3.5 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                Copyright Text
              </label>
              <input
                type="text"
                value={navSettings.copyright_text}
                onChange={(e) => setNavSettings({ ...navSettings, copyright_text: e.target.value })}
                placeholder="© 2026 ContentHub Platform Inc. All rights reserved."
                className="w-full px-3.5 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-warm-border">
            <h3 className="text-base font-serif font-bold text-warm-charcoal border-b border-warm-border pb-2">
              Platform Social Media Handles
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Twitter / X URL</label>
                <input
                  type="url"
                  value={navSettings.social_links?.twitter || ''}
                  onChange={(e) => setNavSettings({ ...navSettings, social_links: { ...navSettings.social_links, twitter: e.target.value } })}
                  placeholder="https://twitter.com/contenthub"
                  className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">GitHub Repository URL</label>
                <input
                  type="url"
                  value={navSettings.social_links?.github || ''}
                  onChange={(e) => setNavSettings({ ...navSettings, social_links: { ...navSettings.social_links, github: e.target.value } })}
                  placeholder="https://github.com/contenthub"
                  className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">LinkedIn URL</label>
                <input
                  type="url"
                  value={navSettings.social_links?.linkedin || ''}
                  onChange={(e) => setNavSettings({ ...navSettings, social_links: { ...navSettings.social_links, linkedin: e.target.value } })}
                  placeholder="https://linkedin.com/company/contenthub"
                  className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Facebook URL</label>
                <input
                  type="url"
                  value={navSettings.social_links?.facebook || ''}
                  onChange={(e) => setNavSettings({ ...navSettings, social_links: { ...navSettings.social_links, facebook: e.target.value } })}
                  placeholder="https://facebook.com/contenthub"
                  className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
                />
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
              <span>{saving ? 'Saving...' : 'Save Navigation Settings'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
