import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils/cn";

export const metadata = { title: "Revenue Reports" };

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();

  const [
    { data: totalRevenue },
    { data: monthRevenue },
    { data: weekRevenue },
    { data: topServices },
    { data: dailyRevenue },
    { data: paymentMethods },
  ] = await Promise.all([
    supabase.from("orders").select("total_cost").in("status", ["completed", "processing"]),
    supabase.from("orders").select("total_cost").in("status", ["completed", "processing"]).gte("created_at", startOfMonth),
    supabase.from("orders").select("total_cost").in("status", ["completed", "processing"]).gte("created_at", startOfWeek),
    supabase.from("orders")
      .select("service_id, total_cost, service:services(name, platform:platforms(name))")
      .in("status", ["completed", "processing"])
      .limit(100),
    supabase.from("orders")
      .select("created_at, total_cost")
      .in("status", ["completed", "processing"])
      .gte("created_at", startOfMonth)
      .order("created_at"),
    supabase.from("payment_records")
      .select("payment_method, amount")
      .eq("status", "verified"),
  ]);

  const sumCosts = (rows: { total_cost: number }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + (r.total_cost ?? 0), 0);

  // Aggregate top services
  const serviceMap = new Map<string, { name: string; platform: string; revenue: number; count: number }>();
  for (const o of topServices ?? []) {
    const key = o.service_id;
    const existing = serviceMap.get(key) ?? {
      // @ts-ignore
      name: o.service?.name ?? "Unknown",
      // @ts-ignore
      platform: o.service?.platform?.name ?? "",
      revenue: 0, count: 0
    };
    existing.revenue += o.total_cost ?? 0;
    existing.count += 1;
    serviceMap.set(key, existing);
  }
  const topServicesList = Array.from(serviceMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Aggregate payment methods
  const methodMap = new Map<string, number>();
  for (const p of paymentMethods ?? []) {
    methodMap.set(p.payment_method, (methodMap.get(p.payment_method) ?? 0) + (p.amount ?? 0));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Revenue Reports</h1>
        <p className="page-subtitle">Financial overview and analytics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Revenue", value: sumCosts(totalRevenue as any[]), color: "text-green-700" },
          { label: "This Month", value: sumCosts(monthRevenue as any[]), color: "text-blue-700" },
          { label: "This Week", value: sumCosts(weekRevenue as any[]), color: "text-purple-700" },
        ].map(card => (
          <div key={card.label} className="card">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-2xl font-bold mt-1 ${card.color}`}>{formatCurrency(card.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <div className="card">
          <h2 className="text-base font-semibold mb-4">Top Services by Revenue</h2>
          <div className="space-y-3">
            {topServicesList.length === 0 && <p className="text-sm text-gray-500">No data yet.</p>}
            {topServicesList.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.platform} · {s.count} orders</p>
                </div>
                <span className="text-sm font-semibold text-green-700 flex-shrink-0">{formatCurrency(s.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="card">
          <h2 className="text-base font-semibold mb-4">Deposits by Payment Method</h2>
          <div className="space-y-3">
            {methodMap.size === 0 && <p className="text-sm text-gray-500">No verified deposits yet.</p>}
            {Array.from(methodMap.entries()).map(([method, amount]) => (
              <div key={method} className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium capitalize">{method.replace("_", " ")}</span>
                <span className="text-sm font-semibold text-blue-700">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
