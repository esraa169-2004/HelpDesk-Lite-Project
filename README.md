# HelpDesk Lite

A modern, role-based support ticket management system built with React, TypeScript, Tailwind CSS, and Supabase. Designed for teams that need a clean, intuitive interface to track, assign, and resolve customer issues.

![HelpDesk Lite](https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=80)

## Features

### Ticket Management
- **Create tickets** with title, submitter name, category, description, and priority (Low, Medium, High, Urgent)
- **Status workflow**: Open &rarr; In Progress &rarr; Pending &rarr; Resolved &rarr; Closed
- **Assignment**: Managers can assign tickets to support agents with full profile linkage
- **Comments**: Threaded discussions on each ticket with author attribution
- **Audit history**: Immutable change log tracking every status update, priority change, and assignment

### Role-Based Access Control
Three distinct user roles with scoped permissions:

| Role | Permissions |
|------|-------------|
| **Employee** | Submit tickets, view own tickets, comment on own tickets |
| **Support Agent** | View assigned + unassigned tickets, update status/priority on assigned tickets, comment on accessible tickets |
| **Manager** | Full CRUD on all tickets, assign to agents, access dashboard, delete tickets |

### Manager Dashboard
- Real-time metrics: Open, In Progress, Resolved, and Closed ticket counts
- Filterable ticket table by status and category
- Team Performance table showing per-agent workload (assigned, resolved, pending counts)

### Notifications
- In-app notification panel for status changes and assignments
- Automatic notifications sent to submitters when their ticket status changes
- Assignment alerts sent to agents when tickets are assigned to them

### Security
- Row Level Security (RLS) enforced on all database tables
- Role-scoped policies using `auth.uid()` for ownership verification
- No permissive `USING (true)` shortcuts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS 3, Lucide React icons |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime) |
| **Auth** | Supabase Email/Password with profile roles |

## Database Schema

### `tickets`
Core ticket table with status check constraints and foreign keys to profiles.

### `profiles`
Extends `auth.users` with role (`employee`, `agent`, `manager`), full name, and email.

### `ticket_comments`
Threaded comments with author attribution and internal flag support.

### `ticket_history`
Immutable audit log recording every field change with old/new values.

### `notifications`
In-app notification queue with read status and type categorization.

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)

### 1. Clone and Install

```bash
git clone <repo-url>
cd helpdesk-lite
npm install
```

### 2. Configure Supabase

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run Migrations

Apply the database migrations in order:

```bash
# Migration 1: Base tables (tickets, ticket_comments)
supabase/migrations/20260628182726_create_helpdesk_tables.sql

# Migration 2: V2 schema (profiles, ticket_history, notifications, role-based RLS)
supabase/migrations/20260628184017_helpdesk_v2_schema.sql
```

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### 5. Create Your First User

Sign up via the app. The `handle_new_user()` trigger automatically creates a profile. To make a user a manager or agent, update their role directly in the `profiles` table:

```sql
UPDATE profiles SET role = 'manager' WHERE email = 'admin@example.com';
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |
| `npm run typecheck` | Run TypeScript compiler (no emit) |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
  components/
    AuthPage.tsx          # Login / signup screen
    CreateTicket.tsx      # New ticket form
    Dashboard.tsx         # Manager analytics dashboard
    NotificationsPanel.tsx # In-app notification drawer
    TicketDetail.tsx      # Ticket view with status/priority/assignment controls
    TicketList.tsx        # Filterable ticket list
  hooks/
    useAuth.ts            # Supabase auth state and profile loading
    useTickets.ts         # Ticket CRUD, comments, history, notifications
  lib/
    supabase.ts           # Supabase client and TypeScript types
  App.tsx                 # Main layout with role-based routing
  main.tsx                # Entry point
  index.css               # Tailwind directives

supabase/migrations/
  20260628182726_create_helpdesk_tables.sql
  20260628184017_helpdesk_v2_schema.sql
```

## License

MIT
