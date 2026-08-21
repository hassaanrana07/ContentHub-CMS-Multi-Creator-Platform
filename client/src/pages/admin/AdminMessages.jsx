import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Toast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Mail, CheckCircle, Trash2, Calendar, User } from 'lucide-react';

export const AdminMessages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/messages');
      setMessages(res.data.messages);
    } catch (err) {
      showToast('Failed to fetch platform contact messages.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await axios.patch(`/api/admin/messages/${id}/read`);
      showToast('Message marked as read!');
      fetchMessages();
    } catch (err) {
      showToast('Failed to update message status.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/api/admin/messages/${deleteId}`);
      showToast('Message deleted!');
      setDeleteId(null);
      fetchMessages();
    } catch (err) {
      showToast('Failed to delete message.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="pb-4 border-b border-warm-border">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-terracotta/10 text-warm-terracotta text-xs font-mono font-semibold uppercase tracking-wider mb-1">
          <Mail className="w-3.5 h-3.5" /> ContentHub Public Site Inbox
        </div>
        <h1 className="text-2xl font-serif font-bold text-warm-charcoal">Platform Contact Messages</h1>
        <p className="text-sm text-warm-muted">Inquiries submitted by visitors directly on the main ContentHub website (contenthub.com /).</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="p-12 text-center bg-warm-surface border border-warm-border rounded-2xl space-y-3">
          <Mail className="w-12 h-12 text-warm-muted mx-auto" />
          <h3 className="text-lg font-serif font-semibold text-warm-charcoal">No Platform Messages Received</h3>
          <p className="text-sm text-warm-muted">Inquiries submitted on contenthub.com / will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-6 bg-warm-surface border rounded-2xl shadow-sm space-y-3 transition-colors ${
                msg.is_read ? 'border-warm-border opacity-85' : 'border-warm-terracotta/40 bg-warm-gold/5'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-warm-border pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-warm-terracotta/10 text-warm-terracotta font-serif font-bold text-sm flex items-center justify-center">
                    {msg.name[0]}
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-warm-charcoal flex items-center gap-2">
                      <span>{msg.name}</span>
                      {!msg.is_read && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-warm-terracotta text-white font-bold">
                          Unread
                        </span>
                      )}
                    </h3>
                    <p className="text-xs font-mono text-warm-muted">{msg.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-warm-muted font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>

              <div>
                <h4 className="font-serif font-semibold text-sm text-warm-charcoal mb-1">Subject: {msg.subject}</h4>
                <p className="text-xs text-warm-muted leading-relaxed whitespace-pre-line bg-warm-bg p-3.5 rounded-xl border border-warm-border">
                  {msg.message}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {!msg.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(msg.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warm-bg hover:bg-warm-hover text-warm-brown text-xs font-semibold rounded-lg border border-warm-border transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mark as Read</span>
                  </button>
                )}
                <button
                  onClick={() => setDeleteId(msg.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-warm-terracotta hover:bg-warm-terracotta/10 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Contact Message"
        message="Are you sure you want to delete this message from the Admin inbox?"
      />
    </div>
  );
};
