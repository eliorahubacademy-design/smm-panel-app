import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const RejectSchema = z.object({ reason: z.string().min(5).max(500) });

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

  const body = await request.json().catch(() => ({}));
  const parsed = RejectSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Rejection reason required" }, { status: 400 });

  const adminClient = createAdminClient();

  const { data: payment } = await adminClient
    .from("payment_records")
    .select("status")
    .eq("id", id)
    .single();

  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (payment.status !== "pending") return NextResponse.json({ error: "Payment is not pending" }, { status: 409 });

  await adminClient
    .from("payment_records")
    .update({
      status: "rejected",
      rejection_reason: parsed.data.reason,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", id);

  await adminClient.from("audit_logs").insert({
    admin_id: user.id,
    action: "reject_payment",
    target_type: "payment_record",
    target_id: id,
    details: { reason: parsed.data.reason },
  });

  return NextResponse.json({ success: true });
}
