import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils/cn";
import ServiceManager from "./ServiceManager";

export const metadata = { title: "Service Management" };

export default async function AdminServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: services }, { data: platforms }] = await Promise.all([
    supabase
      .from("services")
      .select("*, platform:platforms(name, slug)")
      .order("platform_id")
      .order("name"),
    supabase.from("platforms").select("id, name, slug").order("name"),
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
                  <td className="table-td font-medium">{formatCurrency(s.price_per_unit)}</td>
                  <td className="table-td text-sm text-gray-600">
                    {s.min_quantity.toLocaleString()} – {s.max_quantity.toLocaleString()} {s.unit_label}
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

function ToggleService({ serviceId, isActive }: { serviceId: string; isActive: boolean }) {
  return (
    <form action={`/api/admin/services?id=${serviceId}`} method="POST">
      <input type="hidden" name="_method" value="PATCH" />
      <button
        type="submit"
        formAction={`/api/admin/services?id=${serviceId}`}
        className={`text-xs px-2 py-1 rounded font-medium ${
          isActive ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"
        }`}
        onClick={async (e) => {
          e.preventDefault();
          const res = await fetch(`/api/admin/services?id=${serviceId}`, {
            method: isActive ? "DELETE" : "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: !isActive }),
          });
          if (res.ok) window.location.reload();
        }}
      >
        {isActive ? "Deactivate" : "Activate"}
      </button>
    </form>
  );
}
