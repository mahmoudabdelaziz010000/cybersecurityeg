/**
 * StreamPay (https://streampay.sa) payment-link client.
 *
 * Auth: the merchant secret key is sent Base64-encoded in the `x-api-key`
 * header. Amounts are sent as a decimal major-unit string.
 */

export interface CreatePaymentLinkInput {
  orderId: string;
  name: string;
  description: string;
  amountCents: number;
  currency: string;
  customerEmail: string | null;
  successUrl: string;
  cancelUrl: string;
  webhookUrl: string;
  recurring: boolean;
}

export interface PaymentLink {
  url: string;
  reference: string;
  raw: unknown;
}

function apiBase(): string {
  return (process.env["STREAMPAY_API_BASE"] ?? "https://api.streampay.sa").replace(/\/+$/, "");
}

function authHeader(): string {
  const key = process.env["STREAMPAY_API_KEY"];
  if (!key) {
    throw new Error("Payments are not configured yet (missing StreamPay API key).");
  }
  // Already-encoded keys are passed through untouched.
  const looksEncoded = /^[A-Za-z0-9+/]+={0,2}$/.test(key) && key.length % 4 === 0 && key.includes("=");
  return looksEncoded ? key : Buffer.from(key, "utf8").toString("base64");
}

function pickString(source: unknown, keys: string[]): string | null {
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
    if (typeof value === "number") return String(value);
  }
  // one level of nesting: { data: {...} }
  for (const nested of ["data", "result", "payment_link", "paymentLink"]) {
    const value = record[nested];
    if (value && typeof value === "object") {
      const found = pickString(value, keys);
      if (found) return found;
    }
  }
  return null;
}

export async function createPaymentLink(input: CreatePaymentLinkInput): Promise<PaymentLink> {
  const body = {
    name: input.name,
    description: input.description,
    amount: (input.amountCents / 100).toFixed(2),
    currency: input.currency,
    type: input.recurring ? "recurring" : "one_time",
    quantity: 1,
    customer_email: input.customerEmail,
    redirect_url: input.successUrl,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    callback_url: input.webhookUrl,
    webhook_url: input.webhookUrl,
    reference: input.orderId,
    metadata: { order_id: input.orderId },
  };

  const response = await fetch(`${apiBase()}/api/v2/payment_links`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "x-api-key": authHeader(),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }

  if (!response.ok) {
    console.error("[streampay] payment link failed", response.status, text.slice(0, 500));
    throw new Error(
      response.status === 401 || response.status === 403
        ? "StreamPay rejected the merchant key. Check the API key in project settings."
        : "StreamPay could not create a checkout link right now. Please try again.",
    );
  }

  const url = pickString(parsed, ["url", "payment_url", "link", "checkout_url", "short_url"]);
  const reference =
    pickString(parsed, ["id", "uuid", "reference", "payment_link_id", "token"]) ?? input.orderId;

  if (!url) {
    console.error("[streampay] no checkout url in response", text.slice(0, 500));
    throw new Error("StreamPay did not return a checkout link.");
  }

  return { url, reference, raw: parsed };
}

/** Timing-safe HMAC-SHA256 verification of a raw webhook body. */
export async function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env["STREAMPAY_WEBHOOK_SECRET"];
  if (!secret) return false;
  if (!signature) return false;

  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const provided = signature.replace(/^sha256=/i, "").trim().toLowerCase();
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"));
}

export type NormalizedStatus = "paid" | "failed" | "cancelled" | "refunded" | "pending";

export function normalizeStatus(value: unknown): NormalizedStatus {
  const status = String(value ?? "").toLowerCase();
  if (["paid", "success", "successful", "completed", "captured", "active"].includes(status)) return "paid";
  if (["failed", "declined", "error"].includes(status)) return "failed";
  if (["cancelled", "canceled", "expired"].includes(status)) return "cancelled";
  if (["refunded", "refund", "chargeback"].includes(status)) return "refunded";
  return "pending";
}
