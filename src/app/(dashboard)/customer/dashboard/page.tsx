import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import StatCard from "@/components/dashboard/StatCard";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils/cn";
import { Wallet, ShoppingCart, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Dashboard" };

export default async function CustomerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: wallet },
    { data: orders },
    { data: recentOrders },
    { data: transactions },
  ] = await Promise.all([
    supabase.from("wallets").select("*").eq("user_id", user.id).single(),
    supabase.from("orders").select("id, status").eq("user_id", user.id),
    supabase
      .from("orders")
      .select("*, service:services(name), platform:platforms(name, slug)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalOrders = orders?.length ?? 0;
  const activeOrders = orders?.filter(o => ["pending", "processing"].includes(o.status)).length ?? 0;
  const completedOrders = orders?.filter(o => o.status === "completed").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here&apos;s your overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Wallet Balance"
          value={formatCurrency(wallet?.balance ?? 0)}
          icon={Wallet}
          iconColor="text-green-600"
          iconBg="bg-green-50"
        />
        <StatCard
          title="Total Orders"
          value={totalOrders}
          icon={ShoppingCart}
          iconColor="text-brand-600"
          iconBg="bg-brand-50"
        />
        <StatCard
          title="Active Orders"
          value={activeOrders}
          icon={Clock}
          iconColor="text-yellow-600"
          iconBg="bg-yellow-50"
        />
        <StatCard
          title="Completed Orders"
          value={completedOrders}
          icon={TrendingUp}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/customer/services" className="btn-primary">
            New Order
          </Link>
          <Link href="/customer/wallet" className="btn-secondary">
            Add Funds
          </Link>
          <Link href="/customer/orders" className="btn-secondary">
            View Orders
          </Link>
          <Link href="/customer/tickets" className="btn-secondary">
            Open Ticket
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
            <Link href="/customer/orders" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              View all →
            </Link>
          </div>
          {!recentOrders?.length ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No orders yet. <Link href="/customer/services" className="text-brand-600 font-medium">Browse services</Link></p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {/* @ts-ignore */}
                      {order.service?.name ?? "Service"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {/* @ts-ignore */}
                      {order.platform?.name} · {formatDate(order.created_at)}
                    </p>
                  </div>
                  <span className={`badge ml-3 ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Transaction History</h2>
            <Link href="/customer/wallet" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
              View all →
            </Link>
          </div>
          {!transactions?.length ? (
            <div className="text-center py-8 text-gray-500">
              <Wallet className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No transactions yet. <Link href="/customer/wallet" className="text-brand-600 font-medium">Add funds</Link></p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{tx.type}</p>
                    <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                  </div>
                  <span className={`text-sm font-semibold ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                    {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
