import { createFileRoute } from "@tanstack/react-router";

const TITLE = "Refund Policy | SentinelGrid";
const DESCRIPTION =
  "14-day money-back guarantee on first subscriptions, prorated downgrades and credit-pack terms for SentinelGrid plans.";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/refund" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "/refund" }],
  }),
  component: Refund,
});

const SECTIONS = [
  {
    h: "14-day guarantee",
    p: "If a first paid subscription does not fit your workflow, tell us within 14 days of the initial charge and we refund it in full, no questions asked.",
  },
  {
    h: "Renewals",
    p: "Renewal charges are not automatically refundable, but you can cancel at any time and keep access until the end of the paid period.",
  },
  {
    h: "Credit packs",
    p: "Scan credits never expire and are non-refundable once purchased, because the underlying source queries are consumed on use.",
  },
  {
    h: "Downgrades",
    p: "Downgrades take effect at the next billing date and unused time is credited to your account balance.",
  },
  {
    h: "How to request",
    p: "Email the billing address on your invoice or use the contact form and select Support. Refunds are issued to the original payment method within 10 business days.",
  },
];

function Refund() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="label-mono">Legal</p>
      <h1 className="mt-3 text-4xl font-bold">Refund Policy</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Plain terms for getting your money back if SentinelGrid isn't the right fit.
      </p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="font-display text-xl font-semibold">{s.h}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
