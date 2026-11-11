import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const ServiceSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  platform_id: z.string().uuid(),
  category: z.string().min(2).max(100),
  price_per_unit: z.number().positive(),
  min_quantity: z.number().int().positive(),
  max_quantity: z.number().int().positive(),
  unit_label: z.string().default("units"),
  is_active: z.boolean().default(true),
});

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return null;
  return user;
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = ServiceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.from("services").insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: "Failed to create service" }, { status: 500 });

  await adminClient.from("audit_logs").insert({
    admin_id: user.id, action: "create_service", target_type: "service", target_id: data.id, details: { name: data.name },
  });

  return NextResponse.json({ success: true, service: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Service ID required" }, { status: 400 });

  const body = await request.json();
  const parsed = ServiceSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const adminClient = createAdminClient();
  await adminClient.from("services").update(parsed.data).eq("id", id);
  await adminClient.from("audit_logs").insert({
    admin_id: user.id, action: "update_service", target_type: "service", target_id: id, details: parsed.data,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Service ID required" }, { status: 400 });

  const adminClient = createAdminClient();
  // Soft delete — deactivate instead of hard delete to preserve order history
  await adminClient.from("services").update({ is_active: false }).eq("id", id);
  await adminClient.from("audit_logs").insert({
    admin_id: user.id, action: "deactivate_service", target_type: "service", target_id: id, details: {},
  });

  return NextResponse.json({ success: true });
}
