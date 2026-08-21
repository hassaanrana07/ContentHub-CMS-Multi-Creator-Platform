import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Toast } from '../../components/ui/Toast';
import { FileStack, Trash2, ExternalLink, ShieldAlert, FileText, Image as ImageIcon } from 'lucide-react';

export const PlatformContentManager = () => {
  const [posts, setPosts] = useState([]);
  const [media, setMedia] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/content');
      setPosts(res.data.posts);
      setMedia(res.data.media);
    } catch (err) {
      showToast('Failed to fetch platform content.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const handleDeletePostConfirm = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`/api/admin/content/posts/${deleteId}`);
      showToast('Article removed by administrator.');
      setDeleteId(null);
      fetchContent();
    } catch (err) {
      showToast('Failed to remove article.', 'error');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      <div className="flex items-center justify-between pb-4 border-b border-warm-border">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-terracotta/10 text-warm-terracotta text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <FileStack className="w-3.5 h-3.5" /> Content Moderation
          </div>
          <h1 className="text-2xl font-serif font-bold text-warm-charcoal">Platform Content Audit</h1>
          <p className="text-sm text-warm-muted">Audit articles and media across all creators on the ContentHub network.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-warm-border pb-1">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'posts' ? 'bg-warm-terracotta text-white shadow-sm' : 'text-warm-muted hover:bg-warm-hover'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Platform Articles ({posts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'media' ? 'bg-warm-terracotta text-white shadow-sm' : 'text-warm-muted hover:bg-warm-hover'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Media Catalog ({media.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'posts' ? (
        <div className="bg-warm-surface border border-warm-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-warm-bg border-b border-warm-border text-xs uppercase font-mono tracking-wider text-warm-muted">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Article Title</th>
                  <th className="px-6 py-3.5 font-semibold">Creator Owner</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold">Created Date</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Moderation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-warm-hover/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-serif font-bold text-warm-charcoal">{post.title}</p>
                      <p className="text-xs font-mono text-warm-muted">/site/{post.creator_username}/articles/{post.slug}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-warm-charcoal text-xs">{post.creator_name}</p>
                      <p className="text-xs font-mono text-warm-gold">@{post.creator_username}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        post.status === 'PUBLISHED' ? 'bg-warm-brown/10 text-warm-brown' : 'bg-warm-muted/10 text-warm-muted'
                      }`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-warm-muted">
                      {new Date(post.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDeleteId(post.id)}
                        className="p-1.5 text-warm-muted hover:text-warm-terracotta rounded-lg hover:bg-warm-terracotta/10 transition-colors"
                        title="Remove Article"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {media.map((item) => (
            <div key={item.id} className="bg-warm-surface border border-warm-border rounded-xl overflow-hidden p-3 space-y-2">
              <img src={item.url} alt={item.title} className="w-full h-32 object-cover rounded-lg bg-warm-bg" />
              <div>
                <h4 className="font-serif font-bold text-xs text-warm-charcoal truncate">{item.title || 'Media'}</h4>
                <p className="text-[11px] font-mono text-warm-gold truncate">by @{item.creator_username}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeletePostConfirm}
        title="Moderation Delete Article"
        message="Are you sure you want to remove this article from the platform?"
      />
    </div>
  );
};
