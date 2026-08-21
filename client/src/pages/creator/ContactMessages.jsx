import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Toast } from '../../components/ui/Toast';
import { Mail, MailOpen, Trash2, Calendar, User, Clock } from 'lucide-react';

export const ContactMessages = () => {
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
      const res = await axios.get('/api/creator/messages');
      setMessages(res.data.messages);
    } catch (err) {
      showToast('Failed to load contact messages.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const handleMarkRead = async (msg) => {
    if (msg.is_read) return;
    try {
      await axios.patch(`/api/creator/messages/${msg.id}/read`);
      showToast('Message marked as read.');
      fetchMessages();
    } catch (err) {
      showToast('Failed to update message.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/api/creator/messages/${deleteId}`);
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

      <div className="flex items-center justify-between pb-4 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-terracotta/10 text-warm-terracotta text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <Mail className="w-3.5 h-3.5" /> Inbox & Public Submissions
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-charcoal">Contact Messages</h1>
          <p className="text-sm text-warm-muted">View messages submitted by visitors through your public website contact form.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="p-12 text-center bg-warm-surface border border-warm-border rounded-2xl space-y-4">
          <Mail className="w-12 h-12 text-warm-muted mx-auto" />
          <h3 className="text-lg font-serif font-semibold text-warm-charcoal">No Incoming Messages</h3>
          <p className="text-sm text-warm-muted max-w-md mx-auto">
            When visitors submit your website contact form, their inquiries will appear here instantly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-6 bg-warm-surface border rounded-xl shadow-sm transition-all space-y-3 ${
                msg.is_read ? 'border-warm-border' : 'border-warm-terracotta/40 bg-warm-bg/40 ring-1 ring-warm-terracotta/20'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${msg.is_read ? 'bg-warm-border' : 'bg-warm-terracotta animate-pulse'}`} />
                  <h3 className="font-serif font-bold text-base text-warm-charcoal">{msg.subject || 'No Subject'}</h3>
                  {!msg.is_read && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-warm-terracotta text-white">
                      New
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-warm-muted font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(msg.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-warm-muted font-medium border-b border-warm-border pb-2">
                <div className="flex items-center gap-1.5 text-warm-charcoal">
                  <User className="w-3.5 h-3.5 text-warm-brown" />
                  <span>{msg.name}</span>
                </div>
                <span>•</span>
                <a href={`mailto:${msg.email}`} className="text-warm-terracotta hover:underline font-mono">
                  {msg.email}
                </a>
              </div>

              <p className="text-sm text-warm-text leading-relaxed whitespace-pre-line pt-1">{msg.message}</p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-warm-border">
                {!msg.is_read && (
                  <button
                    onClick={() => handleMarkRead(msg)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warm-bg hover:bg-warm-hover text-warm-charcoal text-xs font-semibold border border-warm-border transition-colors"
                  >
                    <MailOpen className="w-3.5 h-3.5 text-warm-brown" />
                    <span>Mark as Read</span>
                  </button>
                )}

                <button
                  onClick={() => setDeleteId(msg.id)}
                  className="p-1.5 text-warm-muted hover:text-warm-terracotta rounded-lg hover:bg-warm-terracotta/10 transition-colors"
                  title="Delete Message"
                >
                  <Trash2 className="w-4 h-4" />
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
        message="Are you sure you want to delete this message permanently?"
      />
    </div>
  );
};
