import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils/cn";
import PaymentActions from "./PaymentActions";

export const metadata = { title: "Payment Verification" };

export default async function AdminPaymentsPage({
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
    .from("payment_records")
    .select("*, user:profiles(full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status && status !== "all") query = query.eq("status", status);

  const { data: payments, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / pageSize);

  const statusFilter = status ?? "pending";
  const tabs = ["pending", "verified", "rejected", "all"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Payment Verification</h1>
        <p className="page-subtitle">Review and approve deposit requests</p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(tab => (
          <a
            key={tab}
            href={`/admin/payments?status=${tab}`}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${
              statusFilter === tab
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
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
              <th className="table-th">User</th>
              <th className="table-th">Amount</th>
              <th className="table-th">Method</th>
              <th className="table-th">Reference</th>
              <th className="table-th">Status</th>
              <th className="table-th">Date</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!payments?.length ? (
              <tr><td colSpan={7} className="table-td text-center text-gray-500 py-10">No payments found.</td></tr>
            ) : (
              payments.map(p => (
                <tr key={p.id} className="table-tr">
                  <td className="table-td">
                    {/* @ts-ignore */}
                    <p className="text-sm font-medium">{p.user?.full_name ?? "—"}</p>
                    {/* @ts-ignore */}
                    <p className="text-xs text-gray-500">{p.user?.email}</p>
                  </td>
                  <td className="table-td font-semibold text-green-700">{formatCurrency(p.amount)}</td>
                  <td className="table-td capitalize">{p.payment_method?.replace("_", " ")}</td>
                  <td className="table-td">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{p.reference_number}</span>
                  </td>
                  <td className="table-td">
                    <span className={`badge ${
                      p.status === "verified" ? "bg-green-100 text-green-800" :
                      p.status === "rejected" ? "bg-red-100 text-red-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="table-td text-xs text-gray-500">{formatDate(p.created_at)}</td>
                  <td className="table-td">
                    {p.status === "pending" && <PaymentActions paymentId={p.id} />}
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
            {pageNum > 1 && <a href={`/admin/payments?status=${statusFilter}&page=${pageNum - 1}`} className="btn-secondary text-xs">← Prev</a>}
            {pageNum < totalPages && <a href={`/admin/payments?status=${statusFilter}&page=${pageNum + 1}`} className="btn-secondary text-xs">Next →</a>}
          </div>
        </div>
      )}
    </div>
  );
}
