/*
# Create HelpDesk Lite tables

1. New Tables
- `tickets` - Main support tickets table
  - `id` (uuid, primary key)
  - `title` (text, not null) - Ticket subject
  - `description` (text) - Ticket details
  - `status` (text, default 'open') - open, in_progress, resolved, closed
  - `priority` (text, default 'medium') - low, medium, high, urgent
  - `category` (text) - General category
  - `requester_name` (text) - Name of the person submitting
  - `requester_email` (text) - Email of the person submitting
  - `assigned_to` (text) - Agent assigned
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

- `ticket_comments` - Comments/replies on tickets
  - `id` (uuid, primary key)
  - `ticket_id` (uuid, foreign key to tickets)
  - `author_name` (text)
  - `content` (text, not null)
  - `is_internal` (boolean, default false)
  - `created_at` (timestamptz)

2. Security
- Enable RLS on both tables.
- Allow anon + authenticated full CRUD (public helpdesk, no auth required).
*/

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  category text,
  requester_name text,
  requester_email text,
  assigned_to text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_name text,
  content text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- Tickets policies
DROP POLICY IF EXISTS "anon_select_tickets" ON tickets;
CREATE POLICY "anon_select_tickets" ON tickets FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_tickets" ON tickets;
CREATE POLICY "anon_insert_tickets" ON tickets FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_tickets" ON tickets;
CREATE POLICY "anon_update_tickets" ON tickets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_tickets" ON tickets;
CREATE POLICY "anon_delete_tickets" ON tickets FOR DELETE
  TO anon, authenticated USING (true);

-- Comments policies
DROP POLICY IF EXISTS "anon_select_comments" ON ticket_comments;
CREATE POLICY "anon_select_comments" ON ticket_comments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_comments" ON ticket_comments;
CREATE POLICY "anon_insert_comments" ON ticket_comments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_comments" ON ticket_comments;
CREATE POLICY "anon_update_comments" ON ticket_comments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_comments" ON ticket_comments;
CREATE POLICY "anon_delete_comments" ON ticket_comments FOR DELETE
  TO anon, authenticated USING (true);