import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Send } from 'lucide-react';
import type { Profile } from '../lib/supabase';

interface CreateTicketProps {
  currentUser: Profile | null;
  onBack: () => void;
  onCreated: () => void;
}

export default function CreateTicket({ currentUser, onBack, onCreated }: CreateTicketProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [category, setCategory] = useState('');
  const [requesterName, setRequesterName] = useState(currentUser?.full_name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (currentUser?.full_name) {
      setRequesterName(currentUser.full_name);
    }
  }, [currentUser]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!category.trim()) {
      setError('Category is required');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    setLoading(true);
    setError('');

    const { data: ticketData, error: insertError } = await supabase.from('tickets').insert({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      category: category.trim(),
      status: 'open',
      requester_name: requesterName.trim() || currentUser?.full_name || 'Anonymous',
      requester_email: currentUser?.email || null,
      submitter_id: currentUser?.id,
    }).select().single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Create notification for the submitter
    if (currentUser?.id && ticketData) {
      await supabase.from('notifications').insert({
        user_id: currentUser.id,
        ticket_id: ticketData.id,
        type: 'created',
        message: `Ticket #${ticketData.id.slice(0, 8)} created successfully. Status: Open`,
      });
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => {
      setSuccess(false);
      onCreated();
    }, 1500);
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-6 border-b border-gray-200">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to tickets
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">New Ticket</h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-sm">{error}</div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
              Ticket created successfully!
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the issue"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Submitter Name *</label>
            <input
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Billing, Technical"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as typeof priority)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={5}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              required
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || success}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
