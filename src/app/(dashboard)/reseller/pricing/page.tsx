import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ResellerPricingClient from "./ResellerPricingClient";

export const metadata = { title: "My Pricing – Reseller" };

export default async function ResellerPricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: services }, { data: myPrices }] = await Promise.all([
    supabase.from("services").select("*, platform:platforms(name)").eq("is_active", true).order("name"),
    supabase.from("reseller_prices").select("*").eq("reseller_id", user.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">My Pricing</h1>
        <p className="page-subtitle">Set custom retail prices for your customers</p>
      </div>
      <ResellerPricingClient services={services ?? []} myPrices={myPrices ?? []} />
    </div>
  );
}
