import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Fingerprint, Globe2, Lock, Radar, ServerCog } from "lucide-react";

const TITLE = "Attack Surface Monitoring for External Assets | SentinelGrid";
const DESCRIPTION =
  "Continuously map internet-facing hosts, open ports, known CVEs, certificate sprawl and missing security headers — and get alerted on the change, not the inventory.";

export const Route = createFileRoute("/attack-surface")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/attack-surface" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "/attack-surface" }],
  }),
  component: AttackSurface,
});

const SIGNALS = [
  {
    icon: ServerCog,
    title: "Exposed services",
    body: "Every open port and service fingerprint observed on your public IPs, refreshed daily.",
  },
  {
    icon: AlertTriangle,
    title: "Known vulnerabilities",
    body: "CVEs already attributed to your hosts by public scanning infrastructure — the same data an attacker starts from.",
  },
  {
    icon: Fingerprint,
    title: "Certificate sprawl",
    body: "Hostnames appearing in certificate transparency logs, including shadow IT nobody told you about.",
  },
  {
    icon: Globe2,
    title: "DNS and mail posture",
    body: "Missing SPF, unexpected MX changes and nameserver moves that precede takeover attempts.",
  },
  {
    icon: Lock,
    title: "Web hardening",
    body: "HSTS, CSP, frame and content-type protections checked on every live host you own.",
  },
  {
    icon: Radar,
    title: "Ownership attribution",
    body: "Registry data mapping each asset back to a netblock owner so remediation has an owner.",
  },
];

const STEPS = [
  { n: "01", t: "Register your assets", d: "Paste IPs and domains, or sync them from an existing CMDB export." },
  { n: "02", t: "Baseline the surface", d: "The first sweep records ports, CVEs, certificates and headers as your reference state." },
  { n: "03", t: "Watch the diff", d: "Daily re-scans compare against the baseline and only surface what changed." },
  { n: "04", t: "Route the change", d: "Diffs trigger a playbook and land in email, webhook or your SIEM as a decision." },
];

function AttackSurface() {
  return (
    <div>
      <section className="hero-surface grid-backdrop border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="max-w-3xl">
            <p className="label-mono">Attack surface</p>
            <h1 className="mt-3 text-4xl font-bold sm:text-5xl">
              See your estate the way an attacker enumerates it
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Attackers do not scan your network first — they read public registries, certificate
              logs and exposure databases. SentinelGrid reads the same sources on a schedule and
              tells you when the picture changes.
            </p>
            <Link
              to="/osint"
              className="mt-8 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Baseline an asset now
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="label-mono">What we track</h2>
        <p className="mt-3 font-display text-3xl font-semibold">Six signals, one changelog</p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SIGNALS.map((s) => (
            <article key={s.title} className="surface p-6">
              <s.icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-panel">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="label-mono">How it works</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="surface p-6">
                <span className="font-mono text-xs text-primary">{s.n}</span>
                <h3 className="mt-3 text-base font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-2xl font-semibold">Is passive monitoring enough?</h2>
        <p className="mt-4 text-sm text-muted-foreground">
          Passive collection will not replace an authenticated vulnerability scanner inside your
          perimeter, and it is not meant to. What it does is close the gap those tools cannot see:
          assets nobody registered, certificates issued by a forgotten SaaS trial, and services that
          appeared on a cloud host last night. Because collection is passive, it needs no
          authorisation, touches nothing you do not own, and cannot knock over production.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/workflows"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Route diffs into a playbook
          </Link>
        </div>
      </section>
    </div>
  );
}
