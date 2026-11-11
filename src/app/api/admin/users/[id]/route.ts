import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData().catch(() => null);
  const action = formData?.get("action") as string | null;

  if (!action) {
    const body = await request.json().catch(() => ({}));
    return handleJsonUpdate(id, user.id, body);
  }

  const adminClient = createAdminClient();
  const isActive = action === "activate";

  await adminClient.from("profiles").update({ is_active: isActive }).eq("id", id);
  await adminClient.from("audit_logs").insert({
    admin_id: user.id,
    action: isActive ? "activate_user" : "deactivate_user",
    target_type: "profile",
    target_id: id,
    details: {},
  });

  // Redirect back to users page (form submission)
  return NextResponse.redirect(new URL("/admin/users", request.url));
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  return handleJsonUpdate(id, user.id, body);
}

async function handleJsonUpdate(targetId: string, adminId: string, body: Record<string, unknown>) {
  const adminClient = createAdminClient();
  const allowed = ["full_name", "role", "is_active"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await adminClient.from("profiles").update(updates).eq("id", targetId);
  await adminClient.from("audit_logs").insert({
    admin_id: adminId,
    action: "update_user",
    target_type: "profile",
    target_id: targetId,
    details: updates,
  });
  return NextResponse.json({ success: true });
}
