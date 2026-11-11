// @ts-nocheck
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils/cn";
import StatCard from "@/components/dashboard/StatCard";
import { ShoppingCart, DollarSign, TrendingUp, Package } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Reseller Dashboard" };

export default async function ResellerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { data: wallet },
    { count: totalOrders },
    { count: monthOrders },
    { data: monthRevenue },
    { data: recentOrders },
    { count: customPrices },
  ] = await Promise.all([
    supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", startOfMonth),
    supabase.from("orders").select("total_cost").eq("user_id", user.id).in("status", ["completed", "processing"]).gte("created_at", startOfMonth),
    supabase.from("orders")
      .select("*, service:services(name, platform:platforms(name))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("reseller_prices").select("*", { count: "exact", head: true }).eq("reseller_id", user.id),
  ]);

  const monthRevenueTotal = (monthRevenue ?? []).reduce((acc, o) => acc + o.total_cost, 0);

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-700",
    refunded: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Reseller Dashboard</h1>
        <p className="page-subtitle">Manage your reseller business</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Wallet Balance" value={formatCurrency(wallet?.balance ?? 0)} icon={DollarSign} iconColor="text-green-600" iconBg="bg-green-100" />
        <StatCard title="Total Orders" value={(totalOrders ?? 0).toLocaleString()} icon={ShoppingCart} iconColor="text-blue-600" iconBg="bg-blue-100" />
        <StatCard title="This Month Revenue" value={formatCurrency(monthRevenueTotal)} icon={TrendingUp} iconColor="text-purple-600" iconBg="bg-purple-100" change={{ value: monthOrders ?? 0, label: "orders this month" }} />
        <StatCard title="Custom Prices" value={(customPrices ?? 0).toLocaleString()} icon={Package} iconColor="text-orange-600" iconBg="bg-orange-100" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { href: "/reseller/services", label: "Browse Services", desc: "Find services to offer" },
          { href: "/reseller/pricing", label: "My Pricing", desc: "Set custom prices" },
          { href: "/reseller/orders", label: "My Orders", desc: "Track all orders" },
        ].map(action => (
          <Link key={action.href} href={action.href} className="card hover:shadow-md transition-shadow cursor-pointer block">
            <p className="font-semibold text-gray-900">{action.label}</p>
            <p className="text-sm text-gray-500 mt-1">{action.desc}</p>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Recent Orders</h2>
          <Link href="/reseller/orders" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>
        {!recentOrders?.length ? (
          <p className="text-sm text-gray-500">No orders yet. <Link href="/reseller/services" className="text-brand-600 hover:underline">Browse services →</Link></p>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentOrders.map(o => (
              <div key={o.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  {/* @ts-ignore */}
                  <p className="text-sm font-medium truncate">{o.service?.name}</p>
                  {/* @ts-ignore */}
                  <p className="text-xs text-gray-500">{o.service?.platform?.name} · {o.quantity.toLocaleString()} units · {formatDate(o.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold">{formatCurrency(o.total_cost)}</span>
                  <span className={`badge ${statusColor[o.status] ?? "bg-gray-100 text-gray-700"}`}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
