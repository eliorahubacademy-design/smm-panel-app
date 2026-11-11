import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils/cn";
import Link from "next/link";

export const metadata = { title: "User Management" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; search?: string; page?: string }>;
}) {
  const { role, search, page } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pageNum = Number(page ?? 1);
  const pageSize = 25;
  const offset = (pageNum - 1) * pageSize;

  let query = supabase
    .from("profiles")
    .select("*, wallet:wallets(balance)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (role && role !== "all") query = query.eq("role", role);
  if (search) query = query.ilike("email", `%${search}%`);

  const { data: users, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{count ?? 0} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <form className="flex flex-wrap gap-3">
          <input
            name="search"
            type="text"
            defaultValue={search}
            placeholder="Search by email..."
            className="input max-w-xs"
          />
          <select name="role" defaultValue={role ?? "all"} className="input w-auto">
            <option value="all">All Roles</option>
            <option value="customer">Customers</option>
            <option value="reseller">Resellers</option>
            <option value="admin">Admins</option>
          </select>
          <button type="submit" className="btn-primary">Filter</button>
          <Link href="/admin/users" className="btn-secondary">Reset</Link>
        </form>
      </div>

      {/* Users Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="table-th">User</th>
              <th className="table-th">Role</th>
              <th className="table-th">Balance</th>
              <th className="table-th">Status</th>
              <th className="table-th">Joined</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!users?.length ? (
              <tr><td colSpan={6} className="table-td text-center text-gray-500 py-10">No users found.</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} className="table-tr">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-semibold flex-shrink-0">
                        {(u.full_name ?? u.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{u.full_name ?? "—"}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td">
                    <span className={`badge ${
                      u.role === "admin" ? "bg-purple-100 text-purple-800" :
                      u.role === "reseller" ? "bg-blue-100 text-blue-800" :
                      "bg-green-100 text-green-800"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="table-td font-medium">
                    {/* @ts-ignore */}
                    {formatCurrency(u.wallet?.balance ?? 0)}
                  </td>
                  <td className="table-td">
                    <span className={`badge ${u.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="table-td text-gray-500 text-xs">{formatDate(u.created_at)}</td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      <UserActions userId={u.id} isActive={u.is_active} role={u.role} />
                    </div>
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
            {pageNum > 1 && <Link href={`/admin/users?page=${pageNum - 1}&role=${role ?? "all"}`} className="btn-secondary text-xs px-3 py-1.5">← Prev</Link>}
            {pageNum < totalPages && <Link href={`/admin/users?page=${pageNum + 1}&role=${role ?? "all"}`} className="btn-secondary text-xs px-3 py-1.5">Next →</Link>}
          </div>
        </div>
      )}
    </div>
  );
}

function UserActions({ userId, isActive, role }: { userId: string; isActive: boolean; role: string }) {
  return (
    <form action={`/api/admin/users/${userId}`} method="POST" className="flex gap-2">
      <button
        type="submit"
        name="action"
        value={isActive ? "deactivate" : "activate"}
        className={`text-xs px-2 py-1 rounded font-medium ${isActive ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}
      >
        {isActive ? "Deactivate" : "Activate"}
      </button>
    </form>
  );
}
