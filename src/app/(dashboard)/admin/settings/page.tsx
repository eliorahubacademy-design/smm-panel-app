import { createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Settings | Admin" };

async function getStats(adminClient: ReturnType<typeof createAdminClient>) {
  const [users, services, orders] = await Promise.all([
    adminClient.from("profiles").select("id", { count: "exact", head: true }),
    adminClient.from("services").select("id", { count: "exact", head: true }),
    adminClient.from("orders").select("id", { count: "exact", head: true }),
  ]);
  return {
    users: users.count ?? 0,
    services: services.count ?? 0,
    orders: orders.count ?? 0,
  };
}

export default async function AdminSettingsPage() {
  const adminClient = createAdminClient();
  const {
    data: { user },
  } = await adminClient.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/customer/dashboard");

  const stats = await getStats(adminClient);

  const paymentMethods = [
    { name: "GCash", type: "E-Wallet", status: "Active" },
    { name: "Maya", type: "E-Wallet", status: "Active" },
    { name: "BDO", type: "Bank Transfer", status: "Active" },
    { name: "BPI", type: "Bank Transfer", status: "Active" },
    { name: "UnionBank", type: "Bank Transfer", status: "Active" },
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your admin account and platform configuration.
        </p>
      </div>

      {/* Admin Account */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Admin Account
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Name</span>
            <span className="text-sm font-medium text-gray-900">
              {profile?.full_name ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">
              {profile?.email ?? user.email ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Role</span>
            <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
              {profile?.role ?? "admin"}
            </span>
          </div>
        </div>
      </section>

      {/* Platform Overview */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Platform Overview
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.users}</p>
            <p className="text-sm text-gray-500 mt-1">Total Users</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">
              {stats.services}
            </p>
            <p className="text-sm text-gray-500 mt-1">Services</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.orders}</p>
            <p className="text-sm text-gray-500 mt-1">Total Orders</p>
          </div>
        </div>
      </section>

      {/* Payment Methods */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Accepted Payment Methods
        </h2>
        <div className="space-y-2">
          {paymentMethods.map((pm) => (
            <div
              key={pm.name}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{pm.name}</p>
                <p className="text-xs text-gray-500">{pm.type}</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                {pm.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* System Info */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          System Information
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Framework</span>
            <span className="text-sm font-medium text-gray-900">Next.js 15</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Database</span>
            <span className="text-sm font-medium text-gray-900">Supabase (PostgreSQL)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Hosting</span>
            <span className="text-sm font-medium text-gray-900">Vercel</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">Version</span>
            <span className="text-sm font-medium text-gray-900">1.0.0</span>
          </div>
        </div>
      </section>
    </div>
  );
}
