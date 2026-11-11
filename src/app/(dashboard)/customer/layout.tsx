import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import DashboardLayout from "@/components/layout/DashboardLayout";
import type { Profile } from "@/types";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
const adminSupabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
const { data: profile } = await adminSupabase
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .single();
    .single();

  if (!profile) redirect("/login");

  return (
    <DashboardLayout profile={profile as Profile}>
      {children}
    </DashboardLayout>
  );
}
