/*
# HelpDesk Lite V2 Schema Overhaul

1. New Tables
- `profiles` — extends auth.users with role and display name
  - `id` (uuid, PK, references auth.users)
  - `email` (text)
  - `full_name` (text)
  - `role` (text, default 'employee') — employee, agent, manager
  - `created_at` (timestamptz)

- `ticket_history` — immutable audit log for ticket changes
  - `id` (uuid, PK)
  - `ticket_id` (uuid, FK to tickets)
  - `changed_by` (uuid, FK to profiles)
  - `field_name` (text) — which field changed
  - `old_value` (text)
  - `new_value` (text)
  - `created_at` (timestamptz)

- `notifications` — in-app notification queue
  - `id` (uuid, PK)
  - `user_id` (uuid, FK to profiles)
  - `ticket_id` (uuid, FK to tickets)
  - `type` (text) — created, status_changed, assigned
  - `message` (text)
  - `is_read` (boolean)
  - `created_at` (timestamptz)

2. Modified Tables
- `tickets` — added submitter_id, assigned_to_id, status enum check
- `ticket_comments` — added author_id

3. Security
- Enable RLS on all new tables.
- Owner-scoped and role-scoped policies.
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'employee',
  created_at timestamptz DEFAULT now()
);

-- Ticket history table
CREATE TABLE IF NOT EXISTS ticket_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  type text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to tickets safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'submitter_id') THEN
    ALTER TABLE tickets ADD COLUMN submitter_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'assigned_to_id') THEN
    ALTER TABLE tickets ADD COLUMN assigned_to_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add author_id to ticket_comments safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ticket_comments' AND column_name = 'author_id') THEN
    ALTER TABLE ticket_comments ADD COLUMN author_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add check constraint for status if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'tickets' AND constraint_name = 'tickets_status_check'
  ) THEN
    ALTER TABLE tickets ADD CONSTRAINT tickets_status_check 
    CHECK (status IN ('open', 'in_progress', 'pending', 'resolved', 'closed'));
  END IF;
END $$;

-- Add check constraint for priority if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'tickets' AND constraint_name = 'tickets_priority_check'
  ) THEN
    ALTER TABLE tickets ADD CONSTRAINT tickets_priority_check 
    CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_profiles" ON profiles;
CREATE POLICY "insert_profiles" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Ticket history policies (managers see all, agents see their assigned, employees see their own)
DROP POLICY IF EXISTS "select_history_manager" ON ticket_history;
CREATE POLICY "select_history_manager" ON ticket_history FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'manager')
  );

DROP POLICY IF EXISTS "select_history_agent" ON ticket_history;
CREATE POLICY "select_history_agent" ON ticket_history FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'agent'
    ) AND EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_history.ticket_id AND tickets.assigned_to_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "select_history_employee" ON ticket_history;
CREATE POLICY "select_history_employee" ON ticket_history FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_history.ticket_id AND tickets.submitter_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_history" ON ticket_history;
CREATE POLICY "insert_history" ON ticket_history FOR INSERT
  TO authenticated WITH CHECK (true);

-- Notifications policies
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Update tickets policies for role-based access
DROP POLICY IF EXISTS "anon_select_tickets" ON tickets;
DROP POLICY IF EXISTS "anon_insert_tickets" ON tickets;
DROP POLICY IF EXISTS "anon_update_tickets" ON tickets;
DROP POLICY IF EXISTS "anon_delete_tickets" ON tickets;

DROP POLICY IF EXISTS "select_tickets_manager" ON tickets;
CREATE POLICY "select_tickets_manager" ON tickets FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'manager')
  );

DROP POLICY IF EXISTS "select_tickets_agent" ON tickets;
CREATE POLICY "select_tickets_agent" ON tickets FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'agent')
    AND (assigned_to_id = auth.uid() OR assigned_to_id IS NULL)
  );

DROP POLICY IF EXISTS "select_tickets_employee" ON tickets;
CREATE POLICY "select_tickets_employee" ON tickets FOR SELECT
  TO authenticated USING (submitter_id = auth.uid());

DROP POLICY IF EXISTS "insert_tickets" ON tickets;
CREATE POLICY "insert_tickets" ON tickets FOR INSERT
  TO authenticated WITH CHECK (submitter_id = auth.uid());

DROP POLICY IF EXISTS "update_tickets_manager" ON tickets;
CREATE POLICY "update_tickets_manager" ON tickets FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'manager')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'manager')
  );

DROP POLICY IF EXISTS "update_tickets_agent" ON tickets;
CREATE POLICY "update_tickets_agent" ON tickets FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'agent')
    AND (assigned_to_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'agent')
    AND (assigned_to_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_tickets_manager" ON tickets;
CREATE POLICY "delete_tickets_manager" ON tickets FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'manager')
  );

-- Update ticket_comments policies
DROP POLICY IF EXISTS "anon_select_comments" ON ticket_comments;
DROP POLICY IF EXISTS "anon_insert_comments" ON ticket_comments;
DROP POLICY IF EXISTS "anon_update_comments" ON ticket_comments;
DROP POLICY IF EXISTS "anon_delete_comments" ON ticket_comments;

DROP POLICY IF EXISTS "select_comments" ON ticket_comments;
CREATE POLICY "select_comments" ON ticket_comments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM tickets WHERE tickets.id = ticket_comments.ticket_id AND (
        tickets.submitter_id = auth.uid() OR tickets.assigned_to_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'manager')
      )
    )
  );

DROP POLICY IF EXISTS "insert_comments" ON ticket_comments;
CREATE POLICY "insert_comments" ON ticket_comments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets WHERE tickets.id = ticket_comments.ticket_id AND (
        tickets.submitter_id = auth.uid() OR tickets.assigned_to_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'manager')
      )
    )
  );

-- Trigger to auto-create profile on auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to ensure it's attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
