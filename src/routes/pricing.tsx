import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { ADD_ONS, FAQS, TIERS } from "@/lib/pricing";
import { useLanguage } from "@/lib/language";

const TITLE = "Pricing — Free OSINT Tier, Team SOC & Enterprise | SentinelGrid";
const DESCRIPTION =
  "Transparent security tooling pricing: free forever for 25 scans a month, $149/mo for a full SOC workspace, custom enterprise terms. Credit packs and monitoring add-ons included.";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/pricing" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  const { t } = useLanguage();
  return (
    <div>
      <section className="hero-surface border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
          <p className="label-mono">Pricing</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Priced by volume, not by seat panic</h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
            Start free with every keyless connector. Upgrade when triage becomes a daily habit rather
            than an occasional errand.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-3">
          {TIERS.map((t) => (
            <article
              key={t.id}
              className={`flex flex-col p-7 ${t.featured ? "surface-raised ring-1 ring-primary/40" : "surface"}`}
            >
              {t.featured && (
                <span className="mb-4 w-fit rounded-full bg-primary px-2.5 py-0.5 font-mono text-[10px] tracking-wider text-primary-foreground uppercase">
                  Most popular
                </span>
              )}
              <h2 className="font-display text-lg font-semibold">{t.name}</h2>
              <p className="mt-3">
                <span className="font-display text-4xl font-semibold">{t.price}</span>{" "}
                <span className="text-xs text-muted-foreground">{t.cadence}</span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">{t.pitch}</p>
              <p className="mt-4 font-mono text-[11px] text-muted-foreground">{t.limits}</p>

              <ul className="mt-6 flex-1 space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={t.id === "recon" ? "/osint" : t.id === "team" ? "/billing" : "/contact"}
                className={`mt-7 rounded-md px-4 py-2.5 text-center text-sm font-semibold ${
                  t.featured
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "border border-border hover:bg-accent"
                }`}
              >
                {t.id === "recon" ? (t("Start scanning")) : t.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-panel">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <h2 className="label-mono">Add-ons</h2>
          <p className="mt-3 font-display text-3xl font-semibold">Attach revenue to what you use</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Buy any add-on or credit pack from{" "}
            <Link to="/billing" className="text-primary hover:underline">
              your billing page
            </Link>{" "}
            — checkout is handled securely by StreamPay.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {ADD_ONS.map((a) => (
              <article key={a.name} className="surface flex flex-col gap-2 p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold">{a.name}</h3>
                  <span className="font-mono text-sm text-primary">{a.price}</span>
                </div>
                <p className="text-sm text-muted-foreground">{a.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-semibold">Pricing questions</h2>
        <dl className="mt-8 space-y-6">
          {FAQS.map((f) => (
            <div key={f.q}>
              <dt className="text-base font-semibold">{f.q}</dt>
              <dd className="mt-2 text-sm text-muted-foreground">{f.a}</dd>
            </div>
          ))}
        </dl>

        <div className="surface-raised mt-12 p-8 text-center">
          <h2 className="font-display text-xl font-semibold">Need a quote for a regulated estate?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enterprise terms cover SSO, data residency, custom connectors and an uptime SLA.
          </p>
          <Link
            to="/contact"
            className="mt-6 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Talk to sales
          </Link>
        </div>
      </section>
    </div>
  );
}
