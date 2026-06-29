import { useMemo } from 'react';
import { type Ticket, type Profile } from '../lib/supabase';
import {
  AlertCircle, Clock, CheckCircle, XCircle, Users, BarChart3,
  TrendingUp, Ticket as TicketIcon
} from 'lucide-react';

interface DashboardProps {
  tickets: Ticket[];
  currentUser: Profile | null;
}

export default function Dashboard({ tickets, currentUser }: DashboardProps) {
  const role = currentUser?.role;

  const metrics = useMemo(() => {
    const open = tickets.filter((t) => t.status === 'open').length;
    const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
    const pending = tickets.filter((t) => t.status === 'pending').length;
    const resolved = tickets.filter((t) => t.status === 'resolved').length;
    const closed = tickets.filter((t) => t.status === 'closed').length;
    const total = tickets.length;
    return { open, inProgress, pending, resolved, closed, total };
  }, [tickets]);

  const agentWorkload = useMemo(() => {
    const map = new Map<string, { assigned: number; resolved: number; pending: number }>();
    for (const t of tickets) {
      if (!t.assigned_to) continue;
      const entry = map.get(t.assigned_to) || { assigned: 0, resolved: 0, pending: 0 };
      entry.assigned++;
      if (t.status === 'resolved') entry.resolved++;
      if (t.status === 'pending') entry.pending++;
      map.set(t.assigned_to, entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].assigned - a[1].assigned);
  }, [tickets]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tickets) {
      if (!t.category) continue;
      map.set(t.category, (map.get(t.category) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [tickets]);

  const statCards = [
    { label: 'Open', value: metrics.open, icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'In Progress', value: metrics.inProgress, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Pending', value: metrics.pending, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Resolved', value: metrics.resolved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Closed', value: metrics.closed, icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-50' },
    { label: 'Total', value: metrics.total, icon: TicketIcon, color: 'text-blue-800', bg: 'bg-blue-100' },
  ];

  if (role !== 'manager') {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">Dashboard is only available to Managers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Manager Dashboard</h1>
          <span className="text-sm text-gray-500">{new Date().toLocaleDateString()}</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <span className="text-2xl font-bold text-gray-900">{card.value}</span>
              </div>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent Workload */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">Team Workload</h2>
            </div>
            {agentWorkload.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No assigned tickets yet.</p>
            ) : (
              <div className="space-y-3">
                {agentWorkload.map(([name, stats]) => (
                  <div key={name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold">
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-500">Assigned: <span className="font-medium text-gray-900">{stats.assigned}</span></span>
                      <span className="text-emerald-600">Resolved: <span className="font-medium">{stats.resolved}</span></span>
                      <span className="text-orange-600">Pending: <span className="font-medium">{stats.pending}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">Tickets by Category</h2>
            </div>
            {categoryBreakdown.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No categorized tickets yet.</p>
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.map(([category, count]) => {
                  const max = categoryBreakdown[0][1];
                  const pct = Math.round((count / max) * 100);
                  return (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-700">{category}</span>
                        <span className="text-gray-500">{count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
