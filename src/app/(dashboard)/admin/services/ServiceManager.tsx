"use client";

import { useState } from "react";

interface Platform {
  id: string;
  name: string;
  slug: string;
}

interface Service {
  id: string;
  name: string;
  platform_id: string;
  category: string;
  base_price: number;
  min_quantity: number;
  max_quantity: number;
  unit: string;
  average_speed?: string;
  estimated_days?: number;
  is_featured: boolean;
  requires_url: boolean;
  is_active: boolean;
  description?: string;
}

interface Props {
  platforms: Platform[];
  services: Service[];
}

export default function ServiceManager({ platforms, services }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    platform_id: "",
    category: "",
    base_price: "",
    min_quantity: "",
    max_quantity: "",
    unit: "followers",
    average_speed: "",
    estimated_days: "",
    is_featured: false,
    requires_url: true,
    is_active: true,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      name: form.name,
      description: form.description || undefined,
      platform_id: form.platform_id,
      category: form.category,
      base_price: parseFloat(form.base_price),
      min_quantity: parseInt(form.min_quantity),
      max_quantity: parseInt(form.max_quantity),
      unit: form.unit,
      average_speed: form.average_speed || undefined,
      estimated_days: form.estimated_days ? parseInt(form.estimated_days) : undefined,
      is_featured: form.is_featured,
      requires_url: form.requires_url,
      is_active: form.is_active,
    };

    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create service");
      } else {
        setOpen(false);
        window.location.reload();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary"
      >
        + Add Service
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Add New Service</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="input w-full"
                    placeholder="e.g. Instagram Followers – Premium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="input w-full"
                    rows={2}
                    placeholder="Optional description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform *</label>
                  <select
                    required
                    value={form.platform_id}
                    onChange={e => setForm(f => ({ ...f, platform_id: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="">Select platform...</option>
                    {platforms.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="input w-full"
                    placeholder="e.g. Followers, Likes, Views"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (₱ per unit) *</label>
                  <input
                    type="number"
                    required
                    min="0.000001"
                    step="0.000001"
                    value={form.base_price}
                    onChange={e => setForm(f => ({ ...f, base_price: e.target.value }))}
                    className="input w-full"
                    placeholder="0.05"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                  <select
                    value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="followers">followers</option>
                    <option value="likes">likes</option>
                    <option value="views">views</option>
                    <option value="comments">comments</option>
                    <option value="shares">shares</option>
                    <option value="subscribers">subscribers</option>
                    <option value="watch hours">watch hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.min_quantity}
                    onChange={e => setForm(f => ({ ...f, min_quantity: e.target.value }))}
                    className="input w-full"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.max_quantity}
                    onChange={e => setForm(f => ({ ...f, max_quantity: e.target.value }))}
                    className="input w-full"
                    placeholder="10000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Average Speed</label>
                  <input
                    type="text"
                    value={form.average_speed}
                    onChange={e => setForm(f => ({ ...f, average_speed: e.target.value }))}
                    className="input w-full"
                    placeholder="e.g. 500-1000/day"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Days</label>
                  <input
                    type="number"
                    min="1"
                    value={form.estimated_days}
                    onChange={e => setForm(f => ({ ...f, estimated_days: e.target.value }))}
                    className="input w-full"
                    placeholder="3"
                  />
                </div>

                <div className="sm:col-span-2 flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Featured service</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.requires_url}
                      onChange={e => setForm(f => ({ ...f, requires_url: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Requires URL</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? "Creating..." : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
