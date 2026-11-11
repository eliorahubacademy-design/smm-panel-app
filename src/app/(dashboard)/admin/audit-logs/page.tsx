import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils/cn";
import Link from "next/link";

export const metadata = { title: "Audit Logs" };

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const { action, page } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pageNum = Number(page ?? 1);
  const pageSize = 50;
  const offset = (pageNum - 1) * pageSize;

  let query = supabase
    .from("audit_logs")
    .select("*, admin:profiles!audit_logs_admin_id_fkey(full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (action) query = query.ilike("action", `%${action}%`);

  const { data: logs, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / pageSize);

  const actionColor: Record<string, string> = {
    verify_payment: "bg-green-100 text-green-800",
    reject_payment: "bg-red-100 text-red-800",
    update_order_status: "bg-blue-100 text-blue-800",
    activate_user: "bg-green-100 text-green-800",
    deactivate_user: "bg-red-100 text-red-800",
    create_service: "bg-purple-100 text-purple-800",
    update_service: "bg-yellow-100 text-yellow-800",
    deactivate_service: "bg-orange-100 text-orange-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">{count ?? 0} log entries</p>
        </div>
        <form className="flex gap-2">
          <input name="action" defaultValue={action} placeholder="Filter by action…" className="input max-w-xs text-sm" />
          <button type="submit" className="btn-secondary text-sm">Filter</button>
          {action && <Link href="/admin/audit-logs" className="btn-secondary text-sm">Clear</Link>}
        </form>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="table-th">Timestamp</th>
              <th className="table-th">Admin</th>
              <th className="table-th">Action</th>
              <th className="table-th">Target</th>
              <th className="table-th">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!logs?.length ? (
              <tr><td colSpan={5} className="table-td text-center text-gray-500 py-10">No logs found.</td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className="table-tr">
                  <td className="table-td text-xs text-gray-500 whitespace-nowrap">{formatDate(log.created_at)}</td>
                  <td className="table-td">
                    {/* @ts-ignore */}
                    <p className="text-sm">{log.admin?.full_name ?? "—"}</p>
                    {/* @ts-ignore */}
                    <p className="text-xs text-gray-500">{log.admin?.email}</p>
                  </td>
                  <td className="table-td">
                    <span className={`badge text-xs ${actionColor[log.action] ?? "bg-gray-100 text-gray-700"}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="table-td text-xs">
                    <p className="text-gray-500">{log.target_type}</p>
                    <p className="font-mono text-gray-400">{log.target_id?.slice(0, 8)}…</p>
                  </td>
                  <td className="table-td text-xs text-gray-500 max-w-xs truncate">
                    {JSON.stringify(log.details)}
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
            {pageNum > 1 && <Link href={`/admin/audit-logs?page=${pageNum - 1}`} className="btn-secondary text-xs">← Prev</Link>}
            {pageNum < totalPages && <Link href={`/admin/audit-logs?page=${pageNum + 1}`} className="btn-secondary text-xs">Next →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
