import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StatCard from "@/components/dashboard/StatCard";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils/cn";
import {
  Users, ShoppingCart, DollarSign, CreditCard, AlertCircle,
  MessageSquare, TrendingUp, Clock
} from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().split("T")[0];

  const [
    { count: totalUsers },
    { count: totalResellers },
    { count: totalOrders },
    { count: ordersToday },
    { count: pendingPayments },
    { count: openTickets },
    { data: orders },
    { data: recentPayments },
    { data: revenueData },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).neq("role", "admin"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "reseller"),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }).gte("created_at", today),
    supabase.from("payment_records").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("orders").select("*, user:profiles(full_name, email), service:services(name), platform:platforms(name)")
      .order("created_at", { ascending: false }).limit(8),
    supabase.from("payment_records").select("*, user:profiles(full_name, email)")
      .eq("status", "pending").order("created_at", { ascending: false }).limit(5),
    supabase.from("orders").select("total_price").eq("status", "completed"),
  ]);

  const totalRevenue = revenueData?.reduce((sum, o) => sum + (o.total_price ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Platform overview and management center</p>
      </div>

      {/* Stats Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={totalUsers ?? 0} icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" />
        <StatCard title="Total Resellers" value={totalResellers ?? 0} icon={TrendingUp} iconColor="text-purple-600" iconBg="bg-purple-50" />
        <StatCard title="Total Orders" value={totalOrders ?? 0} icon={ShoppingCart} iconColor="text-brand-600" iconBg="bg-brand-50" />
        <StatCard title="Orders Today" value={ordersToday ?? 0} icon={Clock} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
      </div>

      {/* Stats Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} iconColor="text-green-600" iconBg="bg-green-50" />
        <StatCard title="Pending Payments" value={pendingPayments ?? 0} icon={CreditCard} iconColor="text-yellow-600" iconBg="bg-yellow-50" />
        <StatCard title="Open Tickets" value={openTickets ?? 0} icon={MessageSquare} iconColor="text-orange-600" iconBg="bg-orange-50" />
        <div className="card flex flex-col justify-between">
          <p className="text-sm font-medium text-gray-500">Quick Actions</p>
          <div className="flex flex-col gap-2 mt-2">
            <Link href="/admin/payments" className="btn-primary text-xs py-1.5">Verify Payments</Link>
            <Link href="/admin/orders" className="btn-secondary text-xs py-1.5">Manage Orders</Link>
          </div>
        </div>
      </div>

      {pendingPayments! > 0 && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            There are <strong>{pendingPayments}</strong> pending payment(s) awaiting verification.{" "}
            <Link href="/admin/payments" className="font-semibold underline">Verify now →</Link>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Recent Orders</h2>
            <Link href="/admin/orders" className="text-sm text-brand-600 hover:text-brand-700 font-medium">View all →</Link>
          </div>
          <div className="space-y-3">
            {orders?.map(order => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="min-w-0">
                  {/* @ts-ignore */}
                  <p className="text-sm font-medium truncate">{order.service?.name}</p>
                  {/* @ts-ignore */}
                  <p className="text-xs text-gray-500">{order.user?.full_name ?? order.user?.email} · {formatDate(order.created_at)}</p>
                </div>
                <div className="ml-3 text-right flex-shrink-0">
                  <span className={`badge text-xs ${getStatusColor(order.status)}`}>{order.status}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(order.total_price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Payments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Pending Payments</h2>
            <Link href="/admin/payments" className="text-sm text-brand-600 hover:text-brand-700 font-medium">View all →</Link>
          </div>
          {!recentPayments?.length ? (
            <p className="text-sm text-gray-500 text-center py-6">No pending payments.</p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="min-w-0">
                    {/* @ts-ignore */}
                    <p className="text-sm font-medium truncate">{p.user?.full_name ?? p.user?.email}</p>
                    <p className="text-xs text-gray-500 font-mono">{p.reference_number}</p>
                  </div>
                  <div className="ml-3 text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-green-600">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-gray-500 capitalize">{p.payment_method.replace("_", " ")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
