export type ProductKind = "subscription" | "credits" | "addon";

export interface BillingProduct {
  id: string;
  kind: ProductKind;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  plan_id: string | null;
  credits: number;
  interval: "one_time" | "month" | "year";
}

export interface OrderSummary {
  id: string;
  product_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  checkout_url: string | null;
  created_at: string;
}

export function formatPrice(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function cadenceLabel(interval: BillingProduct["interval"]): string {
  if (interval === "month") return "per month";
  if (interval === "year") return "per year";
  return "one-time";
}
