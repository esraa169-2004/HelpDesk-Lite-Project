import { useState, useEffect } from 'react';
import { type Ticket, type Profile } from '../lib/supabase';
import { useTicketHistory, useTicketComments } from '../hooks/useTickets';
import {
  ArrowLeft, Send, MessageSquare, User, Calendar, Tag,
  History, Shield, AlertTriangle, CheckCircle
} from 'lucide-react';

interface TicketDetailProps {
  ticket: Ticket;
  currentUser: Profile | null;
  agents?: Profile[];
  onBack: () => void;
  onUpdate: (id: string, updates: Partial<Ticket>) => Promise<void>;
}

const statusOptions = ['open', 'in_progress', 'pending', 'resolved', 'closed'] as const;
const priorityOptions = ['low', 'medium', 'high', 'urgent'] as const;

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-sky-100 text-sky-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-rose-100 text-rose-700',
};

export default function TicketDetail({ ticket: initialTicket, currentUser, agents = [], onBack, onUpdate }: TicketDetailProps) {
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const { history } = useTicketHistory(ticket.id);
  const { comments, addComment } = useTicketComments(ticket.id);

  useEffect(() => {
    setTicket(initialTicket);
  }, [initialTicket]);

  const role = currentUser?.role;
  const canEdit = role === 'manager' || (role === 'agent' && ticket.assigned_to_id === currentUser?.id);
  const canComment = role === 'manager' || role === 'agent' || ticket.submitter_id === currentUser?.id;

  function clearFeedback() {
    setUpdateError(null);
    setUpdateSuccess(null);
  }

  async function onStatusChange(newStatus: Ticket['status']) {
    clearFeedback();
    if (!canEdit) {
      setUpdateError('You do not have permission to update this ticket.');
      return;
    }
    try {
      await onUpdate(ticket.id, { status: newStatus });
      setTicket((prev) => ({ ...prev, status: newStatus }));
      setUpdateSuccess(`Status updated to ${newStatus}`);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  async function onPriorityChange(newPriority: Ticket['priority']) {
    clearFeedback();
    if (!canEdit) {
      setUpdateError('You do not have permission to update this ticket.');
      return;
    }
    try {
      await onUpdate(ticket.id, { priority: newPriority });
      setTicket((prev) => ({ ...prev, priority: newPriority }));
      setUpdateSuccess(`Priority updated to ${newPriority}`);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update priority');
    }
  }

  async function onAssignmentChange(newAssignedTo: string | null) {
    clearFeedback();
    if (role !== 'manager') {
      setUpdateError('Only managers can assign tickets.');
      return;
    }
    const selected = agents.find((a) => (a.full_name || a.email) === newAssignedTo);
    const assignedToId = selected?.id || null;
    try {
      await onUpdate(ticket.id, { assigned_to: newAssignedTo, assigned_to_id: assignedToId });
      setTicket((prev) => ({ ...prev, assigned_to: newAssignedTo, assigned_to_id: assignedToId }));
      setUpdateSuccess(newAssignedTo ? `Assigned to ${newAssignedTo}` : 'Ticket unassigned');
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update assignment');
    }
  }

  async function handleAddComment() {
    if (!newComment.trim() || !canComment) return;
    setCommentLoading(true);
    await addComment({
      ticket_id: ticket.id,
      content: newComment.trim(),
      author_name: currentUser?.full_name || 'Anonymous',
      author_id: currentUser?.id,
    });
    setNewComment('');
    setCommentLoading(false);
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
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">{ticket.title}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {ticket.requester_name || 'Anonymous'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(ticket.created_at).toLocaleDateString()}
              </span>
              {ticket.category && (
                <span className="inline-flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  {ticket.category}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${priorityColors[ticket.priority]}`}>
              {ticket.priority}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Feedback */}
          {updateError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 text-rose-700 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {updateError}
            </div>
          )}
          {updateSuccess && (
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {updateSuccess}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'details' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              History ({history.length})
            </button>
          </div>

          {activeTab === 'details' ? (
            <>
              <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                    <select
                      value={ticket.status}
                      onChange={(e) => onStatusChange(e.target.value as Ticket['status'])}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                    <select
                      value={ticket.priority}
                      onChange={(e) => onPriorityChange(e.target.value as Ticket['priority'])}
                      disabled={!canEdit}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {priorityOptions.map((p) => (
                        <option key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Assigned To</label>
                    {role === 'manager' && agents.length > 0 ? (
                      <select
                        value={ticket.assigned_to || ''}
                        onChange={(e) => onAssignmentChange(e.target.value || null)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Unassigned</option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.full_name || agent.email}>
                            {agent.full_name || agent.email}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={ticket.assigned_to || ''}
                        disabled={!canEdit}
                        placeholder="Unassigned"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Requester Email</label>
                    <input
                      value={ticket.requester_email || ''}
                      disabled
                      placeholder="No email"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                {ticket.description && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="space-y-4">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Comments ({comments.length})
                </h2>
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No comments yet.</div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold shrink-0">
                          {(comment.author_name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-xl rounded-tl-none px-4 py-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {comment.author_name || 'Anonymous'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {comment.is_internal && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded">
                                <Shield className="w-2.5 h-2.5" /> Internal
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {canComment && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-semibold shrink-0">
                        {(currentUser?.full_name || 'Y').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 space-y-2">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={handleAddComment}
                            disabled={commentLoading || !newComment.trim()}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Send className="w-3.5 h-3.5" />
                            {commentLoading ? 'Sending...' : 'Send'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No history recorded yet.</div>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mt-0.5">
                      <History className="w-3 h-3" />
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg px-4 py-3">
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{h.field_name}</span> changed from{' '}
                        <span className="bg-gray-100 px-1 rounded text-xs">{h.old_value || 'empty'}</span> to{' '}
                        <span className="bg-gray-100 px-1 rounded text-xs">{h.new_value || 'empty'}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(h.created_at).toLocaleDateString()} {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
