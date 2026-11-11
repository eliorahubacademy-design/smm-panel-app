import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils/cn";

export const metadata = { title: "My Orders" };

export default async function CustomerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pageNum = Number(page ?? 1);
  const pageSize = 20;
  const offset = (pageNum - 1) * pageSize;

  let query = supabase
    .from("orders")
    .select("*, service:services(name), platform:platforms(name, slug)", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: orders, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / pageSize);

  const statuses = ["all", "pending", "processing", "completed", "cancelled", "failed", "refunded"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">My Orders</h1>
        <p className="page-subtitle">Track all your service orders</p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statuses.map(s => (
          <a
            key={s}
            href={`/customer/orders?status=${s}`}
            className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              (status ?? "all") === s
                ? "bg-brand-600 text-white"
                : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      {/* Orders table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="table-th">Order</th>
              <th className="table-th">Service</th>
              <th className="table-th">URL</th>
              <th className="table-th">Qty</th>
              <th className="table-th">Total</th>
              <th className="table-th">Status</th>
              <th className="table-th">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!orders?.length ? (
              <tr>
                <td colSpan={7} className="table-td text-center text-gray-500 py-10">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order.id} className="table-tr">
                  <td className="table-td font-mono text-xs font-medium text-brand-600">
                    {order.order_number}
                  </td>
                  <td className="table-td">
                    <div>
                      {/* @ts-ignore */}
                      <p className="font-medium text-sm">{order.service?.name}</p>
                      {/* @ts-ignore */}
                      <p className="text-xs text-gray-500">{order.platform?.name}</p>
                    </div>
                  </td>
                  <td className="table-td max-w-xs">
                    <span className="text-xs text-gray-600 truncate block max-w-[200px]" title={order.target_url}>
                      {order.target_url}
                    </span>
                  </td>
                  <td className="table-td">{order.quantity.toLocaleString()}</td>
                  <td className="table-td font-medium">{formatCurrency(order.total_price)}</td>
                  <td className="table-td">
                    <span className={`badge ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="table-td text-gray-500 text-xs">{formatDate(order.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {offset + 1}–{Math.min(offset + pageSize, count ?? 0)} of {count} orders
          </p>
          <div className="flex gap-2">
            {pageNum > 1 && (
              <a
                href={`/customer/orders?status=${status ?? "all"}&page=${pageNum - 1}`}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                ← Prev
              </a>
            )}
            {pageNum < totalPages && (
              <a
                href={`/customer/orders?status=${status ?? "all"}&page=${pageNum + 1}`}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                Next →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
