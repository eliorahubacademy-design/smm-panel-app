import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ResellerServicesClient from "./ResellerServicesClient";

export const metadata = { title: "Browse Services – Reseller" };

export default async function ResellerServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: platforms }, { data: services }, { data: wallet }, { data: myPrices }] = await Promise.all([
    supabase.from("platforms").select("*").eq("is_active", true).order("name"),
    supabase.from("services").select("*, platform:platforms(id, name, slug)").eq("is_active", true).order("name"),
    supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
    supabase.from("reseller_prices").select("service_id, custom_price").eq("reseller_id", user.id),
  ]);

  const priceMap = new Map((myPrices ?? []).map(p => [p.service_id, p.custom_price]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Browse Services</h1>
        <p className="page-subtitle">Order services at wholesale rates</p>
      </div>
      <ResellerServicesClient
        platforms={platforms ?? []}
        services={services ?? []}
        balance={wallet?.balance ?? 0}
        myPrices={Object.fromEntries(priceMap)}
      />
    </div>
  );
}
