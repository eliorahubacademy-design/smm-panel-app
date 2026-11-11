import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupplierAdapter } from "@/lib/suppliers/mock-adapter";

const OrderSchema = z.object({
  service_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  target_url: z.string().url(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = OrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  const { service_id, quantity, target_url, notes } = parsed.data;

  // Get user profile + role
  const { data: profile } = await supabase.from("profiles").select("id, role").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Fetch service with pricing
  const { data: service } = await supabase
    .from("services")
    .select("*, platform:platforms(name)")
    .eq("id", service_id)
    .eq("is_active", true)
    .single();
  if (!service) return NextResponse.json({ error: "Service not found or inactive" }, { status: 404 });

  // Validate quantity
  if (quantity < service.min_quantity || quantity > service.max_quantity) {
    return NextResponse.json({
      error: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}`
    }, { status: 400 });
  }

  // Determine price per unit (reseller may have custom pricing)
  let pricePerUnit = service.price_per_unit;
  if (profile.role === "reseller") {
    const { data: resellerPrice } = await supabase
      .from("reseller_prices")
      .select("custom_price")
      .eq("reseller_id", user.id)
      .eq("service_id", service_id)
      .single();
    if (resellerPrice) pricePerUnit = resellerPrice.custom_price;
  }

  const totalCost = pricePerUnit * quantity;

  // Use admin client for atomic wallet debit
  const adminClient = createAdminClient();

  // Debit wallet atomically via stored function
  const { data: debitResult, error: debitError } = await adminClient.rpc("debit_wallet", {
    p_user_id: user.id,
    p_amount: totalCost,
    p_description: `Order for ${service.name} x${quantity}`,
    p_reference_id: null,
    p_reference_type: "order",
  });

  if (debitError || !debitResult?.success) {
    const msg = debitResult?.error_message ?? debitError?.message ?? "Insufficient balance";
    return NextResponse.json({ error: msg }, { status: 402 });
  }

  // Find a supplier for this service
  const { data: supplierService } = await adminClient
    .from("supplier_services")
    .select("supplier_id, external_service_id, supplier:suppliers(id, name, is_active)")
    .eq("service_id", service_id)
    .limit(1)
    .single();

  // Create order record
  const { data: order, error: orderError } = await adminClient
    .from("orders")
    .insert({
      user_id: user.id,
      service_id,
      supplier_id: supplierService?.supplier_id ?? null,
      quantity,
      target_url,
      price_per_unit: pricePerUnit,
      total_cost: totalCost,
      notes,
      status: "pending",
    })
    .select()
    .single();

  if (orderError || !order) {
    // Rollback: refund wallet
    await adminClient.rpc("credit_wallet", {
      p_user_id: user.id,
      p_amount: totalCost,
      p_description: "Refund: order creation failed",
      p_reference_id: null,
      p_reference_type: "refund",
    });
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }

  // Submit to supplier (async, don't block response)
  if (supplierService) {
    try {
      const adapter = getSupplierAdapter(supplierService.supplier_id);
      const supplierResult = await adapter.placeOrder({
        externalServiceId: supplierService.external_service_id,
        quantity,
        targetUrl: target_url,
        notes,
      });

      await adminClient
        .from("orders")
        .update({
          supplier_order_id: supplierResult.externalOrderId,
          status: supplierResult.status === "accepted" ? "processing" : "pending",
        })
        .eq("id", order.id);
    } catch {
      // Supplier failed — order stays pending for manual processing
    }
  }

  return NextResponse.json({ success: true, order_id: order.id }, { status: 201 });
}
