import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Toast } from '../../components/ui/Toast';
import { FolderKanban, Plus, Edit3, Trash2 } from 'lucide-react';

export const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/creator/categories');
      setCategories(res.data.categories);
    } catch (err) {
      showToast('Failed to load categories.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const handleOpenAdd = () => {
    setEditingCat(null);
    setFormData({ name: '', description: '' });
    setModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCat(cat);
    setFormData({ name: cat.name || '', description: cat.description || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingCat) {
        await axios.put(`/api/creator/categories/${editingCat.id}`, formData);
        showToast('Category updated successfully!');
      } else {
        await axios.post('/api/creator/categories', formData);
        showToast('Category created successfully!');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save category.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/api/creator/categories/${deleteId}`);
      showToast('Category deleted successfully!');
      setDeleteId(null);
      fetchCategories();
    } catch (err) {
      showToast('Failed to delete category.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-gold/10 text-warm-gold text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <FolderKanban className="w-3.5 h-3.5" /> Taxonomy & Organization
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-charcoal">Categories</h1>
          <p className="text-sm text-warm-muted">Organize your articles and publications into structured topics.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-warm-terracotta hover:bg-warm-terracotta/90 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Category</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="p-12 text-center bg-warm-surface border border-warm-border rounded-2xl space-y-4">
          <FolderKanban className="w-12 h-12 text-warm-muted mx-auto" />
          <h3 className="text-lg font-serif font-semibold text-warm-charcoal">No Categories Created</h3>
          <p className="text-sm text-warm-muted max-w-md mx-auto">Create topic categories to classify your published articles.</p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-warm-terracotta text-white text-xs font-semibold rounded-lg shadow-md hover:bg-warm-terracotta/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Category</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="p-5 bg-warm-surface border border-warm-border rounded-xl shadow-sm space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-serif font-bold text-lg text-warm-charcoal">{cat.name}</h3>
                <p className="text-xs text-warm-muted mt-1">{cat.description || 'No description provided.'}</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-warm-border">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="p-1.5 text-warm-muted hover:text-warm-charcoal rounded-lg hover:bg-warm-hover transition-colors"
                  title="Edit Category"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteId(cat.id)}
                  className="p-1.5 text-warm-muted hover:text-warm-terracotta rounded-lg hover:bg-warm-terracotta/10 transition-colors"
                  title="Delete Category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingCat ? 'Edit Category' : 'Create Category'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Category Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. System Architecture"
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this category..."
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
              {saving ? 'Saving...' : editingCat ? 'Update Category' : 'Save Category'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message="Are you sure you want to delete this category?"
      />
    </div>
  );
};
