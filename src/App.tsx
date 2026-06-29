import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTickets } from './hooks/useTickets';
import { supabase, type Ticket, type Profile } from './lib/supabase';
import AuthPage from './components/AuthPage';
import TicketList from './components/TicketList';
import TicketDetail from './components/TicketDetail';
import CreateTicket from './components/CreateTicket';
import Dashboard from './components/Dashboard';
import NotificationsPanel from './components/NotificationsPanel';
import { Headphones, LayoutDashboard, Bell, LogOut, Ticket as TicketIcon } from 'lucide-react';

type View = 'list' | 'detail' | 'create' | 'dashboard';

function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { tickets, fetchTickets, updateTicket, deleteTicket } = useTickets();
  const [view, setView] = useState<View>('list');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [agents, setAgents] = useState<Profile[]>([]);

  useEffect(() => {
    if (user?.role === 'manager') {
      supabase
        .from('profiles')
        .select('*')
        .eq('role', 'agent')
        .then(({ data }) => {
          if (data) setAgents(data as Profile[]);
        });
    }
  }, [user]);

  // Role-based ticket filtering per US-02, US-07, US-08, US-09
  const visibleTickets = useMemo(() => {
    if (!user) return [];
    if (user.role === 'manager') return tickets;
    if (user.role === 'employee') return tickets.filter((t) => t.submitter_id === user.id);
    if (user.role === 'agent') return tickets.filter((t) => t.assigned_to_id === user.id || t.assigned_to_id === null);
    return tickets;
  }, [tickets, user]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  function handleSelectTicket(ticket: Ticket) {
    setSelectedTicket(ticket);
    setView('detail');
  }

  function handleBack() {
    setSelectedTicket(null);
    setView('list');
    fetchTickets();
  }

  function handleCreated() {
    setView('list');
    fetchTickets();
  }

  async function handleUpdateTicket(id: string, updates: Partial<Ticket>) {
    const oldTicket = tickets.find((t) => t.id === id);
    await updateTicket(id, updates, user?.id);

    // US-14: Status Change Notification
    if (oldTicket && updates.status && updates.status !== oldTicket.status && oldTicket.submitter_id) {
      await supabase.from('notifications').insert({
        user_id: oldTicket.submitter_id,
        ticket_id: id,
        type: 'status_changed',
        message: `Ticket #${id.slice(0, 8)} status changed from ${oldTicket.status} to ${updates.status}`,
      });
    }

    // US-15: Assignment Notification
    if (updates.assigned_to !== undefined && updates.assigned_to !== oldTicket?.assigned_to) {
      const assignedAgent = agents.find((a) => (a.full_name || a.email) === updates.assigned_to);
      if (assignedAgent) {
        await supabase.from('notifications').insert({
          user_id: assignedAgent.id,
          ticket_id: id,
          type: 'assigned',
          message: `Ticket #${id.slice(0, 8)} assigned to you. Priority: ${oldTicket?.priority || 'medium'}`,
        });
      }
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0 relative">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Headphones className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900">HelpDesk Lite</span>
        </div>

        <div className="flex items-center gap-2">
          {user.role === 'manager' && (
            <button
              onClick={() => setView('dashboard')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                view === 'dashboard'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
          )}
          <button
            onClick={() => { setView('list'); setSelectedTicket(null); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === 'list' || view === 'detail' || view === 'create'
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <TicketIcon className="w-4 h-4" />
            Tickets
          </button>

          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Bell className="w-4 h-4" />
            </button>
            <NotificationsPanel isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
          </div>

          <div className="flex items-center gap-2 ml-2 pl-3 border-l border-gray-200">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold">
              {(user.full_name || user.email).charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-medium text-gray-900">{user.full_name || user.email}</p>
              <p className="text-[10px] text-gray-400 capitalize">{user.role}</p>
            </div>
            <button
              onClick={signOut}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {view === 'dashboard' && user.role === 'manager' && (
          <Dashboard tickets={visibleTickets} currentUser={user} />
        )}
        {view === 'list' && (
          <TicketList
            tickets={visibleTickets}
            currentUser={user}
            onSelectTicket={handleSelectTicket}
            onCreateTicket={() => setView('create')}
            onDeleteTicket={user.role === 'manager' ? deleteTicket : undefined}
          />
        )}
        {view === 'detail' && selectedTicket && (
          <TicketDetail
            ticket={selectedTicket}
            currentUser={user}
            agents={agents}
            onBack={handleBack}
            onUpdate={handleUpdateTicket}
          />
        )}
        {view === 'create' && (
          <CreateTicket currentUser={user} onBack={handleBack} onCreated={handleCreated} />
        )}
      </main>
    </div>
  );
}

export default App;
