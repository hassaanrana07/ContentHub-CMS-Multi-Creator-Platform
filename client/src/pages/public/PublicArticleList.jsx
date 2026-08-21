import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Calendar, FileText, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const PublicArticleList = () => {
  const params = useParams();
  const username = params.username || 'admin';
  const [posts, setPosts] = useState([]);
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPosts();
  }, [username]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`/api/public/site/${username}/posts`);
      setPosts(res.data.posts);
      setCreator(res.data.creator);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load articles.');
    } finally {
      setLoading(false);
    }
  };

  const isMainSite = username === 'admin';
  const backUrl = isMainSite ? '/' : `/${username}`;
  const articleBaseUrl = isMainSite ? '/articles' : `/${username}/articles`;

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full border-4 border-warm-terracotta border-t-transparent animate-spin mx-auto" />
          <p className="font-serif font-semibold text-warm-charcoal">Loading Publication Archive...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-warm-surface border border-warm-border rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <AlertCircle className="w-12 h-12 text-warm-terracotta mx-auto" />
          <h2 className="text-2xl font-serif font-bold text-warm-charcoal">Articles Unavailable</h2>
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
      <nav className="bg-warm-surface border-b border-warm-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link
            to={backUrl}
            className="inline-flex items-center gap-2 text-xs font-semibold text-warm-brown hover:text-warm-terracotta transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {isMainSite ? 'ContentHub Main' : (creator?.display_name || 'Creator')} Website</span>
          </Link>
          <span className="text-xs font-mono text-warm-gold font-bold uppercase tracking-wider">All Publications</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-10">
        <header className="space-y-2 border-b border-warm-border pb-6">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-warm-gold">Article Archive</span>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-warm-charcoal">
            {isMainSite ? 'ContentHub Publications & News' : `Articles by ${creator?.display_name}`}
          </h1>
          <p className="text-sm text-warm-muted">Explore all published articles, technical guides, and insights.</p>
        </header>

        {posts.length === 0 ? (
          <div className="p-12 text-center bg-warm-surface border border-warm-border rounded-2xl space-y-3">
            <FileText className="w-12 h-12 text-warm-muted mx-auto" />
            <h3 className="text-lg font-serif font-semibold text-warm-charcoal">No Articles Published Yet</h3>
            <p className="text-sm text-warm-muted">Check back later for new articles and publications.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <article key={post.id} className="bg-warm-surface border border-warm-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div className="space-y-4 p-6">
                  {post.featured_image && (
                    <img src={post.featured_image} alt={post.title} className="w-full h-44 object-cover rounded-xl border border-warm-border" />
                  )}
                  <div className="space-y-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-warm-bg border border-warm-border text-warm-brown">
                      {post.category_name || 'General Tech'}
                    </span>
                    <h3 className="font-serif font-bold text-xl text-warm-charcoal leading-snug hover:text-warm-terracotta transition-colors">
                      <Link to={`${articleBaseUrl}/${post.slug}`}>{post.title}</Link>
                    </h3>
                    {post.summary && <p className="text-xs text-warm-muted line-clamp-3 leading-relaxed">{post.summary}</p>}
                  </div>
                </div>

                <div className="p-6 pt-0 flex items-center justify-between text-xs border-t border-warm-border/40 mt-4">
                  <span className="text-warm-muted font-mono">
                    {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                  </span>
                  <Link
                    to={`${articleBaseUrl}/${post.slug}`}
                    className="font-semibold text-warm-terracotta hover:underline inline-flex items-center gap-1"
                  >
                    <span>Read Article</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-warm-charcoal text-warm-bg py-8 border-t border-warm-black/40 text-center text-xs font-mono text-warm-muted">
        <p>&copy; {new Date().getFullYear()} ContentHub CMS Multi-Creator Platform.</p>
      </footer>
    </div>
  );
};
