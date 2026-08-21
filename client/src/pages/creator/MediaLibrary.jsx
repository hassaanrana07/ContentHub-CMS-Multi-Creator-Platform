import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Toast } from '../../components/ui/Toast';
import { Image as ImageIcon, Plus, Trash2, Copy, Check, ExternalLink } from 'lucide-react';

export const MediaLibrary = () => {
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [copiedId, setCopiedId] = useState(null);

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
      const res = await axios.get('/api/creator/media');
      setMediaItems(res.data.media);
    } catch (err) {
      showToast('Failed to load media library.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const handleCopyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast('Image URL copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/creator/media', formData);
      showToast('Media item added!');
      setModalOpen(false);
      setFormData({ url: '', title: '', alt_text: '', media_type: 'image' });
      fetchMedia();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add media.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/api/creator/media/${deleteId}`);
      showToast('Media item deleted!');
      setDeleteId(null);
      fetchMedia();
    } catch (err) {
      showToast('Failed to delete media item.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-gold/10 text-warm-gold text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <ImageIcon className="w-3.5 h-3.5" /> Media Asset Catalog
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-charcoal">Media Library</h1>
          <p className="text-sm text-warm-muted">Manage image URLs and media assets used across your website sections & articles.</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-warm-terracotta hover:bg-warm-terracotta/90 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Media URL</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : mediaItems.length === 0 ? (
        <div className="p-12 text-center bg-warm-surface border border-warm-border rounded-2xl space-y-4">
          <ImageIcon className="w-12 h-12 text-warm-muted mx-auto" />
          <h3 className="text-lg font-serif font-semibold text-warm-charcoal">No Media Assets Found</h3>
          <p className="text-sm text-warm-muted max-w-md mx-auto">Add image URLs to use in your homepage hero, about section, or articles.</p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-warm-terracotta text-white text-xs font-semibold rounded-lg shadow-md hover:bg-warm-terracotta/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Image</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mediaItems.map((item) => (
            <div key={item.id} className="bg-warm-surface border border-warm-border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between group">
              <div className="relative h-40 bg-warm-bg overflow-hidden border-b border-warm-border">
                <img
                  src={item.url}
                  alt={item.alt_text || item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=400&q=80'; }}
                />
              </div>

              <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-serif font-bold text-sm text-warm-charcoal truncate">{item.title || 'Untitled Image'}</h4>
                  <p className="text-[11px] font-mono text-warm-muted truncate mt-0.5">{item.url}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-warm-border text-xs">
                  <button
                    onClick={() => handleCopyUrl(item.url, item.id)}
                    className="inline-flex items-center gap-1 text-warm-brown font-medium hover:text-warm-terracotta transition-colors"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-warm-brown" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === item.id ? 'Copied' : 'Copy URL'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-warm-muted hover:text-warm-charcoal rounded transition-colors"
                      title="Open Original Image"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="p-1 text-warm-muted hover:text-warm-terracotta rounded transition-colors"
                      title="Delete Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Media Asset URL">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Image URL</label>
            <input
              type="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Asset Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Workspace Header Banner"
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Alt Text / Description</label>
            <input
              type="text"
              value={formData.alt_text}
              onChange={(e) => setFormData({ ...formData, alt_text: e.target.value })}
              placeholder="Photo showing developer working on laptop"
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
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
              {saving ? 'Adding...' : 'Add Media Asset'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Media Asset"
        message="Are you sure you want to remove this media URL from your library?"
      />
    </div>
  );
};
