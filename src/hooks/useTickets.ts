import { useState, useEffect, useCallback } from 'react';
import { supabase, type Ticket, type TicketHistory, type TicketComment, type Notification } from '../lib/supabase';

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setTickets(data as Ticket[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  async function createTicket(ticket: Partial<Ticket>) {
    const { data, error } = await supabase.from('tickets').insert(ticket).select().single();
    if (!error && data) {
      setTickets((prev) => [data as Ticket, ...prev]);
    }
    return { data, error };
  }

  async function updateTicket(id: string, updates: Partial<Ticket>, userId?: string) {
    const oldTicket = tickets.find((t) => t.id === id);
    const { data, error } = await supabase.from('tickets').update(updates).eq('id', id).select().single();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      const newTicket = data as Ticket;
      // Record history if we have the old ticket and userId
      if (oldTicket && userId) {
        const historyEntries: Partial<TicketHistory>[] = [];
        for (const key of Object.keys(updates)) {
          const k = key as keyof Ticket;
          if (oldTicket[k] !== newTicket[k]) {
            historyEntries.push({
              ticket_id: id,
              changed_by: userId,
              field_name: key,
              old_value: String(oldTicket[k] ?? ''),
              new_value: String(newTicket[k] ?? ''),
            });
          }
        }
        if (historyEntries.length > 0) {
          await supabase.from('ticket_history').insert(historyEntries);
        }
      }
      // Always update local state
      setTickets((prev) => prev.map((t) => (t.id === id ? newTicket : t)));
    }

    return { data, error };
  }

  async function deleteTicket(id: string) {
    const { error } = await supabase.from('tickets').delete().eq('id', id);
    if (!error) {
      setTickets((prev) => prev.filter((t) => t.id !== id));
    }
    return { error };
  }

  return { tickets, loading, fetchTickets, createTicket, updateTicket, deleteTicket };
}

export function useTicketHistory(ticketId: string | null) {
  const [history, setHistory] = useState<TicketHistory[]>([]);

  useEffect(() => {
    if (!ticketId) return;
    supabase
      .from('ticket_history')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setHistory(data as TicketHistory[]);
      });
  }, [ticketId]);

  return { history };
}

export function useTicketComments(ticketId: string | null) {
  const [comments, setComments] = useState<TicketComment[]>([]);

  const fetchComments = useCallback(async () => {
    if (!ticketId) return;
    const { data, error } = await supabase
      .from('ticket_comments')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (!error && data) setComments(data as TicketComment[]);
  }, [ticketId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function addComment(comment: Partial<TicketComment>) {
    const { data, error } = await supabase.from('ticket_comments').insert(comment).select().single();
    if (!error && data) {
      setComments((prev) => [...prev, data as TicketComment]);
    }
    return { data, error };
  }

  return { comments, addComment, fetchComments };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    if (!error && data) setNotifications(data as Notification[]);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function markAsRead(id: string) {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
    return { error };
  }

  async function createNotification(notification: Partial<Notification>) {
    const { data, error } = await supabase.from('notifications').insert(notification).select().single();
    return { data, error };
  }

  return { notifications, fetchNotifications, markAsRead, createNotification };
}
