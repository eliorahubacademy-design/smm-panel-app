import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/utils/cn";

export const metadata = { title: "Supplier Management" };

export default async function AdminSuppliersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: suppliers } = await supabase
    .from("suppliers")
    .select("*, supplier_services(count)")
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Supplier Management</h1>
        <p className="page-subtitle">Manage service providers and API integrations</p>
      </div>

      <div className="card bg-blue-50 border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-1">Developer Note</h3>
        <p className="text-sm text-blue-700">
          Suppliers are integrated via the <code className="bg-blue-100 px-1 rounded">SupplierAdapter</code> interface in{" "}
          <code className="bg-blue-100 px-1 rounded">src/lib/suppliers/</code>.
          Currently using the <strong>MockSupplierAdapter</strong> for development.
          To add a real supplier, implement the interface and register it in the factory function.
        </p>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="table-th">Supplier</th>
              <th className="table-th">Base URL</th>
              <th className="table-th">Services</th>
              <th className="table-th">Status</th>
              <th className="table-th">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!suppliers?.length ? (
              <tr><td colSpan={5} className="table-td text-center text-gray-500 py-10">
                No suppliers configured. Add supplier records to the database.
              </td></tr>
            ) : (
              suppliers.map(s => (
                <tr key={s.id} className="table-tr">
                  <td className="table-td">
                    <p className="font-medium text-sm">{s.name}</p>
                  </td>
                  <td className="table-td">
                    <span className="font-mono text-xs text-gray-500">{s.base_url ?? "—"}</span>
                  </td>
                  <td className="table-td text-sm">
                    {/* @ts-ignore */}
                    {s.supplier_services?.[0]?.count ?? 0} services
                  </td>
                  <td className="table-td">
                    <span className={`badge ${s.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="table-td text-xs text-gray-500">{formatDate(s.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold mb-3">Integration Guide</h2>
        <div className="text-sm text-gray-600 space-y-2">
          <p>To integrate a real supplier API:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Create a class implementing <code className="bg-gray-100 px-1 rounded text-xs">SupplierAdapter</code> in <code className="bg-gray-100 px-1 rounded text-xs">src/lib/suppliers/</code></li>
            <li>Implement <code className="bg-gray-100 px-1 rounded text-xs">placeOrder()</code>, <code className="bg-gray-100 px-1 rounded text-xs">getOrderStatus()</code>, and <code className="bg-gray-100 px-1 rounded text-xs">getBalance()</code></li>
            <li>Add the supplier record to the <code className="bg-gray-100 px-1 rounded text-xs">suppliers</code> table</li>
            <li>Register the adapter in <code className="bg-gray-100 px-1 rounded text-xs">getSupplierAdapter()</code> factory</li>
            <li>Store API keys as Vercel environment variables — never in the codebase</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
