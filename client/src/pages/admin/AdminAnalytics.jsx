import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { BarChart3, TrendingUp, Users, FileText, PieChart as PieIcon, MessageSquare } from 'lucide-react';

export const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/stats');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="h-64 bg-warm-surface border border-warm-border rounded-xl animate-pulse flex items-center justify-center font-serif text-warm-muted">
        Loading Platform Analytics...
      </div>
    );
  }

  const { overview, charts } = data;

  return (
    <div className="space-y-8 font-sans">
      <div className="pb-4 border-b border-warm-border">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-gold/10 text-warm-gold text-xs font-mono font-semibold uppercase tracking-wider mb-1">
          <BarChart3 className="w-3.5 h-3.5" /> Comprehensive Insights
        </div>
        <h1 className="text-2xl font-serif font-bold text-warm-charcoal">Platform Analytics</h1>
        <p className="text-sm text-warm-muted">Interactive telemetry and growth metrics across creators and content.</p>
      </div>

      {/* 6 RECHARTS ANALYTICS CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Creator Growth Over Time */}
        <div className="p-6 bg-warm-surface border border-warm-border rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-warm-charcoal">Creator Registrations</h3>
              <p className="text-xs text-warm-muted">Growth in creator accounts over time.</p>
            </div>
            <span className="p-2 rounded-lg bg-warm-terracotta/10 text-warm-terracotta"><TrendingUp className="w-4 h-4" /></span>
          </div>
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.creatorGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DED7CF" />
                <XAxis dataKey="month" stroke="#756D65" fontSize={11} />
                <YAxis stroke="#756D65" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#24211E', color: '#fff', borderRadius: '8px', border: 'none' }} />
                <Line type="monotone" dataKey="count" name="Creators" stroke="#A65F46" strokeWidth={3} dot={{ fill: '#A65F46', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Content Distribution */}
        <div className="p-6 bg-warm-surface border border-warm-border rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-warm-charcoal">Content Type Distribution</h3>
              <p className="text-xs text-warm-muted">Breakdown of platform asset types.</p>
            </div>
            <span className="p-2 rounded-lg bg-warm-gold/10 text-warm-gold"><PieIcon className="w-4 h-4" /></span>
          </div>
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.contentDistribution} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {charts.contentDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#24211E', color: '#fff', borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Published vs Draft Articles per Creator */}
        <div className="p-6 bg-warm-surface border border-warm-border rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-warm-charcoal">Published vs Draft Articles</h3>
              <p className="text-xs text-warm-muted">Article status distribution per creator.</p>
            </div>
            <span className="p-2 rounded-lg bg-warm-brown/10 text-warm-brown"><FileText className="w-4 h-4" /></span>
          </div>
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.publishedVsDraft}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DED7CF" />
                <XAxis dataKey="display_name" stroke="#756D65" fontSize={10} />
                <YAxis stroke="#756D65" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#24211E', color: '#fff', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="published" name="Published" fill="#6B4F3A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="draft" name="Draft" fill="#B08A57" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Creator Account Status Breakdown */}
        <div className="p-6 bg-warm-surface border border-warm-border rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-warm-charcoal">Creator Status Ratio</h3>
              <p className="text-xs text-warm-muted">Active vs Suspended creator accounts.</p>
            </div>
            <span className="p-2 rounded-lg bg-warm-terracotta/10 text-warm-terracotta"><Users className="w-4 h-4" /></span>
          </div>
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={charts.creatorStatus} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} label>
                  {charts.creatorStatus.map((entry, index) => (
                    <Cell key={`status-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#24211E', color: '#fff', borderRadius: '8px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Monthly Content Creation */}
        <div className="p-6 bg-warm-surface border border-warm-border rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-warm-charcoal">Monthly Content Output</h3>
              <p className="text-xs text-warm-muted">Total articles created per month.</p>
            </div>
            <span className="p-2 rounded-lg bg-warm-gold/10 text-warm-gold"><FileText className="w-4 h-4" /></span>
          </div>
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyContent}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DED7CF" />
                <XAxis dataKey="month" stroke="#756D65" fontSize={11} />
                <YAxis stroke="#756D65" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#24211E', color: '#fff', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="count" name="Articles" stroke="#B08A57" fill="#B08A57" fillOpacity={0.25} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Contact Messages Received */}
        <div className="p-6 bg-warm-surface border border-warm-border rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-warm-charcoal">Visitor Engagement</h3>
              <p className="text-xs text-warm-muted">Contact messages received over time.</p>
            </div>
            <span className="p-2 rounded-lg bg-warm-brown/10 text-warm-brown"><MessageSquare className="w-4 h-4" /></span>
          </div>
          <div className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyMessages}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DED7CF" />
                <XAxis dataKey="month" stroke="#756D65" fontSize={11} />
                <YAxis stroke="#756D65" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#24211E', color: '#fff', borderRadius: '8px' }} />
                <Bar dataKey="count" name="Messages" fill="#6B4F3A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
