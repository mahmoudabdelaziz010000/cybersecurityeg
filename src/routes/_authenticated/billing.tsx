import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { createCheckout, getBillingOverview, getOrderStatus } from "@/lib/billing.functions";
import { cadenceLabel, formatPrice } from "@/lib/billing";

const TITLE = "Billing — Plans, Scan Credits & Invoices | SentinelGrid";
const DESCRIPTION =
  "Upgrade your SentinelGrid plan, buy scan credit packs and review your payment history. Checkout is handled securely by StreamPay.";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    order: typeof search["order"] === "string" ? search["order"] : undefined,
    cancelled: typeof search["cancelled"] === "string" ? search["cancelled"] : undefined,
  }),
  component: Billing,
});

function Billing() {
  const { order: orderParam, cancelled } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchOverview = useServerFn(getBillingOverview);
  const startCheckout = useServerFn(createCheckout);
  const checkOrder = useServerFn(getOrderStatus);
  const [error, setError] = useState<string | null>(null);

  const { data, isPending } = useQuery({
    queryKey: ["billing-overview"],
    queryFn: () => fetchOverview(),
  });

  const { data: orderState } = useQuery({
    queryKey: ["order-status", orderParam],
    enabled: Boolean(orderParam),
    refetchInterval: (q) => (q.state.data?.order?.status === "pending" ? 4000 : false),
    queryFn: () => checkOrder({ data: { orderId: orderParam as string } }),
  });

  useEffect(() => {
    if (orderState?.order?.status === "paid") {
      void queryClient.invalidateQueries({ queryKey: ["billing-overview"] });
      void queryClient.invalidateQueries({ queryKey: ["account-overview"] });
    }
  }, [orderState?.order?.status, queryClient]);

  const buy = useMutation({
    mutationFn: (productId: string) => startCheckout({ data: { productId } }),
    onMutate: () => setError(null),
    onSuccess: (res) => {
      if (res.checkoutUrl) window.location.href = res.checkoutUrl;
    },
    onError: (e: Error) => setError(e.message),
  });

  if (isPending || !data) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <header>
        <p className="label-mono">Billing</p>
        <h1 className="mt-2 text-3xl font-bold">Plan, credits and invoices</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Payments are processed by StreamPay. You are redirected to a secure checkout page and back
          here once the payment clears.
        </p>
      </header>

      {orderParam && orderState?.order && (
        <div
          className={`surface mt-6 p-5 text-sm ${
            orderState.order.status === "paid" ? "border-primary/40" : ""
          }`}
        >
          {orderState.order.status === "paid"
            ? "Payment received — your plan and credits are updated."
            : orderState.order.status === "pending"
              ? "Waiting for StreamPay to confirm your payment. This page updates automatically."
              : `Payment ${orderState.order.status}.`}
        </div>
      )}
      {cancelled && (
        <div className="surface mt-6 p-5 text-sm text-muted-foreground">
          Checkout cancelled — nothing was charged.
        </div>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <article className="surface-raised p-6">
          <h2 className="label-mono">Scan credits</h2>
          <p className="mt-3 font-display text-3xl font-semibold">{data.credits.toLocaleString()}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Used automatically once your monthly plan allowance runs out.
          </p>
        </article>
        <article className="surface p-6">
          <h2 className="label-mono">Need a bigger workspace?</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Compare allowances and enterprise terms before you upgrade.
          </p>
          <Link to="/pricing" className="mt-5 inline-flex text-sm text-primary hover:underline">
            See all plans
          </Link>
        </article>
      </section>

      {!data.paymentsConfigured && (
        <p className="surface mt-6 p-5 text-sm text-muted-foreground">
          Online checkout is not switched on yet. Add your StreamPay merchant key in project settings
          to accept live payments.
        </p>
      )}
      {error && <p className="surface mt-6 p-5 text-sm text-malicious">{error}</p>}

      <section className="mt-10">
        <h2 className="label-mono">Buy</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {data.products.map((p) => (
            <article key={p.id} className="surface flex flex-col p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold">{p.name}</h3>
                <span className="font-mono text-sm text-primary">
                  {formatPrice(p.price_cents, p.currency)}{" "}
                  <span className="text-muted-foreground">{cadenceLabel(p.interval)}</span>
                </span>
              </div>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.description}</p>
              <button
                type="button"
                onClick={() => buy.mutate(p.id)}
                disabled={buy.isPending}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {buy.isPending && buy.variables === p.id ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CreditCard className="size-4" aria-hidden="true" />
                )}
                Checkout
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="label-mono">Payment history</h2>
        {data.orders.length === 0 ? (
          <p className="surface mt-4 p-6 text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="surface mt-4 divide-y divide-border">
            {data.orders.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                <span className="font-mono">{o.product_id}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {formatPrice(o.amount_cents, o.currency)} · {o.status}
                </span>
                <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                  {new Date(o.created_at).toLocaleString()}
                </span>
                {o.status === "pending" && o.checkout_url && (
                  <a href={o.checkout_url} className="text-primary hover:underline">
                    Resume payment
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
        Card details are entered on StreamPay's hosted checkout — SentinelGrid never sees them.
        <button
          type="button"
          onClick={() => navigate({ to: "/dashboard" })}
          className="ml-auto text-primary hover:underline"
        >
          Back to dashboard
        </button>
      </p>
    </div>
  );
}
