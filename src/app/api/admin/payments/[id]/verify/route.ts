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

  // Verify admin role
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const adminClient = createAdminClient();

  // Get payment record
  const { data: payment } = await adminClient
    .from("payment_records")
    .select("*")
    .eq("id", id)
    .single();

  if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  if (payment.status !== "pending") {
    return NextResponse.json({ error: "Payment is not pending" }, { status: 409 });
  }

  // Credit the user's wallet
  const { data: creditResult, error: creditError } = await adminClient.rpc("credit_wallet", {
    p_user_id: payment.user_id,
    p_amount: payment.amount,
    p_description: `Deposit via ${payment.payment_method} (ref: ${payment.reference_number})`,
    p_reference_id: payment.id,
    p_reference_type: "deposit",
  });

  if (creditError || !creditResult?.success) {
    return NextResponse.json({ error: creditResult?.error_message ?? "Failed to credit wallet" }, { status: 500 });
  }

  // Update payment record
  await adminClient
    .from("payment_records")
    .update({
      status: "verified",
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Audit log
  await adminClient.from("audit_logs").insert({
    admin_id: user.id,
    action: "verify_payment",
    target_type: "payment_record",
    target_id: id,
    details: { amount: payment.amount, user_id: payment.user_id },
  });

  return NextResponse.json({ success: true });
}
