import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Toast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Image as ImageIcon, Plus, Trash2, ExternalLink } from 'lucide-react';

export const AdminMediaLibrary = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [formData, setFormData] = useState({ url: '', title: '', alt_text: '', media_type: 'image' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/media');
      setMedia(res.data.media);
    } catch (err) {
      showToast('Failed to fetch platform media.', 'error');
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
      await axios.post('/api/admin/media', formData);
      showToast('Media asset added to platform library!');
      setModalOpen(false);
      setFormData({ url: '', title: '', alt_text: '', media_type: 'image' });
      fetchMedia();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add media item.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/api/admin/media/${deleteId}`);
      showToast('Media asset removed.');
      setDeleteId(null);
      fetchMedia();
    } catch (err) {
      showToast('Failed to delete media asset.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-gold/10 text-warm-gold text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <ImageIcon className="w-3.5 h-3.5" /> Platform Assets
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-charcoal">Main Website Media Library</h1>
          <p className="text-sm text-warm-muted">Manage image assets used on the main ContentHub public landing page.</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-warm-terracotta hover:bg-warm-terracotta/90 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Media Asset</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : media.length === 0 ? (
        <div className="p-12 text-center bg-warm-surface border border-warm-border rounded-2xl space-y-3">
          <ImageIcon className="w-12 h-12 text-warm-muted mx-auto" />
          <h3 className="text-lg font-serif font-semibold text-warm-charcoal">No Platform Media Uploaded</h3>
          <p className="text-sm text-warm-muted">Add image asset URLs to use across the main ContentHub site.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((item) => (
            <div key={item.id} className="bg-warm-surface border border-warm-border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
              <img src={item.url} alt={item.alt_text || item.title} className="w-full h-36 object-cover border-b border-warm-border" />
              <div className="p-3 space-y-1">
                <h4 className="font-serif font-bold text-sm text-warm-charcoal truncate">{item.title}</h4>
                <p className="text-[11px] font-mono text-warm-muted truncate">{item.url}</p>
              </div>

              <div className="p-3 pt-0 flex items-center justify-between border-t border-warm-border/40 mt-1">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1 text-warm-muted hover:text-warm-charcoal">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button onClick={() => setDeleteId(item.id)} className="p-1 text-warm-muted hover:text-warm-terracotta">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Platform Media Asset">
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Image Asset URL</label>
            <input
              type="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Asset Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Hero Banner Image"
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Alt Text</label>
            <input
              type="text"
              value={formData.alt_text}
              onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
              placeholder="Descriptive accessibility text"
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-warm-border">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-warm-text bg-warm-hover rounded-lg">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-xs font-semibold text-white bg-warm-terracotta rounded-lg hover:bg-warm-terracotta/90 disabled:opacity-50">
              {saving ? 'Saving...' : 'Add Media Asset'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Media Asset"
        message="Are you sure you want to delete this media asset?"
      />
    </div>
  );
};
