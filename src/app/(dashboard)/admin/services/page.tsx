import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/cn";
import ServiceManager from "./ServiceManager";
import ToggleService from "./ToggleService";

export const metadata = { title: "Service Management" };

export default async function AdminServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminSupabase = await createAdminClient();

  const [{ data: services }, { data: platforms }] = await Promise.all([
    adminSupabase
      .from("services")
      .select("*, platform:platforms(name, slug)")
      .order("platform_id")
      .order("name"),
    adminSupabase.from("platforms").select("id, name, slug").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Service Management</h1>
          <p className="page-subtitle">{services?.length ?? 0} services configured</p>
        </div>
        <ServiceManager platforms={platforms ?? []} services={services ?? []} />
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th className="table-th">Service</th>
              <th className="table-th">Platform</th>
              <th className="table-th">Category</th>
              <th className="table-th">Price/Unit</th>
              <th className="table-th">Min–Max Qty</th>
              <th className="table-th">Status</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {!services?.length ? (
              <tr><td colSpan={7} className="table-td text-center text-gray-500 py-10">No services found.</td></tr>
            ) : (
              services.map(s => (
                <tr key={s.id} className="table-tr">
                  <td className="table-td">
                    <p className="font-medium text-sm">{s.name}</p>
                    {s.description && <p className="text-xs text-gray-500 truncate max-w-xs">{s.description}</p>}
                  </td>
                  <td className="table-td">
                    {/* @ts-ignore */}
                    <span className="badge bg-brand-100 text-brand-800">{s.platform?.name}</span>
                  </td>
                  <td className="table-td text-sm text-gray-600">{s.category}</td>
                  <td className="table-td font-medium">{formatCurrency(s.base_price)}</td>
                  <td className="table-td text-sm text-gray-600">
                    {s.min_quantity.toLocaleString()} – {s.max_quantity.toLocaleString()} {s.unit}
                  </td>
                  <td className="table-td">
                    <span className={`badge ${s.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="table-td">
                    <ToggleService serviceId={s.id} isActive={s.is_active} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
