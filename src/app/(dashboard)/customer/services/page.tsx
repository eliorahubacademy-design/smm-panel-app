import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/utils/cn";

export const metadata = { title: "Browse Services" };

export default async function CustomerServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminSupabase = await createAdminClient();

  const [{ data: platforms }, { data: services }] = await Promise.all([
    adminSupabase.from("platforms").select("id, name, slug").order("name"),
    adminSupabase
      .from("services")
      .select("*, platform:platforms(name, slug)")
      .eq("is_active", true)
      .order("platform_id")
      .order("name"),
  ]);

  const grouped = platforms?.map(p => ({
    ...p,
    services: services?.filter(s => s.platform_id === p.id) ?? [],
  })).filter(p => p.services.length > 0) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Browse Services</h1>
        <p className="page-subtitle">Choose a service to boost your social media presence</p>
      </div>

      {grouped.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No services available yet</p>
          <p className="text-sm mt-1">Check back soon!</p>
        </div>
      ) : (
        grouped.map(platform => (
          <div key={platform.id}>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">{platform.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {platform.services.map(s => (
                <div key={s.id} className="card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium text-sm text-gray-900 leading-snug">{s.name}</p>
                    {s.is_featured && (
                      <span className="badge bg-yellow-100 text-yellow-800 shrink-0">Featured</span>
                    )}
                  </div>

                  {s.description && (
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{s.description}</p>
                  )}

                  <div className="space-y-1 text-xs text-gray-600 mt-2">
                    <div className="flex justify-between">
                      <span>Price per 1k</span>
                      <span className="font-medium text-gray-900">{formatCurrency(s.base_price * 1000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Min. qty</span>
                      <span className="font-medium text-gray-900">{s.min_quantity.toLocaleString()}</span>
                    </div>
                    {s.average_speed && (
                      <div className="flex justify-between">
                        <span>Speed</span>
                        <span className="font-medium text-gray-900">{s.average_speed}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
