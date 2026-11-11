import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ServicesClient from "./ServicesClient";

export const metadata = { title: "Browse Services" };

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: platforms }, { data: services }, { data: wallet }] = await Promise.all([
    supabase.from("platforms").select("*").eq("is_active", true).order("display_order"),
    supabase
      .from("services")
      .select("*, platform:platforms(*)")
      .eq("is_active", true)
      .order("platform_id")
      .order("name"),
    supabase.from("wallets").select("balance").eq("user_id", user.id).single(),
  ]);

  return (
    <ServicesClient
      platforms={platforms ?? []}
      services={services ?? []}
      walletBalance={wallet?.balance ?? 0}
      userId={user.id}
    />
  );
}
