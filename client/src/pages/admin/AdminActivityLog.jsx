import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, Calendar, User, ShieldCheck } from 'lucide-react';

export const AdminActivityLog = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/activity');
      setActivities(res.data.activities);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="pb-4 border-b border-warm-border">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warm-gold/10 text-warm-gold text-xs font-mono font-semibold uppercase tracking-wider mb-1">
          <Activity className="w-3.5 h-3.5" /> System Audit Telemetry
        </div>
        <h1 className="text-2xl font-serif font-bold text-warm-charcoal">Platform Activity Log</h1>
        <p className="text-sm text-warm-muted">Audit stream of key administrative events, registrations, and content updates.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-warm-surface border border-warm-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="p-12 text-center bg-warm-surface border border-warm-border rounded-2xl space-y-3">
          <Activity className="w-12 h-12 text-warm-muted mx-auto" />
          <h3 className="text-lg font-serif font-semibold text-warm-charcoal">No Activity Recorded</h3>
          <p className="text-sm text-warm-muted">Administrative events will be logged here automatically.</p>
        </div>
      ) : (
        <div className="bg-warm-surface border border-warm-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-warm-bg border-b border-warm-border text-[11px] font-mono uppercase tracking-wider text-warm-muted">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-border text-xs text-warm-text">
                {activities.map((act) => (
                  <tr key={act.id} className="hover:bg-warm-hover/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-warm-muted">
                      {new Date(act.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-warm-charcoal flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-warm-terracotta" />
                      <span>{act.actor_name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-warm-brown">
                      {act.action}
                    </td>
                    <td className="py-3.5 px-4 text-warm-muted">
                      {act.target_info || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
