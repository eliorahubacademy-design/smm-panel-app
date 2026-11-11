import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils/cn";
import Link from "next/link";

export const metadata = { title: "My Orders – Reseller" };

export default async function ResellerOrdersPage({
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
    .select("*, service:services(name, platform:platforms(name))", { count: "exact" })
    .eq("user_id", user.id)
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
        <h1 className="page-title">My Orders</h1>
        <p className="page-subtitle">{count ?? 0} total orders</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {["all", "pending", "processing", "completed", "partial", "cancelled", "refunded"].map(tab => (
          <a key={tab} href={`/reseller/orders?status=${tab}`}
            className={`px-4 py-2 text-sm font-medium capitalize whitespace-nowrap border-b-2 -mb-px ${
              currentStatus === tab ? "border-brand-500 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >{tab}</a>
        ))}
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="table-th">Order ID</th>
              <th className="table-th">Service</th>
              <th className="table-th">Target URL</th>
              <th className="table-th">Qty</th>
              <th className="table-th">Total</th>
              <th className="table-th">Status</th>
              <th className="table-th">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!orders?.length ? (
              <tr><td colSpan={7} className="table-td text-center text-gray-500 py-10">
                No orders yet. <Link href="/reseller/services" className="text-brand-600 hover:underline">Browse services</Link>
              </td></tr>
            ) : (
              orders.map(o => (
                <tr key={o.id} className="table-tr">
                  <td className="table-td font-mono text-xs text-gray-500">{o.id.slice(0, 8)}…</td>
                  <td className="table-td">
                    {/* @ts-ignore */}
                    <p className="text-sm font-medium">{o.service?.name}</p>
                    {/* @ts-ignore */}
                    <p className="text-xs text-gray-500">{o.service?.platform?.name}</p>
                  </td>
                  <td className="table-td">
                    <a href={o.target_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline truncate max-w-[180px] block">
                      {o.target_url}
                    </a>
                  </td>
                  <td className="table-td">{o.quantity.toLocaleString()}</td>
                  <td className="table-td font-medium">{formatCurrency(o.total_cost)}</td>
                  <td className="table-td">
                    <span className={`badge ${statusColor[o.status] ?? "bg-gray-100 text-gray-700"}`}>{o.status}</span>
                  </td>
                  <td className="table-td text-xs text-gray-500">{formatDate(o.created_at)}</td>
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
            {pageNum > 1 && <a href={`/reseller/orders?status=${currentStatus}&page=${pageNum - 1}`} className="btn-secondary text-xs">← Prev</a>}
            {pageNum < totalPages && <a href={`/reseller/orders?status=${currentStatus}&page=${pageNum + 1}`} className="btn-secondary text-xs">Next →</a>}
          </div>
        </div>
      )}
    </div>
  );
}
