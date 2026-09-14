import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/streampay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature =
          request.headers.get("x-streampay-signature") ??
          request.headers.get("x-signature") ??
          request.headers.get("x-webhook-signature");

        const { verifyWebhookSignature, normalizeStatus } = await import("@/lib/streampay.server");
        const valid = await verifyWebhookSignature(rawBody, signature);
        if (!valid) return new Response("Invalid signature", { status: 401 });

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const nested = (payload["data"] ?? payload) as Record<string, unknown>;
        const metadata = (nested["metadata"] ?? {}) as Record<string, unknown>;
        const orderId =
          (typeof metadata["order_id"] === "string" ? metadata["order_id"] : null) ??
          (typeof nested["reference"] === "string" ? nested["reference"] : null);

        if (!orderId) return new Response("Missing order reference", { status: 400 });

        const status = normalizeStatus(nested["status"] ?? payload["event"] ?? payload["type"]);
        const { fulfilOrder } = await import("@/lib/billing.server");
        const result = await fulfilOrder(orderId, status);
        if (!result.ok) return new Response("Unknown order", { status: 404 });

        return Response.json({ received: true });
      },
    },
  },
});
