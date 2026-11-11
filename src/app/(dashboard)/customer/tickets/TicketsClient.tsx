"use client";

import { useState } from "react";
import { formatDate, getStatusColor } from "@/lib/utils/cn";
import type { SupportTicket } from "@/types";
import { Plus, X, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

interface TicketsClientProps {
  tickets: SupportTicket[];
  orders: { id: string; order_number: string; service?: { name: string } | null }[];
}

export default function TicketsClient({ tickets, orders }: TicketsClientProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    message: "",
    priority: "medium" as const,
    order_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create ticket.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setShowCreate(false);
        setSuccess(false);
        setForm({ subject: "", message: "", priority: "medium", order_id: "" });
        router.refresh();
      }, 1500);
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Support Tickets</h1>
          <p className="page-subtitle">Get help with your orders and account</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="h-4 w-4 mr-1.5" />
          New Ticket
        </button>
      </div>

      {!tickets.length ? (
        <div className="card text-center py-16">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No tickets yet</p>
          <p className="text-sm text-gray-400 mt-1">Need help? Open a support ticket.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
            Open a Ticket
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th className="table-th">Ticket #</th>
                <th className="table-th">Subject</th>
                <th className="table-th">Priority</th>
                <th className="table-th">Status</th>
                <th className="table-th">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tickets.map(ticket => (
                <tr key={ticket.id} className="table-tr">
                  <td className="table-td font-mono text-xs text-brand-600">{ticket.ticket_number}</td>
                  <td className="table-td font-medium">{ticket.subject}</td>
                  <td className="table-td">
                    <span className={`badge ${
                      ticket.priority === "urgent" ? "bg-red-100 text-red-800" :
                      ticket.priority === "high" ? "bg-orange-100 text-orange-800" :
                      ticket.priority === "medium" ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="table-td">
                    <span className={`badge ${getStatusColor(ticket.status)}`}>{ticket.status}</span>
                  </td>
                  <td className="table-td text-gray-500 text-xs">{formatDate(ticket.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Open Support Ticket</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {success && <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">✅ Ticket created successfully!</div>}
              {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

              <div>
                <label className="label">Related Order (optional)</label>
                <select
                  value={form.order_id}
                  onChange={e => setForm(prev => ({ ...prev, order_id: e.target.value }))}
                  className="input"
                >
                  <option value="">— No specific order —</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      {/* @ts-ignore */}
                      {o.order_number} — {o.service?.name ?? "Service"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Priority</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(prev => ({ ...prev, priority: e.target.value as typeof form.priority }))}
                  className="input"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="label">Subject <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="input"
                  placeholder="Brief description of your issue"
                  required
                />
              </div>

              <div>
                <label className="label">Message <span className="text-red-500">*</span></label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
                  className="input min-h-[120px] resize-y"
                  placeholder="Describe your issue in detail..."
                  required
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1" disabled={submitting}>Cancel</button>
                <button type="submit" disabled={submitting || success} className="btn-primary flex-1">
                  {submitting ? "Submitting..." : "Open Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
