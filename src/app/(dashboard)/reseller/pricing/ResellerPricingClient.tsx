"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";

interface Service { id: string; name: string; price_per_unit: number; unit_label: string; platform: { name: string }; }
interface ResellerPrice { service_id: string; custom_price: number; }

export default function ResellerPricingClient({ services, myPrices }: { services: Service[]; myPrices: ResellerPrice[] }) {
  const router = useRouter();
  const priceMap = new Map(myPrices.map(p => [p.service_id, p.custom_price]));
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");

  const filtered = services.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  async function savePrice(serviceId: string) {
    const val = parseFloat(editing[serviceId] ?? "");
    if (isNaN(val) || val <= 0) { alert("Enter a valid price"); return; }
    setLoading(l => ({ ...l, [serviceId]: true }));
    try {
      const res = await fetch("/api/reseller/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_id: serviceId, custom_price: val }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditing(e => { const n = { ...e }; delete n[serviceId]; return n; });
        router.refresh();
      } else { alert(data.error ?? "Failed"); }
    } finally { setLoading(l => ({ ...l, [serviceId]: false })); }
  }

  async function removePrice(serviceId: string) {
    setLoading(l => ({ ...l, [serviceId]: true }));
    try {
      await fetch(`/api/reseller/pricing?service_id=${serviceId}`, { method: "DELETE" });
      router.refresh();
    } finally { setLoading(l => ({ ...l, [serviceId]: false })); }
  }

  return (
    <>
      <div className="card">
        <p className="text-sm text-gray-600 mb-2">Set retail prices to sell services to your customers. Your custom price must be at or above the wholesale base price.</p>
        <input type="text" placeholder="Search services…" value={search} onChange={e => setSearch(e.target.value)} className="input max-w-xs text-sm" />
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="table-th">Service</th>
              <th className="table-th">Platform</th>
              <th className="table-th">Base Price</th>
              <th className="table-th">My Price</th>
              <th className="table-th">Margin</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map(s => {
              const myPrice = priceMap.get(s.id);
              const margin = myPrice ? ((myPrice - s.price_per_unit) / s.price_per_unit * 100).toFixed(0) : null;
              const isEditing = s.id in editing;
              return (
                <tr key={s.id} className="table-tr">
                  <td className="table-td font-medium text-sm">{s.name}</td>
                  <td className="table-td"><span className="badge bg-brand-100 text-brand-800">{s.platform.name}</span></td>
                  <td className="table-td">{formatCurrency(s.price_per_unit)}/{s.unit_label}</td>
                  <td className="table-td">
                    {isEditing ? (
                      <input
                        type="number" step="0.01" min={s.price_per_unit}
                        className="input w-28 text-sm py-1"
                        value={editing[s.id]}
                        onChange={e => setEditing(ed => ({ ...ed, [s.id]: e.target.value }))}
                        autoFocus
                      />
                    ) : myPrice ? (
                      <span className="text-green-700 font-semibold">{formatCurrency(myPrice)}</span>
                    ) : (
                      <span className="text-gray-400 text-sm">Not set</span>
                    )}
                  </td>
                  <td className="table-td text-sm">
                    {margin ? <span className="text-green-600 font-medium">+{margin}%</span> : "—"}
                  </td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <button onClick={() => savePrice(s.id)} disabled={loading[s.id]} className="bg-green-50 text-green-700 hover:bg-green-100 text-xs px-2 py-1 rounded font-medium">
                            {loading[s.id] ? "…" : "Save"}
                          </button>
                          <button onClick={() => setEditing(e => { const n = { ...e }; delete n[s.id]; return n; })} className="btn-secondary text-xs px-2 py-1">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditing(e => ({ ...e, [s.id]: (myPrice ?? s.price_per_unit).toString() }))} className="btn-secondary text-xs px-2 py-1">
                            {myPrice ? "Edit" : "Set Price"}
                          </button>
                          {myPrice && (
                            <button onClick={() => removePrice(s.id)} disabled={loading[s.id]} className="bg-red-50 text-red-700 hover:bg-red-100 text-xs px-2 py-1 rounded font-medium">
                              {loading[s.id] ? "…" : "Remove"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
