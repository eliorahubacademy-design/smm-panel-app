import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils/cn";

export const metadata = { title: "Sales Reports – Reseller" };

export default async function ResellerReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  const [
    { data: allOrders },
    { data: monthOrders },
    { data: lastMonthOrders },
    { count: totalCount },
  ] = await Promise.all([
    supabase.from("orders").select("total_cost, status, service:services(name, platform:platforms(name))").eq("user_id", user.id).in("status", ["completed", "processing"]),
    supabase.from("orders").select("total_cost, status").eq("user_id", user.id).in("status", ["completed", "processing"]).gte("created_at", startOfMonth),
    supabase.from("orders").select("total_cost, status").eq("user_id", user.id).in("status", ["completed", "processing"]).gte("created_at", startOfLastMonth).lte("created_at", endOfLastMonth),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const sum = (rows: { total_cost: number }[] | null) => (rows ?? []).reduce((a, r) => a + r.total_cost, 0);

  const thisMonthTotal = sum(monthOrders as any[]);
  const lastMonthTotal = sum(lastMonthOrders as any[]);
  const allTimeTotal = sum(allOrders as any[]);
  const growth = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(0) : null;

  // Top services
  const serviceMap = new Map<string, { name: string; platform: string; total: number; count: number }>();
  for (const o of allOrders ?? []) {
    // @ts-ignore
    const key = o.service?.name ?? "Unknown";
    const existing = serviceMap.get(key) ?? {
      name: key,
      // @ts-ignore
      platform: o.service?.platform?.name ?? "",
      total: 0, count: 0
    };
    existing.total += o.total_cost;
    existing.count += 1;
    serviceMap.set(key, existing);
  }
  const topServices = Array.from(serviceMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Sales Reports</h1>
        <p className="page-subtitle">Your reseller performance</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "All-Time Spend", value: allTimeTotal, color: "text-gray-900" },
          { label: "This Month", value: thisMonthTotal, color: "text-blue-700" },
          { label: "Last Month", value: lastMonthTotal, color: "text-gray-600" },
          { label: "Total Orders", value: null, count: totalCount ?? 0, color: "text-purple-700" },
        ].map(card => (
          <div key={card.label} className="card">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>
              {card.value !== null ? formatCurrency(card.value) : card.count?.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {growth !== null && (
        <div className={`card border-l-4 ${Number(growth) >= 0 ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}>
          <p className="text-sm font-medium">
            {Number(growth) >= 0 ? "📈" : "📉"} Month-over-month: <span className={`font-bold ${Number(growth) >= 0 ? "text-green-700" : "text-red-700"}`}>{Number(growth) >= 0 ? "+" : ""}{growth}%</span>
          </p>
        </div>
      )}

      <div className="card">
        <h2 className="text-base font-semibold mb-4">Top Services by Spend</h2>
        {topServices.length === 0 ? (
          <p className="text-sm text-gray-500">No orders yet.</p>
        ) : (
          <div className="space-y-3">
            {topServices.map(s => (
              <div key={s.name} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.platform} · {s.count} orders</p>
                </div>
                <span className="text-sm font-semibold text-blue-700">{formatCurrency(s.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
