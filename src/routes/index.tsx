import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowRight, Boxes, Check, GitBranch, Radar, ScanSearch, ShieldCheck, Timer } from "lucide-react";
import { SOURCE_CATALOG } from "@/lib/osint-catalog";
import { PLAYBOOKS } from "@/lib/playbooks";
import { TIERS } from "@/lib/pricing";

const TITLE = "SentinelGrid — OSINT Data Hub & Attack Surface Intelligence";
const DESCRIPTION =
  "Run passive OSINT lookups across five keyless sources, automate triage playbooks and monitor your attack surface. Free tier, no API keys, evidence-first output.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "SentinelGrid",
          applicationCategory: "SecurityApplication",
          operatingSystem: "Web",
          description: DESCRIPTION,
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            description: "Free tier with 25 scans per month across all keyless connectors.",
          },
        }),
      },
    ],
  }),
  component: Home,
});

const CAPABILITIES = [
  {
    icon: ScanSearch,
    title: "OSINT Data Hub",
    body: "One indicator, every connector queried concurrently, normalised into a single verdict with the raw evidence kept alongside it.",
    to: "/osint" as const,
    cta: "Scan an indicator",
  },
  {
    icon: GitBranch,
    title: "Automation Workflows",
    body: "Playbooks chain lookups into a decision — phishing triage, vendor due diligence, incident enrichment — and return a recommendation, not a data dump.",
    to: "/workflows" as const,
    cta: "Run a playbook",
  },
  {
    icon: Radar,
    title: "Attack Surface Monitoring",
    body: "Track ports, CVEs, certificates and subdomain sprawl across your estate, and get alerted on the diff instead of the inventory.",
    to: "/attack-surface" as const,
    cta: "See what we track",
  },
  {
    icon: Activity,
    title: "Threat Intelligence",
    body: "A live view of newly disclosed vulnerabilities so you know whether today's CVE touches anything you actually run.",
    to: "/threat-intel" as const,
    cta: "View latest CVEs",
  },
];

const METRICS = [
  { value: "5", label: "keyless connectors" },
  { value: "<60s", label: "phishing triage SLA" },
  { value: "0", label: "API keys to start" },
  { value: "100%", label: "passive collection" },
];

function Home() {
  return (
    <>
      {/* Hero */}
      <section className="hero-surface grid-backdrop border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              Passive reconnaissance · no keys required
            </span>

            <h1 className="mt-6 text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl">
              Turn scattered OSINT into a{" "}
              <span className="text-gradient-signal">decision you can defend</span>.
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              SentinelGrid queries registry, DNS, certificate-transparency, exposure and web-hardening
              sources at once, then hands your analysts a verdict with the evidence attached — in the
              time it takes to open a ticket.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/osint"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Run a free scan <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-panel px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
              >
                See pricing
              </Link>
            </div>

            <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
              {METRICS.map((m) => (
                <div key={m.label}>
                  <dt className="sr-only">{m.label}</dt>
                  <dd>
                    <span className="font-display text-2xl font-semibold text-primary">{m.value}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{m.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="label-mono">The platform</h2>
        <p className="mt-3 max-w-2xl font-display text-3xl font-semibold">
          Four surfaces, one evidence trail
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {CAPABILITIES.map((c) => (
            <article key={c.title} className="surface-raised group p-6">
              <c.icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
              <Link
                to={c.to}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                {c.cta} <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Sources */}
      <section className="border-y border-border bg-panel">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="label-mono">Connectors</h2>
              <p className="mt-3 font-display text-3xl font-semibold">Live sources, zero setup</p>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Every source below is queried in parallel and works without an account or API key.
              Premium keyed feeds plug into the same registry on Enterprise.
            </p>
          </div>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SOURCE_CATALOG.map((s) => (
              <li key={s.id} className="surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">{s.label}</h3>
                  <span className="font-mono text-[10px] tracking-wider text-clean">FREE</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{s.detail}</p>
                <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                  {s.types.join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Workflows */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="label-mono">Workflows</h2>
        <p className="mt-3 max-w-2xl font-display text-3xl font-semibold">
          Playbooks that end in a recommendation
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {PLAYBOOKS.map((p) => (
            <article key={p.slug} className="surface p-6">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold">{p.name}</h3>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                  <Timer className="size-3" aria-hidden="true" />
                  {p.sla}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.outcome}</p>
              <p className="mt-4 font-mono text-[11px] text-muted-foreground">
                {p.steps.length} steps · trigger: {p.trigger}
              </p>
            </article>
          ))}
        </div>

        <Link
          to="/workflows"
          className="mt-8 inline-flex items-center gap-2 rounded-md border border-border bg-panel px-5 py-2.5 text-sm font-semibold hover:bg-accent"
        >
          Explore workflows <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </section>

      {/* Free plan */}
      <section className="border-t border-border bg-panel">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="label-mono">Pricing</h2>
              <p className="mt-3 font-display text-3xl font-semibold">Free to start, no card required</p>
            </div>
            <Link to="/pricing" className="text-sm font-medium text-primary hover:underline">
              See the full plan details →
            </Link>
          </div>

          {TIERS.filter((t) => t.id === "recon").map((t) => (
            <article key={t.id} className="surface-raised mt-10 max-w-2xl p-7 ring-1 ring-primary/40">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">{t.name}</h3>
                <p className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-semibold">{t.price}</span>{" "}
                  <span className="text-xs text-muted-foreground">{t.cadence}</span>
                </p>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t.pitch}</p>
              <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 font-mono text-[11px] text-muted-foreground">{t.limits}</p>
              <Link
                to="/osint"
                className="mt-7 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Run a free scan <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="surface-raised hero-surface flex flex-col items-start gap-6 p-10 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-semibold">
              Point it at one indicator and see the difference
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              No signup, no keys, no intrusive testing — just passive public data, normalised.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/osint"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <ShieldCheck className="size-4" aria-hidden="true" /> Run a free scan
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-panel px-5 py-2.5 text-sm font-semibold hover:bg-accent"
            >
              <Boxes className="size-4" aria-hidden="true" /> Talk to sales
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
