import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Toast } from '../../components/ui/Toast';
import { Quote, Plus, Edit3, Trash2, Star, Eye, EyeOff } from 'lucide-react';

export const TestimonialsManager = () => {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    message: '',
    avatar_url: '',
    rating: 5,
    is_visible: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/creator/testimonials');
      setTestimonials(res.data.testimonials);
    } catch (err) {
      showToast('Failed to load testimonials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ name: '', role: '', message: '', avatar_url: '', rating: 5, is_visible: true });
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      role: item.role || '',
      message: item.message || '',
      avatar_url: item.avatar_url || '',
      rating: item.rating || 5,
      is_visible: item.is_visible !== false
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingItem) {
        await axios.put(`/api/creator/testimonials/${editingItem.id}`, formData);
        showToast('Testimonial updated!');
      } else {
        await axios.post('/api/creator/testimonials', formData);
        showToast('Testimonial added!');
      }
      setModalOpen(false);
      fetchTestimonials();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save testimonial.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/api/creator/testimonials/${deleteId}`);
      showToast('Testimonial deleted!');
      setDeleteId(null);
      fetchTestimonials();
    } catch (err) {
      showToast('Failed to delete testimonial.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-charcoal/10 text-warm-charcoal text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <Quote className="w-3.5 h-3.5" /> Social Proof & Endorsements
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-charcoal">Testimonials CMS</h1>
          <p className="text-sm text-warm-muted">Manage testimonials and client quotes displayed on your public website.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-warm-terracotta hover:bg-warm-terracotta/90 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Testimonial</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-32 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : testimonials.length === 0 ? (
        <div className="p-12 text-center bg-warm-surface border border-warm-border rounded-2xl space-y-4">
          <Quote className="w-12 h-12 text-warm-muted mx-auto" />
          <h3 className="text-lg font-serif font-semibold text-warm-charcoal">No Testimonials Yet</h3>
          <p className="text-sm text-warm-muted max-w-md mx-auto">Add client reviews or recommendation quotes to boost credibility on your site.</p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-warm-terracotta text-white text-xs font-semibold rounded-lg shadow-md hover:bg-warm-terracotta/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Testimonial</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testimonials.map((item) => (
            <div key={item.id} className="p-6 bg-warm-surface border border-warm-border rounded-xl shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-warm-gold">
                    {[...Array(item.rating || 5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-warm-gold" />
                    ))}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    item.is_visible ? 'bg-warm-brown/10 text-warm-brown' : 'bg-warm-muted/10 text-warm-muted'
                  }`}>
                    {item.is_visible ? 'Visible' : 'Hidden'}
                  </span>
                </div>

                <p className="text-sm text-warm-text italic leading-relaxed font-serif">"{item.message}"</p>

                <div className="flex items-center gap-3 pt-2">
                  {item.avatar_url ? (
                    <img src={item.avatar_url} alt={item.name} className="w-9 h-9 rounded-full object-cover border border-warm-border" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-warm-brown text-white font-serif font-bold text-xs flex items-center justify-center">
                      {item.name[0]}
                    </div>
                  )}
                  <div>
                    <h4 className="font-serif font-bold text-sm text-warm-charcoal">{item.name}</h4>
                    <p className="text-xs text-warm-muted">{item.role || 'Client'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-warm-border">
                <button
                  onClick={() => handleOpenEdit(item)}
                  className="p-1.5 text-warm-muted hover:text-warm-charcoal rounded-lg hover:bg-warm-hover transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteId(item.id)}
                  className="p-1.5 text-warm-muted hover:text-warm-terracotta rounded-lg hover:bg-warm-terracotta/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Edit Testimonial' : 'Add Testimonial'}>
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Person Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Marcus Vance"
                className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Role / Company</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="VP of Product"
                className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Testimonial Quote / Message</label>
            <textarea
              rows={4}
              required
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Write the recommendation message..."
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Avatar Image URL</label>
              <input
                type="url"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Rating (1 to 5 Stars)</label>
              <select
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value, 10) })}
                className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown font-semibold"
              >
                <option value={5}>5 Stars ★★★★★</option>
                <option value={4}>4 Stars ★★★★</option>
                <option value={3}>3 Stars ★★★</option>
                <option value={2}>2 Stars ★★</option>
                <option value={1}>1 Star ★</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="test_visible"
              checked={formData.is_visible}
              onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
              className="w-4 h-4 accent-warm-terracotta rounded"
            />
            <label htmlFor="test_visible" className="text-sm font-medium text-warm-charcoal">
              Display on public website
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
              {saving ? 'Saving...' : editingItem ? 'Update Testimonial' : 'Save Testimonial'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Testimonial"
        message="Are you sure you want to delete this testimonial quote?"
      />
    </div>
  );
};
