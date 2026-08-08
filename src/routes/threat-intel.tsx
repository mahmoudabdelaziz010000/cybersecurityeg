import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw } from "lucide-react";
import { getRecentCves } from "@/lib/cve.functions";
import type { CveItem } from "@/lib/cve.server";

const TITLE = "Threat Intelligence — Latest CVEs & Exposure Signals | SentinelGrid";
const DESCRIPTION =
  "A live feed of vulnerabilities disclosed in the last 72 hours, scored by CVSS, with a direct path from a CVE to whether your own exposed hosts are affected.";

export const Route = createFileRoute("/threat-intel")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/threat-intel" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: "/threat-intel" }],
  }),
  component: ThreatIntel;
});

const SEVERITY_CLASS: Record<CveItem["severity"], string> = {
  critical: "border-malicious/40 bg-malicious/10 text-malicious",
  high: "border-malicious/30 bg-malicious/5 text-malicious",
  medium: "border-caution/40 bg-caution/10 text-caution",
  low: "border-clean/40 bg-clean/10 text-clean",
  unscored: "border-border bg-muted text-muted-foreground",
};

function ThreatIntel() {
  const fetchCves = useServerFn(getRecentCves);
  const { data, isPending, isFetching, refetch } = useQuery({
    queryKey: ["recent-cves"],
    queryFn: () => fetchCves(),
    staleTime: 15 * 60 * 1000,
  });

  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="label-mono">Threat intelligence</p>
          <h1 className="mt-3 text-4xl font-bold">Vulnerabilities disclosed in the last 72 hours</h1>
          <p className="mt-4 text-muted-foreground">
            Sourced live from the National Vulnerability Database. When something lands that matters,
            pivot straight into an exposure sweep of your own hosts to find out whether you actually
            run the affected service.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </button>
      </header>

      {isPending && (
        <p className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading the feed…
        </p>
      )}

      {data?.error && (
        <p className="mt-10 rounded-md border border-border bg-panel p-4 text-sm text-caution">
          The public vulnerability feed is rate limiting right now ({data.error}). Try refreshing in
          a minute.
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-10 space-y-3">
          {items.map((c) => (
            <li key={c.id} className="surface p-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-mono text-sm font-semibold">{c.id}</h2>
                <span
                  className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${SEVERITY_CLASS[c.severity]}`}
                >
                  {c.severity}
                  {c.score !== null ? ` · ${c.score.toFixed(1)}` : ""}
                </span>
                {c.published && (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {new Date(c.published).toISOString().slice(0, 10)}
                  </span>
                )}
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{c.summary}</p>
            </li>
          ))}
        </ul>
      )}

      <section className="surface-raised mt-14 flex flex-col gap-4 p-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <h2 className="font-display text-xl font-semibold">
            Does today's CVE touch anything you own?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The exposure sweep reads Shodan InternetDB for every IP you care about and lists the CVEs
            already attributed to those hosts.
          </p>
        </div>
        <Link
          to="/osint"
          className="inline-flex shrink-0 items-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Sweep your hosts
        </Link>
      </section>
    </div>
  );
}
