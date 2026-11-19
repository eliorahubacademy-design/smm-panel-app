import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const DepositSchema = z.object({
  amount: z.coerce.number().positive().min(50).max(50000),
  payment_method: z.enum(["gcash", "maya", "bank_transfer"]),
  reference_number: z.string().min(4).max(100),
  sender_name: z.string().min(2).max(100).optional(),
  sender_account: z.string().max(100).optional(),
  screenshot_url: z.string().url().optional(),
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

  const { amount, payment_method, reference_number, screenshot_url } = parsed.data;

  // Check for duplicate reference number
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("reference_number", reference_number)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "This reference number has already been submitted" }, { status: 409 });
  }

  const { data: record, error } = await supabase
    .from("payments")
    .insert({
      user_id: user.id,
      amount,
      method: payment_method,
      reference_number,
      screenshot_url: screenshot_url ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to submit deposit request" }, { status: 500 });
  }

  return NextResponse.json({ success: true, record_id: record.id }, { status: 201 });
}
