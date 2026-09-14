import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { BillingProduct, OrderSummary } from "./billing";

export const listBillingProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("billing_products")
    .select("id, kind, name, description, price_cents, currency, plan_id, credits, interval")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  return { products: (data ?? []) as BillingProduct[] };
});

export const getBillingOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getCreditBalance } = await import("./billing.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [credits, orders, products] = await Promise.all([
      getCreditBalance(context.userId),
      supabaseAdmin
        .from("orders")
        .select("id, product_id, amount_cents, currency, status, checkout_url, created_at")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabaseAdmin
        .from("billing_products")
        .select("id, kind, name, description, price_cents, currency, plan_id, credits, interval")
        .eq("active", true)
        .order("sort_order", { ascending: true }),
    ]);

    return {
      credits,
      orders: (orders.data ?? []) as OrderSummary[],
      products: (products.data ?? []) as BillingProduct[],
      paymentsConfigured: Boolean(process.env["STREAMPAY_API_KEY"]),
    };
  });

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ productId: z.string().min(1).max(64) }).parse(data))
  .handler(async ({ data, context }) => {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const { createPaymentLink } = await import("./streampay.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: product } = await supabaseAdmin
      .from("billing_products")
      .select("id, name, description, price_cents, currency, interval, active")
      .eq("id", data.productId)
      .maybeSingle();
    if (!product || !product.active) throw new Error("That item is not available.");
    if (product.price_cents <= 0) throw new Error("That item has no online price. Contact sales.");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();

    const origin =
      getRequestHeader("origin") ??
      (getRequestHeader("host") ? `https://${getRequestHeader("host")}` : "https://sentinelgrid.app");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: context.userId,
        product_id: product.id,
        amount_cents: product.price_cents,
        currency: product.currency,
        provider: "streampay",
      })
      .select("id")
      .single();
    if (error || !order) throw new Error("Could not start the order. Please try again.");

    try {
      const link = await createPaymentLink({
        orderId: order.id,
        name: product.name,
        description: product.description,
        amountCents: product.price_cents,
        currency: product.currency,
        customerEmail: profile?.email ?? null,
        successUrl: `${origin}/billing?order=${order.id}`,
        cancelUrl: `${origin}/billing?cancelled=${order.id}`,
        webhookUrl: `${origin}/api/public/streampay-webhook`,
        recurring: product.interval !== "one_time",
      });

      await supabaseAdmin
        .from("orders")
        .update({ provider_ref: link.reference, checkout_url: link.url })
        .eq("id", order.id);

      return { checkoutUrl: link.url, orderId: order.id };
    } catch (err) {
      await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
      throw err instanceof Error ? err : new Error("Checkout failed.");
    }
  });

/** Lets the success page reflect payment state immediately, before/without a webhook. */
export const getOrderStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, status, fulfilled, product_id")
      .eq("id", data.orderId)
      .eq("user_id", context.userId)
      .maybeSingle();
    return { order: order ?? null };
  });
