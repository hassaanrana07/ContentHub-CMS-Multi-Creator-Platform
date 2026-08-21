import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Calendar, User, Tag, AlertCircle } from 'lucide-react';

export const PublicArticleDetails = () => {
  const params = useParams();
  const username = params.username || 'admin';
  const { slug } = params;

  const [post, setPost] = useState(null);
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPostDetails();
  }, [username, slug]);

  const fetchPostDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`/api/public/site/${username}/posts/${slug}`);
      setPost(res.data.post);
      setCreator(res.data.creator);
    } catch (err) {
      setError(err.response?.data?.error || 'Article not found or unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const isMainAdminSite = username === 'admin';
  const backUrl = isMainAdminSite ? '/' : `/${username}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-warm-terracotta border-t-transparent animate-spin mx-auto" />
          <p className="font-serif font-semibold text-warm-charcoal">Loading Article...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-warm-surface border border-warm-border rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <AlertCircle className="w-12 h-12 text-warm-terracotta mx-auto" />
          <h2 className="text-2xl font-serif font-bold text-warm-charcoal">Article Not Found</h2>
          <p className="text-sm text-warm-muted">{error}</p>
          <Link
            to={backUrl}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-warm-charcoal text-white text-xs font-semibold rounded-lg shadow-md hover:bg-warm-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Website</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-bg text-warm-text font-sans antialiased">
      {/* Header Bar */}
      <nav className="bg-warm-surface border-b border-warm-border px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            to={backUrl}
            className="inline-flex items-center gap-2 text-xs font-semibold text-warm-brown hover:text-warm-terracotta transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {isMainAdminSite ? 'ContentHub Main' : (creator?.display_name || 'Creator')} Website</span>
          </Link>
          <span className="text-xs font-mono text-warm-gold font-bold uppercase tracking-wider">Publication</span>
        </div>
      </nav>

      {/* Main Reader View */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <header className="space-y-4">
          <div className="flex items-center gap-3 text-xs font-mono text-warm-muted">
            <span className="px-3 py-1 rounded-full bg-warm-surface border border-warm-border font-semibold text-warm-brown">
              {post.category_name || 'General Tech'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recent'}
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-serif font-bold text-warm-charcoal leading-tight">
            {post.title}
          </h1>

          {post.summary && (
            <p className="text-base md:text-lg text-warm-muted leading-relaxed font-serif italic border-l-2 border-warm-terracotta pl-4 py-1">
              {post.summary}
            </p>
          )}
        </header>

        {post.featured_image && (
          <img
            src={post.featured_image}
            alt={post.title}
            className="w-full h-80 md:h-[450px] object-cover rounded-2xl border border-warm-border shadow-lg"
          />
        )}

        <article className="bg-warm-surface border border-warm-border rounded-3xl p-8 md:p-12 shadow-sm text-warm-text leading-relaxed text-base space-y-6 font-sans">
          {post.content.split('\n\n').map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </article>
      </main>

      {/* Footer */}
      <footer className="bg-warm-charcoal text-warm-bg py-8 border-t border-warm-black/40 text-center text-xs font-mono text-warm-muted">
        <p>&copy; {new Date().getFullYear()} {creator?.display_name}. Published on ContentHub CMS.</p>
      </footer>
    </div>
  );
};
