import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Toast } from '../../components/ui/Toast';
import { Palette, Save, Type, Eye } from 'lucide-react';

export const WebsiteSettings = () => {
  const [settings, setSettings] = useState({
    site_title: '',
    site_description: '',
    logo_url: '',
    favicon_url: '',
    primary_color: '#24211E',
    secondary_color: '#6B4F3A',
    accent_color: '#A65F46',
    bg_color: '#F5F1EA',
    surface_color: '#FFFFFF',
    text_color: '#171513',
    muted_color: '#756D65',
    font_family: 'Inter',
    base_font_size: '16px',
    heading_scale: '1.0'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/creator/website-settings');
      if (res.data.settings) {
        setSettings({
          ...res.data.settings,
          bg_color: res.data.settings.bg_color || '#F5F1EA',
          surface_color: res.data.settings.surface_color || '#FFFFFF',
          text_color: res.data.settings.text_color || '#171513',
          muted_color: res.data.settings.muted_color || '#756D65',
          base_font_size: res.data.settings.base_font_size || '16px',
          heading_scale: res.data.settings.heading_scale || '1.0'
        });
      }
    } catch (err) {
      showToast('Failed to load website settings.', 'error');
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
      const res = await axios.put('/api/creator/website-settings', settings);
      setSettings(res.data.settings);
      showToast('Website settings and theme saved! Live site updated.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const fontOptions = ['Inter', 'Georgia', 'Merriweather', 'Playfair Display', 'Roboto', 'Lora', 'Plus Jakarta Sans'];
  const fontSizeOptions = ['14px', '16px', '18px'];

  return (
    <div className="space-y-6 font-sans max-w-4xl">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="flex items-center justify-between pb-4 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-gold/10 text-warm-gold text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <Palette className="w-3.5 h-3.5" /> Theme & Customization CMS
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-charcoal">Website Settings</h1>
          <p className="text-sm text-warm-muted">Control your public website colors, typography, metadata, and branding.</p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
      ) : (
        <form onSubmit={handleSubmit} className="bg-warm-surface border border-warm-border rounded-2xl p-6 md:p-8 space-y-8 shadow-sm">
          {/* Section 1: Identity & Metadata */}
          <div className="space-y-4">
            <h3 className="text-base font-serif font-bold text-warm-charcoal border-b border-warm-border pb-2">
              Identity & Metadata
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                  Public Website Title
                </label>
                <input
                  type="text"
                  required
                  value={settings.site_title || ''}
                  onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
                  placeholder="e.g. Hassan Ali — Software Architect"
                  className="w-full px-3.5 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown font-serif"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                  Logo URL (Optional)
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
                Site Description / Tagline
              </label>
              <textarea
                rows={2}
                value={settings.site_description || ''}
                onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
                placeholder="Brief description displayed on your homepage..."
                className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
              />
            </div>
          </div>

          {/* Section 2: Color Palette */}
          <div className="space-y-4 pt-4 border-t border-warm-border">
            <h3 className="text-base font-serif font-bold text-warm-charcoal border-b border-warm-border pb-2 flex items-center justify-between">
              <span>Color Palette Customization</span>
              <span className="text-xs font-mono font-normal text-warm-gold">Live Dynamic CSS Tokens</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                  Primary Color (Header/Buttons)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.primary_color || '#24211E'}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="w-10 h-10 rounded border border-warm-border cursor-pointer bg-warm-bg p-1"
                  />
                  <input
                    type="text"
                    value={settings.primary_color || '#24211E'}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="w-full px-3 py-2 bg-warm-bg border border-warm-border rounded-lg text-xs font-mono uppercase text-warm-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                  Secondary Color (Badges)
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
                  Accent Color (CTA Buttons)
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

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                  Page Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.bg_color || '#F5F1EA'}
                    onChange={(e) => setSettings({ ...settings, bg_color: e.target.value })}
                    className="w-10 h-10 rounded border border-warm-border cursor-pointer bg-warm-bg p-1"
                  />
                  <input
                    type="text"
                    value={settings.bg_color || '#F5F1EA'}
                    onChange={(e) => setSettings({ ...settings, bg_color: e.target.value })}
                    className="w-full px-3 py-2 bg-warm-bg border border-warm-border rounded-lg text-xs font-mono uppercase text-warm-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                  Surface / Card Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.surface_color || '#FFFFFF'}
                    onChange={(e) => setSettings({ ...settings, surface_color: e.target.value })}
                    className="w-10 h-10 rounded border border-warm-border cursor-pointer bg-warm-bg p-1"
                  />
                  <input
                    type="text"
                    value={settings.surface_color || '#FFFFFF'}
                    onChange={(e) => setSettings({ ...settings, surface_color: e.target.value })}
                    className="w-full px-3 py-2 bg-warm-bg border border-warm-border rounded-lg text-xs font-mono uppercase text-warm-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                  Main Body Text Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.text_color || '#171513'}
                    onChange={(e) => setSettings({ ...settings, text_color: e.target.value })}
                    className="w-10 h-10 rounded border border-warm-border cursor-pointer bg-warm-bg p-1"
                  />
                  <input
                    type="text"
                    value={settings.text_color || '#171513'}
                    onChange={(e) => setSettings({ ...settings, text_color: e.target.value })}
                    className="w-full px-3 py-2 bg-warm-bg border border-warm-border rounded-lg text-xs font-mono uppercase text-warm-text"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Typography Settings */}
          <div className="space-y-4 pt-4 border-t border-warm-border">
            <h3 className="text-base font-serif font-bold text-warm-charcoal border-b border-warm-border pb-2 flex items-center justify-between">
              <span>Typography & Fonts</span>
              <Type className="w-4 h-4 text-warm-terracotta" />
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                  Font Family
                </label>
                <select
                  value={settings.font_family || 'Inter'}
                  onChange={(e) => setSettings({ ...settings, font_family: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
                >
                  {fontOptions.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                  Base Font Size
                </label>
                <select
                  value={settings.base_font_size || '16px'}
                  onChange={(e) => setSettings({ ...settings, base_font_size: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
                >
                  {fontSizeOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Interactive Live Theme Preview Card */}
          <div className="space-y-3 pt-4 border-t border-warm-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-warm-gold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Interactive Live Preview
              </h3>
            </div>

            <div
              className="p-6 rounded-2xl border border-warm-border space-y-4 shadow-sm transition-all"
              style={{
                backgroundColor: settings.bg_color || '#F5F1EA',
                color: settings.text_color || '#171513',
                fontFamily: settings.font_family || 'Inter',
                fontSize: settings.base_font_size || '16px'
              }}
            >
              <div className="p-4 rounded-xl shadow-sm border border-warm-border/50" style={{ backgroundColor: settings.surface_color || '#FFFFFF' }}>
                <span
                  className="inline-block px-3 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase text-white mb-2"
                  style={{ backgroundColor: settings.secondary_color || '#6B4F3A' }}
                >
                  Badge Preview
                </span>
                <h4 className="font-serif font-bold text-xl mb-1" style={{ color: settings.primary_color || '#24211E' }}>
                  {settings.site_title || 'Website Title Preview'}
                </h4>
                <p className="text-xs opacity-80 leading-relaxed mb-3">
                  This card demonstrates how your background, surface cards, primary text, and accent buttons render on your public website.
                </p>

                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-white font-semibold text-xs shadow-sm"
                  style={{ backgroundColor: settings.accent_color || '#A65F46' }}
                >
                  Sample CTA Button
                </button>
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
              <span>{saving ? 'Saving Theme...' : 'Save Website Settings'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
