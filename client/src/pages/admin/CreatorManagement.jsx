import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Toast } from '../../components/ui/Toast';
import { Users, Search, ExternalLink, ShieldAlert, UserCheck, UserX, Trash2 } from 'lucide-react';

export const CreatorManagement = () => {
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchCreators();
  }, [search]);

  const fetchCreators = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/creators', { params: { search } });
      setCreators(res.data.creators);
    } catch (err) {
      showToast('Failed to fetch creators.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const handleToggleStatus = async (creator) => {
    const newStatus = creator.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await axios.patch(`/api/admin/creators/${creator.creator_id}/status`, { status: newStatus });
      showToast(`Creator ${creator.username} status updated to ${newStatus}.`);
      fetchCreators();
    } catch (err) {
      showToast('Failed to update creator status.', 'error');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/api/admin/creators/${deleteId}`);
      showToast('Creator account and content deleted.');
      setDeleteId(null);
      fetchCreators();
    } catch (err) {
      showToast('Failed to delete creator account.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-terracotta/10 text-warm-terracotta text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <Users className="w-3.5 h-3.5" /> Governance & Access
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-charcoal">Creator Account Governance</h1>
          <p className="text-sm text-warm-muted">View, suspend, activate, or remove platform creator profiles.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-warm-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search creators by name, username, or email..."
          className="w-full pl-10 pr-4 py-2.5 bg-warm-surface border border-warm-border rounded-xl text-sm text-warm-text focus:outline-none focus:border-warm-brown"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : creators.length === 0 ? (
        <div className="p-12 text-center bg-warm-surface border border-warm-border rounded-2xl space-y-3">
          <Users className="w-12 h-12 text-warm-muted mx-auto" />
          <h3 className="text-lg font-serif font-semibold text-warm-charcoal">No Creator Accounts Found</h3>
          <p className="text-sm text-warm-muted">No creator accounts matched your search criteria.</p>
        </div>
      ) : (
        <div className="bg-warm-surface border border-warm-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-warm-bg border-b border-warm-border text-xs uppercase font-mono tracking-wider text-warm-muted">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Creator Info</th>
                  <th className="px-6 py-3.5 font-semibold">Email Address</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold">Articles / Messages</th>
                  <th className="px-6 py-3.5 font-semibold">Joined Date</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border">
                {creators.map((c) => {
                  const isActive = c.status === 'ACTIVE';
                  const publicUrl = `/site/${c.username}`;
                  return (
                    <tr key={c.creator_id} className="hover:bg-warm-hover/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {c.profile_image ? (
                            <img src={c.profile_image} alt={c.display_name} className="w-9 h-9 rounded-full object-cover border border-warm-border" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-warm-brown text-white font-serif font-bold text-xs flex items-center justify-center">
                              {c.display_name[0]}
                            </div>
                          )}
                          <div>
                            <p className="font-serif font-bold text-warm-charcoal">{c.display_name}</p>
                            <p className="text-xs font-mono text-warm-gold">@{c.username}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs font-mono text-warm-text">
                        {c.email}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          isActive
                            ? 'bg-warm-brown/10 text-warm-brown border border-warm-brown/20'
                            : 'bg-warm-terracotta/10 text-warm-terracotta border border-warm-terracotta/20'
                        }`}>
                          {isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                          {c.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs font-mono text-warm-muted">
                        {c.total_posts} posts • {c.total_messages} messages
                      </td>

                      <td className="px-6 py-4 text-xs text-warm-muted font-mono">
                        {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-warm-muted hover:text-warm-terracotta rounded-lg hover:bg-warm-hover transition-colors"
                            title="Visit Public Website"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>

                          <button
                            onClick={() => handleToggleStatus(c)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors border ${
                              isActive
                                ? 'border-warm-terracotta/40 text-warm-terracotta hover:bg-warm-terracotta/10'
                                : 'border-warm-brown/40 text-warm-brown hover:bg-warm-brown/10'
                            }`}
                            title={isActive ? 'Suspend Creator' : 'Activate Creator'}
                          >
                            {isActive ? 'Suspend' : 'Activate'}
                          </button>

                          <button
                            onClick={() => setDeleteId(c.creator_id)}
                            className="p-1.5 text-warm-muted hover:text-warm-terracotta rounded-lg hover:bg-warm-terracotta/10 transition-colors"
                            title="Delete Creator Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Creator Account"
        message="Are you sure you want to permanently delete this creator account? This will cascade delete their profile, website settings, homepage sections, articles, media, and messages."
      />
    </div>
  );
};
