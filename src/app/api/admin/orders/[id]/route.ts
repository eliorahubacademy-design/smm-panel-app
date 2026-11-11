// @ts-nocheck
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateSchema = z.object({
  status: z.enum(["pending", "processing", "completed", "partial", "cancelled", "refunded"]),
  notes: z.string().max(500).optional(),
});

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
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const adminClient = createAdminClient();

  const { data: order } = await adminClient.from("orders").select("*").eq("id", id).single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const updates: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.notes) updates.notes = parsed.data.notes;
  if (parsed.data.status === "completed") updates.completed_at = new Date().toISOString();

  // If refunding, credit back to wallet
  if (parsed.data.status === "refunded" && order.status !== "refunded") {
    const { data: creditResult } = await adminClient.rpc("credit_wallet", {
      p_user_id: order.user_id,
      p_amount: order.total_cost,
      p_description: `Refund for order #${id.slice(0, 8)}`,
      p_reference_id: id,
      p_reference_type: "refund",
    });
    if (!creditResult?.success) {
      return NextResponse.json({ error: "Failed to process refund" }, { status: 500 });
    }
  }

  await adminClient.from("orders").update(updates).eq("id", id);

  await adminClient.from("audit_logs").insert({
    admin_id: user.id,
    action: "update_order_status",
    target_type: "order",
    target_id: id,
    details: { old_status: order.status, new_status: parsed.data.status },
  });

  return NextResponse.json({ success: true });
}
