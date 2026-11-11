import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils/cn";
import OrderStatusUpdate from "./OrderStatusUpdate";

export const metadata = { title: "Order Management" };

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pageNum = Number(page ?? 1);
  const pageSize = 25;
  const offset = (pageNum - 1) * pageSize;

  let query = supabase
    .from("orders")
    .select("*, user:profiles(full_name, email), service:services(name, platform:platforms(name))", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status && status !== "all") query = query.eq("status", status);

  const { data: orders, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / pageSize);
  const currentStatus = status ?? "all";

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-700",
    refunded: "bg-purple-100 text-purple-800",
    partial: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Order Management</h1>
        <p className="page-subtitle">{count ?? 0} total orders</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {["all", "pending", "processing", "completed", "partial", "cancelled", "refunded"].map(tab => (
          <a
            key={tab}
            href={`/admin/orders?status=${tab}`}
            className={`px-4 py-2 text-sm font-medium capitalize whitespace-nowrap border-b-2 -mb-px ${
              currentStatus === tab ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </a>
        ))}
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="table-th">Order ID</th>
              <th className="table-th">User</th>
              <th className="table-th">Service</th>
              <th className="table-th">Qty</th>
              <th className="table-th">Total</th>
              <th className="table-th">Status</th>
              <th className="table-th">Date</th>
              <th className="table-th">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!orders?.length ? (
              <tr><td colSpan={8} className="table-td text-center text-gray-500 py-10">No orders found.</td></tr>
            ) : (
              orders.map(o => (
                <tr key={o.id} className="table-tr">
                  <td className="table-td">
                    <span className="font-mono text-xs text-gray-600">{o.id.slice(0, 8)}…</span>
                  </td>
                  <td className="table-td">
                    {/* @ts-ignore */}
                    <p className="text-sm">{o.user?.full_name ?? "—"}</p>
                    {/* @ts-ignore */}
                    <p className="text-xs text-gray-500">{o.user?.email}</p>
                  </td>
                  <td className="table-td">
                    {/* @ts-ignore */}
                    <p className="text-sm">{o.service?.name}</p>
                    {/* @ts-ignore */}
                    <p className="text-xs text-gray-500">{o.service?.platform?.name}</p>
                  </td>
                  <td className="table-td">{o.quantity.toLocaleString()}</td>
                  <td className="table-td font-medium">{formatCurrency(o.total_cost)}</td>
                  <td className="table-td">
                    <span className={`badge ${statusColor[o.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="table-td text-xs text-gray-500">{formatDate(o.created_at)}</td>
                  <td className="table-td">
                    <OrderStatusUpdate orderId={o.id} currentStatus={o.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500">Page {pageNum} of {totalPages}</p>
          <div className="flex gap-2">
            {pageNum > 1 && <a href={`/admin/orders?status=${currentStatus}&page=${pageNum - 1}`} className="btn-secondary text-xs">← Prev</a>}
            {pageNum < totalPages && <a href={`/admin/orders?status=${currentStatus}&page=${pageNum + 1}`} className="btn-secondary text-xs">Next →</a>}
          </div>
        </div>
      )}
    </div>
  );
}
