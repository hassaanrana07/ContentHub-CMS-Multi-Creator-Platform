import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import {
  Users,
  UserCheck,
  UserX,
  FileText,
  FileCheck,
  FileClock,
  Image as ImageIcon,
  Mail,
  ShieldAlert,
  BarChart2
} from 'lucide-react';

export const AdminOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/stats');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch admin analytics.');
    } finally {
      setLoading(false);
    }
  };

  const overview = data?.overview;
  const charts = data?.charts;

  const statCards = [
    { title: 'Total Creators', count: overview?.totalCreators, icon: Users, color: 'text-warm-charcoal bg-warm-charcoal/10' },
    { title: 'Active Creators', count: overview?.activeCreators, icon: UserCheck, color: 'text-warm-brown bg-warm-brown/10' },
    { title: 'Suspended Creators', count: overview?.suspendedCreators, icon: UserX, color: 'text-warm-terracotta bg-warm-terracotta/10' },
    { title: 'Total Articles', count: overview?.totalPosts, icon: FileText, color: 'text-warm-gold bg-warm-gold/10' },
    { title: 'Published Articles', count: overview?.publishedPosts, icon: FileCheck, color: 'text-warm-brown bg-warm-brown/10' },
    { title: 'Draft Articles', count: overview?.draftPosts, icon: FileClock, color: 'text-warm-gold bg-warm-gold/10' },
    { title: 'Media Items', count: overview?.totalMedia, icon: ImageIcon, color: 'text-warm-charcoal bg-warm-charcoal/10' },
    { title: 'Contact Messages', count: overview?.totalMessages, icon: Mail, color: 'text-warm-terracotta bg-warm-terracotta/10' },
  ];

  return (
    <div className="space-y-8 font-sans">
      {/* Banner */}
      <div className="bg-warm-surface border border-warm-border rounded-2xl p-6 md:p-8 space-y-2 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-terracotta/10 text-warm-terracotta text-xs font-mono font-semibold uppercase tracking-wider">
          <ShieldAlert className="w-3.5 h-3.5" /> Platform Governance Console
        </div>
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-warm-charcoal tracking-tight">
          Super Admin Analytics
        </h1>
        <p className="text-sm text-warm-muted max-w-2xl">
          Real-time metrics, creator registration growth, article distribution, and platform governance.
        </p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div key={idx} className="p-5 bg-warm-surface border border-warm-border rounded-xl shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-warm-muted uppercase tracking-wider">{card.title}</p>
                  <p className="text-2xl md:text-3xl font-serif font-bold text-warm-charcoal">{card.count ?? 0}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6 ANALYTICS CHARTS SECTION */}
      {!loading && charts && (
        <div className="space-y-6">
          <h2 className="text-xl font-serif font-bold text-warm-charcoal flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-warm-terracotta" />
            Platform Analytics & Distribution (6 Charts)
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Creator Growth */}
            <div className="bg-warm-surface border border-warm-border rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-serif font-bold text-base text-warm-charcoal">Chart 1 — Creator Growth</h3>
                <p className="text-xs text-warm-muted">New creator registrations over time</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.creatorGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DED7CF" />
                    <XAxis dataKey="month" stroke="#756D65" fontSize={12} />
                    <YAxis stroke="#756D65" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#F5F1EA', borderColor: '#DED7CF', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="count" name="Creators" stroke="#A65F46" strokeWidth={3} dot={{ fill: '#A65F46', r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Content Distribution */}
            <div className="bg-warm-surface border border-warm-border rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-serif font-bold text-base text-warm-charcoal">Chart 2 — Content Distribution</h3>
                <p className="text-xs text-warm-muted">Breakdown of platform assets (Articles, Media, Testimonials, FAQs)</p>
              </div>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.contentDistribution}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      label={({ name, count }) => `${name}: ${count}`}
                    >
                      {charts.contentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#F5F1EA', borderColor: '#DED7CF', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Published vs Draft Articles per Creator */}
            <div className="bg-warm-surface border border-warm-border rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-serif font-bold text-base text-warm-charcoal">Chart 3 — Published vs Draft Articles</h3>
                <p className="text-xs text-warm-muted">Article status ratio per creator account</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.publishedVsDraft}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DED7CF" />
                    <XAxis dataKey="display_name" stroke="#756D65" fontSize={11} />
                    <YAxis stroke="#756D65" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#F5F1EA', borderColor: '#DED7CF', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="published" name="Published" fill="#6B4F3A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="draft" name="Draft" fill="#B08A57" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Creator Status Breakdown */}
            <div className="bg-warm-surface border border-warm-border rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-serif font-bold text-base text-warm-charcoal">Chart 4 — Creator Status Breakdown</h3>
                <p className="text-xs text-warm-muted">Active vs Suspended creator accounts</p>
              </div>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={charts.creatorStatus}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label={({ name, count }) => `${name}: ${count}`}
                    >
                      {charts.creatorStatus.map((entry, index) => (
                        <Cell key={`cell-status-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#F5F1EA', borderColor: '#DED7CF', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 5: Monthly Content Creation */}
            <div className="bg-warm-surface border border-warm-border rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-serif font-bold text-base text-warm-charcoal">Chart 5 — Monthly Content Creation</h3>
                <p className="text-xs text-warm-muted">Volume of articles published over time</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.monthlyContent}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DED7CF" />
                    <XAxis dataKey="month" stroke="#756D65" fontSize={12} />
                    <YAxis stroke="#756D65" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#F5F1EA', borderColor: '#DED7CF', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="count" name="Articles Created" stroke="#6B4F3A" fill="#6B4F3A" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 6: Contact Messages Received */}
            <div className="bg-warm-surface border border-warm-border rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-serif font-bold text-base text-warm-charcoal">Chart 6 — Contact Messages Received</h3>
                <p className="text-xs text-warm-muted">Public contact submissions across all creator sites</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.monthlyMessages}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DED7CF" />
                    <XAxis dataKey="month" stroke="#756D65" fontSize={12} />
                    <YAxis stroke="#756D65" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#F5F1EA', borderColor: '#DED7CF', borderRadius: '8px' }} />
                    <Bar dataKey="count" name="Messages Received" fill="#A65F46" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
