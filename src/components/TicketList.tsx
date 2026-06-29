import { useState, useMemo } from 'react';
import { type Ticket, type Profile } from '../lib/supabase';
import { Search, Filter, Plus, Clock, AlertCircle, CheckCircle, XCircle, ArrowRight, Trash2 } from 'lucide-react';

interface TicketListProps {
  tickets: Ticket[];
  currentUser: Profile | null;
  onSelectTicket: (ticket: Ticket) => void;
  onCreateTicket: () => void;
  onDeleteTicket?: (id: string) => void;
}

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-sky-100 text-sky-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-rose-100 text-rose-700',
};

const statusIcons: Record<string, React.ReactNode> = {
  open: <AlertCircle className="w-4 h-4" />,
  in_progress: <Clock className="w-4 h-4" />,
  pending: <Clock className="w-4 h-4" />,
  resolved: <CheckCircle className="w-4 h-4" />,
  closed: <XCircle className="w-4 h-4" />,
};

export default function TicketList({ tickets, currentUser, onSelectTicket, onCreateTicket, onDeleteTicket }: TicketListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = useMemo(() => {
    const set = new Set(tickets.map((t) => t.category).filter(Boolean));
    return Array.from(set) as string[];
  }, [tickets]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.requester_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (t.requester_email?.toLowerCase() || '').includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [tickets, search, statusFilter, categoryFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tickets.length };
    for (const s of ['open', 'in_progress', 'pending', 'resolved', 'closed']) {
      counts[s] = tickets.filter((t) => t.status === s).length;
    }
    return counts;
  }, [tickets]);

  const isManager = currentUser?.role === 'manager';
  const isEmployee = currentUser?.role === 'employee';

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
            <p className="text-sm text-gray-500 mt-1">
              {isEmployee ? 'Your submitted tickets' : isManager ? 'All tickets' : 'Your assigned tickets'}
            </p>
          </div>
          <button
            onClick={onCreateTicket}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tickets..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          {categories.length > 0 && (
            <select
              value={categoryFilter || ''}
              onChange={(e) => setCategoryFilter(e.target.value || 'all')}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center gap-1 mt-3">
          {(['all', 'open', 'in_progress', 'pending', 'resolved', 'closed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s === 'in_progress' ? 'In Progress' : s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}{' '}
              <span className="ml-1 text-gray-400">{statusCounts[s]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Filter className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No tickets found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((ticket) => (
              <div
                key={ticket.id}
                className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-start gap-4 group"
              >
                <button
                  onClick={() => onSelectTicket(ticket)}
                  className="flex-1 flex items-start gap-4 text-left"
                >
                  <div className="mt-0.5">{statusIcons[ticket.status]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">{ticket.title}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[ticket.priority]}`}
                      >
                        {ticket.priority}
                      </span>
                      {ticket.category && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {ticket.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span className="inline-flex items-center gap-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            ticket.status === 'open'
                              ? 'bg-blue-500'
                              : ticket.status === 'in_progress'
                              ? 'bg-amber-500'
                              : ticket.status === 'pending'
                              ? 'bg-orange-500'
                              : ticket.status === 'resolved'
                              ? 'bg-emerald-500'
                              : 'bg-gray-400'
                          }`}
                        />
                        {ticket.status === 'in_progress' ? 'In Progress' : ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                      </span>
                      <span>{ticket.requester_name || 'Anonymous'}</span>
                      <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                      {ticket.assigned_to && <span>Assigned: {ticket.assigned_to}</span>}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 mt-1 transition-colors" />
                </button>
                {isManager && onDeleteTicket && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteTicket(ticket.id); }}
                    className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                    title="Delete ticket"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
