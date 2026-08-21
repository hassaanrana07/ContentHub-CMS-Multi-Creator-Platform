import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Toast } from '../../components/ui/Toast';
import { HelpCircle, Plus, Edit3, Trash2, Eye, EyeOff } from 'lucide-react';

export const FaqManager = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [formData, setFormData] = useState({ question: '', answer: '', is_visible: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/creator/faqs');
      setFaqs(res.data.faqs);
    } catch (err) {
      showToast('Failed to load FAQs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const handleOpenAdd = () => {
    setEditingFaq(null);
    setFormData({ question: '', answer: '', is_visible: true });
    setModalOpen(true);
  };

  const handleOpenEdit = (faq) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question || '',
      answer: faq.answer || '',
      is_visible: faq.is_visible !== false
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingFaq) {
        await axios.put(`/api/creator/faqs/${editingFaq.id}`, formData);
        showToast('FAQ updated successfully!');
      } else {
        await axios.post('/api/creator/faqs', formData);
        showToast('FAQ added successfully!');
      }
      setModalOpen(false);
      fetchFaqs();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save FAQ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/api/creator/faqs/${deleteId}`);
      showToast('FAQ deleted!');
      setDeleteId(null);
      fetchFaqs();
    } catch (err) {
      showToast('Failed to delete FAQ.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-gold/10 text-warm-gold text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <HelpCircle className="w-3.5 h-3.5" /> Frequently Asked Questions
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-charcoal">FAQ System</h1>
          <p className="text-sm text-warm-muted">Add questions and detailed answers for your public website visitors.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-warm-terracotta hover:bg-warm-terracotta/90 text-white text-xs font-semibold rounded-lg shadow-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add FAQ</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : faqs.length === 0 ? (
        <div className="p-12 text-center bg-warm-surface border border-warm-border rounded-2xl space-y-4">
          <HelpCircle className="w-12 h-12 text-warm-muted mx-auto" />
          <h3 className="text-lg font-serif font-semibold text-warm-charcoal">No FAQs Configured</h3>
          <p className="text-sm text-warm-muted max-w-md mx-auto">Create FAQs to answer common questions about your work, pricing, or process.</p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-warm-terracotta text-white text-xs font-semibold rounded-lg shadow-md hover:bg-warm-terracotta/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add First FAQ</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={faq.id} className="p-5 bg-warm-surface border border-warm-border rounded-xl shadow-sm space-y-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-warm-gold font-bold">Q{idx + 1}.</span>
                  <h3 className="font-serif font-bold text-base text-warm-charcoal">{faq.question}</h3>
                </div>
                <p className="text-xs text-warm-text/80 pl-6 leading-relaxed">{faq.answer}</p>
              </div>

              <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-warm-border">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  faq.is_visible ? 'bg-warm-brown/10 text-warm-brown' : 'bg-warm-muted/10 text-warm-muted'
                }`}>
                  {faq.is_visible ? 'Visible' : 'Hidden'}
                </span>
                <button
                  onClick={() => handleOpenEdit(faq)}
                  className="p-1.5 text-warm-muted hover:text-warm-charcoal rounded-lg hover:bg-warm-hover transition-colors border border-warm-border"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteId(faq.id)}
                  className="p-1.5 text-warm-muted hover:text-warm-terracotta rounded-lg hover:bg-warm-terracotta/10 transition-colors border border-warm-border"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingFaq ? 'Edit FAQ' : 'Add FAQ'}>
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Question</label>
            <input
              type="text"
              required
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              placeholder="e.g. What services do you offer?"
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown font-serif"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-warm-muted mb-1.5">Answer</label>
            <textarea
              rows={4}
              required
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              placeholder="Detailed answer explaining your process..."
              className="w-full px-3.5 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm text-warm-text focus:outline-none focus:border-warm-brown"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="faq_visible"
              checked={formData.is_visible}
              onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
              className="w-4 h-4 accent-warm-terracotta rounded"
            />
            <label htmlFor="faq_visible" className="text-sm font-medium text-warm-charcoal">
              Make this FAQ visible on public website
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
              {saving ? 'Saving...' : editingFaq ? 'Update FAQ' : 'Save FAQ'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete FAQ"
        message="Are you sure you want to delete this FAQ question?"
      />
    </div>
  );
};
