import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe2, Radar, SearchCheck, ShieldCheck } from "lucide-react";
import { headLanguage, pageHead, SITE_URL } from "@/lib/seo";

const TITLE = "Domain Attack Surface & Phishing Monitoring | SentinelGrid";
const DESCRIPTION =
  "Assess verified company domains using passive DNS, certificate and registration data, then check public phishing and malware feeds. Compare domain monitoring plans.";

export const Route = createFileRoute("/attack-surface")({
  head: (ctx) => ({
    ...pageHead({
      path: "/attack-surface",
      title: TITLE,
      description: DESCRIPTION,
      lang: headLanguage(ctx),
      type: "website",
      image: { slug: "attack-surface", alt: "Verified domain attack surface and phishing monitoring" },
    }),
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "SentinelGrid Domain Attack Surface Monitoring",
        applicationCategory: "SecurityApplication",
        operatingSystem: "Web",
        url: `${SITE_URL}/attack-surface`,
        description: DESCRIPTION,
        offers: [
          { "@type": "Offer", name: "Recon", price: "0", priceCurrency: "USD", description: "One verified monitored domain" },
          { "@type": "Offer", name: "Team SOC", price: "149", priceCurrency: "USD", priceSpecification: { "@type": "UnitPriceSpecification", price: "149", priceCurrency: "USD", unitCode: "MON" }, description: "Ten verified monitored domains" },
        ],
      }),
    }],
  }),
  component: AttackSurface,
});

const STEPS = [
  { n: "01", title: "Add a company domain", detail: "Sign in and enter a domain your organization owns. The current plan allowance is shown in the dashboard." },
  { n: "02", title: "Prove domain control", detail: "Publish the unique DNS TXT challenge. SentinelGrid checks public DNS before allowing an assessment." },
  { n: "03", title: "Run a passive assessment", detail: "Review DNS, certificate-transparency and registration evidence, plus exact and conservative lookalike matches in public threat feeds." },
];

const PLANS = [
  { name: "Recon", price: "Free", detail: "1 verified domain", description: "Try manual passive domain assessments with public evidence and campaign-feed checks.", cta: "Start with Recon", to: "/assessment-center" as const },
  { name: "Team SOC", price: "$149 / month", detail: "10 verified domains", description: "Monitor more company domains under the existing Team SOC subscription.", cta: "Ask about Team SOC", to: "/contact" as const },
  { name: "Enterprise", price: "Contact sales", detail: "Unlimited verified domains", description: "Discuss organization-wide domain allowances and procurement requirements.", cta: "Contact sales", to: "/contact" as const },
];

function AttackSurface() {
  return (
    <div>
      <section className="hero-surface grid-backdrop border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-3xl">
            <p className="label-mono flex items-center gap-2"><Radar className="size-4 text-primary" /> DOMAIN ATTACK SURFACE</p>
            <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Know what public data reveals about your domains</h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Verify that your organization controls a domain, then review passive DNS, certificate and registration evidence alongside public phishing and malware campaign matches. Assessments are started manually; this feature does not run scheduled scans or send ongoing alerts.
            </p>
            <Link to="/assessment-center" className="mt-8 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
              Open the Security Assessment Center
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-labelledby="domain-monitoring-how">
        <div className="max-w-3xl">
          <p className="label-mono">HOW DOMAIN MONITORING WORKS</p>
          <h2 id="domain-monitoring-how" className="mt-3 font-display text-3xl font-semibold">Ownership verification first, passive evidence next</h2>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            The workflow only accepts a domain after a DNS TXT ownership challenge succeeds. It uses public sources for domain observations and checks public threat-intelligence feeds for campaign associations. It does not scan local networks or actively probe the registered domain.
          </p>
        </div>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n} className="surface p-6">
              <span className="font-mono text-xs text-primary">{step.n}</span>
              <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.detail}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="surface p-5"><Globe2 className="size-5 text-primary" /><h3 className="mt-3 font-semibold">Passive domain evidence</h3><p className="mt-2 text-sm text-muted-foreground">DNS records, certificate-transparency names and domain registration information.</p></article>
          <article className="surface p-5"><SearchCheck className="size-5 text-primary" /><h3 className="mt-3 font-semibold">Public campaign checks</h3><p className="mt-2 text-sm text-muted-foreground">Exact-domain and conservative lookalike candidates checked against configured phishing and malware feeds.</p></article>
          <article className="surface p-5"><ShieldCheck className="size-5 text-primary" /><h3 className="mt-3 font-semibold">Authorized scope</h3><p className="mt-2 text-sm text-muted-foreground">Only domains with successful account-specific DNS TXT verification can be assessed.</p></article>
        </div>
      </section>

      <section className="border-y border-border bg-panel" aria-labelledby="monitoring-plans">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <p className="label-mono">MONITORED DOMAIN PLANS</p>
          <h2 id="monitoring-plans" className="mt-3 font-display text-3xl font-semibold">Choose the domain allowance that fits your team</h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">Limits apply to domains added to your account. Current plan pricing is shown as configured; payment checkout for monitoring upgrades is not available in this workflow yet.</p>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <article key={plan.name} className="surface flex flex-col p-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-2 text-2xl font-bold">{plan.price}</p>
                <p className="mt-1 text-sm font-medium text-primary">{plan.detail}</p>
                <p className="mt-4 flex-1 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                <Link to={plan.to} className="mt-6 inline-flex justify-center rounded-md border border-primary/40 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5">{plan.cta}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-2xl font-semibold">Does this continuously monitor domains?</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">Not yet. After ownership verification, a signed-in user starts each assessment manually. Scheduled reassessments, change alerts and automated subscription checkout are not part of the current flow.</p>
      </section>
    </div>
  );
}
