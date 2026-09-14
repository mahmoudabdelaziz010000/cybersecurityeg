import type { NormalizedStatus } from "./streampay.server";

export async function getCreditBalance(userId: string): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("credit_ledger")
    .select("delta")
    .eq("user_id", userId);
  return (data ?? []).reduce((sum, row) => sum + (row.delta ?? 0), 0);
}

export async function consumeCredits(userId: string, amount: number, reason: string) {
  if (amount <= 0) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("credit_ledger").insert({ user_id: userId, delta: -amount, reason });
}

/**
 * Applies an order's entitlements once, after the provider confirms payment.
 * Safe to call repeatedly — the `fulfilled` flag guards double-granting.
 */
export async function fulfilOrder(orderId: string, status: NormalizedStatus) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, product_id, fulfilled, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, reason: "unknown order" };

  await supabaseAdmin.from("orders").update({ status }).eq("id", orderId);

  if (status !== "paid" || order.fulfilled) return { ok: true, granted: false };

  const { data: product } = await supabaseAdmin
    .from("billing_products")
    .select("id, name, plan_id, credits")
    .eq("id", order.product_id)
    .maybeSingle();
  if (!product) return { ok: false, reason: "unknown product" };

  if (product.plan_id) {
    await supabaseAdmin.from("profiles").update({ plan_id: product.plan_id }).eq("id", order.user_id);
  }
  if (product.credits > 0) {
    await supabaseAdmin.from("credit_ledger").insert({
      user_id: order.user_id,
      delta: product.credits,
      reason: `Purchased ${product.name}`,
      order_id: order.id,
    });
  }

  await supabaseAdmin.from("orders").update({ fulfilled: true }).eq("id", orderId);
  return { ok: true, granted: true };
}
