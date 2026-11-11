import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import WalletClient from "./WalletClient";

export const metadata = { title: "Wallet" };

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: wallet }, { data: transactions }, { data: payments }] = await Promise.all([
    supabase.from("wallets").select("*").eq("user_id", user.id).single(),
    supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("payment_records")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <WalletClient
      wallet={wallet}
      transactions={transactions ?? []}
      payments={payments ?? []}
    />
  );
}
