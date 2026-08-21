import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  FileClock,
  Layers,
  Quote,
  HelpCircle,
  Mail,
  Image as ImageIcon,
  ExternalLink,
  Plus,
  Palette,
  Sparkles
} from 'lucide-react';

export const CreatorOverview = () => {
  const { creator } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/creator/dashboard/stats');
      setStats(res.data.stats);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load statistics.');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Published Articles', count: stats?.publishedPosts, icon: FileText, color: 'text-warm-brown bg-warm-brown/10', link: '/dashboard/articles' },
    { title: 'Draft Articles', count: stats?.draftPosts, icon: FileClock, color: 'text-warm-gold bg-warm-gold/10', link: '/dashboard/articles' },
    { title: 'Homepage Sections', count: stats?.homepageSections, icon: Layers, color: 'text-warm-terracotta bg-warm-terracotta/10', link: '/dashboard/builder' },
    { title: 'Testimonials', count: stats?.testimonials, icon: Quote, color: 'text-warm-charcoal bg-warm-charcoal/10', link: '/dashboard/testimonials' },
    { title: 'FAQs', count: stats?.faqs, icon: HelpCircle, color: 'text-warm-brown bg-warm-brown/10', link: '/dashboard/faqs' },
    { title: 'Unread Messages', count: stats?.unreadMessages, icon: Mail, color: 'text-warm-terracotta bg-warm-terracotta/10', link: '/dashboard/messages' },
    { title: 'Media Items', count: stats?.mediaItems, icon: ImageIcon, color: 'text-warm-gold bg-warm-gold/10', link: '/dashboard/media' },
  ];

  const publicUrl = creator?.username ? `/site/${creator.username}` : '#';

  return (
    <div className="space-y-8 font-sans">
      {/* Header Banner */}
      <div className="bg-warm-surface border border-warm-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-gold/10 text-warm-gold text-xs font-mono font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Creator Studio Active
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-warm-charcoal tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-sm text-warm-muted max-w-xl">
            Control your dynamic homepage sections, articles, testimonials, and brand styling from one central builder.
          </p>
        </div>

        {creator?.username && (
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-warm-charcoal hover:bg-warm-black text-white text-sm font-semibold shadow-md transition-all"
            >
              <span>Visit Live Website</span>
              <ExternalLink className="w-4 h-4 text-warm-gold" />
            </a>
          </div>
        )}
      </div>

      {/* Quick Action Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/dashboard/builder"
          className="p-5 rounded-xl bg-warm-surface border border-warm-border hover:border-warm-terracotta hover:shadow-md transition-all group flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-mono text-warm-gold uppercase tracking-wider font-semibold block">CMS Core</span>
            <span className="text-base font-serif font-semibold text-warm-charcoal group-hover:text-warm-terracotta transition-colors">
              Manage Sections
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-warm-terracotta/10 text-warm-terracotta flex items-center justify-center group-hover:bg-warm-terracotta group-hover:text-white transition-colors">
            <Layers className="w-5 h-5" />
          </div>
        </Link>

        <Link
          to="/dashboard/articles"
          className="p-5 rounded-xl bg-warm-surface border border-warm-border hover:border-warm-brown hover:shadow-md transition-all group flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-mono text-warm-gold uppercase tracking-wider font-semibold block">Content</span>
            <span className="text-base font-serif font-semibold text-warm-charcoal group-hover:text-warm-brown transition-colors">
              New Article
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-warm-brown/10 text-warm-brown flex items-center justify-center group-hover:bg-warm-brown group-hover:text-white transition-colors">
            <Plus className="w-5 h-5" />
          </div>
        </Link>

        <Link
          to="/dashboard/settings"
          className="p-5 rounded-xl bg-warm-surface border border-warm-border hover:border-warm-gold hover:shadow-md transition-all group flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-xs font-mono text-warm-gold uppercase tracking-wider font-semibold block">Branding</span>
            <span className="text-base font-serif font-semibold text-warm-charcoal group-hover:text-warm-gold transition-colors">
              Website Settings
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-warm-gold/10 text-warm-gold flex items-center justify-center group-hover:bg-warm-gold group-hover:text-white transition-colors">
            <Palette className="w-5 h-5" />
          </div>
        </Link>
      </div>

      {/* Metric Cards Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-serif font-bold text-warm-charcoal">Platform Metrics</h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-28 bg-warm-surface border border-warm-border rounded-xl animate-pulse p-4" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <Link
                  key={idx}
                  to={card.link}
                  className="p-5 bg-warm-surface border border-warm-border rounded-xl hover:shadow-md transition-all flex items-center justify-between group"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-warm-muted uppercase tracking-wider">{card.title}</p>
                    <p className="text-3xl font-serif font-bold text-warm-charcoal">{card.count ?? 0}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color} group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
