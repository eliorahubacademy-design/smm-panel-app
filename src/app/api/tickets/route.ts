import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const TicketSchema = z.object({
  subject: z.string().min(5).max(200),
  message: z.string().min(10).max(5000),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  order_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = TicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { subject, message, priority, order_id } = parsed.data;

  // If order_id provided, verify it belongs to this user
  if (order_id) {
    const { data: order } = await supabase
      .from("orders")
      .select("id")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .single();
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      user_id: user.id,
      order_id: order_id ?? null,
      subject,
      message,
      priority,
      status: "open",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }

  return NextResponse.json({ success: true, ticket_id: ticket.id }, { status: 201 });
}
