import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TicketsClient from "./TicketsClient";

export const metadata = { title: "Support Tickets" };

export default async function TicketsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("*, replies:ticket_replies(count)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, service:services(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return <TicketsClient tickets={tickets ?? []} orders={orders ?? []} />;
}
