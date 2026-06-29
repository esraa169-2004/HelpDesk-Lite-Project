import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'employee' | 'agent' | 'manager';
  created_at: string;
};

export type Ticket = {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string | null;
  requester_name: string | null;
  requester_email: string | null;
  assigned_to: string | null;
  assigned_to_id: string | null;
  submitter_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketComment = {
  id: string;
  ticket_id: string;
  author_name: string | null;
  author_id: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
};

export type TicketHistory = {
  id: string;
  ticket_id: string;
  changed_by: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  ticket_id: string | null;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
};
