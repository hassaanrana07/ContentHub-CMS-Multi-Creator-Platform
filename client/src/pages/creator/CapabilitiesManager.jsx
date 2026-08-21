import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Toast } from '../../components/ui/Toast';
import { Sparkles, Plus, Edit3, Trash2, Code, Cpu, BookOpen, Zap, Server, Palette, Feather, Layers } from 'lucide-react';

export const CapabilitiesManager = () => {
  const [capabilities, setCapabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCap, setEditingCap] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: 'Sparkles',
    is_visible: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCapabilities();
  }, []);

  const fetchCapabilities = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/creator/capabilities');
      setCapabilities(res.data.capabilities);
    } catch (err) {
      showToast('Failed to load capabilities.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const handleOpenAdd = () => {
    setEditingCap(null);
    setFormData({ title: '', description: '', icon: 'Sparkles', is_visible: true });
    setModalOpen(true);
  };

  const handleOpenEdit = (cap) => {
    setEditingCap(cap);
    setFormData({
      title: cap.title || '',
      description: cap.description || '',
      icon: cap.icon || 'Sparkles',
      is_visible: cap.is_visible !== false
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCap) {
        await axios.put(`/api/creator/capabilities/${editingCap.id}`, formData);
        showToast('Capability updated!');
      } else {
        await axios.post('/api/creator/capabilities', formData);
        showToast('Capability added!');
      }
      setModalOpen(false);
      fetchCapabilities();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save capability.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/api/creator/capabilities/${deleteId}`);
      showToast('Capability deleted!');
      setDeleteId(null);
      fetchCapabilities();
    } catch (err) {
      showToast('Failed to delete capability.', 'error');
    }
  };

  const iconOptions = ['Sparkles', 'Code', 'Cpu', 'BookOpen', 'Zap', 'Server', 'Palette', 'Feather', 'Layers'];

  return (
    <div className="space-y-6 font-sans">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-gold/10 text-warm-gold text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" /> Capabilities & Services
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-charcoal">Capabilities CMS</h1>
          <p className="text-sm text-warm-muted">Manage core skills, offerings, and services displayed on your website.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-warm-terracotta hover:bg-warm-terracotta/90 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Capability</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : capabilities.length === 0 ? (
        <div className="p-12 text-center bg-warm-surface border border-warm-border rounded-2xl space-y-4">
          <Sparkles className="w-12 h-12 text-warm-muted mx-auto" />
          <h3 className="text-lg font-serif font-semibold text-warm-charcoal">No Capabilities Configured</h3>
          <p className="text-sm text-warm-muted max-w-md mx-auto">Highlight your key skills and service capabilities to visitors.</p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-warm-terracotta text-white text-xs font-semibold rounded-lg shadow-md hover:bg-warm-terracotta/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Capability</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {capabilities.map((cap) => (
            <div key={cap.id} className="p-5 bg-warm-surface border border-warm-border rounded-xl shadow-sm space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-9 h-9 rounded-lg bg-warm-terracotta/10 text-warm-terracotta font-serif font-bold text-sm flex items-center justify-center">
                    ★
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    cap.is_visible ? 'bg-warm-brown/10 text-warm-brown' : 'bg-warm-muted/10 text-warm-muted'
                  }`}>
                    {cap.is_visible ? 'Visible' : 'Hidden'}
                  </span>
                </div>
                <h3 className="font-serif font-bold text-base text-warm-charcoal">{cap.title}</h3>
                <p className="text-xs text-warm-muted leading-relaxed">{cap.description}</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-warm-border">
                <button
                  onClick={() => handleOpenEdit(cap)}
                  className="p-1.5 text-warm-muted hover:text-warm-charcoal rounded-lg hover:bg-warm-hover transition-colors"
                  title="Edit Capability"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteId(cap.id)}
                  className="p-1.5 text-warm-muted hover:text-warm-terracotta rounded-lg hover:bg-warm-terracotta/10 transition-colors"
                  title="Delete Capability"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingCap ? 'Edit Capability' : 'Add Capability'}>
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Capability Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Full-Stack Web Architecture"
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Description</label>
            <textarea
              rows={3}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Explain this skill or offering..."
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="cap_visible"
              checked={formData.is_visible}
              onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
              className="w-4 h-4 accent-warm-terracotta rounded"
            />
            <label htmlFor="cap_visible" className="text-sm font-medium text-warm-charcoal">
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
              {saving ? 'Saving...' : editingCap ? 'Update Capability' : 'Save Capability'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Capability"
        message="Are you sure you want to delete this capability?"
      />
    </div>
  );
};
