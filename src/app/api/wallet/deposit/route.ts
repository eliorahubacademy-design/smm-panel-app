import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const DepositSchema = z.object({
  amount: z.number().positive().min(50).max(50000),
  payment_method: z.enum(["gcash", "maya", "bank_transfer"]),
  reference_number: z.string().min(4).max(100),
  sender_name: z.string().min(2).max(100),
  proof_url: z.string().url().optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = DepositSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  const { amount, payment_method, reference_number, sender_name, proof_url, notes } = parsed.data;

  // Check for duplicate reference number
  const { data: existing } = await supabase
    .from("payment_records")
    .select("id")
    .eq("reference_number", reference_number)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "This reference number has already been submitted" }, { status: 409 });
  }

  const { data: record, error } = await supabase
    .from("payment_records")
    .insert({
      user_id: user.id,
      amount,
      payment_method,
      reference_number,
      sender_name,
      proof_url: proof_url ?? null,
      notes: notes ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to submit deposit request" }, { status: 500 });
  }

  return NextResponse.json({ success: true, record_id: record.id }, { status: 201 });
}
