"use client";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";

interface Platform { id: string; name: string; slug: string; }
interface Service {
  id: string; name: string; description?: string; category: string;
  price_per_unit: number; min_quantity: number; max_quantity: number; unit_label: string;
  platform: { id: string; name: string; slug: string; };
}

interface Props {
  platforms: Platform[];
  services: Service[];
  balance: number;
  myPrices: Record<string, number>;
}

export default function ResellerServicesClient({ platforms, services, balance, myPrices }: Props) {
  const router = useRouter();
  const [platformFilter, setPlatformFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [orderModal, setOrderModal] = useState<Service | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [targetUrl, setTargetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filtered = services.filter(s => {
    if (platformFilter !== "all" && s.platform.id !== platformFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openOrder = (s: Service) => {
    setOrderModal(s);
    setQuantity(s.min_quantity);
    setTargetUrl("");
    setError("");
  };

  const totalCost = orderModal ? orderModal.price_per_unit * quantity : 0;

  async function placeOrder() {
    if (!orderModal) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_id: orderModal.id, quantity, target_url: targetUrl }),
      });
      const data = await res.json();
      if (res.ok) { setOrderModal(null); router.push("/reseller/orders"); }
      else setError(data.error ?? "Failed to place order");
    } finally { setLoading(false); }
  }

  return (
    <>
      <div className="card flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setPlatformFilter("all")} className={`px-3 py-1.5 rounded-full text-sm font-medium border ${platformFilter === "all" ? "bg-brand-600 text-white border-brand-600" : "border-gray-200 text-gray-600"}`}>All</button>
          {platforms.map(p => (
            <button key={p.id} onClick={() => setPlatformFilter(p.id)} className={`px-3 py-1.5 rounded-full text-sm font-medium border ${platformFilter === p.id ? "bg-brand-600 text-white border-brand-600" : "border-gray-200 text-gray-600"}`}>{p.name}</button>
          ))}
        </div>
        <input type="text" placeholder="Search services…" value={search} onChange={e => setSearch(e.target.value)} className="input ml-auto max-w-xs text-sm" />
      </div>

      <div className="mb-2 text-sm text-gray-600">Balance: <span className="font-semibold text-green-700">{formatCurrency(balance)}</span></div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => {
          const myPrice = myPrices[s.id];
          return (
            <div key={s.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="badge bg-brand-100 text-brand-800 text-xs">{s.platform.name}</span>
                <span className="text-xs text-gray-500">{s.category}</span>
              </div>
              <h3 className="font-semibold text-sm mb-1">{s.name}</h3>
              {s.description && <p className="text-xs text-gray-500 mb-3">{s.description}</p>}
              <div className="mt-auto space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Wholesale price</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(s.price_per_unit)}/{s.unit_label}</span>
                </div>
                {myPrice && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>My retail price</span>
                    <span className="font-semibold text-green-700">{formatCurrency(myPrice)}/{s.unit_label}</span>
                  </div>
                )}
                <div className="text-xs text-gray-400">Min {s.min_quantity.toLocaleString()} – Max {s.max_quantity.toLocaleString()}</div>
              </div>
              <button onClick={() => openOrder(s)} className="btn-primary w-full mt-3 text-sm">Order Now</button>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="col-span-3 text-center text-gray-500 py-10">No services found.</p>}
      </div>

      {orderModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">{orderModal.name}</h2>
              <div>
                <label className="label">Target URL *</label>
                <input type="url" className="input" placeholder="https://…" value={targetUrl} onChange={e => setTargetUrl(e.target.value)} required />
              </div>
              <div>
                <label className="label">Quantity ({orderModal.min_quantity.toLocaleString()} – {orderModal.max_quantity.toLocaleString()} {orderModal.unit_label})</label>
                <input type="number" className="input" min={orderModal.min_quantity} max={orderModal.max_quantity} value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 flex justify-between">
                <span className="text-sm text-gray-600">Total cost</span>
                <span className="font-bold text-gray-900">{formatCurrency(totalCost)}</span>
              </div>
              {totalCost > balance && <p className="text-sm text-red-600">Insufficient balance. Add funds first.</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button onClick={placeOrder} disabled={loading || totalCost > balance || !targetUrl} className="btn-primary flex-1">
                  {loading ? "Placing…" : "Place Order"}
                </button>
                <button onClick={() => setOrderModal(null)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
