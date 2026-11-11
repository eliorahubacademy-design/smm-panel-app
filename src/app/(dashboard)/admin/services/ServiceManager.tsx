"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Platform { id: string; name: string; slug: string; }
interface Service { id: string; name: string; }

export default function ServiceManager({ platforms }: { platforms: Platform[]; services: Service[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", platform_id: platforms[0]?.id ?? "",
    category: "", price_per_unit: "", min_quantity: "100",
    max_quantity: "10000", unit_label: "followers", is_active: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price_per_unit: parseFloat(form.price_per_unit),
          min_quantity: parseInt(form.min_quantity),
          max_quantity: parseInt(form.max_quantity),
        }),
      });
      if (res.ok) { setOpen(false); router.refresh(); }
      else { const { error } = await res.json(); alert(error ?? "Failed"); }
    } finally { setLoading(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">+ Add Service</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Add New Service</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div><label className="label">Service Name</label>
                  <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
                <div><label className="label">Description</label>
                  <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label">Platform</label>
                    <select className="input" value={form.platform_id} onChange={e => setForm(f => ({ ...f, platform_id: e.target.value }))}>
                      {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select></div>
                  <div><label className="label">Category</label>
                    <input className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="label">Price/Unit (PHP)</label>
                    <input type="number" step="0.01" className="input" value={form.price_per_unit} onChange={e => setForm(f => ({ ...f, price_per_unit: e.target.value }))} required /></div>
                  <div><label className="label">Min Qty</label>
                    <input type="number" className="input" value={form.min_quantity} onChange={e => setForm(f => ({ ...f, min_quantity: e.target.value }))} required /></div>
                  <div><label className="label">Max Qty</label>
                    <input type="number" className="input" value={form.max_quantity} onChange={e => setForm(f => ({ ...f, max_quantity: e.target.value }))} required /></div>
                </div>
                <div><label className="label">Unit Label</label>
                  <input className="input" value={form.unit_label} onChange={e => setForm(f => ({ ...f, unit_label: e.target.value }))} placeholder="followers, likes, views…" /></div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 text-brand-600 rounded" />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active (visible to users)</label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? "Saving…" : "Add Service"}</button>
                  <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
