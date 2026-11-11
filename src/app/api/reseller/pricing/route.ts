import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const PriceSchema = z.object({
  service_id: z.string().uuid(),
  custom_price: z.number().positive(),
});

async function requireReseller() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["reseller", "admin"].includes(profile.role)) return null;
  return user;
}

export async function GET() {
  const user = await requireReseller();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("reseller_prices")
    .select("*, service:services(id, name, price_per_unit, platform:platforms(name))")
    .eq("reseller_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ prices: data ?? [] });
}

export async function POST(request: Request) {
  const user = await requireReseller();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const parsed = PriceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const supabase = await createClient();
  // Verify service exists and get base price
  const { data: service } = await supabase
    .from("services")
    .select("price_per_unit")
    .eq("id", parsed.data.service_id)
    .single();

  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  // Custom price must be >= base price (resellers must mark up, not down)
  if (parsed.data.custom_price < service.price_per_unit) {
    return NextResponse.json({
      error: `Custom price must be at least ${service.price_per_unit} (base price)`
    }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("reseller_prices")
    .upsert({
      reseller_id: user.id,
      service_id: parsed.data.service_id,
      custom_price: parsed.data.custom_price,
    }, { onConflict: "reseller_id,service_id" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to save price" }, { status: 500 });

  return NextResponse.json({ success: true, price: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await requireReseller();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("service_id");
  if (!serviceId) return NextResponse.json({ error: "service_id required" }, { status: 400 });

  const adminClient = createAdminClient();
  await adminClient
    .from("reseller_prices")
    .delete()
    .eq("reseller_id", user.id)
    .eq("service_id", serviceId);

  return NextResponse.json({ success: true });
}
