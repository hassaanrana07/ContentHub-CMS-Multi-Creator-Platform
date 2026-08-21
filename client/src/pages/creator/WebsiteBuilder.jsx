import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Toast } from '../../components/ui/Toast';
import {
  Layers,
  Plus,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  ExternalLink,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react';

export const WebsiteBuilder = () => {
  const { creator } = useAuth();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    section_type: 'hero',
    title: '',
    subtitle: '',
    body: '',
    image_url: '',
    button_text: '',
    button_url: '#',
    is_visible: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/creator/sections');
      setSections(res.data.sections);
    } catch (err) {
      showToast('Failed to load homepage sections.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const handleOpenAddModal = () => {
    setEditingSection(null);
    setFormData({
      section_type: 'hero',
      title: '',
      subtitle: '',
      body: '',
      image_url: '',
      button_text: '',
      button_url: '#',
      is_visible: true
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (sec) => {
    setEditingSection(sec);
    setFormData({
      section_type: sec.section_type || 'custom',
      title: sec.title || '',
      subtitle: sec.subtitle || '',
      body: sec.body || '',
      image_url: sec.image_url || '',
      button_text: sec.button_text || '',
      button_url: sec.button_url || '#',
      is_visible: sec.is_visible !== false
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSection) {
        await axios.put(`/api/creator/sections/${editingSection.id}`, formData);
        showToast('Section updated successfully!');
      } else {
        await axios.post('/api/creator/sections', formData);
        showToast('Section added successfully!');
      }
      setModalOpen(false);
      fetchSections();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save section.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (sec) => {
    try {
      await axios.put(`/api/creator/sections/${sec.id}`, { is_visible: !sec.is_visible });
      showToast(`Section ${!sec.is_visible ? 'visible' : 'hidden'} on public site.`);
      fetchSections();
    } catch (err) {
      showToast('Failed to toggle visibility.', 'error');
    }
  };

  const handleMove = async (index, direction) => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    // Swap elements
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    setSections(newSections);

    // Save order on backend
    try {
      const sectionIds = newSections.map(s => s.id);
      await axios.patch('/api/creator/sections/reorder', { sectionIds });
      showToast('Section order saved!');
    } catch (err) {
      showToast('Failed to update section order.', 'error');
      fetchSections();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/api/creator/sections/${deleteId}`);
      showToast('Section deleted successfully!');
      setDeleteId(null);
      fetchSections();
    } catch (err) {
      showToast('Failed to delete section.', 'error');
    }
  };

  const publicUrl = creator?.username ? `/site/${creator.username}` : '#';

  const sectionTypes = [
    { value: 'hero', label: 'Hero Banner' },
    { value: 'about', label: 'About Me / Company' },
    { value: 'services', label: 'Services & Offerings' },
    { value: 'features', label: 'Features' },
    { value: 'testimonials', label: 'Testimonials Block' },
    { value: 'faq', label: 'FAQ Accordion' },
    { value: 'cta', label: 'Call To Action (CTA)' },
    { value: 'gallery', label: 'Media Gallery' },
    { value: 'contact', label: 'Contact Section' },
    { value: 'custom', label: 'Custom Content Section' },
  ];

  return (
    <div className="space-y-6 font-sans">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-terracotta/10 text-warm-terracotta text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5" /> Homepage CMS Builder
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-charcoal">Website Builder</h1>
          <p className="text-sm text-warm-muted">Organize, edit, hide, and reorder sections rendered on your public website.</p>
        </div>

        <div className="flex items-center gap-3">
          {creator?.username && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-warm-surface border border-warm-border hover:bg-warm-hover text-warm-charcoal text-xs font-semibold rounded-lg shadow-sm transition-colors"
            >
              <span>Preview Website</span>
              <ExternalLink className="w-3.5 h-3.5 text-warm-terracotta" />
            </a>
          )}

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-warm-terracotta hover:bg-warm-terracotta/90 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Section</span>
          </button>
        </div>
      </div>

      {/* Sections List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : sections.length === 0 ? (
        <div className="p-12 text-center bg-warm-surface border border-warm-border rounded-2xl space-y-4">
          <Layers className="w-12 h-12 text-warm-muted mx-auto" />
          <h3 className="text-lg font-serif font-semibold text-warm-charcoal">No Homepage Sections Yet</h3>
          <p className="text-sm text-warm-muted max-w-md mx-auto">
            Click "Add Section" to create your hero, about, services, or custom content blocks for your website.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-warm-terracotta text-white text-xs font-semibold rounded-lg shadow-md hover:bg-warm-terracotta/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Section</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((sec, idx) => (
            <div
              key={sec.id}
              className={`p-5 bg-warm-surface border rounded-xl shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                sec.is_visible ? 'border-warm-border' : 'border-warm-border/40 opacity-60 bg-warm-bg/50'
              }`}
            >
              <div className="flex items-start gap-4 flex-1">
                <span className="w-7 h-7 rounded-lg bg-warm-bg border border-warm-border text-warm-charcoal font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase tracking-wider font-semibold bg-warm-gold/10 text-warm-gold">
                      {sec.section_type}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      sec.is_visible ? 'bg-warm-brown/10 text-warm-brown' : 'bg-warm-muted/10 text-warm-muted'
                    }`}>
                      {sec.is_visible ? 'Visible' : 'Hidden'}
                    </span>
                  </div>

                  <h3 className="text-base font-serif font-bold text-warm-charcoal truncate">
                    {sec.title || 'Untitled Section'}
                  </h3>
                  {sec.subtitle && (
                    <p className="text-xs text-warm-muted truncate">{sec.subtitle}</p>
                  )}
                  {sec.body && (
                    <p className="text-xs text-warm-text/80 line-clamp-2 mt-1">{sec.body}</p>
                  )}
                </div>
              </div>

              {/* Actions & Reordering Controls */}
              <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-warm-border">
                <div className="flex items-center bg-warm-bg border border-warm-border rounded-lg p-0.5">
                  <button
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0}
                    title="Move Up"
                    className="p-1.5 text-warm-muted hover:text-warm-charcoal disabled:opacity-30 rounded transition-colors"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === sections.length - 1}
                    title="Move Down"
                    className="p-1.5 text-warm-muted hover:text-warm-charcoal disabled:opacity-30 rounded transition-colors"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleToggleVisibility(sec)}
                  title={sec.is_visible ? 'Hide Section' : 'Show Section'}
                  className="p-2 text-warm-muted hover:text-warm-brown hover:bg-warm-hover rounded-lg transition-colors border border-warm-border"
                >
                  {sec.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => handleOpenEditModal(sec)}
                  title="Edit Section"
                  className="p-2 text-warm-muted hover:text-warm-charcoal hover:bg-warm-hover rounded-lg transition-colors border border-warm-border"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setDeleteId(sec.id)}
                  title="Delete Section"
                  className="p-2 text-warm-muted hover:text-warm-terracotta hover:bg-warm-terracotta/10 rounded-lg transition-colors border border-warm-border"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Add Section Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSection ? 'Edit Homepage Section' : 'Add New Homepage Section'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 font-sans">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
              Section Type
            </label>
            <select
              value={formData.section_type}
              onChange={(e) => setFormData({ ...formData, section_type: e.target.value })}
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            >
              {sectionTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
              Section Heading / Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Welcome to My Portfolio"
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
              Subtitle / Category Tag
            </label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder="e.g. Full-Stack Developer & Content Creator"
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
              Body Content / Description
            </label>
            <textarea
              rows={4}
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Detailed text for this homepage section..."
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
              Image URL (Optional)
            </label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                Button Text (Optional)
              </label>
              <input
                type="text"
                value={formData.button_text}
                onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                placeholder="e.g. Explore Articles"
                className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">
                Button Link / URL
              </label>
              <input
                type="text"
                value={formData.button_url}
                onChange={(e) => setFormData({ ...formData, button_url: e.target.value })}
                placeholder="e.g. #articles or /site/hassan/articles"
                className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_visible"
              checked={formData.is_visible}
              onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
              className="w-4 h-4 accent-warm-terracotta rounded"
            />
            <label htmlFor="is_visible" className="text-sm font-medium text-warm-charcoal">
              Make this section visible on public website immediately
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-border">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-warm-text bg-warm-hover rounded-lg hover:bg-warm-border transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white bg-warm-terracotta rounded-lg hover:bg-warm-terracotta/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingSection ? 'Update Section' : 'Create Section'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Homepage Section"
        message="Are you sure you want to delete this homepage section? This will immediately remove it from your live public website."
      />
    </div>
  );
};
